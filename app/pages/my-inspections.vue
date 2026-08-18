<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

/**
 * Пилотная страница «Мои осмотры» — сборка из реестра.
 *
 * Эталон: файл дашборда `U829JoK7KMZV8do3KNkWBh`, узел `20304:54594`
 * («карточный вид 1280 — дефолтное состояние»), 1280×1764. Спек-страниц у
 * дашборда нет: источник один — макет.
 *
 * Правила: только компоненты реестра, ни одного значения мимо токенов. Всё,
 * чего не хватило, **не дорисовано на месте**, а вынесено строкой в таблицу
 * расхождений `docs/page-my-inspections.md`.
 */
useHead({ title: 'Мои осмотры' })

/**
 * Рельс меню. Иконки — из набора Material, подобраны по смыслу подписи:
 * соответствие «подпись на макете → имя глифа» в `docs/naming.md`.
 *
 * Подписи в компактном режиме не рисуются — у Атома их там нет вовсе. Строка в
 * таблице расхождений.
 */
const railGroups = [
  [
    { icon: 'home', label: 'Главная' },
    { icon: 'monitoring', label: 'Charts' },
    { icon: 'payments', label: 'Billing' },
    { icon: 'account-tree', label: 'Построение' },
  ],
  [{ icon: 'draft', label: 'Все доступные' }],
  [
    { icon: 'list', label: 'Все осмотры', selected: true },
    { icon: 'hourglass', label: 'Очередь' },
    { icon: 'account-tree', label: 'Проекты' },
    { icon: 'schedule', label: 'Незавершённые' },
  ],
  [
    { icon: 'admin', label: 'Администрирование' },
    { icon: 'settings', label: 'Системные' },
  ],
  [{ icon: 'person', label: 'Профиль' }],
] as const

const autoUpdate = ref(true)
const view = ref('cards')
const search = ref('')

/** Сворачивание фильтров — общее для обоих видов, состояние панели не теряется. */
const filtersCollapsed = ref(false)

/**
 * Колонки таблицы — строго с макета `19601:29029`: порядок, ширины и то, что
 * первые две колонки зафиксированы, а остальные уезжают под горизонтальный
 * скролл. Сумма ширин 1776 при видимой области 1372 — прокрутка есть в самом
 * макете, это не наша выдумка.
 */
const tableColumns = [
  { key: 'name', title: 'Название', width: 'w-70', sortable: true },
  { key: 'lockedBy', title: 'Заблокировано за', width: 'w-60' },
  { key: 'scheme', title: 'Схема', width: 'w-60' },
  { key: 'attribute', title: 'Признак', width: 'w-33' },
  { key: 'status', title: 'Статус', width: 'w-60' },
  { key: 'inspectionId', title: 'ID осмотра', width: 'w-33' },
  { key: 'comment', title: 'Комментарий к осмотру', width: 'w-60' },
  { key: 'note', title: 'Комментарий', width: 'w-60' },
] as const

/** Тон значения в колонке «Признак» — по ноде, токенами, а не хексами. */
const attributeTone: Record<string, string> = {
  danger: 'text-palette-06',
  secondary: 'text-foreground-secondary',
  default: 'text-foreground',
  muted: 'text-muted-foreground',
}

/** Сортировка есть в макете — стрелка у «Названия». Направление наше: глиф один. */
const sortKey = ref<string>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: string) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}

/**
 * Карточки берут первые десять осмотров общего набора — данные у видов общие.
 * Сам набор объявлен ниже, рядом с таблицей.
 */

/**
 * Содержимое обеих выпадашек — **продуктовое**, факт из продукта, а не демо:
 * шеврон у чекбокса открывает режимы выбора, кнопка «ещё» — массовые действия
 * над выбранными. В макете ни одна из них не раскрыта.
 */
const bulkOpen = ref(false)
const selectionModes = [
  'Выбрать все видимые на странице',
  'Выбрать все найденные (включая скрытые)',
  'Снять выделение',
]

const moreOpen = ref(false)
const moreActions = [
  'Поделиться осмотром',
  'Отозвать доступ',
  'Показать историю',
]

/**
 * Полный страничный набор осмотров. Данные вымышленные, но **разные**: клоны
 * одной строки не показывают ни переносов, ни ветвлений — на них не видно ни
 * длинного названия, ни пустого признака, ни второй ветки «Заблокировано за».
 *
 * Карточки берут из этого же набора первые десять: вид переключается, данные
 * общие.
 */
const OBJECTS = [
  ['Kantonsschule Stadelhofen, Schanzengasse 5', 'Швейцария, Цюрих, Schanzengasse 5'],
  ['Складской комплекс «Северный»', 'РФ, Московская область, Мытищи, Олимпийский пр-т, 12'],
  ['Логистический центр «Восток-7»', 'РФ, Республика Татарстан, Казань, ул. Родины, 26'],
  ['Загородный дом, участок 14', 'РФ, Ульяновская область, Сурский район, р.п. Сурское'],
  ['Автомобиль Lada Vesta, В234ОР', 'РФ, Самарская область, Тольятти, Южное шоссе, 36'],
  ['Торговый павильон «Заря»', 'РФ, Свердловская область, Екатеринбург, ул. Малышева, 71'],
  ['Квартира, ЖК «Прибрежный», к. 3', 'РФ, Краснодарский край, Сочи, ул. Донская, 10а'],
  ['Производственный цех № 4', 'РФ, Челябинская область, Магнитогорск, ул. Кирова, 93'],
  ['Гостиница «Приморская», корпус B', 'РФ, Приморский край, Владивосток, ул. Набережная, 3'],
  ['Дачный дом, СНТ «Ромашка»', 'РФ, Тверская область, Конаковский район, СНТ «Ромашка»'],
  ['Офис, БЦ «Меркурий», 12 этаж', 'РФ, Москва, Пресненская наб., 10'],
  ['Ангар для сельхозтехники', 'РФ, Ростовская область, Азовский район, х. Победа'],
  ['Автомобиль Kia Rio, О112АМ', 'РФ, Новосибирская область, Новосибирск, ул. Ленина, 8'],
  ['Магазин «Продукты у дома»', 'РФ, Пермский край, Пермь, ул. Куйбышева, 50'],
  ['Строящийся коттедж, участок 7', 'РФ, Ленинградская область, Всеволожский район'],
] as const

const SCHEMES = [
  'Предстраховой осмотр. Автомобиль',
  'Урегулирование убытка. Недвижимость',
  'Предстраховой осмотр. Коммерческая недвижимость',
  'Периодический осмотр. Оборудование',
  'Повторный осмотр после ремонта',
] as const

const STATUSES = [
  { color: 'red', text: 'Требуется повторить осмотр' },
  { color: 'cyan', text: 'Осмотр не завершен' },
  { color: 'violet', text: 'Экспертиза' },
  { color: 'green', text: 'Договор' },
] as const

const MARKS = [[], ['cancelled'], ['archived'], ['cancelled', 'archived']] as const

const COMMENTS = [
  'Собственник просит перенести на вечер',
  'Нужны фото повреждений с двух ракурсов',
  'Объект закрыт, доступ по согласованию',
  'Комплект документов дослан 12 мая',
  'Осмотр проводится совместно с экспертом',
] as const

const NOTES = [
  'Проверить серийный номер оборудования',
  'Уточнить площадь по выписке ЕГРН',
  'Клиент просит копию заключения',
  'Повторный визит согласован',
  'Замечаний нет',
] as const

const COVERS = [
  '',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=200&q=60',
  'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=200&q=60',
  'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=200&q=60',
  'https://images.unsplash.com/photo-1568667256549-094345857637?w=200&q=60',
  'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=200&q=60',
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=200&q=60',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=200&q=60',
] as const

const LOCKERS = [
  'Ефремова А. (администратор групп) 23 мая 2023, в 15:19',
  'Круппов С. О. (эксперт) 14 мая 2024, в 14:44',
  'Селиванова М. (оператор) 2 апреля 2024, в 09:05',
  '',
  '',
] as const

/** Страничный набор: каждая строка отличается от соседних хотя бы тремя полями. */
const inspections = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  cover: COVERS[i % COVERS.length],
  name: OBJECTS[i % OBJECTS.length][0] + (i >= OBJECTS.length ? `, объект № ${i + 1}` : ''),
  address: OBJECTS[i % OBJECTS.length][1] + (i >= OBJECTS.length ? `, стр. ${(i % 7) + 1}` : ''),
  scheme: SCHEMES[i % SCHEMES.length],
  status: STATUSES[i % STATUSES.length],
  marks: MARKS[i % MARKS.length],
  multi: i % 3 === 0,
  lockedBy: LOCKERS[i % LOCKERS.length],
  date: ['3 фев, 2023 (пт), 06:49', '14 мар, 2024 (чт), 11:20', '2 апр, 2024 (вт), 09:05'][i % 3],
  inspectionId: String(188250 + i * 7),
  comment: COMMENTS[i % COMMENTS.length],
  note: NOTES[i % NOTES.length],
  user: LOCKERS[i % LOCKERS.length]
    ? { letter: LOCKERS[i % LOCKERS.length].slice(0, 1), name: LOCKERS[i % LOCKERS.length].split(' (')[0], role: 'Эксперт' }
    : null,
  blockAction: !LOCKERS[i % LOCKERS.length],
}))

const cards = inspections.slice(0, 10)

/** Размер страницы и текущая страница — общие для подвала и списка. */
const pageSize = ref(15)
const page = ref(1)
const TOTAL = 64787

/**
 * Строки таблицы — те же осмотры, что в плитке: вид переключается, данные общие.
 * Содержимое колонок с макета `19601:29029`.
 */
const tableRows = computed(() => {
  const rows = inspections.map(card => ({
    id: card.id,
    cover: card.cover,
    name: card.name,
    address: card.address,
    // Одной строкой, как в ноде: имя, роль в скобках и дата блокировки.
    lockedBy: card.lockedBy,
    scheme: card.scheme,
    /**
     * Признаки. Тон каждого снят с ноды: «Отменен» красный `palette-06`,
     * «В архиве» приглушённый `fg/secondary`, «Мультиосмотр» основной текст,
     * «Нет» — приглушённая нейтраль.
     */
    attribute: card.marks.length || card.multi
      ? [
          ...card.marks.map(m => (m === 'cancelled'
            ? { text: 'Отменен', tone: 'danger' }
            : { text: 'В архиве', tone: 'secondary' })),
          ...(card.multi ? [{ text: 'Мультиосмотр', tone: 'default' }] : []),
        ]
      : [{ text: 'Нет', tone: 'muted' }],
    status: card.status,
    date: card.date,
    inspectionId: card.inspectionId,
    comment: card.comment,
    note: card.note,
  }))
  const dir = sortDir.value === 'asc' ? 1 : -1
  const sorted = [...rows].sort((a, b) => String(a[sortKey.value as 'name'] ?? '').localeCompare(String(b[sortKey.value as 'name'] ?? '')) * dir)
  return sorted.slice(0, pageSize.value)
})

/**
 * Применённые фильтры — ряд чипов над списком. Состав по продуктовым скринам:
 * одиночные значения, счётчиковый фильтр с несколькими значениями и диапазон
 * дат. Живые: крестик снимает, счётчик уменьшается, пустой фильтр исчезает.
 */
const appliedFilters = ref([
  { id: 'status', label: 'Статус', values: ['Осмотр не завершен'] },
  { id: 'archive', label: 'Особые свойства', values: ['В архиве'] },
  { id: 'multi', label: 'Особые свойства', values: ['Мультиосмотр'] },
  { id: 'client', label: 'Клиент', values: ['Альфа Страхование', 'ДомКлик', 'Ренесанс', 'РГС'] },
  {
    id: 'access',
    label: 'Группа доступа',
    values: [
      'АльфаСтрахование: Брокер КАССА',
      'АльфаСтрахование: Эксперты МРЦ',
      'Группа для тестирования Ренессанс.Осмотр бытовая техника',
      'Интеллект Софт: Тест',
      'Ренессанс: страхование гаджетов и бытовой техники',
      'MAINS-Ренессанс',
      'АльфаСтрахование: Разработка схем',
      'Домклик (Загородная недвижимость)',
    ],
  },
  { id: 'date', label: 'Дата создания', range: '25.03.24 — 26.04.24', values: [] },
])

function dropFilter(id: string) {
  appliedFilters.value = appliedFilters.value.filter(f => f.id !== id)
}

/** Снятие одного значения: последнее убирает и сам чип — фильтр стал пустым. */
function dropValue(id: string, value: string) {
  const f = appliedFilters.value.find(x => x.id === id)
  if (!f) return
  f.values = f.values.filter(v => v !== value)
  if (!f.values.length && !f.range) dropFilter(id)
}

/**
 * Выбранные карточки. Нужны не для красоты: пока не выбрано ничего, массовые
 * действия недоступны — в макете кнопка «ещё» нарисована именно выключенной.
 */
const selected = reactive<Record<number, boolean>>({})
const selectedCount = computed(() => Object.values(selected).filter(Boolean).length)

/**
 * Демо-открывашка попапов: `?open=bulk` и `?open=more`. Нужна приёмке —
 * headless-браузер снимает страницу без кликов, а показать раскрытый попап надо.
 * В продукте этого не будет.
 */
const route = useRoute()
if (route.query.open === 'bulk') bulkOpen.value = true
const chipOpen = computed(() => route.query.open === 'chip')

/**
 * Та же оснастка: `?only=8` оставляет в списке одну карточку. Нужна снимкам
 * состояний контролов поверх фото — headless снимает страницу от начала
 * документа, прокрутка ему недоступна.
 */
/** `?view=table` и `?selected=2,3` — вид и отметки для снимка; та же оснастка приёмки. */
if (route.query.view === 'table') view.value = 'table'
if (route.query.filters === 'collapsed') filtersCollapsed.value = true
if (route.query.rows) pageSize.value = Number(route.query.rows)

/** `?scroll=500` — прокрутка таблицы вбок для снимка закрепления. */
onMounted(() => {
  const x = Number(route.query.scroll)
  if (x) requestAnimationFrame(() => { const el = document.querySelector('[data-slot="table-view"]'); if (el) el.scrollLeft = x })
})
if (route.query.selected) String(route.query.selected).split(',').forEach((id) => { selected[Number(id)] = true })

const visibleCards = computed(() => {
  const only = route.query.only
  return only ? cards.filter(c => String(c.id) === String(only)) : cards
})
if (route.query.open === 'more') {
  moreOpen.value = true
  selected[1] = true
}

const statusFilters = ['Осмотр не завершён', 'Отправка на проверку', 'Проходит согласование', 'Требуется подтверждение', 'Экспертиза']
const propertyFilters = ['В архиве', 'Мультиосмотр', 'Отменен']
/** Список длиннее пяти — иначе «Показать все» нечем оживить: в макете он есть. */
const companyFilters = ['Альфа Страхование', 'ДомКлик', 'Ренесанс', 'РГС', 'Сбер', 'ВСК', 'Ингосстрах', 'Согласие', 'Тинькофф Страхование']
const accessFilters = [
  'АльфаСтрахование: Брокер КАССА',
  'АльфаСтрахование: Разработка схем',
  'АльфаСтрахование: Эксперты МРЦ',
  'Группа для тестирования Ренессанс.Осмотр бытовая техника',
  'Домклик (Загородная недвижимость)',
  'Интеллект Софт: Тест',
  'Ренессанс: страхование гаджетов и бытовой техники',
  'MAINS-Ренессанс',
]
/**
 * Свёрнутые группы — демо-контент самого макета: дизайнер положил их, чтобы
 * показать перенос длинного заголовка и свёрнутую группу с отметками внутри.
 * Содержимое наше, демонстрационное.
 */
const collapsedFilters = [
  { title: 'Длинный заголовок у пункта, который отображается в две строки', items: ['Первое значение', 'Второе значение', 'Третье значение'] },
  { title: 'Фильтр, который свернут и в нем есть отмеченные пункты', items: ['Отмеченное значение', 'Ещё одно отмеченное', 'Неотмеченное значение'] },
]

/** Отметки живые: без них не проверить ни «Выбрать все», ни свёрнутую группу с отметками. */
const checked = reactive<Record<string, boolean>>({
  'Отмеченное значение': true,
  'Ещё одно отмеченное': true,
  'Мультиосмотр': true,
})

/** «Показать все» и «Свернуть» — не подписи, а состояние: список режется до пяти. */
const SHORT = 5
const companyOpen = ref(false)
const accessOpen = ref(true)

function selectAll(list: readonly string[]) {
  const every = list.every(i => checked[i])
  list.forEach((i) => { checked[i] = !every })
}
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground">
    <!--
      Тёмный слой: шапка во всю ширину и рельс под ней. Внутри действуют только
      sidebar-токены — правило порталов сайдбара.
    -->
    <header
      data-slot="app-bar"
      class="flex h-14 items-center gap-6 bg-sidebar px-4 text-sidebar-foreground"
    >
      <!-- @debt Логотипа нет: логотипы РИР исключены из скоупа, логотип Рососмотра не отрисован. -->
      <span class="text-xl font-bold tracking-widest text-sidebar-active-foreground">VIEWAPP</span>

      <div class="ml-auto flex items-center gap-6 pr-4">
        <button type="button" class="flex items-center gap-2 text-sm outline-none">
          RU
          <Icon name="chevron-down" :size="8" />
        </button>

        <button type="button" class="flex items-center gap-2 text-sm outline-none">
          <Avatar type="letter" letter="Ш" :size="32" />
          Шипилов Михаил
          <Icon name="chevron-down" :size="8" />
        </button>

        <button type="button" aria-label="Выйти" class="flex outline-none">
          <Icon name="logout" :size="24" />
        </button>
      </div>
    </header>

    <div class="flex min-h-[calc(100vh-56px)]">
      <!-- Рельс: компактное меню Атома. У него 56 против 84 на макете — расхождение записано. -->
      <Menu compact class="shrink-0 py-2">
        <template v-for="(group, gi) in railGroups" :key="gi">
          <span v-if="gi > 0" class="my-2 h-px bg-sidebar-active" />
          <MenuItem
            v-for="item in group"
            :key="item.label"
            :selected="'selected' in item ? item.selected : false"
            :title="item.label"
          >
            <template #icon>
              <Icon :name="item.icon" :size="24" />
            </template>
            {{ item.label }}
          </MenuItem>
        </template>
      </Menu>

      <!-- Контент: колонка списка и колонка фильтров 348, зазор 24. -->
      <!--
        Две колонки флексом, а не сеткой: у сетки высокая колонка фильтров
        растягивала строки списка и между панелью действий и карточками
        появлялась дыра в полтораста пикселей.
      -->
      <div class="flex min-w-0 flex-1 flex-col gap-6 px-8 py-6">
        <!--
          Строка шапки идёт во всю ширину: кнопка сворачивания стоит справа и
          при свёрнутых фильтрах остаётся на месте — так на обоих кадрах макета.
        -->
        <div class="flex items-start gap-6">
        <!-- Шапка списка. -->
        <div data-slot="page-header" class="flex h-11 min-w-0 flex-1 items-center gap-4">
          <!-- Заголовок прижат к верху строки, соседи центрированы — так в макете. -->
          <h1 class="self-start text-4xl font-bold">
            Мои осмотры
          </h1>

          <Switch v-model="autoUpdate" class="w-auto">
            Автообновление списка
          </Switch>

          <!-- Текст подсказки — с макета: инстанс Tooltip 19512:17509 на соседнем кадре. -->
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  aria-label="Подсказка"
                  class="flex text-foreground-secondary outline-none transition-colors hover:text-foreground"
                >
                  <Icon name="help" :size="24" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Список осмотров обновляется каждые 60 секунд
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <!--
            Переключатель вида. Ближайшее системное — вкладки-таблетки. В макете
            это сегментированный контрол: подложка secondary, активная плашка
            белая. Расхождение записано.
          -->
          <Tabs v-model="view" class="ml-auto">
            <TabsList variant="pill" class="rounded-lg bg-secondary p-1">
              <!--
                Глиф 18, а не 24: коробка пикты в макете 24×24, но видимый контур
                внутри — 18×16 у списка и 18×18 у карточек. Размер задан по
                контуру эталона, как у крестика чипа.
              -->
              <TabsTrigger value="table" variant="pill" class="h-9 w-10 rounded-sm px-0">
                <Icon name="view-list" :size="18" />
              </TabsTrigger>
              <TabsTrigger value="cards" variant="pill" class="h-9 w-10 rounded-sm px-0">
                <Icon name="view-cards" :size="18" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

          <div class="w-87 shrink-0">
            <FilterPanelToggle v-model:collapsed="filtersCollapsed" />
          </div>
        </div>

        <div class="flex min-w-0 gap-6">
          <div class="flex min-w-0 flex-1 flex-col gap-6">


        <!--
          Применённые фильтры. Ряд переносится на вторую строку сам: чипы —
          инлайновые элементы во flex-wrap, ширины никто не считает.
        -->
        <div
          v-if="appliedFilters.length"
          data-slot="applied-filters"
          class="flex flex-wrap items-center gap-2"
        >
          <FilterChip
            v-for="f in appliedFilters"
            :key="f.id"
            :label="f.label"
            :values="f.values"
            :range="f.range"
            :default-open="chipOpen && f.id === 'access'"
            @remove="dropFilter(f.id)"
            @remove-value="dropValue(f.id, $event)"
          />

          <ButtonAction :show-icon="false" @click="appliedFilters = []">
            Сбросить все
          </ButtonAction>
        </div>

        <!-- Панель действий над списком. -->
        <div
          data-slot="list-toolbar"
          class="flex h-19 items-center gap-10 rounded-xl bg-secondary py-4 pr-4 pl-4"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <!--
              Массовые действия: чекбокс плюс шеврон-кнопка в держателе 24×24 —
              ровно так собран `select_container` макета (16 + 24, шеврон 11×6.6).
              API `Checkbox` не трогаем: кнопка живёт рядом, как держатель иконки
              у `Alert` и `SelectItem`.
            -->
            <span class="relative flex items-center">
              <span class="flex h-6 w-4 items-center">
                <Checkbox />
              </span>

              <button
                type="button"
                aria-label="Массовые действия"
                :aria-expanded="bulkOpen"
                class="flex size-6 items-center justify-center rounded-xs text-foreground-secondary outline-none transition-colors hover:bg-secondary-hover"
                @click="bulkOpen = !bulkOpen"
              >
                <Icon name="chevron-down" :size="11" />
              </button>

              <!--
                Плашка позиционируется локально — тот же приём, что у календаря
                внутри DatePicker: absolute плюс сам Popover без своей раскладки.
              -->
              <!-- 348 — по самой длинной строке меню: ширины по содержимому у Popover нет. -->
              <Popover v-if="bulkOpen" :width="348" class="absolute top-8 left-0 z-50 p-1">
                <SelectItem
                  v-for="action in selectionModes"
                  :key="action"
                  @click="bulkOpen = false"
                >
                  {{ action }}
                </SelectItem>
              </Popover>
            </span>

            <div class="flex min-w-0 flex-1 items-center gap-3">
              <Input
                v-model="search"
                variant="elevated"
                placeholder="Наименование объекта или схемы, компания, агент, номеру телефона, имя пользователя"
                class="min-w-0 flex-1"
              />
              <IconButton variant="ghost" size="lg" label="Обновить">
                <Icon name="refresh" :size="20" />
              </IconButton>
            </div>

            <div class="flex shrink-0 flex-col">
              <span class="text-sm font-bold">Найдено 64 787</span>
              <span class="text-sm text-foreground-secondary">Выбрано {{ selectedCount }}</span>
            </div>
          </div>

          <!--
            Размеры глифов сняты с макета по видимому контуру внутри коробки 24:
            «ещё» 20×20, скачать 16×16, гео 16×19.3. Одинаковыми они только
            выглядят — в макете они разные.
          -->
          <div class="flex shrink-0 items-center gap-2">
            <!--
              Композиция та же, что у режимов выбора: кнопка плюс Popover со
              строками SelectItem. Выключена, пока ничего не выбрано, — так
              нарисовано в макете.
            -->
            <span class="relative flex">
              <IconButton
                size="lg"
                label="Ещё"
                :disabled="selectedCount === 0"
                :aria-expanded="moreOpen"
                @click="moreOpen = !moreOpen"
              >
                <Icon name="pending" :size="20" />
              </IconButton>

              <Popover v-if="moreOpen" :width="348" class="absolute top-12 right-0 z-50 p-1">
                <SelectItem
                  v-for="action in moreActions"
                  :key="action"
                  @click="moreOpen = false"
                >
                  {{ action }}
                </SelectItem>
              </Popover>
            </span>
            <IconButton size="lg" label="Скачать">
              <Icon name="download" :size="16" />
            </IconButton>
            <IconButton size="lg" label="На карте">
              <Icon name="location" :size="19.3" />
            </IconButton>
          </div>
        </div>

        <!-- Сетка карточек: две колонки, зазор 24. -->
        <!--
          Сетка резиновая, а не двухколоночная: карточка не тянется безгранично,
          колонок столько, сколько влезает по минимальной ширине 360 (габарит
          карточки в макете). Две колонки макета — частный случай узкого окна.
          Правило — в naming.md, «Ширину задаёт карточка, а не число колонок».

          items-start: карточки не тянутся до высоты строки, в макете они разной высоты.
        -->
        <div
          v-if="view === 'cards'"
          data-slot="cards-list"
          class="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] items-start gap-6"
        >
          <article
            v-for="card in visibleCards"
            :key="card.id"
            :id="`card-${card.id}`"
            data-slot="inspection-card"
            class="group/card flex flex-col gap-2 rounded-xl scroll-mt-6"
          >
            <!-- Обложка: чекбокс слева сверху, метки поверх. -->
            <div class="relative overflow-hidden rounded-xl">
              <Image ratio="16:10" :src="card.cover || undefined" alt="" zoom />

              <!--
                Подложки под чекбоксом нет — решение владельца от 2026-08-17:
                в макете под ним светлая плашка 48×48, она убрана. Запись — в
                figma-fixes.md, «Сознательные отклонения».
              -->
              <span class="absolute top-4 left-4 flex">
                <Checkbox v-model="selected[card.id]" on-image />
              </span>

              <!--
                Метки. В Атоме у `Badge` иконки нет вовсе, а цвет — семантическая
                роль, не палитра. Поэтому «Мультиосмотр» стоит на нейтральной
                роли, а не на фиолетовой рампе макета. Обе строки — в таблице.
              -->
              <span v-if="card.multi" class="absolute top-4 right-4">
                <Badge variant="neutral">Мультиосмотр</Badge>
              </span>

              <span class="absolute bottom-4 left-4 flex gap-2">
                <Badge v-if="card.marks.includes('cancelled')" variant="destructive">Отменён</Badge>
                <Badge v-if="card.marks.includes('archived')" variant="warning">В архиве</Badge>
              </span>
            </div>

            <!-- Сведения. -->
            <div class="flex flex-col gap-1">
              <span class="flex items-center gap-1">
                <Icon v-if="card.locked" name="lock" :size="14" class="text-primary" />
                <Hyperlink href="#" variant="accent">Номер оферты: 6323756800-нкл</Hyperlink>
              </span>

              <div class="flex items-start gap-9">
                <!-- Статус и дата идут вплотную: в макете блок 40 при двух строках по 20. -->
                <div class="flex min-w-0 flex-1 flex-col">
                  <StatusBadge :color="card.status.color">
                    {{ card.status.text }}
                  </StatusBadge>
                  <span class="text-sm text-foreground-secondary">3 фев, 2023 (пт), 06:49</span>
                </div>

                <span class="flex shrink-0 items-center gap-1 text-sm text-foreground-secondary">
                  ID 186 243
                  <IconButton variant="ghost" size="sm" label="Скопировать ID">
                    <Icon name="copy" :size="16" />
                  </IconButton>
                </span>
              </div>

              <span class="truncate text-sm text-foreground-secondary">
                РФ, Ульяновская область, Сурский район, р.п....
              </span>
            </div>

            <!-- Блок блокировки. -->
            <div v-if="card.user" class="flex items-center gap-2">
              <Avatar type="letter" variant="soft" :letter="card.user.letter" :size="40" />
              <span class="flex min-w-0 flex-col">
                <span class="flex items-baseline gap-2">
                  <span class="truncate text-sm font-bold">{{ card.user.name }}</span>
                  <span class="shrink-0 text-xs text-foreground-secondary">{{ card.user.role }}</span>
                </span>
                <span class="text-sm text-foreground-secondary">Заблокировал в 14:44, 14 мая 2024</span>
              </span>
            </div>

            <span v-if="card.blockAction">
              <Button variant="secondary" size="sm">Заблокировать за мной</Button>
            </span>
          </article>
        </div>

        <!--
          Табличный вид. Состав, порядок и ширины колонок — с макета 19601:29029.
          Первые две колонки зафиксированы, остальные уезжают под горизонтальный
          скролл: сумма ширин 1776 при видимой области 1372 — так и в макете.
        -->
        <Table v-else data-slot="table-view">
            <TableRow>
              <!-- В шапке на месте чекбокса — кнопка настройки колонок, как в макете. -->
              <!--
                Колонка чекбокса: ширина 32 с макета, отступ слева 16 — по одной
                оси с чекбоксом «выбрать все» в панели поиска. Шестерёнке нужен
                свой бокс 24, иначе её режет край колонки.
              -->
              <TableHead variant="column" :sticky="0" class="w-12 shrink-0 items-center pr-0 pl-4">
                <button
                  type="button"
                  aria-label="Настроить колонки"
                  class="flex size-6 items-center justify-center text-primary outline-none"
                >
                  <Icon name="settings" :size="20" />
                </button>
              </TableHead>

              <TableHead
                v-for="col in tableColumns"
                :key="col.key"
                variant="column"
                :sticky="col.key === 'name' ? 48 : false"
                :divider="col.key === 'name'"
                :class="[col.width, 'px-4']"
                :sort="col.sortable ? (sortKey === col.key ? sortDir : 'none') : null"
                @sort="toggleSort(col.key)"
              >
                {{ col.title }}
              </TableHead>
            </TableRow>

            <TableRow
              v-for="row in tableRows"
              :key="row.id"
              interactive
              :state="selected[row.id] ? 'selected' : 'default'"
            >
              <!-- Чекбокс и название закреплены: правый край названия несёт границу. -->
              <TableCell variant="slot" :size="72" :sticky="0" class="w-12 shrink-0 pr-0 pl-4">
                <Checkbox v-model="selected[row.id]" />
              </TableCell>

              <!-- Название: превью 56 с радиусом 8 и две строки подписи. -->
              <TableCell variant="slot" :size="72" :sticky="48" divider class="w-70 gap-4 px-4">
                <Image ratio="1:1" :src="row.cover || undefined" alt="" class="w-14 shrink-0 rounded-md" />
                <!-- Три строки: в макете текстовый узел ячейки 184×60, то есть три строки по 20. -->
                <span class="line-clamp-3 text-sm">{{ row.name }}, {{ row.address }}</span>
              </TableCell>

              <TableCell variant="slot" :size="72" class="w-60 px-4">
                <span v-if="row.lockedBy" class="line-clamp-2 text-sm">{{ row.lockedBy }}</span>
                <Button v-else variant="secondary" :show-icon="false">
                  Заблокировать за мной
                </Button>
              </TableCell>

              <TableCell variant="slot" :size="72" class="w-60 px-4">
                <span class="line-clamp-2 text-sm">{{ row.scheme }}</span>
              </TableCell>

              <TableCell variant="slot" :size="72" class="w-33 px-4">
                <span class="flex flex-col text-sm">
                  <span v-for="a in row.attribute" :key="a.text" :class="attributeTone[a.tone]">{{ a.text }}</span>
                </span>
              </TableCell>

              <!-- Статус: та же плашка, что в карточке, плюс дата второй строкой. -->
              <TableCell variant="slot" :size="72" class="w-60 flex-col items-start justify-center gap-0 px-4">
                <StatusBadge :color="row.status.color">
                  {{ row.status.text }}
                </StatusBadge>
                <span class="text-sm text-foreground-secondary">{{ row.date }}</span>
              </TableCell>

              <TableCell variant="slot" :size="72" class="w-33 px-4">
                <span class="text-sm">{{ row.inspectionId }}</span>
              </TableCell>

              <TableCell variant="slot" :size="72" class="w-60 px-4">
                <span class="line-clamp-2 text-sm">{{ row.comment }}</span>
              </TableCell>

              <TableCell variant="slot" :size="72" class="w-60 px-4">
                <span class="line-clamp-2 text-sm">{{ row.note }}</span>
              </TableCell>
            </TableRow>
        </Table>

        <!--
          Подвал: пагинация слева, счётчик диапазона, переключатель размера
          страницы справа. Композиция снята с узла table_footer 19601:29081.
        -->
        <TableFooter
          v-model:page="page"
          v-model:page-size="pageSize"
          :pages="Math.ceil(TOTAL / pageSize)"
          :total="TOTAL"
        />

        </div>

        <!-- Колонка фильтров: ширина 348 с макета, не резиновая. -->
        <FilterPanel v-model:collapsed="filtersCollapsed">
          <section class="flex flex-col gap-6 rounded-xl bg-card p-4">
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-lg font-bold">
                  Сохраненные отборы
                </h2>
                <Icon name="chevron-up" :size="24" class="text-foreground-secondary" />
              </div>
              <p class="text-sm text-foreground-secondary">
                Сохранённых поисков пока нет
              </p>
            </div>

            <Button variant="secondary" wide :show-icon="false">
              Сохранить текущий поиск
            </Button>
          </section>

          <section class="flex flex-col gap-6 rounded-xl bg-card p-4">
            <div class="flex items-center justify-between gap-3">
              <!--
                Ступень выше заголовков групп: у групп 20 (аккордеон sm), значит
                у панели 24. В макете панель 17, то есть мельче групп — иерархия
                там перевёрнута. Решение владельца от 2026-08-18.
              -->
              <h2 class="text-2xl font-bold">
                Фильтры
              </h2>
              <ButtonAction :show-icon="false">
                Показать все
              </ButtonAction>
            </div>

            <!--
              Ритм группы снят с макета: заголовок 24 → 4 → «Выбрать все» 16 →
              8 → пункты, между пунктами 8. У аккордеона паддинг тела 12, поэтому
              содержимое подтянуто на 8 — расхождение записано строкой.
            -->
            <Accordion size="sm" default-open>
              <template #title>
                Статус
              </template>
              <div class="-mt-2 flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm" @click="selectAll(statusFilters)">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in statusFilters" :key="f" v-model="checked[f]">
                  {{ f }}
                </Checkbox>
              </div>
            </Accordion>

            <Accordion size="sm" default-open>
              <template #title>
                Дата создания
              </template>
              <!--
                Хвостовые часы у пикера гасятся слотом: у Атома в поле даты два
                глифа, календарь и часы, а в макете фильтра только календарь.
              -->
              <div class="-mt-2 flex items-center gap-2 pt-1">
                <DatePicker placeholder="дд.мм.гггг" class="min-w-0 flex-1">
                  <template #trailing>
                    <span />
                  </template>
                </DatePicker>
                <span class="text-foreground-secondary">—</span>
                <DatePicker placeholder="дд.мм.гггг" class="min-w-0 flex-1">
                  <template #trailing>
                    <span />
                  </template>
                </DatePicker>
              </div>
            </Accordion>

            <Accordion size="sm" default-open>
              <template #title>
                Особые свойства
              </template>
              <div class="-mt-2 flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm" @click="selectAll(propertyFilters)">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in propertyFilters" :key="f" v-model="checked[f]">
                  {{ f }}
                </Checkbox>
              </div>
            </Accordion>

            <!-- «Показать все» здесь живое: список режется до пяти и разворачивается. -->
            <Accordion size="sm" default-open>
              <template #title>
                Компания
              </template>
              <div class="-mt-2 flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm" @click="selectAll(companyFilters)">
                  Выбрать все
                </ButtonAction>
                <Checkbox
                  v-for="f in (companyOpen ? companyFilters : companyFilters.slice(0, SHORT))"
                  :key="f"
                  v-model="checked[f]"
                >
                  {{ f }}
                </Checkbox>
                <ButtonAction
                  v-if="companyFilters.length > SHORT"
                  :show-icon="false"
                  size="sm"
                  @click="companyOpen = !companyOpen"
                >
                  {{ companyOpen ? 'Свернуть' : 'Показать все' }}
                </ButtonAction>
              </div>
            </Accordion>

            <Accordion v-for="group in collapsedFilters" :key="group.title" size="sm">
              <template #title>
                {{ group.title }}
              </template>
              <div class="-mt-2 flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm" @click="selectAll(group.items)">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in group.items" :key="f" v-model="checked[f]">
                  {{ f }}
                </Checkbox>
              </div>
            </Accordion>

            <Accordion size="sm" default-open>
              <template #title>
                Группа доступа
              </template>
              <div class="-mt-2 flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm" @click="selectAll(accessFilters)">
                  Выбрать все
                </ButtonAction>
                <Checkbox
                  v-for="f in (accessOpen ? accessFilters : accessFilters.slice(0, SHORT))"
                  :key="f"
                  v-model="checked[f]"
                >
                  {{ f }}
                </Checkbox>
                <ButtonAction
                  v-if="accessFilters.length > SHORT"
                  :show-icon="false"
                  size="sm"
                  @click="accessOpen = !accessOpen"
                >
                  {{ accessOpen ? 'Свернуть' : 'Показать все' }}
                </ButtonAction>
              </div>
            </Accordion>
          </section>
        </FilterPanel>
        </div>
      </div>
    </div>
  </div>
</template>
