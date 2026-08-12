<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'], size?: 'sm' | 'default' }>(),
  { size: 'default' },
)

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="cn(
      'flex h-10 w-full items-center gap-2 rounded-md border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors select-none',
      'border-input hover:border-stroke-accent data-[state=open]:border-stroke-accent',
      'data-placeholder:text-foreground-secondary',
      'disabled:cursor-not-allowed disabled:border-stroke-neutral disabled:text-foreground-disabled',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-foreground-secondary',
      'disabled:[&_svg]:text-foreground-secondary-disabled',
      props.class,
    )"
  >
    <span v-if="$slots.left" class="flex size-6 shrink-0 items-center justify-center">
      <slot name="left" />
    </span>

    <span class="flex min-w-0 flex-1 items-center">
      <slot />
    </span>

    <SelectIcon as-child>
      <ChevronDownIcon class="size-6 shrink-0 pointer-events-none" />
    </SelectIcon>
  </SelectTrigger>
</template>
