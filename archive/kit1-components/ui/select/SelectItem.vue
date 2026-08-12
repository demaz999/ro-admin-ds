<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SelectItemProps & {
  /** Подсказка второй строкой. В мастере зовётся Hint, не subtitle. */
  hint?: string
  /** Мультивыбор: галочка уходит влево и становится 16ic_done. */
  multiselect?: boolean
  class?: HTMLAttributes['class']
}>()

const delegatedProps = reactiveOmit(props, 'class', 'hint', 'multiselect')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<!--
  Пункт списка — мастер `items3` 238:7389, семейство выбранного селекта.

  Не путать с `items` 1058:1919 (строка 52) из другого семейства: там у
  selected фон не меняется, здесь меняется. Разбор — docs/kit-inventory.md.

  Состояния сняты с мастера: hover, selected и hover_selected дают ТРИ разных
  фона, а не один. Цвет — из `mode` по решению B.
-->
<template>
  <SelectItem
    data-slot="select-item"
    :data-multiselect="multiselect || undefined"
    v-bind="forwardedProps"
    :class="cn(
      'relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground outline-none select-none',
      hint ? 'h-13' : 'h-9',
      'data-highlighted:bg-accent',
      'data-[state=checked]:bg-surface-selected data-[state=checked]:text-primary',
      'data-[state=checked]:data-highlighted:bg-surface-selected-hover',
      'data-disabled:pointer-events-none data-disabled:text-foreground-disabled',
      props.class,
    )"
  >
    <!-- multiselect=on: отметка слева, 16×16. -->
    <SelectItemIndicator v-if="multiselect" class="flex size-4 shrink-0 items-center justify-center">
      <svg viewBox="0 0 16 16" fill="none" class="size-4" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </SelectItemIndicator>

    <span v-if="$slots.icon" class="flex size-6 shrink-0 items-center justify-center">
      <slot name="icon" />
    </span>

    <span class="flex min-w-0 flex-1 flex-col">
      <SelectItemText class="truncate">
        <slot />
      </SelectItemText>
      <span
        v-if="hint"
        class="truncate text-xs text-foreground-secondary group-data-disabled:text-foreground-secondary-disabled"
      >
        {{ hint }}
      </span>
    </span>
  </SelectItem>
</template>
