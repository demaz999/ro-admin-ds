<script setup lang="ts">
import type { TimerVariants } from '.'
import { computed } from 'vue'
import { timerRing, timerVariants } from '.'

/**
 * Таймер обратного отсчёта — мастер `6344:55714`.
 *
 * **Кольцо, а не сектор** — вывод волны 4 исправлен по экспорту. Разбор и
 * замеры стенки — в `index.ts`. Цифра лежит в отверстии, поэтому читается без
 * правила контраста.
 */
const props = withDefaults(defineProps<{
  size?: TimerVariants['size']
  /** Доля пройденного отсчёта, 0…1. В мастере зафиксирована рисунком вектора. */
  value?: number
  /** Булев проп `Number` мастера: цифра внутри кольца. */
  showNumber?: boolean
}>(), {
  size: 'lg',
  value: 0.25,
  showNumber: false,
})

const turn = computed(() => `${Math.min(Math.max(props.value, 0), 1)}turn`)

/**
 * Кольцо вырезается маской из круга, как у `Spinner`: заливка отсчёта обязана
 * идти по кругу целиком, а `border` красится посегментно и дугу разорвёт.
 */
const ring = computed(() => {
  const w = `${timerRing[props.size ?? 'lg']}px`
  const stencil = `radial-gradient(farthest-side, transparent calc(100% - ${w}), black calc(100% - ${w}))`
  return { mask: stencil, WebkitMask: stencil }
})
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
    <!-- Дорожка: тот же цвет роли на мягкой ступени. Вектор `Bg` мастера. -->
    <span
      class="absolute inset-0 rounded-full bg-current opacity-[var(--opacity-soft)]"
      aria-hidden="true"
      :style="ring"
    />
    <!-- Пройденная часть. Обе вырезаны одной маской, поэтому дырка совпадает. -->
    <span
      class="absolute inset-0 rounded-full"
      aria-hidden="true"
      :style="{ ...ring, background: `conic-gradient(currentColor 0 ${turn}, transparent ${turn})` }"
    />
    <!-- Цифра лежит в отверстии кольца — на подложке, а не на заливке отсчёта. -->
    <span v-if="props.showNumber" class="relative">
      <slot />
    </span>
  </span>
</template>
