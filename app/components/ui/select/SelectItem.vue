<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<!--
  Пункт списка — мастер `items` 1058:1919, тип `item_title`.

  Снято с мастера, чего нет в стоковом SelectItem:
  - hover и selected РАЗВЕДЕНЫ: hover красит фон, selected красит текст и
    ставит галочку, а фон при этом не трогает;
  - галочка справа, отдельным фреймом, а не слева абсолютом;
  - disabled гасит текст, но не иконки — в ките они остаются в fg/primary.
-->
<template>
  <SelectItem
    data-slot="select-item"
    v-bind="forwardedProps"
    :class="cn(
      'relative flex h-9 w-full cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground outline-none select-none',
      'data-highlighted:bg-accent',
      'data-[state=checked]:text-primary',
      'data-disabled:pointer-events-none data-disabled:text-foreground-disabled',
      props.class,
    )"
  >
    <span v-if="$slots.icon" class="flex size-6 shrink-0 items-center justify-center">
      <slot name="icon" />
    </span>

    <SelectItemText class="min-w-0 flex-1 truncate">
      <slot />
    </SelectItemText>

    <!-- selector_icon: фрейм 16×20 с глифом 20, справа от текста. -->
    <SelectItemIndicator class="flex h-5 w-4 shrink-0 items-center justify-center text-primary">
      <svg viewBox="0 0 20 20" fill="none" class="size-5" aria-hidden="true">
        <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </SelectItemIndicator>
  </SelectItem>
</template>
