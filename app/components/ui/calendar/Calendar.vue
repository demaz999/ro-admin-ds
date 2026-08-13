<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'

/**
 * Календарь — мастер `DatePickerPopOver` `1159:10888`.
 * Только сетка: плашку даёт `Popover`. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Range` мастера: выделение диапазоном, а не одной датой. */
  range?: boolean
  /** Показываемый месяц. Любое число этого месяца. */
  month?: Date
}>(), {
  range: false,
  month: undefined,
})

const selected = defineModel<Date | null>({ default: null })

/** Неделя начинается с понедельника — так в строке дней мастера. */
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const cursor = ref(startOfMonth(props.month ?? selected.value ?? new Date()))

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function sameDay(a: Date | null, b: Date) {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function shift(by: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + by, 1)
}

/**
 * Шесть строк по семь дней — всегда. Сетка не меняет высоту при перелистывании,
 * потому что в мастере строк ровно шесть в любом варианте.
 */
const weeks = computed(() => {
  const first = startOfMonth(cursor.value)
  // getDay(): воскресенье 0. Неделя начинается с понедельника, поэтому сдвиг.
  const lead = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead)

  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
      return { date, outside: date.getMonth() !== cursor.value.getMonth() }
    }))
})

const title = computed(() => `${MONTHS[cursor.value.getMonth()]} ${cursor.value.getFullYear()}`)
</script>

<template>
  <div data-slot="calendar" class="flex w-60 flex-col gap-2">
    <!-- Шапка: стрелки по краям, подпись посередине. -->
    <div class="flex flex-col gap-1">
      <div class="flex h-5 items-center justify-between">
        <button
          type="button"
          class="inline-flex items-center outline-none"
          aria-label="Предыдущий месяц"
          @click="shift(-1)"
        >
          <Icon name="chevron-left" :size="16" />
        </button>
        <span class="text-xs font-medium">{{ title }}</span>
        <button
          type="button"
          class="inline-flex items-center outline-none"
          aria-label="Следующий месяц"
          @click="shift(1)"
        >
          <Icon name="chevron-right" :size="16" />
        </button>
      </div>

      <div class="flex h-4 items-center justify-between">
        <span
          v-for="d in WEEKDAYS"
          :key="d"
          class="w-6 text-center text-xs font-medium text-muted-foreground"
        >{{ d }}</span>
      </div>
    </div>

    <!-- Шесть строк, зазор 4. Ячейка 24×24. -->
    <div class="flex flex-col gap-1">
      <div
        v-for="(week, wi) in weeks"
        :key="wi"
        class="flex items-center justify-between"
      >
        <button
          v-for="cell in week"
          :key="cell.date.toISOString()"
          type="button"
          class="size-6 rounded-full text-xs font-medium outline-none"
          :class="[
            cell.outside ? 'text-muted' : 'text-foreground',
            sameDay(selected, cell.date) ? 'bg-primary text-primary-foreground' : '',
          ]"
          :aria-current="sameDay(selected, cell.date) ? 'date' : undefined"
          @click="selected = cell.date"
        >
          {{ cell.date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>
