<script setup lang="ts">
import { TabsTrigger } from 'reka-ui'
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
 */
const props = withDefaults(defineProps<{
  value: string
  variant?: NonNullable<TabsTriggerVariants['variant']>
  disabled?: boolean
}>(), {
  variant: 'line',
  disabled: false,
})
</script>

<template>
  <TabsTrigger
    :value="props.value"
    :disabled="props.disabled"
    data-slot="tabs-trigger"
    :class="tabsTriggerVariants({ variant })"
  >
    <!--
      У подчёркивания текст и линия — один столбец шириной по тексту, зазор 8.
      У таблетки столбца нет: подпись лежит прямо в кнопке.
    -->
    <span v-if="props.variant === 'line'" class="flex flex-col gap-2">
      <span class="h-5"><slot /></span>
      <span
        data-slot="tabs-indicator"
        class="h-1 rounded-2xs bg-primary opacity-0 group-data-[state=active]/tab:opacity-100"
      />
    </span>
    <slot v-else />

    <!-- Счётчик стоит вне столбца с линией — так в мастере. -->
    <slot name="counter" />
  </TabsTrigger>
</template>
