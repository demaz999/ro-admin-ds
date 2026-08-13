<script setup lang="ts">
import { TooltipProvider, type TooltipProviderProps } from 'reka-ui'

/** Общая задержка на группу подсказок. В мастере времени не указано — дефолт Reka. */
const props = defineProps<TooltipProviderProps>()
</script>

<template>
  <TooltipProvider v-bind="props">
    <slot />
  </TooltipProvider>
</template>
