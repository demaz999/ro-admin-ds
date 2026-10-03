<script setup lang="ts">
import type { InputVariants } from '../input'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { useReadonly } from '../field'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Input } from '../input'

/**
 * Пара цен «клиент / не клиент» с замком связи — такт 78, ворота оркестратора 2026-10-04 (`docs/tariffs.md`, раздел 8,
 * карточка 1). Разбор и провенанс — `index.ts`.
 *
 * Пример: `<PricePair v-model:client="p.client" v-model:non-client="p.nonClient" v-model:linked="p.linked" />`.
 */
const props = withDefaults(defineProps<{
  /** Подписи «Клиент», «Не клиент» над полями; без них подписи остаются только для чтения с экрана. */
  labels?: boolean
  clientLabel?: string
  nonClientLabel?: string
  /** Поля делят ширину строки поровну; без пропа — по 160 (`--container-price-input`). */
  stretch?: boolean
  /** Вид полей — ось `variant` у `Input`: `elevated` — белое поле поверх тонированной плитки. */
  variant?: NonNullable<InputVariants['variant']>
  /** Единица в полях. */
  unit?: string
  disabled?: boolean
  /** Только чтение — своё либо от `Field readonly`: значения видны, замок не переключается. */
  readonly?: boolean
  class?: string
}>(), {
  labels: true,
  clientLabel: 'Клиент',
  nonClientLabel: 'Не клиент',
  stretch: false,
  variant: 'filled',
  unit: '₽',
  disabled: false,
  readonly: false,
  class: undefined,
})

/** Цена клиента и не клиента: целые неотрицательные ₽, `null` — не задано (поле пустое, ноль — значение). */
const client = defineModel<number | null>('client', { default: null })
const nonClient = defineModel<number | null>('nonClient', { default: null })
/** Замок: связано — «Не клиент» повторяет «Клиент» и выключено. */
const linked = defineModel<boolean>('linked', { default: true })

const ro = useReadonly(() => props.readonly, () => props.disabled)

const text = (n: number | null) => (n == null ? '' : String(n))
const num = (s: string) => (s === '' ? null : Number(s))

const clientText = computed({
  get: () => text(client.value),
  set: (v: string) => {
    client.value = num(v)
    if (linked.value) nonClient.value = client.value
  },
})
const nonClientText = computed({
  get: () => text(linked.value ? client.value : nonClient.value),
  set: (v: string) => { if (!linked.value) nonClient.value = num(v) },
})

/** Связать — «Не клиент» принимает значение «Клиент»; развязать — значение остаётся прежним и правится отдельно. */
function toggle() {
  if (ro.value || props.disabled) return
  linked.value = !linked.value
  if (linked.value) nonClient.value = client.value
}

const column = computed(() => (props.stretch ? 'min-w-0 flex-1' : 'w-price-input shrink-0'))
const caption = computed(() => cn(
  'text-2xs',
  props.labels ? '' : 'sr-only',
  props.disabled ? 'text-foreground-disabled' : 'text-muted-foreground',
))
</script>

<template>
  <div
    data-slot="price-pair"
    role="group"
    :data-linked="linked ? '' : undefined"
    :data-disabled="props.disabled ? '' : undefined"
    :data-readonly="ro ? '' : undefined"
    :class="cn('items-end', props.stretch ? 'flex w-full' : 'inline-flex', props.class)"
  >
    <!-- Подпись и поле — одна метка: подпись называет поле для чтения с экрана, нажатие на неё ставит фокус в поле. -->
    <label data-slot="price-pair-client" :class="cn('flex flex-col gap-1', column)">
      <span data-slot="price-pair-label" :class="caption">{{ props.clientLabel }}</span>
      <Input
        v-model="clientText"
        numeric
        :unit="props.unit"
        placeholder=""
        :show-icon="false"
        :variant="props.variant"
        :disabled="props.disabled"
        :readonly="ro"
      />
    </label>

    <!-- Перемычка 24 на высоте поля — Figma `31649:3857`: замок связи. -->
    <span data-slot="price-pair-lock" class="flex h-10 w-6 shrink-0 items-center justify-center">
      <span v-if="ro" class="flex size-6 items-center justify-center text-foreground-secondary" :aria-label="linked ? 'Цены связаны' : 'Цены не связаны'">
        <Icon name="link" :size="16" />
      </span>
      <IconButton
        v-else
        data-pair-lock
        size="sm"
        :variant="linked ? 'secondary' : 'service'"
        :disabled="props.disabled"
        :label="linked ? 'Развязать цены' : 'Связать цены'"
        :aria-pressed="linked ? 'true' : 'false'"
        @click="toggle"
      >
        <Icon name="link" :size="16" />
      </IconButton>
    </span>

    <label data-slot="price-pair-non-client" :class="cn('flex flex-col gap-1', column)">
      <span data-slot="price-pair-label" :class="caption">{{ props.nonClientLabel }}</span>
      <Input
        v-model="nonClientText"
        numeric
        :unit="props.unit"
        placeholder=""
        :show-icon="false"
        :variant="props.variant"
        :disabled="props.disabled || (linked && !ro)"
        :readonly="ro"
      />
    </label>
  </div>
</template>
