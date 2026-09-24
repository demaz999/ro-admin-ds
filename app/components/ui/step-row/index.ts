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
 *
 * ## Пилюля на подложке своего тона стоит на `--card` — такт 33
 *
 * Решение владельца 2026-09-23. Когда строка или заголовок сами залиты мягкой ступенью
 * того же тона, что и пилюля, пилюля в своей заливке сливается с подложкой и читается
 * только текстом. Тогда пилюля берёт `surface: 'card'`: заливка `--card`, текст — та же
 * тёмная ступень `*-strong`. Места: переполненный шаг и «Повторить» (`StepRow`),
 * «предложено» на заголовке предложенного повтора (`RepeatCard`). Пилюля другого тона на
 * тонированной подложке остаётся в своей заливке. Расхождение с легаси-прототипом —
 * `docs/figma-fixes.md`.
 */
export const stepCounterVariants = cva(
  'inline-flex h-4 shrink-0 items-center rounded-full px-2 text-2xs font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'text-foreground-secondary',
        error: 'text-destructive-strong',
        warning: 'text-warning-strong',
        success: 'text-success-strong',
        frozen: 'text-foreground-secondary',
      },
      /** `tone` — своя мягкая заливка; `card` — подложка того же тона, пилюля на `--card`. */
      surface: {
        tone: '',
        card: 'bg-card',
      },
    },
    compoundVariants: [
      { surface: 'tone', tone: 'neutral', class: 'bg-muted' },
      { surface: 'tone', tone: 'error', class: 'bg-destructive-surface' },
      { surface: 'tone', tone: 'warning', class: 'bg-warning-surface' },
      { surface: 'tone', tone: 'success', class: 'bg-success-surface' },
      { surface: 'tone', tone: 'frozen', class: 'bg-surface-disabled' },
    ],
    defaultVariants: { tone: 'neutral', surface: 'tone' },
  },
)

export type StepCounterTone = 'neutral' | 'error' | 'warning' | 'success' | 'frozen'

/**
 * Номер клавиши — прецедент `Tag` (такт 30): 16×16, `--tag` / `--secondary-foreground`,
 * 10/12 bold. Общий для строки шага и пункта назначения (`AssignOption`, такт 33).
 */
export const stepKeyClass = 'flex size-4 shrink-0 items-center justify-center rounded-xs bg-tag text-3xs font-bold text-secondary-foreground'

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

/*
 * Тексты и тон счётчика — общие для строки шага и пункта назначения (§11.1: «с теми же
 * лимитами и состояниями, что в панели структуры»). До такта 33 жили внутри `StepRow`.
 */

/** Тон счётчика по наполненности; замороженный — нейтральный серый (§5.2). */
export function stepCounterTone(fill: StepFill, frozen: boolean): StepCounterTone {
  if (frozen) return 'frozen'
  return ({
    'empty-required': 'error',
    'empty': 'neutral',
    'under': 'warning',
    'norm': 'success',
    'full': 'success',
    'over': 'error',
  } as const)[fill]
}

/** Счётчик — прототип `chipText`: «N / M», «N / от M» или «N». */
export function stepCounterText(count: number, min: number, max: number | null | undefined): string {
  if (max != null) return `${count} / ${max}`
  if (min) return `${count} / от ${min}`
  return `${count}`
}

/** «Фото» / «Видео» в требовании (`step.need.*`). */
export const stepKindText = (kind: 'photo' | 'video') => (kind === 'video' ? 'Видео' : 'Фото')

/** Требование — `step.need.*` спеки §18 плюс «можно до N» прототипа `needText`. */
export function stepNeedText(min: number, max: number | null | undefined): string {
  if (max === 1 && min === 1) return 'нужно ровно 1'
  if (min && max != null) return `нужно от ${min} до ${max}`
  if (min) return `нужно не меньше ${min}`
  if (max != null) return `можно до ${max}`
  return 'по факту, если есть'
}
