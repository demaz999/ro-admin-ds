import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Stepper } from './Stepper.vue'
export { default as StepperItem } from './StepperItem.vue'

/**
 * Шаги — **очередь 3 этапа 2, дефолт shadcn-vue со статусом долга.**
 *
 * @debt Ни в Атоме, ни в ките 1 степпера нет вовсе — ни мастера, ни композиции
 * на страницах. Проверено обходом обоих файлов.
 *
 * ## Что взято по аналогии и откуда именно
 *
 * Дефолт shadcn-vue даёт устройство: список шагов, у каждого номер в кружке,
 * подпись и линия к следующему. Вид собран **из уже перенесённого**, а не из
 * значений фреймворка:
 *
 * | Часть | По аналогии с |
 * |---|---|
 * | кружок 24 с номером | `Avatar` `type="letter"` малого размера и счётчик `Indicator` |
 * | цвет пройденного и текущего | брендовая заливка выбранного, как у `Tabs` и `TableCell` |
 * | цвет непройденного | `--muted` с приглушённым текстом, как у выключенных состояний |
 * | подпись 15/20 Medium | шкала кита, ступень `text-sm` |
 * | линия между шагами | `--border` толщиной 1, как разделители списка |
 *
 * Строка — в `docs/design-debt.md`, просьба к дизайнерам — в
 * `docs/figma-fixes.md`.
 */
export const stepperIndicatorVariants = cva(
  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
  {
    variants: {
      state: {
        completed: 'bg-primary text-primary-foreground',
        active: 'bg-primary text-primary-foreground',
        inactive: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { state: 'inactive' },
  },
)

export const stepperTitleVariants = cva('text-sm whitespace-nowrap', {
  variants: {
    state: {
      completed: 'font-medium text-foreground',
      active: 'font-medium text-foreground',
      inactive: 'font-normal text-muted-foreground',
    },
  },
  defaultVariants: { state: 'inactive' },
})

export type StepperIndicatorVariants = VariantProps<typeof stepperIndicatorVariants>
