<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { pickerFieldVariants } from '.'

/**
 * Пикер времени — мастер `TimePicker` `3871:26784` плюс плашка `1161:9805`.
 *
 * Поле совпадает с пикером даты **полностью**: 272×40, радиус 8, та же заливка,
 * паддинги 10/16, выключенное на 0.48. Различий два, и оба в деталях:
 *
 * 1. **В заполненном состоянии правая иконка заменяется крестиком очистки.**
 *    У пикера даты в том же состоянии обе иконки остаются на месте. Это состав
 *    мастера, а не наше решение: в варианте `filled` лежат `frame` 240 и
 *    `delete` 20, а иконки времени там нет вовсе.
 * 2. Плашка другая: не сетка календаря, а колонки часов и минут — 168×260,
 *    радиус 12, паддинг 20 сверху и снизу, 8 по бокам.
 *
 * > **Непоследовательность.** Плашка с `Range=true` **уже**, чем без диапазона:
 * > 156 против 168. Диапазон обычно требует больше места, а не меньше. Отдано
 * > дизайнерам.
 */
const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
  /** Шаг минут в колонке. В мастере колонки нарисованы значениями, шага нет. */
  step?: number
}>(), {
  placeholder: 'Время',
  disabled: false,
  step: 5,
})

const model = defineModel<string>({ default: '' })

const open = ref(false)
const filled = computed(() => model.value.length > 0)

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minutes = computed(() =>
  Array.from({ length: Math.floor(60 / props.step) }, (_, i) => String(i * props.step).padStart(2, '0')),
)

const parts = computed(() => model.value.split(':'))

function pick(h: string, m: string) {
  model.value = `${h}:${m}`
}
</script>

<template>
  <div data-slot="time-picker" class="relative w-full">
    <button
      type="button"
      :disabled="props.disabled"
      :aria-expanded="open"
      :class="pickerFieldVariants({ filled })"
      @click="open = !open"
    >
      <!-- Коробка 16×16 держит раскладку; глиф часов в набор ещё не добавлен. -->
      <span v-if="!filled" class="flex size-4 shrink-0 items-center justify-center">
        <slot name="icon" />
      </span>

      <span class="flex min-w-0 flex-1 flex-col items-start">
        <span
          v-if="filled"
          class="text-xs leading-4 text-field-placeholder"
        >{{ props.placeholder }}</span>
        <span
          class="w-full truncate text-left"
          :class="filled ? 'text-field-foreground' : 'text-field-placeholder'"
        >{{ filled ? model : props.placeholder }}</span>
      </span>

      <!-- В заполненном состоянии на месте правой иконки стоит крестик очистки. -->
      <span
        v-if="filled"
        class="flex size-5 shrink-0 items-center justify-center text-field-clear-foreground"
        role="button"
        aria-label="Очистить"
        @click.stop="model = ''"
      >
        <Icon name="close" :size="8" />
      </span>
      <span v-else class="flex size-4 shrink-0 items-center justify-center">
        <slot name="trailing" />
      </span>
    </button>

    <div
      v-if="open"
      data-slot="time-picker-popover"
      class="absolute z-50 mt-1 flex w-42 flex-col gap-2 rounded-lg bg-popover px-2 py-5 shadow-dropdown"
    >
      <span class="px-2 text-xs font-medium text-muted-foreground">Время</span>
      <div class="flex gap-2">
        <div class="flex max-h-55 flex-1 flex-col overflow-y-auto">
          <button
            v-for="h in hours"
            :key="h"
            type="button"
            class="rounded-md py-1 text-xs font-medium outline-none"
            :class="parts[0] === h ? 'bg-primary text-primary-foreground' : ''"
            @click="pick(h, parts[1] || '00')"
          >{{ h }}</button>
        </div>
        <div class="flex max-h-55 flex-1 flex-col overflow-y-auto">
          <button
            v-for="m in minutes"
            :key="m"
            type="button"
            class="rounded-md py-1 text-xs font-medium outline-none"
            :class="parts[1] === m ? 'bg-primary text-primary-foreground' : ''"
            @click="pick(parts[0] || '00', m)"
          >{{ m }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
