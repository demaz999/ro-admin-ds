<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Приглушённый текст полосы — сводка, индикатор, счёт; заголовок страницы в полосе; значения — `index.ts`. */
const props = withDefaults(defineProps<{
  /** В одну строку с многоточием. */
  truncate?: boolean
  /** Занять остаток строки. */
  grow?: boolean
  /** Прижать текст к правому краю. */
  align?: 'start' | 'end'
  /**
   * `text` — приглушённый текст 13/16; `title` — заголовок страницы в полосе 24/28 bold `--foreground` (такт 46,
   * приёмка владельца 2026-10-01: «Свободная съёмка» — заголовком h1 вместо метки).
   */
  variant?: 'text' | 'title'
  /** Тег: заголовок страницы — `h1`. */
  as?: string
  class?: string
}>(), {
  truncate: false,
  grow: false,
  align: 'start',
  variant: 'text',
  as: 'span',
})
</script>

<template>
  <component
    :is="props.as"
    data-slot="toolbar-text"
    :data-variant="props.variant"
    :class="cn(
      props.variant === 'title' ? 'm-0 text-2xl font-bold text-foreground' : 'text-xs text-muted-foreground',
      props.truncate ? 'min-w-0 truncate' : '',
      props.grow ? 'flex-1 basis-10' : '',
      props.align === 'end' ? 'text-right' : '',
      props.class,
    )"
  >
    <slot />
  </component>
</template>
