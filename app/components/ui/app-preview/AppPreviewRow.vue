<script setup lang="ts">
import type { AppPreviewIcon } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { APP_HIGHLIGHT, APP_PRESSABLE } from '.'

/**
 * Строка списка экрана приложения: пункт чек-листа шагов, повтор в списке повторяемого процесса, блок дополнительных файлов.
 * В макете `33694:3879` строки нет — по аналогии с кнопкой: поверхность `--app-surface`, радиус 6, поля 8; слева миниатюра
 * фото-подсказки 32 × 24 (радиус 4) либо глиф 16 `--app-foreground-secondary`; название 12/16 bold, вторая строка 12/16
 * `--app-foreground-secondary`; справа — галочка выполненного 12 `--app-accent` либо шеврон 12 у нажимаемой строки.
 * Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  title: string
  meta?: string
  icon?: AppPreviewIcon
  src?: string
  done?: boolean
  highlighted?: boolean
  pressable?: boolean
}>(), { meta: '', icon: undefined, src: '', done: false, highlighted: false, pressable: false })

const emit = defineEmits<{ press: [] }>()

const look = computed(() => cn(
  'flex w-full shrink-0 items-center gap-2 rounded-sm bg-app-surface p-2 text-left',
  props.highlighted ? APP_HIGHLIGHT : '',
  props.pressable ? APP_PRESSABLE : '',
))
</script>

<template>
  <component
    :is="props.pressable ? 'button' : 'div'"
    :type="props.pressable ? 'button' : undefined"
    data-slot="app-preview-row"
    :data-done="props.done || undefined"
    :data-highlighted="props.highlighted || undefined"
    :class="look"
    @click="props.pressable && emit('press')"
  >
    <img v-if="props.src" data-slot="app-preview-row-image" :src="props.src" alt="" class="h-6 w-8 shrink-0 rounded-xs bg-app-slot object-cover">
    <span v-else-if="props.icon" class="flex shrink-0 text-app-foreground-secondary">
      <Icon :name="props.icon" :size="16" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span data-slot="app-preview-row-title" class="truncate text-2xs font-bold text-app-foreground">{{ props.title }}</span>
      <span v-if="props.meta" data-slot="app-preview-row-meta" class="truncate text-2xs text-app-foreground-secondary">{{ props.meta }}</span>
    </span>
    <span v-if="props.done" class="flex shrink-0 text-app-accent">
      <Icon name="check" :size="12" />
    </span>
    <span v-else-if="props.pressable" class="flex shrink-0 text-app-foreground-secondary">
      <Icon name="chevron-right" :size="12" />
    </span>
  </component>
</template>
