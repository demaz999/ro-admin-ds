import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as ButtonArrow } from './ButtonArrow.vue'

/**
 * Круглая кнопка-стрелка — мастер `ButtonArrow` `1938:12858`, спека `1945:12594`,
 * тёмный набор `2385:14038`.
 *
 * Оси: Type `default|shapeless` × Size (3) × Direction `left|right` = 12
 * вариантов. **Цветовой оси у этого мастера нет**, поэтому переносится вся
 * матрица целиком, без схлопывания.
 *
 * ## Размеры — всегда круг
 *
 * | размер | бокс | радиус |
 * |---|---|---|
 * | `lg` (`samilea`) | 48 | 24 |
 * | `md` (`klymentise`) | 32 | 16 |
 * | `sm` (`Ileneira`) | 24 | 12 |
 *
 * Радиус во всех трёх — ровно половина бокса, то есть круг. Отдельной оси
 * `Rounded` здесь нет: круглая форма единственная.
 *
 * ## Два типа
 *
 * | Атом | в коде | подложка | глиф |
 * |---|---|---|---|
 * | `default` | `elevated` | белая **с тенью** `0/4/16` | `field-placeholder` |
 * | `shapeless` | `ghost` | нет | `accent-soft` |
 *
 * Тень у залитого типа — та же `shadow-elevated`, что у поля поверх карты:
 * кнопка рассчитана лежать на изображении. Имена типов приведены к тем же, что
 * у `IconButton`: `elevated` — белая плашка поверх контента, `ghost` — без
 * подложки.
 *
 * Глиф у безподложечного типа **пастельный**, а не серый — тот же
 * `accent-soft`, что несут маркер тега и подчёркивание ссылки.
 */
export const buttonArrowVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full outline-none select-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]',
  {
    variants: {
      variant: {
        elevated: 'bg-field-elevated text-field-placeholder shadow-elevated',
        ghost: 'bg-transparent text-accent-soft',
      },
      size: {
        lg: 'size-12',
        md: 'size-8',
        sm: 'size-6',
      },
    },
    defaultVariants: {
      variant: 'elevated',
      size: 'md',
    },
  },
)

export type ButtonArrowVariants = VariantProps<typeof buttonArrowVariants>
