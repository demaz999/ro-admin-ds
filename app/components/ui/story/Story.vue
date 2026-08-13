<script setup lang="ts">
/**
 * Сюжет — мастер `Story` `749:5436`.
 * Кружок с превью и подпись до трёх строк. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  src?: string
  alt?: string
}>(), { src: '', alt: '' })
</script>

<template>
  <a data-slot="story" class="flex w-26 flex-col items-center gap-2">
    <!-- Кружок 104 с кольцом 6: превью внутри 92×92. -->
    <span class="flex size-26 shrink-0 items-center justify-center rounded-full bg-muted-foreground/[var(--opacity-soft)]">
      <span class="size-23 overflow-hidden rounded-full">
        <img
          v-if="props.src"
          :src="props.src"
          :alt="props.alt"
          class="size-full object-cover"
        >
        <slot v-else name="media" />
      </span>
    </span>

    <!-- Высота фиксирована: плитки в ряду не разъезжаются от длины подписи. -->
    <span class="line-clamp-3 h-12 w-full text-center text-xs font-medium">
      <slot />
    </span>
  </a>
</template>
