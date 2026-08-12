<script setup lang="ts">
import type { TabsTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { TabsTriggerVariants } from '.'
import { reactiveOmit } from '@vueuse/core'
import { TabsTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'
import { tabsTriggerVariants } from '.'

const props = withDefaults(defineProps<TabsTriggerProps & {
  class?: HTMLAttributes['class']
  variant?: TabsTriggerVariants['variant']
}>(), {
  variant: 'line',
})

const delegatedProps = reactiveOmit(props, 'class', 'variant')
</script>

<!--
  Слоты сняты с мастера `iconed_tab_list`: иконка в боксе 24×24 либо текст со
  счётчиком-bulb справа. В ките они взаимоисключающие — варианта «иконка плюс
  подпись» там нет.
-->
<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :data-variant="variant"
    v-bind="delegatedProps"
    :class="cn(tabsTriggerVariants({ variant }), props.class)"
  >
    <span v-if="$slots.icon" class="flex size-6 shrink-0 items-center justify-center">
      <slot name="icon" />
    </span>
    <slot />
    <slot name="counter" />
  </TabsTrigger>
</template>
