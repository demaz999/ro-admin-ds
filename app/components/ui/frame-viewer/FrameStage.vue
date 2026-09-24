<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Кадр полноэкранного просмотра с плашкой под ним — такт 34, разбор в `index.ts`.
 * Ширину задаёт изображение: плашка тянется по нему, но ширину не раздвигает.
 */
const props = withDefaults(defineProps<{
  src: string
  alt?: string
  /** Кадр привязан — кольцо успеха вокруг кадра с плашкой (прототип `.lb-stage.on`). */
  assigned?: boolean
  class?: string
}>(), {
  alt: '',
  assigned: false,
})
</script>

<template>
  <figure
    data-slot="frame-stage"
    :data-assigned="props.assigned || undefined"
    :class="cn('m-0 flex max-h-full w-fit max-w-full flex-col rounded-md', props.assigned ? 'ring-2 ring-success' : '', props.class)"
  >
    <img
      :src="props.src"
      :alt="props.alt"
      class="min-h-0 max-w-full rounded-t-md bg-muted object-contain"
    >
    <!-- Плашка: `w-0 min-w-full` — по ширине кадра, свою ширину в расчёт не вносит. -->
    <div class="w-0 min-w-full">
      <slot />
    </div>
  </figure>
</template>
