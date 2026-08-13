import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as ButtonAction } from './ButtonAction.vue'

/**
 * Сервисное действие — текст с иконкой **без заливки вовсе**. Источник:
 *
 * - **мастер** `ButtonAction_` `6626:56755` — живой узел решением от 2026-08-12;
 * - **спецификация** `1008:8159`, тёмный набор `3745:25543`.
 *
 * Описание мастера прямо называет место применения: поповеры и модальные окна.
 *
 * ## Это и есть ниша `ghost`
 *
 * У кнопки нет ни фона, ни радиуса, ни паддингов — только текст, иконка и зазор
 * 6 между ними. Высота 20, то есть строка текста. Именно это в словаре shadcn
 * называется `ghost`, и именно поэтому `ghost` не заводится у `Button`:
 * у Атома нишу занимает отдельный компонент. Соответствие для дизайнеров —
 * в `docs/naming.md`.
 *
 * ## Два мастера и почему взят подчёркнутый
 *
 * Рядом лежит `ButtonAction` `1028:8221` на 40 вариантов с осями Color (10),
 * Size и Disabled. Живым признан `ButtonAction_`: он инстанцирован в модалках,
 * тогда как у старшего инстансов нет. Подчёркивание — артефакт файла, в код
 * не идёт.
 *
 * Цена решения названа честно: **у живого мастера нет оси `Disabled`** — она
 * есть только у старшего. Выключенное состояние взято со спеки, где оно
 * подписано `opacity 0.32`, как у залитой кнопки.
 *
 * ## Размеры и состояния
 *
 * | размер | кегль | иконка |
 * |---|---|---|
 * | `md` (`suluguni`) | 16 | 16 |
 * | `sm` (`briscola`) | 13 | 16 |
 *
 * Состояния — та же лестница, что у `Button`, но ходит **цвет текста**, а не
 * заливки: покой брендовый, наведение светлее, нажатие темнее.
 */
export const buttonActionVariants = cva(
  'group/button inline-flex h-5 w-fit shrink-0 items-center gap-1.5 bg-transparent outline-none select-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled-strong)]',
  {
    variants: {
      size: {
        md: 'text-sm',
        sm: 'text-xs',
      },
      variant: {
        default: 'text-primary hover:text-primary-hover active:text-primary-pressed',
        destructive: 'text-destructive hover:text-destructive-hover active:text-destructive-pressed',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
)

export type ButtonActionVariants = VariantProps<typeof buttonActionVariants>
