<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера `486:4733` и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { computed, useId } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { useReadonly } from '../field'
import { Icon } from '../icon'
import { CAPTION, choiceReadonlyGuard, choiceRowVariants, choiceTitleVariants } from '.'

/**
 * Флажок — мастер `Checkbox` `486:4733`, спека `486:4305`,
 * тёмный набор `521:4687`.
 *
 * Оси: `Checked` × `Partial` × `Disabled` = 6 вариантов, перенесены все.
 *
 * Контрол 16×16 с радиусом 4. В покое — **обводка 2px брендовым и пустая
 * середина**; отмеченный и частичный залиты брендовым, внутри белый глиф 12×12:
 * галочка либо горизонтальная черта.
 *
 * `Partial` — не третье состояние флажка, а самостоятельная ось мастера: в
 * Figma можно поставить `Checked=false, Partial=true`. В коде это привычное
 * `indeterminate`, потому что у Reka оно так и называется.
 */
const props = withDefaults(defineProps<{
  /** Ось `Partial` мастера. */
  indeterminate?: boolean
  subtitle?: string
  disabled?: boolean
  /**
   * Причина выключения — такт 74, решение оркестратора 2026-10-03 (карточка слияния А, `docs/scheme-edit.md`, раздел 8).
   * Действует вместе с `disabled`: строка 13/16 `--muted-foreground` под подписью, полным контрастом — флажок, подпись и
   * пояснение гаснут до 0.48, причина нет. Контрол ссылается на неё `aria-describedby`. Прецедент — `SettingRow reason`
   * и `TabsTrigger reason` (такт 73). Без `disabled` причина не выводится.
   */
  reason?: string
  /**
   * Контрол лежит **поверх изображения**.
   *
   * Невыбранный получает **непрозрачную заливку** `--field-elevated` — ту же
   * роль, которой у Атома залито поле поверх карты, — плюс тень-отрыв
   * `--shadow-on-image`. Выбранный не меняется: заливка `primary` и так
   * непрозрачна.
   *
   * Отдельной подложки под контролом нет: заливка живёт на самом контроле, с
   * его родным радиусом и рамкой. Решение владельца от 2026-08-18, правка 11-б.
   */
  onImage?: boolean
  /**
   * Только чтение — своё либо от `Field readonly` (такт 68): переключение отказано, фокус остаётся (`aria-readonly`);
   * бренд заменён нейтральным `--foreground-secondary`. Разбор — `ui/field/index.ts`, «Ось readonly».
   */
  readonly?: boolean
}>(), {
  indeterminate: false,
  subtitle: '',
  disabled: false,
  reason: '',
  onImage: false,
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)
const guard = choiceReadonlyGuard(ro)

const model = defineModel<boolean>({ default: false })

/** Причина видна у выключенного: строка гасит контрол и подпись по частям, причину оставляет полным контрастом. */
const locked = computed(() => props.disabled && !!props.reason)
const reasonId = useId()
const dim = computed(() => (locked.value ? 'opacity-[var(--opacity-disabled)]' : ''))

/** Заливка появляется и у отмеченного, и у частичного — так в мастере. */
const filled = computed(() => model.value || props.indeterminate)

/**
 * Состояние для Reka. Частичный уходит значением `indeterminate` — контрол получает `aria-checked="mixed"`, а клик из
 * частичного отмечает (такт 49: «Выделить всё» экрана VA-9265 — пусто, часть, все).
 */
const state = computed<boolean | 'indeterminate'>({
  get: () => (props.indeterminate ? 'indeterminate' : model.value),
  set: (value) => { if (!ro.value) model.value = value === true },
})
</script>

<template>
  <label
    data-slot="choice"
    :data-readonly="ro ? '' : undefined"
    :class="[choiceRowVariants({ disabled: disabled && !locked, readonly: ro }), locked ? 'pointer-events-none' : '']"
    @click.capture="guard.onClickCapture"
    @keydown.capture="guard.onKeydownCapture"
  >
    <span class="flex h-5 shrink-0 items-center" :class="dim">
      <CheckboxRoot
        v-model="state"
        :disabled="props.disabled"
        data-slot="choice-control"
        :aria-readonly="ro ? 'true' : undefined"
        :aria-describedby="locked ? reasonId : undefined"
        class="flex size-4 items-center justify-center rounded-xs border-2 text-primary-foreground outline-none transition-colors"
        :class="[
          ro
            ? filled ? 'border-foreground-secondary bg-foreground-secondary' : props.onImage ? 'border-foreground-secondary bg-field-elevated' : 'border-foreground-secondary bg-transparent'
            : filled
              ? 'border-primary bg-primary hover:bg-primary-hover hover:border-primary-hover'
              : props.onImage ? 'border-primary bg-field-elevated hover:border-primary-hover' : 'border-primary bg-transparent hover:border-primary-hover',
          props.onImage ? 'shadow-on-image' : '',
        ]"
        :style="{ transitionDuration: 'var(--duration-hover)' }"
      >
        <CheckboxIndicator force-mount>
          <Icon v-if="props.indeterminate" name="remove" :size="12" />
          <Icon v-else-if="model" name="check" :size="12" />
        </CheckboxIndicator>
      </CheckboxRoot>
    </span>

    <!--
      Блок подписи есть только при подписи. Пустой блок вместе с зазором строки 12 делал флажок без подписи шире
      контрола на 12, и в плашке плитки квадрат стоял на 6 левее центра — такт 48, довесок.
    -->
    <span v-if="$slots.default || props.subtitle || locked" class="flex min-w-0 flex-col">
      <span data-slot="choice-title" :class="[choiceTitleVariants({ checked: filled }), dim]">
        <slot />
      </span>
      <!-- Пояснение — такт 98, решение владельца 2026-10-09: через 4 под подписью, 13/16 regular `--foreground-secondary` — один вид у всего кита (`ui/checkbox/index.ts`, «Пояснение»). -->
      <span
        v-if="props.subtitle"
        data-slot="choice-subtitle"
        :class="[CAPTION, dim]"
      >
        {{ props.subtitle }}
      </span>
      <span v-if="locked" :id="reasonId" data-slot="choice-reason" :class="CAPTION">
        {{ props.reason }}
      </span>
    </span>
  </label>
</template>
