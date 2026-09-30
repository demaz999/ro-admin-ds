<script setup lang="ts">
import { RadioGroupRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Группа радиокнопок. Зазор между строками в мастере не задан — там нарисован
 * один пункт, — поэтому раскладку группы задаёт применяющий: внешний класс
 * мержится поверх зазора 12 (такт 39 — карточки режима через 8).
 */
const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{ disabled?: boolean, class?: string }>(), { disabled: false })
</script>

<template>
  <RadioGroupRoot v-model="model" :disabled="props.disabled" :class="cn('flex flex-col gap-3', props.class)">
    <slot />
  </RadioGroupRoot>
</template>
