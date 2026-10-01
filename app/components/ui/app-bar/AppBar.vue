<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Верхняя полоса приложения — разбор и таблица «кит | прототип» в `index.ts`.
 * Раскладка по `top_menu` `33970:14832` (такт 48): левый блок 256 — бургер и логотип (`start`), середина (по умолчанию,
 * растягивается), правый блок у правого края (`end`). Контролы полосы несут внутреннее поле 8 (`IconButton` lg — глиф 24
 * в боксе 40, `Button sidebar`, `AppBarStatus`), поэтому поля и зазоры блоков меньше чисел мастера на 8 с каждой стороны.
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <header
    data-slot="app-bar"
    :class="cn('flex h-14 shrink-0 items-center bg-sidebar text-sidebar-foreground', props.class)"
  >
    <div v-if="$slots.start" data-slot="app-bar-start" class="flex w-64 shrink-0 items-center gap-2 pl-1">
      <slot name="start" />
    </div>
    <div v-if="$slots.default" data-slot="app-bar-main" class="flex min-w-0 flex-1 items-center gap-2 px-6">
      <slot />
    </div>
    <div v-if="$slots.end" data-slot="app-bar-end" class="ml-auto flex shrink-0 items-center gap-2 pr-6">
      <slot name="end" />
    </div>
  </header>
</template>
