<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { iconButtonVariants, type IconButtonVariants } from '.'

/**
 * Иконочная кнопка — мастер `ButtonSimple` `110:1566`, спека `106:397`.
 * Текстового пропа у мастера нет: это не `Button` без подписи, а другой узел.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<IconButtonVariants['variant']>
  size?: NonNullable<IconButtonVariants['size']>
  /** Ось `Rounded` мастера: круглая вместо скруглённой. */
  rounded?: boolean
  disabled?: boolean
  /** Обязателен: кнопка без подписи должна называть себя вспомогательным технологиям. */
  label: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'default',
  size: 'md',
  rounded: false,
  disabled: false,
  type: 'button',
})

/** Глиф у большого размера 20, у остальных 16 — так в мастере. */
const glyphSize = computed(() => (props.size === 'lg' ? 20 : 16))
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :aria-label="props.label"
    :class="iconButtonVariants({ variant, size, rounded })"
    :style="{ transitionProperty: 'background-color', transitionDuration: 'var(--duration-hover)' }"
  >
    <slot>
      <Icon name="location" :size="glyphSize" />
    </slot>
  </button>
</template>
