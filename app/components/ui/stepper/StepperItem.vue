<script setup lang="ts">
import { computed } from 'vue'
import { StepperItem, StepperSeparator, StepperTrigger } from 'reka-ui'
import { Icon } from '../icon'
import { stepperIndicatorVariants, stepperTitleVariants } from '.'

/** Один шаг: кружок с номером, подпись и линия к следующему. */
const props = withDefaults(defineProps<{
  /** Номер шага, с единицы. */
  step: number
  /** Текущий шаг полосы — чтобы посчитать состояние. */
  current: number
  /** Последний шаг линию к следующему не рисует. */
  last?: boolean
}>(), { last: false })

const state = computed(() => {
  if (props.step < props.current) return 'completed'
  if (props.step === props.current) return 'active'
  return 'inactive'
})
</script>

<template>
  <StepperItem
    data-slot="stepper-item"
    :step="props.step"
    :class="props.last ? 'flex items-center gap-2' : 'flex flex-1 items-center gap-2'"
  >
    <StepperTrigger class="flex items-center gap-2 outline-none">
      <span :class="stepperIndicatorVariants({ state })">
        <!-- Пройденный шаг показывает галочку вместо номера — та же логика, что
             у отмеченного `Checkbox`. -->
        <Icon v-if="state === 'completed'" name="check" :size="12" />
        <template v-else>{{ props.step }}</template>
      </span>
      <span :class="stepperTitleVariants({ state })">
        <slot />
      </span>
    </StepperTrigger>

    <StepperSeparator v-if="!props.last" class="h-px flex-1 bg-border" />
  </StepperItem>
</template>
