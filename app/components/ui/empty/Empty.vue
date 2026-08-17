<!--
  @debt Дефолт: пустого состояния нет ни в Атоме, ни в ките 1 — даже
  композицией. Вид собран по аналогии с уже перенесённым.
  См. docs/design-debt.md
-->
<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Пустое состояние списка, таблицы или экрана. Разбор — в `index.ts`. */
const props = defineProps<{
  title: string
  description?: string
  class?: string
}>()
</script>

<template>
  <div
    data-slot="empty"
    :class="cn('flex flex-col items-center gap-2 px-6 py-10 text-center', props.class)"
  >
    <span v-if="$slots.icon" class="mb-2 flex text-muted-foreground">
      <slot name="icon" />
    </span>

    <p data-slot="empty-title" class="text-lg font-bold text-foreground">
      {{ props.title }}
    </p>

    <p
      v-if="props.description"
      data-slot="empty-description"
      class="max-w-100 text-sm text-muted-foreground"
    >
      {{ props.description }}
    </p>

    <!-- Действие отбито на 24: тот же ритм «текст → кнопки», что в модальном окне. -->
    <div v-if="$slots.action" class="mt-4 flex items-center gap-4">
      <slot name="action" />
    </div>
  </div>
</template>
