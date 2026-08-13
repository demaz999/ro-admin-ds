import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tag } from './Tag.vue'

/**
 * Тег — мастер `ButtonTag` `256:3601`, спека `256:2826`, тёмный набор `7237:62789`.
 *
 * Оси: `Active` × **Color (9)**. Цветовая ось не переносится — берётся брендовая
 * колонка. В коде остаётся одна ось `active`, то есть 2 варианта из 18.
 *
 * ## Это не `Chip`
 *
 * Тег **нельзя снять** — крестика удаления в мастере нет — и он **ничего не
 * считает**: счётчика тоже нет. Разбор ещё на этапе 0 показал, что `Chip` в
 * Атоме не существует как сущность; наш фильтр-чип из кита 1 ждёт в архиве.
 *
 * Зато у тега есть **маркер-точка 8×8 слева**, которой у чипа кита 1 не было.
 *
 * ## Геометрия
 *
 * Высота 24, радиус 16, паддинги 4/12, зазор 4, кегль 13.
 *
 * | | подложка | текст | точка |
 * |---|---|---|---|
 * | активный | брендовая | белый | белая |
 * | обычный | `tag` | брендовый | `accent-soft` |
 *
 * Точка в обычном состоянии **светлее текста** — она пастельная, а не брендовая.
 * Тот же пастельный тон несёт подчёркивание у `Link`.
 */
export const tagVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-medium outline-none select-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]',
  {
    variants: {
      active: {
        true: 'bg-primary text-primary-foreground',
        false: 'bg-tag text-secondary-foreground',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
)

export type TagVariants = VariantProps<typeof tagVariants>
