<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="cn(
      'h-11 w-full min-w-0 rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-secondary focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive aria-invalid:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border-neutral disabled:bg-surface-disabled disabled:text-foreground-disabled file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      props.class,
    )"
  >
</template>
