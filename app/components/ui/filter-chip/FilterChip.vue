<script setup lang="ts">
import { computed, ref } from 'vue'
import { ButtonAction } from '../button-action'
import { Chip } from '../chip'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Popover } from '../popover'
import { SelectItem } from '../select'

/**
 * Чип применённого фильтра. Три вида выводятся из данных — разбор в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Название фильтра. У одиночного чипа показывается само значение. */
  label: string
  /** Выбранные значения. Одно — одиночный чип, больше одного — счётчиковый. */
  values?: string[]
  /** Диапазон строкой: «25.03.24 — 26.04.24». Взаимоисключён со списком значений. */
  range?: string
  /** Раскрыт при монтировании — нужно приёмочным снимкам. */
  defaultOpen?: boolean
}>(), {
  values: () => [],
  range: '',
  defaultOpen: false,
})

const emit = defineEmits<{
  /** Снят весь фильтр: крестик одиночного либо «Сбросить все» в списке. */
  remove: []
  /** Снято одно значение из списка. */
  removeValue: [value: string]
}>()

const open = ref(props.defaultOpen)

/** Счётчиковым чип становится от двух значений: одно значение показывается текстом. */
const isCounter = computed(() => props.values.length > 1)

const text = computed(() => {
  if (props.range) return `${props.label} ${props.range}`
  if (props.values.length === 1) return props.values[0]
  return props.label
})
</script>

<template>
  <span data-slot="filter-chip" class="relative inline-flex">
    <Chip
      v-if="isCounter"
      :count="props.values.length"
      trailing="expand"
      :expanded="open"
      @toggle="open = !open"
    >
      {{ text }}
    </Chip>

    <Chip v-else @remove="emit('remove')">
      {{ text }}
    </Chip>

    <!--
      Список выбранных значений. Сверху сброс всего фильтра, ниже значения —
      каждое снимается своим крестиком.
    -->
    <Popover
      v-if="isCounter && open"
      data-slot="filter-chip-values"
      :width="348"
      class="absolute top-10 left-0 z-50 p-1"
    >
      <div class="px-4 py-2">
        <ButtonAction :show-icon="false" size="sm" @click="emit('remove')">
          Сбросить все
        </ButtonAction>
      </div>

      <SelectItem v-for="value in props.values" :key="value">
        {{ value }}
        <template #trailing>
          <IconButton
            variant="ghost"
            size="sm"
            label="Убрать значение"
            @click="emit('removeValue', value)"
          >
            <Icon name="close" :size="9.4" />
          </IconButton>
        </template>
      </SelectItem>
    </Popover>
  </span>
</template>
