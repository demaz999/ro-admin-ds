<script setup lang="ts">
/**
 * Хлебные крошки — мастер `BreadCrumbs` `3880:31214`.
 * Контейнер и только: зазор 8, высота по содержимому. Разбор — в `index.ts`.
 */
</script>

<template>
  <nav data-slot="breadcrumb" aria-label="Навигационная цепочка">
    <ol class="flex flex-wrap items-center gap-2">
      <slot />
    </ol>
  </nav>
</template>
