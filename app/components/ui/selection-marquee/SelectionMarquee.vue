<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Рамка выделения ленты — разбор и таблица «кит | прототип» в `index.ts`.
 * Геометрия — координаты окна в пикселях, их считает страница по движению указателя.
 */
const props = defineProps<{
  rect: { x: number, y: number, width: number, height: number }
  class?: string
}>()
</script>

<template>
  <div
    data-slot="selection-marquee"
    aria-hidden="true"
    :class="cn('pointer-events-none fixed z-40 rounded-2xs border-2 border-primary bg-primary/[var(--opacity-soft)]', props.class)"
    :style="{ left: `${props.rect.x}px`, top: `${props.rect.y}px`, width: `${props.rect.width}px`, height: `${props.rect.height}px` }"
  />
</template>
