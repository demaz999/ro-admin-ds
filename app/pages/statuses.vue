<script setup lang="ts">
import { computed, ref } from 'vue'
import { tableRowActionsColumn } from '@/components/ui/table'

/**
 * Стенд «Статусы» — список статусных моделей справочника, такты 24 и 26.
 *
 * ## Источник — прод, макета нет
 *
 * Страница прода «Статусы»: заголовок, «Добавить», таблица Наименование | Компании |
 * действия. Макета в Figma нет, поэтому вид собран по канону типовой страницы-таблицы
 * (`docs/naming.md`, «Такт 20: типовая страница-таблица админки (канон)» с правками
 * тактов 21–26). Разбор и провенанс — `docs/page-statuses.md`.
 *
 * Форма редактирования статусной модели — отдельный стенд позже.
 *
 * ## Что нового по сравнению с «Типами схем осмотров»
 *
 * - **Id нет:** у статусной модели нет идентификатора в системе — колонка не заводится.
 * - **Эмблемы нет:** блок идентичности — только имя.
 * - **Многозначная ячейка «Компании»:** нейтральные метки инлайном с переносом, без потолка
 *   и «+N»; у компании со знаком — логотип 16×16.
 * - **Колонка действий — только карандаш** (такт 26): «Сделать копию» живёт в форме
 *   справочника. С такта 27 вторичного слота нет, карандаш у правого края ячейки.
 *
 * ## Что живое, а что заглушка
 *
 * Живые: поиск по имени модели и по компаниям, пагинация, размер страницы. Заглушки:
 * «Добавить» и клик по строке — обработчиков нет намеренно.
 */
definePageMeta({ layout: 'admin' })
useHead({ title: 'Статусы' })

/**
 * Логотипы компаний — **демо-данные стенда.** На проде логотип загружает компания; здесь —
 * знаки брендов из открытой библиотеки trace-logos.ru, выгрузка 2026-09-15, файлы в
 * `public/demo/logos/`. Знаки принадлежат владельцам; в прод и витрину не переносятся.
 * Компания без знака — метка без изображения. Соответствие — `docs/page-statuses.md`.
 */
const LOGOS: Record<string, string> = {
  'Ингосстрах': 'ingosstrakh',
  'Альфа Страхование': 'alfa-insurance',
  'Сбер': 'sber',
  'Согаз': 'sogaz',
  'Т-Страхование': 't-bank-insurance',
  'ДомКлик': 'domclick',
  'ВТБ': 'vtb',
  'УралСиб': 'uralsib',
  'Совкомбанк': 'sovcombank',
  'Райффайзен': 'raiffeisen',
  'Самолёт': 'samolet',
  'Брусника': 'brusnika',
}

const logo = (company: string) => (LOGOS[company] ? `/demo/logos/${LOGOS[company]}.svg` : undefined)

/**
 * Статусные модели с прода, порядок строк и порядок компаний внутри строки сохранены
 * как пришли: алфавит на проде не соблюдается, и сортировка исказила бы данные. Названия
 * моделей — с прода; двенадцать компаний со знаком переименованы в бренды своих знаков.
 */
const MODELS: { name: string, companies: string[] }[] = [
  { name: 'AnyaTest', companies: ['Ингосстрах'] },
  { name: 'COPY AnyaTest', companies: ['Ингосстрах'] },
  { name: 'COPY AnyaTest', companies: ['Ингосстрах'] },
  { name: 'COPY AnyaTest', companies: ['Ингосстрах'] },
  { name: 'meztest', companies: ['MezTest'] },
  { name: 'SavelyTest', companies: ['Альфа Страхование', 'Сбер', 'Согаз'] },
  { name: 'testSafontev', companies: ['Т-Страхование'] },
  { name: 'testSafontev123', companies: ['Т-Страхование'] },
  { name: 'VIEWAPP eng', companies: ['Альфа Страхование'] },
  { name: 'Базовые статусы для Кассы', companies: ['Альфа Страхование'] },
  { name: 'Домклик', companies: ['ДомКлик'] },
  { name: 'Особый словарь', companies: ['ВТБ', 'Альфа Страхование', 'РВИО', 'Сбер', 'Согаз', 'УралСиб', 'Совкомбанк', 'комп', '1 Схема', 'ViktorTEST'] },
  { name: 'Райффайзенбанк', companies: ['Райффайзен', 'Самолёт', 'Золото Толозы'] },
  { name: 'тест', companies: ['Брусника'] },
  { name: 'тест1', companies: [] },
  { name: 'эвелина кастом', companies: ['Ингосстрах'] },
  { name: 'эвелина текст', companies: ['тестовая компания эвелина', 'Ингосстрах', 'Альфа Страхование'] },
]

const route = useRoute()

/**
 * Приёмочная оснастка: `?values=demo` — у «Особого словаря» 40 компаний по кругу из всех
 * 19 имён демо-данных, повторы допустимы. Показывает многозначную ячейку при большом
 * наборе. В продукт не идёт.
 */
const models = computed(() => {
  if (route.query.values !== 'demo') return MODELS
  const names = [...new Set(MODELS.flatMap(m => m.companies))]
  const many = Array.from({ length: 40 }, (_, i) => names[i % names.length]!)
  return MODELS.map(m => (m.name === 'Особый словарь' ? { ...m, companies: many } : m))
})

/**
 * Колонки: Id нет, у колонки действий заголовка нет — канон, такты 23–24. Вторичных
 * действий у страницы нет, поэтому колонка — только карандаш (такт 27).
 */
const ACTIONS_COLUMN = tableRowActionsColumn([])

const columns = [
  { key: 'name', title: 'Наименование', label: 'Наименование', width: 'w-60' },
  { key: 'companies', title: 'Компании', label: 'Компании', width: 'flex-1 min-w-0' },
  { key: 'actions', title: '', label: 'Действия', width: ACTIONS_COLUMN },
] as const

/**
 * Живой поиск — канон: подстрока без учёта регистра, до пагинации, смена запроса
 * сбрасывает страницу. Такт 24: совпадение ищется в имени модели **или** в имени любой из
 * её компаний. Совпавшие метки не подсвечиваются.
 */
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const all = models.value.map((m, index) => ({ ...m, index }))
  if (!q) return all
  return all.filter(m => m.name.toLowerCase().includes(q) || m.companies.some(c => c.toLowerCase().includes(q)))
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

/** Сброс поиска — канон пустого состояния (такт 28): очищает запрос и возвращает первую страницу. */
function resetSearch() {
  search.value = ''
  page.value = 1
}

/** Приёмочная оснастка: `?rows=` — размер страницы, `?q=` — запрос для снимка. В продукт не идёт. */
if (route.query.rows) pageSize.value = Number(route.query.rows)
if (route.query.q) search.value = String(route.query.q)
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

    <!-- Без подвала (пустой результат) низ несёт сама таблица — `:attached="total > 0"`. -->
    <Table attached-top :attached="total > 0" data-slot="statuses-table">
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
        Пустой результат поиска — канон, такт 28: тело таблицы показывает `Empty`
        вместо строк, подвал ниже скрыт целиком (`v-if="total"`).
      -->
      <TableEmptySearch v-if="total === 0" @reset="resetSearch" />

      <!--
        Клик по строке = открыть на редактирование, обработчик не заведён — как у
        «Добавить». Строка растёт вместе с ячейкой «Компании»; имя и действия стоят
        у первой линии меток — `align="start"`, такт 26.
      -->
      <TableRow v-else v-for="row in rows" :key="row.index" interactive>
        <!-- Блок идентичности без эмблемы: у статусной модели своей иконки нет. -->
        <TableCell variant="slot" :size="56" align="start" class="w-60 px-4">
          <TableCellIdentity>
            {{ row.name }}
          </TableCellIdentity>
        </TableCell>

        <!--
          Многозначная ячейка — канон, такт 24: `TableCell variant="values"` — метки
          инлайном с переносом, зазор 8, без потолка и без «+N». Метка — нейтральный `Chip`
          с логотипом компании, такт 26. Пустой набор — пустая ячейка той же высоты, что
          строка с одной меткой.
        -->
        <TableCell variant="values" :size="56" class="min-w-0 flex-1 px-4" data-cell="companies">
          <Chip
            v-for="(company, i) in row.companies"
            :key="i"
            variant="neutral"
            :image="logo(company)"
          >
            {{ company }}
          </Chip>
        </TableCell>

        <!-- Только карандаш у правого края ячейки: вторичных действий нет — такт 27. -->
        <TableCell variant="slot" :size="56" align="start" class="justify-end px-4" :class="ACTIONS_COLUMN">
          <TableRowActions />
        </TableCell>
      </TableRow>
    </Table>

    <TableFooter
      v-if="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      :pages="Math.max(1, Math.ceil(total / pageSize))"
      :total="total"
      :page-sizes="[25, 50, 100]"
      attached
    />
  </div>
</template>
