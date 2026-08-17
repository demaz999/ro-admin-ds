<script setup lang="ts">
import { computed } from 'vue'
import { RadioGroupItem, useForwardProps } from 'reka-ui'
import { choiceRowVariants, choiceTitleVariants } from '../checkbox'

/**
 * Пункт группы — мастер `RadioButton` `590:5372`.
 * Контрол круглый: в мастере это эллипс, а не квадрат с радиусом.
 *
 * > **Сознательное отклонение от Атома.** Отмеченное состояние собрано по
 * > традиционной анатомии радио: тонкое кольцо 2px, как у `Checkbox`, плюс
 * > внутренняя брендовая точка. У Атома круг заливается целиком, а точка внутри
 * > белая. Цвета и размер бокса при этом прежние, из темы. Решение Михаила,
 * > запись в `docs/figma-fixes.md`.
 */
const props = withDefaults(defineProps<{
  value: string
  subtitle?: string
  disabled?: boolean
  /** Отмеченность приходит от группы; проп нужен только для окраски подписи. */
  checked?: boolean
}>(), {
  subtitle: '',
  disabled: false,
  checked: false,
})

const forwarded = useForwardProps(computed(() => ({ value: props.value, disabled: props.disabled })))
</script>

<template>
  <label data-slot="choice" :class="choiceRowVariants({ disabled })">
    <span class="flex h-5 shrink-0 items-center">
      <RadioGroupItem
        v-bind="forwarded"
        data-slot="choice-control"
        class="group/radio flex size-4 items-center justify-center rounded-full border-2 border-primary bg-transparent outline-none"
      >
        <!--
          Традиционная анатомия: кольцо остаётся тонким и в отмеченном состоянии,
          внутри загорается брендовая точка. У Атома иначе — там круг заливается
          целиком, а точка внутри белая. Сознательное отклонение, решение
          Михаила; запись в docs/figma-fixes.md.
        -->
        <span class="hidden size-2 rounded-full bg-primary group-data-[state=checked]/radio:block" />
      </RadioGroupItem>
    </span>

    <span class="flex min-w-0 flex-col">
      <span data-slot="choice-title" :class="choiceTitleVariants({ checked: props.checked })">
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
