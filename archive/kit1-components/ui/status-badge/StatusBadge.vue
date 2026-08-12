<!--
  @debt Цвета иллюстративные: раскладка ниже повторяет текущие макеты, чтобы
  прототипы рендерились цветными. В продукте статусные цвета приходят с сервера
  вместе с данными — при интеграции нужен мапинг с данных, а не выбор цвета
  руками. См. docs/design-debt.md.
-->
<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { StatusDotVariants } from '.'
import { reactiveOmit } from '@vueuse/core'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { statusBadgeVariants, statusDotVariants } from '.'

const props = defineProps<PrimitiveProps & {
  /** Цвет точки. Явный проп: в продукте значение придёт с данными. */
  color?: StatusDotVariants['color']
  class?: HTMLAttributes['class']
}>()

const delegatedProps = reactiveOmit(props, 'class', 'color')
</script>

<template>
  <Primitive
    data-slot="status-badge"
    :data-color="color"
    :class="cn(statusBadgeVariants(), props.class)"
    v-bind="delegatedProps"
  >
    <span :class="statusDotVariants({ color })" aria-hidden="true" />
    <slot />
  </Primitive>
</template>
