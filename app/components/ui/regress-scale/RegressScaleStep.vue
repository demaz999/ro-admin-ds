<script setup lang="ts">
import type { InputVariants } from '../input'
import type { RegressStep, ScaleForm, ScalePrice } from './rules'
import { computed } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Input } from '../input'
import { PricePair } from '../price-pair'

/**
 * Ступень регресс-шкалы — часть `RegressScale` (такт 78, карточка 2 `docs/tariffs.md`, раздел 8). Разбор — `index.ts`.
 * Строка на тонированной подложке: «От» (только чтение) · «До» · цена (поле или пара) · удаление.
 */
const props = withDefaults(defineProps<{
  step: RegressStep
  /** Номер ступени с 1 — для подписей полей при чтении с экрана. */
  index: number
  form: ScaleForm
  /** Ступень можно удалить — у единственной кнопки нет. */
  removable?: boolean
  /** Ошибка «До»: «Не меньше …». */
  error?: string | null
  variant?: NonNullable<InputVariants['variant']>
  disabled?: boolean
  readonly?: boolean
}>(), { removable: true, error: null, variant: 'elevated', disabled: false, readonly: false })

const emit = defineEmits<{
  'update:to': [to: number | null]
  'update:price': [patch: Partial<ScalePrice>]
  'remove': []
}>()

const toText = computed({
  get: () => (props.step.to == null ? '' : String(props.step.to)),
  set: (v: string) => emit('update:to', v === '' ? null : Number(v)),
})
const priceText = computed({
  get: () => (props.step.price.client == null ? '' : String(props.step.price.client)),
  set: (v: string) => emit('update:price', { client: v === '' ? null : Number(v) }),
})
</script>

<template>
  <div
    data-slot="regress-scale-step"
    :data-step="props.index"
    :data-invalid="props.error ? '' : undefined"
    class="flex items-start gap-6 rounded-xs bg-accent px-2 py-1.5"
  >
    <div class="flex shrink-0 gap-0.5">
      <label class="w-scale-bound" data-slot="regress-scale-from">
        <span class="sr-only">От, ступень {{ props.index }}</span>
        <Input :model-value="String(props.step.from)" numeric unit="шт" placeholder="" :show-icon="false" readonly />
      </label>
      <label class="w-scale-bound" data-slot="regress-scale-to">
        <span class="sr-only">До, ступень {{ props.index }}</span>
        <Input
          v-model="toText"
          numeric
          unit="шт"
          placeholder=""
          :show-icon="false"
          :variant="props.variant"
          :invalid="!!props.error"
          :error-text="props.error ?? ''"
          :disabled="props.disabled"
          :readonly="props.readonly"
        />
      </label>
    </div>

    <label v-if="props.form === 'single'" class="min-w-0 flex-1" data-slot="regress-scale-price">
      <span class="sr-only">Цена, ступень {{ props.index }}</span>
      <Input
        v-model="priceText"
        numeric
        unit="₽"
        placeholder=""
        :show-icon="false"
        :variant="props.variant"
        :disabled="props.disabled"
        :readonly="props.readonly"
      />
    </label>
    <PricePair
      v-else
      class="min-w-0 flex-1"
      stretch
      :labels="false"
      :variant="props.variant"
      :client="props.step.price.client"
      :non-client="props.step.price.nonClient"
      :linked="props.step.price.linked"
      :disabled="props.disabled"
      :readonly="props.readonly"
      @update:client="v => emit('update:price', { client: v })"
      @update:non-client="v => emit('update:price', { nonClient: v })"
      @update:linked="v => emit('update:price', { linked: v })"
    />

    <!-- Ячейка удаления 48 — Figma `30961:27354`: у единственной ступени ячейка пустая, колонки не сдвигаются. -->
    <span class="flex h-10 w-12 shrink-0 items-center justify-center">
      <IconButton
        v-if="props.removable && !props.readonly"
        data-step-remove
        variant="destructive"
        size="sm"
        :disabled="props.disabled"
        :label="`Удалить ступень ${props.index}`"
        @click="emit('remove')"
      >
        <Icon name="delete" :size="16" />
      </IconButton>
    </span>
  </div>
</template>
