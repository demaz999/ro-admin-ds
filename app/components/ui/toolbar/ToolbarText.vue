<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Приглушённый текст полосы — сводка, индикатор, счёт; значения — `index.ts`. */
const props = withDefaults(defineProps<{
  /** В одну строку с многоточием. */
  truncate?: boolean
  /** Занять остаток строки. */
  grow?: boolean
  /** Прижать текст к правому краю. */
  align?: 'start' | 'end'
  class?: string
}>(), {
  truncate: false,
  grow: false,
  align: 'start',
})
</script>

<template>
  <span
    data-slot="toolbar-text"
    :class="cn(
      'text-xs text-muted-foreground',
      props.truncate ? 'min-w-0 truncate' : '',
      props.grow ? 'flex-1 basis-10' : '',
      props.align === 'end' ? 'text-right' : '',
      props.class,
    )"
  >
    <slot />
  </span>
</template>
