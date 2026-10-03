<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера `590:5372` и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { computed } from 'vue'
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
 */
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
}>(), {
  subtitle: '',
  disabled: false,
  checked: false,
  variant: 'row',
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)
const guard = choiceReadonlyGuard(ro)

const forwarded = useForwardProps(computed(() => ({ value: props.value, disabled: props.disabled })))
</script>

<template>
  <label
    data-slot="choice"
    :data-variant="props.variant"
    :data-readonly="ro ? '' : undefined"
    :class="props.variant === 'card' ? choiceCardVariants({ disabled, readonly: ro }) : choiceRowVariants({ disabled, readonly: ro })"
    @click.capture="guard.onClickCapture"
    @keydown.capture="guard.onKeydownCapture"
  >
    <span class="flex h-5 shrink-0 items-center">
      <RadioGroupItem
        v-bind="forwarded"
        data-slot="choice-control"
        :aria-readonly="ro ? 'true' : undefined"
        class="group/radio flex size-4 items-center justify-center rounded-full border-2 bg-transparent outline-none"
        :class="ro ? 'border-foreground-secondary' : 'border-primary'"
      >
        <!--
          Традиционная анатомия: кольцо остаётся тонким и в отмеченном состоянии,
          внутри загорается брендовая точка. У Атома иначе — там круг заливается
          целиком, а точка внутри белая. Сознательное отклонение, решение
          Михаила; запись в docs/figma-fixes.md.
        -->
        <span class="hidden size-2 rounded-full group-data-[state=checked]/radio:block" :class="ro ? 'bg-foreground-secondary' : 'bg-primary'" />
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
</template>
