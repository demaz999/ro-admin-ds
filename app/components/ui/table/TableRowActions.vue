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
 * | нет | пустой, без объекта — но место занято |
 * | одно, не удаление | иконка действия (`IconButton service`, глиф 16), тултип с названием |
 * | два и больше — или есть удаление | кебаб (глиф `pending`), тултипа нет; удаление — последней группой |
 *
 * **Вторичный слот резервируется всегда** — рекомендация чата, принято владельцем (такт
 * 22): тогда карандаш стоит на одной координате X во всей админке, а не только внутри
 * страницы. Ширина колонки поэтому одна на всю админку —
 * `TABLE_ROW_ACTIONS_COLUMN` в `table/index.ts`, страница её не пересчитывает.
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
}>(), {
  actions: () => [],
  editLabel: 'Редактировать',
  editDisabled: false,
})

const menuOpen = ref(false)

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

    <!-- Вторичный слот: 24×24, занят всегда — пустой, иконка или кебаб. -->
    <span data-slot="table-row-actions-secondary" class="relative flex size-6 shrink-0">
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
      </template>
    </span>
  </div>
</template>
