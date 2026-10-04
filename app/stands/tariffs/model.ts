import { computed, reactive } from 'vue'
import { chainSteps, stepErrors } from '~/components/ui/regress-scale/rules'

/**
 * Модель состояния страницы «Тарификация» (Биллинг 2.0, VA-14629) — такт 77, порция П1.
 * План и границы — `docs/tariffs.md`, 6.8. Поведение — `docs/sources/tariffs/spec.md`, вид — макеты Figma.
 *
 * ## Границы
 *
 * - DOM и компонентов модуль не знает: данные, операции и вычисления на реактивности Vue. Фокус и прокрутка — страница.
 * - Отказы и подтверждения — очередь `notices`; показывает её страница (`Toast`).
 * - Автосохранение (§8 сводки): любая правка не архивного периода пишется в его `pending`; поле `save.state` —
 *   `saving` → `saved` либо `error`, таймер `SAVE_MS`; `retry()` повторяет запись.
 * - Часы модели — месяц `ГГГГ-ММ` (оснастка `?now=`): по ним считаются статусы периодов очереди.
 * - Оснастка адреса выставляет состояние модели параметрами `createModel`.
 *
 * ## Что перенесено в П1
 *
 * Структура — целиком: настройки всех уровней (6.1), периоды (6.4), шкалы (6.2), пары цен (6.3), состояние интерфейса,
 * очередь уведомлений. Операции — сценарии П1: ТФ-01 (`back`), ТФ-02 (`setTab`), ТФ-03 (`set`, `retry`), ТФ-04
 * (`applyChanges` — применение правок выбранного периода без окон очереди, загрузка кнопки `applying`). Остальные операции
 * — заготовки `pendingPortion` по плану порций (`tariffs.md`, раздел 10): уведомление с названием порции.
 *
 * ## Что добавлено в П2 — такт 78
 *
 * Пара и замок — `setPrice` (`pairWith`, 6.3); шкала — `setScale` (цепочка «От» правилами `ui/regress-scale/rules.ts`, 6.2),
 * удаление ступени с «Отменить» — `stepRemoved` и `undo`; ошибки «До» — `scaleErrors`; подсказка «Как считается
 * стоимость» — `setOpen('help')`; оснастка `?scale=on`, `?open=help`. Сценарии ТФ-05–ТФ-12, ТФ-36.
 *
 * ## Что добавлено в П3 — такт 79
 *
 * Типы объектов (уровень 2, §3, §11): выбор из справочника — `pickerTypes` (добавленные уходят из списка, поиск по
 * имени) и `addType`; удаление с «Отменить» — `removeType` (стр. 52); раскрытие строки — `toggleExpand`; рубильник
 * шкалы типа — `setTypeScaleOn` (включение раскрывает строку, стр. 69); пара и шкала типа — `setPrice` и `setScale` по
 * пути `objectTypes.<номер>`, номер — `typePath`. Оснастка `?expand=<id типа>`, `?open=type-picker`. Сценарии ТФ-13–ТФ-16.
 *
 * ## Что добавлено в П4 — такт 80
 *
 * Схемы осмотра и группы (уровни 3 и 4а, §3, §11): вилки цен по 6.5 — `companyRange`, `groupRange`, `schemeRange` (цены
 * типов в вилку схемы не входят, стр. 56); метки строк по 6.6 — `groupBadges`, `schemeBadges`; схемы группы —
 * `schemesOf`. Панель группы — `openGroup`, `closePanel`; режим группы — `setGroupMode` (шкала группы включена ровно в
 * режиме «Регресс-шкала группы»: режим сам исключает фиксированную цену, §5); пара и шкала группы — `setPrice` и
 * `setScale` по пути `groups.<номер>`, номер — `groupPath`. Правки панели пишутся сразу (автосохранение §8, стр. 53).
 * Оснастка `?open=group`, `?group=<id>`, `?mode=company|fixed|scale` — режим открытой группы как данные. Сценарии
 * ТФ-17–ТФ-19, ТФ-24 (группа).
 *
 * ## Что добавлено в П5 — такт 81
 *
 * Панель схемы (уровни 4а, 4б и повторяемые процессы, §3, §6, §11): открыть — `openScheme`, вкладка панели —
 * `setPanelTab`; режим схемы — `setSchemeMode` («По группе» · «Индивидуальная цена» · «Регресс-шкала»; шкала схемы
 * включена ровно в режиме шкалы); пара, шкала, цены процессов и типов схемы — `setPrice`, `setScale` по пути
 * `schemes.<номер>`, номер — `schemePath`. Типы объектов в схеме: глобальные цены только для чтения —
 * `globalTypeRange`; «Настроить индивидуально» — `customizeTypes` (копия глобальных цен); «Сбросить к глобальным» —
 * `resetTypes` с «Отменить» (стр. 52); добавление типа — `schemePickerTypes`, `addSchemeType`. Шкалы у типов в схеме
 * нет (ждут людей, п. 9, стр. 17). Оснастка `?open=scheme`, `?scheme=<id>`, `?panel=pricing|types`,
 * `?mode=group|individual|scale` — режим открытой схемы как данные. Сценарии ТФ-20–ТФ-23, ТФ-24 (схема).
 *
 * ## Что добавлено в П6.1 — такт 82
 *
 * Периоды (6.4): выбор периода — `selectPeriod` (данные всех вкладок и панелей следуют выбранному); список периодов —
 * `setOpen('periods')`. Планирование (№ 44, 45) — `openPlan`, `setPlanYear`, `setPlanMonth`, `confirmPlan`: месяцы до
 * часов модели и текущий выключены, интервал — с 1-го числа (стр. 18); «Сохранить» создаёт черновик с копией применённых
 * настроек текущего тарифа и выбирает его. Удаление черновика (№ 46) — `openDeleteDraft`, `confirmDeleteDraft`: окно
 * подтверждения (стр. 44), после удаления выбран текущий. Архив (№ 47) — только просмотр: `readonly`, `set` отказывает.
 * «Отменить» у уведомления возвращает выбор периода, в котором была правка. «Сохранить изменения» на черновике и
 * запланированном — прежнее применение без окон (окна очереди и пересечений — П6.2). Оснастка `?period=`,
 * `?open=periods` · `plan` · `delete-draft`. Сценарии ТФ-25–ТФ-28.
 */

/* ------------------------------ данные ------------------------------ */

/** Пара цен «клиент / не клиент» — §1, 6.3: целые неотрицательные ₽, `null` — не задано; `linked` — замок связи. */
export interface Price { client: number | null, nonClient: number | null, linked: boolean }
/** Ступень шкалы — §5: «От» вычисляется (предыдущее «До» + 1), «До» последней — `null`, бесконечность. */
export interface ScaleStep { from: number, to: number | null, price: Price }
/** Регресс-шкала уровня — §5, 6.2: по умолчанию выключена; форма «Единая цена» берёт цену клиента. */
export interface Scale { on: boolean, form: 'single' | 'roles', steps: ScaleStep[] }

/** Уровень 1 — компания, «Базовые настройки». */
export interface BaseSettings { price: Price, minPayment: number | null, scale: Scale, counter: 'global' | 'individual' }
/** Уровень 2 — тип объекта для всей компании, «Типы объектов». */
export interface ObjectTypeRate { typeId: string, price: Price, scale: Scale }
/** Уровень 3 — группа схем: «Базовая цена компании» · «Фиксированная цена группы» · «Регресс-шкала группы» (§11). */
export type GroupMode = 'company' | 'fixed' | 'scale'
export interface GroupSettings { id: string, name: string, mode: GroupMode, price: Price, scale: Scale }
/** Уровень 4а — схема: «По группе» · «Индивидуальная цена» · «Регресс-шкала» (§11, VA-14951). */
export type SchemeMode = 'group' | 'individual' | 'scale'
/** Признаки схемы для меток строки — 6.6. */
export type SchemeFlag = 'new' | 'outdated' | 'multi' | 'nested'
/**
 * Процесс схемы — §1, §6: цена только у повторяемого (`repeatable`), шкалы нет; синглы своей цены не имеют — их стоимость
 * входит в цену осмотра, в блок «Процессы» они не выводятся (такт 81).
 */
export interface ProcessRate { id: string, name: string, repeatable: boolean, price: Price }
/** Уровень 4б — цена типа объекта в схеме: заменяет глобальную цену уровня 2 (§3). */
export interface SchemeTypeRate { typeId: string, price: Price }
export interface SchemeSettings {
  id: string
  groupId: string
  name: string
  /** Идентификатор схемы — вымышленный (scope, п. 8). */
  code: string
  flags: SchemeFlag[]
  mode: SchemeMode
  price: Price
  scale: Scale
  processes: ProcessRate[]
  /** Индивидуальные цены типов объектов включены — «Настроить индивидуально» (§11). */
  individualTypes: boolean
  types: SchemeTypeRate[]
}
/** Настройки периода — 6.8: все уровни иерархии §3. */
export interface TariffSettings {
  base: BaseSettings
  objectTypes: ObjectTypeRate[]
  groups: GroupSettings[]
  schemes: SchemeSettings[]
}

/** Статус тарифного периода — §8: текущий, запланированный, черновик, архив. */
export type PeriodStatus = 'current' | 'planned' | 'draft' | 'archive'
export interface Period {
  id: string
  status: PeriodStatus
  /** Начало интервала — 1-е число месяца (§1, §8), `ГГГГ-ММ`. */
  from: string
  /** Конец интервала — месяц перед началом следующего в очереди; у последнего в очереди и у черновика — `null`. */
  to: string | null
  settings: TariffSettings
  /** Неприменённые правки (§8): автосохранение пишет сюда; «Сохранить изменения» переносит в `settings`. */
  pending: TariffSettings | null
}

/** Справочник типов объектов компании — §1 (13 видов). */
export interface CatalogType { id: string, name: string, icon: string }

/** Начало периода в демо-данных — относительно часов модели: год от текущего и месяц либо «через N месяцев». */
type FromSpec = { year: number, month: number } | { ahead: number }
export interface Dataset {
  company: string
  catalog: CatalogType[]
  settings: TariffSettings
  periods: { id: string, status: 'archive' | 'queued' | 'draft', from: FromSpec, patch: [string, unknown][] }[]
  /** Набор `?data=empty` — компания без типов объектов и группа без схем (№ 26, 57). */
  empty: { objectTypes: ObjectTypeRate[], emptyGroups: string[] }
}

export type TabId = 'base' | 'types' | 'schemes'
export const TABS: { id: TabId, label: string, icon: string }[] = [
  { id: 'base', label: 'Базовые настройки', icon: 'layers' },
  { id: 'types', label: 'Типы объектов', icon: 'package' },
  { id: 'schemes', label: 'Схемы осмотра', icon: 'article' },
]

export type SaveState = 'saving' | 'saved' | 'error'
/** Вилка цен — 6.5: `min` и `max` в ₽; равные — одна цена; `max: null` при заданном `min` — «от X ₽»; обе `null` — цены нет. */
export interface Range { min: number | null, max: number | null }
/** Метка строки — 6.6: `mode` — режим уровня, `new` — новая схема, `flag` — признак из данных, `count` — счёт. */
export interface RowBadge { id: string, text: string, kind: 'mode' | 'new' | 'flag' | 'count' }
export interface Notice { id: number, text: string, kind: 'ok' | 'err', undo: boolean }

export interface ModelOptions {
  /** Набор данных: основной или `empty` (оснастка `?data=empty`). */
  data?: 'main' | 'empty'
  tab?: TabId
  /** `error` — статус ошибки при загрузке; `saving` — запись идёт и не завершается. Оснастка `?save=`. */
  save?: SaveState
  /** Часы модели `ГГГГ-ММ` — оснастка `?now=`; без неё — месяц сегодняшней даты. */
  now?: string
  /** Общая шкала включена при загрузке — оснастка `?scale=on` (такт 78): во всех периодах, как данные: правка не пишется. */
  scale?: boolean
  /** Открытая поверхность при загрузке — оснастка `?open=` (такт 78: `help`; такт 79: `type-picker`). */
  open?: string
  /** Раскрытые строки типов при загрузке — оснастка `?expand=` (такт 79): id типов через запятую. */
  expand?: string[]
  /** Открытая панель группы при загрузке — оснастка `?open=group&group=<id>` (такт 80); без `group` — первая группа. */
  group?: string
  /**
   * Режим открытой панели при загрузке — оснастка `?mode=`: у группы `company` · `fixed` · `scale` (такт 80), у схемы
   * `group` · `individual` · `scale` (такт 81); во всех периодах, как данные — правка не пишется.
   */
  mode?: GroupMode | SchemeMode
  /** Открытая панель схемы при загрузке — оснастка `?open=scheme&scheme=<id>` (такт 81); без `scheme` — первая схема. */
  scheme?: string
  /** Вкладка панели схемы при загрузке — оснастка `?panel=pricing|types` (такт 81). */
  panel?: 'pricing' | 'types'
  /** Выбранный период при загрузке — оснастка `?period=current|planned|draft|archive` (такт 82): первый период статуса. */
  period?: PeriodStatus
}

/** Сколько длится запись черновика на стенде. */
export const SAVE_MS = 700
/** Сколько длится применение правок по «Сохранить изменения» — время показа загрузки кнопки (№ 6). */
export const APPLY_MS = 900

/* ------------------------------ месяцы ------------------------------ */

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
const parseYm = (s: string) => { const [y, m] = s.split('-').map(Number); return { y: y!, m: m! } }
/** Сдвиг месяца `ГГГГ-ММ` на `n` месяцев. */
export function addMonths(s: string, n: number): string {
  const { y, m } = parseYm(s)
  const k = y * 12 + (m - 1) + n
  return ym(Math.floor(k / 12), (k % 12) + 1)
}
/** «апреля 2026» — срок периода в родительном падеже (метка переключателя, 3.3). */
export function monthLabel(s: string): string {
  const { y, m } = parseYm(s)
  return `${MONTHS_GEN[m - 1]} ${y}`
}

/* ------------------------------ служебное ------------------------------ */

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function setPath(root: unknown, path: string, value: unknown): boolean {
  const keys = path.split('.')
  let node = root as Record<string, unknown>
  for (const k of keys.slice(0, -1)) {
    if (node[k] == null || typeof node[k] !== 'object') return false
    node = node[k] as Record<string, unknown>
  }
  const last = keys[keys.length - 1]!
  if (same(node[last], value)) return false
  node[last] = value
  return true
}
function getPath(root: unknown, path: string): unknown {
  let node = root as Record<string, unknown> | undefined
  for (const k of path.split('.')) node = node?.[k] as Record<string, unknown> | undefined
  return node
}

/* ------------------------------ шкала и пара — 6.2, 6.3, чистые функции ------------------------------ */

/**
 * Правила ступеней §5 — общий модуль `ui/regress-scale/rules.ts` (такт 78): ими пользуются и компонент `RegressScale`, и
 * модель — цепочка «От» при записи, ошибки «До» в состоянии. Чистые функции без DOM.
 */
export { chainSteps, stepErrors }

/** Пара с замком — 6.3: связано — «Не клиент» повторяет «Клиент»; связать снова — «Не клиент» принимает «Клиент». */
export function pairWith(price: Price, patch: Partial<Price>): Price {
  const next = { ...price, ...patch }
  if (next.linked) next.nonClient = next.client
  return next
}

/* ------------------------------ модель ------------------------------ */

export function createModel(data: Dataset, opts: ModelOptions = {}) {
  const today = new Date()
  const now = opts.now && /^\d{4}-\d{2}$/.test(opts.now) ? opts.now : ym(today.getFullYear(), today.getMonth() + 1)

  /* ------------------------------ периоды ------------------------------ */
  const base = clone(data.settings)
  if (opts.data === 'empty') {
    base.objectTypes = clone(data.empty.objectTypes)
    base.schemes = base.schemes.filter(s => !data.empty.emptyGroups.includes(s.groupId))
  }
  if (opts.scale) base.base.scale.on = true
  /* Оснастка `?mode=` (такт 80): режим открытой группы — как данные; шкала группы включена ровно в режиме шкалы. */
  const groupAtLoad = opts.open === 'group' ? (base.groups.find(g => g.id === opts.group) ?? base.groups[0]) : undefined
  const GROUP_MODES: string[] = ['company', 'fixed', 'scale']
  const SCHEME_MODES: string[] = ['group', 'individual', 'scale']
  if (groupAtLoad && opts.mode && GROUP_MODES.includes(opts.mode)) { groupAtLoad.mode = opts.mode as GroupMode; groupAtLoad.scale.on = opts.mode === 'scale' }
  /* Оснастка такта 81: панель схемы и режим открытой схемы — как данные. */
  const schemeAtLoad = opts.open === 'scheme' ? (base.schemes.find(x => x.id === opts.scheme) ?? base.schemes[0]) : undefined
  if (schemeAtLoad && opts.mode && SCHEME_MODES.includes(opts.mode)) { schemeAtLoad.mode = opts.mode as SchemeMode; schemeAtLoad.scale.on = opts.mode === 'scale' }
  const fromOf = (f: FromSpec) => 'ahead' in f ? addMonths(now, f.ahead) : ym(parseYm(now).y + f.year, f.month)
  const periods = reactive<Period[]>(data.periods.map((p) => {
    const settings = clone(base)
    for (const [path, value] of p.patch) setPath(settings, path, value)
    return { id: p.id, status: p.status === 'queued' ? 'planned' : p.status, from: fromOf(p.from), to: null, settings, pending: null }
  }))
  /**
   * Статусы очереди по часам модели — 6.4: текущий — последний из начавшихся, запланированные — после него, начавшиеся
   * раньше текущего — архив. Конец интервала — месяц перед началом следующего в очереди.
   */
  function restatus() {
    const queue = periods.filter(p => p.status !== 'draft').sort((a, b) => a.from.localeCompare(b.from))
    const started = queue.filter(p => p.from <= now)
    const cur = started[started.length - 1]
    queue.forEach((p, k) => {
      p.status = p === cur ? 'current' : p.from > now ? 'planned' : 'archive'
      p.to = queue[k + 1] ? addMonths(queue[k + 1]!.from, -1) : null
    })
  }
  restatus()

  /** Выбранный период — по умолчанию текущий; оснастка `?period=` (такт 82); окно удаления черновика открывается на черновике. */
  const currentId = () => periods.find(p => p.status === 'current')?.id ?? periods[0]!.id
  const periodAtLoad = opts.period ?? (opts.open === 'delete-draft' ? 'draft' : undefined)
  const selectedId = reactive({ id: (periodAtLoad && periods.find(p => p.status === periodAtLoad)?.id) || currentId() })
  const selected = computed(() => periods.find(p => p.id === selectedId.id)!)
  /** Показываемые настройки выбранного периода: неприменённые правки поверх применённых. */
  const view = computed<TariffSettings>(() => selected.value.pending ?? selected.value.settings)
  /** Есть неприменённые правки выбранного периода — «Сохранить изменения» активна (§11, стр. 40). */
  const dirty = computed(() => !!selected.value.pending && !same(selected.value.pending, selected.value.settings))
  const readonly = computed(() => selected.value.status === 'archive')

  /* ------------------------------ автосохранение ------------------------------ */
  const save = reactive({ state: (opts.save ?? 'saved') as SaveState, writes: 0 })
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  function write() {
    save.state = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    if (opts.save === 'saving') return
    saveTimer = setTimeout(() => {
      saveTimer = null
      save.writes += 1
      save.state = 'saved'
    }, SAVE_MS)
  }
  /** «Повторить» у ошибки сохранения — §8, № 7. */
  function retry() {
    if (save.state !== 'error') return
    write()
  }

  /* ------------------------------ применение — «Сохранить изменения» ------------------------------ */
  const apply = reactive({ state: 'idle' as 'idle' | 'applying', count: 0 })
  /**
   * «Сохранить изменения» — П1: правки выбранного периода переносятся в его настройки после загрузки кнопки. Окна
   * «Применить изменения?» и очереди (№ 48–51, 6.4) — порция П6.2.
   */
  function applyChanges() {
    if (!dirty.value || apply.state === 'applying') return
    apply.state = 'applying'
    setTimeout(() => {
      const p = selected.value
      if (p.pending) p.settings = p.pending
      p.pending = null
      apply.state = 'idle'
      apply.count += 1
      notify('Изменения применены')
    }, APPLY_MS)
  }

  /* ------------------------------ состояние интерфейса ------------------------------ */
  const ui = reactive({
    tab: (opts.tab ?? 'base') as TabId,
    /** Открытая поверхность — порции П2–П6.2: подсказка (`help`, такт 78), список периодов, окна, панели (6.9, `?open=`). */
    open: (opts.open ?? '') as string,
    /** Открытая панель группы или схемы — порции П4, П5. */
    panel: (groupAtLoad
      ? { kind: 'group', id: groupAtLoad.id, tab: 'pricing' }
      : schemeAtLoad ? { kind: 'scheme', id: schemeAtLoad.id, tab: opts.panel === 'types' ? 'types' : 'pricing' } : null) as null | { kind: 'group' | 'scheme', id: string, tab: 'pricing' | 'types' },
    /** Выбор типа в панели схемы открыт — такт 81 (№ 43 → № 24). */
    schemePicker: false,
    /** Раскрытые строки типов — порция П3 (такт 79), оснастка `?expand=`. */
    expanded: [...(opts.expand ?? [])] as string[],
  })

  /* ------------------------------ уведомления ------------------------------ */
  const notices = reactive<Notice[]>([])
  let noticeSeq = 0
  /**
   * Отмена по уведомлению — такт 78 (строка 52 реестра): действие «Отменить» у уведомления с этим номером. С такта 82
   * отмена помнит период правки: если выбран другой, сначала возвращается выбор периода.
   */
  const undos = new Map<number, { act: () => void, period: string }>()
  function notify(text: string, kind: 'ok' | 'err' = 'ok', undo?: () => void) {
    while (notices.length > 2) undos.delete(notices.shift()!.id)
    const id = ++noticeSeq
    if (undo) undos.set(id, { act: undo, period: selectedId.id })
    notices.push({ id, text, kind, undo: !!undo })
  }
  function dismissNotice(id: number) {
    const k = notices.findIndex(n => n.id === id)
    if (k >= 0) notices.splice(k, 1)
    undos.delete(id)
  }
  /** «Отменить» у уведомления: действие выполняется один раз, уведомление уходит. */
  function undo(id: number) {
    const u = undos.get(id)
    dismissNotice(id)
    if (!u) return
    if (periods.some(p => p.id === u.period)) selectedId.id = u.period
    u.act()
  }

  /* ------------------------------ операции П1 ------------------------------ */
  /**
   * Правка настройки выбранного периода (§8): пишет в `pending` сразу и запускает автосохранение. `path` — путь в
   * настройках, например `base.minPayment`. Архив — только просмотр (№ 47, порция П6.1): отказ.
   */
  function set(path: string, value: unknown): boolean {
    if (readonly.value) { notify('Архивный тариф — только просмотр', 'err'); return false }
    const p = selected.value
    const next = clone(p.pending ?? p.settings)
    if (!setPath(next, path, value)) return false
    p.pending = same(next, p.settings) ? null : next
    write()
    return true
  }
  const get = (path: string) => getPath(view.value, path)
  function setTab(tab: TabId) { ui.tab = tab }
  /** «Назад» — к карточке компании; вход вне скоупа (3.12, стр. 54). */
  function back() { notify('Карточка компании — вне стенда') }
  /** Заготовка операции следующей порции — `tariffs.md`, раздел 10. */
  function pendingPortion(what: string, portion: string) { notify(`${what} — порция ${portion}`) }

  /* ------------------------------ операции П2 — такт 78 ------------------------------ */
  /**
   * Пара цен уровня (6.3): правка поля или замка. `path` — путь пары, например `base.price`. Замок: связано — «Не
   * клиент» повторяет «Клиент»; связать снова — «Не клиент» принимает «Клиент»; развязать — значение прежнее.
   */
  function setPrice(path: string, patch: Partial<Price>): boolean {
    const cur = get(path) as Price | undefined
    if (!cur) return false
    return set(path, pairWith(cur, patch))
  }
  /**
   * Шкала уровня (6.2): включение, форма, ступени. Ступени пишутся с цепочкой «От» (§5) — какими бы их ни прислали.
   * Включённая шкала исключает фиксированную цену уровня: пара выключается на странице (§5, «взаимоисключающие»).
   */
  function setScale(path: string, patch: Partial<Scale>): boolean {
    const cur = get(path) as Scale | undefined
    if (!cur) return false
    const next = { ...clone(cur), ...clone(patch) }
    next.steps = chainSteps(next.steps)
    return set(path, next)
  }
  /** Ступень удалена (стр. 52): уведомление с «Отменить» — возврат ступеней до удаления. */
  function stepRemoved(path: string, previous: ScaleStep[]) {
    notify('Ступень удалена', 'ok', () => { setScale(path, { steps: previous }) })
  }
  /** Открыть или закрыть поверхность — подсказку «Как считается стоимость» (№ 9) и следующие порции. */
  function setOpen(what: string) { ui.open = what }
  /** Ошибки «До» ступеней шкалы уровня — §5, стр. 50. */
  const scaleErrors = (path: string) => stepErrors((get(path) as Scale).steps)

  /* ------------------------------ операции П3 — такт 79: типы объектов ------------------------------ */
  /** Тип справочника по id. */
  const typeOf = (id: string) => data.catalog.find(t => t.id === id)
  /** Путь настройки типа в выбранном периоде — `objectTypes.<номер>`; номер меняется при удалении, поэтому берётся заново. */
  function typePath(id: string): string | null {
    const k = view.value.objectTypes.findIndex(t => t.typeId === id)
    return k < 0 ? null : `objectTypes.${k}`
  }
  /**
   * Список выбора типа (№ 24, §11 «выбор из справочника компании, поиск»): справочник без уже добавленных, по запросу —
   * вхождение без учёта регистра; пустой результат страница показывает «Ничего не найдено».
   */
  function pickerTypes(query = ''): CatalogType[] {
    const q = query.trim().toLowerCase()
    const added = new Set(view.value.objectTypes.map(t => t.typeId))
    return data.catalog.filter(t => !added.has(t.id) && (!q || t.name.toLowerCase().includes(q)))
  }
  /**
   * Добавить тип из справочника (№ 24): в конец таблицы; цена не задана — «Тип без цены не тарифицируется» (§11), пара
   * связана (стр. 51), шкала выключена (§5, стр. 07). Уже добавленный — отказ без правки.
   */
  function addType(id: string): boolean {
    if (!typeOf(id) || view.value.objectTypes.some(t => t.typeId === id)) return false
    const empty = () => ({ client: null, nonClient: null, linked: true })
    const rate: ObjectTypeRate = { typeId: id, price: empty(), scale: { on: false, form: 'single', steps: [{ from: 1, to: null, price: empty() }] } }
    return set('objectTypes', [...clone(view.value.objectTypes), rate])
  }
  /** Удалить тип (№ 25): уведомление с «Отменить» (стр. 52) — тип возвращается на своё место, с раскрытием строки. */
  function removeType(id: string): boolean {
    const list = clone(view.value.objectTypes)
    const k = list.findIndex(t => t.typeId === id)
    if (k < 0) return false
    const [rate] = list.splice(k, 1)
    const wasExpanded = ui.expanded.includes(id)
    if (!set('objectTypes', list)) return false
    ui.expanded = ui.expanded.filter(x => x !== id)
    notify(`Тип «${typeOf(id)?.name ?? id}» удалён`, 'ok', () => {
      if (view.value.objectTypes.some(t => t.typeId === id)) return
      const back = clone(view.value.objectTypes)
      back.splice(Math.min(k, back.length), 0, rate!)
      set('objectTypes', back)
      if (wasExpanded && !ui.expanded.includes(id)) ui.expanded.push(id)
    })
    return true
  }
  /** Раскрыть или свернуть строку типа (№ 22, 23): в раскрытой — шкала типа. */
  function toggleExpand(id: string) {
    ui.expanded = ui.expanded.includes(id) ? ui.expanded.filter(x => x !== id) : [...ui.expanded, id]
  }
  /**
   * Рубильник шкалы типа (№ 22): включённая шкала выключает пару строки (§5, стр. 08); включение раскрывает строку —
   * ступени видны сразу (стр. 69).
   */
  function setTypeScaleOn(id: string, on: boolean): boolean {
    const path = typePath(id)
    if (!path || !setScale(`${path}.scale`, { on })) return false
    if (on && !ui.expanded.includes(id)) ui.expanded = [...ui.expanded, id]
    return true
  }

  /* ------------------------------ операции П4 — такт 80: схемы осмотра и панель группы ------------------------------ */
  /** Диапазон цен: меньшая и большая из заданных; одна цена — равные границы; цен нет — `null` и `null`. */
  function bounds(values: (number | null)[]): Range {
    const xs = values.filter((v): v is number => v != null)
    return xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : { min: null, max: null }
  }
  const pairValues = (p: Price) => [p.client, p.linked ? p.client : p.nonClient]
  /** Цены шкалы: «Единая цена» — цена клиента ступени, «По ролям» — обе (6.2). */
  const scaleValues = (sc: Scale) => sc.steps.flatMap(st => (sc.form === 'single' ? [st.price.client] : pairValues(st.price)))
  /**
   * Вилка компании (уровень 1, режим группы «Базовая цена компании») — §11 «Что показывается в вилке цен группы»: пара
   * «клиент – не клиент» базовой цены; при включённой общей шкале — мин–макс шкалы; если базовой цены нет, а задана
   * минимальная сумма за период — «от X ₽».
   */
  function companyRange(): Range {
    const b = view.value.base
    const r = bounds(b.scale.on ? scaleValues(b.scale) : pairValues(b.price))
    if (r.min == null && b.minPayment != null) return { min: b.minPayment, max: null }
    return r
  }
  const groupOf = (id: string) => view.value.groups.find(g => g.id === id)
  const schemeOf = (id: string) => view.value.schemes.find(x => x.id === id)
  /** Вилка группы по режиму (6.5): компания · фиксированная пара · мин–макс шкалы. */
  function groupRange(id: string): Range {
    const g = groupOf(id)
    if (!g) return { min: null, max: null }
    if (g.mode === 'company') return companyRange()
    return bounds(g.mode === 'fixed' ? pairValues(g.price) : scaleValues(g.scale))
  }
  /** Вилка схемы по режиму (6.5): «По группе» — вилка группы; индивидуальная пара; мин–макс шкалы. Цены типов не входят (стр. 56). */
  function schemeRange(id: string): Range {
    const x = schemeOf(id)
    if (!x) return { min: null, max: null }
    if (x.mode === 'group') return groupRange(x.groupId)
    return bounds(x.mode === 'individual' ? pairValues(x.price) : scaleValues(x.scale))
  }
  /** Схемы группы в порядке данных. */
  const schemesOf = (groupId: string) => view.value.schemes.filter(x => x.groupId === groupId)
  /** «1 схема», «2 схемы», «5 схем». */
  function schemesWord(n: number) {
    const d = n % 10
    const h = n % 100
    return d === 1 && h !== 11 ? 'схема' : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'схемы' : 'схем'
  }
  /** Метки строки группы — 6.6: счёт «N схемы»; режим — только «Регресс-шкала». */
  function groupBadges(id: string): RowBadge[] {
    const g = groupOf(id)
    if (!g) return []
    const n = schemesOf(id).length
    const out: RowBadge[] = [{ id: 'count', text: `${n} ${schemesWord(n)}`, kind: 'count' }]
    if (g.mode === 'scale') out.push({ id: 'mode', text: 'Регресс-шкала', kind: 'mode' })
    return out
  }
  /** Метки строки схемы — 6.6: режим, индивидуальные типы, признаки из данных (стр. 55). */
  const MODE_BADGE: Record<SchemeMode, string> = { group: 'По группе', individual: 'Индивид. цены', scale: 'Регресс-шкала' }
  const FLAG_BADGE: Record<SchemeFlag, string> = { new: 'Новая', outdated: 'Устаревшая', multi: 'Мульти', nested: 'Вложенный' }
  function schemeBadges(id: string): RowBadge[] {
    const x = schemeOf(id)
    if (!x) return []
    const out: RowBadge[] = [{ id: 'mode', text: MODE_BADGE[x.mode], kind: 'mode' }]
    if (x.individualTypes) out.push({ id: 'types', text: 'Индивидуальные типы', kind: 'mode' })
    for (const f of x.flags) out.push({ id: f, text: FLAG_BADGE[f], kind: f === 'new' ? 'new' : 'flag' })
    return out
  }
  /** Сколько схем группы в режиме «По группе» — метка «N по группе» панели (6.6, № 36). */
  const inheritingCount = (groupId: string) => schemesOf(groupId).filter(x => x.mode === 'group').length
  /** Путь группы в выбранном периоде — `groups.<номер>`. */
  function groupPath(id: string): string | null {
    const k = view.value.groups.findIndex(g => g.id === id)
    return k < 0 ? null : `groups.${k}`
  }
  /** Открыть панель группы (№ 32): «Настроить группу». */
  function openGroup(id: string) {
    if (!groupOf(id)) return
    ui.panel = { kind: 'group', id, tab: 'pricing' }
    ui.open = 'group'
  }
  /** Закрыть панель — Esc, крестик, клик мимо (ТФ-24): правки панели уже записаны автосохранением. */
  function closePanel() {
    ui.panel = null
    ui.schemePicker = false
    if (ui.open === 'group' || ui.open === 'scheme') ui.open = ''
  }
  /**
   * Режим группы (№ 33, §11): «Базовая цена компании» · «Фиксированная цена группы» · «Регресс-шкала группы». Шкала группы
   * включена ровно в режиме шкалы — режим сам исключает фиксированную цену (§5). Пара и ступени не стираются: возврат к
   * режиму показывает прежние значения.
   */
  function setGroupMode(id: string, mode: GroupMode): boolean {
    const path = groupPath(id)
    const g = groupOf(id)
    if (!path || !g) return false
    const next = clone(g)
    next.mode = mode
    next.scale.on = mode === 'scale'
    return set(path, next)
  }

  /* ------------------------------ операции П5 — такт 81: панель схемы ------------------------------ */
  /** Путь схемы в выбранном периоде — `schemes.<номер>`. */
  function schemePath(id: string): string | null {
    const k = view.value.schemes.findIndex(x => x.id === id)
    return k < 0 ? null : `schemes.${k}`
  }
  /** Открыть панель схемы (№ 37): шестерёнка строки схемы; вкладка — «Ценообразование». */
  function openScheme(id: string) {
    if (!schemeOf(id)) return
    ui.panel = { kind: 'scheme', id, tab: 'pricing' }
    ui.schemePicker = false
    ui.open = 'scheme'
  }
  /** Вкладка панели схемы (№ 37): «Ценообразование» · «Типы объектов». */
  function setPanelTab(tab: 'pricing' | 'types') {
    if (ui.panel?.kind === 'scheme') ui.panel = { ...ui.panel, tab }
  }
  /**
   * Режим схемы (№ 38, §11; VA-14951): «По группе» · «Индивидуальная цена» · «Регресс-шкала». Шкала схемы включена ровно в
   * режиме шкалы — режим сам исключает индивидуальную цену (§5). Пара и ступени не стираются (как у группы, стр. 78).
   */
  function setSchemeMode(id: string, mode: SchemeMode): boolean {
    const path = schemePath(id)
    const x = schemeOf(id)
    if (!path || !x) return false
    const next = clone(x)
    next.mode = mode
    next.scale.on = mode === 'scale'
    return set(path, next)
  }
  /** Повторяемые процессы схемы с ценой (№ 41, §6): синглы своей цены не имеют и в блок не выводятся. */
  const repeatableOf = (id: string) => (schemeOf(id)?.processes ?? []).filter(p => p.repeatable)
  /** Путь цены процесса — `schemes.<номер>.processes.<номер>.price`. */
  function processPath(id: string, processId: string): string | null {
    const path = schemePath(id)
    const k = schemeOf(id)?.processes.findIndex(p => p.id === processId) ?? -1
    return path && k >= 0 ? `${path}.processes.${k}.price` : null
  }
  /** Путь цены типа в схеме — `schemes.<номер>.types.<номер>.price`. */
  function schemeTypePath(id: string, typeId: string): string | null {
    const path = schemePath(id)
    const k = schemeOf(id)?.types.findIndex(t => t.typeId === typeId) ?? -1
    return path && k >= 0 ? `${path}.types.${k}.price` : null
  }
  /**
   * Глобальная цена типа (уровень 2) для списка «только для чтения» панели схемы (№ 42): при включённой шкале типа —
   * мин–макс шкалы, иначе пара; цены нет — «—» (6.5).
   */
  function globalTypeRange(typeId: string): Range {
    const t = view.value.objectTypes.find(x => x.typeId === typeId)
    if (!t) return { min: null, max: null }
    return bounds(t.scale.on ? scaleValues(t.scale) : pairValues(t.price))
  }
  /**
   * «Настроить индивидуально» (№ 42 → № 43, §11): индивидуальные цены типов схемы — копия глобальных пар (уровень 2);
   * шкалы у типов в схеме нет (ждут людей, п. 9, стр. 17). Метка строки схемы — «Индивидуальные типы» (6.6).
   */
  function customizeTypes(id: string): boolean {
    const path = schemePath(id)
    const x = schemeOf(id)
    if (!path || !x || x.individualTypes) return false
    const next = clone(x)
    next.individualTypes = true
    next.types = view.value.objectTypes.map(t => ({ typeId: t.typeId, price: clone(t.price) }))
    return set(path, next)
  }
  /** «Сбросить к глобальным» (№ 43, 56): индивидуальные цены типов убраны; уведомление с «Отменить» возвращает их (стр. 52). */
  function resetTypes(id: string): boolean {
    const path = schemePath(id)
    const x = schemeOf(id)
    if (!path || !x || !x.individualTypes) return false
    const before = { individualTypes: x.individualTypes, types: clone(x.types) }
    const next = clone(x)
    next.individualTypes = false
    next.types = []
    if (!set(path, next)) return false
    ui.schemePicker = false
    notify('Цены типов сброшены к глобальным', 'ok', () => {
      const p = schemePath(id)
      const cur = schemeOf(id)
      if (!p || !cur || cur.individualTypes) return
      set(p, { ...clone(cur), ...clone(before) })
    })
    return true
  }
  /** Выбор типа в панели схемы (№ 43 → № 24): справочник без типов схемы, поиск — как на вкладке «Типы объектов». */
  function schemePickerTypes(id: string, query = ''): CatalogType[] {
    const q = query.trim().toLowerCase()
    const added = new Set((schemeOf(id)?.types ?? []).map(t => t.typeId))
    return data.catalog.filter(t => !added.has(t.id) && (!q || t.name.toLowerCase().includes(q)))
  }
  /**
   * Добавить тип в индивидуальные цены схемы (№ 43): в конец списка; цена — копия глобальной пары типа, если тип есть на
   * вкладке «Типы объектов», иначе не задана, пара связана (стр. 51).
   */
  function addSchemeType(id: string, typeId: string): boolean {
    const path = schemePath(id)
    const x = schemeOf(id)
    if (!path || !x || !x.individualTypes || !typeOf(typeId) || x.types.some(t => t.typeId === typeId)) return false
    const global = view.value.objectTypes.find(t => t.typeId === typeId)
    const price: Price = global ? clone(global.price) : { client: null, nonClient: null, linked: true }
    return set(`${path}.types`, [...clone(x.types), { typeId, price }])
  }

  /* ------------------------------ операции П6.1 — такт 82: периоды, планирование, черновик ------------------------------ */
  /** Выбор периода (№ 4, 5, §8): данные всех вкладок и панелей — настройки выбранного; список закрывается. */
  function selectPeriod(id: string) {
    if (!periods.some(p => p.id === id)) return
    selectedId.id = id
    if (ui.open === 'periods') ui.open = ''
  }
  /** Периоды для переключателя: `id`, статус, начало и конец интервала. */
  const periodList = computed(() => periods.map(p => ({ id: p.id, status: p.status, from: p.from, to: p.to })))

  /** Год и месяц окна планирования (№ 44, 45). */
  const plan = reactive({ year: 0, month: 0 })
  const nowYm = parseYm(now)
  const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1)
  /** Месяц доступен: позже текущего месяца часов модели — прошедшие и текущий выключены (§8, решение оркестратора 4). */
  const monthOpen = (y: number, m: number) => ym(y, m) > now
  /** Годы окна — четыре, от года часов модели (Figma `31246:7322`); год без доступных месяцев выключен. */
  const planYears = computed(() => [0, 1, 2, 3].map((k) => {
    const y = nowYm.y + k
    return { year: y, disabled: !MONTH_NUMBERS.some(m => monthOpen(y, m)) }
  }))
  /** Месяцы выбранного года — двенадцать ячеек (Figma `31246:7294`). */
  const PLAN_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const planMonths = computed(() => PLAN_MONTHS.map((label, i) => ({ month: i + 1, label, disabled: !monthOpen(plan.year, i + 1) })))
  /** Открыть окно планирования: выбран первый доступный месяц — следующий за текущим. */
  function openPlan() {
    const next = parseYm(addMonths(now, 1))
    plan.year = next.y
    plan.month = next.m
    ui.open = 'plan'
  }
  /** Год окна: месяц прежний, если доступен; иначе первый доступный месяц года. */
  function setPlanYear(y: number) {
    if (!planYears.value.some(x => x.year === y && !x.disabled)) return
    plan.year = y
    if (!monthOpen(y, plan.month)) plan.month = MONTH_NUMBERS.find(m => monthOpen(y, m)) ?? plan.month
  }
  function setPlanMonth(m: number) {
    if (monthOpen(plan.year, m)) plan.month = m
  }
  /** «1 октября 2026» — начало интервала с 1-го числа (стр. 18). */
  function startLabel(from: string) { return `1 ${monthLabel(from)}` }
  /**
   * «Сохранить» в окне планирования (6.4): новый черновик с началом 1-го числа выбранного месяца (стр. 18), настройки —
   * копия применённых настроек текущего тарифа (Figma `31246:7290`: «Все текущие настройки… будут скопированы»).
   * Переключатель — «Черновик с <месяц год>», плашка черновика. Пересечения с очередью — при сохранении черновика (П6.2).
   */
  let draftSeq = 0
  function confirmPlan(): boolean {
    if (!monthOpen(plan.year, plan.month)) return false
    const from = ym(plan.year, plan.month)
    const cur = periods.find(p => p.status === 'current') ?? selected.value
    const id = `p-draft-new-${++draftSeq}`
    periods.push({ id, status: 'draft', from, to: null, settings: clone(cur.settings), pending: null })
    selectedId.id = id
    ui.open = ''
    notify(`Черновик создан: тарифы вступят в силу ${startLabel(from)}`)
    return true
  }
  /** «с 1 января 2025 по 31 декабря 2025» — интервал периода по дням (плашка архива, № 47); без конца — «с 1 <месяца> <года>». */
  function periodSpan(id: string): string {
    const p = periods.find(x => x.id === id)
    if (!p) return ''
    if (!p.to) return `с ${startLabel(p.from)}`
    const { y, m } = parseYm(p.to)
    return `с ${startLabel(p.from)} по ${new Date(y, m, 0).getDate()} ${monthLabel(p.to)}`
  }
  /** «Удалить черновик» (№ 46): окно подтверждения (стр. 44). */
  function openDeleteDraft() {
    if (selected.value.status === 'draft') ui.open = 'delete-draft'
  }
  /** Подтверждение удаления: черновик удалён, выбран текущий тариф. */
  function confirmDeleteDraft(): boolean {
    const k = periods.findIndex(p => p.id === selectedId.id && p.status === 'draft')
    if (k < 0) return false
    periods.splice(k, 1)
    selectedId.id = currentId()
    ui.open = ''
    notify('Черновик удалён')
    return true
  }
  if (opts.open === 'plan') openPlan()

  /* ------------------------------ вычисления для страницы ------------------------------ */
  /** Счётчики вкладок (№ 8): типов объектов и схем выбранного периода. */
  const counts = computed(() => ({ types: view.value.objectTypes.length, schemes: view.value.schemes.length }))

  /** Состояние модели одной строкой — прогону, для сравнения «до / после». */
  function dump() {
    return JSON.stringify({
      now, selected: selectedId.id, periods: periods.map(p => ({ id: p.id, status: p.status, from: p.from, to: p.to, dirty: !!p.pending })),
      plan: { year: plan.year, month: plan.month }, view: view.value, save: save.state, writes: save.writes, apply: apply.state, applied: apply.count, ui: { tab: ui.tab, open: ui.open, expanded: ui.expanded, panel: ui.panel },
      errors: { base: scaleErrors('base.scale') },
    })
  }

  return {
    company: data.company, catalog: data.catalog, now, periods, selected, selectedId, view, dirty, readonly, save, apply, ui, notices, counts,
    set, get, setTab, back, retry, applyChanges, pendingPortion, notify, dismissNotice, undo, dump,
    setPrice, setScale, stepRemoved, setOpen, scaleErrors,
    typeOf, typePath, pickerTypes, addType, removeType, toggleExpand, setTypeScaleOn,
    companyRange, groupRange, schemeRange, schemesOf, schemesWord, groupBadges, schemeBadges, inheritingCount, groupPath, groupOf, schemeOf,
    openGroup, closePanel, setGroupMode,
    schemePath, openScheme, setPanelTab, setSchemeMode, repeatableOf, processPath, schemeTypePath, globalTypeRange,
    customizeTypes, resetTypes, schemePickerTypes, addSchemeType,
    selectPeriod, periodList, plan, planYears, planMonths, openPlan, setPlanYear, setPlanMonth, confirmPlan, startLabel, periodSpan,
    openDeleteDraft, confirmDeleteDraft,
  }
}

export type TariffsModel = ReturnType<typeof createModel>
