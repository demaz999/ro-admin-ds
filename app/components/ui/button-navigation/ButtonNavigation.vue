<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { buttonNavigationVariants, type ButtonNavigationVariants } from '.'

/**
 * Навигационная надпись со стрелкой — мастер `612:5443`.
 * Заливки, рамки и паддингов нет: это подпись и шеврон.
 */
const props = withDefaults(defineProps<{
  size?: NonNullable<ButtonNavigationVariants['size']>
  /** Ось `Color` мастера: приглушённый оттенок вместо тёмного. */
  muted?: boolean
  direction?: 'left' | 'right'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  size: 'md',
  muted: false,
  direction: 'right',
  disabled: false,
  type: 'button',
})

/** Шеврон в мастере растёт вместе с кеглем: 8 у трёх меньших размеров. */
const glyphSize = computed(() => (props.size === 'sm' ? 12 : 16))
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :class="buttonNavigationVariants({ size, muted })"
  >
    <Icon v-if="props.direction === 'left'" name="chevron-left" :size="glyphSize" />
    <slot />
    <Icon v-if="props.direction === 'right'" name="chevron-right" :size="glyphSize" />
  </button>
</template>
