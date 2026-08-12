import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Input } from './Input.vue'

/**
 * Поле ввода — мастер Атома `Input` `249:2768`, 16 вариантов.
 *
 * Оси мастера: Type `default|map` · Size `eluno|lanassa` · State `default|filled`
 * · Rounded · Disabled. Формально это 32 сочетания, реально нарисовано 16:
 * **Size и Rounded в мастере связаны намертво** — `eluno` встречается только с
 * `Rounded=false` (40px, r8), `lanassa` только с `Rounded=true` (64px, r32).
 * Отдельного пропа `rounded` поэтому нет: он не имеет самостоятельных значений.
 * Матрица в коде — 2 × 2 × 2 × 2 = 16, ровно как в мастере.
 *
 * | Ось мастера | В коде | Значения |
 * |---|---|---|
 * | Type `default` / `map` | `variant` | `filled` / `elevated` |
 * | Size `eluno` / `lanassa` (+ Rounded) | `size` | `md` (40) / `lg` (64) |
 * | State `default` / `filled` | нет пропа | наличие значения |
 * | Disabled | `disabled` | атрибут |
 *
 * Что снято с мастера и чего не было бы при сборке от shadcn:
 *
 * - **Рамки нет ни в одном из шестнадцати вариантов.** У Атома поле — залитая
 *   поверхность, а не белое поле с обводкой. Стоковый `border-input` не берётся.
 * - **`filled` — не состояние контрола, а наличие значения**, и оно перестраивает
 *   разметку: плейсхолдер уезжает наверх подписью 13/16, под ним появляется
 *   значение 16/20, а иконка уходит внутрь вложенного фрейма.
 * - **Зазор зависит от состояния**: 8 в пустом поле, 12 в заполненном.
 * - **Выключенное поле гасится прозрачностью всего узла** (48%), а не отдельными
 *   цветами. Это механизм состава Атома, поэтому переносится как есть.
 * - **`map` — не место, а стиль**: белая заливка вместо серой плюс тень. В коде
 *   зовётся `elevated`, потому что `variant` — это стиль, а не место применения.
 *
 * Чего у Атома нет вовсе: hover, focus, pressed, error, подписи снаружи поля,
 * подсказки, счётчика символов. В документации Атома hover и error нарисованы
 * картинками, вариантами компонента они не являются — переносим факт, а не
 * картинку. См. docs/open-questions.md, вопрос 26.
 *
 * Расхождение переноса, известное и намеренное: кегль значения у Атома 16/20, в
 * коде 15/20. Размерная шкала общая и берётся наша — docs/themes.md. Интерлиньяж
 * совпадает, поэтому ни одна коробка не меняется: расходится только рисунок
 * глифа. См. docs/open-questions.md, вопрос 27.
 */
// Переходов здесь намеренно нет: у мастера нет ни hover, ни focus, ни pressed —
// анимировать нечего, а `transition-colors` был бы добавкой сверх мастера.
export const inputVariants = cva(
  'group/field relative flex w-full items-center',
  {
    variants: {
      variant: {
        filled: 'bg-field',
        elevated: 'bg-field-elevated shadow-elevated',
      },
      size: {
        md: 'h-10 rounded-md px-4',
        lg: 'h-16 rounded-3xl px-6',
      },
      /**
       * Состояние мастера `State`: пусто против заполненного.
       * Цвет здесь не декоративный: у Атома глиф иконки красится тем же цветом,
       * что и текст состояния — плейсхолдерным в пустом поле и цветом значения
       * в заполненном. Поэтому цвет задаётся контейнеру, а иконка берёт его
       * через `currentColor`.
       */
      filled: {
        true: 'gap-3 text-field-foreground',
        false: 'gap-2 text-field-placeholder',
      },
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: '',
      },
    },
    compoundVariants: [
      // Вертикальный паддинг — единственное, что меняется между состояниями
      // внутри одного размера. Высота при этом остаётся прежней.
      { size: 'md', filled: false, class: 'py-2.5' },
      { size: 'md', filled: true, class: 'py-0.5' },
      { size: 'lg', filled: false, class: 'py-5.5' },
      { size: 'lg', filled: true, class: 'py-3.5' },
    ],
    defaultVariants: {
      variant: 'filled',
      size: 'md',
      filled: false,
      disabled: false,
    },
  },
)

export type InputVariants = VariantProps<typeof inputVariants>
