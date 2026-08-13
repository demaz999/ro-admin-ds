import { cva } from 'class-variance-authority'

export { default as Checkbox } from './Checkbox.vue'

/**
 * Общая обёртка для `Checkbox`, `RadioButton` и `Switcher`. Все три мастера
 * Атома построены одинаково, и это не совпадение, а одна раскладка:
 *
 * `[контрол в строке 20] 12 [заголовок 16 + подпись 13]`
 *
 * Контрол сидит в боксе высотой 20 — это строка текста, а не сам контрол:
 * галочка и радио 16×16, переключатель 32×20. Зазор до текста 12 везде.
 *
 * Заголовок меняет цвет по включённости: `#525760` выключено, `#1d222a`
 * включено. Подпись всегда приглушённая. Выключенное состояние гасит **весь
 * узел** прозрачностью 0.48 — как у полей, а не как у кнопок с их 0.32.
 *
 * Мастера: `Checkbox` `486:4733` (спека `486:4305`), `RadioButton` `590:5372`
 * (спека `590:5112`), `Switcher` `1072:10873` (спека `1072:8677`).
 */
export const choiceRowVariants = cva(
  'inline-flex w-fit items-start gap-3 outline-none',
  {
    variants: {
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: 'cursor-pointer',
      },
    },
    defaultVariants: { disabled: false },
  },
)

/** Заголовок строки: темнеет, когда контрол включён. */
export const choiceTitleVariants = cva('text-sm font-medium', {
  variants: {
    checked: {
      true: 'text-field-foreground-hover',
      false: 'text-field-foreground',
    },
  },
  defaultVariants: { checked: false },
})
