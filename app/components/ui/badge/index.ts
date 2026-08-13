import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

/**
 * Бейдж — мастер `Badge` `913:8279`, спека `913:8173`, тёмный набор `6976:58811`.
 *
 * **Это текстовая метка, и только.** Иконки у бейджа Атома нет вовсе — в отличие
 * от бейджа кита 1, где она была обязательной частью состава. Наш иконочный
 * бейдж ждёт в архиве до фазы обогащения.
 *
 * ## Матрица целиком: 20 вариантов
 *
 * Ось `Inversion` **не независима**: она намертво связана с белой колонкой —
 * белый вариант существует только при `Inversion=true`, остальные девять только
 * при `false`. Ровно та же связка, что у `Size` и `Rounded` у `Input`. Поэтому
 * отдельного пропа `inversion` нет: инверсия — это роль `inverse`.
 *
 * 10 колонок × 2 размера = 20. В коде **6 ролей × 2 размера = 12 сочетаний**.
 *
 * ## Какие колонки перенеслись и почему именно эти
 *
 * По границе решения 23 (2026-08-13): у индикаторных компонентов цвет — это
 * семантика. Отбор идёт **по сообщаемой роли**, а не по полноте рампы.
 *
 * | колонка мастера | роль | что сообщает |
 * |---|---|---|
 * | брендовая | `default` | ничего сверх принадлежности |
 * | зелёная | `success` | операция завершилась |
 * | оранжевая | `warning` | нужно внимание |
 * | красная | `destructive` | ошибка |
 * | серая | `neutral` | сообщения нет, это фон разговора |
 * | белая | `inverse` | метка поверх тёмного или цветного |
 *
 * **Четыре колонки не перенесены** — розовая, фиолетовая, бирюзовая и жёлтая.
 * Роли за ними не стоит: это различение, а не сообщение. Нужен цветной бейдж
 * ради различения — берётся расширенная палитра `palette-01..06` по её
 * правилам. Разбор «роль против палитры» — в `docs/naming.md`, он написан для
 * дизайнеров.
 *
 * ## Геометрия
 *
 * | размер | высота | паддинг | кегль |
 * |---|---|---|---|
 * | `md` (`psamiaphe`) | 24 | 12 | 13/16 Regular |
 * | `sm` (`arasine`) | 16 | 8 | 10/12 Regular |
 *
 * Радиус 16 у обоих. У малого это пилюля, у крупного — нет: 16 меньше половины
 * от 24. Начертание **Regular**, не Bold: в ките 1 бейдж был жирным, у Атома нет.
 */
export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center rounded-xl font-normal whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        success: 'bg-success text-primary-foreground',
        warning: 'bg-warning text-primary-foreground',
        destructive: 'bg-destructive text-primary-foreground',
        neutral: 'bg-muted-foreground text-primary-foreground',
        // Единственная роль, где подложка светлая, а текст тёмный.
        inverse: 'bg-background text-foreground',
      },
      size: {
        md: 'h-6 px-3 text-xs',
        sm: 'h-4 px-2 text-3xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
