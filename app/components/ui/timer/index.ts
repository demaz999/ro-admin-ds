import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Timer } from './Timer.vue'

/**
 * Таймер — мастер `Timer` `6344:55714`, спека `6340:55580`, тёмный набор `6395:55793`.
 *
 * Описание мастера задаёт роль: «через заданное время выполняет нужное действие,
 * например, закрытие уведомления». То есть это **индикатор обратного отсчёта**,
 * а не спиннер: у спиннера конца нет, у таймера он и есть смысл.
 *
 * ## Матрица целиком: 6 вариантов
 *
 * Оси `Number` × `Size` (3) — полный крест, все шесть нарисованы.
 *
 * | `Size` в мастере | сторона | в коде |
 * |---|---|---|
 * | `echemeia` | 20 | `sm` |
 * | `menolorice` | 32 | `md` |
 * | `aethusa` | 48 | `lg` |
 *
 * ## Это сектор, а не кольцо
 *
 * Проверено по узлам мастера, а не по виду: внутри лежат ровно два вектора —
 * `Bg` во всю сторону (брендовый на **12%**) и `Timer` (брендовый на 100%),
 * габарит которого меняется вместе с долей отсчёта. Дырки в середине нет.
 *
 * Поэтому в коде это конический градиент поверх круга, а не `stroke-dasharray`:
 * кольцо дало бы другой рисунок при точном совпадении коробки.
 *
 * Цифра включается пропом `Number` и живёт в том же брендовом цвете; в мастере
 * она нарисована только у крупного размера читаемым кеглем.
 */
export const timerVariants = cva('relative inline-flex shrink-0 items-center justify-center rounded-full text-primary', {
  variants: {
    size: {
      sm: 'size-5',
      md: 'size-8',
      lg: 'size-12 text-base font-medium',
    },
  },
  defaultVariants: { size: 'lg' },
})

export type TimerVariants = VariantProps<typeof timerVariants>
