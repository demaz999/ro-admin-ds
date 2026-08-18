<script setup lang="ts">
/**
 * Колонка фильтров. Свёрнутая не рисуется вовсе — соседняя колонка забирает
 * ширину сама. Разбор — в `index.ts`.
 *
 * Состояние фильтров внутри при сворачивании не теряется: панель прячется
 * `v-show`, а не размонтируется.
 */
const collapsed = defineModel<boolean>('collapsed', { default: false })
</script>

<template>
  <aside
    v-show="!collapsed"
    data-slot="filter-panel"
    class="flex w-87 shrink-0 flex-col gap-6"
  >
    <slot />
  </aside>
</template>
