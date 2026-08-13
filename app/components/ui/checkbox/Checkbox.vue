<script setup lang="ts">
import { computed } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { Icon } from '../icon'
import { choiceRowVariants, choiceTitleVariants } from '.'

/**
 * Флажок — мастер `Checkbox` `486:4733`, спека `486:4305`,
 * тёмный набор `521:4687`.
 *
 * Оси: `Checked` × `Partial` × `Disabled` = 6 вариантов, перенесены все.
 *
 * Контрол 16×16 с радиусом 4. В покое — **обводка 2px брендовым и пустая
 * середина**; отмеченный и частичный залиты брендовым, внутри белый глиф 12×12:
 * галочка либо горизонтальная черта.
 *
 * `Partial` — не третье состояние флажка, а самостоятельная ось мастера: в
 * Figma можно поставить `Checked=false, Partial=true`. В коде это привычное
 * `indeterminate`, потому что у Reka оно так и называется.
 */
const props = withDefaults(defineProps<{
  /** Ось `Partial` мастера. */
  indeterminate?: boolean
  subtitle?: string
  disabled?: boolean
}>(), {
  indeterminate: false,
  subtitle: '',
  disabled: false,
})

const model = defineModel<boolean>({ default: false })

/** Заливка появляется и у отмеченного, и у частичного — так в мастере. */
const filled = computed(() => model.value || props.indeterminate)
</script>

<template>
  <label data-slot="choice" :class="choiceRowVariants({ disabled })">
    <span class="flex h-5 shrink-0 items-center">
      <CheckboxRoot
        v-model="model"
        :disabled="props.disabled"
        data-slot="choice-control"
        class="flex size-4 items-center justify-center rounded-xs border-2 border-primary text-primary-foreground outline-none"
        :class="filled ? 'bg-primary' : 'bg-transparent'"
      >
        <CheckboxIndicator force-mount>
          <Icon v-if="props.indeterminate" name="remove" :size="12" />
          <Icon v-else-if="model" name="check" :size="12" />
        </CheckboxIndicator>
      </CheckboxRoot>
    </span>

    <span class="flex min-w-0 flex-col">
      <span data-slot="choice-title" :class="choiceTitleVariants({ checked: filled })">
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
