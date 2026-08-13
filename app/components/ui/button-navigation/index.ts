import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as ButtonNavigation } from './ButtonNavigation.vue'

/**
 * Навигационная надпись со стрелкой — мастер `ButtonNavigation` `612:5443`,
 * спеки `612:5076` и `776:9218`.
 *
 * Это не кнопка в обычном смысле: ни заливки, ни рамки, ни паддингов. Крупная
 * подпись и шеврон рядом — переход в соседний раздел.
 *
 * ## Оси
 *
 * Size (**7 значений**) × Color (`harakiri|metropolis`) = 14 вариантов.
 * Цветовая ось здесь всего на два значения и обе — оттенки текста, а не бренд:
 * тёмный и приглушённый. Поэтому она переносится **как есть**, в проп `muted`,
 * а не схлопывается: схлопывать нечего, декоративных рамп тут нет.
 *
 * ## Перенесены три размера из семи
 *
 * | размер | высота | кегль | зазор |
 * |---|---|---|---|
 * | `sm` (`calligenia`) | 16 | 13 | 4 |
 * | `md` (`taleggio`) | 24 | 20 | 6 |
 * | `lg` (`burrata`) | 28 | 24 | 6 |
 *
 * Остальные четыре — `ricotta` 28, `camembert` 32, `cheddar` 40, `gouda` 56 —
 * **не перенесены**: таких ступеней в нашей шкале кегля нет вовсе. Наши ступени
 * 12, 13, 15, 17, 20, 24, 36, и три перенесённых размера ложатся на них
 * **точно**, без округления. Схлопывать четыре display-размера в один
 * существующий нельзя: три из них стали бы неразличимы.
 *
 * Это не молчаливое урезание матрицы — см. `docs/open-questions.md`, вопрос 30.
 */
export const buttonNavigationVariants = cva(
  'inline-flex w-fit items-center bg-transparent font-bold outline-none select-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]',
  {
    variants: {
      size: {
        sm: 'h-4 gap-1 text-xs',
        md: 'h-6 gap-1.5 text-xl',
        lg: 'h-7 gap-1.5 text-2xl',
      },
      /** Ось `Color` мастера: тёмный против приглушённого. */
      muted: {
        true: 'text-muted-foreground',
        false: 'text-foreground',
      },
    },
    defaultVariants: {
      size: 'md',
      muted: false,
    },
  },
)

export type ButtonNavigationVariants = VariantProps<typeof buttonNavigationVariants>
