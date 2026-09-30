<script setup lang="ts">
/** Бренд в полосе приложения — текст-местозаполнитель логотипа; значения — `index.ts`. */
</script>

<template>
  <span data-slot="app-bar-brand" class="text-xs font-bold tracking-widest whitespace-nowrap text-sidebar-foreground">
    <slot />
  </span>
</template>
