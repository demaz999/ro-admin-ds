<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Полоса детерминированного прогресса — такт 30. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Всё сделанное, включая чужую долю. */
  value: number
  max?: number
  /** Чужая доля: работа, сделанная до текущего пользователя (§7.1–7.2). */
  locked?: number
  /** Имя полосы для вспомогательных технологий. */
  label?: string
  class?: string
}>(), {
  max: 100,
  locked: 0,
  label: '',
})

const share = (n: number) => (props.max > 0 ? Math.min(100, Math.max(0, (n / props.max) * 100)) : 0)
const done = computed(() => props.max > 0 && props.value >= props.max)
</script>

<template>
  <div
    data-slot="progress"
    role="progressbar"
    :aria-label="props.label || undefined"
    :aria-valuenow="props.value"
    aria-valuemin="0"
    :aria-valuemax="props.max"
    :data-state="done ? 'complete' : 'progress'"
    :class="cn('relative h-1 w-full overflow-hidden rounded-full bg-muted', props.class)"
  >
    <span
      data-slot="progress-value"
      class="absolute inset-y-0 left-0"
      :class="done ? 'bg-success' : 'bg-primary'"
      :style="{ width: `${share(props.value)}%` }"
    />
    <span
      v-if="props.locked"
      data-slot="progress-locked"
      class="absolute inset-y-0 left-0 bg-muted-foreground"
      :style="{ width: `${share(props.locked)}%` }"
    />
  </div>
</template>
