import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import { READONLY_SURFACE } from '../field'

export { default as Textarea } from './Textarea.vue'

/**
 * Многострочное поле. Источник двухчастный:
 *
 * - **мастер** `Textarea` `282:4688` — 4 варианта, оси State `default|filled` × Disabled;
 * - **спецификация** `282:4784` — состояния; тёмный набор `344:3032`.
 *
 * Состояний в мастере нет: `State` это «пусто против заполненного». Hover и
 * Pressed/Active живут только в спеке.
 *
 * ## Лестница состояний — та же, что у Input
 *
 * Спека формулирует её прямым текстом: **«bg django, opacity +16»** — заливка та
 * же самая, плюс шестнадцать пунктов прозрачности. Сверено численно по ячейкам
 * `282:5224`, `282:5226`, `282:5228`, `282:5230`: 32% → 48% → 48% → 32% + 0.48
 * на узле. Цвета текста ходят ровно как у поля ввода.
 *
 * Поэтому компонент сидит на тех же ролях `--field-*`, а не заводит свои.
 *
 * ## Геометрия мастера
 *
 * Коробка 272×140, радиус 8, рамки нет. Паддинги **асимметричные**: по бокам и
 * снизу 16, сверху 10 в пустом состоянии и 8 в заполненном — разница ровно та
 * же, что у Input, и на спеке она подписана размерными линиями «10px» и «8px».
 *
 * Высота фиксированная: ось размера в мастере отсутствует, ручки растягивания
 * не нарисовано. Растягивание пользователем — наше поведение, не визуал, поэтому
 * оно отключено: `resize-none`.
 *
 * Скроллбар — отдельная часть спеки `344:2796`: дорожка 4px, радиус 2, бегунок
 * светлый. Стоковый скроллбар браузера шире и рисуется иначе, поэтому переносится
 * своим.
 */
export const textareaVariants = cva(
  'group/field relative flex w-full flex-col rounded-md px-4 pb-4',
  {
    variants: {
      invalid: {
        true: '',
        false: '',
      },
      /** Состояние мастера `State`: пусто против заполненного. */
      floating: {
        true: 'pt-2',
        false: 'pt-2.5',
      },
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: '',
      },
      /** Только чтение — такт 68: поверхность без заливки с рамкой `--input`, наведения нет (`ui/field/index.ts`). */
      readonly: {
        true: READONLY_SURFACE,
        false: '',
      },
    },
    compoundVariants: [
      { invalid: true, readonly: false, class: 'bg-field-error hover:bg-field-error-hover focus-within:bg-field-error-hover' },
      { invalid: false, readonly: false, class: 'bg-field hover:bg-field-hover focus-within:bg-field-hover' },
    ],
    defaultVariants: {
      invalid: false,
      floating: false,
      disabled: false,
      readonly: false,
    },
  },
)

export type TextareaVariants = VariantProps<typeof textareaVariants>
