import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Autocomplete } from './Autocomplete.vue'

/**
 * Поле с подсказками — мастер `Autocomplete` `3874:36379`, спека `3874:30988`.
 *
 * Геометрия совпадает с `Input` до единицы: 272×40, паддинги 10/16 в пустом и
 * 2/16 в заполненном, зазоры 8 и 12, радиус 8, рамки нет. Заливка та же —
 * `#d4d5d9` 32% у обычного, белая с тенью 12% у варианта поверх карты. Отсюда
 * общие роли `--field-*` и отсутствие собственных.
 *
 * Ось `State` — как везде в этом семействе: пусто против заполненного, а не
 * состояние контрола. Состояния идут из спеки и совпадают с полем ввода.
 */
export const autocompleteVariants = cva(
  'group/field relative flex w-full items-center rounded-md px-4',
  {
    variants: {
      variant: {
        filled: 'bg-field hover:bg-field-hover focus-within:bg-field-hover',
        elevated: 'bg-field-elevated shadow-elevated hover:shadow-elevated-hover focus-within:shadow-elevated-pressed',
      },
      floating: {
        true: 'h-10 gap-3 py-0.5',
        false: 'h-10 gap-2 py-2.5',
      },
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'filled',
      floating: false,
      disabled: false,
    },
  },
)

export type AutocompleteVariants = VariantProps<typeof autocompleteVariants>
