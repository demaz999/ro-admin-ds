import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as IconButton } from './IconButton.vue'

/**
 * Иконочная кнопка. Источник двухчастный:
 *
 * - **мастер** `ButtonSimple` `110:1566` — 186 вариантов, самый крупный в файле;
 * - **спецификация** `106:397`, тёмный набор `348:2700`.
 *
 * Это **отдельный компонент**, а не режим `Button` без текста: у Атома два
 * разных мастера, и текстового пропа здесь нет вовсе.
 *
 * ## Оси и почему 186 стали 42
 *
 * Type `primary|secondary|light|transparent` × Size (3) × Rounded × **Color (9)**
 * × Disabled. Цветовая ось не переносится — берётся брендовая колонка `rocky`.
 *
 * Мастер неполон по осям, и это видно по покрытию: `secondary` и `light`
 * цветовой оси **не имеют** (по 2 варианта на сочетание вместо 18), а
 * `transparent` существует только с `Rounded=false`. Итог в коде: 42 сочетания.
 *
 * ## Размеры
 *
 * | размер | бокс | глиф | радиус |
 * |---|---|---|---|
 * | `lg` (`larishae`) | 40 | **20** | 8 |
 * | `md` (`monithei`) | 32 | 16 | 6 |
 * | `sm` (`spelino`) | 24 | 16 | 4 |
 *
 * Глиф у большого размера 20, у остальных 16 — то есть у малой кнопки он
 * занимает две трети бокса, а не половину.
 *
 * `Rounded=true` даёт радиус в половину бокса, то есть круг.
 *
 * ## Типы
 *
 * Заливка в мастере лежит не на корне, а на вложенном прямоугольнике; у типа
 * `transparent` этого прямоугольника **нет вовсе**, а не задан прозрачным.
 *
 * | Атом | в коде | заливка | глиф |
 * |---|---|---|---|
 * | `primary` | `default` | брендовая | белый |
 * | `secondary` | `secondary` | брендовая 12% | брендовый |
 * | `light` | `elevated` | белая | брендовый |
 * | `transparent` | `ghost` | нет | брендовый |
 *
 * `ghost` здесь законен, в отличие от текстовой кнопки: у иконочной он **есть
 * в мастере** отдельным типом. Решение «ghost не заводить» касалось `Button`,
 * где такого типа нет и выдумывать его было бы нечем.
 */
export const iconButtonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center outline-none select-none disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed',
        elevated: 'bg-field-elevated text-secondary-foreground',
        ghost: 'bg-transparent text-secondary-foreground',
      },
      size: {
        lg: 'size-10',
        md: 'size-8',
        sm: 'size-6',
      },
      /** Ось `Rounded` мастера: радиус в половину бокса, то есть круг. */
      rounded: {
        true: 'rounded-full',
        false: '',
      },
    },
    compoundVariants: [
      // Радиус зависит от размера и есть только у неокруглённых.
      { size: 'lg', rounded: false, class: 'rounded-md' },
      { size: 'md', rounded: false, class: 'rounded-sm' },
      { size: 'sm', rounded: false, class: 'rounded-xs' },
      // Гашение как у текстовой кнопки: залитая сильнее, остальные мягче.
      { variant: 'default', class: 'disabled:opacity-[var(--opacity-disabled-strong)]' },
      { variant: 'secondary', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'elevated', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'ghost', class: 'disabled:opacity-[var(--opacity-disabled)]' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: false,
    },
  },
)

export type IconButtonVariants = VariantProps<typeof iconButtonVariants>
