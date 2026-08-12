import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Select } from './Select.vue'
export { default as SelectContent } from './SelectContent.vue'
export { default as SelectGroup } from './SelectGroup.vue'
export { default as SelectItem } from './SelectItem.vue'
export { default as SelectTrigger } from './SelectTrigger.vue'

/**
 * Триггер селекта. Источник двухчастный:
 *
 * - **мастер** `Select` `434:3074` — 16 вариантов, оси Type `default|map` ×
 *   State `default|filled` × Active × Disabled;
 * - **спецификация** `444:3849`, выпадающая часть — `571:6147`; тёмные наборы
 *   `5765:52344` и `5792:130913`.
 *
 * ## Триггер — это поле ввода плюс шеврон
 *
 * Геометрия совпадает с `Input` размера 40 до единицы: коробка 272×40, паддинги
 * 10/16, зазор 8, радиус 8, рамки нет. Заливка та же — `#d4d5d9` 32% у обычного
 * и белая с тенью 12% у варианта поверх карты. Цветовая лестница та же.
 *
 * Поэтому компонент сидит на ролях `--field-*` и не заводит своих: у Атома
 * селект и поле ввода — один и тот же контрол с разной начинкой.
 *
 * ## Ось `Active` — это открытый список
 *
 * Единственное, что меняет `Active` в мастере, — направление шеврона:
 * `arrow-down_16` против `arrow-up_16`.
 *
 * **Заливка при этом не меняется** — и это отличие от `Input`, которое легко
 * пропустить. У поля ввода ячейка `Pressed/Active` даёт 48%, у селекта — 32%,
 * то есть заливку покоя. Сверено численно по ячейкам спеки `444:4712` (покой,
 * 32%), `444:4736` (наведение, **48%**), `444:4749` (нажатие, снова **32%**),
 * `444:4773` (выключено, 32% плюс 0.48 на узле).
 *
 * Подпись ячейки `Pressed/Active` в спеке про фон умалчивает — именно потому,
 * что он не меняется. Заголовок раздела перечисляет все три токена заливки
 * скопом, и по нему легко решить, что нажатие тоже темнеет. Не темнеет.
 *
 * `State=filled` — как у поля ввода: подпись уезжает наверх кеглем 13, под ней
 * значение. Ширина текстового блока в мастере 192 — это 272 минус паддинги 32
 * минус две иконки по 16 минус два зазора по 8.
 *
 * Левая иконка в мастере — `link_16`, слот со свопом; шеврон — обязательная
 * часть, слота под него нет.
 */
// Зазор 8 во ВСЕХ шестнадцати вариантах — в отличие от Input, где заполненное
// состояние раздвигает контейнер до 12. Сверено по мастеру, оси под это нет.
export const selectTriggerVariants = cva(
  'group/field relative flex h-10 w-full items-center gap-2 rounded-md px-4 py-2.5 outline-none',
  {
    variants: {
      variant: {
        filled: 'bg-field hover:bg-field-hover',
        elevated: 'bg-field-elevated shadow-elevated hover:shadow-elevated-hover',
      },
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'filled',
      disabled: false,
    },
  },
)

export type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>
