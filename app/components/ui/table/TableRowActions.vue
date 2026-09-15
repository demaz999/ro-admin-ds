<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { SelectGroup, SelectItem } from '../select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import TableRowAction from './TableRowAction.vue'
import { TABLE_ROW_ACTION_ORDER, type TableRowActionItem } from '.'

/**
 * Колонка «Действия» строки. Решения владельца: такт 20 (подпись по наведению,
 * удаление не голой иконкой, порядок кебаба), такт 21 (вторичный слот), такт 22
 * (порядок слотов и резерв).
 *
 * ## Порядок слева направо: подпись → карандаш → вторичный слот
 *
 * Карандаш с подписью — `TableRowAction`, всегда и при любом числе действий: подпись
 * «Редактировать» проявляется слева от карандаша по наведению на строку (`opacity`,
 * место зарезервировано, 12 до глифа). У карандаша тултипа нет — у него подпись.
 *
 * Правее карандаша через 8 — **вторичный слот** 24×24:
 *
 * | Вторичных действий | Вторичный слот |
 * |---|---|
 * | нет на странице | слота нет: карандаш у правого края ячейки |
 * | одно, не удаление | иконка действия (`IconButton service`, глиф 16), тултип с названием |
 * | два и больше — или есть удаление | кебаб (глиф `pending`), тултипа нет; удаление — последней группой |
 *
 * **Слот рендерится и резервируется только при вторичных действиях** — решение владельца,
 * такт 27; резерв такта 22 снят. На странице без вторичных карандаш стоит у правого края
 * ячейки, на одной вертикали с правым краем «Добавить». На странице со вторичными
 * карандаш сдвинут на 32 левее и стоит на одной X у всех строк страницы. Ширину колонки
 * выбирает `tableRowActionsColumn` в `table/index.ts` по набору действий страницы.
 *
 * Кебаб собран на примитивах Reka Popover с такта 28: плашка уходит порталом в `body`,
 * положение — `align="end"` `:side-offset="4"`, подобрано замером под прежние 4px до
 * пилюли. Разбор — `popover/index.ts`.
 *
 * Резерв по умолчанию следует за списком строки. `reserveSecondary` задаёт его по
 * странице: у строки без вторичных на странице, где они есть, слот остаётся пустым —
 * так карандаш не выбивается из общей X (оснастка `?actions=demo` смешивает наборы).
 *
 * > Такт 22 исправил порядок: в такте 21 вторичный слот стоял левее карандаша — ошибка
 * > передачи решения владельца.
 *
 * ## Клик по действию не уходит в строку
 *
 * Строка — цель клика (открыть на редактирование), поэтому клики внутри колонки
 * останавливаются здесь, а не на странице.
 */
const props = withDefaults(defineProps<{
  /** Вторичные действия в любом порядке — порядок кебаба задаёт компонент. */
  actions?: TableRowActionItem[]
  /** Подпись карандаша. */
  editLabel?: string
  /** Редактирование недоступно по правам. */
  editDisabled?: boolean
  /**
   * На странице есть вторичные действия: слот резервируется и у строки с пустым списком.
   * Не задан — резерв следует за списком строки. Такт 27.
   */
  reserveSecondary?: boolean
}>(), {
  actions: () => [],
  editLabel: 'Редактировать',
  editDisabled: false,
  reserveSecondary: undefined,
})

const menuOpen = ref(false)

/** Вторичный слот есть только при вторичных действиях — такт 27. */
const reserve = computed(() => props.reserveSecondary ?? props.actions.length > 0)

/** Одно вторичное действие, и это не удаление, — встаёт иконкой. */
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
    <!-- Подпись и карандаш: всегда, при любом числе действий. -->
    <TableRowAction :disabled="props.editDisabled">
      {{ props.editLabel }}
    </TableRowAction>

    <!-- Вторичный слот: 24×24 при вторичных действиях страницы — иконка, кебаб или пустой резерв. -->
    <span v-if="reserve" data-slot="table-row-actions-secondary" class="relative flex size-6 shrink-0">
      <TooltipProvider v-if="single">
        <Tooltip>
          <TooltipTrigger as-child>
            <IconButton variant="service" size="sm" :label="single.label" :disabled="single.disabled">
              <Icon :name="single.icon" :size="16" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>{{ single.label }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <template v-else-if="props.actions.length">
        <Popover v-model:open="menuOpen">
          <PopoverTrigger as-child>
            <IconButton variant="service" size="sm" label="Ещё">
              <Icon name="pending" :size="16" />
            </IconButton>
          </PopoverTrigger>

          <PopoverContent data-menu="row-actions" align="end" :side-offset="4" class="p-1">
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
          </PopoverContent>
        </Popover>
      </template>
    </span>
  </div>
</template>
