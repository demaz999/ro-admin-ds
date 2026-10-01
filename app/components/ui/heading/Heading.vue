<script setup lang="ts">
import type { HeadingLevel } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { headingMetaShift, headingVariants } from '.'

/**
 * Заголовок страницы (`page`, h1) или блока (`section`, h2) — разбор в `index.ts`.
 * Слот `meta` — текст в строке с заголовком, выровненный по середине строчных (такт 50).
 */
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
  <!--
    Строка «заголовок + текст» при контрасте кеглей — по середине строчных. Оба стоят на базовой линии; внешний узел
    с кеглем заголовка поднимает текст на половину высоты строчных заголовка, внутренний с кеглем текста опускает на
    половину своей: середины строчных совпадают.
  -->
  <div v-if="$slots.meta" data-slot="heading-row" class="flex items-baseline gap-2">
    <component :is="tag" data-slot="heading" :data-level="props.level" :class="cn(headingVariants({ level: props.level }), props.class)">
      <slot />
    </component>
    <span data-slot="heading-meta" :class="cn(headingVariants({ level: props.level }), 'relative bottom-[0.5ex] font-normal leading-none')">
      <span :class="cn('relative text-xs text-muted-foreground', headingMetaShift[props.level])"><slot name="meta" /></span>
    </span>
  </div>
  <component :is="tag" v-else data-slot="heading" :data-level="props.level" :class="cn(headingVariants({ level: props.level }), props.class)">
    <slot />
  </component>
</template>
