<script setup lang="ts">
import type { DialogTitleProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogTitle } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Заголовок окна — 32/36 Bold с примера `6626:56959`.
 * Кегль взят ступенью `text-3xl`: у текста стоит заведённый стиль документа
 * `Headers/32|36 Bold`, то есть источник у ступени есть.
 */
const props = defineProps<DialogTitleProps & { class?: string }>()
const delegated = reactiveOmit(props, 'class')
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    v-bind="delegated"
    :class="cn('text-3xl font-bold text-foreground', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
