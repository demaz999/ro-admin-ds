<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { selectTriggerVariants, type SelectTriggerVariants } from '.'

/**
 * Триггер селекта — перенос мастера `434:3074` целиком, все 16 вариантов.
 *
 * Выпадающая часть **сюда не входит**: у Атома это отдельный мастер
 * `PopOverList` `571:4889` со своей спекой `571:6147`. Он переносится отдельной
 * единицей, вместе с `ListGroup`, `ListItem` и скроллбаром. До этого момента
 * триггер — управляемый контрол: открытость приходит пропом, поведение
 * навесит Reka, когда появится список.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: `filled` — залитый, `elevated` — белый с тенью поверх карты. */
  variant?: NonNullable<SelectTriggerVariants['variant']>
  /** Ось `Active` мастера: единственное, что она меняет, — направление шеврона. */
  open?: boolean
  /** Текстовый проп мастера `Select option` — подпись поля. */
  placeholder?: string
  /** Текстовый проп мастера `Option` — выбранное значение. */
  modelValue?: string
  /** Булев проп мастера `Show icon`. В мастере включён по умолчанию. */
  showIcon?: boolean
  disabled?: boolean
}>(), {
  variant: 'filled',
  open: false,
  placeholder: 'Select option',
  modelValue: '',
  showIcon: true,
  disabled: false,
})

/** Состояние `filled` мастера — наличие выбранного значения. */
const isFilled = computed(() => props.modelValue.length > 0)
</script>

<template>
  <button
    data-slot="field"
    type="button"
    :disabled="props.disabled"
    :data-state="props.open ? 'open' : 'closed'"
    :class="selectTriggerVariants({ variant, disabled })"
  >
    <slot v-if="props.showIcon" name="icon">
      <Icon name="link" :size="16" />
    </slot>

    <!--
      Текстовый блок. В мастере его ширина 192 — это 272 минус паддинги 32,
      минус две иконки по 16, минус два зазора по 8. В коде ширина берётся
      остатком, чтобы поле тянулось за контейнером.
    -->
    <span class="flex min-w-0 flex-1 flex-col items-start text-left" :class="isFilled ? 'h-9' : 'h-5'">
      <span
        v-if="isFilled"
        data-slot="field-label"
        class="h-4 w-full truncate text-xs font-medium text-field-placeholder group-hover/field:text-field-placeholder-hover"
      >
        {{ props.placeholder }}
      </span>
      <span
        data-slot="field-input"
        class="h-5 w-full truncate text-sm font-medium"
        :class="isFilled
          ? 'text-field-foreground group-hover/field:text-field-foreground-hover'
          : 'text-field-placeholder group-hover/field:text-field-placeholder-hover'"
      >
        {{ isFilled ? props.modelValue : props.placeholder }}
      </span>
    </span>

    <!-- Шеврон — обязательная часть мастера, слота под него нет. -->
    <Icon :name="props.open ? 'chevron-up' : 'chevron-down'" :size="16" />
  </button>
</template>
