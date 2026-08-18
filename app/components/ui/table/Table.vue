<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Контейнер таблицы — узлы `table_content` и `table` кадра `19601:29029`.
 *
 * ## Что он несёт
 *
 * | Что | С макета |
 * |---|---|
 * | рамка | `#d9e8fc` толщиной 1 по контуру, роль `--border-soft` |
 * | заливка | белая |
 * | скругление | **нет**: у контейнера таблицы радиус нулевой, в отличие от карточек и панелей |
 * | прокрутка | горизонтальная: содержимое шире видимой области (1776 против 1372) |
 *
 * Скругления нет намеренно — проверено по узлу. Плитка и панели в этом же
 * макете скруглены на 16, таблица нет: она упирается в края области.
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div
    data-slot="table"
    role="table"
    :class="cn('w-full overflow-x-auto border border-border-soft bg-card', props.class)"
  >
    <div class="min-w-max">
      <slot />
    </div>
  </div>
</template>
