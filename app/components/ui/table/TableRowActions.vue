<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Popover } from '../popover'
import { SelectGroup, SelectItem } from '../select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import TableRowAction from './TableRowAction.vue'
import { TABLE_ROW_ACTION_ORDER, type TableRowActionItem } from '.'

/**
 * Колонка «Действия» строки — всегда не больше двух слотов. Решения владельца:
 * такт 20 (удаление не голой иконкой, порядок кебаба), такт 21 (модель двух слотов).
 * Мастера нет — композиция `TableRowAction`, `IconButton service`, `Tooltip` и
 * попапа «ещё» с «Моих осмотров» (`Popover` + `SelectItem`).
 *
 * ## Модель двух слотов
 *
 * | Вторичных действий | Раскладка |
 * |---|---|
 * | нет | `TableRowAction`: карандаш и подпись «Редактировать» по наведению на строку |
 * | одно, не удаление | [иконка действия] [карандаш], у обеих тултип с названием |
 * | два и больше — или есть удаление | [кебаб] [карандаш], у карандаша тултип |
 *
 * Правый слот — карандаш, всегда. Слот 24×24 (хит-зона `IconButton size="sm"`),
 * зазор 8, всё прижато вправо — поэтому у карандаша одна координата X на всю колонку.
 * Удаление голой иконкой не встаёт никогда: оно уводит в кебаб все вторичные, даже
 * если оно единственное.
 *
 * Пороги «1–3 инлайном, 4+ кебаб», очередь инлайн-слотов и резерв под три иконки
 * такта 20 сняты. Ширину колонки резервирует страница: без вторичных — слот плюс
 * подпись, со вторичными — два слота.
 *
 * ## Клик по действию не уходит в строку
 *
 * Строка — цель клика (открыть на редактирование), поэтому клики внутри колонки
 * останавливаются здесь, а не на странице.
 */
const props = withDefaults(defineProps<{
  /** Вторичные действия в любом порядке — порядок кебаба задаёт компонент. */
  actions?: TableRowActionItem[]
  /** Подпись и имя карандаша. */
  editLabel?: string
  /** Редактирование недоступно по правам. */
  editDisabled?: boolean
}>(), {
  actions: () => [],
  editLabel: 'Редактировать',
  editDisabled: false,
})

const menuOpen = ref(false)

/** Одно вторичное действие, и это не удаление, — встаёт иконкой в левый слот. */
const single = computed(() => {
  const [first] = props.actions
  return props.actions.length === 1 && first && !first.destructive ? first : null
})

const rank = (key: string) => {
  const i = (TABLE_ROW_ACTION_ORDER as readonly string[]).indexOf(key)
  return i < 0 ? TABLE_ROW_ACTION_ORDER.length : i
}
const ordered = computed(() => [...props.actions].sort((a, b) => rank(a.key) - rank(b.key)))
const menuMain = computed(() => ordered.value.filter(a => !a.destructive))
const menuDanger = computed(() => ordered.value.filter(a => a.destructive))
</script>

<template>
  <div data-slot="table-row-actions" class="flex items-center justify-end gap-2" @click.stop>
    <!-- Вторичных нет: один слот, подпись по наведению на строку. -->
    <TableRowAction v-if="!props.actions.length" :disabled="props.editDisabled">
      {{ props.editLabel }}
    </TableRowAction>

    <template v-else>
      <!-- Левый слот — одно вторичное действие иконкой. -->
      <TooltipProvider v-if="single">
        <Tooltip>
          <TooltipTrigger as-child>
            <span data-slot="table-row-actions-slot" class="flex">
              <IconButton variant="service" size="sm" :label="single.label" :disabled="single.disabled">
                <Icon :name="single.icon" :size="16" />
              </IconButton>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ single.label }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- Левый слот — кебаб: открывает попап «ещё», удаление последней группой. -->
      <span v-else data-slot="table-row-actions-slot" class="relative flex">
        <IconButton
          variant="service"
          size="sm"
          label="Ещё"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <Icon name="pending" :size="16" />
        </IconButton>

        <Popover
          v-model:open="menuOpen"
          data-menu="row-actions"
          class="absolute top-7 right-0 z-50 p-1"
        >
          <SelectGroup v-if="menuMain.length">
            <SelectItem
              v-for="a in menuMain"
              :key="a.key"
              :disabled="a.disabled"
              @click="menuOpen = false"
            >
              {{ a.label }}
            </SelectItem>
          </SelectGroup>
          <SelectGroup v-if="menuDanger.length" data-section="danger">
            <SelectItem
              v-for="a in menuDanger"
              :key="a.key"
              :disabled="a.disabled"
              @click="menuOpen = false"
            >
              {{ a.label }}
            </SelectItem>
          </SelectGroup>
        </Popover>
      </span>

      <!-- Правый слот — карандаш, всегда. -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <span data-slot="table-row-actions-slot" class="flex">
              <IconButton variant="service" size="sm" :label="props.editLabel" :disabled="props.editDisabled">
                <Icon name="edit" :size="16" />
              </IconButton>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ props.editLabel }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </template>
  </div>
</template>
