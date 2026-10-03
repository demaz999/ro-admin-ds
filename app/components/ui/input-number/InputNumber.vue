<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера `803:9446` и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useReadonly } from '../field'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'

/**
 * Числовой степпер — мастер `InputNumber` `803:9446`, спека `796:8658`.
 *
 * Перенесён в волну 2 решением от 2026-08-12: он **собран из иконочных кнопок**
 * (`ButtonSimple` типа `transparent`, размер `spelino`), поэтому без
 * перенесённого `IconButton` не собирается. Переносить его раньше кнопки значило
 * бы собрать кнопку мимо её мастера.
 *
 * ## Состав
 *
 * `[кнопка 24] 8 [плашка 32×32] 8 [кнопка 24]` — итого 96×32.
 *
 * Плашка **не залита**: у неё только обводка 2px и радиус 6. Не рамка поля и не
 * заливка — именно контур. Число внутри кеглем 16.
 *
 * > Ловушка мастера: дети варианта выходят за его границы — левая кнопка стоит
 * > на `x = -24` относительно фрейма. Визуально это обычный ряд, просто начало
 * > координат фрейма сдвинуто на 24.
 *
 * ## Три состояния мастера — на самом деле два плюс поведение
 *
 * Ось `State`: `default` / `entered` / `disabled`. Разница между первыми двумя
 * не в оформлении контрола, а в **значении**: в `default` число равно нулю и
 * кнопка «минус» приглушена до 0.32, в `entered` значение больше нуля и обе
 * кнопки активны.
 *
 * Поэтому в коде это не проп, а поведение: кнопка уменьшения выключается, когда
 * значение упёрлось в минимум. `disabled` гасит весь узел целиком.
 */
const props = withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** Подписи для вспомогательных технологий: кнопки без текста. */
  decrementLabel?: string
  incrementLabel?: string
  /**
   * Только чтение — своё либо от `Field readonly` (такт 68): кнопок «−» и «+» нет, остаётся плашка значения — фокусируемая,
   * `role="spinbutton"` с `aria-readonly`; число выделяется и копируется. Разбор — `ui/field/index.ts`, «Ось readonly».
   */
  readonly?: boolean
}>(), {
  min: 0,
  max: Number.POSITIVE_INFINITY,
  step: 1,
  disabled: false,
  decrementLabel: 'Уменьшить',
  incrementLabel: 'Увеличить',
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)

const model = defineModel<number>({ default: 0 })

const canDecrement = computed(() => !props.disabled && model.value > props.min)
const canIncrement = computed(() => !props.disabled && model.value < props.max)

function step(direction: 1 | -1) {
  if (ro.value) return
  const next = model.value + direction * props.step
  model.value = Math.min(props.max, Math.max(props.min, next))
}
</script>

<template>
  <div
    data-slot="stepper"
    :data-readonly="ro ? '' : undefined"
    class="inline-flex w-fit items-center gap-2"
    :class="props.disabled ? 'pointer-events-none opacity-[var(--opacity-disabled-strong)]' : ''"
  >
    <IconButton
      v-if="!ro"
      variant="ghost"
      size="sm"
      :disabled="!canDecrement"
      :label="props.decrementLabel"
      @click="step(-1)"
    >
      <Icon name="remove" :size="16" />
    </IconButton>

    <!-- Плашка не залита: только контур 2px и радиус 6. -->
    <span
      data-slot="stepper-value"
      :tabindex="ro ? 0 : undefined"
      :role="ro ? 'spinbutton' : undefined"
      :aria-readonly="ro ? 'true' : undefined"
      :aria-valuenow="ro ? model : undefined"
      :aria-valuemin="ro ? props.min : undefined"
      :aria-valuemax="ro && Number.isFinite(props.max) ? props.max : undefined"
      class="flex size-8 items-center justify-center rounded-sm border-2 border-stroke-neutral text-sm font-medium outline-none"
      :class="ro ? 'text-foreground focus-visible:ring-2 focus-visible:ring-ring' : 'text-field-foreground-hover'"
    >
      {{ model }}
    </span>

    <IconButton
      v-if="!ro"
      variant="ghost"
      size="sm"
      :disabled="!canIncrement"
      :label="props.incrementLabel"
      @click="step(1)"
    >
      <Icon name="add" :size="16" />
    </IconButton>
  </div>
</template>
