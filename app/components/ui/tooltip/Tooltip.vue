<script setup lang="ts">
import { TooltipRoot, type TooltipRootProps } from 'reka-ui'

/** Корень подсказки — мастер `Tooltip` `834:10127`. Поведение из Reka, вид с мастера. */
const props = defineProps<TooltipRootProps>()
</script>

<template>
  <TooltipRoot v-bind="props">
    <slot />
  </TooltipRoot>
</template>
