<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { inputVariants, type InputVariants } from '.'

const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: `filled` — залитое поле, `elevated` — белое с тенью поверх карты. */
  variant?: NonNullable<InputVariants['variant']>
  /** Ось `Size` мастера вместе со связанной с ней `Rounded`: 40px r8 либо 64px r32. */
  size?: NonNullable<InputVariants['size']>
  /** Текстовый проп мастера `Placeholder`. В заполненном поле уезжает наверх подписью. */
  placeholder?: string
  /** Булев проп мастера `Show Icon left`. В мастере включён по умолчанию. */
  showIcon?: boolean
  /** Булев проп мастера `Show ClearButton`. В мастере выключен по умолчанию. */
  clearable?: boolean
  disabled?: boolean
}>(), {
  variant: 'filled',
  size: 'md',
  placeholder: 'Placeholder',
  showIcon: true,
  clearable: false,
  disabled: false,
})

const model = defineModel<string>({ default: '' })

/** Состояние `filled` мастера — это наличие значения, а не проп. */
const isFilled = computed(() => model.value.length > 0)
</script>

<template>
  <div
    data-slot="field"
    :class="inputVariants({ variant, size, filled: isFilled, disabled })"
  >
    <!-- Пустое поле: иконка и текст лежат прямыми детьми контейнера, зазор 8. -->
    <template v-if="!isFilled">
      <slot v-if="props.showIcon" name="icon">
        <Icon name="search" :size="16" />
      </slot>
      <input
        v-model="model"
        data-slot="field-input"
        type="text"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        class="h-5 min-w-0 flex-1 bg-transparent text-sm font-medium text-field-foreground outline-none placeholder:text-field-placeholder"
      >
    </template>

    <!--
      Заполненное поле: иконка уходит ВНУТРЬ вложенного фрейма вместе с текстовым
      столбцом, и зазор между ними снова 8. Внешний зазор 12 остаётся между этим
      фреймом и кнопкой очистки. Так нарисовано в мастере — это не упрощение.
    -->
    <template v-else>
      <div class="flex h-9 min-w-0 flex-1 items-center gap-2">
        <slot v-if="props.showIcon" name="icon">
          <Icon name="search" :size="16" />
        </slot>
        <div class="flex h-9 min-w-0 flex-1 flex-col items-start">
          <span
            data-slot="field-label"
            class="h-4 w-full truncate text-xs font-medium text-field-placeholder"
          >
            {{ props.placeholder }}
          </span>
          <input
            v-model="model"
            data-slot="field-input"
            type="text"
            :disabled="props.disabled"
            class="h-5 w-full bg-transparent text-sm font-medium text-field-foreground outline-none"
          >
        </div>
      </div>

      <button
        v-if="props.clearable"
        data-slot="field-clear"
        type="button"
        :disabled="props.disabled"
        class="flex size-5 shrink-0 items-center justify-center rounded-full p-1.5"
        :class="variant === 'elevated' ? 'bg-field-clear-elevated' : 'bg-field-clear'"
        aria-label="Очистить"
        @click="model = ''"
      >
        <Icon name="close" :size="8" />
      </button>
    </template>
  </div>
</template>
