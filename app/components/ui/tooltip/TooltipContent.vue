<script setup lang="ts">
import { TooltipArrow, TooltipContent, type TooltipContentProps, TooltipPortal } from 'reka-ui'

/**
 * Плашка подсказки — мастер `Tooltip` `834:10127`.
 *
 * Семь вариантов оси `Сorner` — это положения хвостика; здесь они разложены на
 * `side` × `align` плюс `showArrow`. Соответствие — в `index.ts`.
 */
const props = withDefaults(defineProps<TooltipContentProps & {
  /** Вариант `none` мастера: плашка без хвостика. */
  showArrow?: boolean
}>(), {
  side: 'top',
  align: 'start',
  showArrow: true,
  // Хвостик 6 высотой: плашка отходит ровно на него, как в мастере.
  sideOffset: 6,
})
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="props"
      class="z-50 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-elevated"
    >
      <slot />
      <!-- Хвостик 8×6. Отступ 12 от края плашки — из мастера. -->
      <TooltipArrow
        v-if="props.showArrow"
        as-child
        :width="8"
        :height="6"
      >
        <svg viewBox="0 0 8 6" class="fill-popover" aria-hidden="true">
          <path d="M4 6 8 0H0z" />
        </svg>
      </TooltipArrow>
    </TooltipContent>
  </TooltipPortal>
</template>
