import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as DatePicker } from './DatePicker.vue'
export { default as TimePicker } from './TimePicker.vue'

/**
 * Пикеры даты и времени — мастера `DatePicker` `1763:10301` и `TimePicker`
 * `3871:26784`, плашки `DatePickerPopOver` `1159:10888` и `TimePickerPopOver`
 * `1161:9805`. Состояния — прямо на страницах `1154:9414` и `1159:12640`.
 *
 * ## Поле пикера — не инстанс `Input`, но та же плашка
 *
 * Проверено по узлам: внутри мастера лежат **свои** слои — иконка 16, текст,
 * иконка 16, — а не инстанс поля. При этом заливка совпадает с полем бит в бит
 * (`#d4d5d9` на 32%, то есть наш `--field`), совпадают и габарит 272×40, и
 * радиус 8, и паддинги 16 по горизонтали.
 *
 * Отсюда решение: **геометрия и роли общие с полем, разметка своя.** Обернуть
 * `Input` не получится — у него один иконочный слот слева и кнопка очистки
 * справа, а пикеру нужны две иконки; добавлять слот в `Input` значило бы
 * дорисовать его мастеру то, чего в нём нет.
 *
 * ## Матрица целиком: 3 варианта
 *
 * Ось `State`: `default` / `filled` / `disabled`. Наведение и нажатие в мастере
 * не нарисованы — они подписаны на странице спецификации отдельными ячейками,
 * как у всех полей.
 *
 * Спека подписывает выключенное состояние дословно: **«text opacity — 0.48, as
 * Select»** — то есть пикер гасится как поле, а не как кнопка. Замер варианта
 * `disabled` это подтверждает: прозрачность узла 0.48.
 *
 * У `filled` меняется паддинг — 2/16 вместо 10/16, потому что внутри появляется
 * блок из подписи и значения. Тот же приём всплывающей подписи, что у `Input`.
 *
 * ## Иконок пока нет, и это не ошибка сборки
 *
 * Мастер ставит слева `16 / action / …`, справа `16 / time / …`. Обоих глифов —
 * календаря и часов — **в self-hosted наборе Material Symbols нет**, а рисовать
 * контур руками протокол иконок запрещает прямо: своя отрисовка глифа была бы
 * выдумыванием визуала.
 *
 * Поэтому коробки 16×16 стоят на местах и держат раскладку, а глиф приедет,
 * когда иконки добавят в набор из официальной выгрузки. Строка в
 * `docs/design-debt.md`. Слоты `#icon` и `#trailing` открыты — можно подставить
 * свой глиф на месте применения.
 */
export const pickerFieldVariants = cva(
  'flex w-full items-center gap-2 rounded-md bg-field text-base outline-none hover:bg-field-hover focus-visible:bg-field-hover disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]',
  {
    variants: {
      /** Ось `State` мастера. `filled` меняет паддинг под всплывшую подпись. */
      filled: {
        true: 'h-10 px-4 py-0.5',
        false: 'h-10 px-4 py-2.5',
      },
    },
    defaultVariants: { filled: false },
  },
)

export type PickerFieldVariants = VariantProps<typeof pickerFieldVariants>
