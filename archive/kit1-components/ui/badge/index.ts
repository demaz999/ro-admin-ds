import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

/**
 * Декоративная статусная метка кита — мастер `badge` `1173:196`.
 * Одна ось `color`: violet / red / orange. Высота фиксированная 24, радиус 16.
 *
 * Не путать с `Chip` (`747:2464`, 32px, счётчик и крестик) — в ките они лежат
 * под одним именем, но это разные компоненты.
 *
 * Иконка в мастере ОБЯЗАТЕЛЬНА: булева пропа «показать иконку» там нет, только
 * INSTANCE_SWAP (`20_ic_layers` по умолчанию). Варианта без иконки в ките 1 не
 * нарисовано, поэтому слот здесь не опциональный.
 *
 * Цвета берутся из расширенной палитры (`status-03/05/06`) — это явное указание
 * мастера, легальное употребление палитры.
 *
 * @debt Цвета иллюстративные. В продукте цвет метки приходит с сервера вместе
 * с данными; при интеграции — мапинг с данных. См. docs/design-debt.md
 */
export const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold whitespace-nowrap text-primary-foreground',
  {
    variants: {
      color: {
        violet: 'bg-palette-03',
        red: 'bg-palette-06',
        orange: 'bg-palette-05',
      },
    },
    defaultVariants: {
      color: 'violet',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
