<script setup lang="ts">
import type { GalleryItemVariants } from '.'
import { galleryVariants } from '.'

/**
 * Галерея — мастер `MediaGallery` `6734:62674`.
 * Зазор растёт вместе с плиткой: 24 / 16 / 8. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  size?: GalleryItemVariants['size']
}>(), { size: 'md' })
</script>

<template>
  <div data-slot="media-gallery" :class="galleryVariants({ size: props.size })">
    <slot />
  </div>
</template>
