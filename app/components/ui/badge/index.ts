import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

/**
 * Декоративная статусная метка кита (`badge` 1173:196, высота 24).
 *
 * Не путать с `Chip` — 32-пиксельным интерактивным компонентом со счётчиком и
 * крестиком, который в ките лежит под тем же именем `badge` (747:2464).
 *
 * Цвета берутся из расширенной палитры. Набор вариантов — ровно тот, что
 * нарисован в ките: violet, red, orange. Заливка сплошная, текст белый,
 * кегль 13/16 Bold — снято с узла.
 *
 * @debt Цвета иллюстративные. В продукте цвет метки приходит с сервера вместе
 * с данными; при интеграции — мапинг с данных, а не выбор варианта руками.
 * См. docs/design-debt.md.
 */
export const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-xl px-2 py-1 text-xs font-bold text-primary-foreground [&>svg]:pointer-events-none [&>svg]:size-4',
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
