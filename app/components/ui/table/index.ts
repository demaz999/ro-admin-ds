import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Table } from './Table.vue'
export { default as TableCell } from './TableCell.vue'
export { default as TableFooter } from './TableFooter.vue'
export { default as TableHead } from './TableHead.vue'
export { default as TableRow } from './TableRow.vue'

/**
 * Таблица — мастера `Cell` `3349:22376`, `TableHeader` `5137:37282`,
 * `_Row` `9062:64690`. Страница `2436:14496`.
 *
 * ## Матрица ячейки урезана решением, а не переносом
 *
 * У оси `Type` двадцать значений, перенесено **пять плюс слот**. Пометка `— DS`
 * означает «дизайн-система даёт готовым»; пятнадцать непомеченных типов —
 * иллюстрации содержимого, а не компоненты. Разбор с семью фактами и решение
 * от 2026-08-13 — в `docs/table-ds-marker.md`.
 *
 * Коротко, почему так: пять помеченных типов дают **390 инстансов из 436** в
 * демонстрационной раскладке, каждый непомеченный встречается ровно 2 или 4
 * раза. И тип `Input` содержит **текстовый слой, а не инстанс поля** — то есть
 * он рисунок контрола, а не композиция с ним.
 *
 * ## Высота диктует кегль
 *
 * Ось `Size` формально имеет четыре значения, но каждый тип использует только
 * два, и разделение проходит по кеглю:
 *
 * | высота | кегль | какие типы |
 * |---|---|---|
 * | 72 · 56 | 16/20 | текст 16, отметка, раскрытие, сворачивание |
 * | 48 · 40 | 13/16 | текст 13 |
 *
 * Вертикальный паддинг во всех случаях — это центрирование: 72 = 26 + 20 + 26,
 * 40 = 12 + 16 + 12. Поэтому в коде высота фиксирована, а содержимое по центру.
 *
 * ## Подсветка живёт на ячейке, а не на строке
 *
 * У `_Row` `9062:64690` заливки нет вовсе, зазора между ячейками тоже нет. Ось
 * `Active` есть у **ячейки**: чтобы подсветить строку, её выставляют каждой
 * ячейке. Заливка — мягкая ступень, восьмая её встреча в мастерах Атома.
 *
 * Это не наше упрощение и не ошибка чтения: строка проверена отдельно, `fills`
 * у неё пустой. Отдано дизайнерам как непоследовательность — подсветка строки
 * логичнее живёт на строке.
 */
export const tableCellVariants = cva('flex shrink-0 items-center', {
  variants: {
    variant: {
      /** Текст. Кегль идёт за высотой, поэтому задан в compound. */
      text: 'pr-6',
      /** Отметка строки, раскрытие и сворачивание — механика самой таблицы. */
      checkbox: 'w-16 justify-center px-6',
      expand: 'w-16 justify-center px-6',
      collapse: 'w-16 justify-center px-6',
      /** Пустая ячейка: всё содержательное кладётся сюда композицией. */
      slot: 'pr-6',
    },
    /** Ось `Active` мастера: подсветка. У Атома она на ячейке, а не на строке. */
    active: {
      true: 'bg-muted-foreground/[var(--opacity-soft)]',
      false: '',
    },
    size: {
      72: 'h-18',
      56: 'h-14',
      48: 'h-12',
      40: 'h-10',
    },
  },
  compoundVariants: [
    // Кегль задаётся высотой: крупные ячейки 16/20, мелкие 13/16.
    { variant: 'text', size: 72, class: 'text-base' },
    { variant: 'text', size: 56, class: 'text-base' },
    { variant: 'text', size: 48, class: 'text-xs' },
    { variant: 'text', size: 40, class: 'text-xs' },
  ],
  defaultVariants: {
    variant: 'text',
    active: false,
    size: 56,
  },
})

/**
 * Шапка — мастер `TableHeader` `5137:37282`. Высота 32, заливка белая,
 * отступ снизу 16, кегль 13 у всех текстовых типов.
 *
 * Три текстовых типа различаются **начертанием и цветом**, а не размером:
 *
 * | тип | начертание | цвет | что значит |
 * |---|---|---|---|
 * | `simple` | Regular | приглушённый | по колонке не сортируют |
 * | `interactive` | **Medium** | основной | сортировка доступна |
 * | `active` | Medium | **брендовый** | по этой колонке сортируют сейчас |
 *
 * Плюс три механизмовых типа шириной 64 — под те же ячейки отметки и раскрытия.
 */
export const tableHeadVariants = cva('flex h-8 shrink-0 items-center bg-card text-xs', {
  variants: {
    variant: {
      simple: 'pb-4 font-normal text-muted-foreground',
      interactive: 'pb-4 font-medium text-field-foreground',
      active: 'pb-4 font-medium text-primary',
      checkbox: 'w-16 justify-center px-6',
      expand: 'w-16 justify-center px-6 pb-3.5',
      collapse: 'w-16 justify-center px-6 pb-3.5',
      /**
       * Заголовок колонки **кита 1** — мастер `columns_name` `19601:29064`:
       * 15 Bold `fg/secondary`, высота строки 48, белая заливка, нижняя
       * граница обычной рамкой. У Атома заголовок мельче (13) и другого цвета:
       * это две разные системы, и в дашборде работает вторая.
       */
      column: 'h-12 bg-card text-sm font-bold text-foreground-secondary',
    },
  },
  defaultVariants: { variant: 'simple' },
})

/**
 * Заливка строки целиком — мастер `table_line` `19524:9679` кита 1, четыре
 * состояния. У Атома этого нет: там подсветка на ячейке. Разбор — в `TableRow.vue`.
 */
export const tableRowVariants = cva('flex w-full items-stretch border-b border-border-soft transition-colors last:border-b-0', {
  variants: {
    state: {
      default: 'bg-card',
      new: 'bg-surface-new',
      selected: 'bg-secondary',
    },
    interactive: {
      true: 'cursor-pointer',
      false: '',
    },
  },
  compoundVariants: [
    // Наведение осветляет только непомеченную строку: у выбранной и новой
    // своя заливка, и перебивать её наведением мастер не просит.
    { state: 'default', interactive: true, class: 'hover:bg-accent' },
  ],
  defaultVariants: { state: 'default', interactive: false },
})

export type TableRowVariants = VariantProps<typeof tableRowVariants>
export type TableCellVariants = VariantProps<typeof tableCellVariants>
export type TableHeadVariants = VariantProps<typeof tableHeadVariants>
