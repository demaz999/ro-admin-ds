<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { BadgeVariants } from '.'
import { reactiveOmit } from '@vueuse/core'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { badgeVariants } from '.'

const props = defineProps<PrimitiveProps & {
  color?: BadgeVariants['color']
  class?: HTMLAttributes['class']
}>()

const delegatedProps = reactiveOmit(props, 'class', 'color')
</script>

<!--
  @debt Цвета иллюстративные: раскладка повторяет текущие макеты, чтобы прототипы
  рендерились цветными. В продукте цвет метки приходит с сервера вместе с данными.
  См. docs/design-debt.md
-->
<template>
  <Primitive
    data-slot="badge"
    :data-color="color"
    :class="cn(badgeVariants({ color }), props.class)"
    v-bind="delegatedProps"
  >
    <!--
      Контейнер иконки 14×14, а глиф внутри — 20×20 со смещением -3 по обеим
      осям. Так нарисовано в мастере: 20-й иконочный мастер ужат рамкой до 14,
      оптический размер глифа выходит ≈14. Поэтому overflow видимый, а не clip.
    -->
    <span
      class="flex size-3.5 shrink-0 items-center justify-center overflow-visible [&>svg]:size-5"
      aria-hidden="true"
    >
      <slot name="icon" />
    </span>

    <span class="flex items-center">
      <slot />
    </span>
  </Primitive>
</template>
