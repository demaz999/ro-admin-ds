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
 * Колонка «Действия» строки: карандаш и вторичные действия. Решения владельца,
 * такт 20 (D1–D6); мастера нет — композиция `TableRowAction`, `IconButton service`,
 * `Tooltip` и попапа «ещё» с «Моих осмотров» (`Popover` + `SelectItem`).
 *
 * ## Три раскладки по числу действий
 *
 * | Действий у строки | Раскладка |
 * |---|---|
 * | 1 — только карандаш | `TableRowAction`: подпись «Редактировать» по наведению на строку |
 * | 2–3 | тихие иконки в слотах, у каждой тултип с названием; подписи нет |
 * | 4+ или есть удаление | кебаб с вторичными + карандаш снаружи |
 *
 * Удаление голой иконкой не ставится никогда (D5): даже при двух действиях оно уходит
 * в кебаб последней отдельной секцией.
 *
 * ## Слоты, а не поток
 *
 * Каждое действие — слот 24×24 (хит-зона `IconButton size="sm"`), зазор 8, всё
 * прижато вправо. Карандаш всегда крайний справа, вторичные левее в глобальном порядке
 * `TABLE_ROW_ACTION_ORDER`, кебаб левее всех. Недоступное действие стоит в своём
 * слоте выключенным, слот не схлопывается: у каждой иконки одна координата на всю
 * колонку.
 *
 * `slots` — сколько слотов резервирует страница под самую длинную строку. Ширину
 * колонки по-прежнему задаёт таблица; компонент лишь не даёт строке сжаться уже неё.
 *
 * ## Клик по действию не уходит в строку
 *
 * Строка — цель клика (открыть на редактирование), поэтому клики внутри колонки
 * останавливаются здесь, а не на странице.
 */
const props = withDefaults(defineProps<{
  /** Вторичные действия в любом порядке — порядок колонки задаёт компонент. */
  actions?: TableRowActionItem[]
  /** Подпись и имя карандаша. */
  editLabel?: string
  /** Редактирование недоступно по правам. */
  editDisabled?: boolean
  /** Сколько слотов резервирует колонка страницы под самую длинную строку. */
  slots?: 1 | 2 | 3
}>(), {
  actions: () => [],
  editLabel: 'Редактировать',
  editDisabled: false,
  slots: 1,
})

const menuOpen = ref(false)

const rank = (key: string) => {
  const i = (TABLE_ROW_ACTION_ORDER as readonly string[]).indexOf(key)
  return i < 0 ? TABLE_ROW_ACTION_ORDER.length : i
}

/** Порядок от карандаша: ближайшее к нему — первым. */
const ordered = computed(() => [...props.actions].sort((a, b) => rank(a.key) - rank(b.key)))

/** Инлайном — только 2–3 действия вместе с карандашом и без удаления (D1, D5). */
const inline = computed(() => ordered.value.length > 0
  && ordered.value.length + 1 <= 3
  && !ordered.value.some(a => a.destructive))

/** Слева направо: дальние от карандаша — левее. */
const inlineSlots = computed(() => [...ordered.value].reverse())

const menuMain = computed(() => ordered.value.filter(a => !a.destructive))
const menuDanger = computed(() => ordered.value.filter(a => a.destructive))

/** Резерв ширины: слоты по 24 и зазоры по 8. Классы статичны — собранную строку Tailwind не увидит. */
const reserve: Record<number, string> = { 1: 'min-w-6', 2: 'min-w-14', 3: 'min-w-22' }
</script>

<template>
  <div
    data-slot="table-row-actions"
    class="flex items-center justify-end gap-2"
    :class="reserve[props.slots]"
    @click.stop
  >
    <!-- Одно действие: подпись по наведению на строку. -->
    <TableRowAction v-if="props.actions.length === 0" :disabled="props.editDisabled">
      {{ props.editLabel }}
    </TableRowAction>

    <template v-else>
      <!-- Кебаб: левее всех, открывает попап «ещё». Удаление — отдельной секцией последним. -->
      <span v-if="!inline" data-slot="table-row-actions-slot" class="relative flex">
        <IconButton
          variant="service"
          size="sm"
          label="Ещё"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <Icon name="pending" :size="16" />
        </IconButton>

        <!--
          Группы разводит зазор, отдельного разделителя нет — так у Атома
          (`ListGroup` `542:4969`): это и есть «отдельная секция».
        -->
        <Popover
          v-if="menuOpen"
          data-slot="table-row-actions-menu"
          class="absolute top-7 right-0 z-50 flex flex-col gap-2 p-1"
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

      <!-- 2–3 действия: тихие иконки с тултипом, механика та же, что у TableCellText. -->
      <template v-if="inline">
        <TooltipProvider v-for="a in inlineSlots" :key="a.key">
          <Tooltip>
            <TooltipTrigger as-child>
              <span data-slot="table-row-actions-slot" class="flex">
                <IconButton variant="service" size="sm" :label="a.label" :disabled="a.disabled">
                  <Icon :name="a.icon" :size="16" />
                </IconButton>
              </span>
            </TooltipTrigger>
            <TooltipContent>{{ a.label }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </template>

      <!-- Карандаш — всегда крайний справа. -->
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
