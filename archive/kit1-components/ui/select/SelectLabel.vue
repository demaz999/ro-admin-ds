<script setup lang="ts">
import type { SelectLabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectLabel } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()
const delegatedProps = reactiveOmit(props, 'class')
</script>

<!--
  Заголовок группы — `items3 type=group title`: высота 32, паддинг 8/16,
  кегль 12/16, цвет fg/primary_disabled. Фона нет.

  У соседнего семейства `items` это 13/16 и fg/secondary — расхождение кита,
  см. docs/kit-inventory.md.
-->
<template>
  <SelectLabel
    data-slot="select-label"
    v-bind="delegatedProps"
    :class="cn('flex h-8 items-center px-4 text-2xs text-foreground-disabled', props.class)"
  >
    <slot />
  </SelectLabel>
</template>
