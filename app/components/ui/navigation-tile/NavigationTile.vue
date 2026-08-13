<script setup lang="ts">
import type { NavigationTileVariants } from '.'
import { navigationTileVariants } from '.'

/**
 * Навигационная плитка — мастер `NavigationTile` `638:5476`.
 * Ось `Breakpoint` мастера переведена в `size`: компонент не знает про ширину
 * окна, выбор делает раскладка страницы. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  size?: NavigationTileVariants['size']
}>(), { size: 'md' })
</script>

<template>
  <a data-slot="navigation-tile" :class="navigationTileVariants({ size: props.size })">
    <slot />
  </a>
</template>
