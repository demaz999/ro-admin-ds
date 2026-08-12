import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/**
 * Кнопка кита. В ките 1 это ЧЕТЫРЕ отдельных мастера, здесь — один компонент
 * с пропом `variant`:
 *
 * | Мастер | node | variant | Осей вариантов |
 * |---|---|---|---|
 * | `btn_accent` | 709:6413 | `default` | state ×5, size ×2 — 10 |
 * | `btn_secondary` | 713:3319 | `secondary` | state ×4, size ×2 — 8 |
 * | `btn_outline` | 1990:226 | `outline` | state ×4, size ×2 — 8 |
 * | `btn_txt` | 715:3605 | `ghost` | size ×2, color ×3, type ×2, icon size ×2 — 27 |
 *
 * Что снято с мастеров и чего не было бы при сборке от shadcn:
 *
 * - **Иконки всегда в составе.** В мастерах это не ось варианта, а булевы
 *   свойства `show_icon_left` / `show_icon_right`, оба по умолчанию включены.
 *   Слот иконки — 24×24 у залитых кнопок.
 * - **Асимметрия отступов.** `itemSpacing` контейнера = 0, а зазор 4 создаётся
 *   боковыми паддингами обёртки текста. Итог: до иконки 10, до текста 14.
 * - **У secondary фон НЕ меняется** в hover и pressed — меняется только цвет
 *   текста и иконки. У outline фона нет вовсе, меняются обводка и текст.
 * - **Пятое состояние `not_active`** есть только у accent: фон `neutral/soft`,
 *   текст `fg/primary`. В shadcn такого нет — вынесено пропом `inactive`.
 * - **Цвет иконки всегда равен цвету текста**, отдельного токена нет →
 *   глиф красится через `currentColor`.
 *
 * @debt `btn_accent` в мастере имеет фиксированную ширину 152, и квадратной
 * icon-only кнопки на акценте в ките не нарисовано. В коде ширина по контенту.
 * См. docs/design-debt.md
 */
export const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:border-stroke-accent disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // btn_accent: фон меняется по состояниям, текст всегда on-accent.
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:bg-primary-disabled',
        // btn_secondary: фон один и тот же, ходит только текст.
        secondary: 'bg-secondary text-primary hover:text-primary-hover active:text-primary-pressed disabled:bg-secondary-disabled disabled:text-primary-disabled',
        // btn_outline: заливки нет ни в одном состоянии, обводка идёт за текстом.
        outline: 'border-stroke-accent bg-transparent text-primary hover:border-primary-hover hover:text-primary-hover active:border-primary-pressed active:text-primary-pressed disabled:border-primary-disabled disabled:text-primary-disabled',
        // btn_txt: ни фона, ни паддингов, зазор 4 собственным itemSpacing.
        ghost: 'gap-1 bg-transparent px-0',
      },
      size: {
        default: 'h-11 px-2.5 text-sm',
        sm: 'h-8 px-2.5 text-sm',
      },
      /** Цветовая ось btn_txt. У залитых кнопок не используется. */
      tone: {
        accent: '',
        warning: '',
        red: '',
      },
      /** `type` у btn_txt: bold либо regular. У залитых всегда bold. */
      weight: {
        bold: 'font-bold',
        regular: 'font-normal',
      },
      /** Пятое состояние btn_accent — `not_active`. */
      inactive: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      // btn_txt: высота по содержимому, паддингов нет, кегль зависит от size.
      { variant: 'ghost', size: 'default', class: 'h-5 px-0 text-sm' },
      { variant: 'ghost', size: 'sm', class: 'h-4 px-0 text-xs' },

      // Цвета btn_txt. hover и pressed в мастере СКЛЕЕНЫ в одно значение,
      // поэтому hover и active красятся одинаково — это факт кита, не упрощение.
      { variant: 'ghost', tone: 'accent', class: 'text-primary hover:text-primary-pressed active:text-primary-pressed disabled:text-primary-disabled' },
      { variant: 'ghost', tone: 'warning', class: 'text-warning hover:text-warning-pressed active:text-warning-pressed disabled:text-warning-disabled' },
      { variant: 'ghost', tone: 'red', class: 'text-palette-06 hover:text-palette-06-pressed active:text-palette-06-pressed disabled:text-palette-06-disabled' },

      // not_active перебивает обычную раскраску accent целиком.
      { variant: 'default', inactive: true, class: 'bg-muted text-foreground hover:bg-muted active:bg-muted' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      tone: 'accent',
      weight: 'bold',
      inactive: false,
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
