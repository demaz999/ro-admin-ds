<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { Pagination } from '../pagination'
import { Popover } from '../popover'
import { SelectItem } from '../select'

/**
 * Подвал таблицы — узел `table_footer` `19601:29081`.
 *
 * Композиция снята с ноды: слева пагинация, сразу за ней счётчик диапазона,
 * справа переключатель размера страницы. Рамка та же, что у таблицы,
 * заливка белая, высота 92 вместе с полосой прокрутки сверху.
 *
 * Подвал **примыкает к таблице**: в макете это один контейнер `table`
 * `19601:29061` — шапка, тело и подвал внутри одной рамки со скруглением 16.
 * Поэтому у подвала нет верхней рамки (её роль играет нижняя рамка таблицы) и
 * есть нижние скругления.
 *
 * | Часть | С макета |
 * |---|---|
 * | счётчик | «1 – 15 из 64787», 16 Regular, основной текст |
 * | переключатель | плашка 104×44, радиус 8, заливка `accent/surface_soft`, подпись 15 Regular и шеврон |
 *
 * **Список размеров в макете не раскрыт.** Значения 15 / 30 / 50 — решение
 * сборки, зафиксировано в `docs/page-my-inspections.md`.
 */
const props = withDefaults(defineProps<{
  page?: number
  pages?: number
  /** Сколько строк на странице. */
  pageSize?: number
  /** Всего записей — для счётчика диапазона. */
  total?: number
  /** Варианты размера страницы. */
  pageSizes?: number[]
  /**
   * Подвал примыкает к таблице сверху: своей верхней рамки у него тогда нет,
   * скруглены только нижние углы. Отдельно стоящий подвал — под плиткой —
   * замыкает рамку сам.
   */
  attached?: boolean
}>(), {
  page: 1,
  pages: 1,
  pageSize: 15,
  total: 0,
  pageSizes: () => [15, 30, 50],
  attached: true,
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const open = ref(false)

/** Диапазон считается, а не пишется руками: «1 – 15 из 64787». */
const range = computed(() => {
  const from = (props.page - 1) * props.pageSize + 1
  const to = Math.min(props.page * props.pageSize, props.total)
  return `${from} – ${to} из ${props.total}`
})

/**
 * Смена размера страницы **пересчитывает и номер страницы**. Без этого выбор
 * более крупного размера оставляет номер за пределами набора: со второй
 * страницы по 25 строк переход на 50 давал «51 – 50 из 50» и пустую таблицу.
 *
 * Номер не сбрасывается в первый, а прижимается к последнему существующему:
 * если страница ещё есть — пользователь остаётся на ней.
 */
function pick(size: number) {
  open.value = false
  emit('update:pageSize', size)

  const last = Math.max(1, Math.ceil(props.total / size))
  if (props.page > last) emit('update:page', last)
}
</script>

<template>
  <div
    data-slot="table-footer"
    :class="[
      'flex items-center gap-4 border border-border-soft bg-card p-4',
      props.attached ? 'rounded-b-xl border-t-0' : 'rounded-xl',
    ]"
  >
    <Pagination :page="props.page" :pages="props.pages" @update:page="emit('update:page', $event)" />

    <span data-slot="table-range" class="text-base whitespace-nowrap">{{ range }}</span>

    <!-- Переключатель размера страницы: плашка с подписью и шевроном. -->
    <span class="relative ml-auto">
      <button
        data-slot="page-size"
        type="button"
        class="flex h-11 items-center gap-2 rounded-md bg-secondary px-4 text-sm outline-none transition-colors hover:bg-secondary-hover"
        :aria-expanded="open"
        :style="{ transitionDuration: 'var(--duration-hover)' }"
        @click="open = !open"
      >
        {{ props.pageSize }} строк
        <Icon name="chevron-down" :size="11" class="text-foreground-secondary" />
      </button>

      <Popover v-if="open" :width="160" class="absolute right-0 bottom-13 z-50 p-1">
        <SelectItem
          v-for="size in props.pageSizes"
          :key="size"
          :selected="size === props.pageSize"
          @click="pick(size)"
        >
          {{ size }} строк
        </SelectItem>
      </Popover>
    </span>
  </div>
</template>
