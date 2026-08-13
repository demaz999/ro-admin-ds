<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { buttonArrowVariants, type ButtonArrowVariants } from '.'

/**
 * Круглая кнопка-стрелка — мастер `1938:12858`.
 * Направление в мастере это ось, а не иконка на выбор: слот под глиф там один.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<ButtonArrowVariants['variant']>
  size?: NonNullable<ButtonArrowVariants['size']>
  /** Ось `Direction` мастера. */
  direction?: 'left' | 'right'
  disabled?: boolean
  label: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'elevated',
  size: 'md',
  direction: 'left',
  disabled: false,
  type: 'button',
})

/** Глиф у большого размера крупнее: в мастере 12 против 6 по ширине шеврона. */
const glyphSize = computed(() => (props.size === 'lg' ? 24 : 16))
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :aria-label="props.label"
    :class="buttonArrowVariants({ variant, size })"
  >
    <Icon :name="props.direction === 'left' ? 'chevron-left' : 'chevron-right'" :size="glyphSize" />
  </button>
</template>
