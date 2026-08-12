import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Input } from './Input.vue'

/**
 * Поле ввода. Источник двухчастный, как требует протокол:
 *
 * - **мастер** `Input` `249:2768` — состав, геометрия, варианты;
 * - **спецификация** `Input` `237:2820` (та же страница файла) — состояния,
 *   поведение, привязка к токенам. Тёмный набор лежит рядом: `5764:48423`.
 *
 * Состояний в мастере нет вовсе — там оси Type, Size, State, Rounded, Disabled,
 * где `State` это «пусто против заполненного». Hover, Pressed/Active и Error
 * живут **только в спеке**, отдельными ячейками с подписями токенов.
 *
 * ## Матрица мастера
 *
 * Формально 32 сочетания, нарисовано 16: **Size и Rounded связаны намертво** —
 * `eluno` встречается только с `Rounded=false` (40px, r8), `lanassa` только с
 * `Rounded=true` (64px, r32; спека называет это «rounded 50%», то есть половина
 * высоты). Отдельного пропа `rounded` поэтому нет.
 *
 * | Ось мастера | В коде | Значения |
 * |---|---|---|
 * | Type `default` / `map` | `variant` | `filled` / `elevated` |
 * | Size `eluno` / `lanassa` | `size` | `md` (40) / `lg` (64) |
 * | State `default` / `filled` | нет пропа | наличие значения |
 * | Disabled | `disabled` | атрибут |
 *
 * ## Состояния из спеки
 *
 * Ячейки спеки читаются так: покой → наведение → нажатие/фокус. Атомовские имена
 * токенов из подписей (`django`, `djangoHover`, `troy`, `harakiri`, `metropolis`,
 * `amelie`, `schindlerHover`) в код не переносятся — только значения, разложенные
 * по нашим ролям.
 *
 * | | заливка | подпись | значение |
 * |---|---|---|---|
 * | покой | `field` | `field-placeholder` | `field-foreground` |
 * | наведение | `field-hover` | `field-placeholder-hover` | `field-foreground-hover` |
 * | нажатие / фокус | `field-hover` | `field-placeholder-hover` | `field-foreground-hover` |
 * | выключено | `field` + прозрачность 48% | покой | покой |
 * | ошибка | `field-error` / `field-error-hover` | те же | те же |
 *
 * У `elevated` заливка не меняется никогда — ходит **тень**: 12% в покое, 16% на
 * наведении, 8% на нажатии.
 *
 * ## Как состояния легли на DOM
 *
 * - `Hover` → `:hover`
 * - `Pressed/Active` → `:focus-within`. В спеке эта ячейка содержит курсор, то
 *   есть это поле под кареткой, а не нажатая кнопка.
 * - `Disabled` → `:disabled`
 * - `Error` → проп `invalid`
 *
 * **Плавающий плейсхолдер.** В ячейке `Pressed/Active` подпись уже наверху, хотя
 * значения ещё нет: как только каретка в поле, плейсхолдер уезжает вверх кеглем
 * 13 и освобождает строку под ввод. Поэтому подпись всплывает при фокусе **или**
 * при наличии значения, а не только при значении.
 *
 * Чего в спеке нет: внешней подписи над полем, строки подсказки и счётчика
 * символов. Это дизайн-долг с источником «архив кита 1», см. docs/design-debt.md.
 *
 * Расхождение переноса, известное и намеренное: кегль значения у Атома 16/20, в
 * коде 15/20 — размерная шкала общая и берётся наша (docs/themes.md). Интерлиньяж
 * совпадает, поэтому ни одна коробка не меняется.
 */

// Переходов нет намеренно: в спеке состояния заданы конечными значениями, время
// и кривая не указаны нигде. Анимация была бы добавкой сверх источника.
export const inputVariants = cva(
  'group/field relative flex w-full items-center',
  {
    variants: {
      variant: {
        filled: '',
        elevated: '',
      },
      /** Ошибка — не отдельный вид поля, а подмена заливки во всех трёх состояниях. */
      invalid: {
        true: 'bg-field-error hover:bg-field-error-hover focus-within:bg-field-error-hover',
        false: '',
      },
      size: {
        md: 'h-10 rounded-md px-4',
        lg: 'h-16 rounded-3xl px-6',
      },
      /** Состояние мастера `State`: пусто против заполненного. */
      floating: {
        true: 'gap-3',
        false: 'gap-2',
      },
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: '',
      },
    },
    compoundVariants: [
      // Заливка и тень — только когда поле не в ошибке: иначе ошибка перекрывается.
      {
        variant: 'filled',
        invalid: false,
        class: 'bg-field hover:bg-field-hover focus-within:bg-field-hover',
      },
      {
        variant: 'elevated',
        invalid: false,
        class: 'bg-field-elevated shadow-elevated hover:shadow-elevated-hover focus-within:shadow-elevated-pressed',
      },
      // У поля поверх карты подложка белая и в ошибке — краснеет только у обычного.
      { variant: 'elevated', invalid: true, class: 'shadow-elevated hover:shadow-elevated-hover focus-within:shadow-elevated-pressed' },

      // Вертикальный паддинг — единственное, что меняется между состояниями
      // внутри одного размера. Высота при этом остаётся прежней.
      { size: 'md', floating: false, class: 'py-2.5' },
      { size: 'md', floating: true, class: 'py-0.5' },
      { size: 'lg', floating: false, class: 'py-5.5' },
      { size: 'lg', floating: true, class: 'py-3.5' },
    ],
    defaultVariants: {
      variant: 'filled',
      invalid: false,
      size: 'md',
      floating: false,
      disabled: false,
    },
  },
)

export type InputVariants = VariantProps<typeof inputVariants>
