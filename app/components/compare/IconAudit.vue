<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

/**
 * Автопроверка оптики иконок: ловит подмену пикты глифом другого визуального поля.
 *
 * Зачем. Наложение сравнивает бокс, а не глиф. Пикта Атома заполняет свой бокс
 * целиком — в мастере `Input` бокс 16×16 и отрисованные границы тоже 16×16.
 * Material рисует глиф с полями внутри квадрата 960: у `search` контур занимает
 * 75%, у `close` — 58%. При одинаковом боксе видимый глиф оказывается на четверть
 * мельче, и связка «иконка + текст» читается иначе, хотя коробки совпали.
 *
 * Оптический размер Material этого не лечит: доля поля у `search` равна 70% при
 * opsz 20 и 75% при opsz 24 и 48 — оптический размер меняет толщину штриха, а не
 * долю поля. Рычаг один — масштаб глифа внутри бокса.
 *
 * Что считается ошибкой: видимый глиф меньше бокса. Порог мягкий — 2%, чтобы
 * субпиксельное округление не давало ложных срабатываний.
 */

interface Finding {
  name: string
  box: string
  ink: string
  ratio: string
}

const findings = ref<Finding[]>([])
const checked = ref(0)

/** Ниже этого отношения видимого глифа к боксу считаем, что глиф не дотягивает. */
const MIN_RATIO = 0.98

function run() {
  const out: Finding[] = []
  let n = 0

  for (const svg of Array.from(document.querySelectorAll('[data-slot="icon"]'))) {
    const path = svg.querySelector('path')
    if (!path) continue

    const box = svg.getBoundingClientRect()
    const ink = path.getBoundingClientRect()
    if (!box.width || !ink.width) continue

    n += 1
    const ratio = Math.max(ink.width / box.width, ink.height / box.height)
    if (ratio < MIN_RATIO) {
      out.push({
        name: (svg.parentElement?.dataset.slot ?? svg.closest('[data-slot]')?.getAttribute('data-slot')) || 'icon',
        box: `${box.width.toFixed(1)}×${box.height.toFixed(1)}`,
        ink: `${ink.width.toFixed(1)}×${ink.height.toFixed(1)}`,
        ratio: `${Math.round(ratio * 100)}%`,
      })
    }
  }

  checked.value = n
  findings.value = out
}

/**
 * Ждём кадр отрисовки: содержимое модального окна и лайтбокса появляется через
 * `Presence` Reka, уже после `onMounted`. Разбор — в `FontAudit.vue`.
 */
onMounted(async () => {
  await nextTick()
  setTimeout(run, 0)
})
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">
      Проверено иконок: <strong>{{ checked }}</strong>. Правило: видимый глиф заполняет свой бокс,
      как пикта Атома. Порог — {{ Math.round(MIN_RATIO * 100) }}%.
    </p>

    <p
      v-if="!findings.length"
      class="rounded-md border border-border bg-success-surface p-3 text-sm"
    >
      Провалов нет: у каждой иконки видимый глиф совпадает с боксом.
    </p>

    <table v-else class="w-full text-left text-sm">
      <thead class="text-muted-foreground">
        <tr>
          <th class="py-2 pr-4 font-medium">
            Где
          </th>
          <th class="py-2 pr-4 font-medium">
            Бокс
          </th>
          <th class="py-2 pr-4 font-medium">
            Видимый глиф
          </th>
          <th class="py-2 font-medium">
            Доля
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in findings" :key="i" class="border-t border-border">
          <td class="py-2 pr-4"><code class="text-xs">{{ f.name }}</code></td>
          <td class="py-2 pr-4">{{ f.box }}</td>
          <td class="py-2 pr-4 text-destructive">{{ f.ink }}</td>
          <td class="py-2 text-destructive">{{ f.ratio }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
