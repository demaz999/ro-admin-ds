<script setup lang="ts">
import { Icon } from '../icon'
import type { IconName } from '../icon/icons'
import TableCellText from './TableCellText.vue'
import { cn } from '@/lib/utils'

/**
 * Блок идентичности строки: эмблема сущности и её имя одной ячейкой. Решение
 * владельца, такт 20 (B): колонка «Иконка» снята, эмблема слилась с именем.
 *
 * ## Геометрия — пункта меню кита 1, а не новая
 *
 * Иконка 20 в боксе 20×20, зазор 8, подпись 15/20 — ровно раскладка `it_content`
 * пункта `left_menu` кита 1 (`menuItemContent`: иконка 20, `gap-2`, `text-sm`).
 * Там это «иконка + подпись» строки меню, здесь — строки таблицы.
 *
 * Имя набрано **medium**, остальные ячейки строки — regular: имя весом выше соседей,
 * так строка читается от сущности. Референс — OpenSea (аватар и имя одним блоком).
 *
 * Иконка идёт за цветом имени (`currentColor`). Обрезанное имя получает подсказку
 * полного текста — механика `TableCellText`.
 */
const props = withDefaults(defineProps<{
  icon: IconName
  /** Класс снаружи — слиянием. */
  class?: string
}>(), { class: undefined })
</script>

<template>
  <span data-slot="table-cell-identity" :class="cn('flex min-w-0 flex-1 items-center gap-2 text-foreground', props.class)">
    <span data-slot="table-cell-identity-icon" class="inline-flex size-5 shrink-0 items-center justify-center">
      <Icon :name="props.icon" :size="20" />
    </span>
    <TableCellText class="flex-1 text-sm font-medium">
      <slot />
    </TableCellText>
  </span>
</template>
