<script setup lang="ts">
import { RadioGroupRoot } from 'reka-ui'

/**
 * Группа радиокнопок. Зазор между строками в мастере не задан — там нарисован
 * один пункт, — поэтому раскладку группы задаёт применяющий.
 */
const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
</script>

<template>
  <RadioGroupRoot v-model="model" :disabled="disabled" class="flex flex-col gap-3">
    <slot />
  </RadioGroupRoot>
</template>
