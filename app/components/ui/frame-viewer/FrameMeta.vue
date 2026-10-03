<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Метаданные кадра в боковой панели просмотра (спека VA-9265 §11.1): «Файл», «Время»,
 * «Тип», «Распознано» — строки формулирует страница. Разбор — в `index.ts`, такт 34.
 *
 * Раскладка `stack` (такт 69, довесок 1): пары столбиком — подпись над значением, без линии и полей; пара «подпись —
 * значение» на полотне страницы (блок «Настройки группы» Figma `33179:4467`). Без пропа — прежняя сетка.
 */
const props = withDefaults(defineProps<{
  rows: { label: string, value: string }[]
  /** `grid` — сетка «подпись | значение» с линией снизу (по умолчанию); `stack` — подпись над значением, пары через 8. */
  layout?: 'grid' | 'stack'
  class?: string
}>(), { layout: 'grid' })
</script>

<template>
  <dl
    v-if="props.layout === 'stack'"
    data-slot="frame-meta"
    data-layout="stack"
    :class="cn('m-0 flex shrink-0 flex-col gap-2 text-xs', props.class)"
  >
    <div v-for="row in props.rows" :key="row.label" data-slot="frame-meta-row" class="flex min-w-0 flex-col">
      <dt class="text-foreground-secondary">
        {{ row.label }}
      </dt>
      <dd class="m-0 min-w-0 font-medium break-words text-foreground">
        {{ row.value }}
      </dd>
    </div>
  </dl>
  <dl
    v-else
    data-slot="frame-meta"
    :class="cn('m-0 grid shrink-0 grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border-soft px-4 py-3 text-xs', props.class)"
  >
    <template v-for="row in props.rows" :key="row.label">
      <dt class="text-foreground-secondary">
        {{ row.label }}
      </dt>
      <dd class="m-0 min-w-0 font-medium break-words text-foreground">
        {{ row.value }}
      </dd>
    </template>
  </dl>
</template>
