<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { computed } from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  /** Цветовая ось `btn_txt`: accent | warning | red. Только для variant="ghost". */
  tone?: ButtonVariants['tone']
  /** `type` у `btn_txt`: bold либо regular. */
  weight?: ButtonVariants['weight']
  /** Пятое состояние `btn_accent` — `not_active`. */
  inactive?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
  tone: 'accent',
  weight: 'bold',
  inactive: false,
})

/**
 * У ghost иконка 16 или 24 по оси `icon size`, у залитых кнопок всегда 24.
 * В мастере это контейнер фиксированного размера с глифом внутри.
 */
const iconBox = computed(() =>
  props.variant === 'ghost' && props.size === 'sm' ? 'size-4' : 'size-6',
)
</script>

<!--
  Кнопка кита: четыре мастера сведены в один компонент с пропом variant.
  Разбор осей и состояний — в index.ts рядом.

  Зазор 4 между иконкой и текстом создаётся боковыми паддингами обёртки текста,
  а не gap контейнера — так нарисовано в мастере. Отсюда асимметрия: до иконки
  10, до текста 14.
-->
<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :data-inactive="inactive || undefined"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size, tone, weight, inactive }), props.class)"
  >
    <span v-if="$slots.left" :class="cn('flex shrink-0 items-center justify-center', iconBox)">
      <slot name="left" />
    </span>

    <!-- Обёртка текста несёт паддинг 4 по бокам — источник зазора до иконки. -->
    <span v-if="$slots.default" class="flex items-center px-1">
      <slot />
    </span>

    <span v-if="$slots.right" :class="cn('flex shrink-0 items-center justify-center', iconBox)">
      <slot name="right" />
    </span>
  </Primitive>
</template>
