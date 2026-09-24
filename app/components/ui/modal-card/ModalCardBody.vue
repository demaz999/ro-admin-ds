<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Тело окна-карточки: прокручивается только оно, шапка и подвал неподвижны (решение владельца 2,
 * «История изменений» `19751:28905`). Контент — ещё на 16 внутрь паддинга карточки, то есть в 32
 * от края; полоса — у края тела, в 16 от края карточки. Полоса — `Scroll` кита `815:30416`.
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div data-slot="modal-card-body" :class="cn('modal-card-scroll min-h-0 flex-1 overflow-y-auto px-4', props.class)">
    <slot />
  </div>
</template>

<style scoped>
/*
  Полоса прокрутки — `Scroll` кита 1 `815:30416`: дорожка 4 на `border/neutral_soft`, бегунок 4,
  радиус 4, `neutral/default`. Решение владельца 2026-09-23 (решение 2 такта 35).
*/
@supports not selector(::-webkit-scrollbar) {
  .modal-card-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--muted-foreground) var(--border-neutral);
  }
}

.modal-card-scroll::-webkit-scrollbar {
  width: calc(var(--spacing) * 1); /* 4px */
}

.modal-card-scroll::-webkit-scrollbar-track {
  background: var(--border-neutral);
  border-radius: var(--radius-xs);
}

.modal-card-scroll::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
  border-radius: var(--radius-xs);
}
</style>
