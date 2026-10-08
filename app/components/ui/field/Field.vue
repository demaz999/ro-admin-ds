<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» нет ни у мастера `720:11753`, ни у Атома.
  См. docs/design-debt.md, «Ось readonly», и `index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import type { FieldLabelVariants, FieldVariants } from '.'
import { computed } from 'vue'
import { fieldLabelVariants, fieldVariants, provideReadonly } from '.'

/**
 * Полевая обвязка — мастер `input` `720:11753` кита 1.
 * Надстройка над атомовским ядром: подпись, подсказка, счётчик. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Подпись поля. Гейт `Show lable` мастера. */
  label?: string
  /** Ось `label` мастера: над полем либо слева от него. */
  orientation?: NonNullable<FieldVariants['orientation']>
  /** Подсказка под полем слева. Гейт `left_hint`. */
  hint?: string
  /** Счётчик символов под полем справа. Гейт `right_hint`. */
  counter?: string
  /** Ошибка: подсказка и счётчик краснеют. У Атома ошибка живёт в самом поле. */
  invalid?: boolean
  disabled?: boolean
  /**
   * Высота контрола внутри — нужна только раскладке `left`, чтобы подпись встала
   * по центру поля, а не по центру всего блока со строкой подсказки.
   * Атомовские поля 40; большой размер 64.
   */
  controlHeight?: number
  /**
   * Ширина подписи в раскладке `left`: `content` — по содержимому (мастер), `form` — колонка
   * строки формы 170, подпись переносится. Такт 36, решение владельца 2026-09-23.
   */
  labelWidth?: NonNullable<FieldLabelVariants['labelWidth']>
  /** Обязательное поле: « *» `--destructive` после подписи. Такт 36; прецедент `StepRow`. */
  required?: boolean
  /** Только чтение: ось уходит вложенному контролу через контекст. Такт 68; разбор — `index.ts`, «Ось readonly». */
  readonly?: boolean
  /**
   * Тон подсказки — такт 78: `warning` — `--warning-strong`, предупреждение о том, что настройка сейчас не действует
   * (макет страницы тарификации `31767:8639`). Ошибка и выключенность сильнее тона.
   */
  hintTone?: 'default' | 'warning'
}>(), {
  label: '',
  orientation: 'top',
  hint: '',
  counter: '',
  invalid: false,
  disabled: false,
  controlHeight: 40,
  labelWidth: 'content',
  required: false,
  readonly: false,
  hintTone: 'default',
})

/** Контекст оси `readonly` для контрола внутри: `useReadonly` в каждом из десяти контролов. */
const readonly = provideReadonly(() => props.readonly)

/**
 * Состояние вывешивается на корень: ошибка и выключенность красят подпись,
 * подсказку и счётчик — узлы за пределами контрола, до которых его собственные
 * `:disabled` и `:invalid` не дотягиваются.
 */
const state = computed(() => {
  if (props.disabled) return 'disabled'
  if (props.invalid) return 'error'
  return undefined
})

/** Строка подсказки рисуется, только если есть хотя бы одна из двух её частей. */
const hasHintRow = computed(() => Boolean(props.hint || props.counter))

/** Тон подсказки — такт 78; ошибка и выключенность перекрашивают её через `group-data` поверх тона. */
const hintClass = computed(() => [
  'min-w-0 flex-1 text-xs group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled',
  props.hintTone === 'warning' ? 'text-warning-strong' : 'text-muted-foreground',
])
</script>

<template>
  <!--
    Раскладка `split` — такт 78 (плитки страницы тарификации, макет `31767:8590`, `31649:3835`): подпись слева занимает
    свободную ширину и переносится, контрол прижат к правому краю, подсказка — строкой во всю ширину под ними и
    переносится; в блоке выше содержимого подсказка прижата к низу. Подпись стоит по центру поля: строка выровнена по
    низу, высота подписи — не меньше высоты поля (подписи над полями пары не тянут её вверх).
  -->
  <div
    v-if="props.orientation === 'split'"
    data-slot="field-wrapper"
    :data-state="state"
    :data-readonly="readonly && !props.disabled ? '' : undefined"
    :class="fieldVariants({ orientation: props.orientation })"
  >
    <div class="flex items-end gap-4">
      <label
        v-if="props.label"
        :class="fieldLabelVariants({ orientation: props.orientation })"
        :style="{ minHeight: `${props.controlHeight}px` }"
      >
        <span>{{ props.label }}<span v-if="props.required" class="text-destructive"> *</span></span>
      </label>
      <div class="flex min-w-0 shrink-0 flex-col">
        <slot />
      </div>
    </div>
    <div v-if="hasHintRow" class="mt-auto flex min-h-4 items-start gap-2">
      <span v-if="props.hint" data-slot="field-hint" :data-tone="props.hintTone" :class="hintClass">{{ props.hint }}</span>
      <span
        v-if="props.counter"
        data-slot="field-counter"
        class="ml-auto shrink-0 text-xs font-bold text-muted-foreground group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled"
      >
        {{ props.counter }}
      </span>
    </div>
  </div>

  <div
    v-else
    data-slot="field-wrapper"
    :data-state="state"
    :data-readonly="readonly && !props.disabled ? '' : undefined"
    :class="fieldVariants({ orientation: props.orientation })"
  >
    <!--
      Слот `help` — такт 89: значок у подписи — «?» с превью в приложении (`HelpPreview`), через 8 справа от подписи, у раскладки
      `top`. Кнопка — вне `label`: нажатие по ней не уводит фокус в контрол. Без слота разметка прежняя.
    -->
    <div v-if="props.label && $slots.help && props.orientation === 'top'" data-slot="field-label-row" class="flex items-start gap-2">
      <label :class="fieldLabelVariants({ orientation: props.orientation, labelWidth: 'content' })">
        <span>{{ props.label }}<span v-if="props.required" class="text-destructive"> *</span></span>
      </label>
      <slot name="help" />
    </div>
    <label
      v-else-if="props.label"
      :class="fieldLabelVariants({ orientation: props.orientation, labelWidth: props.orientation === 'left' ? props.labelWidth : 'content' })"
      :style="props.orientation === 'left' ? { height: `${props.controlHeight}px` } : undefined"
    >
      <!-- Одна строчная обёртка: знак обязательности идёт за последним словом, и при переносе тоже. -->
      <span>{{ props.label }}<span v-if="props.required" class="text-destructive"> *</span></span>
    </label>

    <!-- Зазор 4 между контролом и строкой подсказки — из мастера. -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <slot />

      <!-- Подсказка тянется, счётчик прижат вправо. Высота строки 16. -->
      <div v-if="hasHintRow" class="flex h-4 items-center gap-2">
        <span
          v-if="props.hint"
          data-slot="field-hint"
          :data-tone="props.hintTone === 'default' ? undefined : props.hintTone"
          :class="hintClass"
        >
          {{ props.hint }}
        </span>
        <span
          v-if="props.counter"
          data-slot="field-counter"
          class="ml-auto shrink-0 text-xs font-bold text-muted-foreground group-data-[state=error]/field:text-destructive group-data-[state=disabled]/field:text-foreground-disabled"
        >
          {{ props.counter }}
        </span>
      </div>
    </div>
  </div>
</template>
