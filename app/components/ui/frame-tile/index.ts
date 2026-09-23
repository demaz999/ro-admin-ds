import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as FrameTile } from './FrameTile.vue'

/**
 * Плитка кадра — лента материалов экрана «Распределение свободной съёмки»
 * (VA-9265). Такт 30. **Мастера в Figma нет**: источник — прототип v17 и спека,
 * редакция 1 (`docs/sources/va-9265/`). Разбор с замерами и провенансом —
 * `docs/free-shoot.md`, раздел 1.
 *
 * ## Своя плитка на `Image` 4:3
 *
 * Решение владельца 2 (2026-09-23). Кадр с телефона снят в **4:3**; плитка
 * галереи кита — 16:10 и срезала бы 16.7% высоты кадра, на котором эксперт ищет
 * шильдик или номер. Поэтому изображение — `Image ratio="4:3"` (пропорция из
 * мастера `Image` `174:3128`), а от `MediaGalleryItem` md взяты только ступени:
 * радиус 16 и подложка `--muted`. `MediaGalleryItem` не тронут.
 *
 * ## Пять состояний кадра (спека §4)
 *
 * | `state` | вид | хвост плашки |
 * |---|---|---|
 * | `free` | в цвете, время в подписи | плашки нет |
 * | `assigned` | обесцвечен, плашка `--success-strong` | крестик «Открепить» |
 * | `suggested` | как `assigned`, кольцо `--warning`, плашка `--warning-strong` | крестик |
 * | `locked` | как `assigned`, плашка `--surface-contrast` | замок с причиной |
 * | `rejected` | как `assigned`, плашка `--destructive-strong`, «отклонён · шаг» | замок с причиной |
 *
 * Шестое состояние спеки — «снят в шаге» — в ленте не выводится (§4.1): такой
 * кадр живёт только миниатюрой `StepThumb` внутри шага.
 *
 * **Плашка лежит поверх строки подписи**, как в прототипе: у кадра с привязкой
 * время и длительность видео не видны. Время выводится только у свободного
 * кадра (§4) — решение владельца 2.
 *
 * ## Граница со страницей
 *
 * Плитка рисует состояние и сообщает намерения: `toggle-select`, `open`,
 * `locate`, `unassign`. Выделение диапазоном и рамкой, перетаскивание,
 * взаимная подсветка с панелью — логика страницы (`free-shoot.md`, раздел 4):
 * сюда они приходят пропами `selected`, `selectionMode`, `dragging`, `dimmed`,
 * `linked`.
 */
export const frameTileVariants = cva(
  'group/tile relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card outline-none select-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      /** Выделен: рамка брендовая, кольцо светлой брендовой ступенью (`.card.sel`). */
      selected: {
        true: 'border-stroke-accent ring-2 ring-secondary-hover',
        false: 'border-border-soft hover:shadow-elevated',
      },
      /** У кадра есть привязка — фон корня светлой нейтралью (`.card.placed`). */
      placed: {
        true: 'bg-accent',
        false: '',
      },
      /** Предложен автоматом — кольцо «нужно внимание» (`.card.auto`, спека §13.1). */
      suggested: {
        true: 'ring-2 ring-warning',
        false: '',
      },
      /** Кадр шага под курсором в панели (`.feed.linking .card.linked`, §15.2). */
      linked: {
        true: 'ring-2 ring-primary',
        false: '',
      },
      /** Чужой кадр при подсветке связи — до 32% (§15.2). */
      dimmed: {
        true: 'opacity-[var(--opacity-dimmed)]',
        false: '',
      },
      dragging: {
        true: 'opacity-[var(--opacity-disabled)]',
        false: '',
      },
    },
    defaultVariants: {
      selected: false,
      placed: false,
      suggested: false,
      linked: false,
      dimmed: false,
      dragging: false,
    },
  },
)

/**
 * Плашка привязки: градиент от прозрачного к тёмной ступени роли, сплошной с
 * 45% высоты (`.mark`). Прототип держит заливку на 90–94%; такой ступени
 * прозрачности в ките нет, поэтому заливка сплошная — контраст только выше.
 * Прецедент градиента поверх кадра — `NavigationTile` (`to-scrim-dark`).
 */
export const frameTilePlateVariants = cva(
  'absolute inset-x-0 bottom-0 z-10 flex items-center gap-1 bg-linear-to-b from-transparent via-45% px-2 pt-4 pb-1 text-2xs font-medium text-primary-foreground',
  {
    variants: {
      state: {
        assigned: 'via-success-strong to-success-strong',
        suggested: 'via-warning-strong to-warning-strong',
        locked: 'via-surface-contrast to-surface-contrast',
        rejected: 'via-destructive-strong to-destructive-strong',
      },
    },
    defaultVariants: { state: 'assigned' },
  },
)

/**
 * Сетка ленты: `auto-fill` с минимальной шириной колонки (спека §8.1). Минимум
 * M = 176 — ступень `MediaGalleryItem` md, L = 272 — ширина варианта `16:10`
 * мастера `Image` `174:3128`. Промежуток 16 (`MediaGallery` md) вместо 9
 * прототипа: число колонок при 1440 и 1280 то же — закрыто фактом в разборе.
 */
export const frameTileGridVariants = cva('grid items-start gap-4', {
  variants: {
    size: {
      md: 'grid-cols-[repeat(auto-fill,minmax(--spacing(44),1fr))]',
      lg: 'grid-cols-[repeat(auto-fill,minmax(--spacing(68),1fr))]',
    },
  },
  defaultVariants: { size: 'md' },
})

export type FrameTileState = 'free' | 'assigned' | 'suggested' | 'locked' | 'rejected'
export type FrameTileGridVariants = VariantProps<typeof frameTileGridVariants>
