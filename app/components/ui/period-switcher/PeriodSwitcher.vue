<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { Indicator } from '../indicator'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { SelectContent, SelectGroup } from '../select'
import PeriodSwitcherItem from './PeriodSwitcherItem.vue'
import { PERIOD_STATUS_LABEL, PERIOD_TONE, periodGroups, periodTerm, type PeriodSwitcherPeriod } from '.'

/**
 * Переключатель тарифного периода — карточка 3 `docs/tariffs.md`, разбор и таблица «кит | макет» — `index.ts`.
 * Триггер — Figma `30957:7855` (4 варианта), список — `31089:12090`.
 */
/** Корень — безрендерный `Popover`: атрибуты страницы ложатся на триггер (ловушка «Безрендерный корень» `CLAUDE.md`). */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** Периоды в любом порядке: группы и порядок компонент строит сам. */
  periods: PeriodSwitcherPeriod[]
  /** Подпись действия в конце списка; пустая — действия нет. */
  planLabel?: string
}>(), { planLabel: 'Запланировать изменение цен' })

/** Выбранный период — `id`. */
const model = defineModel<string>({ required: true })
/** Список открыт. */
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ plan: [] }>()

const current = computed(() => props.periods.find(p => p.id === model.value) ?? props.periods[0])
const groups = computed(() => periodGroups(props.periods))

function pick(id: string) {
  model.value = id
  open.value = false
}
/** Фокус при открытии — на выбранном пункте: Tab и Enter продолжают от него, кольцо не встаёт на чужой период. */
function focusSelected(e: Event) {
  e.preventDefault()
  nextTick(() => document.querySelector<HTMLElement>('[data-period-list] [aria-current=true]')?.focus())
}
function plan() {
  open.value = false
  emit('plan')
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        v-bind="$attrs"
        data-slot="period-switcher"
        :data-period-status="current?.status"
        class="inline-flex h-7 shrink-0 items-center gap-2 rounded-xs bg-accent px-3 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <template v-if="current">
          <Indicator :variant="PERIOD_TONE[current.status]" size="sm" />
          <span data-slot="period-switcher-status">{{ PERIOD_STATUS_LABEL[current.status] }}</span>
          <span data-slot="period-switcher-term">{{ periodTerm(current) }}</span>
        </template>
        <Icon name="chevron-down" :size="16" />
      </button>
    </PopoverTrigger>

    <PopoverContent as-child align="start" :side-offset="8" :width="280" @open-auto-focus="focusSelected">
      <SelectContent :width="280" max-height="none" data-period-list>
        <SelectGroup v-for="(g, k) in groups" :key="k">
          <button
            v-for="p in g"
            :key="p.id"
            type="button"
            class="block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            :aria-current="p.id === model ? 'true' : undefined"
            :data-period-option="p.id"
            @click="pick(p.id)"
          >
            <PeriodSwitcherItem :period="p" :selected="p.id === model" />
          </button>
        </SelectGroup>
        <SelectGroup v-if="props.planLabel">
          <div class="flex h-11 items-center whitespace-nowrap px-4">
            <ButtonAction strong data-period-plan @click="plan">
              <template #icon>
                <Icon name="add" :size="16" />
              </template>
              {{ props.planLabel }}
            </ButtonAction>
          </div>
        </SelectGroup>
      </SelectContent>
    </PopoverContent>
  </Popover>
</template>
