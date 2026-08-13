<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { choiceRowVariants, choiceTitleVariants } from '../checkbox'

/**
 * Переключатель — мастер `Switcher` `1072:10873`, спека `1072:8677`,
 * тёмный набор `6137:49693`.
 *
 * Оси: `Switched` × `Disabled` = 4 варианта, перенесены все.
 *
 * Дорожка 32×20, радиус 10 — пилюля. Бегунок 16×16, белый круг. Выключенная
 * дорожка нейтральная `#d4d5d9`, включённая брендовая; бегунок не меняется.
 *
 * Имя `Switch` каноническое: `Switcher` из Атома — то же самое, но в словаре
 * shadcn компонент зовётся `Switch`.
 *
 * Раскладка общая с `Checkbox`: контрол в строке 20, зазор 12, заголовок с
 * подписью. См. `../checkbox/index.ts`.
 */
const props = withDefaults(defineProps<{
  subtitle?: string
  disabled?: boolean
}>(), {
  subtitle: '',
  disabled: false,
})

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label data-slot="choice" :class="choiceRowVariants({ disabled })">
    <span class="flex h-5 shrink-0 items-center">
      <SwitchRoot
        v-model="model"
        :disabled="props.disabled"
        data-slot="choice-control"
        class="flex h-5 w-8 items-center rounded-full bg-muted p-0.5 outline-none transition-colors data-[state=checked]:bg-primary"
      >
        <SwitchThumb
          class="block size-4 rounded-full bg-primary-foreground transition-transform data-[state=checked]:translate-x-3"
        />
      </SwitchRoot>
    </span>

    <span class="flex min-w-0 flex-col">
      <span data-slot="choice-title" :class="choiceTitleVariants({ checked: model })">
        <slot />
      </span>
      <span
        v-if="props.subtitle"
        data-slot="choice-subtitle"
        class="text-xs font-medium text-field-placeholder"
      >
        {{ props.subtitle }}
      </span>
    </span>
  </label>
</template>
