<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'

/**
 * «Не заполнено» — метка незаполненного поля на странице сценария со ссылкой на поле таба «Витрина» (ревью 4.8; решение 5
 * оркестратора 2026-10-08). Часть админки внутри изображения сайта — тон предупреждения кита. Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewGap label="Краткое описание" @go="toField('scSummary')" />`
 */
const props = withDefaults(defineProps<{
  /** Подпись поля таба. */
  label: string
  /** Во всю ширину места — у изображения и у пустого раздела. */
  block?: boolean
  class?: string
}>(), { block: false, class: undefined })

const emit = defineEmits<{ go: [] }>()
</script>

<template>
  <button
    type="button"
    data-slot="scenario-preview-gap"
    :aria-label="`Не заполнено: ${props.label}. Перейти к полю`"
    :class="cn(
      'group/gap inline-flex max-w-full items-center gap-2 rounded-md border border-dashed border-warning bg-warning-surface px-3 py-2 text-left font-sans text-xs outline-none',
      'hover:border-solid focus-visible:ring-2 focus-visible:ring-ring',
      props.block ? 'w-full justify-center' : 'w-fit',
      props.class,
    )"
    @click="emit('go')"
  >
    <span class="shrink-0 font-bold text-warning-strong">Не заполнено</span>
    <span data-slot="scenario-preview-gap-label" class="flex min-w-0 items-center gap-1 font-medium text-primary group-hover/gap:underline">
      <span class="min-w-0 truncate">{{ props.label }}</span>
      <Icon name="chevron-right" :size="12" />
    </span>
  </button>
</template>
