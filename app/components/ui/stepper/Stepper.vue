<!--
  @debt Дефолт shadcn-vue: степпера нет ни в Атоме, ни в ките 1 — ни мастером,
  ни композицией. Вид собран по аналогии с уже перенесённым.
  См. docs/design-debt.md
-->
<script setup lang="ts">
import { StepperRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

/** Полоса шагов. Поведение — примитив `Stepper` Reka. Разбор — в `index.ts`. */
const props = withDefaults(defineProps<{
  /** Текущий шаг, с единицы. */
  modelValue?: number
  class?: string
}>(), { modelValue: 1 })

defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <StepperRoot
    data-slot="stepper"
    :model-value="props.modelValue"
    :class="cn('flex items-center gap-4', props.class)"
    @update:model-value="$emit('update:modelValue', $event as number)"
  >
    <slot />
  </StepperRoot>
</template>
