<script setup lang="ts">
import { computed } from 'vue'
import { RadioGroupRoot } from 'reka-ui'
import { cn } from '@/lib/utils'
import { provideReadonly } from '../field'

/**
 * Группа радиокнопок. Зазор между строками в мастере не задан — там нарисован
 * один пункт, — поэтому раскладку группы задаёт применяющий: внешний класс
 * мержится поверх зазора 12 (такт 39 — карточки режима через 8).
 */
const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  disabled?: boolean
  /** Только чтение — своё либо от `Field readonly` (такт 68): выбор отказан, пункты получают ось через контекст. */
  readonly?: boolean
  class?: string
}>(), { disabled: false, readonly: false })

/** Ось уходит пунктам тем же контекстом, что у `Field`; модель группы сама отказывает в смене при «только чтении». */
const ro = provideReadonly(() => props.readonly)
const value = computed({ get: () => model.value, set: (v: string) => { if (!ro.value || props.disabled) model.value = v } })
</script>

<template>
  <RadioGroupRoot v-model="value" :disabled="props.disabled" :aria-readonly="ro && !props.disabled ? 'true' : undefined" :class="cn('flex flex-col gap-3', props.class)">
    <slot />
  </RadioGroupRoot>
</template>
