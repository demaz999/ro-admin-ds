<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Верхняя полоса приложения — разбор и таблица «кит | прототип» в `index.ts`.
 * Раскладка: бренд (`start`), навигация (по умолчанию, растягивается), статус и действия (`end`) справа.
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <header
    data-slot="app-bar"
    :class="cn('flex h-14 shrink-0 items-center gap-6 bg-sidebar px-4 text-sidebar-foreground', props.class)"
  >
    <div v-if="$slots.start" data-slot="app-bar-start" class="flex shrink-0 items-center gap-6">
      <slot name="start" />
    </div>
    <div v-if="$slots.default" data-slot="app-bar-main" class="flex min-w-0 flex-1 items-center gap-6">
      <slot />
    </div>
    <div v-if="$slots.end" data-slot="app-bar-end" class="ml-auto flex items-center gap-6">
      <slot name="end" />
    </div>
  </header>
</template>
