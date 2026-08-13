<script setup lang="ts">
import type { TableHeadVariants } from '.'
import { tableHeadVariants } from '.'

/**
 * Заголовок колонки — мастер `TableHeader` `5137:37282`.
 * Три текстовых типа различаются начертанием и цветом; разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  variant?: TableHeadVariants['variant']
}>(), { variant: 'simple' })
</script>

<template>
  <div
    data-slot="table-head"
    role="columnheader"
    :aria-sort="props.variant === 'active' ? 'ascending' : undefined"
    :class="tableHeadVariants({ variant: props.variant })"
  >
    <slot />
  </div>
</template>
