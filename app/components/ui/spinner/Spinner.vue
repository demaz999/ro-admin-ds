<script setup lang="ts">
import type { SpinnerVariants } from '.'
import { computed } from 'vue'
import { spinnerRing, spinnerVariants } from '.'

/**
 * Спиннер — мастер `Spinner` `134:1768`.
 * Кольцо с угловой заливкой: 12% → 100%, стопы с мастера. Вращение — наше:
 * в Figma движения нет, там нарисован один кадр.
 */
const props = withDefaults(defineProps<{
  variant?: SpinnerVariants['variant']
  size?: SpinnerVariants['size']
  /** Подпись для читалок: спиннер сам по себе ничего не сообщает. */
  label?: string
}>(), {
  variant: 'default',
  size: 'md',
  label: 'Загрузка',
})

/**
 * Кольцо вырезается маской, а не рисуется обводкой: угловая заливка обязана
 * идти по кругу целиком, а `border` красится посегментно и градиент разорвёт.
 */
const ring = computed(() => {
  const w = `${spinnerRing[props.size ?? 'md']}px`
  // `black` здесь — трафарет непрозрачности маски, а не цвет оформления:
  // видимым остаётся только внешнее кольцо шириной `w`.
  const stencil = `radial-gradient(farthest-side, transparent calc(100% - ${w}), black calc(100% - ${w}))`
  return {
    background: 'conic-gradient(from 0deg, color-mix(in srgb, currentColor 12%, transparent), currentColor)',
    mask: stencil,
    WebkitMask: stencil,
  }
})
</script>

<template>
  <span
    data-slot="spinner"
    role="status"
    :aria-label="props.label"
    :class="spinnerVariants({ variant: props.variant, size: props.size })"
  >
    <span
      class="block size-full animate-spin rounded-full motion-reduce:animate-none"
      :style="ring"
      aria-hidden="true"
    />
  </span>
</template>
