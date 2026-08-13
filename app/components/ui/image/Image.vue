<script setup lang="ts">
import { computed } from 'vue'

/**
 * Изображение — мастер `Image` `174:3128`.
 * Ось `Ratio` — чистые пропорции; габариты мастера это один снимок в шести
 * пропорциях, а не шесть размеров. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Ratio` мастера. */
  ratio?: '10:16' | '3:4' | '1:1' | '4:3' | '16:10' | '2:1'
  src?: string
  alt?: string
}>(), {
  ratio: '1:1',
  src: '',
  alt: '',
})

const aspect = computed(() => props.ratio.replace(':', ' / '))
</script>

<template>
  <div
    data-slot="image"
    class="w-full overflow-hidden"
    :style="{ aspectRatio: aspect }"
  >
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt"
      class="size-full object-cover"
    >
    <slot v-else />
  </div>
</template>
