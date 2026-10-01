<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ListboxItem } from 'reka-ui'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { SelectItem } from '../select'
import { stepCounterText, stepFill, stepKindText, stepNeedText } from '../step-row'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { cn } from '@/lib/utils'
import type { AssignBound, AssignOptionType } from '.'

/**
 * Пункт назначения — строка списка «Назначить на шаг» (§10.3) и списка шагов в
 * полноэкранном просмотре (§11.1–11.2). Разбор и таблица «кит | прототип» — в `index.ts`.
 *
 * Три вида пункта (`type`): шаг, новый повтор («Новый объект», только просмотр; до такта 56 — «Создать «<этап>»») и
 * другой объект («сделать текущим»). Выбор — событие `select`, открепление — `unbind`;
 * что из этого следует, решает страница.
 */
const props = withDefaults(defineProps<{
  /** Значение пункта в списке — уникально в пределах `AssignList`. */
  value: string
  type?: AssignOptionType
  /** Шаг — название шага; новый повтор — название этапа; объект — имя объекта. */
  name: string
  /** Шаг: «Фото» / «Видео» в требовании. */
  kind?: 'photo' | 'video'
  min?: number
  max?: number | null
  /** Кадров в шаге без отклонённых (§4.2). */
  count?: number
  /** Шаг проверен и закрыт (§5.2). */
  frozen?: boolean
  /**
   * Шаг не принимает кадр или выделение — причина, например «Шаг принимает только фото» (такт 55, решение владельца
   * 2026-10-01). Пункт — в виде выключенного (`SelectItem muted`), причина — в подсказке; нажатие — `refuse('kind')`.
   */
  reason?: string
  /** Оснастка приёмки: подсказка причины открыта сразу. В продукт не идёт. */
  reasonOpen?: boolean
  /** Над пунктом тянут кадр, и шаг его принимает (такт 56): вид цели приёма, как у строки шага. */
  dropTarget?: boolean
  /** Кадр просмотра уже лежит в этом шаге: `here` — можно открепить, `locked` — нельзя. */
  bound?: AssignBound
  /** Объект: число кадров справа; не передано — счёта нет (так в поповере). */
  frames?: number | null
  /** Оснастка приёмки: вид наведения без курсора. В продукт не идёт. */
  demoHover?: boolean
  /**
   * Смена значения — вспышка пункта 1.5 с (`--duration-flash`), как у строки шага: «Показать в структуре» внутри
   * просмотра находит шаг в его списке (такт 52).
   */
  flash?: number | null
  class?: string
}>(), {
  type: 'step',
  kind: 'photo',
  min: 0,
  max: null,
  count: 0,
  frozen: false,
  reason: '',
  reasonOpen: undefined,
  dropTarget: false,
  bound: null,
  frames: null,
  demoHover: false,
  flash: null,
})

/**
 * `refuse` — нажат пункт, закрытый для приёма: заморожен (`frozen`), заполнен (`full`), кадр привязан до вас (`locked`)
 * или шаг не принимает такой тип кадра (`kind`, такт 55).
 * Вид пункта — выключенный, отказ с причиной даёт страница текстом §18: прототип `#popList` и `#lbList`, решение чата
 * 2026-09-30, такт 41 (до него пункт был выключен и нажатие не доходило).
 */
const emit = defineEmits<{ select: []; unbind: []; refuse: [reason: 'frozen' | 'full' | 'locked' | 'kind'] }>()

const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
watch(() => props.flash, async (value) => {
  if (value == null) return
  clearTimeout(flashTimer)
  flashing.value = false
  await nextTick()
  flashing.value = true
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-flash')) * 1000 || 1500
  flashTimer = setTimeout(() => { flashing.value = false }, ms)
})
onBeforeUnmount(() => clearTimeout(flashTimer))

const fill = computed(() => stepFill(props.count, props.min, props.max, false))
const isStep = computed(() => props.type === 'step')
/** Приём выключен: заморожен, заполнен или переполнен (§10.3; переполнение — решение 5) либо не тот тип кадра. */
const limit = computed(() => props.frozen || fill.value === 'full' || fill.value === 'over')
const closed = computed(() => isStep.value && !props.bound && (limit.value || !!props.reason))
/** Пункт ничего не делает по выбору: закрыт либо привязан до вас. */
const inert = computed(() => closed.value || props.bound === 'locked')

/** Пункт создания называется «Новый объект» — такт 56, решение владельца 2026-10-01: тип объекта ясен из группы списка. */
const title = computed(() => (props.type === 'create' ? 'Новый объект' : props.name))

/** Подпись второй строкой — тексты прототипа `itemHTML` и §18. */
const subtitle = computed(() => {
  if (props.type === 'create') return 'новый повтор, текущий кадр ляжет в него'
  if (props.type === 'object') return 'сделать текущим'
  if (props.type === 'stage') return ''
  if (props.bound === 'here') return 'кадр привязан сюда'
  if (props.bound === 'locked') return 'привязано до вас — изменить нельзя'
  if (props.frozen) return 'проверен и закрыт — добавить нельзя'
  const full = fill.value === 'full' ? ' · заполнен' : ''
  return `${stepKindText(props.kind)} · ${stepNeedText(props.min, props.max)}${full}`
})

/** Держатель слева: галочка у привязанного, «+» у нового повтора. Номера клавиши нет — цифры сняты тактом 55. */
const lead = computed(() => {
  if (props.bound) return 'check'
  if (props.type === 'create') return 'add'
  return null
})

const counter = computed(() => stepCounterText(props.count, props.min, props.max))

/** Нажатие мимо выбора Reka: выключенный пункт `ListboxItem` события `select` не даёт — отказ ловится кликом. */
function onClick() {
  if (props.bound === 'locked') emit('refuse', 'locked')
  else if (closed.value) emit('refuse', props.frozen ? 'frozen' : limit.value ? 'full' : 'kind')
}

function onSelect(event: Event) {
  if (inert.value) {
    event.preventDefault()
    return
  }
  if (props.bound === 'here') emit('unbind')
  else emit('select')
}
</script>

<template>
  <!--
    `:disabled="false"` у строки — обязателен (такт 55): `ListboxItem as-child` отдаёт ребёнку атрибут `disabled`, строка
    принимала его своим пропом и гасила события (`pointer-events: none`) — нажатие по закрытому пункту не доходило,
    отказа с причиной не было. Выключенность для списка держит `ListboxItem`, вид — ось `muted`.
  -->
  <ListboxItem :value="props.value" :disabled="inert" as-child @select="onSelect">
    <SelectItem
      data-assign-option
      :data-type="props.type"
      :data-bound="props.bound ?? undefined"
      :data-drop-target="(props.dropTarget && !inert) || undefined"
      :data-flash="flashing || undefined"
      :subtitle="subtitle"
      :selected="!!props.bound"
      :tone="props.bound ? 'success' : 'default'"
      :muted="closed"
      :disabled="false"
      :show-icon="!!lead"
      @click="onClick"
      :class="cn(
        'relative cursor-pointer outline-none',
        /*
         * Подсветка с клавиатуры — та же заливка, что у наведения; у выбранного своя. Только при
         * фокусе в списке: Reka помечает первый пункт `data-highlighted` уже при монтировании, и
         * без условия в просмотре горело бы по пункту в каждой группе.
         */
        props.bound ? '' : 'group-focus-within/assign:data-highlighted:bg-list-hover',
        props.bound === 'locked' ? 'cursor-default' : '',
        props.demoHover && !props.bound ? 'bg-list-hover' : '',
        props.dropTarget && !inert ? 'bg-secondary ring-1 ring-stroke-accent ring-inset' : '',
        flashing ? 'animate-step-flash motion-reduce:animate-none' : '',
        props.class,
      )"
    >
      <template #icon>
        <!-- Привязанный — галочка белым на тёмной ступени успеха (прототип `.it.bound .key.ok`), такт 34. -->
        <span v-if="lead === 'check'" data-slot="assign-option-check" class="flex size-4 items-center justify-center rounded-xs bg-success-strong text-primary-foreground">
          <Icon name="check" :size="12" />
        </span>
        <Icon v-else-if="lead === 'add'" name="add" :size="16" />
      </template>
      {{ title }}
      <!--
        Причина выключенного пункта — подсказкой (такт 55). Зона подсказки — слой во всю строку: строка списка остаётся
        корнем пункта, атрибуты и обработчики страницы идут на неё; нажатие по слою всплывает к строке и даёт `refuse`.
        Провайдер подсказок держит `AssignList`.
      -->
      <Tooltip v-if="props.reason && !props.bound" :open="props.reasonOpen">
        <TooltipTrigger as-child>
          <span data-slot="assign-option-reason" class="absolute inset-0" />
        </TooltipTrigger>
        <TooltipContent side="left" class="max-w-80 whitespace-normal">{{ props.reason }}</TooltipContent>
      </Tooltip>
      <template v-if="props.bound === 'here' || props.bound === 'locked' || isStep || props.frames != null" #trailing>
        <ButtonAction
          v-if="props.bound === 'here'"
          size="sm"
          :show-icon="false"
          tabindex="-1"
          @click.stop="emit('unbind')"
        >
          Открепить
        </ButtonAction>
        <Icon v-else-if="props.bound === 'locked'" name="lock" :size="12" class="text-success-strong" />
        <span v-else data-slot="assign-option-count" class="flex items-center gap-1 text-2xs text-muted-foreground tabular-nums">
          {{ isStep ? counter : props.frames }}
        </span>
      </template>
    </SelectItem>
  </ListboxItem>
</template>
