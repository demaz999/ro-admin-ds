<script setup lang="ts">
import type { DialogDescriptionProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogDescription } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Текст окна — 16/**24** с примера `6626:56959`, стиль документа
 * `Text/16|24 Regular`.
 *
 * Кегль 16 в шкале есть, а межстрочный у него **другой**: `text-base` несёт
 * 16/20 (`Text/16|20 Regular`, уведомление волны 4). Оба начертания заведены в
 * Атоме отдельными стилями документа, то есть это не описка макета, а две
 * разные роли одного кегля. Поэтому здесь `text-base` с явным `leading-6`, а не
 * новая ступень: ступень — про кегль, а не про интерлиньяж.
 */
const props = defineProps<DialogDescriptionProps & { class?: string }>()
const delegated = reactiveOmit(props, 'class')
</script>

<template>
  <DialogDescription
    data-slot="dialog-description"
    v-bind="delegated"
    :class="cn('text-base leading-6 text-foreground-secondary', props.class)"
  >
    <slot />
  </DialogDescription>
</template>
