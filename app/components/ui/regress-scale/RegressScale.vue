<script setup lang="ts">
import type { InputVariants } from '../input'
import type { RegressStep, ScaleForm, ScalePrice } from './rules'
import { computed, nextTick } from 'vue'
import { cn } from '@/lib/utils'
import { useReadonly } from '../field'
import { Tabs, TabsList, TabsTrigger } from '../tabs'
import RegressScaleStep from './RegressScaleStep.vue'
import { changeForm, emptyPrice, removeStep, setStepPrice, setStepTo, stepErrors } from './rules'

/**
 * Регресс-шкала — такт 78, ворота оркестратора 2026-10-04 (`docs/tariffs.md`, раздел 8, карточка 2). Разбор — `index.ts`.
 * Правила ступеней §5 — внутри (`rules.ts`): потребитель хранит итоговые ступени и форму.
 *
 * Пример: `<RegressScale v-model:steps="scale.steps" v-model:form="scale.form" @remove-step="undoToast" />`.
 */
const props = withDefaults(defineProps<{
  /** Подпись перед переключателем формы; пустая — подписи нет. */
  label?: string
  /** Подсказка под ступенями. */
  hint?: string
  /** Вид полей — ось `variant` у `Input`: `elevated` — белые поля на тонированной ступени. */
  variant?: NonNullable<InputVariants['variant']>
  disabled?: boolean
  /** Только чтение — своё либо от `Field readonly`: значения видны, правки, смены формы и удаления нет. */
  readonly?: boolean
  class?: string
}>(), {
  label: 'Регресс-шкала',
  hint: 'Если значение «До» может быть любым — оставьте поле пустым',
  variant: 'elevated',
  disabled: false,
  readonly: false,
  class: undefined,
})

const steps = defineModel<RegressStep[]>('steps', { default: () => [{ from: 1, to: null, price: emptyPrice() }] })
const form = defineModel<ScaleForm>('form', { default: 'single' })

const emit = defineEmits<{
  /** Ступень удалена: номер и ступени до удаления — потребитель показывает уведомление с «Отменить». */
  'remove-step': [payload: { index: number, previous: RegressStep[] }]
}>()

const ro = useReadonly(() => props.readonly, () => props.disabled)

/**
 * Рабочая копия ступеней в пределах такта: значение `v-model` у управляемого компонента меняется только после
 * перерисовки потребителя, а пара цен шлёт два события подряд («Клиент», затем «Не клиент» при связи) — второе читало бы
 * ступени без первого.
 */
let work: RegressStep[] | null = null
const current = () => work ?? steps.value
function commit(next: RegressStep[]) {
  if (!work) nextTick(() => { work = null })
  work = next
  steps.value = next
}

const errors = computed(() => stepErrors(steps.value))

function onTo(k: number, to: number | null) {
  commit(setStepTo(current(), k, to))
}
function onPrice(k: number, patch: Partial<ScalePrice>) {
  const price = { ...current()[k]!.price, ...patch }
  /* Замок: связано — «Не клиент» повторяет «Клиент» (§1). */
  if (price.linked) price.nonClient = price.client
  commit(setStepPrice(current(), k, price, form.value))
}
function onRemove(k: number) {
  const previous = current().map(s => ({ ...s, price: { ...s.price } }))
  commit(removeStep(previous, k))
  emit('remove-step', { index: k, previous })
}

const formModel = computed<string>({
  get: () => form.value,
  set: (v: string) => {
    if (ro.value || props.disabled || v === form.value) return
    commit(changeForm(current()))
    form.value = v as ScaleForm
  },
})
</script>

<template>
  <div
    data-slot="regress-scale"
    :data-form="form"
    :data-disabled="props.disabled ? '' : undefined"
    :data-readonly="ro ? '' : undefined"
    :class="cn('flex min-w-0 flex-col gap-2', props.class)"
  >
    <!-- Строка формы — Figma `31488:5027`: подпись 15/20 и сегмент-контрол «Единая цена / По ролям». -->
    <div class="flex items-center gap-3">
      <span v-if="props.label" data-slot="regress-scale-label" class="text-sm text-foreground">{{ props.label }}</span>
      <Tabs v-model="formModel">
        <TabsList variant="segmented" :aria-label="props.label || 'Форма шкалы'">
          <TabsTrigger value="single" variant="segmented" :disabled="props.disabled || ro" data-scale-form="single">
            Единая цена
          </TabsTrigger>
          <TabsTrigger value="roles" variant="segmented" :disabled="props.disabled || ro" data-scale-form="roles">
            По ролям
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <div class="flex flex-col gap-1">
      <!-- Заголовки колонок — Figma `30961:27343`: 12/16 `--muted-foreground`, ширины как у полей ступени. -->
      <div data-slot="regress-scale-head" aria-hidden="true" class="flex h-8 items-center gap-6 px-2 text-2xs text-muted-foreground">
        <span class="flex shrink-0 gap-0.5">
          <span class="w-scale-bound pl-4">От</span>
          <span class="w-scale-bound pl-4">До</span>
        </span>
        <span v-if="form === 'single'" class="min-w-0 flex-1 pl-4">Цена</span>
        <span v-else class="flex min-w-0 flex-1">
          <span class="min-w-0 flex-1 pl-4">Клиент</span>
          <span class="w-6 shrink-0" />
          <span class="min-w-0 flex-1 pl-4">Не клиент</span>
        </span>
        <span class="w-12 shrink-0" />
      </div>

      <RegressScaleStep
        v-for="(s, k) in steps"
        :key="k"
        :step="s"
        :index="k + 1"
        :form="form"
        :removable="steps.length > 1"
        :error="errors[k]"
        :variant="props.variant"
        :disabled="props.disabled"
        :readonly="ro"
        @update:to="v => onTo(k, v)"
        @update:price="p => onPrice(k, p)"
        @remove="onRemove(k)"
      />
    </div>

    <p v-if="props.hint" data-slot="regress-scale-hint" class="text-xs text-muted-foreground">
      {{ props.hint }}
    </p>
  </div>
</template>
