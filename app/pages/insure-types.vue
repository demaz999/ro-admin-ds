<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Вторая тестовая страница — «Типы схем осмотров» (`insure-types`) текущей
 * админки, пересобранная на реестре.
 *
 * Назначение — демо для фронт-лида: контраст «кастомная админка сейчас → та же
 * страница на ДС». Это **не пиксельная копия** оригинала, а аккуратная версия
 * на компонентах кита.
 *
 * ## Источника в Figma нет
 *
 * Макета этой страницы в ките 1 не существует, живая страница за логином.
 * Поэтому композиционные решения приняты по образцу «Мои осмотры» и по
 * правилам `docs/naming.md`; каждое спорное записано с провенансом «решение
 * сборки» в `docs/page-insure-types.md`.
 *
 * Расхождения с оригиналом админки дефектами не считаются — это замысел демо.
 * В таблицу расхождений идут только расхождения с мастерами ДС.
 *
 * ## Такт 10: страница закрепляет паттерн «типовая страница-таблица админки»
 *
 * Состав шапки, колонка действий и примыкание подвала теперь не разовое
 * решение этой страницы, а правило для любой будущей таблицы админки — разбор
 * состава и провенанса в `docs/naming.md`, раздел «Типовая страница-таблица
 * админки».
 *
 * ## Что живое, а что заглушка
 *
 * Живые: пагинация, переключатель размера страницы, сворачивание разделов
 * сайдбара, сворачивание самого сайдбара бургером, **поиск по наименованию**
 * (такт 10) — фильтрует демо-данные по подстроке, счётчик и таблица обновляются.
 * Заглушки: «Добавить» и «Редактировать» — обработчиков нет намеренно.
 */
definePageMeta({ layout: 'admin' })
useHead({ title: 'Типы схем осмотров' })

/**
 * Строки со скриншотов админки — двадцать первых перенесены дословно, включая
 * технические имена вроде `!!!` и `66::: Ежовый Дом`: демо честнее с реальными
 * данными, а длинные и странные имена заодно проверяют вёрстку ячейки.
 *
 * Остальные тридцать — правдоподобные: страница показывает 25 строк из 50,
 * иначе не проверить ни пагинацию, ни переключатель размера.
 *
 * Иконки типов сняты **построчно со скриншотов оригинала**: там их ровно
 * четыре — дом, автомобиль, коробка-посылка и звёздочка. Звёздочкой помечены
 * схемы, не привязанные ни к одному из трёх объектов; своего значения у неё
 * нет, и придумывать его не нужно.
 *
 * Строкам, дописанным до пятидесяти, иконки розданы по тем же четырём: чужой
 * глиф в этой таблице означал бы тип объекта, которого в системе нет.
 */
const TYPES = [
  { id: 95, name: '!!!', icon: 'package' },
  { id: 10, name: '1к1в1с', icon: 'asterisk' },
  { id: 9, name: '1к1в2с', icon: 'home' },
  { id: 11, name: '1к2в1с(1)', icon: 'asterisk' },
  { id: 12, name: '1к2в1с(2)', icon: 'package' },
  { id: 7, name: '1к2в2с(1)', icon: 'package' },
  { id: 8, name: '1к2в2с(2)', icon: 'asterisk' },
  { id: 14, name: '2к1в1с', icon: 'package' },
  { id: 13, name: '2к1в2с', icon: 'package' },
  { id: 15, name: '2к2в1с(1)', icon: 'asterisk' },
  { id: 16, name: '2к2в1с(2)', icon: 'package' },
  { id: 54, name: '66::: Ежовый Дом', icon: 'home' },
  { id: 6, name: 'AnyaTest', icon: 'asterisk' },
  { id: 158, name: 'krasovskiiTest', icon: 'car' },
  { id: 150, name: 'MezTest', icon: 'car' },
  { id: 166, name: 'QA_схема', icon: 'home' },
  { id: 168, name: 'QA_схема без форм', icon: 'package' },
  { id: 167, name: 'QA_схема только просмотр', icon: 'package' },
  { id: 52, name: 'testSafontev', icon: 'car' },
  { id: 156, name: 'ViktorTEST', icon: 'car' },
  { id: 170, name: 'QA_схема мультиосмотр', icon: 'asterisk' },
  { id: 61, name: 'Автомобиль. КАСКО', icon: 'car' },
  { id: 88, name: 'Ипотека. Квартира', icon: 'home' },
  { id: 102, name: 'Коммерческая недвижимость', icon: 'home' },
  { id: 175, name: 'Оборудование. Периодический осмотр', icon: 'package' },
  { id: 171, name: 'QA_схема архив', icon: 'asterisk' },
  { id: 172, name: 'QA_схема без фото', icon: 'asterisk' },
  { id: 62, name: 'Автомобиль. ОСАГО', icon: 'car' },
  { id: 63, name: 'Автомобиль. Такси', icon: 'car' },
  { id: 64, name: 'Автомобиль. Грузовой', icon: 'car' },
  { id: 89, name: 'Ипотека. Дом', icon: 'home' },
  { id: 90, name: 'Ипотека. Апартаменты', icon: 'home' },
  { id: 103, name: 'Коммерческая. Склад', icon: 'package' },
  { id: 104, name: 'Коммерческая. Офис', icon: 'home' },
  { id: 176, name: 'Оборудование. Станки', icon: 'package' },
  { id: 177, name: 'Оборудование. Бытовая техника', icon: 'package' },
  { id: 178, name: 'Оборудование. Гаджеты', icon: 'package' },
  { id: 41, name: 'Загородный дом', icon: 'home' },
  { id: 42, name: 'Земельный участок', icon: 'home' },
  { id: 43, name: 'Баня и хозпостройки', icon: 'home' },
  { id: 55, name: '66::: Тестовый дом', icon: 'home' },
  { id: 56, name: '66::: Тестовый склад', icon: 'package' },
  { id: 121, name: 'Мультиосмотр. Квартира', icon: 'home' },
  { id: 122, name: 'Мультиосмотр. Авто', icon: 'car' },
  { id: 133, name: 'Повторный осмотр', icon: 'asterisk' },
  { id: 134, name: 'Осмотр после ремонта', icon: 'home' },
  { id: 145, name: 'Экспертиза. Ущерб', icon: 'asterisk' },
  { id: 146, name: 'Экспертиза. Оценка', icon: 'asterisk' },
  { id: 157, name: 'ViktorTEST_2', icon: 'car' },
  { id: 159, name: 'krasovskiiTest_2', icon: 'car' },
] as const

/** Колонки. Макета нет: ширины — решение сборки, содержательная колонка резиновая. */
const columns = [
  { key: 'id', title: 'Id', width: 'w-24' },
  { key: 'icon', title: 'Иконка', width: 'w-24' },
  { key: 'name', title: 'Наименование', width: 'flex-1' },
  { key: 'actions', title: 'Действия', width: 'w-44' },
] as const

/**
 * Поиск по наименованию — такт 10. Подстрока, без учёта регистра; фильтрует
 * демо-набор до пагинации, поэтому счётчик «Найдено» и разбивка по страницам
 * согласованы: смена запроса сбрасывает на первую страницу, иначе легко
 * оказаться на странице, которой у отфильтрованного набора уже нет.
 */
const search = ref('')

const filteredTypes = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return TYPES
  return TYPES.filter(t => t.name.toLowerCase().includes(q))
})

const pageSize = ref(25)
const page = ref(1)
const total = computed(() => filteredTypes.value.length)

const rows = computed(() => {
  const from = (page.value - 1) * pageSize.value
  return filteredTypes.value.slice(from, from + pageSize.value)
})

function onSearch() {
  page.value = 1
}

/**
 * Приёмочная оснастка, та же, что у «Мои осмотры»: `?rows=` задаёт размер
 * страницы, `?q=` — поисковый запрос для снимка. В продукт не идёт.
 */
const route = useRoute()
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
    <!-- У последнего уровня шеврона нет: указывать ему некуда. -->
    <li>
      <ButtonNavigation size="sm" direction="none">
        Типы схем осмотров
      </ButtonNavigation>
    </li>
  </Breadcrumb>

  <h1 class="text-4xl font-bold">
    Типы схем осмотров
  </h1>

  <!--
    Панель действий, таблица и подвал — один контейнер: так собран фрейм
    `table` 19601:29061 кита 1 и так же выглядит оригинал админки. Верхние
    углы и верхнюю рамку несёт панель, нижние — подвал.
  -->
  <div class="flex min-w-0 flex-col">
    <!--
      Превью для приёмки владельца, композиция страницы — компонент
      TableToolbar и правило такта 10 (naming.md) не трогаю.

      Раскладка обратная канону: поиск слева, «Добавить» справа (было —
      «Добавить» слева). Счётчик «Найдено N» перебирал такты 13/15/16/17
      (снаружи по центру блока → внутрь поля → снаружи по базовой линии →
      снаружи по центру) и в итоге снят целиком: на исходной странице
      админки его нет, вопрос отложен.

      Явный `items-center` в `class` (а не дефолт компонента) — чтобы поле и
      кнопка держались одной оси и паддинги плашки сверху/снизу оставались
      симметричными; `gap-3` (12) — зазор строки.
    -->
    <TableToolbar class="items-center gap-3">
      <Input
        v-model="search"
        variant="elevated"
        placeholder="Поиск по наименованию"
        class="max-w-110 min-w-0"
        @update:model-value="onSearch"
      />

      <!-- Заглушка: обработчика нет, кнопка показывает вид и состояния. -->
      <Button show-icon class="ml-auto">
        <template #icon>
          <Icon name="add-circle" :size="20" />
        </template>
        Добавить
      </Button>
    </TableToolbar>

    <!-- Закрепления колонок нет: таблица помещается в ширину без прокрутки. -->
    <Table attached-top attached data-slot="types-table">
      <TableRow>
        <TableHead
          v-for="col in columns"
          :key="col.key"
          variant="column"
          :class="[col.width, 'px-4', col.key === 'actions' ? 'justify-end' : '']"
        >
          {{ col.title }}
        </TableHead>
      </TableRow>

      <TableRow v-for="row in rows" :key="row.id" interactive>
        <!--
          Id — приглушённый служебный номер, но всё равно идентификатор:
          системное правило владельца (такт 11) не делает исключений по
          приглушённости — со службой копирования.
        -->
        <TableCell variant="slot" :size="56" class="w-24 px-4">
          <CopyableId :value="row.id" class="text-sm text-muted-foreground" />
        </TableCell>

        <TableCell variant="slot" :size="56" class="w-24 px-4">
          <Icon :name="row.icon" :size="24" />
        </TableCell>

        <!--
          Наименование — плоский текст, не ссылка: решение владельца, такт 12,
          откат рекомендации такта 10. Ховер строки остаётся штатным, у самого
          текста никакого интерактива нет.
        -->
        <TableCell variant="slot" :size="56" class="flex-1 px-4">
          <TableCellText class="flex-1 text-sm text-foreground">
            {{ row.name }}
          </TableCellText>
        </TableCell>

        <!--
          Такт 14, превью для приёмки владельца, часть 2 такта 13 продолжается:
          тултип с такта 13 снят владельцем, подпись вернулась — но по-другому,
          чем в каноне такта 10. Там подпись шла ПОСЛЕ иконки и раскрывала
          колонку слева направо; здесь карандаш прижат к правому краю и не
          двигается, подпись раскрывается СЛЕВА от него. Порядок в разметке —
          подпись первой, иконка последней: раскладка `justify-end` держит
          иконку у правого края всегда, а подпись — тот же приём, что у
          `TableRowAction` (`opacity` 0→1, место в потоке зарезервировано
          всегда, ширина не участвует), просто с другой стороны. Общая цель
          клика — одна кнопка на оба, как и просил такт 14.

          Такт 15: зазор подпись—иконка 4 → 8 (решение владельца, было тесно).
          Карандаш и на это не сдвигается — он всегда у правого края
          (`justify-end`), зазор увеличивает только то, что слева от него, а
          резерв ширины колонки (w-44) держит это с запасом.

          TableRowAction и канон такта 10 не трогаю: компонент остаётся в
          реестре нетронутым на случай отката.
        -->
        <TableCell variant="slot" :size="56" class="w-44 justify-end px-4">
          <button
            type="button"
            class="inline-flex h-5 w-fit shrink-0 items-center gap-2 bg-transparent text-foreground-secondary outline-none transition-colors select-none hover:text-foreground"
            :style="{ transitionDuration: 'var(--duration-hover)' }"
          >
            <span
              class="overflow-hidden text-sm whitespace-nowrap opacity-0 transition-opacity group-hover/table-row:opacity-100 [@media(hover:none)]:opacity-100"
              :style="{ transitionDuration: 'var(--duration-hover)' }"
            >
              Редактировать
            </span>
            <Icon name="edit" :size="16" />
          </button>
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
