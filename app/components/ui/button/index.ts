import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/**
 * Текстовая кнопка. Источник двухчастный:
 *
 * - **мастер** `Button` `57:340` — 118 вариантов;
 * - **спецификация** `45:175`, тёмный набор `3661:25740`.
 *
 * ## Почему 118 вариантов дали 24
 *
 * Оси мастера: Type `primary|secondary` × Width `content|wide` × Size (3) ×
 * **Color (9)** × Rounded × Disabled. Цветовая ось решением от 2026-08-12 не
 * переносится: источником берётся **брендовая синяя колонка** `rocky`
 * (`#4480f3`), остальные восемь колонок вариантов не дают.
 *
 * Отсюда матрица в коде: type (2) × size (3) × width (2) × disabled (2) = 24.
 * Расхождение с мастером — ровно цветовая ось, и оно осознанное.
 *
 * `Rounded` отдельной осью тоже не идёт: в мастере она связана с размером —
 * `laripha` встречается только с `Rounded=true` (радиус 32), `helike` и `polyxo`
 * только с `false`. Ровно как `Size`/`Rounded` у `Input`.
 *
 * ## Размеры
 *
 * | размер | высота | радиус | паддинги | зазор | кегль | иконка |
 * |---|---|---|---|---|---|---|
 * | `lg` (`laripha`) | 64 | 32 | 20/32 | 6 | 16 | есть |
 * | `md` (`helike`) | 40 | 8 | 10/16 | 6 | 16 | есть |
 * | `sm` (`polyxo`) | 24 | **6** | 4/8 | 0 | 13 | **нет** |
 *
 * Радиус 6 у малой кнопки — ступень, которой в лесенке кита 1 не существовало;
 * она добавлена в волне 2, из-за чего имена ступеней сдвинулись.
 *
 * У малого размера **иконки нет вовсе**: в мастере её слот отсутствует, а не
 * выключен. Поэтому `sm` не принимает иконку и зазор у него нулевой.
 *
 * `Width` — это hug против fill: `content` тянется по содержимому, `wide`
 * занимает всю ширину контейнера. Паддинги мастера у `wide` (10/66, 4/85) —
 * артефакт фиксированной ширины 272 с центрированным содержимым, а не значения.
 *
 * ## Состояния из спеки
 *
 * | | залитая | тональная |
 * |---|---|---|
 * | покой | `#4480f3` | 12% |
 * | наведение | светлее | **8% — светлее** |
 * | нажатие | темнее | 16% |
 * | выключено | прозрачность **0.32** | прозрачность **0.48** |
 *
 * Две вещи, которые легко прочитать наоборот. Первая: у тональной кнопки
 * наведение **осветляет** заливку, а не затемняет. Вторая: выключенное
 * состояние гасится по-разному — у залитой сильнее, чем у тональной, и обе
 * не совпадают с полями, где 0.48 общее.
 *
 * Спека впервые задаёт **время**: наведение 0.1 сек, нажатие 0 сек. У полей
 * времени не указано нигде, поэтому там переходов нет — здесь есть.
 *
 * Чего в мастере нет: `ghost` и `destructive`. См. `docs/open-questions.md`,
 * вопрос 29.
 */
export const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium outline-none select-none disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed',
      },
      size: {
        lg: 'h-16 gap-1.5 rounded-3xl px-8 text-sm',
        md: 'h-10 gap-1.5 rounded-md px-4 text-sm',
        // У малой кнопки слота иконки в мастере нет, поэтому и зазора нет.
        sm: 'h-6 gap-0 rounded-sm px-2 text-xs',
      },
      /** Ось `Width` мастера: по содержимому либо во всю ширину. */
      wide: {
        true: 'w-full',
        false: 'w-fit',
      },
    },
    compoundVariants: [
      // Выключенное состояние гасится по-разному у залитой и тональной — так в спеке.
      { variant: 'default', class: 'disabled:opacity-[var(--opacity-disabled-strong)]' },
      { variant: 'secondary', class: 'disabled:opacity-[var(--opacity-disabled)]' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      wide: false,
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
