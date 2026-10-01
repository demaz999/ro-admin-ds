<script setup lang="ts">
import type { HeadingLevel } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { headingVariants } from '.'

/** Заголовок страницы (`page`, h1) или блока (`section`, h2) — разбор в `index.ts`. */
const props = withDefaults(defineProps<{
  level?: HeadingLevel
  /** Тег вместо уровня по умолчанию: `legend`, `h3`… Вид не меняется. */
  as?: string
  class?: string
}>(), {
  level: 'section',
  as: undefined,
})

const tag = computed(() => props.as ?? (props.level === 'page' ? 'h1' : 'h2'))
</script>

<template>
  <component :is="tag" data-slot="heading" :data-level="props.level" :class="cn(headingVariants({ level: props.level }), props.class)">
    <slot />
  </component>
</template>
