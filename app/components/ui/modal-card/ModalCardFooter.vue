<script setup lang="ts">
import { computed, inject } from 'vue'
import { cn } from '@/lib/utils'
import { MODAL_CARD_KEY } from '.'

/**
 * Подвал окна-карточки: строка в потоке, паддинги 0/16, кнопки справа через 24 — мастер `card`
 * `817:34525` и «Настройка таблицы» `19942:192457`. Слот `note` слева — текст подвала: у кита
 * «Regular 15/16» вне шкалы, взято 15/20 `--foreground-secondary`. Кнопки — `Button` md 40
 * (решение владельца 2).
 *
 * Узкий экран у окна `narrow="full"` (такт 92): ниже 768 текст подвала — строкой во всю ширину над кнопками, кнопки — справа
 * с переносом.
 */
const props = defineProps<{ class?: string }>()

const ctx = inject(MODAL_CARD_KEY, null)
const narrow = computed(() => ctx?.narrow?.value ?? false)
</script>

<template>
  <div data-slot="modal-card-footer" :class="cn('flex shrink-0 items-center gap-4 px-4', narrow ? 'max-md:flex-wrap max-md:gap-y-3' : '', props.class)">
    <span v-if="$slots.note" data-slot="modal-card-note" :class="cn('min-w-0 flex-1 text-2xs text-foreground-secondary', narrow ? 'max-md:basis-full' : '')">
      <slot name="note" />
    </span>
    <!-- Между кнопками действий — 16 (такт 51, решение владельца 2026-10-01; было 24). -->
    <div data-slot="modal-card-actions" :class="cn('ml-auto flex shrink-0 items-center gap-4', narrow ? 'max-md:max-w-full max-md:flex-wrap max-md:justify-end max-md:gap-3' : '')">
      <slot />
    </div>
  </div>
</template>
