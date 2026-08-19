<script setup lang="ts">
import { computed } from 'vue'
import { TooltipArrow, TooltipContent, type TooltipContentProps, TooltipPortal } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Плашка подсказки — мастер `Tooltip` `834:10127`.
 *
 * Семь вариантов оси `Сorner` — это положения хвостика; здесь они разложены на
 * `side` × `align` плюс `showArrow`. Соответствие — в `index.ts`.
 */
const props = withDefaults(defineProps<TooltipContentProps & {
  /** Вариант `none` мастера: плашка без хвостика. */
  showArrow?: boolean
  /**
   * Класс снаружи — слиянием, а не приклеиванием. Плашка по умолчанию в одну
   * строку; подсказка с длинным содержимым задаёт ширину и перенос сама.
   */
  class?: string
}>(), {
  side: 'top',
  align: 'start',
  showArrow: true,
  // Хвостик 6 высотой: плашка отходит ровно на него, как в мастере.
  sideOffset: 6,
})

/**
 * `class` наружу не пробрасывается через `v-bind`: он сливается отдельно, иначе
 * внешний класс и класс плашки спорят за одно место.
 */
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="delegated"
      :class="cn('z-50 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-elevated', props.class)"
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
