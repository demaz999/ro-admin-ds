import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as ButtonArrow } from './ButtonArrow.vue'

/**
 * Круглая кнопка-стрелка — мастер `ButtonArrow` `1938:12858`, спека `1945:12594`,
 * тёмный набор `2385:14038`.
 *
 * Оси: Type `default|shapeless` × Size (3) × Direction `left|right` = 12
 * вариантов. **Цветовой оси у этого мастера нет**, поэтому переносится вся
 * матрица целиком, без схлопывания.
 *
 * ## Размеры — всегда круг
 *
 * | размер | бокс | радиус |
 * |---|---|---|
 * | `lg` (`samilea`) | 48 | 24 |
 * | `md` (`klymentise`) | 32 | 16 |
 * | `sm` (`Ileneira`) | 24 | 12 |
 *
 * Радиус во всех трёх — ровно половина бокса, то есть круг. Отдельной оси
 * `Rounded` здесь нет: круглая форма единственная.
 *
 * ## Два типа
 *
 * | Атом | в коде | подложка | глиф |
 * |---|---|---|---|
 * | `default` | `elevated` | белая **с тенью** `0/4/16` | `field-placeholder` |
 * | `shapeless` | `ghost` | нет | `accent-soft` |
 *
 * Тень у залитого типа — та же `shadow-elevated`, что у поля поверх карты:
 * кнопка рассчитана лежать на изображении. Имена типов приведены к тем же, что
 * у `IconButton`: `elevated` — белая плашка поверх контента, `ghost` — без
 * подложки.
 *
 * Глиф у безподложечного типа **пастельный**, а не серый — тот же
 * `accent-soft`, что несут маркер тега и подчёркивание ссылки.
 */
/*
 * Кольцо фокуса с клавиатуры — такт 35, решение владельца 2026-09-23. У мастеров Атома и у кнопок
 * кита 1 (`btn_accent` `709:6413`: Default / Hover / Pressed / Dissabled / not_active — по инвентарю)
 * состояния фокуса нет; кит 1 не сверен — Figma MCP в сессии не авторизован. Взят прецедент составных
 * компонентов тактов 30–33: `focus-visible:ring-2` `--ring`. Только по `focus-visible` — в покое и
 * под мышью кнопка не меняется. Расширение матрицы — `waves.md`, запрос дизайнерам — `figma-fixes.md`.
 */
export const buttonArrowVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full outline-none select-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)] focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        elevated: 'bg-field-elevated text-field-placeholder shadow-elevated',
        ghost: 'bg-transparent text-accent-soft',
      },
      size: {
        lg: 'size-12',
        md: 'size-8',
        sm: 'size-6',
      },
    },
    defaultVariants: {
      variant: 'elevated',
      size: 'md',
    },
  },
)

export type ButtonArrowVariants = VariantProps<typeof buttonArrowVariants>
