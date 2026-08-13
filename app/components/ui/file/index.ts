import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as File } from './File.vue'

/**
 * Файл — мастер `File` `1931:12249`.
 *
 * Строка загруженного файла: превью, имя, подпись и действие. Показывается под
 * областью загрузки `FileUpload`, но самостоятельным компонентом — их может быть
 * список.
 *
 * ## Матрица целиком: 3 варианта
 *
 * Оси `Type` (`default` | `simple`) × `Size` дают формально шесть сочетаний,
 * нарисовано три: у `simple` размер один на все, и в мастере это записано прямо
 * — значение оси называется `all`.
 *
 * | вариант | габарит | радиус | заливка | превью |
 * |---|---|---|---|---|
 * | `default` · `md` | 294×56 | 8 | мягкая ступень | 90×56 |
 * | `default` · `sm` | 280×48 | 8 | мягкая ступень | 76×48 |
 * | `simple` | 272×36 | **0** | **нет** | нет |
 *
 * ## `simple` — не размер, а другой компонент по сути
 *
 * У него нет ни плашки, ни радиуса, ни превью: остаётся строка с именем файла и
 * кнопкой справа. Поэтому ось `Type` перенесена как `variant`, а не как размер —
 * различие тут не в габарите.
 *
 * Заливка плашки — **мягкая ступень** (нейтраль 12%), та же, что у выбранного
 * пункта меню, направляющей подменю, подложки таймера и мягкого аватара.
 * Седьмая её встреча; разбор ступени — в `docs/naming.md`.
 */
export const fileVariants = cva('flex items-center rounded-md', {
  variants: {
    variant: {
      default: 'bg-muted-foreground/[var(--opacity-soft)] pr-2',
      // Ни плашки, ни радиуса: строка с именем и кнопкой.
      simple: 'gap-2 rounded-none',
    },
    size: {
      md: '',
      sm: '',
    },
  },
  /**
   * Высота живёт **только** здесь. Держать её и в `size`, и в compound нельзя:
   * в классе окажутся два `h-*`, и победит тот, что стоит позже в таблице
   * стилей, а не тот, что задумывался. У `simple` размер в мастере один на все.
   */
  compoundVariants: [
    { variant: 'default', size: 'md', class: 'h-14 gap-3' },
    { variant: 'default', size: 'sm', class: 'h-12 gap-2' },
    { variant: 'simple', class: 'h-9 gap-2' },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

export type FileVariants = VariantProps<typeof fileVariants>
