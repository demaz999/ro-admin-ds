<script setup lang="ts">
import type { GalleryItemVariants } from '.'
import { cn } from '@/lib/utils'
import { galleryVariants } from '.'

/**
 * Галерея — мастер `MediaGallery` `6734:62674`.
 * Зазор растёт вместе с плиткой: 24 / 16 / 8. Разбор — в `index.ts`.
 * Класс снаружи сливается через `cn` (такт 101): раскладка задаёт галерее сетку колонок — `grid grid-cols-N` побеждает `flex`.
 */
const props = withDefaults(defineProps<{
  size?: GalleryItemVariants['size']
  class?: string
}>(), { size: 'md', class: undefined })
</script>

<template>
  <div data-slot="media-gallery" :class="cn(galleryVariants({ size: props.size }), props.class)">
    <slot />
  </div>
</template>
