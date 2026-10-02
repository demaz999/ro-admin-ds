import { computed, reactive } from 'vue'

/**
 * Модель состояния страницы «Редактирование схемы осмотра» (VA-16377) — такты 61–62, порции П1–П2.
 * План и границы — `docs/scheme-edit.md`, 6.2. Поведение — `docs/sources/scheme-edit/spec-r2.md`, обоснования —
 * `spec-audit.md`. HTML-прототипа нет: модель написана по спеке.
 *
 * ## Границы
 *
 * - DOM и компонентов модуль не знает: данные, операции и вычисления на реактивности Vue. Прокрутка к якорю, фокус и
 *   подсветка найденного — страница.
 * - Отказы и подтверждения — очередь `notices`; показывает её страница (`Toast`).
 * - Автосохранение — поле `save.state`: `saving` → `saved` либо `error`, таймер `SAVE_MS`; `retry()` повторяет запись
 *   (r2 §2, состояния 4–5).
 * - Оснастка адреса выставляет состояние модели параметрами `createModel`.
 *
 * ## Что перенесено
 *
 * Структура — целиком: конфигурация, версии (снимки, current, черновик), автосохранение, состояние интерфейса, очередь
 * уведомлений. Операции и вычисления — сценарии П1: СС-01 (`back`), СС-13 (`setTab`, `setSection`, `rememberScroll`),
 * СС-20 (`set`), СС-49 (`retry`). **П2 (такт 62):** настройки раздела «Общие» целиком (r2 §4), матрица зависимостей
 * `rules` — «гасит» и «вооружает» (СС-17–СС-19, СС-21), переменные и превью формул (СС-22), статус-точки разделов
 * (СС-15), соседние разделы (СС-16), сайд словаря комментариев (`openSide`, `closeSide`, СС-59). Дифф, валидация,
 * поиск, публикация, сброс черновика, просмотр снимка, операции формы, процессов и витрины — по своим порциям
 * (`scheme-edit.md`, раздел 10).
 */

export type TabId = 'settings' | 'form' | 'processes' | 'showcase'
export type SectionId = 'general' | 'mobile' | 'web' | 'access' | 'ai' | 'anomalies' | 'pdf'
export const TABS: { id: TabId, label: string }[] = [
  { id: 'settings', label: 'Настройки' },
  { id: 'form', label: 'Форма' },
  { id: 'processes', label: 'Процессы и шаги' },
  { id: 'showcase', label: 'Витрина' },
]
/** Семь разделов «Настроек» — r2 §4. */
export const SECTIONS: { id: SectionId, label: string }[] = [
  { id: 'general', label: 'Общие' },
  { id: 'mobile', label: 'Мобильное приложение' },
  { id: 'web', label: 'Веб-приложение' },
  { id: 'access', label: 'Права доступа' },
  { id: 'ai', label: 'ИИ-анализ' },
  { id: 'anomalies', label: 'Аномалии' },
  { id: 'pdf', label: 'PDF' },
]

/** Якоря подразделов «Общих» — r2 §4; порядок — макет `32765:2380`. */
export const GENERAL_ANCHORS = [
  { id: 'main', label: 'Основное' },
  { id: 'behavior', label: 'Поведение процесса' },
  { id: 'formulas', label: 'Формулы и служебное' },
  { id: 'dictionaries', label: 'Словари' },
  { id: 'deadlines', label: 'Дедлайны и доступ к осмотру' },
  { id: 'confirm', label: 'Экран подтверждения' },
] as const
export type GeneralAnchor = typeof GENERAL_ANCHORS[number]['id']

/** «Поведение процесса» — дерево решений (аудит, «Группировка чекбоксов»); порядок групп — r2 §4. */
export interface BehaviorSettings {
  /* Экспертиза и проверка */
  skipExpertise: boolean
  lockOnReview: boolean
  unlockMinutes: number
  quickAccept: boolean
  requireAllSteps: boolean
  lowRolesReturn: boolean
  /* Отказ от осмотра */
  refuse: boolean
  refuseRepeatable: boolean
  refuseCommentVisibility: 'all' | 'expert' | 'admin'
  /* Согласование */
  approval: boolean
  approvalRequired: boolean
  /* Расширенное */
  cadastreMap: boolean
  forbidExtraFiles: boolean
}
/** Четыре формулы «Формул и служебного» — строки с переменными `{Группа:ключ}`. */
export interface FormulaSettings { objectName: string, schemeName: string, zipName: string, mailSubject: string }
export interface DeadlineSettings {
  mode: 'none' | 'hours' | 'days'
  hours: number
  days: number
  from: string
  editors: string[]
  share: 'anyone' | 'executor' | 'executor-up' | 'nobody'
  manualCoordinate: string[]
}
/** Раздел «Общие» — r2 §4: шесть подразделов. Остальные разделы наполняются своими порциями. */
export interface GeneralSettings {
  name: string
  description: string
  schemeType: string
  owner: string
  inspectionType: 'regular' | 'multi'
  purpose: 'standard' | 'typical' | 'sample'
  active: boolean
  behavior: BehaviorSettings
  formulas: FormulaSettings
  dictionaries: { statuses: string, comments: string }
  deadlines: DeadlineSettings
  confirm: { hint: string, checkbox: string }
}

/** Значения по умолчанию подразделов «Общих»: набор данных хранит только отличия. */
export const GENERAL_DEFAULTS: Pick<GeneralSettings, 'behavior' | 'formulas' | 'dictionaries' | 'deadlines' | 'confirm'> = {
  behavior: {
    skipExpertise: false, lockOnReview: true, unlockMinutes: 60, quickAccept: false, requireAllSteps: false, lowRolesReturn: false,
    refuse: false, refuseRepeatable: false, refuseCommentVisibility: 'all',
    approval: false, approvalRequired: false,
    cadastreMap: false, forbidExtraFiles: false,
  },
  formulas: { objectName: '{Car:vin}', schemeName: '{Scheme:type}', zipName: '{Car:vin}', mailSubject: 'Осмотр {Inspection:number} — {Car:vin}' },
  dictionaries: { statuses: 'standard', comments: 'vehicle' },
  deadlines: { mode: 'none', hours: 48, days: 4, from: 'expertise', editors: ['admin'], share: 'anyone', manualCoordinate: ['admin'] },
  confirm: { hint: '', checkbox: '' },
}

/* Справочники стенда — вымышленные. */
export const SCHEME_TYPES = [
  { value: 'vehicle', label: 'Осмотр транспорта' },
  { value: 'house', label: 'Осмотр недвижимости' },
  { value: 'equipment', label: 'Осмотр оборудования' },
]
export const OWNERS = ['Демо Страхование', 'Пример Лизинг', 'Образец Банк'].map(v => ({ value: v, label: v }))
export const ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'approver', label: 'Согласующий' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'operator', label: 'Оператор' },
  { value: 'agent', label: 'Агент' },
]
export const STATUS_DICTIONARIES = [
  { value: 'standard', label: 'Стандартный словарь статусов' },
  { value: 'short', label: 'Сокращённый словарь статусов' },
]
export const COMMENT_DICTIONARIES = [
  { value: 'vehicle', label: 'Комментарии к осмотру транспорта', comments: ['Фото нерезкое', 'Не виден VIN', 'Кадр снят не с того ракурса', 'Объект снят не полностью'] },
  { value: 'common', label: 'Общий словарь комментариев', comments: ['Фото нерезкое', 'Недостаточно света', 'Кадр не относится к шагу'] },
  { value: 'docs', label: 'Комментарии к документам', comments: ['Документ не читается', 'Нет страницы с отметками'] },
]
export const DEADLINE_EVENTS = [
  { value: 'expertise', label: 'От последнего попадания в экспертизу' },
  { value: 'created', label: 'От создания осмотра' },
  { value: 'finished', label: 'От завершения съёмки' },
]
/** Служебные переменные формул и демо-значения для превью; переменные полей берутся из формы черновика. */
export const SYSTEM_VARIABLES = [
  { value: 'Inspection:number', label: 'Номер осмотра', group: 'Осмотр', sample: '№ 1024' },
  { value: 'Inspection:date', label: 'Дата осмотра', group: 'Осмотр', sample: '02.10.2026' },
  { value: 'Scheme:type', label: 'Тип схемы', group: 'Схема', sample: 'Осмотр транспорта' },
]
const FIELD_SAMPLES: Record<string, string> = { policy_number: 'К-0001024', vin: 'DEMO0000000001024', regnum: 'А000АА00', mileage: '48 200' }

export interface FormField { id: string, title: string, alias: string, type: string, required: boolean, webOnly: boolean, dependent: boolean, approval?: boolean }
export interface FormGroup { id: string, title: string, alias: string, fields: FormField[] }
export interface ProcessStep { id: string, title: string, kind: string, method: string, networks: string[], hints: number }
export interface Process { id: string, title: string, alias: string, repeatable: boolean, steps: ProcessStep[] }
export interface Showcase {
  /** Жизненный цикл карточки — аудит, «Структура таба»: требует украшения → черновик → опубликована. */
  status: 'needs' | 'draft' | 'published'
  title: string
  summary: string
  priceFrom: number | null
  industry: string
  spheres: string[]
  problems: { problem: string, effect: string, solution: string }[]
  metrics: { label: string, value: string }[]
  hiddenModules: string[]
}
export interface SchemeConfig {
  settings: { general: GeneralSettings } & Record<Exclude<SectionId, 'general'>, Record<string, unknown>>
  form: { groups: FormGroup[] }
  processes: Process[]
  showcase: Showcase
}

/** Неизменяемый снимок версии — r2 §2. */
export interface Snapshot { id: string, publishedAt: string, author: string, inspections: number, config: SchemeConfig }
export interface Draft { config: SchemeConfig, author: string, editedAt: string }

export type SaveState = 'saving' | 'saved' | 'error'
/** Состояние публикации для индикатора шапки — r2 §2, состояния 1–3. */
export type PublishState = 'never' | 'draft' | 'published'
export interface Notice { id: number, text: string, kind: 'ok' | 'err', undo: boolean }
/** Правило зависимости для строки настройки: причина недоступности («гасит») либо счётчик связи («вооружает»). */
export interface Rule { reason: string, meta: string, metaTone: 'default' | 'warning' }
export type SectionStatus = 'none' | 'on' | 'off' | 'attention'

/** Открытая поверхность — r2 §7: сайд, модалка-гейт, оверлей; стек — снизу вверх. */
export interface Surface { kind: 'side' | 'modal' | 'overlay', id: string }

/** Набор демо-данных: у набора с версиями черновик задан правками поверх current, у новой схемы — конфигурацией. */
export interface Dataset {
  snapshots: Snapshot[]
  draft: { author: string, editedAt: string, config?: SchemeConfig, patch?: [string, unknown][] }
}

export interface ModelOptions {
  /** Автор правок на стенде. */
  user?: string
  tab?: TabId
  /** `error` — статус ошибки при загрузке; `saving` — запись идёт и не завершается. Оснастка `?save=`. */
  save?: SaveState
  /** Следующая запись завершится ошибкой — оснастка `?save=fail`. */
  failNext?: boolean
  /** Часы — для проверки без таймеров. */
  now?: () => string
}

/** Сколько длится запись черновика на стенде. */
export const SAVE_MS = 700

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

/** Подразделы «Общих», которых нет в наборе данных, берутся из значений по умолчанию; заданные ключи — поверх. */
function withDefaults(config: SchemeConfig): SchemeConfig {
  const g = config.settings.general as unknown as Record<string, unknown>
  for (const [key, def] of Object.entries(GENERAL_DEFAULTS)) g[key] = { ...clone(def), ...(g[key] as object | undefined) }
  return config
}
/** «N полей» — согласование числительного. */
const plural = (n: number, one: string, few: string, many: string) => {
  const d = n % 10
  const h = n % 100
  return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}

function setPath(root: unknown, path: string, value: unknown): boolean {
  const keys = path.split('.')
  let node = root as Record<string, unknown>
  for (const k of keys.slice(0, -1)) {
    if (node[k] == null || typeof node[k] !== 'object') return false
    node = node[k] as Record<string, unknown>
  }
  const last = keys[keys.length - 1]!
  if (JSON.stringify(node[last]) === JSON.stringify(value)) return false
  node[last] = value
  return true
}

export function createModel(data: Dataset, opts: ModelOptions = {}) {
  const now = opts.now ?? (() => new Date().toISOString())
  const user = opts.user ?? 'Анна Смирнова'

  /* ------------------------------ версии ------------------------------ */
  const snapshots = reactive<Snapshot[]>(clone(data.snapshots).map(v => ({ ...v, config: withDefaults(v.config) })))
  /** current — последний опубликованный снимок: новые осмотры идут на него (r2 §2). */
  const current = computed<Snapshot | null>(() => snapshots[snapshots.length - 1] ?? null)

  const startConfig = data.draft.config ? withDefaults(clone(data.draft.config)) : clone(snapshots[snapshots.length - 1]!.config)
  for (const [path, value] of data.draft.patch ?? []) setPath(startConfig, path, value)
  const draft = reactive<Draft>({ config: startConfig, author: data.draft.author, editedAt: data.draft.editedAt })

  /** Черновик отличается от current: есть неопубликованные изменения. */
  const dirty = computed(() => !!current.value && JSON.stringify(draft.config) !== JSON.stringify(current.value.config))
  const publishState = computed<PublishState>(() => !current.value ? 'never' : dirty.value ? 'draft' : 'published')

  /* ------------------------------ автосохранение ------------------------------ */
  const save = reactive({ state: (opts.save ?? 'saved') as SaveState, failNext: !!opts.failNext, writes: 0 })
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  function write() {
    save.state = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      if (save.failNext) { save.failNext = false; save.state = 'error'; return }
      save.writes += 1
      save.state = 'saved'
    }, SAVE_MS)
  }
  /** «Повторить» у ошибки сохранения — r2 §2, состояние 5. */
  function retry() {
    if (save.state !== 'error') return
    write()
  }

  /* ------------------------------ состояние интерфейса ------------------------------ */
  const ui = reactive({
    tab: (opts.tab ?? 'settings') as TabId,
    section: 'general' as SectionId,
    anchor: '',
    /** Прокрутка каждого таба — СС-13: переключение возвращает на прежнее место. */
    scroll: { settings: 0, form: 0, processes: 0, showcase: 0 } as Record<TabId, number>,
    surfaces: [] as Surface[],
    selectedFields: [] as string[],
    selectedSteps: [] as string[],
    query: '',
    /** Плашка «Сохранение теперь автоматическое» закрыта — СС-56. */
    hintClosed: false,
    /** Presence: кто ещё редактирует схему — r2 §2, состояние 6. */
    editing: '',
    /** Открытый на просмотр снимок — r2 §2, состояние 7; пока он задан, правка отказывает. */
    viewing: '' as string,
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
   * Правка настройки на полотне: пишет в черновик сразу и запускает автосохранение (r2 §2, §7: на полотне явных кнопок
   * сохранения нет). `path` — путь в конфигурации, например `settings.general.name`.
   */
  function set(path: string, value: unknown): boolean {
    if (ui.viewing) { notify('Прошлая версия открыта только для чтения', 'err'); return false }
    if (!setPath(draft.config, path, value)) return false
    draft.author = user
    draft.editedAt = now()
    write()
    return true
  }
  function setTab(tab: TabId) { ui.tab = tab }
  function setSection(section: SectionId, anchor = '') { ui.section = section; ui.anchor = anchor }
  function rememberScroll(tab: TabId, y: number) { ui.scroll[tab] = Math.round(y) }
  /* ------------------------------ зависимости — П2 ------------------------------ */
  const allFields = computed(() => draft.config.form.groups.flatMap(g => g.fields))
  const approvalCount = computed(() => allFields.value.filter(x => x.approval).length)
  const hasRepeatable = computed(() => draft.config.processes.some(p => p.repeatable))
  const NONE: Rule = { reason: '', meta: '', metaTone: 'default' }
  /**
   * Матрица правил «Поведения процесса» — `spec-audit.md`, «Паттерны кросс-таб зависимостей». Матрицы «Назначения
   * схемы» в источниках нет: правило `quickAccept` — демо-строка с текстом причины из аудита.
   */
  const rules = computed<Record<string, Rule>>(() => {
    const b = draft.config.settings.general.behavior
    const n = approvalCount.value
    return {
      /* «гасит»: сквозной модификатор «Назначение схемы». */
      quickAccept: draft.config.settings.general.purpose === 'standard' ? NONE : { ...NONE, reason: 'Доступно только для стандартной схемы' },
      /* «гасит»: параметр родителя и состав схемы. */
      refuseRepeatable: !b.refuse
        ? { ...NONE, reason: 'Сначала разрешите отказ с отметкой «Осмотр невозможен»' }
        : hasRepeatable.value ? NONE : { ...NONE, reason: 'В схеме нет повторяемых процессов' },
      /* «вооружает»: согласование работает, когда в «Форме» отмечены поля. */
      approval: !b.approval
        ? NONE
        : n
          ? { ...NONE, meta: `Отмечено ${n} ${plural(n, 'поле', 'поля', 'полей')} на согласование` }
          : { ...NONE, meta: 'Отмечено 0 полей на согласование — согласование не сработает, пока поля не отмечены', metaTone: 'warning' },
    }
  })
  const rule = (key: string): Rule => rules.value[key] ?? NONE

  /** Статус-точки разделов — единая система индикаторов (аудит). Разделы П3 получают статус в своей порции. */
  const sectionStatus = computed<Record<SectionId, SectionStatus>>(() => ({
    general: rules.value.approval!.metaTone === 'warning' ? 'attention' : 'none',
    mobile: 'none', web: 'none', access: 'none', ai: 'none',
    anomalies: draft.config.settings.anomalies.enabled ? 'on' : 'off',
    pdf: (draft.config.settings.pdf.templates as unknown[] | undefined)?.length ? 'on' : 'off',
  }))

  /* ------------------------------ формулы — П2 ------------------------------ */
  /** Переменные формул: поля формы черновика (`{Группа:алиас}`) и служебные. */
  const variables = computed(() => [
    ...draft.config.form.groups.flatMap(g => g.fields.map(x => ({ value: `${g.alias}:${x.alias}`, label: x.title, group: g.title }))),
    ...SYSTEM_VARIABLES.map(({ value, label, group }) => ({ value, label, group })),
  ])
  /** Демо-значения переменных для превью результата (r2 §4). */
  const variableSamples = computed<Record<string, string>>(() => Object.fromEntries([
    ...draft.config.form.groups.flatMap(g => g.fields.map(x => [`${g.alias}:${x.alias}`, FIELD_SAMPLES[x.alias] ?? x.title])),
    ...SYSTEM_VARIABLES.map(v => [v.value, v.sample]),
  ]))

  /* ------------------------------ разделы и поверхности — П2 ------------------------------ */
  /** Соседний раздел для «Назад / Далее» — СС-16. */
  function neighbourSection(dir: -1 | 1): SectionId | null {
    return SECTIONS[SECTIONS.findIndex(x => x.id === ui.section) + dir]?.id ?? null
  }
  function stepSection(dir: -1 | 1) {
    const next = neighbourSection(dir)
    if (next) setSection(next)
  }
  /** «Перейти к полям» — переход паттерна «вооружает» (СС-19). */
  function goToFields() { ui.tab = 'form' }
  function openSide(id: string) { ui.surfaces.push({ kind: 'side', id }) }
  function closeSurface() { ui.surfaces.pop() }
  const topSurface = computed<Surface | null>(() => ui.surfaces[ui.surfaces.length - 1] ?? null)

  /** «Назад» — к списку схем; на стенде списка нет (СС-01). */
  function back() { notify('Список схем — вне стенда') }
  /** «Опубликовать схему» — дифф и публикация собираются порцией П4. */
  function publish() { notify('Публикация схемы — порция П4') }

  /** Состояние модели одной строкой — прогону, для сравнения «до / после». */
  function dump() {
    return JSON.stringify({
      draft: draft.config, author: draft.author, versions: snapshots.map(s => s.id), current: current.value?.id ?? null,
      publish: publishState.value, save: save.state, writes: save.writes,
      ui: { tab: ui.tab, section: ui.section, anchor: ui.anchor, scroll: ui.scroll, viewing: ui.viewing, surfaces: ui.surfaces.map(x => x.id) },
    })
  }

  return {
    snapshots, current, draft, dirty, publishState, save, ui, notices,
    rules, rule, approvalCount, sectionStatus, variables, variableSamples, topSurface,
    set, setTab, setSection, rememberScroll, back, publish, retry, notify, dismissNotice, dump,
    neighbourSection, stepSection, goToFields, openSide, closeSurface,
  }
}

export type SchemeModel = ReturnType<typeof createModel>
