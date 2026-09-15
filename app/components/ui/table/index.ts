import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Table } from './Table.vue'
export { default as TableCell } from './TableCell.vue'
export { default as TableCellText } from './TableCellText.vue'
export { default as TableCellIdentity } from './TableCellIdentity.vue'
export { default as TableFooter } from './TableFooter.vue'
export { default as TableHead } from './TableHead.vue'
export { default as TableRow } from './TableRow.vue'
export { default as TableRowAction } from './TableRowAction.vue'
export { default as TableRowActions } from './TableRowActions.vue'
export { default as TableToolbar } from './TableToolbar.vue'

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
      /**
       * Многозначная ячейка — канон, такт 24: метки значений инлайном с переносом,
       * зазор 8 по обеим осям, без потолка и без «+N». Мастера нет; решение владельца.
       *
       * `[contain:inline-size]` обязателен: контейнер таблицы стоит на `min-w-max` и
       * без него считает ширину ячейки как одну длинную строку меток — таблица
       * распухала вбок, метки не переносились, колонка действий уезжала за экран.
       *
       * Высота растёт с числом линий: фиксированная высота размера снята в compound
       * ниже, от неё остаётся минимум. `py-3` — под метку 32 в строке 56: 12 + 32 + 12.
       */
      values: 'flex-wrap content-center gap-2 py-3 [contain:inline-size]',
    },
    /** Ось `Active` мастера: подсветка. У Атома она на ячейке, а не на строке. */
    active: {
      true: 'bg-muted-foreground/[var(--opacity-soft)]',
      false: '',
    },
    /**
     * Такт 26, решение владельца: в строке, которую растит многозначная ячейка,
     * соседние ячейки стоят у **первой линии меток**. `start` прижимает ячейку к верху
     * строки и сохраняет высоту размера: центр её содержимого совпадает с центром первой
     * линии `values` — 28 при размере 56 (12 + 32 / 2).
     *
     * До такта то же положение давала растяжка строки: у ячейки с заданной высотой
     * `align-self: stretch` работает как прижатие к верху. Ось делает это положение
     * явным правилом ячейки.
     */
    align: {
      stretch: '',
      start: 'self-start',
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
    // Многозначная ячейка растёт с числом линий: высота размера становится минимумом.
    { variant: 'values', size: 72, class: 'h-auto min-h-18' },
    { variant: 'values', size: 56, class: 'h-auto min-h-14' },
    { variant: 'values', size: 48, class: 'h-auto min-h-12' },
    { variant: 'values', size: 40, class: 'h-auto min-h-10' },
  ],
  defaultVariants: {
    variant: 'text',
    active: false,
    size: 56,
    align: 'stretch',
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
/**
 * `group/table-row` — именованная группа для ховера строки. Пришла с
 * такта 10: колонка «Действия» разворачивает подпись у сервисной иконки не
 * по своему наведению, а по наведению **всей строки** — тот же приём, что у
 * `group/card` в карточке осмотра (заголовок уходит в ховер при наведении на
 * всю карточку, не только на текст). Живёт на строке всегда, независимо от
 * того, есть ли в ней раскрывающееся действие: маркер без потребителя ничего
 * не стоит, а отсутствие маркера там, где он вдруг понадобится, — молчаливый
 * дефект сборки.
 */
export const tableRowVariants = cva('group/table-row flex w-full items-stretch border-b border-border-soft transition-colors last:border-b-0', {
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

/**
 * Действие строки для `TableRowActions`. Ключ задаёт место в глобальном порядке
 * колонки (`TABLE_ROW_ACTION_ORDER`), а не место в массиве страницы.
 */
export interface TableRowActionItem {
  key: string
  label: string
  icon: import('../icon/icons').IconName
  /** Недоступно по правам: слот остаётся на месте, действие гаснет. */
  disabled?: boolean
  /** Удаление и подобное: голой иконкой не ставится, уходит в кебаб отдельной секцией. */
  destructive?: boolean
}

/**
 * Порядок пунктов кебаба: копировать, архивировать, экспортировать, удалить.
 * Решение владельца, такт 20; с такта 21 это порядок только внутри кебаба —
 * инлайн-очереди слотов больше нет, колонка всегда из двух слотов.
 */
export const TABLE_ROW_ACTION_ORDER = ['copy', 'archive', 'export', 'delete'] as const

/**
 * Ширина колонки «Действия» — две ступени по наличию вторичных действий на странице.
 * Решение владельца, такт 27: резерв вторичного слота такта 22 снят. Внутри страницы
 * карандаш стоит на одной X у всех строк; между страницами X различается на ширину
 * слота — осознанная цена.
 *
 * **Со вторичным слотом** — `TABLE_ROW_ACTIONS_COLUMN`. Расчёт: подпись «Редактировать»
 * 15/20 — 102.6, до слота карандаша 8 (12 до глифа), слот карандаша 24, зазор 8,
 * вторичный слот 24, паддинги ячейки 16 + 16 — итого 198.6, до кратного 4 — **200**.
 *
 * **Только карандаш** — `TABLE_ROW_ACTIONS_COLUMN_EDIT_ONLY`. Расчёт: подпись 102.6,
 * до слота карандаша 8 (12 до глифа), слот карандаша 24, паддинги 16 + 16 — итого
 * 166.6, до кратного 4 — **168**. Правый край карандаша стоит на паддинге 16 — на одной
 * вертикали с правым краем «Добавить» в шапке.
 *
 * Классы статичные: собранную строку Tailwind не увидит.
 */
export const TABLE_ROW_ACTIONS_COLUMN = 'w-50'
export const TABLE_ROW_ACTIONS_COLUMN_EDIT_ONLY = 'w-42'

/**
 * Ширина колонки по набору действий страницы: есть вторичные — со слотом, нет — только
 * карандаш. Страница передаёт набор, ступень выбирает кит.
 */
export function tableRowActionsColumn(actions: readonly TableRowActionItem[]) {
  return actions.length ? TABLE_ROW_ACTIONS_COLUMN : TABLE_ROW_ACTIONS_COLUMN_EDIT_ONLY
}

export type TableRowVariants = VariantProps<typeof tableRowVariants>
export type TableCellVariants = VariantProps<typeof tableCellVariants>
export type TableHeadVariants = VariantProps<typeof tableHeadVariants>
