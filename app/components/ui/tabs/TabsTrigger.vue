<script setup lang="ts">
import { TabsTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'
import { tabsTriggerVariants, type TabsTriggerVariants } from '.'

/**
 * Вкладка — мастер `_Tab` `1772:11731`.
 *
 * У вида `line` индикатор — полоса 4px под текстом, радиусом 2, **по ширине
 * текста**, а не всей вкладки: во вкладке 85 из них 63 занимает внутренний
 * столбец, остальное счётчик и зазор.
 *
 * Индикатор виден только у активной. Это измерено, а не выведено: у трёх
 * неактивных состояний узел линии помечен видимым, но не отрисовывает ничего.
 *
 * С такта 47 вид `line` — по VaTabs фронтов: подложка и полоса активной — у списка (`TabsIndicator`), разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  value: string
  variant?: NonNullable<TabsTriggerVariants['variant']>
  disabled?: boolean
  /** Счётчик вкладки (VaTabs, такт 47): число показывается и при 0. Не задан — счётчика нет. */
  count?: number | string
}>(), {
  variant: 'line',
  disabled: false,
  count: undefined,
})
</script>

<template>
  <TabsTrigger
    :value="props.value"
    :disabled="props.disabled"
    data-slot="tabs-trigger"
    :class="cn(tabsTriggerVariants({ variant }))"
  >
    <slot />
    <span
      v-if="props.count !== undefined"
      data-slot="tabs-counter"
      class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-foreground-secondary"
    >{{ props.count }}</span>

    <!-- Счётчик стоит вне столбца с линией — так в мастере. -->
    <slot name="counter" />
  </TabsTrigger>
</template>
