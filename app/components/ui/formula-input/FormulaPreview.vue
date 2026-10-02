<script setup lang="ts">
/**
 * Превью формулы: подпись и результат подстановки. Значение считает потребитель — `formulaPreview(formula, values)`
 * из `index.ts`. Разбор — `index.ts`.
 *
 * Пример: `<FormulaPreview :value="formulaPreview(formula, demoValues)" />`
 */
const props = withDefaults(defineProps<{
  label?: string
  value: string
  /** Что показать при пустой формуле. */
  empty?: string
}>(), { label: 'Превью', empty: '—' })
</script>

<template>
  <div data-slot="formula-preview" class="flex min-w-0 flex-col gap-1">
    <span data-slot="formula-preview-label" class="text-2xs font-bold text-foreground-secondary">{{ props.label }}</span>
    <span data-slot="formula-preview-value" class="text-sm break-words text-foreground">{{ props.value || props.empty }}</span>
  </div>
</template>
