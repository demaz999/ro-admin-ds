<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Метаданные кадра в боковой панели просмотра (спека VA-9265 §11.1): «Файл», «Время»,
 * «Тип», «Распознано» — строки формулирует страница. Разбор — в `index.ts`, такт 34.
 */
const props = defineProps<{
  rows: { label: string, value: string }[]
  class?: string
}>()
</script>

<template>
  <dl
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
