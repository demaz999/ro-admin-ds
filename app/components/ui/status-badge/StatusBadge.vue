<!--
  @debt Цвета иллюстративные. Раскладка повторяет текущие макеты, чтобы прототипы
  рендерились цветными. В продукте статусные цвета приходят с сервера вместе с
  данными — при интеграции нужен мапинг из данных, а не выбор цвета руками.
  См. docs/design-debt.md.
-->
<script setup lang="ts">
import type { StatusDotVariants } from '.'
import { statusBadgeVariants, statusDotVariants } from '.'

/**
 * Статусная плашка — компонент `status` кита 1, вернулась в фазе обогащения.
 * Цвет отдельным пропом, потому что в продукте он придёт с данными.
 * Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Цвет точки. Явный проп: в продукте значение придёт с данными. */
  color?: StatusDotVariants['color']
}>(), { color: 'green' })
</script>

<template>
  <span
    data-slot="status-badge"
    :data-color="props.color"
    :class="statusBadgeVariants({ color: props.color })"
  >
    <span :class="statusDotVariants()" aria-hidden="true" />
    <slot />
  </span>
</template>
