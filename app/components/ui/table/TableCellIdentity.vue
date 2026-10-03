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
 *
 * ## Слот `description` — такт 70
 *
 * Пояснение под именем: 13/16 `--muted-foreground`, зазор 4, не больше двух строк. Строка шага страницы схемы — название
 * 15 Bold и описание 12/16 под ним (Figma `32765:6668`, `32765:6672`); кегль 12 в шкале кита — 13 (`text-xs`), имя
 * остаётся medium по канону блока. С пояснением блок выравнивается по верху: эмблема — у первой строки имени. Без слота
 * разметка прежняя. Решение агента, строка 127 реестра расхождений `docs/scheme-edit.md`.
 */
const props = withDefaults(defineProps<{
  /**
   * Эмблема сущности. Необязательна — такт 24, правило канона «эмблема в блоке
   * идентичности — если у сущности она есть»: у статусной модели своей иконки нет,
   * и блок тогда — только имя, без пустого бокса.
   */
  icon?: IconName
  /** Класс снаружи — слиянием. */
  class?: string
}>(), { icon: undefined, class: undefined })
</script>

<template>
  <span data-slot="table-cell-identity" :class="cn('flex min-w-0 flex-1 gap-2 text-foreground', $slots.description ? 'items-start' : 'items-center', props.class)">
    <span v-if="props.icon" data-slot="table-cell-identity-icon" class="inline-flex size-5 shrink-0 items-center justify-center">
      <Icon :name="props.icon" :size="20" />
    </span>
    <span v-if="$slots.description" class="flex min-w-0 flex-1 flex-col gap-1">
      <TableCellText class="text-sm font-medium">
        <slot />
      </TableCellText>
      <span data-slot="table-cell-identity-description" class="line-clamp-2 text-xs text-muted-foreground">
        <slot name="description" />
      </span>
    </span>
    <TableCellText v-else class="flex-1 text-sm font-medium">
      <slot />
    </TableCellText>
  </span>
</template>
