<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { readinessMarkLabel, type ReadinessMarkState } from '.'

/**
 * Маркер состояния этапа или области — семейство «Модель готовности», такт 91. Разбор — `index.ts`.
 *
 * Пример: `<ReadinessMark state="warning" :count="2" />` — пилюля «! 2» тона предупреждения.
 */
const props = withDefaults(defineProps<{
  state: ReadinessMarkState
  /** Число замечаний у `warning` и `blocked`. */
  count?: number
  /**
   * Текст для чтения с экрана; по умолчанию — из состояния и числа. Пустая строка — маркер только для глаза (замок у вкладки
   * с причиной: причину читает сама вкладка).
   */
  label?: string
  class?: string
}>(), { count: 0, label: undefined })

const spoken = computed(() => props.label ?? readinessMarkLabel(props.state, props.count))
</script>

<template>
  <span data-slot="readiness-mark" :data-state="props.state" :class="cn('inline-flex shrink-0 items-center', props.class)">
    <Icon v-if="props.state === 'done'" name="check" :size="16" class="text-success-strong" />
    <Icon v-else-if="props.state === 'locked'" name="lock" :size="14" class="text-foreground-secondary" />
    <span v-else-if="props.state === 'todo'" class="size-3.5 rounded-full border-2 border-border-secondary" />
    <span
      v-else
      aria-hidden="true"
      class="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold whitespace-nowrap"
      :class="props.state === 'blocked' ? 'bg-destructive-surface text-destructive-strong' : 'bg-warning-surface text-warning-strong'"
    >! {{ props.count }}</span>
    <span v-if="spoken" class="sr-only">{{ spoken }}</span>
  </span>
</template>
