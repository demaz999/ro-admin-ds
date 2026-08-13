<script setup lang="ts">
import type { TimerVariants } from '.'
import { computed } from 'vue'
import { timerVariants } from '.'

/**
 * Таймер обратного отсчёта — мастер `6344:55714`.
 * Видимая часть с мастера, доля отсчёта — наш проп: в Figma она запечена в вектор.
 */
const props = withDefaults(defineProps<{
  size?: TimerVariants['size']
  /** Доля пройденного отсчёта, 0…1. В мастере зафиксирована рисунком вектора. */
  value?: number
  /** Булев проп `Number` мастера: цифра внутри сектора. */
  showNumber?: boolean
}>(), {
  size: 'lg',
  value: 0.25,
  showNumber: false,
})

const turn = computed(() => `${Math.min(Math.max(props.value, 0), 1)}turn`)
</script>

<template>
  <span
    data-slot="timer"
    role="progressbar"
    :aria-valuenow="Math.round(props.value * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
    :class="timerVariants({ size })"
  >
    <!-- Подложка — тот же брендовый цвет на 12%: значение с вектора `Bg` мастера. -->
    <span
      class="absolute inset-0 rounded-full bg-current opacity-12"
      aria-hidden="true"
    />
    <!-- Сектор отсчёта. Градиент, а не обводка: в мастере это сплошная заливка. -->
    <span
      class="absolute inset-0 rounded-full"
      aria-hidden="true"
      :style="{ background: `conic-gradient(currentColor 0 ${turn}, transparent ${turn})` }"
    />
    <span v-if="props.showNumber" class="relative">
      <slot />
    </span>
  </span>
</template>
