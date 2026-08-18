<script setup lang="ts">
import type { TableCellVariants } from '.'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { cn } from '@/lib/utils'
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
  /**
   * Класс снаружи — слиянием. Ширину колонки задаёт таблица, а не ячейка: у
   * мастера ширины прописаны у каждой колонки отдельно (`size_width`), и
   * без слияния паддинг варианта конфликтует с заданной шириной.
   */
  class?: string
  /**
   * Колонка закреплена при горизонтальной прокрутке.
   *
   * В макете левая часть таблицы вынесена в отдельный фрейм `fixed_columns`
   * (чекбокс 32 плюс название 280), а справа от неё стоит линия `devider`
   * `#ccdef5` толщиной 1 — через шапку и все строки. То есть это не просто
   * разделитель, а граница закреплённой части.
   *
   * Закреплённая ячейка обязана быть непрозрачной, иначе под ней просвечивает
   * уезжающее содержимое. Заливку она берёт у строки через `bg-inherit` —
   * поэтому наведение и выбор работают и на ней.
   */
  sticky?: number | false
  /** Граница справа: правый край закреплённой части. */
  divider?: boolean
}>(), {
  sticky: false,
  divider: false,
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
    :class="cn(
      tableCellVariants({ variant: props.variant, active: props.active, size: props.size }),
      props.sticky !== false ? 'sticky z-10 bg-inherit' : '',
      props.divider ? 'border-r border-border' : '',
      props.class,
    )"
    :style="props.sticky !== false ? { left: `${props.sticky}px` } : undefined"
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

    <!--
      Текст обрезается многоточием — так в мастере. Слот **не оборачивается**:
      в него кладут композицию, и обёртка с `truncate` ломала бы её раскладку.
      Ячейка названия в макете — это превью плюс две строки подписи рядом.
    -->
    <span v-else-if="props.variant === 'text'" class="min-w-0 flex-1 truncate text-field-foreground">
      <slot />
    </span>
    <slot v-else />
  </div>
</template>
