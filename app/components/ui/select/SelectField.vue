<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Подпись. В мастере — инстанс `lable`, фиксированная высота 40. */
  label?: string
  /** Раскладка подписи: `label=left` | `top` | `no` из мастера. */
  orientation?: 'top' | 'left'
  /** Подсказка под полем слева. */
  hint?: string
  /** Счётчик справа. В мастере всегда идёт вместе с подсказкой. */
  counter?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}>(), {
  orientation: 'top',
})

const state = computed(() => (props.disabled ? 'disabled' : undefined))
const hasHintRow = computed(() => Boolean(props.hint || props.counter))
</script>

<!--
  Оболочка селекта — мастер `select` 244:13976.

  В ките `select` это ПОЛЕ целиком, а не контрол: подпись, тело и строка
  подсказки со счётчиком. Раскладок подписи три — left, top, no; `no` это
  ровно `top` без узла подписи, больше ничего не меняется.

  Цвет взят из `mode`, а не из коллекции `select/color/*` мастера — решение
  по варианту B. Разбор и таблица соответствий: docs/tokens.md, раздел 7;
  причина: docs/open-questions.md, вопросы 21 и 22.

  Отличие от `input`, снятое с мастера: здесь подсказка и счётчик набраны
  Bold 13/16, а у `input` подсказка Regular. Так в ките.
-->
<template>
  <div
    :data-state="state"
    :data-orientation="orientation"
    class="group/field flex gap-2 data-[orientation=left]:flex-row data-[orientation=left]:items-start data-[orientation=top]:flex-col"
    :class="props.class"
  >
    <!-- Подпись: фиксированная высота 40 = высоте тела, текст по центру. -->
    <label
      v-if="label"
      class="text-sm font-bold text-foreground group-data-[state=disabled]/field:text-foreground-disabled"
      :class="orientation === 'left' ? 'flex h-10 shrink-0 items-center' : 'block'"
    >
      {{ label }}
    </label>

    <!-- select_container: вертикальный, gap 4. -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <slot />

      <div v-if="hasHintRow" class="flex h-4 items-center gap-2">
        <span
          v-if="hint"
          class="min-w-0 flex-1 text-xs font-bold text-foreground group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ hint }}
        </span>
        <span
          v-if="counter"
          class="ml-auto shrink-0 text-xs font-bold text-foreground group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ counter }}
        </span>
      </div>
    </div>
  </div>
</template>
