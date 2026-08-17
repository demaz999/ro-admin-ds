<script setup lang="ts">
import type { FieldVariants } from '.'
import { computed } from 'vue'
import { fieldLabelVariants, fieldVariants } from '.'

/**
 * Полевая обвязка — мастер `input` `720:11753` кита 1.
 * Надстройка над атомовским ядром: подпись, подсказка, счётчик. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Подпись поля. Гейт `Show lable` мастера. */
  label?: string
  /** Ось `label` мастера: над полем либо слева от него. */
  orientation?: NonNullable<FieldVariants['orientation']>
  /** Подсказка под полем слева. Гейт `left_hint`. */
  hint?: string
  /** Счётчик символов под полем справа. Гейт `right_hint`. */
  counter?: string
  /** Ошибка: подсказка и счётчик краснеют. У Атома ошибка живёт в самом поле. */
  invalid?: boolean
  disabled?: boolean
  /**
   * Высота контрола внутри — нужна только раскладке `left`, чтобы подпись встала
   * по центру поля, а не по центру всего блока со строкой подсказки.
   * Атомовские поля 40; большой размер 64.
   */
  controlHeight?: number
}>(), {
  label: '',
  orientation: 'top',
  hint: '',
  counter: '',
  invalid: false,
  disabled: false,
  controlHeight: 40,
})

/**
 * Состояние вывешивается на корень: ошибка и выключенность красят подпись,
 * подсказку и счётчик — узлы за пределами контрола, до которых его собственные
 * `:disabled` и `:invalid` не дотягиваются.
 */
const state = computed(() => {
  if (props.disabled) return 'disabled'
  if (props.invalid) return 'error'
  return undefined
})

/** Строка подсказки рисуется, только если есть хотя бы одна из двух её частей. */
const hasHintRow = computed(() => Boolean(props.hint || props.counter))
</script>

<template>
  <div
    data-slot="field-wrapper"
    :data-state="state"
    :class="fieldVariants({ orientation: props.orientation })"
  >
    <label
      v-if="props.label"
      :class="fieldLabelVariants({ orientation: props.orientation })"
      :style="props.orientation === 'left' ? { height: `${props.controlHeight}px` } : undefined"
    >
      {{ props.label }}
    </label>

    <!-- Зазор 4 между контролом и строкой подсказки — из мастера. -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <slot />

      <!-- Подсказка тянется, счётчик прижат вправо. Высота строки 16. -->
      <div v-if="hasHintRow" class="flex h-4 items-center gap-2">
        <span
          v-if="props.hint"
          data-slot="field-hint"
          class="min-w-0 flex-1 text-xs text-muted-foreground group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ props.hint }}
        </span>
        <span
          v-if="props.counter"
          data-slot="field-counter"
          class="ml-auto shrink-0 text-xs font-bold text-muted-foreground group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ props.counter }}
        </span>
      </div>
    </div>
  </div>
</template>
