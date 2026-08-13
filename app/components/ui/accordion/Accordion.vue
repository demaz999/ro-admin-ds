<script setup lang="ts">
import type { AccordionVariants } from '.'
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { accordionTitle, accordionVariants } from '.'

/**
 * Аккордеон — мастер `Accordion` `6644:58398`.
 * Ось `Collapsed` инвертирована: в коде это `open`. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Вид. Цвет плашки — часть вида: в мастере он связан с `Shape` намертво. */
  variant?: AccordionVariants['variant']
  /** Перенесены две ступени из пяти: 24 и 20. Остальные — сайтовый слой. */
  size?: AccordionVariants['size']
  /** Ось `Collapsed` мастера, переименована: `true` там означало раскрытое. */
  defaultOpen?: boolean
}>(), {
  variant: 'plain',
  size: 'md',
  defaultOpen: false,
})

const open = ref(props.defaultOpen)

const titleClass = computed(() => accordionTitle[props.size ?? 'md'])
</script>

<template>
  <div
    data-slot="accordion"
    :class="accordionVariants({ variant: props.variant, size: props.size })"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-4 text-left font-bold outline-none"
      :class="titleClass"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="min-w-0 flex-1">
        <slot name="title" />
      </span>
      <!-- Стрелка в мастере одна на оба состояния; поворот — наш. -->
      <span class="shrink-0 transition-transform" :class="open ? 'rotate-180' : ''">
        <Icon name="chevron-down" :size="16" />
      </span>
    </button>

    <!--
      Тела у бесплашечного вида в мастере НЕТ ни в одном состоянии — проверено
      через absoluteRenderBounds. В коде оно есть у всех видов: аккордеон без
      тела не аккордеон. Осознанное отклонение, см. docs/figma-fixes.md.
    -->
    <div v-if="open" class="pt-3 text-base">
      <slot />
    </div>
  </div>
</template>
