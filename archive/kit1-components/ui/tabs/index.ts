import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'

/**
 * В ките 1 вкладок ДВА разных мастера, и они не сводятся друг к другу.
 *
 * | Мастер | node | variant | Роль |
 * |---|---|---|---|
 * | `tabs` + атом `tab` | 2702:315 / 2702:309 | `line` | навигация по разделам |
 * | `iconed_tab_list` | 2181:387 | `pill` | переключатель режима показа |
 *
 * Чем отличаются — по мастерам, а не по вкусу:
 *
 * | | `line` | `pill` |
 * |---|---|---|
 * | контейнер | h28, без фона, рельс 1px `neutral/soft` | h44, r8, фон `accent/surface_soft`, pad 4 |
 * | таб | h20, r0, без фона | h36, r4, px 8 |
 * | активный | линия 2px `accent/default` во всю ширину таба | белая плашка + `Button Shadow` |
 * | начертание активного | **Bold** | Regular, не меняется |
 * | неактивный текст | `fg/primary` | `fg/secondary` |
 * | ширина табов | равные доли, gap 4 | по содержимому, gap 0 |
 *
 * @debt Состояний hover, disabled и focus нет ни в одном из мастеров — ни у
 * `tabs`, ни у `tab`, ни у `iconed_tab_list`. Это дырка кита; закрывается на
 * этапе 2. См. docs/design-debt.md
 */
export const tabsListVariants = cva(
  'group/tabs-list inline-flex items-center',
  {
    variants: {
      variant: {
        // Рельс 1px под всем списком — отдельный слой в мастере, поэтому здесь
        // это нижняя граница контейнера, а не тень и не фон.
        line: 'h-5 w-full gap-1 border-b border-muted',
        pill: 'h-11 w-fit gap-0 rounded-md bg-secondary p-1',
      },
    },
    defaultVariants: {
      variant: 'line',
    },
  },
)

export const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm transition-colors outline-none disabled:pointer-events-none',
  {
    variants: {
      variant: {
        // Подчёркивание 2px с круглыми концами ложится ПОВЕРХ рельса — в мастере
        // обе линии на одной оси, поэтому отрицательный сдвиг на толщину рельса.
        line: 'relative h-5 flex-1 font-normal text-foreground data-[state=active]:font-bold data-[state=active]:text-primary after:absolute after:-bottom-[5px] after:inset-x-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100',
        pill: 'h-9 gap-1 rounded-sm px-2 font-normal text-foreground-secondary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-button',
      },
    },
    defaultVariants: {
      variant: 'line',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>
export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>
