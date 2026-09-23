<script setup lang="ts">
import { cn } from '@/lib/utils'
import Progress from './Progress.vue'
import type { ProgressValue } from '.'

/**
 * Счётчик подшапки — «Кадры разложены», «Обязательные шаги», «Объекты»
 * (спека VA-9265 §7). Такт 30, разбор — в `index.ts`.
 */
const props = defineProps<{
  label: string
  /** «14 из 196» — формулирует страница. */
  value: string
  /** Нет — нет полосы: так у «Объектов». */
  progress?: ProgressValue
  /** «6 привязано до вас»; пусто — строки нет. */
  sub?: string
  class?: string
}>()
</script>

<template>
  <div data-slot="progress-stat" :class="cn('flex min-w-0 flex-col', props.class)">
    <span data-slot="progress-stat-label" class="text-2xs text-muted-foreground">{{ props.label }}</span>
    <span data-slot="progress-stat-value" class="text-sm font-medium text-foreground">{{ props.value }}</span>
    <Progress
      v-if="props.progress"
      class="mt-1"
      :label="props.label"
      :value="props.progress.value"
      :max="props.progress.max"
      :locked="props.progress.locked"
    />
    <span v-if="props.sub" data-slot="progress-stat-sub" class="mt-1 text-2xs text-muted-foreground">{{ props.sub }}</span>
  </div>
</template>
