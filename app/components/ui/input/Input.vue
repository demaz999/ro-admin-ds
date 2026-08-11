<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<!--
  Поле ввода кита (мастер `input` 720:11753).

  Состояния сняты с вариантов мастера, а не с дефолтов shadcn:
  - default  — фон bg/page, рамка border/default
  - focus    — рамка border/accent, БЕЗ кольца (вариант state=pressed)
  - error    — рамка service/error-default, БЕЗ кольца
  - disabled — фон остаётся БЕЛЫМ, гаснут рамка и текст (вариант state=disabled)

  Стокового ring-эффекта в ките нет ни в одном состоянии: везде рамка 1px.

  Геометрия: высота 44, радиус input/border = 8, паддинг
  input/left-right_padding = 16, текст 15/20.

  Это голое поле. Полевая обёртка кита — подпись, подсказка, счётчик и раскладки
  «подпись слева / сверху» — идёт компонентом InputField в волне 1 к формам,
  см. docs/waves.md.
-->
<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="cn(
      'h-11 w-full min-w-0 rounded-md border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors',
      'placeholder:text-foreground-secondary',
      'focus:border-stroke-accent',
      'aria-invalid:border-destructive',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-stroke-neutral disabled:bg-background disabled:text-foreground-disabled disabled:placeholder:text-foreground-secondary-disabled',
      props.class,
    )"
  >
</template>
