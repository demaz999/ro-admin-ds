<script setup lang="ts">
import type { RegressStep, ScaleForm } from '~/components/ui/regress-scale'
import { computed, nextTick, ref, watch } from 'vue'
import { addMonths, createModel, monthLabel, TABS, type Dataset, type GroupMode, type PeriodStatus, type Price, type RowBadge, type SaveState, type SchemeMode, type TabId } from '~/stands/tariffs/model'
import demo from '~/stands/tariffs/demo-data.json'

/**
 * Страница «Тарификация» (Биллинг 2.0, VA-14629) — стенд; порции П1 (такт 77) и П2 (такт 78), план — `docs/tariffs.md`,
 * раздел 10.
 *
 * Вид и структура — макеты Figma (`docs/sources/tariffs/figma-nodes.md`), поведение и тексты — `spec.md`.
 * На странице — только компоненты кита и классы раскладки (`CLAUDE.md`, «Сборка страниц»).
 *
 * ## Что собрано
 *
 * П1: каркас `layouts/admin.vue` (№ 1), «Назад» (№ 2), заголовок (№ 3), «Сохранить изменения» с иконкой и загрузкой (№ 6),
 * статус автосохранения (№ 7), вкладки с иконками и счётчиками (№ 8).
 *
 * П2: шапка закреплена сверху — слот `header` каркаса (§11, строка 60 реестра); «Как считается стоимость» (№ 9); вкладка
 * «Базовые настройки» целиком — блоки на `Card` (№ 11), заголовки с подписью и рубильником (№ 12), минимальная сумма (№ 13),
 * базовая стоимость схемы с парой цен (№ 14, 15), подсказка тоном предупреждения (№ 16), рубильник общей шкалы (№ 17),
 * шкала с формой (№ 18, 19), учёт прогресса (№ 20), числовой ввод цен (№ 52), ошибка «До» меньше «От» (№ 53).
 *
 * П3: вкладка «Типы объектов» — блок с «Добавить тип объекта» (№ 21), таблица типов на `Table` с раскрытием, парой цен,
 * рубильником шкалы и удалением (№ 22), шкала типа в раскрытой строке (№ 23), выбор типа из справочника с поиском (№ 24),
 * удаление с «Отменить» (№ 25, 56), пустой список (№ 26).
 * П4 (такт 80): вкладка «Схемы осмотра» — группы на `Card` с метками `Badge appearance="outline"`, вилкой `PriceRange` и
 * «Настроить группу» (№ 27–29); строки схем — `Card tone="muted" size="sm"`, устаревшая — `dimmed` (№ 30, 31); пустая
 * группа — `Empty` (№ 57). Панель группы — `ModalCard` edge (№ 32): режимы — `RadioGroupItem variant="card"` со слотом
 * `panel` (№ 33), фиксированная цена — `PricePair` (№ 34), шкала — `RegressScale` (№ 35), «Схемы в группе» — `Table`
 * только для чтения (№ 36). Переключатель периода — П6.1.
 * П5 (такт 81): панель схемы — шестерёнка строки схемы (№ 37): шапка с именем группы, имя схемы, идентификатор с
 * копированием, вкладки панели; «Ценообразование» — режимы схемы с телом выбранного (№ 38–40) и «Процессы» с ценами
 * повторяемых процессов (№ 41); «Типы объектов» — глобальные цены только для чтения с «Настроить индивидуально» (№ 42),
 * индивидуальные цены с «Сбросить к глобальным» и «Добавить тип объекта» (№ 43, 56).
 * П6.1 (такт 82): переключатель периода `PeriodSwitcher` в шапке со списком периодов и «Запланировать изменение цен» (№ 4,
 * 5); окно планирования — `ModalCard` center с сеткой месяцев и лет на `Button` (№ 44, 45); плашка черновика — `Callout
 * tone="warning"` с «Удалить черновик» и окном подтверждения (№ 10, 46); архив — только просмотр: оси `readonly` у полей,
 * пар, шкал, рубильников и режимов, действия правки закрыты `inert`, плашка «Архивный тариф — только просмотр», статуса
 * сохранения и «Сохранить изменения» нет (№ 47).
 * П6.2 (такт 83): «Сохранить изменения» через окна 6.4 — «Применить изменения?» (№ 48), «Тариф находится в очереди» со
 * списком периодов и метками «Изменяется», «Затронет» (№ 49), «Дата занята действующим тарифом» со значком в шапке и
 * необратимым вариантом тоном ошибки (№ 50), «На эту дату уже запланирован тариф» с заметкой (№ 51) — `ModalCard` center;
 * загрузка страницы — `Skeleton` по блокам (№ 54); отказ применения — уведомление об ошибке, правки на месте (№ 55).
 *
 * ## Поведение — модель `~/stands/tariffs/model.ts`
 *
 * Страница переводит модель в пропы компонентов, события компонентов — в операции модели.
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | без параметров | «Демо Страхование»: архив, текущий тариф, запланированный, черновик; выбран текущий |
 * | `?tab=base` · `types` · `schemes` | вкладка при загрузке |
 * | `?save=saving` | статус «Сохранение…» без завершения записи |
 * | `?save=error` | статус «Ошибка сохранения» с «Повторить» |
 * | `?now=ГГГГ-ММ` | часы модели: от них считаются статусы и сроки периодов |
 * | `?data=empty` | компания без типов объектов, группа без схем |
 * | `?scale=on` | общая регресс-шкала включена (такт 78) |
 * | `?open=help` | открыта подсказка «Как считается стоимость» (такт 78) |
 * | `?expand=<id типа>` | раскрыта строка типа объекта, через запятую — несколько; без `?tab=` — вкладка «Типы объектов» (такт 79) |
 * | `?open=type-picker` | открыт выбор типа из справочника; без `?tab=` — вкладка «Типы объектов» (такт 79) |
 * | `?open=group` | открыта панель группы; без `?tab=` — вкладка «Схемы осмотра» (такт 80) |
 * | `?group=<id группы>` | какая группа открыта: `g-kasko`, `g-osago`, `g-realty`; без параметра — первая (такт 80) |
 * | `?mode=company` · `fixed` · `scale` | режим открытой группы — как данные, правка не пишется (такт 80) |
 * | `?open=scheme` | открыта панель схемы; без `?tab=` — вкладка «Схемы осмотра» (такт 81) |
 * | `?scheme=<id схемы>` | какая схема открыта: `s-car`, `s-moto`, `s-pre`, `s-vehicle`, `s-trailer`, `s-flat`, `s-house`; без параметра — первая (такт 81) |
 * | `?panel=pricing` · `types` | вкладка панели схемы (такт 81) |
 * | `?mode=group` · `individual` · `scale` | режим открытой схемы — как данные, правка не пишется (такт 81) |
 * | `?period=current` · `planned` · `draft` · `archive` | выбранный период при загрузке (такт 82) |
 * | `?open=periods` | открыт список периодов (такт 82) |
 * | `?open=plan` | открыто окно «Планирование новых тарифов»; выбран месяц после текущего (такт 82) |
 * | `?open=delete-draft` | открыто окно «Удалить черновик?»; без `?period=` выбран черновик (такт 82) |
 * | `?open=apply` | открыто окно «Применить изменения?»; без `?period=` выбран последний тариф очереди (такт 83) |
 * | `?open=queue` | открыто окно «Тариф находится в очереди»; без `?period=` выбран текущий (такт 83) |
 * | `?queue=this` · `all` | выбор в окне очереди (такт 83) |
 * | `?open=occupied` | окно «Дата занята действующим тарифом»: черновик — со следующего месяца, внутри текущего тарифа (такт 83) |
 * | `?open=conflict` | окно «На эту дату уже запланирован тариф»: черновик — с месяца запланированного (такт 83) |
 * | `?choice=overwrite` · `replace` | второй вариант окна «Дата занята» или «Уже запланирован» (такт 83) |
 * | `?state=loading` | загрузка страницы: скелетон вместо блоков (такт 83) |
 * | `?save=fail` | «Сохранить изменения» отказывает: уведомление, правки на месте (такт 83) |
 */
definePageMeta({ layout: false })
useHead({ title: 'Тарификация — стенд' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')

const OPEN_AT_LOAD = ['help', 'type-picker', 'group', 'scheme', 'periods', 'plan', 'delete-draft', 'apply', 'queue', 'occupied', 'conflict']
const openAtLoad = OPEN_AT_LOAD.find(s => s === q('open'))
const expandAtLoad = q('expand') ? q('expand').split(',').filter(Boolean) : []
/* Выбор типа и раскрытая строка живут на «Типах объектов»: без `?tab=` оснастка такта 79 открывает эту вкладку. */
const tabAtLoad = TABS.find(t => t.id === q('tab'))?.id
  ?? (openAtLoad === 'type-picker' || expandAtLoad.length ? 'types' : openAtLoad === 'group' || openAtLoad === 'scheme' ? 'schemes' : undefined)
const MODES: (GroupMode | SchemeMode)[] = ['company', 'fixed', 'scale', 'group', 'individual']
const saveAtLoad = (['saving', 'error'] as SaveState[]).find(s => s === q('save'))
const periodAtLoad = (['current', 'planned', 'draft', 'archive'] as PeriodStatus[]).find(s => s === q('period'))
const m = createModel(demo as unknown as Dataset, {
  data: q('data') === 'empty' ? 'empty' : 'main',
  tab: tabAtLoad,
  save: saveAtLoad,
  now: q('now') || undefined,
  scale: q('scale') === 'on',
  open: openAtLoad,
  expand: expandAtLoad,
  group: q('group') || undefined,
  mode: MODES.find(x => x === q('mode')),
  scheme: q('scheme') || undefined,
  panel: q('panel') === 'types' ? 'types' : q('panel') === 'pricing' ? 'pricing' : undefined,
  period: periodAtLoad,
  queue: q('queue') === 'this' ? 'this' : q('queue') === 'all' ? 'all' : undefined,
  choice: q('choice') === 'overwrite' ? 'overwrite' : q('choice') === 'replace' ? 'replace' : undefined,
  loading: q('state') === 'loading',
  saveFail: q('save') === 'fail',
})

const tab = computed<string>({ get: () => m.ui.tab, set: v => m.setTab(v as TabId) })
const base = computed(() => m.view.value.base)

/** Минимальная сумма за период (№ 13): пустое — минималка не применяется (§7); числовой ввод — № 52. */
const minPayment = computed({
  get: () => (base.value.minPayment ?? '').toString(),
  set: (v: string) => { m.set('base.minPayment', v === '' ? null : Number(v)) },
})

/** Пара базовой цены (№ 14, 15): замок и правила пары — операция модели `setPrice`. */
const setBasePrice = (patch: Partial<Price>) => m.setPrice('base.price', patch)

/** Общая регресс-шкала (№ 17–19): включение, форма, ступени; удаление ступени — уведомление с «Отменить». */
const scaleOn = computed({
  get: () => base.value.scale.on,
  set: (v: boolean) => { m.setScale('base.scale', { on: v }) },
})
const scaleSteps = computed({
  get: () => base.value.scale.steps,
  set: (v: RegressStep[]) => { m.setScale('base.scale', { steps: v }) },
})
const scaleForm = computed({
  get: () => base.value.scale.form,
  set: (v: ScaleForm) => { m.setScale('base.scale', { form: v }) },
})

/** Учёт прогресса (№ 20): сквозной по умолчанию (§5, §11). */
const counter = computed({
  get: () => base.value.counter,
  set: (v: string) => { m.set('base.counter', v) },
})

/** Подсказка пары: при включённой шкале — тон предупреждения (№ 16, Figma `31767:8639`). */
const BASE_HINT = 'Применяется к схеме осмотра по умолчанию, если не заданы индивидуальная цена, регресс-шкала или стоимость по типу объекта.'
const SCALE_HINT = 'Не применяется при включённой регресс-шкале. Выключите общую регресс-шкалу для переключения на базовую стоимость'

/**
 * «Как считается стоимость» (№ 9) — порядок поиска цены по §4 (6.1; строка 11 реестра: порядок макета `31650:7781`
 * заменён порядком сводки). Итог с повторяемыми процессами — ждут людей, п. 2 (строка 14).
 */
const HELP_ORDER = [
  { title: 'Цена типа объекта в схеме', note: 'Максимум по этапам — панель схемы' },
  { title: 'Индивидуальная цена схемы', note: 'Панель схемы, «Ценообразование»' },
  { title: 'Цена группы схем', note: 'Панель «Настройка группы»' },
  { title: 'Цена типа объекта', note: 'Максимум по этапам — вкладка «Типы»' },
  { title: 'Базовая цена компании', note: 'Вкладка «Базовые настройки»' },
]
const helpOpen = computed({ get: () => m.ui.open === 'help', set: (v: boolean) => m.setOpen(v ? 'help' : '') })

/** Счётчик вкладки (№ 8): у «Базовых настроек» его нет. */
const countOf = (id: TabId) => (id === 'types' ? m.counts.value.types : id === 'schemes' ? m.counts.value.schemes : undefined)

/* ------------------------------ «Типы объектов» — П3, такт 79 ------------------------------ */
/** Подпись блока — по §3 (строка 12 реестра): режима «По типам объектов» в сводке нет. */
const TYPES_DESCRIPTION = 'Глобальные цены по типам объектов. Применяются во всех схемах, где для типа не задана индивидуальная цена'

/** Строки таблицы типов (№ 22): тип справочника, пара, шкала, раскрытие. */
const typeRows = computed(() => m.view.value.objectTypes.map(t => ({
  id: t.typeId,
  name: m.typeOf(t.typeId)?.name ?? t.typeId,
  icon: m.typeOf(t.typeId)?.icon ?? 'package',
  price: t.price,
  scale: t.scale,
  expanded: m.ui.expanded.includes(t.typeId),
})))

/** Пара цен типа (№ 22): правила пары — `setPrice` модели по пути типа. */
function setTypePrice(id: string, patch: Partial<Price>) {
  const path = m.typePath(id)
  if (path) m.setPrice(`${path}.price`, patch)
}
/** Шкала типа (№ 23): ступени и форма — `setScale` модели; удаление ступени — уведомление с «Отменить». */
function setTypeScale(id: string, patch: { steps?: RegressStep[], form?: ScaleForm }) {
  const path = m.typePath(id)
  if (path) m.setScale(`${path}.scale`, patch)
}
function typeStepRemoved(id: string, previous: RegressStep[]) {
  const path = m.typePath(id)
  if (path) m.stepRemoved(`${path}.scale`, previous)
}

/**
 * Выбор типа из справочника (№ 24) — композиция раздела 4: `ButtonAction` + `Popover` + `SelectContent` с поиском `Input`
 * и пунктами `SelectItem`; пустой поиск — `Empty` «Ничего не найдено». Клавиатура: стрелки по пунктам, Enter добавляет.
 */
const pickerOpen = computed({
  get: () => m.ui.open === 'type-picker',
  set: (v: boolean) => { m.setOpen(v ? 'type-picker' : '') },
})
const typeQuery = ref('')
const activeType = ref(-1)
const pickerList = computed(() => m.pickerTypes(typeQuery.value))
watch(pickerOpen, (v) => { if (v) { typeQuery.value = ''; activeType.value = -1 } })
watch(typeQuery, () => { activeType.value = -1 })
function pickType(id: string) {
  m.addType(id)
  pickerOpen.value = false
}
function onPickerKeydown(e: KeyboardEvent) {
  const n = pickerList.value.length
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!n) return
    activeType.value = e.key === 'ArrowDown' ? (activeType.value + 1) % n : (activeType.value - 1 + n) % n
    /* Пункт длинного списка — в видимую часть области прокрутки (ловушка такта 63). */
    nextTick(() => document.querySelector(`[data-type-option="${pickerList.value[activeType.value]?.id}"]`)?.scrollIntoView({ block: 'nearest' }))
  }
  else if (e.key === 'Enter' && activeType.value >= 0 && pickerList.value[activeType.value]) {
    e.preventDefault()
    pickType(pickerList.value[activeType.value]!.id)
  }
}

/* ------------------------------ «Схемы осмотра» и панель группы — П4, такт 80 ------------------------------ */
/**
 * Тон метки — строка 25 реестра (решение оркестратора 3): режимы — `default`, «Новая» — `warning`, счёт и признаки —
 * `neutral`; расширенная палитра не берётся.
 */
const BADGE_TONE: Record<RowBadge['kind'], 'default' | 'warning' | 'neutral'> = { mode: 'default', new: 'warning', flag: 'neutral', count: 'neutral' }

/** Группы со схемами (№ 27, 30): метки по 6.6, вилки по 6.5. */
const groupRows = computed(() => m.view.value.groups.map(g => ({
  id: g.id,
  name: g.name,
  badges: m.groupBadges(g.id),
  range: m.groupRange(g.id),
  schemes: m.schemesOf(g.id).map(x => ({
    id: x.id,
    name: x.name,
    badges: m.schemeBadges(x.id),
    range: m.schemeRange(x.id),
    outdated: x.flags.includes('outdated'),
  })),
})))

/** Панель группы (№ 32–36): открыта — `ui.open === 'group'`; закрытие — Esc, крестик, клик мимо. */
const groupOpen = computed({
  get: () => m.ui.open === 'group' && m.ui.panel?.kind === 'group',
  set: (v: boolean) => { if (!v) m.closePanel() },
})
const panelGroup = computed(() => (m.ui.panel?.kind === 'group' ? m.groupOf(m.ui.panel.id) : undefined))
const panelSchemes = computed(() => (panelGroup.value
  ? m.schemesOf(panelGroup.value.id).map(x => ({ id: x.id, name: x.name, range: m.schemeRange(x.id) }))
  : []))
const groupMode = computed({
  get: () => panelGroup.value?.mode ?? 'company',
  set: (v: string) => { if (panelGroup.value) m.setGroupMode(panelGroup.value.id, v as GroupMode) },
})
/** Пара и шкала группы — `setPrice`, `setScale` модели по пути группы; правки сразу в черновик (стр. 53). */
function setGroupPrice(patch: Partial<Price>) {
  const path = panelGroup.value && m.groupPath(panelGroup.value.id)
  if (path) m.setPrice(`${path}.price`, patch)
}
function setGroupScale(patch: { steps?: RegressStep[], form?: ScaleForm }) {
  const path = panelGroup.value && m.groupPath(panelGroup.value.id)
  if (path) m.setScale(`${path}.scale`, patch)
}
function groupStepRemoved(previous: RegressStep[]) {
  const path = panelGroup.value && m.groupPath(panelGroup.value.id)
  if (path) m.stepRemoved(`${path}.scale`, previous)
}

/* ------------------------------ панель схемы — П5, такт 81 ------------------------------ */
/** Панель схемы (№ 37–43): открыта — `ui.open === 'scheme'`; закрытие — Esc, крестик, клик мимо. */
const schemeOpen = computed({
  get: () => m.ui.open === 'scheme' && m.ui.panel?.kind === 'scheme',
  set: (v: boolean) => { if (!v) m.closePanel() },
})
const panelScheme = computed(() => (m.ui.panel?.kind === 'scheme' ? m.schemeOf(m.ui.panel.id) : undefined))
const panelSchemeGroup = computed(() => (panelScheme.value ? m.groupOf(panelScheme.value.groupId) : undefined))
const panelTab = computed<string>({
  get: () => m.ui.panel?.tab ?? 'pricing',
  set: v => m.setPanelTab(v === 'types' ? 'types' : 'pricing'),
})
const schemeMode = computed({
  get: () => panelScheme.value?.mode ?? 'group',
  set: (v: string) => { if (panelScheme.value) m.setSchemeMode(panelScheme.value.id, v as SchemeMode) },
})
/** Вилка группы в описании режима «По группе» — 6.5, как вилка компании в панели группы (стр. 77). */
const panelGroupRange = computed(() => (panelScheme.value ? m.groupRange(panelScheme.value.groupId) : { min: null, max: null }))
/** Копирование идентификатора (ТФ-20): кнопка `CopyableId` — уведомление «Скопировано». */
function onIdClick(e: MouseEvent) {
  if ((e.target as Element | null)?.closest('button')) m.notify('Скопировано')
}
/** Пара и шкала схемы — `setPrice`, `setScale` модели по пути схемы; правки сразу в черновик (стр. 53). */
function setSchemePrice(patch: Partial<Price>) {
  const path = panelScheme.value && m.schemePath(panelScheme.value.id)
  if (path) m.setPrice(`${path}.price`, patch)
}
function setSchemeScale(patch: { steps?: RegressStep[], form?: ScaleForm }) {
  const path = panelScheme.value && m.schemePath(panelScheme.value.id)
  if (path) m.setScale(`${path}.scale`, patch)
}
function schemeStepRemoved(previous: RegressStep[]) {
  const path = panelScheme.value && m.schemePath(panelScheme.value.id)
  if (path) m.stepRemoved(`${path}.scale`, previous)
}
/** «Процессы» (№ 41): только повторяемые — синглы своей цены не имеют (§1, §6). */
const panelProcesses = computed(() => (panelScheme.value ? m.repeatableOf(panelScheme.value.id) : []))
function setProcessPrice(processId: string, patch: Partial<Price>) {
  const path = panelScheme.value && m.processPath(panelScheme.value.id, processId)
  if (path) m.setPrice(path, patch)
}
/**
 * Подпись цен типов в схеме — по алгоритму VA-11467: цена типа заменяет цену уровня выше (ждут людей, п. 1; строка 13
 * реестра, решение оркестратора 4 промпта такта 81). Макет `30959:25654`: «Дополнительно к базовой цене».
 */
const TYPES_REPLACE = 'Заменяет цену схемы для осмотров с этим типом'
/** Глобальные цены типов (№ 42): только чтение; «Шкала» — у типа включена регресс-шкала. */
const panelGlobalTypes = computed(() => m.view.value.objectTypes.map(t => ({
  id: t.typeId,
  name: m.typeOf(t.typeId)?.name ?? t.typeId,
  scale: t.scale.on,
  range: m.globalTypeRange(t.typeId),
})))
/** Индивидуальные цены типов схемы (№ 43): пара у каждого, шкалы нет (ждут людей, п. 9; строка 17). */
const panelSchemeTypes = computed(() => (panelScheme.value?.types ?? []).map(t => ({
  id: t.typeId,
  name: m.typeOf(t.typeId)?.name ?? t.typeId,
  price: t.price,
})))
function setSchemeTypePrice(typeId: string, patch: Partial<Price>) {
  const path = panelScheme.value && m.schemeTypePath(panelScheme.value.id, typeId)
  if (path) m.setPrice(path, patch)
}
/** Выбор типа в панели схемы (№ 43 → № 24): тот же состав, что на вкладке «Типы объектов». */
const schemePickerOpen = computed({
  get: () => m.ui.schemePicker,
  set: (v: boolean) => { m.ui.schemePicker = v },
})
const schemeTypeQuery = ref('')
const activeSchemeType = ref(-1)
const schemePickerList = computed(() => (panelScheme.value ? m.schemePickerTypes(panelScheme.value.id, schemeTypeQuery.value) : []))
watch(schemePickerOpen, (v) => { if (v) { schemeTypeQuery.value = ''; activeSchemeType.value = -1 } })
watch(schemeTypeQuery, () => { activeSchemeType.value = -1 })
function pickSchemeType(id: string) {
  if (panelScheme.value) m.addSchemeType(panelScheme.value.id, id)
  schemePickerOpen.value = false
}
function onSchemePickerKeydown(e: KeyboardEvent) {
  const n = schemePickerList.value.length
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!n) return
    activeSchemeType.value = e.key === 'ArrowDown' ? (activeSchemeType.value + 1) % n : (activeSchemeType.value - 1 + n) % n
    nextTick(() => document.querySelector(`[data-scheme-type-option="${schemePickerList.value[activeSchemeType.value]?.id}"]`)?.scrollIntoView({ block: 'nearest' }))
  }
  else if (e.key === 'Enter' && activeSchemeType.value >= 0 && schemePickerList.value[activeSchemeType.value]) {
    e.preventDefault()
    pickSchemeType(schemePickerList.value[activeSchemeType.value]!.id)
  }
}

/* ------------------------------ периоды — П6.1, такт 82 ------------------------------ */
/** Выбранный период (№ 4, 5): данные всех вкладок и панелей следуют ему. */
const periodId = computed({ get: () => m.selectedId.id, set: (v: string) => m.selectPeriod(v) })
/** Поверхность модели: открыта, когда `ui.open` равно имени; закрытие снимает только её. */
function surface(name: string) {
  return computed({
    get: () => m.ui.open === name,
    set: (v: boolean) => { if (v) m.setOpen(name); else if (m.ui.open === name) m.setOpen('') },
  })
}
const periodsOpen = surface('periods')
const planOpen = surface('plan')
const deleteDraftOpen = surface('delete-draft')
/** Архив — только просмотр (№ 47): оси `readonly` у контролов, действия правки закрыты `inert`. */
const ro = computed(() => m.readonly.value)
const status = computed(() => m.selected.value.status)
/** Плашка над блоками вкладок: у черновика (№ 10) и архива (№ 47); блоки под ней — через 8 (Figma `30857:2650`). */
const banner = computed(() => status.value === 'draft' || status.value === 'archive')
/** «1 октября 2026» — начало интервала черновика с 1-го числа (стр. 18). */
const draftStart = computed(() => m.startLabel(m.selected.value.from))
const archiveTerm = computed(() => m.periodSpan(m.selected.value.id))

/* ------------------------------ окна «Сохранить изменения» — П6.2, такт 83 ------------------------------ */
const applyOpen = surface('apply')
const queueOpen = surface('queue')
const occupiedOpen = surface('occupied')
const conflictOpen = surface('conflict')
const queueChoice = computed<string>({ get: () => m.win.queue, set: (v) => { m.win.queue = v === 'this' ? 'this' : 'all' } })
const occupiedChoice = computed<string>({ get: () => m.win.occupied, set: (v) => { m.win.occupied = v === 'overwrite' ? 'overwrite' : 'plan' } })
const conflictChoice = computed<string>({ get: () => m.win.conflict, set: (v) => { m.win.conflict = v === 'replace' ? 'replace' : 'keep' } })
/** «1 запланированный тариф останется», «2 запланированных тарифа останутся», «5 запланированных тарифов останутся». */
function plannedLeft(n: number) {
  const d = n % 10
  const h = n % 100
  if (d === 1 && h !== 11) return `${n} запланированный тариф останется без изменений`
  return `${n} запланированных ${d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'тарифа' : 'тарифов'} останутся без изменений`
}
/** Начало черновика и месяц перед ним — подписи окон пересечений (№ 50, 51; дата с 1-го числа — стр. 18). */
const draftBefore = computed(() => monthLabel(addMonths(m.selected.value.from, -1)))

if (import.meta.client) {
  /* Прогону — состояние модели для сравнения «до / после»; оснастка приёмки. */
  ;(window as unknown as { __tariffs: unknown }).__tariffs = m
}
</script>

<template>
  <div
    data-tariffs
    :data-tab="m.ui.tab"
    :data-save="m.save.state"
    :data-dirty="m.dirty.value ? '1' : '0'"
    :data-apply="m.apply.state"
    :data-period="m.selected.value.status"
    :data-period-id="m.selectedId.id"
    :data-scale="base.scale.on ? 'on' : 'off'"
    :data-open="m.ui.open || undefined"
    :data-state="m.loading ? 'loading' : undefined"
  >
    <NuxtLayout name="admin">
      <!--
        «Назад» — слот `back` каркаса (такт 96, решение владельца 2026-10-09): каркас ставит его в закреплённую шапку над её
        содержимым и держит 12 до строки заголовка.
      -->
      <template #back>
        <ButtonNavigation size="base" direction="left" data-act="back" @click="m.back()">
          Назад
        </ButtonNavigation>
      </template>

      <!-- Шапка — Figma `30957:7809` в `30980:7926`; закреплена сверху (§11) — слот `header` каркаса. -->
      <template #header>
        <div class="flex h-11 items-center justify-between gap-6" data-header-row>
          <div class="flex min-w-0 items-center gap-3">
            <Heading level="page" as="h1" data-tariffs-title>
              Тарификация
            </Heading>
            <!-- Переключатель тарифного периода — Figma `30957:7855`, список `31089:12090` (№ 4, 5). -->
            <!-- Загрузка (№ 54): срок периода ещё неизвестен — скелетон на месте переключателя. -->
            <Skeleton v-if="m.loading" class="h-7 w-56" data-skeleton="period" />
            <PeriodSwitcher
              v-else
              v-model="periodId"
              v-model:open="periodsOpen"
              :periods="m.periodList.value"
              data-period-switcher
              data-act="periods"
              @plan="m.openPlan()"
            />
          </div>

          <!-- Архив — только просмотр (№ 47): статуса сохранения и «Сохранить изменения» нет (стр. 49). -->
          <div v-if="!ro && !m.loading" class="flex shrink-0 items-center gap-4">
            <AppBarStatus surface="light" retryable :state="m.save.state" @retry="m.retry()" />
            <Button
              show-icon
              :disabled="!m.canSave.value"
              :loading="m.apply.state === 'applying'"
              data-act="apply"
              @click="m.requestSave()"
            >
              <template #icon>
                <Icon name="save" :size="20" />
              </template>
              Сохранить изменения
            </Button>
          </div>
        </div>
      </template>

      <!-- Вкладки — Figma `30912:245548`: иконка 16, подпись, счётчик; справа — «Как считается стоимость» (№ 9). -->
      <Tabs v-model="tab">
        <!-- Строка вкладок — Figma `30912:245547`: вкладки слева, «Как считается стоимость» справа (`30912:245571`). -->
        <div class="flex items-center justify-between gap-6">
          <TabsList>
            <TabsTrigger v-for="t in TABS" :key="t.id" :value="t.id" :count="m.loading ? undefined : countOf(t.id)" :data-tab-trigger="t.id">
              <Icon :name="t.icon" :size="16" />
              {{ t.label }}
            </TabsTrigger>
          </TabsList>
          <!-- Подсказка — Figma `30912:245571`, `31650:7772`: кнопка с «i» и поповер с порядком поиска цены (§4). -->
          <Popover v-model:open="helpOpen">
            <PopoverTrigger as-child>
              <ButtonAction variant="muted" data-act="help">
                <template #icon>
                  <Icon name="info" :size="16" />
                </template>
                Как считается стоимость
              </ButtonAction>
            </PopoverTrigger>
            <PopoverContent align="end" class="flex flex-col gap-3 p-4" data-help>
              <Heading description="Ищется первая заданная цена — от частного к общему. К ней применяется регресс-шкала её уровня, иначе общая шкала компании, иначе цена фиксированная.">
                Приоритет выбора цены
              </Heading>
              <div class="flex flex-col gap-1">
                <ListRow
                  v-for="(x, k) in HELP_ORDER"
                  :key="x.title"
                  type="number"
                  :number="k + 1"
                  tabindex="-1"
                  :data-help-step="k + 1"
                >
                  {{ x.title }}
                  <template #secondary>
                    {{ x.note }}
                  </template>
                </ListRow>
              </div>
              <!-- Итог с повторяемыми процессами — MAX по реализации 29.06.2026: ждут людей, п. 2 (строка 14 реестра). -->
              <Heading data-awaiting="2" description="Больше из цены осмотра и суммы цен повторяемых процессов. Если сумма за месяц ниже минимальной — выставляется минимальная.">
                Итог осмотра
              </Heading>
            </PopoverContent>
          </Popover>
        </div>

        <!--
          Загрузка страницы (№ 54, стр. 47): макета нет — три блока `Card` со скелетоном заголовка, подписи и двух плиток, как у
          «Базовых настроек». Оснастка `?state=loading`.
        -->
        <div v-if="m.loading" class="flex flex-col gap-2 pt-6" data-loading>
          <Card v-for="k in 3" :key="k" as="section" class="flex flex-col gap-6" :data-skeleton-block="k">
            <div class="flex flex-col gap-2">
              <Skeleton class="h-6 w-1/3" />
              <Skeleton class="h-4 w-2/3" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <Skeleton class="h-24" />
              <Skeleton class="h-24" />
            </div>
          </Card>
        </div>

        <!-- Плашка черновика — Figma `30857:2704` (№ 10); архива — № 47, макета нет (стр. 49). Стоит над блоками всех вкладок. -->
        <div v-else class="flex flex-col gap-2 pt-6">
          <Callout v-if="status === 'draft'" tone="warning" title="Вы редактируете черновик будущих тарифов" data-banner="draft">
            <p>Текущие цены для клиентов остаются без изменений. Тарифы вступят в силу {{ draftStart }}</p>
            <template #actions>
              <Button variant="destructive" show-icon data-act="delete-draft" @click="m.openDeleteDraft()">
                <template #icon>
                  <Icon name="delete" :size="20" />
                </template>
                Удалить черновик
              </Button>
            </template>
          </Callout>
          <Callout v-else-if="status === 'archive'" tone="neutral" title="Архивный тариф — только просмотр" data-banner="archive">
            <p>Тариф действовал {{ archiveTerm }}. Цены архивного периода не меняются</p>
          </Callout>

          <TabsContent value="base">
            <!-- Блоки вкладки — Figma `30912:245513`: зазор между блоками 8. -->
            <div class="flex flex-col gap-2">
              <!-- «Базовая минимальная стоимость» — Figma `30912:245578`: две плитки через 8. -->
              <Card as="section" class="flex flex-col gap-6" data-block="base">
                <Heading level="group" description="Минимальные пороги биллинга и базовые цены, применяемые к схемам осмотра по умолчанию.">
                  Базовая минимальная стоимость
                </Heading>
                <div class="grid grid-cols-2 gap-2">
                  <!-- Плитка — Figma `31767:8590`: подпись, поле 160 с «₽», подсказка во всю ширину. -->
                  <Card tone="muted" size="sm" class="flex flex-col">
                    <Field
                      orientation="split"
                      class="flex-1"
                      label="Минимальная сумма списания за один расчётный период"
                      hint="Если итоговая сумма за период оказывается ниже этого порога — выставляется минимальная сумма"
                    >
                      <div class="w-price-input">
                        <Input v-model="minPayment" numeric unit="₽" variant="elevated" placeholder="" :show-icon="false" :readonly="ro" data-field="min-payment" />
                      </div>
                    </Field>
                  </Card>
                  <!-- Плитка — Figma `31649:3835`, при шкале — `31767:8605`: пара цен с замком; подсказка тоном предупреждения. -->
                  <Card tone="muted" size="sm" class="flex flex-col">
                    <Field
                      orientation="split"
                      class="flex-1"
                      label="Базовая стоимость схемы осмотра"
                      :hint="base.scale.on ? SCALE_HINT : BASE_HINT"
                      :hint-tone="base.scale.on ? 'warning' : 'default'"
                      data-field="base-price-field"
                    >
                      <PricePair
                        :readonly="ro"
                        variant="elevated"
                        :client="base.price.client"
                        :non-client="base.price.nonClient"
                        :linked="base.price.linked"
                        :disabled="base.scale.on"
                        data-field="base-price"
                        @update:client="v => setBasePrice({ client: v })"
                        @update:non-client="v => setBasePrice({ nonClient: v })"
                        @update:linked="v => setBasePrice({ linked: v })"
                      />
                    </Field>
                  </Card>
                </div>
              </Card>

              <!-- «Общая регресс-шкала компании» — Figma `30912:245618`, включённая — `30956:102261`. -->
              <Card as="section" class="flex flex-col gap-6" data-block="scale">
                <div class="flex items-start justify-between gap-6">
                  <Heading level="group" description="Применяется ко всем осмотрам, где типовая регресс-шкала не активна.">
                    Общая регресс-шкала компании
                  </Heading>
                  <Switch v-model="scaleOn" :readonly="ro" aria-label="Общая регресс-шкала компании" data-field="scale-switch" />
                </div>
                <RegressScale
                  v-if="base.scale.on"
                  :readonly="ro"
                  v-model:steps="scaleSteps"
                  v-model:form="scaleForm"
                  data-field="base-scale"
                  @remove-step="e => m.stepRemoved('base.scale', e.previous)"
                />
              </Card>

              <!-- «Учет прогресса в регресс-шкалах» — Figma `30912:245625`: две карточки выбора 544 через 8. -->
              <Card as="section" class="flex flex-col gap-6" data-block="counter">
                <!-- Сброс счётчика 1-го числа месяца — реализация 29.06.2026: ждут людей, п. 3 (строка 15 реестра). -->
                <Heading level="group" data-awaiting="3" description="Счётчик осмотров обнуляется 1-го числа каждого месяца.">
                  Учет прогресса в регресс-шкалах
                </Heading>
                <RadioGroup :readonly="ro" v-model="counter" class="grid grid-cols-2 gap-2" data-field="counter">
                  <RadioGroupItem value="global" variant="card" :checked="counter === 'global'" data-counter="global">
                    Сквозной учет
                    <template #description>
                      Любой выполненный осмотр увеличивает счётчик во всех активных шкалах компании
                    </template>
                  </RadioGroupItem>
                  <RadioGroupItem value="individual" variant="card" :checked="counter === 'individual'" data-counter="individual">
                    Раздельный учет
                    <template #description>
                      Каждый уровень считает свои осмотры: шкала уровня снижает цену по объёму осмотров этого уровня
                    </template>
                  </RadioGroupItem>
                </RadioGroup>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="types">
            <div class="flex flex-col gap-2">
              <!-- Блок «Типы объектов» — Figma `30863:3843`: шапка с «Добавить тип объекта», колонки, строки типов. -->
              <Card as="section" class="flex flex-col gap-6" data-block="types">
                <!-- Один выбор типа на блок (№ 24): открыватель — кнопка шапки либо действие пустого списка. -->
                <Popover v-model:open="pickerOpen">
                  <div class="flex items-start justify-between gap-6">
                    <Heading level="group" :description="TYPES_DESCRIPTION">
                      Типы объектов
                    </Heading>
                    <PopoverTrigger v-if="typeRows.length" as-child>
                      <ButtonAction :inert="ro" data-act="add-type">
                        <template #icon>
                          <Icon name="add" :size="16" />
                        </template>
                        Добавить тип объекта
                      </ButtonAction>
                    </PopoverTrigger>
                  </div>

                  <!-- Таблица типов — Figma `30863:3850`, `30863:3857`: колонки «Тип объекта», «Клиент, ₽», «Не клиент, ₽», «Регресс-шкала». -->
                  <Table v-if="typeRows.length" data-types-table>
                    <TableRow>
                      <TableHead variant="expand" aria-hidden="true" />
                      <TableHead class="min-w-0 flex-1">
                        Тип объекта
                      </TableHead>
                      <TableHead class="w-46">
                        Клиент, ₽
                      </TableHead>
                      <TableHead class="w-46">
                        Не клиент, ₽
                      </TableHead>
                      <TableHead class="w-40">
                        Регресс-шкала
                      </TableHead>
                      <TableHead class="w-16" aria-hidden="true" />
                    </TableRow>

                    <template v-for="row in typeRows" :key="row.id">
                      <TableRow :data-type-row="row.id" :data-expanded="row.expanded ? '' : undefined">
                        <TableCell variant="slot" class="w-16 justify-center px-0">
                          <IconButton
                            variant="ghost"
                            :label="row.expanded ? `Свернуть: ${row.name}` : `Раскрыть шкалу: ${row.name}`"
                            :aria-expanded="row.expanded ? 'true' : 'false'"
                            data-act="type-expand"
                            @click="m.toggleExpand(row.id)"
                          >
                            <Icon :name="row.expanded ? 'chevron-up' : 'chevron-down'" :size="16" />
                          </IconButton>
                        </TableCell>
                        <TableCell variant="slot" class="min-w-0 flex-1">
                          <TableCellIdentity :icon="row.icon" data-type-name>
                            {{ row.name }}
                          </TableCellIdentity>
                        </TableCell>
                        <!-- Пара цен типа: при включённой шкале выключена (§5, стр. 08). -->
                        <TableCell variant="slot">
                          <PricePair
                            :readonly="ro"
                            :labels="false"
                            :client="row.price.client"
                            :non-client="row.price.nonClient"
                            :linked="row.price.linked"
                            :disabled="row.scale.on"
                            data-field="type-price"
                            @update:client="v => setTypePrice(row.id, { client: v })"
                            @update:non-client="v => setTypePrice(row.id, { nonClient: v })"
                            @update:linked="v => setTypePrice(row.id, { linked: v })"
                          />
                        </TableCell>
                        <TableCell variant="slot" class="w-40">
                          <Switch
                            :readonly="ro"
                            :model-value="row.scale.on"
                            :aria-label="`Регресс-шкала: ${row.name}`"
                            data-field="type-scale-switch"
                            @update:model-value="v => m.setTypeScaleOn(row.id, !!v)"
                          />
                        </TableCell>
                        <TableCell variant="slot" class="w-16 justify-center px-0">
                          <IconButton :inert="ro" variant="destructive" :label="`Удалить тип: ${row.name}`" data-act="type-remove" @click="m.removeType(row.id)">
                            <Icon name="delete" :size="16" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <!-- Раскрытая строка — Figma `30863:3894`: шкала типа на всю ширину таблицы; при выключенной шкале — выключена (стр. 69). -->
                      <TableRow v-if="row.expanded" :data-type-body="row.id">
                        <TableCell variant="slot" class="h-auto min-w-0 flex-1 py-4 pl-16">
                          <RegressScale
                            :readonly="ro"
                            :steps="row.scale.steps"
                            :form="row.scale.form"
                            :disabled="!row.scale.on"
                            class="w-full"
                            data-field="type-scale"
                            @update:steps="v => setTypeScale(row.id, { steps: v })"
                            @update:form="v => setTypeScale(row.id, { form: v })"
                            @remove-step="e => typeStepRemoved(row.id, e.previous)"
                          />
                        </TableCell>
                      </TableRow>
                    </template>
                  </Table>

                  <!--
                    Пустой список (№ 26, стр. 46): действие закрывает пустоту — тот же выбор типа. Кнопка — как у пустых списков
                    страницы схемы: главная с плюсом (сверка дублей финала, стр. 115).
                  -->
                  <Empty
                    v-else
                    title="Типов объектов пока нет"
                    description="Добавьте тип из справочника компании, чтобы задать ему цену и регресс-шкалу"
                    data-types-empty
                  >
                    <template #action>
                      <PopoverTrigger as-child>
                        <Button :inert="ro" show-icon data-act="add-type">
                          <template #icon>
                            <Icon name="add" :size="16" />
                          </template>
                          Добавить тип объекта
                        </Button>
                      </PopoverTrigger>
                    </template>
                  </Empty>

                  <!-- Выбор типа — Figma `31488:258091`: плашка с поиском и списком справочника; добавленные типы из списка ушли. -->
                  <PopoverContent as-child align="end" :side-offset="4" :width="320">
                    <SelectContent data-type-picker @keydown="onPickerKeydown">
                      <template #search>
                        <Input v-model="typeQuery" placeholder="Поиск типа объекта" clearable data-field="type-search" />
                      </template>
                      <SelectItem
                        v-for="(t, k) in pickerList"
                        :key="t.id"
                        :selected="k === activeType"
                        :data-type-option="t.id"
                        @click="pickType(t.id)"
                      >
                        {{ t.name }}
                      </SelectItem>
                      <Empty
                        v-if="!pickerList.length"
                        :title="typeQuery.trim() ? 'Ничего не найдено' : 'Все типы справочника добавлены'"
                        class="px-4 py-6"
                        data-type-picker-empty
                      />
                    </SelectContent>
                  </PopoverContent>
                </Popover>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schemes">
            <!-- Вкладка «Схемы осмотра» — Figma `30875:127755`: блоки групп через 4. -->
            <div class="flex flex-col gap-1" data-block="schemes">
              <Card v-for="g in groupRows" :key="g.id" as="section" class="flex flex-col gap-6" :data-group="g.id">
                <!-- Строка группы — Figma `30875:127808`: имя и метки, вилка группы, «Настроить группу». -->
                <div class="flex items-baseline gap-6" data-group-head>
                  <div class="flex shrink-0 items-center gap-3">
                    <Heading level="group" data-group-name>
                      {{ g.name }}
                    </Heading>
                    <div class="flex items-center gap-0.5" data-badges>
                      <Badge v-for="b in g.badges" :key="b.id" appearance="outline" :variant="BADGE_TONE[b.kind]" :data-badge="b.id">
                        {{ b.text }}
                      </Badge>
                    </div>
                  </div>
                  <PriceRange
                    layout="dash"
                    label="Стоимость осмотров группы по умолчанию:"
                    note="наследуется схемами без индивидуальной цены"
                    :min="g.range.min"
                    :max="g.range.max"
                    class="flex-1"
                    data-group-range
                  />
                  <ButtonAction class="shrink-0" data-act="group-settings" @click="m.openGroup(g.id)">
                    <template #icon>
                      <Icon name="settings" :size="16" />
                    </template>
                    Настроить группу
                  </ButtonAction>
                </div>

                <!-- Строки схем — Figma `30875:127821`: имя с метками, вилка «от … до …», шестерёнка; устаревшая приглушена (§11). -->
                <div v-if="g.schemes.length" class="flex flex-col gap-1">
                  <Card
                    v-for="x in g.schemes"
                    :key="x.id"
                    tone="muted"
                    size="sm"
                    :dimmed="x.outdated"
                    class="flex items-center gap-5"
                    :data-scheme="x.id"
                  >
                    <div class="flex min-w-0 flex-1 items-center gap-3">
                      <Heading data-scheme-name>
                        {{ x.name }}
                      </Heading>
                      <div class="flex items-center gap-0.5" data-badges>
                        <Badge v-for="b in x.badges" :key="b.id" appearance="outline" :variant="BADGE_TONE[b.kind]" :data-badge="b.id">
                          {{ b.text }}
                        </Badge>
                      </div>
                    </div>
                    <PriceRange label="Вилка цен" :min="x.range.min" :max="x.range.max" class="shrink-0" data-scheme-range />
                    <IconButton variant="ghost" :label="`Настроить схему: ${x.name}`" data-act="scheme-settings" @click="m.openScheme(x.id)">
                      <Icon name="settings" :size="16" />
                    </IconButton>
                  </Card>
                </div>
                <!-- Пустая группа (№ 57, стр. 46): схемы добавляются в конструкторе схем — действия на странице нет. -->
                <Empty
                  v-else
                  title="В группе пока нет схем"
                  description="Цена группы применится к схемам, когда они появятся в группе"
                  data-group-empty
                />
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <!-- Панель группы — Figma `32021:6684`, `32021:6756`, `32021:6829`: сайд 642, правки сразу в черновик (стр. 53), подвала нет. -->
      <ModalCard v-model:open="groupOpen">
        <ModalCardContent placement="edge" data-side="group">
          <ModalCardHeader title="Настройка группы" />
          <ModalCardBody v-if="panelGroup" class="flex flex-col gap-8">
            <!-- Имя группы и число схем — Figma `32021:6689`; цены в подстроке нет (VA-14951, стр. 04). -->
            <Heading level="page" :description="`${panelSchemes.length} ${m.schemesWord(panelSchemes.length)}`" data-panel-name>
              {{ panelGroup.name }}
            </Heading>

            <!-- Режимы — Figma `32021:6693`: названия по §11 (стр. 29); тело выбранного — в общей рамке с карточкой (стр. 36). -->
            <RadioGroup :readonly="ro" v-model="groupMode" class="flex flex-col gap-2" data-field="group-mode">
              <RadioGroupItem value="company" variant="card" :checked="groupMode === 'company'" data-group-mode="company">
                Базовая цена компании
                <template #description>
                  Наследует цену компании:
                  <PriceRange size="sm" layout="dash" :min="m.companyRange().min" :max="m.companyRange().max" data-company-range />
                </template>
              </RadioGroupItem>
              <RadioGroupItem value="fixed" variant="card" :checked="groupMode === 'fixed'" data-group-mode="fixed">
                Фиксированная цена группы
                <template #description>
                  Фиксированная цена только для этой группы
                </template>
                <template #panel>
                  <PricePair
                    :readonly="ro"
                    stretch
                    :client="panelGroup.price.client"
                    :non-client="panelGroup.price.nonClient"
                    :linked="panelGroup.price.linked"
                    data-field="group-price"
                    @update:client="v => setGroupPrice({ client: v })"
                    @update:non-client="v => setGroupPrice({ nonClient: v })"
                    @update:linked="v => setGroupPrice({ linked: v })"
                  />
                </template>
              </RadioGroupItem>
              <RadioGroupItem value="scale" variant="card" :checked="groupMode === 'scale'" data-group-mode="scale">
                Регресс-шкала группы
                <template #description>
                  Цена снижается при росте объёма осмотров
                </template>
                <template #panel>
                  <RegressScale
                    :readonly="ro"
                    label=""
                    :steps="panelGroup.scale.steps"
                    :form="panelGroup.scale.form"
                    data-field="group-scale"
                    @update:steps="v => setGroupScale({ steps: v })"
                    @update:form="v => setGroupScale({ form: v })"
                    @remove-step="e => groupStepRemoved(e.previous)"
                  />
                </template>
              </RadioGroupItem>
            </RadioGroup>

            <!-- «Схемы в группе» — Figma `32021:6894`: только чтение, цена схемы справа; «N по группе» — схемы, наследующие цену группы. -->
            <section class="flex flex-col gap-4" data-group-schemes>
              <div class="flex items-center justify-between gap-4">
                <Heading level="group">
                  Схемы в группе
                </Heading>
                <Badge appearance="outline" variant="neutral" data-inheriting>
                  {{ m.inheritingCount(panelGroup.id) }} по группе
                </Badge>
              </div>
              <Table v-if="panelSchemes.length">
                <TableRow v-for="x in panelSchemes" :key="x.id" :data-group-scheme="x.id">
                  <TableCell class="min-w-0 flex-1 pl-6" data-group-scheme-name>
                    {{ x.name }}
                  </TableCell>
                  <TableCell variant="slot" class="justify-end">
                    <PriceRange layout="dash" :min="x.range.min" :max="x.range.max" data-group-scheme-range />
                  </TableCell>
                </TableRow>
              </Table>
              <!-- Пустая группа — тот же текст, что на вкладке «Схемы осмотра» (№ 57; сверка дублей финала, стр. 117). -->
              <Empty
                v-else
                title="В группе пока нет схем"
                description="Цена группы применится к схемам, когда они появятся в группе"
                data-group-schemes-empty
              />
            </section>
          </ModalCardBody>
        </ModalCardContent>
      </ModalCard>

      <!--
        Панель схемы — Figma `30959:20090`, `30959:20839`, `30959:22398` («Ценообразование»), `30959:25013`, `30959:24395`
        («Типы объектов»), `31556:10935`: сайд 642, шапка — имя группы, правки сразу в черновик (стр. 53), подвала нет.
      -->
      <ModalCard v-model:open="schemeOpen">
        <ModalCardContent placement="edge" data-side="scheme">
          <ModalCardHeader :title="panelSchemeGroup?.name ?? ''" />
          <ModalCardBody v-if="panelScheme" class="flex flex-col gap-6">
            <!-- Имя схемы и идентификатор с копированием — Figma `30959:23011`; идентификатор вымышленный (scope, п. 8). -->
            <div class="flex flex-col gap-1" data-panel-name>
              <Heading level="page">
                {{ panelScheme.name }}
              </Heading>
              <div class="flex">
                <CopyableId :value="panelScheme.code" data-scheme-code @click="onIdClick" />
              </div>
            </div>

            <!-- Вкладки панели — Figma `32021:3950`: «Ценообразование», «Типы объектов». -->
            <Tabs v-model="panelTab">
              <TabsList>
                <TabsTrigger value="pricing" data-panel-tab="pricing">
                  Ценообразование
                </TabsTrigger>
                <TabsTrigger value="types" data-panel-tab="types">
                  Типы объектов
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pricing">
                <div class="flex flex-col gap-8 pt-6" data-panel-pricing>
                  <!-- Режимы — Figma `30959:23023`: названия по §11 (стр. 06); тело выбранного — в рамке карточки (стр. 36). -->
                  <RadioGroup :readonly="ro" v-model="schemeMode" class="flex flex-col gap-2" data-field="scheme-mode">
                    <RadioGroupItem value="group" variant="card" :checked="schemeMode === 'group'" data-scheme-mode="group">
                      По группе
                      <template #description>
                        Наследует цену из общих настроек группы или компании:
                        <PriceRange size="sm" layout="dash" :min="panelGroupRange.min" :max="panelGroupRange.max" data-scheme-group-range />
                      </template>
                    </RadioGroupItem>
                    <RadioGroupItem value="individual" variant="card" :checked="schemeMode === 'individual'" data-scheme-mode="individual">
                      Индивидуальная цена
                      <template #description>
                        Фиксированная цена только для этой схемы
                      </template>
                      <template #panel>
                        <PricePair
                          :readonly="ro"
                          stretch
                          :client="panelScheme.price.client"
                          :non-client="panelScheme.price.nonClient"
                          :linked="panelScheme.price.linked"
                          data-field="scheme-price"
                          @update:client="v => setSchemePrice({ client: v })"
                          @update:non-client="v => setSchemePrice({ nonClient: v })"
                          @update:linked="v => setSchemePrice({ linked: v })"
                        />
                      </template>
                    </RadioGroupItem>
                    <RadioGroupItem value="scale" variant="card" :checked="schemeMode === 'scale'" data-scheme-mode="scale">
                      Регресс-шкала
                      <template #description>
                        Цена снижается при росте объёма осмотров
                      </template>
                      <template #panel>
                        <RegressScale
                          :readonly="ro"
                          label=""
                          :steps="panelScheme.scale.steps"
                          :form="panelScheme.scale.form"
                          data-field="scheme-scale"
                          @update:steps="v => setSchemeScale({ steps: v })"
                          @update:form="v => setSchemeScale({ form: v })"
                          @remove-step="e => schemeStepRemoved(e.previous)"
                        />
                      </template>
                    </RadioGroupItem>
                  </RadioGroup>

                  <!--
                    «Процессы» — Figma `31099:5331`: цены повторяемых процессов в панели схемы (ждут людей, п. 4; строка 16),
                    итог осмотра — больше из цены осмотра и суммы процессов (ждут людей, п. 2; строка 14).
                  -->
                  <section class="flex flex-col gap-4" data-scheme-processes data-awaiting="2 4">
                    <Heading level="group" description="Цены повторяемых процессов. В итог осмотра идёт большее из цены осмотра и суммы цен процессов">
                      Процессы
                    </Heading>
                    <div v-if="panelProcesses.length" class="flex flex-col gap-1">
                      <Card v-for="p in panelProcesses" :key="p.id" tone="muted" size="sm" class="flex flex-col gap-3" :data-process="p.id">
                        <Heading data-process-name>
                          {{ p.name }}
                        </Heading>
                        <PricePair
                          :readonly="ro"
                          stretch
                          variant="elevated"
                          :client="p.price.client"
                          :non-client="p.price.nonClient"
                          :linked="p.price.linked"
                          data-field="process-price"
                          @update:client="v => setProcessPrice(p.id, { client: v })"
                          @update:non-client="v => setProcessPrice(p.id, { nonClient: v })"
                          @update:linked="v => setProcessPrice(p.id, { linked: v })"
                        />
                      </Card>
                    </div>
                    <Empty
                      v-else
                      title="В схеме нет повторяемых процессов"
                      description="Цену получают только повторяемые процессы — стоимость остальных входит в цену осмотра"
                      data-processes-empty
                    />
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="types">
                <!-- Глобальные цены — Figma `30959:25631`: полоса с «Настроить индивидуально», список только для чтения. -->
                <div v-if="!panelScheme.individualTypes" class="flex flex-col gap-4 pt-6" data-scheme-types="global">
                  <Callout tone="neutral" title="Цены из раздела «Типы объектов»" data-awaiting="1">
                    <p>{{ TYPES_REPLACE }}</p>
                    <template #actions>
                      <ButtonAction :inert="ro" data-act="customize-types" @click="m.customizeTypes(panelScheme.id)">
                        <template #icon>
                          <Icon name="settings" :size="16" />
                        </template>
                        Настроить индивидуально
                      </ButtonAction>
                    </template>
                  </Callout>
                  <Table v-if="panelGlobalTypes.length">
                    <TableRow v-for="t in panelGlobalTypes" :key="t.id" :data-global-type="t.id">
                      <TableCell class="min-w-0 flex-1 pl-6" data-global-type-name>
                        {{ t.name }}
                      </TableCell>
                      <TableCell variant="slot">
                        <Badge v-if="t.scale" appearance="outline" data-global-type-scale>
                          Шкала
                        </Badge>
                      </TableCell>
                      <TableCell variant="slot" class="justify-end">
                        <PriceRange layout="dash" :min="t.range.min" :max="t.range.max" data-global-type-range />
                      </TableCell>
                    </TableRow>
                  </Table>
                  <Empty
                    v-else
                    title="Типов объектов пока нет"
                    description="Глобальные цены типов задаются на вкладке «Типы объектов»"
                    data-global-types-empty
                  />
                </div>

                <!-- Индивидуальные цены — Figma `30959:25692`: полоса предупреждения с «Сбросить к глобальным», плитки с парой цен. -->
                <div v-else class="flex flex-col gap-4 pt-6" data-scheme-types="individual">
                  <Callout tone="warning" title="Индивидуальные цены для этой схемы" data-awaiting="1 9">
                    <p>{{ TYPES_REPLACE }}</p>
                    <template #actions>
                      <ButtonAction :inert="ro" data-act="reset-types" @click="m.resetTypes(panelScheme.id)">
                        <template #icon>
                          <Icon name="refresh" :size="16" />
                        </template>
                        Сбросить к глобальным
                      </ButtonAction>
                    </template>
                  </Callout>
                  <!--
                    Один выбор типа на блок (№ 24): открыватель — кнопка над плитками либо действие пустого списка. У пустого
                    списка кнопка добавления одна — в `Empty` (правило `naming.md`, «Такт 74»; сверка дублей финала, стр. 116).
                  -->
                  <Popover v-model:open="schemePickerOpen">
                    <div v-if="panelSchemeTypes.length" class="flex">
                      <PopoverTrigger as-child>
                        <ButtonAction :inert="ro" data-act="add-scheme-type">
                          <template #icon>
                            <Icon name="add" :size="16" />
                          </template>
                          Добавить тип объекта
                        </ButtonAction>
                      </PopoverTrigger>
                    </div>
                    <div v-if="panelSchemeTypes.length" class="flex flex-col gap-1">
                      <Card v-for="t in panelSchemeTypes" :key="t.id" tone="muted" size="sm" class="flex flex-col gap-3" :data-scheme-type="t.id">
                        <Heading data-scheme-type-name>
                          {{ t.name }}
                        </Heading>
                        <PricePair
                          :readonly="ro"
                          stretch
                          variant="elevated"
                          :client="t.price.client"
                          :non-client="t.price.nonClient"
                          :linked="t.price.linked"
                          data-field="scheme-type-price"
                          @update:client="v => setSchemeTypePrice(t.id, { client: v })"
                          @update:non-client="v => setSchemeTypePrice(t.id, { nonClient: v })"
                          @update:linked="v => setSchemeTypePrice(t.id, { linked: v })"
                        />
                      </Card>
                    </div>
                    <Empty
                      v-else
                      title="Индивидуальных цен типов пока нет"
                      description="Добавьте тип из справочника компании, чтобы задать ему цену в этой схеме"
                      data-scheme-types-empty
                    >
                      <template #action>
                        <PopoverTrigger as-child>
                          <Button :inert="ro" show-icon data-act="add-scheme-type">
                            <template #icon>
                              <Icon name="add" :size="16" />
                            </template>
                            Добавить тип объекта
                          </Button>
                        </PopoverTrigger>
                      </template>
                    </Empty>
                    <PopoverContent as-child align="start" :side-offset="4" :width="320">
                      <SelectContent data-scheme-type-picker @keydown="onSchemePickerKeydown">
                        <template #search>
                          <Input v-model="schemeTypeQuery" placeholder="Поиск типа объекта" clearable data-field="scheme-type-search" />
                        </template>
                        <SelectItem
                          v-for="(t, k) in schemePickerList"
                          :key="t.id"
                          :selected="k === activeSchemeType"
                          :data-scheme-type-option="t.id"
                          @click="pickSchemeType(t.id)"
                        >
                          {{ t.name }}
                        </SelectItem>
                        <Empty
                          v-if="!schemePickerList.length"
                          :title="schemeTypeQuery.trim() ? 'Ничего не найдено' : 'Все типы справочника добавлены'"
                          class="px-4 py-6"
                          data-scheme-type-picker-empty
                        />
                      </SelectContent>
                    </PopoverContent>
                  </Popover>
                </div>
              </TabsContent>
            </Tabs>
          </ModalCardBody>
        </ModalCardContent>
      </ModalCard>

      <!--
        Окно «Планирование новых тарифов» — Figma `31246:7272` (№ 44): окно вместо сайда `32021:4063` (стр. 19), 440 и кнопки
        40 (стр. 20, 21). Месяцы и годы — сетка `Button` (№ 45): выбранный — `default`, прочие — `outline`, прошедшие и
        текущий — `disabled` (решение оркестратора 4). Интервал — с 1-го числа (стр. 18).
      -->
      <ModalCard v-model:open="planOpen">
        <ModalCardContent size="sm" data-modal="plan">
          <ModalCardHeader title="Планирование новых тарифов" subtitle="Создание черновика будущей версии цен" />
          <ModalCardBody class="flex flex-col gap-4">
            <ModalCardText>
              Укажите дату, с которой вступят в силу новые цены. До этого момента будут действовать текущие тарифы.
            </ModalCardText>
            <Callout tone="neutral">
              <p>Все текущие настройки, цены и регресс-шкалы будут скопированы в черновик. Вы меняете только то, что изменится.</p>
            </Callout>
            <Field label="Дата вступления в силу">
              <div class="flex flex-col gap-3">
                <div class="grid grid-cols-4 gap-1" data-plan-months>
                  <Button
                    v-for="x in m.planMonths.value"
                    :key="x.month"
                    :variant="x.month === m.plan.month ? 'default' : 'outline'"
                    wide
                    :disabled="x.disabled"
                    :aria-pressed="x.month === m.plan.month ? 'true' : 'false'"
                    :data-plan-month="x.month"
                    @click="m.setPlanMonth(x.month)"
                  >
                    {{ x.label }}
                  </Button>
                </div>
                <div class="grid grid-cols-4 gap-1" data-plan-years>
                  <Button
                    v-for="x in m.planYears.value"
                    :key="x.year"
                    :variant="x.year === m.plan.year ? 'default' : 'outline'"
                    wide
                    :disabled="x.disabled"
                    :aria-pressed="x.year === m.plan.year ? 'true' : 'false'"
                    :data-plan-year="x.year"
                    @click="m.setPlanYear(x.year)"
                  >
                    {{ x.year }}
                  </Button>
                </div>
              </div>
            </Field>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" data-act="plan-cancel" @click="planOpen = false">
              Отмена
            </Button>
            <Button data-act="plan-confirm" @click="m.confirmPlan()">
              Сохранить
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- «Удалить черновик?» — № 46: окна в макете нет, прецедент «Сбросить черновик?» страницы схемы (стр. 44). -->
      <ModalCard v-model:open="deleteDraftOpen">
        <ModalCardContent size="sm" data-modal="delete-draft">
          <ModalCardHeader title="Удалить черновик?" />
          <ModalCardBody>
            <ModalCardText>
              Черновик тарифов с {{ draftStart }} будет удалён вместе с правками. Текущие цены не изменятся.
            </ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" data-act="delete-draft-cancel" @click="deleteDraftOpen = false">
              Отмена
            </Button>
            <Button variant="destructive" data-act="delete-draft-confirm" @click="m.confirmDeleteDraft()">
              Удалить черновик
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!--
        «Применить изменения?» — Figma `31246:7335` (№ 48): текущий или запланированный без очереди после него. «Оставить в
        черновике» — окно закрыто, правки остаются (6.4); вторичная кнопка контуром, как в макете (`Button outline`).
      -->
      <ModalCard v-model:open="applyOpen">
        <ModalCardContent size="sm" data-modal="apply">
          <ModalCardHeader title="Применить изменения?" subtitle="Если не сохранить — они переместятся в черновик" />
          <ModalCardFooter>
            <Button variant="outline" data-act="apply-keep" @click="m.closeWindow()">
              Оставить в черновике
            </Button>
            <Button data-act="apply-confirm" @click="m.confirmApply()">
              Применить
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!--
        «Тариф находится в очереди» — Figma `31246:7348`, `31246:7394` (№ 49): выбранный и запланированные после него —
        `PeriodSwitcherItem` с меткой в слоте `badge`; по умолчанию «Этот и все последующие» (§8, стр. 39).
      -->
      <ModalCard v-model:open="queueOpen">
        <ModalCardContent size="sm" data-modal="queue">
          <ModalCardHeader title="Тариф находится в очереди" subtitle="Вы изменили тариф. Как применить изменения к последующим тарифам?" />
          <ModalCardBody class="flex flex-col gap-6">
            <div class="flex flex-col" data-queue-list>
              <PeriodSwitcherItem v-for="(row, k) in m.queueRows.value" :key="row.id" :period="row" :selected="k === 0" :data-queue-row="row.id">
                <template v-if="row.badge" #badge>
                  <Badge v-if="row.badge === 'changing'" appearance="outline" variant="success" data-queue-badge="changing">
                    Изменяется
                  </Badge>
                  <Badge v-else appearance="outline" data-queue-badge="affected">
                    Затронет
                  </Badge>
                </template>
              </PeriodSwitcherItem>
            </div>
            <Field label="Применить изменения">
              <RadioGroup v-model="queueChoice" class="flex flex-col gap-2" data-field="queue-choice">
                <RadioGroupItem value="this" variant="card" :checked="queueChoice === 'this'" data-choice="this">
                  Только к этому тарифу
                  <template #description>
                    {{ plannedLeft(m.afterCount.value) }}
                  </template>
                </RadioGroupItem>
                <RadioGroupItem value="all" variant="card" :checked="queueChoice === 'all'" data-choice="all">
                  Этот и все последующие тарифы
                  <template #description>
                    Изменения применятся ко всем {{ m.afterCount.value + 1 }} тарифам в очереди
                  </template>
                </RadioGroupItem>
              </RadioGroup>
            </Field>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" data-act="queue-cancel" @click="m.closeWindow()">
              Отмена
            </Button>
            <Button data-act="queue-confirm" @click="m.confirmQueue()">
              Сохранить изменения
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!--
        «Дата занята действующим тарифом» — Figma `31246:7445`, `31246:7479` (№ 50): значок календаря в шапке (слот `icon`),
        «Перезаписать» — необратимо: метка «Необратимо», карточка тоном ошибки (`RadioGroupItem tone`), главная кнопка следует
        выбору — «Запланировать» или «Перезаписать» тоном `destructive` (решение оркестратора 3, строка 105).
      -->
      <ModalCard v-model:open="occupiedOpen">
        <ModalCardContent size="sm" data-modal="occupied">
          <ModalCardHeader title="Дата занята действующим тарифом" :subtitle="`Новый тариф начнётся ${draftStart} — эта дата уже входит в период текущего тарифа`">
            <template #icon>
              <Icon name="calendar-month" :size="20" data-modal-icon="calendar-month" />
            </template>
          </ModalCardHeader>
          <ModalCardBody>
            <Field label="Как поступить с текущим тарифом?">
              <RadioGroup v-model="occupiedChoice" class="flex flex-col gap-2" data-field="occupied-choice">
                <RadioGroupItem value="plan" variant="card" :checked="occupiedChoice === 'plan'" data-choice="plan">
                  Запланировать изменение
                  <template #description>
                    Текущий тариф продолжится до {{ draftBefore }}, затем сменится новым
                  </template>
                </RadioGroupItem>
                <RadioGroupItem value="overwrite" variant="card" tone="destructive" :checked="occupiedChoice === 'overwrite'" data-choice="overwrite">
                  <span class="inline-flex flex-wrap items-center gap-2">
                    Перезаписать текущий тариф
                    <Badge appearance="outline" variant="destructive" data-irreversible>
                      Необратимо
                    </Badge>
                  </span>
                  <template #description>
                    Текущий тариф будет завершён. Новый начнётся {{ draftStart }}
                  </template>
                </RadioGroupItem>
              </RadioGroup>
            </Field>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" data-act="occupied-cancel" @click="m.closeWindow()">
              Отмена
            </Button>
            <Button :variant="occupiedChoice === 'overwrite' ? 'destructive' : 'default'" data-act="occupied-confirm" @click="m.confirmOccupied()">
              {{ occupiedChoice === 'overwrite' ? 'Перезаписать' : 'Запланировать' }}
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!--
        «На эту дату уже запланирован тариф» — Figma `31246:7514`, `31246:7549` (№ 51): значок `error` в шапке, два варианта,
        заметка — `Callout tone="neutral"` (у `Callout` значка нет — строка 87); дата с 1-го числа (стр. 18).
      -->
      <ModalCard v-model:open="conflictOpen">
        <ModalCardContent size="sm" data-modal="conflict">
          <ModalCardHeader title="На эту дату уже запланирован тариф" :subtitle="`С ${draftStart} не могут начаться два тарифа одновременно. Выберите, какой оставить в очереди.`">
            <template #icon>
              <Icon name="error" :size="20" data-modal-icon="error" />
            </template>
          </ModalCardHeader>
          <ModalCardBody class="flex flex-col gap-3">
            <Field label="Какой тариф оставить в очереди?">
              <RadioGroup v-model="conflictChoice" class="flex flex-col gap-2" data-field="conflict-choice">
                <RadioGroupItem value="keep" variant="card" :checked="conflictChoice === 'keep'" data-choice="keep">
                  Оставить запланированный тариф
                  <template #description>
                    Новый тариф будет сохранён в черновиках — его можно использовать позже
                  </template>
                </RadioGroupItem>
                <RadioGroupItem value="replace" variant="card" :checked="conflictChoice === 'replace'" data-choice="replace">
                  Поставить в очередь новый тариф
                  <template #description>
                    Запланированный тариф перейдёт в черновики — его можно использовать позже
                  </template>
                </RadioGroupItem>
              </RadioGroup>
            </Field>
            <Callout tone="neutral" data-conflict-note>
              <p>Тариф, перемещённый в черновики, не удаляется. Вы сможете вернуть его в очередь в любой момент.</p>
            </Callout>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" data-act="conflict-cancel" @click="m.closeWindow()">
              Отмена
            </Button>
            <Button data-act="conflict-confirm" @click="m.confirmConflict()">
              Подтвердить
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <Toaster>
        <Toast
          v-for="n in m.notices"
          :key="n.id"
          :open="true"
          :duration="n.undo ? 6000 : 3000"
          :show-action="n.undo"
          @update:open="m.dismissNotice(n.id)"
          @action="m.undo(n.id)"
        >
          {{ n.text }}
          <template v-if="n.undo" #action>
            Отменить
          </template>
        </Toast>
      </Toaster>
    </NuxtLayout>
  </div>
</template>
