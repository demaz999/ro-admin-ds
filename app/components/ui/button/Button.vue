<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { Spinner } from '../spinner'
import { buttonLoadingClass, buttonVariants, type ButtonVariants } from '.'

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
  /**
   * Загрузка — такт 77 (`docs/tariffs.md`, раздел 9; макет `30957:18341`, `Loader24` `30957:18364`): спиннер по центру
   * вместо иконки и подписи, ширина прежняя, кнопка недоступна и не гаснет, `aria-busy`.
   */
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'default',
  size: 'md',
  wide: false,
  showIcon: false,
  disabled: false,
  loading: false,
  type: 'button',
})
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading || undefined"
    :data-loading="props.loading || undefined"
    :class="cn(buttonVariants({ variant, size, wide }), props.loading && buttonLoadingClass)"
    :style="{ transitionProperty: 'background-color', transitionDuration: 'var(--duration-hover)' }"
  >
    <!-- Слот иконки есть только у среднего и большого: у малой его нет в мастере. -->
    <slot v-if="props.showIcon && props.size !== 'sm'" name="icon">
      <Icon name="search" :size="16" />
    </slot>
    <slot />

    <!-- Загрузка: подпись и иконка остаются в потоке прозрачными — ширина прежняя; спиннер поверх по центру. -->
    <span v-if="props.loading" data-slot="button-loading" class="absolute inset-0 flex items-center justify-center">
      <Spinner :variant="props.variant === 'default' || props.variant === 'destructive' ? 'inverse' : 'default'" :size="props.size === 'sm' ? 'xs' : 'sm'" label="Выполняется" />
    </span>
  </button>
</template>
