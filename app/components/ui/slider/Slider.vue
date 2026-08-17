<!--
  @debt Мастер `range_slider` 2034:5889 кита 1 не показывает ни залитой части
  дорожки, ни состояний, ни второго бегунка. Залитая часть добавлена дефолтом
  по аналогии с брендовой заливкой выбранного — без неё контрол не сообщает
  значение. Наведение, нажатие и выключенное не нарисованы нигде.
  См. docs/design-debt.md.
-->
<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Слайдер — мастер `range_slider` `2034:5889` кита 1. Разбор — в `index.ts`.
 * Поведение, клавиатура и доступность — примитив `Slider` Reka UI.
 */
const props = withDefaults(defineProps<SliderRootProps & { class?: string }>(), {
  min: 0,
  max: 100,
  step: 1,
})

const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    data-slot="slider"
    v-bind="forwarded"
    :class="cn(
      'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-[var(--opacity-disabled)]',
      props.class,
    )"
  >
    <!-- Дорожка: высота 4, радиус 16 — оба с мастера. -->
    <SliderTrack
      data-slot="slider-track"
      class="relative h-1 w-full grow overflow-hidden rounded-xl bg-muted-disabled"
    >
      <!-- @debt залитой части в мастере нет — см. шапку файла. -->
      <SliderRange data-slot="slider-range" class="absolute h-full bg-primary" />
    </SliderTrack>

    <!-- Бегунок: круг 12×12, заливка neutral/default. -->
    <SliderThumb
      v-for="(_, i) in (props.modelValue ?? props.defaultValue ?? [0])"
      :key="i"
      data-slot="slider-thumb"
      class="block size-3 shrink-0 rounded-full bg-muted-foreground outline-none"
    />
  </SliderRoot>
</template>
