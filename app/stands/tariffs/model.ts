import { computed, reactive } from 'vue'

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
/** Повторяемый процесс — §6: цена у каждого, шкалы нет. */
export interface ProcessRate { id: string, name: string, price: Price }
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
export interface Notice { id: number, text: string, kind: 'ok' | 'err', undo: boolean }

export interface ModelOptions {
  /** Набор данных: основной или `empty` (оснастка `?data=empty`). */
  data?: 'main' | 'empty'
  tab?: TabId
  /** `error` — статус ошибки при загрузке; `saving` — запись идёт и не завершается. Оснастка `?save=`. */
  save?: SaveState
  /** Часы модели `ГГГГ-ММ` — оснастка `?now=`; без неё — месяц сегодняшней даты. */
  now?: string
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

/* ------------------------------ шкала — 6.2, чистые функции ------------------------------ */

/** «От» каждой ступени: первая — 1, следующие — предыдущее «До» + 1 (§5). */
export function chainSteps(steps: ScaleStep[]): ScaleStep[] {
  return steps.map((s, k) => ({ ...s, from: k === 0 ? 1 : (steps[k - 1]!.to ?? steps[k - 1]!.from) + 1 }))
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

  /** Выбранный период — по умолчанию текущий (переключатель — порция П6.1). */
  const selectedId = reactive({ id: periods.find(p => p.status === 'current')?.id ?? periods[0]!.id })
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
    /** Открытая поверхность — порции П2–П6.2: подсказка, список периодов, окна, панели (6.9, `?open=`). */
    open: '' as string,
    /** Открытая панель группы или схемы — порции П4, П5. */
    panel: null as null | { kind: 'group' | 'scheme', id: string, tab: 'pricing' | 'types' },
    /** Раскрытые строки типов — порция П3. */
    expanded: [] as string[],
  })

  /* ------------------------------ уведомления ------------------------------ */
  const notices = reactive<Notice[]>([])
  let noticeSeq = 0
  function notify(text: string, kind: 'ok' | 'err' = 'ok', undo = false) {
    while (notices.length > 2) notices.shift()
    notices.push({ id: ++noticeSeq, text, kind, undo })
  }
  function dismissNotice(id: number) {
    const k = notices.findIndex(n => n.id === id)
    if (k >= 0) notices.splice(k, 1)
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

  /* ------------------------------ вычисления для страницы ------------------------------ */
  /** Счётчики вкладок (№ 8): типов объектов и схем выбранного периода. */
  const counts = computed(() => ({ types: view.value.objectTypes.length, schemes: view.value.schemes.length }))

  /** Состояние модели одной строкой — прогону, для сравнения «до / после». */
  function dump() {
    return JSON.stringify({
      now, selected: selectedId.id, periods: periods.map(p => ({ id: p.id, status: p.status, from: p.from, to: p.to, dirty: !!p.pending })),
      view: view.value, save: save.state, writes: save.writes, apply: apply.state, applied: apply.count, ui: { tab: ui.tab, open: ui.open },
    })
  }

  return {
    company: data.company, catalog: data.catalog, now, periods, selected, selectedId, view, dirty, readonly, save, apply, ui, notices, counts,
    set, get, setTab, back, retry, applyChanges, pendingPortion, notify, dismissNotice, dump,
  }
}

export type TariffsModel = ReturnType<typeof createModel>
