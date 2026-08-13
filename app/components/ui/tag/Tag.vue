<script setup lang="ts">
import { tagVariants } from '.'

/**
 * Тег — мастер `ButtonTag` `256:3601`.
 * Снять его нельзя и он ничего не считает: крестика и счётчика в мастере нет.
 */
const props = withDefaults(defineProps<{
  /** Ось `Active` мастера. */
  active?: boolean
  /** Маркер-точка слева. В мастере она есть всегда. */
  showMarker?: boolean
  disabled?: boolean
}>(), {
  active: false,
  showMarker: true,
  disabled: false,
})
</script>

<template>
  <button
    data-slot="tag"
    type="button"
    :disabled="props.disabled"
    :aria-pressed="props.active"
    :class="tagVariants({ active })"
  >
    <!-- Точка 8×8. В обычном состоянии пастельная, в активном белая. -->
    <span
      v-if="props.showMarker"
      data-slot="tag-marker"
      class="size-2 shrink-0 rounded-full"
      :class="active ? 'bg-primary-foreground' : 'bg-accent-soft'"
    />
    <slot />
  </button>
</template>
