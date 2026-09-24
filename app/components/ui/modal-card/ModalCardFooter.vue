<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Подвал окна-карточки: строка в потоке, паддинги 0/16, кнопки справа через 24 — мастер `card`
 * `817:34525` и «Настройка таблицы» `19942:192457`. Слот `note` слева — текст подвала: у кита
 * «Regular 15/16» вне шкалы, взято 15/20 `--foreground-secondary`. Кнопки — `Button` md 40
 * (решение владельца 2).
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div data-slot="modal-card-footer" :class="cn('flex shrink-0 items-center gap-6 px-4', props.class)">
    <span v-if="$slots.note" data-slot="modal-card-note" class="min-w-0 flex-1 text-sm text-foreground-secondary">
      <slot name="note" />
    </span>
    <div class="ml-auto flex shrink-0 items-center gap-6">
      <slot />
    </div>
  </div>
</template>
