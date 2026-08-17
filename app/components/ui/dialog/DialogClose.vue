<script setup lang="ts">
import type { DialogCloseProps } from 'reka-ui'
import { DialogClose } from 'reka-ui'

/** Закрывашка для кнопок внутри окна — например «Отменить» в футере. */
const props = withDefaults(defineProps<DialogCloseProps>(), { asChild: true })
</script>

<template>
  <DialogClose data-slot="dialog-close" v-bind="props">
    <slot />
  </DialogClose>
</template>
