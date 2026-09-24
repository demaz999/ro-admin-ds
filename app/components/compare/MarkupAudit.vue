<script setup lang="ts">
import { auditMarkup, auditMarkupSource, MARKUP_CONTROL } from '~/stands/free-shoot/markup'

/**
 * Статическая проверка разметки экрана `/free-shoot` — довесок 1 к такту 35. Правило и что
 * считается нарушением — `app/stands/free-shoot/markup.ts`. Идёт по исходникам,
 * поэтому считается сразу, без кнопки. Прогон — в приёмку каждого такта, который трогает экран,
 * вместе с проверкой покрытия (`CLAUDE.md`, «Сборка страниц»).
 */
const result = auditMarkup()
const control = auditMarkupSource('контрольный образец', MARKUP_CONTROL.source)
</script>

<template>
  <div data-markup-audit class="space-y-3 text-sm">
    <p data-markup-total>
      Файлов: {{ result.files.length }} ({{ result.files.join(', ') }}). Проверено элементов разметки вне «как есть»:
      {{ result.checked }}. Нарушений: {{ result.findings.length }}.
    </p>
    <p data-markup-control class="text-2xs text-muted-foreground">
      Контрольный образец: найдено нарушений {{ control.findings.length }} из {{ MARKUP_CONTROL.expected }}{{
        control.findings.length === MARKUP_CONTROL.expected ? ' — проверка не слепая' : ' — ПРОВЕРКА СЛЕПАЯ' }}.
    </p>
    <p v-if="!result.findings.length && control.findings.length === MARKUP_CONTROL.expected" data-markup-verdict class="text-sm">
      Нарушений нет: вне блоков «как есть» на странице только компоненты кита и классы раскладки.
    </p>
    <table v-if="result.findings.length" class="text-2xs">
      <thead>
        <tr class="text-left text-muted-foreground">
          <th class="pr-6 font-medium">Файл:строка</th>
          <th class="pr-6 font-medium">Элемент</th>
          <th class="pr-6 font-medium">Нарушение</th>
          <th class="font-medium">Значение</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, k) in result.findings" :key="k">
          <td class="pr-6 tabular-nums">{{ f.file }}:{{ f.line }}</td>
          <td class="pr-6">&lt;{{ f.tag }}&gt;</td>
          <td class="pr-6">{{ f.what }}</td>
          <td class="font-mono">{{ f.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
