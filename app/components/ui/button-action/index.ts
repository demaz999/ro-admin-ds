import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as ButtonAction } from './ButtonAction.vue'

/**
 * Сервисное действие — текст с иконкой **без заливки вовсе**. Источник:
 *
 * - **мастера** `ButtonAction_` `6626:56755` и `ButtonAction` `1028:8221` —
 *   решением от 2026-08-13 это **один компонент, разнесённый по двум узлам**;
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
 * ## Два мастера — не дубль, а один компонент
 *
 * Оба узла живые: младший инстанцирован в модалках, старший — внутри
 * `Notification` `5883:58974`. Волна 2 сочла живым только младший; волна 4
 * нашла инстанс старшего и сверила оба **измерением, а не по описанию**:
 *
 * | | `ButtonAction_` `6626:56755` | `ButtonAction` `1028:8221` |
 * |---|---|---|
 * | вариантов | 2 | 40 |
 * | размеры | `suluguni` 16/20 · `briscola` 13/16 | **те же два** |
 * | оси сверх размера | нет | `Color` (10) · **`Disabled`** |
 *
 * Размерный ряд у них **совпадает бит в бит** — третьего размера нет ни у
 * одного. Старший добавляет ровно одну полезную ось, `Disabled`, и она закрывает
 * долг младшего: выключенное состояние больше не выведено со спеки, а снято с
 * оси мастера — `1060:8288` против `3435:21192`, прозрачность **всего узла**
 * 0.32 при неизменном цвете текста.
 *
 * Подчёркивание в имени — артефакт файла, в код не идёт. Беспорядок отдан
 * дизайнерам строкой в `docs/figma-fixes.md`.
 *
 * ## Размеры и состояния
 *
 * | размер | кегль | иконка |
 * |---|---|---|
 * | `md` (`suluguni`) | **16/20** | 16 |
 * | `sm` (`briscola`) | 13/16 | 16 |
 *
 * > **Исправление волны 2.** `md` стоял на 15/20: кегля 16/20 в шкале тогда не
 * > было, и значение округлили до ближайшего. Ступень появилась вместе с
 * > `Alert` — размер вернулся к мастеру.
 *
 * Состояния — та же лестница, что у `Button`, но ходит **цвет текста**, а не
 * заливки: покой брендовый, наведение светлее, нажатие темнее.
 */
export const buttonActionVariants = cva(
  'group/button inline-flex h-5 w-fit shrink-0 items-center gap-1.5 bg-transparent outline-none select-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled-strong)]',
  {
    variants: {
      size: {
        md: 'text-base',
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
