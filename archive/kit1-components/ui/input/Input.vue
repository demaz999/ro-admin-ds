<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { InputVariants } from '.'
import { useVModel } from '@vueuse/core'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { inputBodyVariants } from '.'

const props = withDefaults(defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  /** Подпись поля. Гейт `Show lable` в мастере. */
  label?: string
  /** Раскладка подписи: `label=top` или `label=left` в мастере. */
  orientation?: 'top' | 'left'
  /** `size` мастера: 44px по умолчанию, 40px — компактный. */
  size?: InputVariants['size']
  /** Подсказка под полем слева. Гейт `left_hint`. */
  hint?: string
  /** Счётчик символов под полем справа. Гейт `right_hint`. */
  counter?: string
  /** Состояние ошибки: рамка, подсказка и счётчик краснеют. */
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  class?: HTMLAttributes['class']
}>(), {
  orientation: 'top',
  size: 'default',
})

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})

/**
 * Состояние вывешивается на корень, потому что в мастере error и disabled
 * красят части ЗА пределами контрола — подпись, подсказку, счётчик, иконки.
 * Через :disabled и :invalid самого input до них не дотянуться.
 */
const state = computed(() => {
  if (props.disabled) return 'disabled'
  if (props.invalid) return 'error'
  return undefined
})

/** Строка подсказки рисуется, только если есть хотя бы одна из двух её частей. */
const hasHintRow = computed(() => Boolean(props.hint || props.counter))
</script>

<!--
  Поле ввода кита. Мастер `input` 720:11753.

  Состав перенесён целиком: подпись (две раскладки), поле с левым и правым
  иконочными слотами, строка подсказки со счётчиком.

  Чего в мастере НЕТ и потому нет здесь:
  - фокус-кольца: в `pressed` меняется только цвет рамки, 1px;
  - серой заливки в disabled: фон остаётся белым, гаснут цвета;
  - opacity: каждая часть гасится своим токеном.

  @debt Состояние hover в ките не нарисовано — есть только Default, pressed,
  field, error, disabled. Это дырка мастера, а не решение. См. docs/design-debt.md
-->
<template>
  <div
    :data-state="state"
    :data-orientation="orientation"
    class="group/field flex data-[orientation=left]:flex-row data-[orientation=left]:items-start data-[orientation=top]:flex-col gap-2"
    :class="props.class"
  >
    <!-- Подпись. В раскладке left колонка HUG по ширине и центрируется по высоте поля. -->
    <label
      v-if="label"
      class="text-sm font-bold text-foreground group-data-[state=disabled]/field:text-foreground-disabled"
      :class="orientation === 'left'
        ? [size === 'sm' ? 'h-10' : 'h-11', 'flex shrink-0 items-center']
        : 'block'"
    >
      {{ label }}
    </label>

    <!-- input_container: gap 4 между полем и строкой подсказки. -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div :class="cn(inputBodyVariants({ size }), 'focus-within:border-stroke-accent')">
        <span
          v-if="$slots.left"
          class="flex size-6 shrink-0 items-center justify-center text-foreground-secondary group-data-[state=disabled]/field:text-foreground-secondary-disabled"
        >
          <slot name="left" />
        </span>

        <input
          v-model="modelValue"
          data-slot="input"
          :disabled="disabled"
          :placeholder="placeholder"
          :aria-invalid="invalid || undefined"
          class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-secondary disabled:cursor-not-allowed disabled:text-foreground-disabled disabled:placeholder:text-foreground-disabled"
        >

        <span
          v-if="$slots.right"
          class="flex size-6 shrink-0 items-center justify-center text-foreground-secondary group-data-[state=disabled]/field:text-foreground-secondary-disabled"
        >
          <slot name="right" />
        </span>
      </div>

      <!-- hint: подсказка слева тянется, счётчик прижат вправо. Высота 16. -->
      <div v-if="hasHintRow" class="flex h-4 items-center gap-2">
        <span
          v-if="hint"
          class="min-w-0 flex-1 text-xs text-foreground group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ hint }}
        </span>
        <span
          v-if="counter"
          class="ml-auto shrink-0 text-xs font-bold text-foreground group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ counter }}
        </span>
      </div>
    </div>
  </div>
</template>
