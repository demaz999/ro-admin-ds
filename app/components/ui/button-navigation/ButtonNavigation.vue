<script setup lang="ts">
import { computed, inject } from 'vue'
import { BREADCRUMB_SURFACE_KEY } from '../breadcrumb'
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
  /**
   * Сторона шеврона. `none` — шеврона нет вовсе: у последнего уровня крошек
   * стрелке указывать некуда, а в мастере она нарисована у всех десяти —
   * это демонстрационная начинка, отмеченная ещё волной 2.
   */
  direction?: 'left' | 'right' | 'none'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  /** Подача: `dark` — на тёмной полосе, роли сайдбара (такт 42). Внутри `Breadcrumb` берётся у крошек. */
  surface?: 'light' | 'dark'
}>(), {
  size: 'md',
  muted: false,
  direction: 'right',
  disabled: false,
  type: 'button',
  surface: undefined,
})

const crumbs = inject(BREADCRUMB_SURFACE_KEY, null)
const surface = computed(() => props.surface ?? crumbs?.value ?? 'light')

/** Шеврон в мастере растёт вместе с кеглем: 8 у трёх меньших размеров. */
const glyphSize = computed(() => (props.size === 'sm' ? 12 : 16))
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :class="buttonNavigationVariants({ size, muted, surface })"
  >
    <Icon v-if="props.direction === 'left'" name="chevron-left" :size="glyphSize" />
    <slot />
    <Icon v-if="props.direction === 'right'" name="chevron-right" :size="glyphSize" />
  </button>
</template>
