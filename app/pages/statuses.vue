<script setup lang="ts">
import { computed, ref } from 'vue'
import type { IconName } from '@/components/ui/icon'
import { TABLE_ROW_ACTIONS_COLUMN, type TableRowActionItem } from '@/components/ui/table'

/**
 * Стенд «Статусы» — список статусных моделей справочника, такт 24.
 *
 * ## Источник — прод, макета нет
 *
 * Страница прода «Статусы»: заголовок, «Добавить», таблица Наименование | Компании |
 * действия. Макета в Figma нет, поэтому вид собран по канону типовой страницы-таблицы
 * (`docs/naming.md`, «Такт 20: типовая страница-таблица админки (канон)» с правками
 * тактов 21–24). Разбор и провенанс — `docs/page-statuses.md`.
 *
 * Форма редактирования статусной модели — отдельный стенд позже.
 *
 * ## Что нового по сравнению с «Типами схем осмотров»
 *
 * - **Id нет:** у статусной модели нет идентификатора в системе — колонка не заводится.
 * - **Эмблемы нет:** блок идентичности — только имя.
 * - **Многозначная ячейка «Компании»:** метки инлайном с переносом, без потолка и «+N».
 * - **Первое реальное вторичное действие:** «Сделать копию» в правом слоте колонки.
 *
 * ## Что живое, а что заглушка
 *
 * Живые: поиск по имени модели и по компаниям, пагинация, размер страницы. Заглушки:
 * «Добавить», клик по строке и «Сделать копию» — обработчиков нет намеренно.
 */
definePageMeta({ layout: 'admin' })
useHead({ title: 'Статусы' })

/**
 * Логотипы компаний — **демо-данные, не правило.** На проде логотип — картинка; здесь
 * заглушка: глиф Material Symbols 16, окрашенный рампой расширенной палитры. Палитра
 * законна именно тут: цвет различает компании, а не сообщает статус (`naming.md`,
 * «Расширенная палитра»), и взята по явному указанию владельца. Компания без логотипа —
 * метка без иконки и без заглушки. Классы статичны: собранную строку Tailwind не увидит.
 */
const LOGOS: Record<string, { icon: IconName, tone: string }> = {
  'AnyaTest': { icon: 'person', tone: 'text-palette-01' },
  'Касса': { icon: 'payments', tone: 'text-palette-02' },
  'Сбербанк страхование': { icon: 'admin', tone: 'text-palette-03' },
  'Тестовая компания 2': { icon: 'layers', tone: 'text-palette-04' },
  'TestKasko': { icon: 'car', tone: 'text-palette-05' },
  'Домклик': { icon: 'home', tone: 'text-palette-06' },
  'ВТБ Страхование': { icon: 'monitoring', tone: 'text-palette-01' },
  'Уралсиб': { icon: 'account-tree', tone: 'text-palette-02' },
  'Энергогарант': { icon: 'settings', tone: 'text-palette-03' },
  'Denis': { icon: 'lock', tone: 'text-palette-04' },
  'Еж': { icon: 'asterisk', tone: 'text-palette-05' },
  'тест': { icon: 'article', tone: 'text-palette-06' },
}

/**
 * Статусные модели с прода, порядок строк и порядок компаний внутри строки сохранены
 * как пришли: алфавит на проде не соблюдается, и сортировка исказила бы данные.
 */
const MODELS: { name: string, companies: string[] }[] = [
  { name: 'AnyaTest', companies: ['AnyaTest'] },
  { name: 'COPY AnyaTest', companies: ['AnyaTest'] },
  { name: 'COPY AnyaTest', companies: ['AnyaTest'] },
  { name: 'COPY AnyaTest', companies: ['AnyaTest'] },
  { name: 'meztest', companies: ['MezTest'] },
  { name: 'SavelyTest', companies: ['Касса', 'Сбербанк страхование', 'Тестовая компания 2'] },
  { name: 'testSafontev', companies: ['TestKasko'] },
  { name: 'testSafontev123', companies: ['TestKasko'] },
  { name: 'VIEWAPP eng', companies: ['Касса'] },
  { name: 'Базовые статусы для Кассы', companies: ['Касса'] },
  { name: 'Домклик', companies: ['Домклик'] },
  { name: 'Особый словарь', companies: ['ВТБ Страхование', 'Касса', 'РВИО', 'Сбербанк страхование', 'Тестовая компания 2', 'Уралсиб', 'Энергогарант', 'комп', '1 Схема', 'ViktorTEST'] },
  { name: 'Райффайзенбанк', companies: ['Denis', 'Еж', 'Золото Толозы'] },
  { name: 'тест', companies: ['тест'] },
  { name: 'тест1', companies: [] },
  { name: 'эвелина кастом', companies: ['AnyaTest'] },
  { name: 'эвелина текст', companies: ['тестовая компания эвелина', 'AnyaTest', 'Касса'] },
]

/** Колонки: Id нет, у колонки действий заголовка нет — канон, такты 23–24. */
const columns = [
  { key: 'name', title: 'Наименование', label: 'Наименование', width: 'w-60' },
  { key: 'companies', title: 'Компании', label: 'Компании', width: 'flex-1 min-w-0' },
  { key: 'actions', title: '', label: 'Действия', width: TABLE_ROW_ACTIONS_COLUMN },
] as const

/**
 * Живой поиск — канон: подстрока без учёта регистра, до пагинации, смена запроса
 * сбрасывает страницу. Такт 24: совпадение ищется в имени модели **или** в имени любой из
 * её компаний. Совпавшие метки не подсвечиваются.
 */
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return MODELS.map((m, index) => ({ ...m, index }))
  return MODELS
    .map((m, index) => ({ ...m, index }))
    .filter(m => m.name.toLowerCase().includes(q) || m.companies.some(c => c.toLowerCase().includes(q)))
})

const pageSize = ref(25)
const page = ref(1)
const total = computed(() => filtered.value.length)

const rows = computed(() => {
  const from = (page.value - 1) * pageSize.value
  return filtered.value.slice(from, from + pageSize.value)
})

function onSearch() {
  page.value = 1
}

/** Приёмочная оснастка: `?rows=` — размер страницы, `?q=` — запрос для снимка. В продукт не идёт. */
const route = useRoute()
if (route.query.rows) pageSize.value = Number(route.query.rows)
if (route.query.q) search.value = String(route.query.q)

/** Вторичное действие страницы — «Сделать копию» из формы прода. Одно на все строки. */
const ACTIONS: TableRowActionItem[] = [
  { key: 'copy', label: 'Сделать копию', icon: 'copy' },
]
</script>

<template>
  <Breadcrumb>
    <li>
      <ButtonNavigation size="sm" muted>
        Главная
      </ButtonNavigation>
    </li>
    <li>
      <ButtonNavigation size="sm" direction="none">
        Статусы
      </ButtonNavigation>
    </li>
  </Breadcrumb>

  <h1 class="text-4xl font-bold">
    Статусы
  </h1>

  <div class="flex min-w-0 flex-col">
    <!-- Шапка — канон (A): поиск 440 слева, «Добавить» справа, одна ось, без счётчика. -->
    <TableToolbar class="items-center gap-3">
      <Input
        v-model="search"
        variant="elevated"
        placeholder="Поиск по наименованию и компании"
        class="max-w-110 min-w-0"
        @update:model-value="onSearch"
      />

      <!-- Заглушка: обработчика нет. -->
      <Button show-icon class="ml-auto">
        <template #icon>
          <Icon name="add-circle" :size="20" />
        </template>
        Добавить
      </Button>
    </TableToolbar>

    <Table attached-top attached data-slot="statuses-table">
      <TableRow>
        <TableHead
          v-for="col in columns"
          :key="col.key"
          variant="column"
          :aria-label="col.title ? undefined : col.label"
          :class="[col.width, 'px-4', col.key === 'actions' ? 'justify-end' : '']"
        >
          {{ col.title }}
        </TableHead>
      </TableRow>

      <!--
        Клик по строке = открыть на редактирование, обработчик не заведён — как у
        «Добавить». Строка растёт вместе с ячейкой «Компании»: имя и действия стоят
        у первой линии меток.
      -->
      <TableRow v-for="row in rows" :key="row.index" interactive>
        <!-- Блок идентичности без эмблемы: у статусной модели своей иконки нет. -->
        <TableCell variant="slot" :size="56" class="w-60 px-4">
          <TableCellIdentity>
            {{ row.name }}
          </TableCellIdentity>
        </TableCell>

        <!--
          Многозначная ячейка — канон, такт 24: `TableCell variant="values"` — метки
          инлайном с переносом, зазор 8, без потолка и без «+N». Пустой набор — пустая
          ячейка той же высоты, что строка с одной меткой.
        -->
        <TableCell variant="values" :size="56" class="min-w-0 flex-1 px-4" data-cell="companies">
          <Chip v-for="company in row.companies" :key="company" trailing="none">
            <template v-if="LOGOS[company]" #leading>
              <Icon :name="LOGOS[company]!.icon" :size="16" :class="LOGOS[company]!.tone" />
            </template>
            {{ company }}
          </Chip>
        </TableCell>

        <TableCell variant="slot" :size="56" class="justify-end px-4" :class="TABLE_ROW_ACTIONS_COLUMN">
          <TableRowActions :actions="ACTIONS" />
        </TableCell>
      </TableRow>
    </Table>

    <TableFooter
      v-model:page="page"
      v-model:page-size="pageSize"
      :pages="Math.max(1, Math.ceil(total / pageSize))"
      :total="total"
      :page-sizes="[25, 50, 100]"
      attached
    />
  </div>
</template>
