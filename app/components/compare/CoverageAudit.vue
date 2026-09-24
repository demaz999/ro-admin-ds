<script setup lang="ts">
import { ref } from 'vue'
import { auditCoverage, COVERAGE_STATES, type CoverageFinding } from '~/stands/free-shoot/coverage'

/**
 * Автопроверка покрытия экрана `/free-shoot` — довесок 2 к такту 35. Правило и что считается
 * отрисовкой — `app/stands/free-shoot/coverage.ts`.
 *
 * Экран грузится по очереди во всех значениях оснастки в скрытый iframe того же сайта (1440×900),
 * проверка идёт по его DOM. Запуск — кнопкой: девятнадцать загрузок экрана на 200 кадров — это
 * около минуты, автопроверки шрифтов и иконок ждать их не должны. Прогон — в приёмку каждого
 * такта (`CLAUDE.md`, «Сборка страниц»).
 */
interface Row { state: string, checked: number, findings: CoverageFinding[] }

const rows = ref<Row[]>([])
const running = ref(false)
const done = ref(false)
const frame = ref<HTMLIFrameElement | null>(null)

function load(url: string) {
  return new Promise<Document>((resolve) => {
    const f = frame.value!
    f.onload = () => {
      /* Окна оснастки открываются после монтирования — даём им появиться, как автопроверкам. */
      setTimeout(() => resolve(f.contentDocument!), 2500)
    }
    f.src = url
  })
}

async function run() {
  running.value = true
  done.value = false
  rows.value = []
  for (const state of COVERAGE_STATES) {
    const doc = await load(`/free-shoot${state ? `?${state}` : ''}`)
    const r = auditCoverage(doc)
    rows.value.push({ state: state || 'по умолчанию', checked: r.checked, findings: r.findings })
  }
  running.value = false
  done.value = true
}

const total = () => rows.value.reduce((a, r) => a + r.checked, 0)
const offenders = () => rows.value.reduce((a, r) => a + r.findings.length, 0)
</script>

<template>
  <div data-coverage-audit class="space-y-3 text-sm">
    <div class="flex items-center gap-4">
      <Button variant="secondary" :disabled="running" data-coverage-run @click="run">
        {{ running ? 'Проверяется…' : 'Запустить проверку покрытия' }}
      </Button>
      <span v-if="rows.length" data-coverage-total>
        Состояний: {{ rows.length }} из {{ COVERAGE_STATES.length }}. Проверено элементов: {{ total() }}. Непомеченных: {{ offenders() }}.
      </span>
    </div>
    <p v-if="done && !offenders()" data-coverage-verdict class="text-sm">
      Провалов нет: каждый видимый элемент с отрисовкой — внутри компонента кита или блока «как есть».
    </p>
    <table v-if="rows.length" class="text-2xs">
      <thead>
        <tr class="text-left text-muted-foreground">
          <th class="pr-6 font-medium">Состояние</th>
          <th class="pr-6 font-medium">Проверено</th>
          <th class="font-medium">Непомеченных</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.state">
          <td class="pr-6">{{ r.state }}</td>
          <td class="pr-6 tabular-nums">{{ r.checked }}</td>
          <td class="tabular-nums">{{ r.findings.length }}</td>
        </tr>
      </tbody>
    </table>
    <ul v-if="offenders()" class="space-y-1 text-2xs">
      <template v-for="r in rows" :key="`f-${r.state}`">
        <li v-for="(f, k) in r.findings" :key="k">
          {{ r.state }} · {{ f.kind }} · &lt;{{ f.tag }}&gt; {{ f.className }} — «{{ f.text }}»
        </li>
      </template>
    </ul>
    <iframe ref="frame" title="Экран свободной съёмки для проверки покрытия" class="pointer-events-none absolute -left-[10000px] h-225 w-360" aria-hidden="true" />
  </div>
</template>
