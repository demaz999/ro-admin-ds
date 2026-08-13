<script setup lang="ts">
import type { BadgeVariants } from '.'
import { badgeVariants } from '.'

/**
 * Бейдж — мастер `Badge` `913:8279`. Текстовая метка без иконки и без состояний.
 */
const props = withDefaults(defineProps<{
  /** Роль цвета. Колонки мастера сведены по границе решения 23 — см. `index.ts`. */
  variant?: BadgeVariants['variant']
  size?: BadgeVariants['size']
}>(), {
  variant: 'default',
  size: 'md',
})
</script>

<template>
  <span data-slot="badge" :class="badgeVariants({ variant: props.variant, size: props.size })">
    <slot />
  </span>
</template>
