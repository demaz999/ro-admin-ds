<script setup lang="ts">
import { TabsList } from 'reka-ui'
import { tabsListVariants, type TabsListVariants } from '.'

/**
 * Список вкладок. Зазор — единственное, что меняет вид на уровне списка:
 * 20 у подчёркивания, 0 у таблетки. Так в мастере `1782:13075`.
 */
withDefaults(defineProps<{
  variant?: NonNullable<TabsListVariants['variant']>
}>(), { variant: 'line' })
</script>

<template>
  <TabsList data-slot="tabs-list" :class="tabsListVariants({ variant })">
    <slot />
  </TabsList>
</template>
