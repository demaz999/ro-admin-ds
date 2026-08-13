<script setup lang="ts">
import { Icon } from '../icon'
import { buttonActionVariants, type ButtonActionVariants } from '.'

/**
 * Сервисное действие — мастер `ButtonAction_` `6626:56755`, спека `1008:8159`.
 * Заливки нет: это текст с иконкой, живущий в поповерах и модальных окнах.
 */
const props = withDefaults(defineProps<{
  size?: NonNullable<ButtonActionVariants['size']>
  /** Цветовая ось мастера схлопнута; удаление берётся из колонки `fargo`, как у `Button`. */
  variant?: NonNullable<ButtonActionVariants['variant']>
  /** Булев проп мастера `Show icon`. */
  showIcon?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  size: 'md',
  variant: 'default',
  showIcon: true,
  disabled: false,
  type: 'button',
})
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :class="buttonActionVariants({ size, variant })"
    :style="{ transitionProperty: 'color', transitionDuration: 'var(--duration-hover)' }"
  >
    <slot v-if="props.showIcon" name="icon">
      <Icon name="chevron-left" :size="16" />
    </slot>
    <slot />
  </button>
</template>
