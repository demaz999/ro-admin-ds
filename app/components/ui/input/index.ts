import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Input } from './Input.vue'

/**
 * Поле ввода кита — мастер `input` `720:11753`, 20 вариантов:
 * label (left|top) × state (Default|pressed|field|error|disabled) × size (40|44).
 *
 * Мастер описывает ПОЛЕ ЦЕЛИКОМ, а не контрол: подпись, само поле с двумя
 * иконочными слотами, строка подсказки со счётчиком. Видимостью частей в Figma
 * управляют 10 component properties, а не варианты — поэтому в коде это пропы
 * и слоты, а не значения `variant`.
 *
 * Состояния мастера ложатся не на пропы, а на реальные состояния DOM:
 * - `pressed` → :focus-within (рамка border/accent, кольца НЕТ)
 * - `field`   → в поле есть значение (меняется только цвет текста)
 * - `error`   → aria-invalid
 * - `disabled` → disabled
 */

/** Само поле — `input_body`. Радиус 8, рамка 1px INSIDE, фон всегда белый. */
export const inputBodyVariants = cva(
  'flex w-full items-center gap-2 rounded-md border border-input bg-background transition-colors group-data-[state=error]/field:border-destructive group-data-[state=disabled]/field:border-stroke-neutral',
  {
    variants: {
      size: {
        // Между 40 и 44 меняется ТОЛЬКО вертикальный паддинг: 8 против 10.
        default: 'h-11 px-4 py-2.5',
        sm: 'h-10 px-4 py-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export type InputVariants = VariantProps<typeof inputBodyVariants>
