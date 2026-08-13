<script setup lang="ts">
import { Icon } from '../icon'
import { buttonVariants, type ButtonVariants } from '.'

/**
 * Текстовая кнопка — мастер `57:340`, спека `45:175`.
 *
 * Иконочная кнопка это **другой компонент**: у Атома её рисует `ButtonSimple`
 * `110:1566`, и в коде она зовётся `IconButton`. Здесь иконка — необязательный
 * слот рядом с текстом, а не режим без текста.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: залитая либо тональная. */
  variant?: NonNullable<ButtonVariants['variant']>
  /** Ось `Size` мастера вместе со связанной с ней `Rounded`. */
  size?: NonNullable<ButtonVariants['size']>
  /** Ось `Width` мастера: по содержимому либо во всю ширину. */
  wide?: boolean
  /** Булев проп мастера `Show icon`. У малого размера слота иконки нет. */
  showIcon?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'default',
  size: 'md',
  wide: false,
  showIcon: false,
  disabled: false,
  type: 'button',
})
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :class="buttonVariants({ variant, size, wide })"
    :style="{ transitionProperty: 'background-color', transitionDuration: 'var(--duration-hover)' }"
  >
    <!-- Слот иконки есть только у среднего и большого: у малой его нет в мастере. -->
    <slot v-if="props.showIcon && props.size !== 'sm'" name="icon">
      <Icon name="search" :size="16" />
    </slot>
    <slot />
  </button>
</template>
