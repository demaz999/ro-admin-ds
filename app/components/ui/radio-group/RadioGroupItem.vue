<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера `590:5372` и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { computed, useSlots } from 'vue'
import { RadioGroupItem, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { choiceReadonlyGuard, choiceRowVariants, choiceTitleVariants } from '../checkbox'
import { useReadonly } from '../field'
import { choiceCardVariants } from '.'

/**
 * Пункт группы — мастер `RadioButton` `590:5372`.
 * Контрол круглый: в мастере это эллипс, а не квадрат с радиусом.
 *
 * > **Сознательное отклонение от Атома.** Отмеченное состояние собрано по
 * > традиционной анатомии радио: тонкое кольцо 2px, как у `Checkbox`, плюс
 * > внутренняя брендовая точка. У Атома круг заливается целиком, а точка внутри
 * > белая. Цвета и размер бокса при этом прежние, из темы. Решение Михаила,
 * > запись в `docs/figma-fixes.md`.
 *
 * Вариант `card` — карточка выбора, такт 39 (карточка режима автораспределения VA-9265 §12.1–12.2,
 * прототип `.wmode`): тот же контрол и заголовок в рамке во всю ширину, под заголовком — слоты
 * `description` и `meta`. Разбор — `index.ts`.
 *
 * Слот `panel` у карточки — такт 80: содержимое выбранного режима под карточкой в общей с ней рамке (Figma `32021:6851`).
 * Рисуется только у отмеченной; корнем становится рамка, карточка и её подпись для чтения с экрана прежние.
 */
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  value: string
  subtitle?: string
  disabled?: boolean
  /** Отмеченность приходит от группы; проп нужен только для окраски подписи. */
  checked?: boolean
  /** `row` — строка мастера; `card` — карточка выбора с описанием (такт 39). */
  variant?: 'row' | 'card'
  /**
   * Только чтение — своё, от `RadioGroup readonly` либо от `Field readonly` (такт 68): выбор отказан, фокус и стрелки
   * остаются (`aria-readonly`); бренд заменён нейтральным `--foreground-secondary`.
   */
  readonly?: boolean
  /**
   * Тон выбора — такт 83: `destructive` у необратимого варианта (Figma `31246:7501`): отмеченная карточка
   * `--destructive-surface`, рамка и кольцо `--destructive`, кольцо и точка контрола `--destructive`. Без пропа — бренд.
   */
  tone?: 'default' | 'destructive'
}>(), {
  subtitle: '',
  disabled: false,
  checked: false,
  variant: 'row',
  readonly: false,
  tone: 'default',
})
const danger = computed(() => props.tone === 'destructive' && !ro.value)

const ro = useReadonly(() => props.readonly, () => props.disabled)
const guard = choiceReadonlyGuard(ro)

const forwarded = useForwardProps(computed(() => ({ value: props.value, disabled: props.disabled })))

/** Рамка с телом режима — только у карточки со слотом `panel`; без слота разметка прежняя. */
const slots = useSlots()
const framed = computed(() => props.variant === 'card' && !!slots.panel)
const [DefineChoice, ReuseChoice] = createReusableTemplate()
</script>

<template>
  <DefineChoice>
  <label
    v-bind="framed ? {} : $attrs"
    data-slot="choice"
    :data-variant="props.variant"
    :data-readonly="ro ? '' : undefined"
    :data-tone="props.tone === 'default' ? undefined : props.tone"
    :class="props.variant === 'card' ? cn(choiceCardVariants({ disabled, readonly: ro, tone: props.tone }), framed && 'relative') : choiceRowVariants({ disabled, readonly: ro })"
    @click.capture="guard.onClickCapture"
    @keydown.capture="guard.onKeydownCapture"
  >
    <span class="flex h-5 shrink-0 items-center">
      <RadioGroupItem
        v-bind="forwarded"
        data-slot="choice-control"
        :aria-readonly="ro ? 'true' : undefined"
        class="group/radio flex size-4 items-center justify-center rounded-full border-2 bg-transparent outline-none"
        :class="ro ? 'border-foreground-secondary' : danger ? 'border-primary data-[state=checked]:border-destructive' : 'border-primary'"
      >
        <!--
          Традиционная анатомия: кольцо остаётся тонким и в отмеченном состоянии,
          внутри загорается брендовая точка. У Атома иначе — там круг заливается
          целиком, а точка внутри белая. Сознательное отклонение, решение
          Михаила; запись в docs/figma-fixes.md.
        -->
        <span class="hidden size-2 rounded-full group-data-[state=checked]/radio:block" :class="ro ? 'bg-foreground-secondary' : danger ? 'bg-destructive' : 'bg-primary'" />
      </RadioGroupItem>
    </span>

    <span :class="cn('flex min-w-0 flex-col', props.variant === 'card' ? 'flex-1 gap-0.5' : '')">
      <span data-slot="choice-title" :class="choiceTitleVariants({ checked: props.checked })">
        <slot />
      </span>
      <span
        v-if="props.subtitle"
        data-slot="choice-subtitle"
        class="text-xs font-medium text-field-placeholder"
      >
        {{ props.subtitle }}
      </span>
      <span v-if="$slots.description" data-slot="choice-description" class="text-xs text-foreground-secondary">
        <slot name="description" />
      </span>
      <span v-if="$slots.meta" data-slot="choice-meta" class="text-xs font-medium text-primary">
        <slot name="meta" />
      </span>
    </span>
  </label>
  </DefineChoice>

  <!--
    Рамка карточки с телом — Figma `32021:6851`: тело ниже карточки внутри общей рамки 1 `--border-neutral` с радиусом 8.
    Тело заходит под нижние углы карточки на радиус (`-mt-2`, поле сверху 16 + 8): рамка продолжает её бока. Тело стоит вне
    `label` — его текст не входит в имя радиокнопки, нажатия по полям тела выбор не трогают.
  -->
  <div v-if="framed" v-bind="$attrs" data-slot="choice-frame" :data-open="props.checked ? '' : undefined" class="flex w-full flex-col">
    <ReuseChoice />
    <div
      v-if="props.checked"
      data-slot="choice-panel"
      class="-mt-2 flex flex-col gap-4 rounded-b-md border border-t-0 border-stroke-neutral px-4 pt-6 pb-4"
    >
      <slot name="panel" />
    </div>
  </div>
  <ReuseChoice v-else />
</template>
