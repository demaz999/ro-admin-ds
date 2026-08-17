<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

/**
 * Автопроверка текстовых ролей: ловит провал шрифта в системный дефолт.
 *
 * Зачем. Компонент может не зарегистрироваться и отрендериться нераспознанным
 * тегом — тогда его текст наследует что попало, а наложение этого не покажет:
 * на `/compare` просто ничего не появится в нужном месте, и глаз спишет это на
 * прозрачность. Именно так подпись селекта уехала в системный monospace.
 *
 * Что считается ошибкой: computed font-family не из темы, либо кегль вне шкалы
 * кита. Проверяются только узлы внутри `[data-slot]` — то есть компоненты кита;
 * хром витрины с его моноширинными подписями сюда не попадает.
 *
 * Две вещи, на которых проверка уже прокалывалась:
 *
 * 1. **Контролы не имеют текстового узла.** У `input` и `textarea` текст лежит в
 *    атрибуте `value`/`placeholder`, поэтому обход «узлы с собственным текстом»
 *    пропускал поля целиком — то есть именно то, что проверяется. Такие элементы
 *    добираются по тегу.
 * 2. **Тема бывает не на корне.** `/compare` идёт в теме `atom`, объявленной на
 *    контейнере страницы. Разрешённое семейство поэтому читается с самого
 *    элемента, а не с `documentElement`: кастомные свойства наследуются, и узел
 *    внутри `[data-theme]` вернёт гарнитуру своей темы.
 */

interface Finding {
  slot: string
  text: string
  family: string
  size: string
  reason: string
}

const findings = ref<Finding[]>([])
const checked = ref(0)
const allowedFamilies = ref<string[]>([])

/**
 * Кегли шкалы кита. Список **не задаётся руками**: он читается из объявленных
 * `--text-*` того же файла токенов — тем же способом, каким витрина берёт
 * остальные переменные.
 *
 * Зашитый список здесь однажды уже разошёлся с темой: шкала расширилась вниз на
 * ступень `10/12` мастера `Bulb`, а проверка продолжала считать её чужой. Копия
 * шкалы в коде проверки — это второй источник правды, то есть ровно то, против
 * чего проверка и заведена.
 */
const kitSizes = ref<number[]>([])

function firstFamily(value: string) {
  return value.split(',')[0].replace(/["']/g, '').trim()
}

/** Текст узла: собственные текстовые узлы, а у контролов — значение или плейсхолдер. */
function ownText(el: Element) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return (el.value || el.placeholder || '').trim()
  }
  return Array.from(el.childNodes)
    .filter(c => c.nodeType === Node.TEXT_NODE)
    .map(c => c.textContent?.trim() ?? '')
    .join(' ')
    .trim()
}

/**
 * Шкала кита — все объявленные `--text-<ступень>`, кроме производных
 * `--text-*--line-height` и `--text-*--letter-spacing`. Гасящее объявление
 * `--text-*: initial` в счёт не идёт: оно снимает шкалу Tailwind, а не задаёт
 * ступень.
 */
function readKitSizes() {
  const sizes = new Set<number>()

  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        for (const prop of Array.from(rule.style)) {
          if (!prop.startsWith('--text-') || prop.includes('--line-height') || prop.includes('--letter-spacing')) continue
          const px = Number.parseFloat(rule.style.getPropertyValue(prop))
          if (Number.isFinite(px)) sizes.add(Math.round(px))
        }
      }
      else if ('cssRules' in rule) {
        walk((rule as CSSGroupingRule).cssRules)
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules)
    }
    catch {
      // Стороннюю таблицу стилей читать нельзя — пропускаем.
    }
  }

  return [...sizes].sort((a, b) => a - b)
}

function run() {
  const out: Finding[] = []
  const seenFamilies = new Set<string>()
  let n = 0

  kitSizes.value = readKitSizes()

  for (const host of Array.from(document.querySelectorAll('[data-slot]'))) {
    const nodes = [host, ...Array.from(host.querySelectorAll('*'))]

    for (const el of nodes) {
      const own = ownText(el)
      if (!own) continue

      n += 1
      const cs = getComputedStyle(el)

      // Разрешённые семейства берутся с самого узла: тема может быть объявлена
      // не на корне, а на контейнере страницы — как на этой.
      const allowed = [
        firstFamily(cs.getPropertyValue('--font-sans')),
        firstFamily(cs.getPropertyValue('--font-display')),
      ].filter(Boolean)
      allowed.forEach(f => seenFamilies.add(f))

      const family = firstFamily(cs.fontFamily)
      const size = Math.round(Number.parseFloat(cs.fontSize))
      const reasons: string[] = []

      if (!allowed.includes(family)) reasons.push('семейство не из темы')
      if (!kitSizes.value.includes(size)) reasons.push(`кегль ${size} вне шкалы кита`)

      if (reasons.length) {
        out.push({
          slot: (host as HTMLElement).dataset.slot ?? '—',
          text: own.slice(0, 40),
          family,
          size: `${size}/${Math.round(Number.parseFloat(cs.lineHeight))}`,
          reason: reasons.join(', '),
        })
      }
    }
  }

  allowedFamilies.value = [...seenFamilies]
  checked.value = n
  findings.value = out
}

/**
 * Проверка ждёт кадр отрисовки, а не только монтирование страницы.
 *
 * Слепое пятно, найденное в очереди 3: модальное окно и лайтбокс появляются
 * через `Presence` Reka, то есть **после** `onMounted`. Проверка, запущенная
 * сразу, их не видела, и счётчик просто не менялся — а выглядело это как
 * «новых узлов нет», а не как «узлы не проверены». Ровно тот класс дефекта,
 * против которого проверка и заведена.
 */
onMounted(async () => {
  await nextTick()
  // Именно таймер, а не requestAnimationFrame: rAF не срабатывает во вкладке,
  // которую браузер не отрисовывает, и обе проверки молча показывали ноль.
  setTimeout(run, 0)
})
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">
      Проверено текстовых узлов внутри компонентов: <strong>{{ checked }}</strong>.
      Разрешённые семейства: {{ allowedFamilies.join(', ') }}.
      Шкала кегля (прочитана из токенов): {{ kitSizes.join(', ') }}.
    </p>

    <p
      v-if="!findings.length"
      class="rounded-md border border-border bg-success-surface p-3 text-sm"
    >
      Провалов нет: у каждой текстовой роли семейство из темы и кегль из шкалы кита.
    </p>

    <table v-else class="w-full text-left text-sm">
      <thead class="text-muted-foreground">
        <tr>
          <th class="py-2 pr-4 font-medium">
            Компонент
          </th>
          <th class="py-2 pr-4 font-medium">
            Текст
          </th>
          <th class="py-2 pr-4 font-medium">
            Семейство
          </th>
          <th class="py-2 pr-4 font-medium">
            Кегль
          </th>
          <th class="py-2 font-medium">
            Что не так
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in findings" :key="i" class="border-t border-border">
          <td class="py-2 pr-4"><code class="text-xs">{{ f.slot }}</code></td>
          <td class="py-2 pr-4">{{ f.text }}</td>
          <td class="py-2 pr-4 text-destructive">{{ f.family }}</td>
          <td class="py-2 pr-4">{{ f.size }}</td>
          <td class="py-2 text-destructive">{{ f.reason }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
