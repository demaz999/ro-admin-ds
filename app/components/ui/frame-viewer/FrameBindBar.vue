<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ButtonAction } from '../button-action'
import { Kbd } from '../kbd'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import { stepCounterVariants } from '../step-row'
import { cn } from '@/lib/utils'
import type { FrameBindState, FrameSuggestion } from '.'

/**
 * Нижняя плашка полноэкранного просмотра (спека VA-9265 §11.2–11.3) — такт 34. Разбор и
 * таблица «кит | прототип» — в `index.ts`.
 *
 * Плашка показывает состояние кадра пропами и сообщает намерения событиями. Переход к
 * следующему кадру через 820 мс, Enter, Del — логика страницы (§11.3, §16).
 *
 * Такт 55, решения владельца 2026-10-01: действия — всегда у правого края; пояснение защищённого кадра — в левом
 * блоке, под названием шага; в паре действий главное — `ButtonAction strong`, второстепенное — `variant="muted"`;
 * подсказки «или нажмите 1–N» нет — распределение цифрами снято.
 */
const props = withDefaults(defineProps<{
  state?: FrameBindState
  /** Шаг, в котором лежит кадр. */
  stepName?: string
  /** Объект или этап этого шага. */
  ownerName?: string
  /** Кадр отклонён проверяющим — «Отклонён проверяющим · …» у `locked`. */
  rejected?: boolean
  /** Причина защиты — тексты `frame.*` спеки §18 без хвоста: «Кадр в проверенном шаге». */
  reason?: string
  /** Результат «Подобрать шаг» — у `free` (§11.2). */
  suggestion?: FrameSuggestion | null
  /**
   * Подобрать шаг для кадра нельзя — причина: «Подобрать шаг» выключена, причина — в подсказке на кнопке (такт 52).
   * Доступность считает страница заранее, при показе кадра.
   */
  suggestReason?: string
  /** Оснастка приёмки: подсказка причины открыта сразу. В продукт не идёт. */
  reasonOpen?: boolean
  /** Смена значения — вспышка «Распределено» 820 мс, кнопки выключены (§11.3). */
  flash?: number | null
  class?: string
}>(), {
  state: 'free',
  stepName: '',
  ownerName: '',
  rejected: false,
  reason: '',
  suggestion: null,
  suggestReason: '',
  reasonOpen: undefined,
  flash: null,
})

const emit = defineEmits<{
  /** «Подобрать шаг». */
  suggest: []
  /** «Показать в структуре» (§11.6). */
  locate: []
  unbind: []
  /** «Принять» (Enter) — предложенный шаг. */
  accept: []
  /** «Создать «<этап>»» — предложен новый объект. */
  create: []
  /** «Не то». */
  dismiss: []
}>()

const bound = computed(() => props.state !== 'free')

/** Вспышка — как у `StepRow`: компонент сам держит длительность и сам её снимает. */
const flashing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => props.flash, (value) => {
  if (value == null) return
  clearTimeout(timer)
  flashing.value = true
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-bind-flash')) || 820
  timer = setTimeout(() => { flashing.value = false }, ms)
})
onBeforeUnmount(() => clearTimeout(timer))

const blockedText = computed(() => {
  const s = props.suggestion
  if (s?.kind !== 'step' || !s.blocked) return ''
  return s.blocked === 'frozen' ? ' — шаг проверен и закрыт' : ' — шаг уже заполнен'
})
</script>

<template>
  <div
    data-slot="frame-bind-bar"
    :data-state="props.suggestion ? 'suggest' : props.state"
    :data-flash="flashing || undefined"
    :class="cn(
      'flex min-h-12 items-center gap-3 rounded-b-md px-4 py-2 text-sm',
      bound && !props.suggestion
        ? 'bg-success-surface text-success-strong'
        : 'border-t border-dashed border-border-soft bg-muted text-foreground/[var(--opacity-on-tone)]',
      flashing ? 'ring-2 ring-success' : '',
      props.class,
    )"
  >
    <span
      v-if="flashing"
      data-slot="frame-bind-flash"
      :class="stepCounterVariants({ tone: 'success', surface: 'card' })"
    >Распределено</span>

    <!-- Текст состояния. -->
    <span data-slot="frame-bind-text" class="flex min-w-0 flex-1 flex-col">
      <span>
      <template v-if="props.suggestion?.kind === 'step'">
        <!-- Такт 51, решение владельца 2026-10-01: название предложенного шага — кнопка-ссылка, клик привязывает кадр, как Enter. -->
        Предложение: <button
          v-if="!props.suggestion.blocked"
          type="button"
          data-slot="frame-bind-step"
          class="font-bold text-primary outline-none transition-colors hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          :disabled="flashing"
          @click="emit('accept')"
        >{{ props.suggestion.stepName }}</button><b v-else class="font-bold">{{ props.suggestion.stepName }}</b> · {{ props.suggestion.ownerName }}{{ blockedText }}
        <!-- Такт 52: кнопки «Принять» нет — ссылка на шаг уже привязывает кадр; после неё — подсказка клавиши. -->
        <Kbd v-if="!props.suggestion.blocked" surface="card" class="ml-1">Enter</Kbd>
      </template>
      <template v-else-if="props.suggestion?.kind === 'create'">
        Похоже на новый объект: <b class="font-bold">{{ props.suggestion.title }}</b><template v-if="props.suggestion.inv"> · инв. {{ props.suggestion.inv }}</template>
      </template>
      <template v-else-if="bound">
        <template v-if="props.rejected">Отклонён проверяющим · </template><b class="font-bold">{{ props.stepName }}</b> · {{ props.ownerName }}
      </template>
      <template v-else>
        Кадр не распределён — выберите шаг справа
      </template>
      </span>
      <!-- Пояснение защищённого кадра — под названием шага, второстепенным текстом на тоне (такт 55). -->
      <span
        v-if="bound && !props.suggestion && props.state === 'locked'"
        data-slot="frame-bind-reason"
        class="text-2xs text-foreground/[var(--opacity-on-tone)]"
      >{{ props.reason }} — изменить нельзя</span>
    </span>

    <!-- Действия. Во вспышке выключены (§11.3). -->
    <div data-slot="frame-bind-actions" class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-4">
      <!-- Такт 50, решение владельца 2026-10-01: все кнопки плашки — текстовые без подложки (ButtonAction). -->
      <template v-if="props.suggestion?.kind === 'step'">
        <ButtonAction size="sm" variant="muted" :show-icon="false" :disabled="flashing" @click="emit('dismiss')">
          Не то
        </ButtonAction>
      </template>
      <template v-else-if="props.suggestion?.kind === 'create'">
        <!-- Такт 55: главное действие — цвет бренда, полужирный; второстепенное — приглушённым цветом, обычный вес. -->
        <ButtonAction size="sm" strong :show-icon="false" :disabled="flashing" @click="emit('create')">
          Создать «{{ props.suggestion.stageTitle }}»
        </ButtonAction>
        <ButtonAction size="sm" variant="muted" :show-icon="false" :disabled="flashing" @click="emit('dismiss')">
          Не то
        </ButtonAction>
      </template>
      <template v-else-if="bound">
        <!-- Такт 46, приёмка владельца 2026-10-01 (п. 12): текстовые кнопки без подложки — ButtonAction. -->
        <ButtonAction size="sm" strong :show-icon="false" :disabled="flashing" @click="emit('locate')">
          Показать в структуре
        </ButtonAction>
        <ButtonAction v-if="props.state === 'assigned'" size="sm" variant="muted" :show-icon="false" :disabled="flashing" @click="emit('unbind')">
          Открепить
        </ButtonAction>
      </template>
      <!--
        Подобрать нельзя — кнопка выключена, причина — в подсказке (такт 52). Выключенная кнопка событий не получает,
        поэтому подсказку держит обёртка; она же принимает фокус с клавиатуры.
      -->
      <TooltipProvider v-else-if="props.suggestReason">
        <Tooltip :open="props.reasonOpen">
          <TooltipTrigger as-child>
            <span data-slot="frame-bind-suggest" tabindex="0" :aria-label="props.suggestReason" class="flex outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ButtonAction size="sm" :show-icon="false" disabled>
                Подобрать шаг
              </ButtonAction>
            </span>
          </TooltipTrigger>
          <TooltipContent class="max-w-80 whitespace-normal">{{ props.suggestReason }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ButtonAction v-else size="sm" :show-icon="false" :disabled="flashing" @click="emit('suggest')">
        Подобрать шаг
      </ButtonAction>
    </div>
  </div>
</template>
