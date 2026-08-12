import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as StatusBadge } from './StatusBadge.vue'

/**
 * Статусная плашка кита: цветная точка 8×8 плюс подпись.
 * Снято с компонента `status`: точка 8×8, радиус 2, контейнер 20, gap 8,
 * текст 15/20 Medium.
 *
 * ЦВЕТА ИЛЛЮСТРАТИВНЫЕ. Раскладка ниже повторяет макеты, чтобы прототипы
 * рендерились цветными. В продукте статусные цвета приходят с сервера вместе
 * с данными — при интеграции здесь будет мапинг с данных, а не выбор цвета
 * руками. Поэтому цвет вынесен явным пропом и живёт отдельным слоем, а не
 * общим `variant`.
 *
 * Имя `cyan` вместо китового `grey` — в ките ошибка: вариант с именем grey
 * красится в бирюзовый. См. docs/open-questions.md, вопрос 12.
 */
export const statusBadgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-foreground',
)

export const statusDotVariants = cva(
  'size-2 shrink-0 rounded-xs',
  {
    variants: {
      color: {
        green: 'bg-palette-01',
        cyan: 'bg-palette-02',
        violet: 'bg-palette-03',
        magenta: 'bg-palette-04',
        orange: 'bg-palette-05',
        red: 'bg-palette-06',
      },
    },
    defaultVariants: {
      color: 'green',
    },
  },
)

export type StatusDotVariants = VariantProps<typeof statusDotVariants>
