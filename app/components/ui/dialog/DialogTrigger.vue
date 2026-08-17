<script setup lang="ts">
import type { DialogTriggerProps } from 'reka-ui'
import { DialogTrigger } from 'reka-ui'

/** Открывашка окна. Вид не задаётся: внутрь кладут кнопку кита. */
const props = withDefaults(defineProps<DialogTriggerProps>(), { asChild: true })
</script>

<template>
  <DialogTrigger data-slot="dialog-trigger" v-bind="props">
    <slot />
  </DialogTrigger>
</template>
