<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar } from '../calendar'
import { Icon } from '../icon'
import { pickerFieldVariants } from '.'

/**
 * Пикер даты — мастер `DatePicker` `1763:10301` плюс плашка `1159:10888`.
 * Поле и календарь; разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  placeholder?: string
  /** Ось `Range` плашки: выделение диапазоном. На контейнер не влияет. */
  range?: boolean
  disabled?: boolean
}>(), {
  placeholder: 'Дата',
  range: false,
  disabled: false,
})

const model = defineModel<Date | null>({ default: null })

const open = ref(false)

/** Подпись всплывает, когда есть значение, — тот же приём, что у поля ввода. */
const filled = computed(() => model.value !== null)

const text = computed(() =>
  model.value ? model.value.toLocaleDateString('ru-RU') : '',
)
</script>

<template>
  <div data-slot="date-picker" class="relative w-full">
    <button
      type="button"
      :disabled="props.disabled"
      :aria-expanded="open"
      :class="pickerFieldVariants({ filled })"
      @click="open = !open"
    >
      <span class="flex size-4 shrink-0 items-center justify-center">
        <slot name="icon">
          <Icon name="calendar-month" :size="16" />
        </slot>
      </span>

      <span class="flex min-w-0 flex-1 flex-col items-start">
        <span
          v-if="filled"
          class="text-xs leading-4 text-field-placeholder"
        >{{ props.placeholder }}</span>
        <span
          class="w-full truncate text-left"
          :class="filled ? 'text-field-foreground' : 'text-field-placeholder'"
        >{{ filled ? text : props.placeholder }}</span>
      </span>

      <span class="flex size-4 shrink-0 items-center justify-center">
        <slot name="trailing">
          <Icon name="schedule" :size="16" />
        </slot>
      </span>
    </button>

    <!-- Плашка календаря — та же, что у выпадашки: радиус 12, паддинг 20, тень. -->
    <div
      v-if="open"
      data-slot="date-picker-popover"
      class="absolute z-50 mt-1 rounded-lg bg-popover p-5 shadow-dropdown"
    >
      <Calendar v-model="model" :range="props.range" />
    </div>
  </div>
</template>
