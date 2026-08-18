<script setup lang="ts">
import type { TableHeadVariants } from '.'
import { computed } from 'vue'
import { Icon } from '../icon'
import { cn } from '@/lib/utils'
import { tableHeadVariants } from '.'

/**
 * Заголовок колонки — мастер `TableHeader` `5137:37282` Атома.
 * Три текстовых типа различаются начертанием и цветом; разбор — в `index.ts`.
 *
 * ## Сортировка пришла из кита 1
 *
 * У мастера Атома указателя сортировки нет вовсе: тип `active` красит подпись
 * брендовым, и всё. В макете дашборда рядом с подписью колонки стоит стрелка
 * `ic_sort_up` 16×16 — глиф заполняет бокс, как и положено пикте кита.
 *
 * Поэтому проп `sort` — **наше расширение** с провенансом «макет дашборда,
 * `columns_name` `19601:29064`»: он добавляет стрелку и делает заголовок
 * кнопкой. Направление отражается поворотом того же глифа, второго в ките нет.
 */
const props = withDefaults(defineProps<{
  variant?: TableHeadVariants['variant']
  /** Направление сортировки. `none` — колонка сортируемая, но не отсортирована. */
  sort?: 'asc' | 'desc' | 'none' | null
  /** Класс снаружи — слиянием: ширину колонки задаёт таблица. */
  class?: string
  /** Колонка закреплена при прокрутке — см. `TableCell`. */
  sticky?: number | false
  /** Граница справа: правый край закреплённой части. */
  divider?: boolean
}>(), { variant: 'simple', sort: null, sticky: false, divider: false })

defineEmits<{ sort: [] }>()

const ariaSort = computed(() => {
  if (props.sort === 'asc') return 'ascending'
  if (props.sort === 'desc') return 'descending'
  if (props.variant === 'active') return 'ascending'
  return undefined
})
</script>

<template>
  <div
    data-slot="table-head"
    role="columnheader"
    :aria-sort="ariaSort"
    :class="cn(
      tableHeadVariants({ variant: props.variant }),
      props.sticky !== false ? 'sticky z-10 bg-inherit' : '',
      props.divider ? 'border-r border-border' : '',
      props.class,
    )"
    :style="props.sticky !== false ? { left: `${props.sticky}px` } : undefined"
  >
    <!-- Сортируемая колонка — кнопка: подпись и стрелка кликаются вместе. -->
    <button
      v-if="props.sort !== null"
      type="button"
      class="inline-flex items-center gap-1 outline-none transition-colors hover:text-field-foreground-hover"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      @click="$emit('sort')"
    >
      <slot />
      <Icon
        name="arrow-up"
        :size="16"
        class="transition-transform"
        :class="[
          props.sort === 'desc' ? 'rotate-180' : '',
          props.sort === 'none' ? 'opacity-[var(--opacity-icon-muted)]' : '',
        ]"
      />
    </button>

    <slot v-else />
  </div>
</template>
