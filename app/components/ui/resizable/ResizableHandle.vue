<script setup lang="ts">
import type { SplitterResizeHandleEmits, SplitterResizeHandleProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { SplitterResizeHandle, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Ручка между панелями — Reka `SplitterResizeHandle`; разбор и таблица «кит | прототип» — `index.ts`.
 * `withHandle` — захват посередине, виден на наведении, перетаскивании и фокусе.
 */
const props = withDefaults(defineProps<SplitterResizeHandleProps & { withHandle?: boolean, class?: string }>(), {
  withHandle: false,
  disabled: undefined,
})
const emits = defineEmits<SplitterResizeHandleEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class', 'withHandle'), emits)
</script>

<template>
  <SplitterResizeHandle
    data-slot="resizable-handle"
    v-bind="forwarded"
    :class="cn('group/handle relative flex w-2.5 shrink-0 cursor-col-resize items-center justify-center outline-none', props.class)"
  >
    <span
      aria-hidden="true"
      class="absolute inset-y-0 left-1 w-0.5 bg-border-soft transition-colors group-hover/handle:bg-primary group-focus-visible/handle:bg-primary group-data-[state=drag]/handle:bg-primary"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    />
    <span
      v-if="props.withHandle"
      aria-hidden="true"
      class="relative h-8 w-1.5 rounded-xs bg-muted-foreground opacity-0 transition-opacity group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100 group-data-[state=drag]/handle:opacity-100"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    />
  </SplitterResizeHandle>
</template>
