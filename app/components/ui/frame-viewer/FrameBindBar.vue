<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '../button'
import { Icon } from '../icon'
import { stepCounterVariants } from '../step-row'
import { cn } from '@/lib/utils'
import type { FrameBindState, FrameSuggestion } from '.'

/**
 * Нижняя плашка полноэкранного просмотра (спека VA-9265 §11.2–11.3) — такт 34. Разбор и
 * таблица «кит | прототип» — в `index.ts`.
 *
 * Плашка показывает состояние кадра пропами и сообщает намерения событиями. Переход к
 * следующему кадру через 820 мс, клавиши 1–N, Enter, Del — логика страницы (§11.3, §16).
 */
const props = withDefaults(defineProps<{
  state?: FrameBindState
  /** Шаг, в котором лежит кадр. */
  stepName?: string
  /** Объект или этап этого шага. */
  ownerName?: string
  /** N для «или нажмите 1–N»; `null` — текущего объекта нет, подсказки нет (решение 3, такт 34). */
  keys?: number | null
  /** Кадр отклонён проверяющим — «Отклонён проверяющим · …» у `locked`. */
  rejected?: boolean
  /** Причина защиты — тексты `frame.*` спеки §18 без хвоста: «Кадр в проверенном шаге». */
  reason?: string
  /** Результат «Подобрать шаг» — у `free` (§11.2). */
  suggestion?: FrameSuggestion | null
  /** Смена значения — вспышка «Распределено» 820 мс, кнопки выключены (§11.3). */
  flash?: number | null
  class?: string
}>(), {
  state: 'free',
  stepName: '',
  ownerName: '',
  keys: null,
  rejected: false,
  reason: '',
  suggestion: null,
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

const icon = computed(() => {
  if (props.suggestion) return 'auto-fix'
  if (props.state === 'locked') return 'lock'
  if (props.state === 'assigned') return 'check'
  return 'info'
})

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
        : 'border-t border-dashed border-border-soft bg-muted text-foreground-secondary',
      flashing ? 'ring-2 ring-success' : '',
      props.class,
    )"
  >
    <Icon :name="icon" :size="16" class="shrink-0" />

    <span
      v-if="flashing"
      data-slot="frame-bind-flash"
      :class="stepCounterVariants({ tone: 'success', surface: 'card' })"
    >Распределено</span>

    <!-- Текст состояния. -->
    <span data-slot="frame-bind-text" class="min-w-0 flex-1">
      <template v-if="props.suggestion?.kind === 'step'">
        Предложение: <b class="font-bold">{{ props.suggestion.stepName }}</b> · {{ props.suggestion.ownerName }}{{ blockedText }}
      </template>
      <template v-else-if="props.suggestion?.kind === 'create'">
        Похоже на новый объект: <b class="font-bold">{{ props.suggestion.title }}</b><template v-if="props.suggestion.inv"> · инв. {{ props.suggestion.inv }}</template>
      </template>
      <template v-else-if="bound">
        <template v-if="props.rejected">Отклонён проверяющим · </template><b class="font-bold">{{ props.stepName }}</b> · {{ props.ownerName }}
      </template>
      <template v-else>
        Кадр не распределён — выберите шаг справа<template v-if="props.keys"> или нажмите 1–{{ props.keys }}</template>
      </template>
    </span>

    <!-- Действия. Во вспышке выключены (§11.3). -->
    <div data-slot="frame-bind-actions" class="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <template v-if="props.suggestion?.kind === 'step'">
        <Button v-if="!props.suggestion.blocked" variant="secondary" size="sm" :disabled="flashing" @click="emit('accept')">
          Принять
          <span data-slot="frame-bind-key" class="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-xs bg-card px-1 text-3xs font-bold text-secondary-foreground">Enter</span>
        </Button>
        <Button variant="secondary" size="sm" :disabled="flashing" @click="emit('dismiss')">
          Не то
        </Button>
      </template>
      <template v-else-if="props.suggestion?.kind === 'create'">
        <Button variant="secondary" size="sm" :disabled="flashing" @click="emit('create')">
          Создать «{{ props.suggestion.stageTitle }}»
        </Button>
        <Button variant="secondary" size="sm" :disabled="flashing" @click="emit('dismiss')">
          Не то
        </Button>
      </template>
      <template v-else-if="bound">
        <Button variant="secondary" size="sm" :disabled="flashing" @click="emit('locate')">
          Показать в структуре
        </Button>
        <Button v-if="props.state === 'assigned'" variant="secondary" size="sm" :disabled="flashing" @click="emit('unbind')">
          Открепить
        </Button>
        <span v-else data-slot="frame-bind-reason" class="max-w-60 text-right">{{ props.reason }} — изменить нельзя</span>
      </template>
      <Button v-else variant="secondary" size="sm" :disabled="flashing" @click="emit('suggest')">
        Подобрать шаг
      </Button>
    </div>
  </div>
</template>
