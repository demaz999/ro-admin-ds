<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Клавиша — разбор в `index.ts`. */
const props = withDefaults(defineProps<{
  /** `card` — клавиша на подложке тона `--tag` (например, на `secondary`-кнопке). */
  surface?: 'tag' | 'card'
  class?: string
}>(), { surface: 'tag' })
</script>

<template>
  <kbd
    data-slot="kbd"
    :class="cn(
      'inline-flex h-4 min-w-4 items-center justify-center rounded-xs px-1 font-sans text-3xs font-bold text-secondary-foreground',
      props.surface === 'card' ? 'bg-card' : 'bg-tag',
      props.class,
    )"
  ><slot /></kbd>
</template>
