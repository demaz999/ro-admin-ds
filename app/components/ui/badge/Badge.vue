<script setup lang="ts">
import type { BadgeVariants } from '.'
import { badgeOutlineVariants, badgeVariants } from '.'

/**
 * Бейдж — мастер `Badge` `913:8279`. Текстовая метка без иконки и без состояний.
 * Вид `appearance="outline"` — метка-контур макета тарификации (такт 80), разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Роль цвета. Колонки мастера сведены по границе решения 23 — см. `index.ts`. */
  variant?: BadgeVariants['variant']
  size?: BadgeVariants['size']
  /**
   * Вид: `filled` — залитая метка мастера; `outline` — контур 20: рамка 1 и текст тона, без заливки (Figma `31175:4820`,
   * такт 80). У контура геометрия одна — `size` не действует.
   */
  appearance?: 'filled' | 'outline'
}>(), {
  variant: 'default',
  size: 'md',
  appearance: 'filled',
})
</script>

<template>
  <span
    data-slot="badge"
    :data-appearance="props.appearance === 'outline' ? 'outline' : undefined"
    :class="props.appearance === 'outline' ? badgeOutlineVariants({ variant: props.variant }) : badgeVariants({ variant: props.variant, size: props.size })"
  >
    <slot />
  </span>
</template>
