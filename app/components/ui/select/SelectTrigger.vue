<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { selectTriggerVariants, type SelectTriggerVariants } from '.'

/**
 * Триггер селекта — перенос мастера `434:3074` целиком, все 16 вариантов.
 * Это ровно то, что нарисовано в мастере: выпадающая часть там отдельный узел.
 *
 * Компонент презентационный, поведения не несёт: его надевает `Select` через
 * `ComboboxTrigger` с `as-child`. Тогда `data-state` приходит от Reka и шеврон
 * идёт за реальным состоянием списка. В одиночку — например на странице
 * наложения — состояние задаётся пропом `open`.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<SelectTriggerVariants['variant']>
  /** Ось `Active` мастера: меняет только направление шеврона. */
  open?: boolean
  /** Текстовый проп мастера `Select option`. */
  placeholder?: string
  /** Текстовый проп мастера `Option` — выбранное значение. */
  label?: string
  /** Булев проп мастера `Show icon`. */
  showIcon?: boolean
  disabled?: boolean
}>(), {
  variant: 'filled',
  open: false,
  placeholder: 'Select option',
  label: '',
  showIcon: true,
  disabled: false,
})

/** Состояние `filled` мастера — наличие выбранного значения. */
const isFilled = computed(() => props.label.length > 0)
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
        {{ isFilled ? props.label : props.placeholder }}
      </span>
    </span>

    <!--
      Шеврон — обязательная часть мастера, слота под него нет. Направление идёт
      за `data-state`: в одиночку его ставит проп, под `ComboboxTrigger` — Reka.
    -->
    <Icon name="chevron-down" :size="16" class="group-data-[state=open]/field:hidden" />
    <Icon name="chevron-up" :size="16" class="hidden group-data-[state=open]/field:block" />
  </button>
</template>
