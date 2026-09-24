<script setup lang="ts">
import { computed } from 'vue'
import { ListboxItem } from 'reka-ui'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { SelectItem } from '../select'
import { stepCounterText, stepFill, stepKeyClass, stepKindText, stepNeedText } from '../step-row'
import { cn } from '@/lib/utils'
import type { AssignBound, AssignOptionType } from '.'

/**
 * Пункт назначения — строка списка «Назначить на шаг» (§10.3) и списка шагов в
 * полноэкранном просмотре (§11.1–11.2). Разбор и таблица «кит | прототип» — в `index.ts`.
 *
 * Три вида пункта (`type`): шаг, новый повтор («Создать «<этап>»», только просмотр) и
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
   * Номер клавиши 1–8 — только у шагов текущего объекта (§16.3). Передан — держатель
   * слева есть; у замороженного номер снят, держатель остаётся.
   */
  hotkey?: number | null
  /** Кадр просмотра уже лежит в этом шаге: `here` — можно открепить, `locked` — нельзя. */
  bound?: AssignBound
  /** Объект: число кадров справа; не передано — счёта нет (так в поповере). */
  frames?: number | null
  /** Оснастка приёмки: вид наведения без курсора. В продукт не идёт. */
  demoHover?: boolean
  class?: string
}>(), {
  type: 'step',
  kind: 'photo',
  min: 0,
  max: null,
  count: 0,
  frozen: false,
  hotkey: null,
  bound: null,
  frames: null,
  demoHover: false,
})

const emit = defineEmits<{ select: []; unbind: [] }>()

const fill = computed(() => stepFill(props.count, props.min, props.max, false))
const isStep = computed(() => props.type === 'step')
/** Приём выключен: заморожен, заполнен или переполнен (§10.3; переполнение — решение 5). */
const closed = computed(() => isStep.value && !props.bound
  && (props.frozen || fill.value === 'full' || fill.value === 'over'))
/** Пункт ничего не делает по выбору: закрыт либо привязан до вас. */
const inert = computed(() => closed.value || props.bound === 'locked')

const title = computed(() => (props.type === 'create' ? `Создать «${props.name}»` : props.name))

/** Подпись второй строкой — тексты прототипа `itemHTML` и §18. */
const subtitle = computed(() => {
  if (props.type === 'create') return 'новый повтор, текущий кадр ляжет в него'
  if (props.type === 'object') return 'сделать текущим'
  if (props.bound === 'here') return 'кадр привязан сюда'
  if (props.bound === 'locked') return 'привязано до вас — изменить нельзя'
  if (props.frozen) return 'проверен и закрыт — добавить нельзя'
  const full = fill.value === 'full' ? ' · заполнен' : ''
  return `${stepKindText(props.kind)} · ${stepNeedText(props.min, props.max)}${full}`
})

/** Держатель слева: галочка у привязанного, «+» у нового повтора, номер у шагов текущего. */
const lead = computed(() => {
  if (props.bound) return 'check'
  if (props.type === 'create') return 'add'
  if (isStep.value && props.hotkey != null) return props.frozen ? 'blank' : 'key'
  return null
})

const counter = computed(() => stepCounterText(props.count, props.min, props.max))

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
  <ListboxItem :value="props.value" :disabled="inert" as-child @select="onSelect">
    <SelectItem
      data-assign-option
      :data-type="props.type"
      :data-bound="props.bound ?? undefined"
      :subtitle="subtitle"
      :selected="!!props.bound"
      :disabled="closed"
      :show-icon="!!lead"
      :class="cn(
        'cursor-pointer outline-none',
        /*
         * Подсветка с клавиатуры — та же заливка, что у наведения; у выбранного своя. Только при
         * фокусе в списке: Reka помечает первый пункт `data-highlighted` уже при монтировании, и
         * без условия в просмотре горело бы по пункту в каждой группе.
         */
        props.bound ? '' : 'group-focus-within/assign:data-highlighted:bg-list-hover',
        props.bound === 'locked' ? 'cursor-default' : '',
        props.demoHover && !props.bound ? 'bg-list-hover' : '',
        props.class,
      )"
    >
      <template #icon>
        <Icon v-if="lead === 'check' || lead === 'add'" :name="lead" :size="16" />
        <span v-else-if="lead === 'key'" data-slot="assign-option-key" :class="stepKeyClass">{{ props.hotkey }}</span>
        <span v-else class="size-4" aria-hidden="true" />
      </template>
      {{ title }}
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
        <Icon v-else-if="props.bound === 'locked'" name="lock" :size="12" class="text-muted-foreground" />
        <span v-else data-slot="assign-option-count" class="flex items-center gap-1 text-2xs text-muted-foreground tabular-nums">
          <Icon v-if="props.frozen" name="lock" :size="12" />{{ isStep ? counter : props.frames }}
        </span>
      </template>
    </SelectItem>
  </ListboxItem>
</template>
