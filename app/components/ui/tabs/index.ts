import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'

/**
 * Вкладки — мастера `Tabs` `1782:13075` и `_Tab` `1772:11731`, спека `1092:8943`.
 *
 * ## Два несводимых вида, как и в ките 1
 *
 * Ось `Rounded` разводит их полностью — это не скругление, а другой компонент:
 *
 * | | `line` (`Rounded=false`) | `pill` (`Rounded=true`) |
 * |---|---|---|
 * | таб | 85×32, без фона и паддингов | 117×40, паддинги 10/16, радиус 20 |
 * | активный | линия 4px под текстом, радиус 2 | сплошная брендовая заливка, белый текст |
 * | зазор списка | **20** | **0** |
 *
 * Линия идёт **по ширине текста**, а не таба: внутренний фрейм 63, а сам таб 85 —
 * разницу занимают счётчик 18 и зазор 4.
 *
 * ## Состояния — и как выяснилось, где индикатор
 *
 * Ось `State`: `default` / `active` / `hover` / `disabled`. У кита 1 первых двух
 * не было вовсе — это то, ради чего этап 0 предлагал забрать у Атома оси.
 *
 * | состояние | текст |
 * |---|---|
 * | `default` | `#525760` |
 * | `hover` | `#1d222a` |
 * | `active` | `#1d222a`, плюс индикатор |
 * | `disabled` | `#525760`, весь узел на прозрачности **0.32** |
 *
 * > Индикатор помечен `visible: true` во **всех четырёх** состояниях, заливка
 * > тоже, координаты одинаковые — но `absoluteRenderBounds` у трёх неактивных
 * > равен `null`, то есть они не рисуют ничего. Подтверждено подсчётом пикселей
 * > в экспорте: брендовый цвет встречается ровно дважды — таблетка и одна линия.
 * > Правило «индикатор только у активного» измерено, а не выведено по аналогии.
 */
export const tabsListVariants = cva('inline-flex items-center', {
  variants: {
    variant: {
      line: 'gap-5',
      pill: 'gap-0',
    },
  },
  defaultVariants: { variant: 'line' },
})

export const tabsTriggerVariants = cva(
  'group/tab relative inline-flex items-center gap-1 text-sm font-medium outline-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled-strong)]',
  {
    variants: {
      variant: {
        // Высота 32 = текст 20 + зазор 8 + линия 4. Паддингов у мастера нет.
        line: 'h-8 flex-col justify-start text-field-foreground hover:text-field-foreground-hover data-[state=active]:text-field-foreground-hover',
        // Радиус 20 при высоте 40 — ровно половина, то есть пилюля.
        // Наведение у невыбранной таблетки — поверхность, а не только текст:
        // правило владельца «у всего интерактивного системное наведение»
        // (2026-08-18). У выбранной наведения нет: она уже брендовая.
        pill: 'h-10 justify-center rounded-full px-4 text-field-foreground transition-colors hover:text-field-foreground-hover data-[state=inactive]:hover:bg-secondary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
      },
    },
    defaultVariants: { variant: 'line' },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>
export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>
