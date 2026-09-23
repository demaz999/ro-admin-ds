import { cva } from 'class-variance-authority'

export { default as StepRow } from './StepRow.vue'
export { default as StepThumb } from './StepThumb.vue'

/**
 * Строка шага панели структуры и миниатюра кадра внутри неё — экран
 * «Распределение свободной съёмки» (VA-9265), такт 30. **Мастера в Figma нет**:
 * источник — прототип v17 и спека, редакция 1 (`docs/sources/va-9265/`).
 * Разбор — `docs/free-shoot.md`, раздел 2.
 *
 * ## Две независимые оси (спека §5)
 *
 * **Наполненность** компонент выводит сам из чисел `count`, `min`, `max`,
 * `required` — чтобы §5 не расходился между страницами:
 *
 * | `fill` | условие | счётчик |
 * |---|---|---|
 * | `empty-required` | 0, обязательный | красный |
 * | `empty` | 0, необязательный | нейтральный |
 * | `under` | 0 < N < min | жёлтый |
 * | `norm` | N ≥ min, N < max | зелёный |
 * | `full` | N = max | зелёный, «· заполнен», строка приглушена |
 * | `over` | N > max | красный, красная рамка |
 *
 * **Доступность** приходит с данными: `verdict` `ok` — заморожен, `redo` —
 * «Повторить», нет вердикта — открыт. «Заполнен по лимиту» из таблицы
 * доступности — то же условие `N = max`, что и `full`, поэтому отдельного пропа
 * у него нет.
 *
 * **Переполнение побеждает заполненность** — решение владельца 5: красная рамка
 * и счётчик, без «· заполнен» и без приглушения. Прототип рисует оба сигнала
 * сразу; это отклонение записано в `docs/figma-fixes.md`.
 *
 * ## Что компонент держит сам
 *
 * - у замороженного скрыты лимиты, инструкция и пустые слоты (§5.2), номер
 *   клавиши снят даже при переданном `hotkey` (§16.3);
 * - у заполненного и замороженного `dropTarget` не действует (§9.5);
 * - миниатюр не больше восьми, остаток — хвостом «+N» (§9.6, решение владельца 8);
 * - вспышка 1.5 с по смене `flash` и её уважение к `prefers-reduced-motion`
 *   (§15.3, решение владельца 7).
 */
export const stepRowVariants = cva(
  'rounded-xs border border-dashed p-2 transition-colors',
  {
    variants: {
      tone: {
        default: 'border-transparent hover:bg-accent',
        frozen: 'border-transparent bg-muted',
        redo: 'border-warning bg-warning-surface',
        over: 'border-destructive bg-destructive-surface',
        highlighted: 'border-accent-soft bg-surface-selected',
        drop: 'border-stroke-accent bg-secondary',
      },
      /** Заполнен по лимиту — приём выключен, строка на ступени выключенного. */
      dimmed: {
        true: 'opacity-[var(--opacity-disabled)]',
        false: '',
      },
    },
    defaultVariants: { tone: 'default', dimmed: false },
  },
)

/**
 * Счётчик-пилюля — своя часть строки, решение владельца 4. Геометрия `Badge sm`
 * (высота 16, паддинг 8, радиус полный), текст 12/16 bold, тон — мягкая
 * заливка роли плюс её тёмная ступень. `Badge` не тронут: мягких тонов в его
 * мастере `913:8279` нет.
 */
export const stepCounterVariants = cva(
  'inline-flex h-4 shrink-0 items-center rounded-full px-2 text-2xs font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-foreground-secondary',
        error: 'bg-destructive-surface text-destructive-strong',
        warning: 'bg-warning-surface text-warning-strong',
        success: 'bg-success-surface text-success-strong',
        frozen: 'bg-surface-disabled text-foreground-secondary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

/** Миниатюра 36×27 — пропорция 4:3, как у кадра (`.th`). */
export const stepThumbVariants = cva(
  'group/thumb relative w-9 shrink-0 overflow-hidden rounded-xs border outline-none aspect-4/3 focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      state: {
        'free': 'border-border-soft',
        'suggested': 'border-warning',
        'locked': 'border-stroke-secondary',
        'from-step': 'border-primary',
        'rejected': 'border-destructive',
      },
      /** Найдена переходом «Показать в структуре» (§15.3). */
      located: {
        true: 'ring-2 ring-primary',
        false: '',
      },
    },
    defaultVariants: { state: 'free', located: false },
  },
)

export type StepFill = 'empty-required' | 'empty' | 'under' | 'norm' | 'full' | 'over'
export type StepThumbState = 'free' | 'suggested' | 'locked' | 'from-step' | 'rejected'

export interface StepVerdict {
  kind: 'ok' | 'redo'
  /** Дата решения, «20 июня». */
  at: string
  /** Замечание проверяющего — обязательно к показу при `redo` (§3, §5.3). */
  note?: string
}

export interface StepThumbItem {
  id: string | number
  src: string
  state?: StepThumbState
  /** Подсказка миниатюры; без неё — текст по состоянию. */
  reason?: string
}

/** Сколько миниатюр видно до хвоста «+N» — спека §9.6. */
export const STEP_THUMBS_MAX = 8

/**
 * Наполненность из чисел (§5). Отклонённые кадры в `count` не входят (§4.2):
 * их считает страница, компонент получает уже чистое число.
 */
export function stepFill(count: number, min: number, max: number | null | undefined, required: boolean): StepFill {
  if (max != null && count > max) return 'over'
  if (max != null && count === max && count > 0) return 'full'
  if (count === 0) return required ? 'empty-required' : 'empty'
  if (count < min) return 'under'
  return 'norm'
}
