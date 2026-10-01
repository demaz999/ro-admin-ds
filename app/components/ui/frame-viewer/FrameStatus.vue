<script setup lang="ts">
import { stepCounterVariants } from '../step-row'
import { cn } from '@/lib/utils'

/**
 * Метка состояния кадра в верхней полосе просмотра — такт 34, прототип `.lbchip`.
 * В §11.1 её нет: расширение прототипа, переносится (раздел 12.9). Пилюля — геометрия
 * и тона счётчика шага (решение владельца 4, такт 30).
 */
const props = withDefaults(defineProps<{
  assigned?: boolean
  class?: string
}>(), { assigned: false })
</script>

<template>
  <span
    data-slot="frame-status"
    :class="cn(stepCounterVariants({ tone: props.assigned ? 'success' : 'neutral' }), 'gap-1', props.class)"
  >
    {{ props.assigned ? 'распределён' : 'не распределён' }}
  </span>
</template>
