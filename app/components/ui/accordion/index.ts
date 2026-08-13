import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Accordion } from './Accordion.vue'

/**
 * Аккордеон — мастер `Accordion` `6644:58398`, спека `6644:58347`,
 * тёмный набор `6758:62009`.
 *
 * **Закрывает старейшую позицию дизайн-долга.** С волны 2 маршрута по киту 1 он
 * стоял на дефолте shadcn-vue с пометкой «в ките нет вовсе». В Атоме он есть.
 *
 * ## Матрица мастера: 30 вариантов
 *
 * Формально четыре оси дают 60 сочетаний, нарисовано 30: **`Color shape` намертво
 * связана с `Shape`** — без плашки цвет только `transparent`, с плашкой только
 * два. Ровно та же связка, что у `Size` и `Rounded` у `Input` и у `Inversion` у
 * `Badge`. Поэтому отдельного пропа цвета нет: он часть вида.
 *
 * | вид | заливка | радиус |
 * |---|---|---|
 * | `plain` | нет | 0 |
 * | `soft` | мягкая ступень | 16 |
 * | `card` | белая | 16 |
 *
 * Заливка `soft` — **девятая** встреча мягкой ступени в мастерах Атома.
 *
 * ## `Collapsed=true` — это РАСКРЫТОЕ состояние
 *
 * Третий случай инвертированного имени оси после `_MenuItem` и `NavigationTile`.
 * Доказано высотой: у крупного размера с плашкой `Collapsed=false` даёт 76, а
 * `Collapsed=true` — **120**. В код имя не переносится: здесь это `open`.
 *
 * ## Без плашки тела нет вовсе
 *
 * У `Shape=false` высота одинаковая в обоих состояниях, и это не обман флагов:
 * проверено `absoluteRenderBounds` — внутри лежат только заголовок и стрелка,
 * тела нет ни в свёрнутом, ни в «раскрытом». То есть бесплашечный аккордеон в
 * мастере нарисован **только заголовком**.
 *
 * В коде тело у него есть: иначе компонент не аккордеон. Это осознанное
 * отклонение — строка в `docs/figma-fixes.md`.
 *
 * ## Три размера из пяти не перенесены
 *
 * Ось `Size` — это шкала заголовка: 40, 32, 28, 24, 20. Первые три — те самые
 * display-ступени, которые решение 30 объявило сайтовым слоем (`cheddar` 40,
 * `camembert` 32, `ricotta` 28). Уже третий компонент, который в них упирается,
 * после `ButtonNavigation` и `Avatar`.
 *
 * Перенесены два размера, легшие в шкалу точно: **24 и 20**. Матрица 30 → 12.
 */
export const accordionVariants = cva('w-full', {
  variants: {
    variant: {
      plain: '',
      soft: 'rounded-xl bg-muted-foreground/[var(--opacity-soft)]',
      card: 'rounded-xl bg-card',
    },
    size: {
      md: '',
      sm: '',
    },
  },
  compoundVariants: [
    // Паддинги есть только у плашечных видов: у бесплашечного их нет вовсе.
    { variant: 'soft', size: 'md', class: 'px-4 py-3' },
    { variant: 'card', size: 'md', class: 'px-4 py-3' },
    { variant: 'soft', size: 'sm', class: 'px-4 py-2' },
    { variant: 'card', size: 'sm', class: 'px-4 py-2' },
  ],
  defaultVariants: {
    variant: 'plain',
    size: 'md',
  },
})

/** Кегль заголовка по размеру: 24 и 20 — единственные ступени мастера в шкале кита. */
export const accordionTitle = {
  md: 'text-2xl',
  sm: 'text-xl',
} as const

export type AccordionVariants = VariantProps<typeof accordionVariants>
