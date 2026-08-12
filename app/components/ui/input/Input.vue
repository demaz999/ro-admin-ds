<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { inputVariants, type InputVariants } from '.'

const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: `filled` — залитое поле, `elevated` — белое с тенью поверх карты. */
  variant?: NonNullable<InputVariants['variant']>
  /** Ось `Size` мастера вместе со связанной с ней `Rounded`: 40px r8 либо 64px r32. */
  size?: NonNullable<InputVariants['size']>
  /** Текстовый проп мастера `Placeholder`. При фокусе или значении уезжает наверх подписью. */
  placeholder?: string
  /** Булев проп мастера `Show Icon left`. В мастере включён по умолчанию. */
  showIcon?: boolean
  /** Булев проп мастера `Show ClearButton`. В мастере выключен по умолчанию. */
  clearable?: boolean
  /** Состояние `Error` из спеки 237:2820. В мастере его нет. */
  invalid?: boolean
  /** Строка сообщения об ошибке — в спеке подписана «text about error here». */
  errorText?: string
  disabled?: boolean
}>(), {
  variant: 'filled',
  size: 'md',
  placeholder: 'Placeholder',
  showIcon: true,
  clearable: false,
  invalid: false,
  errorText: '',
  disabled: false,
})

const model = defineModel<string>({ default: '' })

/**
 * Фокус отслеживается вручную, потому что от него зависит не только цвет, но и
 * РАЗМЕТКА: в ячейке `Pressed/Active` спеки подпись уже наверху, хотя значения
 * ещё нет. Одним CSS это не выражается.
 */
const focused = ref(false)

/** Подпись всплывает при фокусе ИЛИ при наличии значения — так в спеке. */
const isFloating = computed(() => focused.value || model.value.length > 0)
</script>

<template>
  <div class="w-full">
    <!--
      Структура НЕ переключается между состояниями: узел `input` один и тот же
      всегда. Если разводить пустое и заполненное состояние на две ветки `v-if`,
      поле пересоздаётся в момент фокуса и фокус тут же теряется — подпись
      всплывает и сразу опадает.

      Поэтому меняются только высоты и видимость подписи, а вложенный фрейм с
      иконкой стоит на месте всегда: в мастере он и есть носитель зазора 8, тогда
      как внешний зазор 12 отделяет его от кнопки очистки.
    -->
    <div
      data-slot="field"
      :class="inputVariants({ variant, size, invalid, floating: isFloating, disabled })"
    >
      <div
        class="flex min-w-0 flex-1 items-center gap-2"
        :class="isFloating ? 'h-9' : 'h-5'"
      >
        <slot v-if="props.showIcon" name="icon">
          <Icon name="search" :size="16" />
        </slot>

        <div
          class="flex min-w-0 flex-1 flex-col items-start"
          :class="isFloating ? 'h-9' : 'h-5'"
        >
          <span
            v-show="isFloating"
            data-slot="field-label"
            class="h-4 w-full truncate text-xs font-medium text-field-placeholder group-hover/field:text-field-placeholder-hover group-focus-within/field:text-field-placeholder-hover"
          >
            {{ props.placeholder }}
          </span>
          <input
            v-model="model"
            data-slot="field-input"
            type="text"
            :placeholder="isFloating ? undefined : props.placeholder"
            :disabled="props.disabled"
            :aria-invalid="props.invalid || undefined"
            class="h-5 w-full min-w-0 bg-transparent text-sm font-medium outline-none text-field-foreground placeholder:text-field-placeholder group-hover/field:text-field-foreground-hover group-hover/field:placeholder:text-field-placeholder-hover group-focus-within/field:text-field-foreground-hover"
            @focus="focused = true"
            @blur="focused = false"
          >
        </div>
      </div>

      <button
        v-if="props.clearable && isFloating"
        data-slot="field-clear"
        type="button"
        :disabled="props.disabled"
        class="flex size-5 shrink-0 items-center justify-center rounded-full p-1.5 text-field-clear-foreground"
        :class="variant === 'elevated' ? 'bg-field-clear-elevated' : 'bg-field-clear'"
        aria-label="Очистить"
        @mousedown.prevent
        @click="model = ''"
      >
        <Icon name="close" :size="8" />
      </button>
    </div>

    <!--
      Строка сообщения об ошибке. В спеке она стоит под полем и подписана
      «text about error here»; внешней подписи и подсказки в спеке нет.
    -->
    <p
      v-if="props.invalid && props.errorText"
      data-slot="field-error"
      class="mt-1 text-xs font-medium text-field-error-foreground"
    >
      {{ props.errorText }}
    </p>
  </div>
</template>
