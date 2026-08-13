<script setup lang="ts">
import type { GalleryItemVariants } from '.'
import { galleryItemVariants } from '.'

/**
 * Плитка галереи — мастер `_MediaGalleryItem` `6734:62222`.
 * Пропорция 16:10 у всех трёх размеров; разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  size?: GalleryItemVariants['size']
  /** Ось `Type` мастера: последняя плитка ведёт в полную галерею. */
  more?: boolean
  src?: string
  alt?: string
}>(), {
  size: 'md',
  more: false,
  src: '',
  alt: '',
})
</script>

<template>
  <div
    data-slot="media-gallery-item"
    class="aspect-16/10"
    :class="galleryItemVariants({ size: props.size })"
  >
    <img
      v-if="props.src && !props.more"
      :src="props.src"
      :alt="props.alt"
      class="size-full object-cover"
    >
    <!-- Плитка «показать все»: та же роль, что у отдельного мастера
         ButtonGallery 842:13505 — подпись 13 Medium по центру. -->
    <span
      v-if="props.more"
      class="absolute inset-0 flex items-center justify-center text-xs font-medium"
    >
      <slot>Показать все</slot>
    </span>
  </div>
</template>
