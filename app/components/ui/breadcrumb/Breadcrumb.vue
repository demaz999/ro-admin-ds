<script setup lang="ts">
import { provide, toRef } from 'vue'
import { BREADCRUMB_SURFACE_KEY, type BreadcrumbSurface } from '.'

/**
 * Хлебные крошки — мастер `BreadCrumbs` `3880:31214`.
 * Контейнер и только: зазор 8, высота по содержимому. Разбор — в `index.ts`.
 * `surface="dark"` — подача на тёмной полосе (такт 42): крошки берут роли сайдбара.
 */
const props = withDefaults(defineProps<{ surface?: BreadcrumbSurface }>(), { surface: 'light' })
provide(BREADCRUMB_SURFACE_KEY, toRef(props, 'surface'))
</script>

<template>
  <nav data-slot="breadcrumb" :data-surface="props.surface" aria-label="Навигационная цепочка">
    <ol class="flex flex-wrap items-center gap-2">
      <slot />
    </ol>
  </nav>
</template>
