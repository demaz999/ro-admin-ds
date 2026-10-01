<script setup lang="ts">
import { TabsIndicator, TabsList } from 'reka-ui'
import { cn } from '@/lib/utils'
import { tabsListVariants, type TabsListVariants } from '.'

/**
 * Список вкладок. У `line` (такт 47, VaTabs фронтов — `docs/sources/va-ui-tabs.md`): подложка активной вкладки —
 * `TabsIndicator` Reka (ширина и позиция активной из переменных Reka), переезд 0.16 s `ease`; слот `end` — правый
 * слот высотой 44 с полем 16 слева, без нижней границы; много вкладок — прокрутка списка по горизонтали.
 * `stretch` (такт 48) — список во всю ширину контейнера, линия 1 `--border` идёт под всем списком вместе с его полями.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<TabsListVariants['variant']>
  /** Только `line`: список во всю ширину, линия — под всем списком, включая поля из `class`. */
  stretch?: boolean
  class?: string
}>(), { variant: 'line', stretch: false })
</script>

<template>
  <TabsList data-slot="tabs-list" :data-variant="variant" :class="cn(tabsListVariants({ variant, stretch: props.stretch && variant === 'line' }), props.class)">
    <TabsIndicator
      v-if="variant === 'line'"
      data-slot="tabs-indicator"
      class="absolute bottom-0 left-0 h-11 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) rounded-t-md border-b-2 border-primary bg-background transition-[transform,width]"
      :style="{ transitionDuration: '0.16s', transitionTimingFunction: 'ease' }"
    />
    <slot />
    <div v-if="variant === 'line' && $slots.end" data-slot="tabs-end" class="flex h-11 shrink-0 items-center pl-4">
      <slot name="end" />
    </div>
  </TabsList>
</template>
