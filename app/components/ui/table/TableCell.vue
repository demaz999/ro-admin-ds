<script setup lang="ts">
import type { TableCellVariants } from '.'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { tableCellVariants } from '.'

/**
 * Ячейка таблицы — мастер `Cell` `3349:22376`.
 *
 * Пять готовых типов плюс слот; пятнадцать содержательных значений оси мастера
 * компонентами не являются и кладутся в слот композицией. Разбор — в `index.ts`
 * и в `docs/table-ds-marker.md`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type`, урезанная до помеченных «— DS» плюс пустая ячейка. */
  variant?: TableCellVariants['variant']
  /** Ось `Active`: подсветка. У Атома она на ячейке, а не на строке. */
  active?: boolean
  /** Высота из мастера. Кегль текста идёт за ней. */
  size?: TableCellVariants['size']
}>(), {
  variant: 'text',
  active: false,
  size: 56,
})

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <div
    data-slot="table-cell"
    role="cell"
    :class="tableCellVariants({ variant: props.variant, active: props.active, size: props.size })"
  >
    <!-- Отметка строки: инстанс того же чекбокса, что и везде. -->
    <Checkbox v-if="props.variant === 'checkbox'" />

    <!-- Раскрытие и сворачивание группы — механика таблицы, не содержимое. -->
    <button
      v-else-if="props.variant === 'expand' || props.variant === 'collapse'"
      type="button"
      class="inline-flex items-center outline-none"
      :aria-expanded="props.variant === 'collapse'"
      :aria-label="props.variant === 'expand' ? 'Раскрыть группу' : 'Свернуть группу'"
      @click="emit('toggle')"
    >
      <Icon :name="props.variant === 'expand' ? 'chevron-down' : 'chevron-up'" :size="16" />
    </button>

    <!-- Текст и слот отличаются только тем, что во второй кладут что угодно. -->
    <span v-else class="min-w-0 flex-1 truncate text-field-foreground">
      <slot />
    </span>
  </div>
</template>
