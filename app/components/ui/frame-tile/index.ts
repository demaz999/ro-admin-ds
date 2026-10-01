import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

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
 * радиус 16 и подложка `--muted`. `MediaGalleryItem` не тронут. С такта 46 радиус плитки и картинки — 4;
 * с довеска такта 48 — 6 (`--radius-sm`, решение владельца 2026-10-01; у прототипа тоже 6).
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
 * С такта 47 (приёмка владельца 2026-10-01, п. 5) места действий на картинке закреплены: флажок — слева вверху,
 * «во весь экран» — справа вверху, «Открепить» — слева от него, лупа «Показать в структуре» — справа внизу над полосой,
 * маркер видео — слева внизу. Геометрия одна: зона 32, видимая плашка 28 `--scrim-dark`, белый глиф 16, отступ 8.
 * Глиф «во весь экран» — 18 (довесок такта 48): контур Material из прямых со штрихом 80 единиц при боксе 720, целые
 * пиксели он даёт при 18 (штрих 2, плечо уголка 5); при 16 штрих 1.78 и уголки размываются неодинаково.
 * Замок защищённого кадра — в полосе справа, как до такта 46; в полосе — текст статуса без иконки (такт 46, п. 14).
 *
 * Шестое состояние спеки — «снят в шаге» — в ленте не выводится (§4.1): такой
 * кадр живёт только миниатюрой `StepThumb` внутри шага.
 *
 * **Подпись — полоса под картинкой** (такт 51): у свободного кадра — время и длительность видео (§4, решение
 * владельца 2), у кадра с привязкой — полоса в цвете статуса с названием шага; время у него не выводится.
 *
 * ## Граница со страницей
 *
 * Плитка рисует состояние и сообщает намерения: `toggle-select`, `open`,
 * `locate`, `unassign`. Выделение диапазоном и рамкой, перетаскивание,
 * взаимная подсветка с панелью — логика страницы (`free-shoot.md`, раздел 4):
 * сюда они приходят пропами `selected`, `selectionMode`, `dragging`, `dimmed`,
 * `linked`.
 */
/**
 * ## Целые пиксели устройства — такт 51
 *
 * Значок «во весь экран» выглядел кривым: SVG рисуется с дробным сдвигом, если плашка стоит на дробном пикселе устройства.
 * При масштабе 1.25 целые пиксели — координаты, кратные 4. Поэтому: рамка плитки — контур внутрь (`outline`, в раскладке
 * не участвует), ширина колонки сетки и высота картинки кратны 4, плашки стоят в 8 от краёв картинки, полоса подписи 24.
 * Высота картинки — 3/4 ширины, округлённые вниз до 4: от пропорции 4:3 кадр отходит меньше чем на 4 по высоте.
 */
export const frameTileVariants = cva(
  'group/tile relative flex cursor-pointer flex-col overflow-hidden rounded-sm bg-card outline -outline-offset-1 select-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      /** Выделен: рамка брендовая, кольцо светлой брендовой ступенью (`.card.sel`). */
      selected: {
        true: 'outline-stroke-accent ring-2 ring-secondary-hover',
        false: 'outline-border-soft hover:shadow-elevated',
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
 * Полоса привязки под картинкой — такт 51, решение владельца 2026-10-01: подпись ушла из картинки в полосу 24 под ней,
 * градиента и тени нет; полоса залита тёмной ступенью роли сплошняком, текст 13/16 medium белым. До такта 51 — плашка
 * с градиентом поверх нижнего края кадра (`.mark` прототипа).
 */
export const frameTilePlateVariants = cva(
  'flex h-6 items-center gap-1 px-2 text-xs font-medium text-primary-foreground',
  {
    variants: {
      state: {
        assigned: 'bg-success-strong',
        suggested: 'bg-warning-strong',
        locked: 'bg-surface-contrast',
        rejected: 'bg-destructive-strong',
      },
    },
    defaultVariants: { state: 'assigned' },
  },
)

/**
 * Сетка ленты: `auto-fill` с минимальной шириной колонки (спека §8.1). Минимум
 * M = 176 — ступень `MediaGalleryItem` md, L = 272 — ширина варианта `16:10`
 * мастера `Image` `174:3128`. Промежуток — 8 (довесок такта 48, решение владельца 2026-10-01; до того 16 —
 * `MediaGallery` md; у прототипа 9). Страница передаёт число колонок явно (`columns`, `frameTileColumns`).
 */
const frameTileGrid = cva('grid items-start justify-start gap-2', {
  variants: {
    size: {
      md: 'grid-cols-[repeat(auto-fill,minmax(--spacing(44),1fr))]',
      lg: 'grid-cols-[repeat(auto-fill,minmax(--spacing(68),1fr))]',
    },
    /**
     * Число колонок явно — такт 42, решение чата 2026-09-30: число колонок ленты — структура прототипа при той же
     * ширине окна и панели. Страница считает его правилом `frameTileColumns` и передаёт сюда; без него — `auto-fill`.
     *
     * Довесок такта 48: ширина колонки округляется вниз (`round`); с такта 51 шаг — 4, единица шкалы: при масштабе 1.25
     * целыми пикселями устройства выходят только координаты, кратные 4.
     * При дробной колонке (874 на 4 колонки — 212.5) плитки со второй вставали на полпикселя, и глифы плашек
     * размывались несимметрично; остаток — до 3 на колонку — уходит к правому краю сетки.
     */
    columns: {
      1: 'grid-cols-[repeat(1,minmax(0,1fr))]',
      2: 'grid-cols-[repeat(2,round(down,calc((100%_-_1_*_--spacing(2))_/_2),--spacing(1)))]',
      3: 'grid-cols-[repeat(3,round(down,calc((100%_-_2_*_--spacing(2))_/_3),--spacing(1)))]',
      4: 'grid-cols-[repeat(4,round(down,calc((100%_-_3_*_--spacing(2))_/_4),--spacing(1)))]',
      5: 'grid-cols-[repeat(5,round(down,calc((100%_-_4_*_--spacing(2))_/_5),--spacing(1)))]',
      6: 'grid-cols-[repeat(6,round(down,calc((100%_-_5_*_--spacing(2))_/_6),--spacing(1)))]',
      7: 'grid-cols-[repeat(7,round(down,calc((100%_-_6_*_--spacing(2))_/_7),--spacing(1)))]',
      8: 'grid-cols-[repeat(8,round(down,calc((100%_-_7_*_--spacing(2))_/_8),--spacing(1)))]',
      9: 'grid-cols-[repeat(9,round(down,calc((100%_-_8_*_--spacing(2))_/_9),--spacing(1)))]',
      10: 'grid-cols-[repeat(10,round(down,calc((100%_-_9_*_--spacing(2))_/_10),--spacing(1)))]',
      11: 'grid-cols-[repeat(11,round(down,calc((100%_-_10_*_--spacing(2))_/_11),--spacing(1)))]',
      12: 'grid-cols-[repeat(12,round(down,calc((100%_-_11_*_--spacing(2))_/_12),--spacing(1)))]',
    },
  },
  defaultVariants: { size: 'md' },
})

/**
 * Классы сетки. Слияние через `cn`: явное число колонок вытесняет `auto-fill` размера. Без слияния оба класса стояли
 * рядом, и побеждал тот, что ниже в CSS, — `auto-fill`; число колонок совпадало, поэтому до довеска такта 48 этого не
 * было видно.
 */
export const frameTileGridVariants = (props?: FrameTileGridVariants) => cn(frameTileGrid(props))

/**
 * Число колонок ленты — правило `auto-fill` прототипа (`.grid`: `repeat(auto-fill, minmax(var(--card), 1fr))`, `--card`
 * 176 / 272) с зазором кита 8: сколько колонок шириной от 176 / 272 через 8 входит в ширину (решение чата 2026-09-30,
 * такт 42; зазор 8 вместо 9 прототипа — довесок такта 48, решение владельца 2026-10-01). `width` — ширина содержимого сетки.
 */
export function frameTileColumns(width: number, size: 'md' | 'lg' = 'md') {
  const card = size === 'lg' ? 272 : 176
  const gap = 8
  return Math.min(12, Math.max(1, Math.floor((width + gap) / (card + gap)))) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export type FrameTileState = 'free' | 'assigned' | 'suggested' | 'locked' | 'rejected'
export type FrameTileGridVariants = VariantProps<typeof frameTileGrid>
