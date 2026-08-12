import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'

/**
 * В ките 1 таба два разных компонента, и радиусы у них разные:
 *
 * - `iconed_tab_list` (2181:387) — «таблетка»: контейнер r=8, высота 44,
 *   паддинг 4, сам таб r=4. Это вариант `default`.
 * - `tabs` (2702:315) — подчёркивание: радиуса нет вовсе, r=0 на всех узлах.
 *   Это вариант `line`.
 *
 * Радиусы сняты с мастеров обходом узлов, а не выведены из лесенки токенов.
 */
export const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-horizontal/tabs:h-11 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  {
    variants: {
      variant: {
        default: 'rounded-md bg-muted p-1',
        line: 'gap-1 rounded-none bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>
