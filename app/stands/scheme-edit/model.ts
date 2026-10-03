import { computed, reactive } from 'vue'
import { ALIAS_RE, DETECTOR_IDS, DETECTORS_ON, FIELD_SAMPLES, FINISH_CLASSES, suggestAlias, SYSTEM_VARIABLES, type StepFlag } from './catalogs'
import { diffConfigs, formatDate, plural, summarize, validateConfig } from './diff'
import { QUICK_LINKS, searchSettings, type SearchItem } from './search'

export * from './catalogs'

/**
 * Модель состояния страницы «Редактирование схемы осмотра» (VA-16377) — такты 61–65, порции П1–П5.
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
 * (СС-15), соседние разделы (СС-16), сайд словаря комментариев (`openSide`, `closeSide`, СС-59). **П3 (такт 63):**
 * настройки шести остальных разделов (r2 §4) со значениями по умолчанию, правила «гасит» для веб-блока, ИИ-анализа и
 * аномалий, обоснования и шаблоны PDF с отменой удаления (`undo`), детекторы аномалий с массовым управлением и
 * наследованием роли, сброс стоимости классов, группы доступа. **П4 (такт 64):** публикация — модалка-гейт с диффом
 * (`openPublish`, `confirmPublish`), первая публикация, валидация с критичным (`warnings`), история версий и дифф
 * версии (`history`, `versionDiff`), просмотр снимка (`view`, `leaveView` — правка отказывает), сброс черновика
 * (`openReset`, `confirmReset`), меню схемы (`menu`), presence. Расчёт диффа и валидации — `diff.ts`. **П5 (такт 65):**
 * поиск по настройкам — `setQuery`, `results`, `goTo` (таб → раздел → якорь → цель для прокрутки и подсветки), `quick`;
 * индекс и словарь синонимов — `search.ts`. **П6 (такт 69):** таб «Форма» — выбор группы (`selectGroup`), сайд поля
 * (`saveField`, четыре секции, «зависимое» — `dependsOn`) и сайд группы (`saveGroup`), удаление поля и группы с отменой,
 * массовый выбор и действия (`toggleField`, `toggleAllFields`, `bulkFields`), «Заполнить алиасы автоматически» — только
 * пустые (`fillAliases`), «Вставить из другой схемы» — заглушка; поля формы входят в поиск. **П7, часть 1 (такт 70):**
 * таб «Процессы и шаги» — массовый выбор шагов сквозь процессы (`toggleStep`, `toggleProcessSteps`), флаги в трёх
 * состояниях (`flagState`, `bulkFlag`), способ съёмки и удаление выделенных, тип шага в строке, инлайн-загрузка
 * фото-подсказок (`uploadHints`), удаление шага и процесса с отменой, перестановка шагов и полей (`moveStep`,
 * `moveField`); шаги входят в поиск. **П7, часть 2 (такт 71):** сайд процесса (`saveProcess`), сайд шага (`saveStep`, шесть
 * секций), нейросети выбранных шагов (`bulkNetworks`), оверлей повторяемого процесса (`openOverlay`) — стек «оверлей →
 * сайд». Дифф, валидация,
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

/** Якоря подразделов по разделам — `scheme-edit.md`, 3.4, с правками строки 08 раздела 11. */
export const SECTION_ANCHORS: Record<SectionId, readonly { id: string, label: string }[]> = {
  general: GENERAL_ANCHORS,
  mobile: [{ id: 'shooting', label: 'Параметры съёмки' }, { id: 'mobile-behavior', label: 'Поведение в мобильном приложении' }],
  web: [{ id: 'feedback', label: 'Обратная связь' }],
  access: [{ id: 'execution', label: 'Выполнение осмотра' }, { id: 'creation', label: 'Создание и проверка осмотров' }, { id: 'groups', label: 'Группы доступа' }],
  ai: [{ id: 'finish', label: 'Анализ стоимости отделки' }, { id: 'costs', label: 'Стоимость классов отделки' }, { id: 'regions', label: 'Матрица регионов' }],
  anomalies: [],
  pdf: [],
}

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

/* ------------------------------ разделы П3 — r2 §4 ------------------------------ */
export interface MobileSettings {
  mode: 'regular' | 'checklist'
  photo: string
  video: string
  phone: string
  phoneName: string
  callConfirm: string
  startAfterCreate: boolean
  hideHints: boolean
  skipConfirm: boolean
}
export interface FeedbackReason { key: string, title: string }
export interface WebSettings { feedback: boolean, reasons: FeedbackReason[], blockRepeat: boolean, blockRefuse: boolean, blockContract: boolean }
export interface AccessSettings {
  executors: string[]
  manage: 'all' | 'expert' | 'admin'
  createMode: 'groups' | 'role' | 'open'
  createRoles: string[]
  groups: string[]
}
export interface AiSettings {
  aliasTotal: string
  aliasRoom: string
  /** Стоимость классов отделки, ₽/м² — по коду класса. */
  costs: Record<string, number>
  regionMatrix: string
  damage: boolean
  vinRecognition: boolean
  damageCost: boolean
}
/** Детектор: включён ли и роль видимости; пустая роль — наследует роль по умолчанию (аудит, «Раздел „Аномалии“»). */
export interface DetectorState { on: boolean, role: string }
export interface AnomalySettings { enabled: boolean, defaultRole: string, detectors: Record<string, DetectorState> }
export interface PdfTemplate { id: string, title: string, template: string, main: boolean, role: string, when: string }
export interface PdfSettings {
  templates: PdfTemplate[]
  sign: boolean
  signer: string
  showSigned: boolean
  mailSigned: boolean
  unsignedShow: boolean
  unsignedMail: boolean
  fileName: string
  attachExtra: boolean
}

/** Значения по умолчанию разделов П3: набор данных хранит только отличия. */
export const SECTION_DEFAULTS: { mobile: MobileSettings, web: WebSettings, access: AccessSettings, ai: AiSettings, anomalies: AnomalySettings, pdf: PdfSettings } = {
  mobile: { mode: 'regular', photo: 'medium', video: 'vga', phone: '', phoneName: '', callConfirm: '', startAfterCreate: true, hideHints: true, skipConfirm: false },
  web: {
    feedback: true,
    reasons: [{ key: 'geo', title: 'Координаты' }, { key: 'screen-photo', title: 'Фото с экрана' }],
    blockRepeat: true, blockRefuse: false, blockContract: false,
  },
  access: { executors: ['creator', 'admin', 'expert', 'operator', 'agent', 'client'], manage: 'all', createMode: 'groups', createRoles: ['admin', 'operator', 'agent'], groups: ['grp-01', 'grp-02'] },
  ai: {
    aliasTotal: 'common:totalarea', aliasRoom: 'room:area',
    costs: Object.fromEntries(FINISH_CLASSES.map(c => [c.code, c.cost])),
    regionMatrix: 'common', damage: true, vinRecognition: true, damageCost: false,
  },
  anomalies: { enabled: true, defaultRole: 'expert', detectors: Object.fromEntries(DETECTOR_IDS.map(id => [id, { on: DETECTORS_ON.includes(id), role: '' }])) },
  pdf: {
    templates: [
      { id: 'tpl-act', title: 'Акт осмотра', template: 'act-vehicle-v2', main: true, role: 'client', when: 'always' },
      { id: 'tpl-tech', title: 'Технический отчёт', template: 'tech-report-v1', main: false, role: 'expert', when: 'expertise' },
    ],
    sign: false, signer: 'client', showSigned: true, mailSigned: false, unsignedShow: true, unsignedMail: false,
    fileName: 'Лист осмотра {Car:vin}', attachExtra: false,
  },
}

/**
 * Поле формы — четыре секции сайда «Редактирование поля» (аудит, «Сайд „Редактирование поля“ — эталон»): основное,
 * поведение и видимость, варианты выбора, валидация и подсказки. Набор данных хранит только отличия от
 * `FIELD_DEFAULTS`. Признак «зависимое» (`dependent`) — связь поле → поле: выставлен, когда задано `dependsOn`.
 */
export interface FormField {
  id: string
  title: string
  alias: string
  type: string
  required: boolean
  webOnly: boolean
  dependent: boolean
  approval?: boolean
  placeholder: string
  mobileAfterCreate: boolean
  noConfidential: boolean
  highlight: boolean
  /** Варианты выбора строками «ключ|значение» — только у типа `choice`. */
  options: string
  /** Поле, от значения которого зависят варианты, — id поля той же группы. */
  dependsOn: string
  regexp: string
  hints: string
}
export interface FormGroup {
  id: string
  title: string
  alias: string
  fields: FormField[]
  /** Настройки группы — блок `33179:4467`: экран создания, показ в мобильном, редактирование после создания. */
  createScreen: string
  mobile: string
  editable: boolean
}
export const FIELD_DEFAULTS: Omit<FormField, 'id' | 'title' | 'alias' | 'type'> = {
  required: false, webOnly: false, dependent: false, approval: false, placeholder: '', mobileAfterCreate: true, noConfidential: false,
  highlight: false, options: '', dependsOn: '', regexp: '', hints: 'standard',
}
export const GROUP_DEFAULTS: Pick<FormGroup, 'createScreen' | 'mobile' | 'editable'> = { createScreen: '1', mobile: 'after-create', editable: true }
/** Черновик сайда поля и сайда группы: `id` пуст у новой сущности; порядковый номер поля — `order`. */
export type FieldDraft = FormField & { order: number }
export type GroupDraft = Omit<FormGroup, 'fields'>
/**
 * Шаг процесса — строка таблицы шагов макета `32765:6652` (такт 70): название, описание, тип шага, способ съёмки,
 * нейросети, число фото-подсказок; флаги — строка «Флаги» панели массовых действий `32765:6585`. Набор данных хранит
 * только отличия от `STEP_DEFAULTS`.
 */
export interface ProcessStep extends Record<StepFlag, boolean> {
  id: string
  title: string
  description: string
  kind: string
  method: string
  networks: string[]
  /** Фото-подсказок загружено: 0 — «Не установлена». */
  hints: number
  /** Сайд шага (такт 71): текстовая подсказка на экране шага, связанные поля формы (id), словарь комментариев шага. */
  tip: string
  links: string[]
  comments: string
}
export const STEP_DEFAULTS: Omit<ProcessStep, 'id' | 'title' | 'kind' | 'method' | 'networks' | 'hints'> = {
  description: '', required: false, hidden: false, gallery: false, web: false, noConfidential: false, docScan: false,
  tip: '', links: [], comments: '',
}
/**
 * Процесс — шапка карточки (такт 70) и сайд «Добавление / Редактирование процесса» (такт 71, макеты `33245:5722`,
 * `33245:6032`): «Основное» — название, алиас, формула наименования, иконка типа процесса; «Поведение» — скрытый, выбор
 * шагов во время съёмки, повторяемый, тип объекта съёмки, получение координат; «Подсказки» — подсказка на экране
 * подготовки и «Обычно занимает N минут». Порядковый номер — место в списке процессов.
 */
export interface Process {
  id: string
  title: string
  alias: string
  repeatable: boolean
  steps: ProcessStep[]
  formula: string
  icon: string
  hidden: boolean
  pickSteps: boolean
  objectType: string
  coords: string
  prepHint: string
  duration: 'auto' | 'manual' | 'off'
  durationMin: number
}
export const PROCESS_DEFAULTS: Omit<Process, 'id' | 'title' | 'alias' | 'repeatable' | 'steps'> = {
  formula: '', icon: '', hidden: false, pickSteps: false, objectType: '', coords: '', prepHint: '', duration: 'auto', durationMin: 10,
}
/** Черновик сайда процесса и оверлея: `id` пуст у нового; порядковый номер — `order`; шаги правит только оверлей. */
export type ProcessDraft = Process & { order: number }
/** Черновик сайда шага: `id` пуст у нового; порядковый номер — место в процессе. */
export type StepDraft = ProcessStep & { order: number }
/** Нейросеть у выделенных шагов — флажок трёх состояний сайда «Нейросети выбранных шагов». */
export type NetworkState = 'all' | 'some' | 'none'
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
  settings: { general: GeneralSettings, mobile: MobileSettings, web: WebSettings, access: AccessSettings, ai: AiSettings, anomalies: AnomalySettings, pdf: PdfSettings }
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
/** Черновик шаблона PDF в сайде: `id` пуст у нового. */
export type PdfTemplateDraft = Omit<PdfTemplate, 'id'> & { id: string }
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
  /** Presence: кто ещё редактирует схему — оснастка `?presence=`. */
  editing?: string
  /** Открытый на просмотр снимок — оснастка `?view=`. */
  viewing?: string
  /** Выбранная группа «Формы» и выделенные поля — оснастка `?group=`, `?selected=` (такт 69). */
  group?: string
  selectedFields?: string[]
  /** Выделенные шаги «Процессов и шагов» — оснастка `?steps=` (такт 70). */
  selectedSteps?: string[]
}

/** Сколько длится запись черновика на стенде. */
export const SAVE_MS = 700

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

/** Подразделы «Общих», которых нет в наборе данных, берутся из значений по умолчанию; заданные ключи — поверх. */
function withDefaults(config: SchemeConfig): SchemeConfig {
  const g = config.settings.general as unknown as Record<string, unknown>
  for (const [key, def] of Object.entries(GENERAL_DEFAULTS)) g[key] = { ...clone(def), ...(g[key] as object | undefined) }
  const all = config.settings as unknown as Record<string, object | undefined>
  for (const [key, def] of Object.entries(SECTION_DEFAULTS)) all[key] = { ...clone(def), ...all[key] }
  return withFormDefaults(config)
}
/** Группы и поля формы: недостающие атрибуты — из значений по умолчанию (такт 69); «зависимое» следует за `dependsOn`. */
function withFormDefaults(config: SchemeConfig): SchemeConfig {
  config.form.groups = config.form.groups.map(g => ({
    ...GROUP_DEFAULTS, ...g,
    fields: g.fields.map((f) => {
      const x = { ...FIELD_DEFAULTS, ...f }
      return { ...x, dependent: !!x.dependsOn || x.dependent }
    }),
  }))
  /* Процессы и шаги (такты 70–71): недостающие атрибуты и флаги — из значений по умолчанию. */
  config.processes = config.processes.map(p => ({ ...PROCESS_DEFAULTS, ...p, steps: p.steps.map(st => ({ ...clone(STEP_DEFAULTS), ...st })) }))
  return config
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
  withFormDefaults(startConfig)
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
    /** Выбранная группа таба «Форма» — такт 69; пусто — первая группа. */
    group: (opts.group ?? '') as string,
    selectedFields: [...(opts.selectedFields ?? [])] as string[],
    selectedSteps: [...(opts.selectedSteps ?? [])] as string[],
    query: '',
    /** Плашка «Сохранение теперь автоматическое» закрыта — СС-56. */
    hintClosed: false,
    /** Presence: кто ещё редактирует схему — r2 §2, состояние 6. */
    editing: opts.editing ?? '',
    /** Открытый на просмотр снимок — r2 §2, состояние 7; пока он задан, правка отказывает. */
    viewing: (opts.viewing && data.snapshots.some(v => v.id === opts.viewing) ? opts.viewing : '') as string,
    /** Версия, открытая вторым слоем сайда истории. */
    historyVersion: '',
    /** Найденное: цель на странице и счётчик перехода — страница прокручивает к цели и подсвечивает её. */
    found: { target: '', n: 0 },
  })

  /** Конфигурация на экране: открытый снимок либо черновик. */
  const shown = computed<SchemeConfig>(() => snapshots.find(v => v.id === ui.viewing)?.config ?? draft.config)

  /* ------------------------------ уведомления ------------------------------ */
  const notices = reactive<Notice[]>([])
  let noticeSeq = 0
  /** Отмена действия — аудит, «Отмена при автосейве»: уведомление с «Отменить» помнит, что вернуть. */
  const restores = new Map<number, () => void>()
  function notify(text: string, kind: 'ok' | 'err' = 'ok', undo = false, restore?: () => void) {
    while (notices.length > 2) { restores.delete(notices[0]!.id); notices.shift() }
    notices.push({ id: ++noticeSeq, text, kind, undo })
    if (restore) restores.set(noticeSeq, restore)
  }
  /** «Отменить» в уведомлении: возвращает прежнее значение и закрывает уведомление. */
  function undo(id: number) {
    const restore = restores.get(id)
    restores.delete(id)
    dismissNotice(id)
    restore?.()
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
  const allFields = computed(() => shown.value.form.groups.flatMap(g => g.fields))
  const approvalCount = computed(() => allFields.value.filter(x => x.approval).length)
  const hasRepeatable = computed(() => shown.value.processes.some(p => p.repeatable))
  const NONE: Rule = { reason: '', meta: '', metaTone: 'default' }
  /**
   * Матрица правил «Поведения процесса» — `spec-audit.md`, «Паттерны кросс-таб зависимостей». Матрицы «Назначения
   * схемы» в источниках нет: правило `quickAccept` — демо-строка с текстом причины из аудита.
   */
  const rules = computed<Record<string, Rule>>(() => {
    const b = shown.value.settings.general.behavior
    const n = approvalCount.value
    return {
      /* «гасит»: сквозной модификатор «Назначение схемы». */
      quickAccept: shown.value.settings.general.purpose === 'standard' ? NONE : { ...NONE, reason: 'Доступно только для стандартной схемы' },
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
      /* ---------- П3 ---------- */
      /* «гасит»: рубильник блока обратной связи — r2 §4, «Веб-приложение». */
      feedbackBlock: shown.value.settings.web.feedback ? NONE : { ...NONE, reason: 'Включите блок обратной связи на странице экспертизы' },
      /* «гасит»: модули зависят от типа объекта схемы — аудит, «Раздел „ИИ-анализ стоимости“». */
      finishCost: shown.value.settings.general.schemeType === 'house' ? NONE : { ...NONE, reason: 'Анализ стоимости доступен только для схем недвижимости' },
      autoModules: shown.value.settings.general.schemeType === 'vehicle' ? NONE : { ...NONE, reason: 'Модули доступны только для схем с типом «Осмотр транспорта»' },
      /* «гасит»: рубильник блока аномалий. */
      anomalies: shown.value.settings.anomalies.enabled ? NONE : { ...NONE, reason: 'Включите отображение блока аномалий' },
    }
  })
  const rule = (key: string): Rule => rules.value[key] ?? NONE

  /** Статус-точки разделов — единая система индикаторов (аудит). Разделы П3 получают статус в своей порции. */
  const sectionStatus = computed<Record<SectionId, SectionStatus>>(() => ({
    general: rules.value.approval!.metaTone === 'warning' ? 'attention' : 'none',
    mobile: 'none',
    web: shown.value.settings.web.feedback ? 'on' : 'off',
    access: 'none', ai: 'none',
    anomalies: shown.value.settings.anomalies.enabled ? 'on' : 'off',
    pdf: shown.value.settings.pdf.templates.length ? 'on' : 'off',
  }))

  /* ------------------------------ формулы — П2 ------------------------------ */
  /** Переменные формул: поля формы черновика (`{Группа:алиас}`) и служебные. */
  const variables = computed(() => [
    ...shown.value.form.groups.flatMap(g => g.fields.map(x => ({ value: `${g.alias}:${x.alias}`, label: x.title, group: g.title }))),
    ...SYSTEM_VARIABLES.map(({ value, label, group }) => ({ value, label, group })),
  ])
  /** Демо-значения переменных для превью результата (r2 §4). */
  const variableSamples = computed<Record<string, string>>(() => Object.fromEntries([
    ...shown.value.form.groups.flatMap(g => g.fields.map(x => [`${g.alias}:${x.alias}`, FIELD_SAMPLES[x.alias] ?? x.title])),
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

  /* ------------------------------ операции П3 ------------------------------ */
  /** Обоснования обратной связи — «ключ — название» (r2 §4): ключ и название обязательны, ключ не повторяется. */
  function addReason(key: string, title: string): boolean {
    const k = key.trim()
    const t = title.trim()
    const list = draft.config.settings.web.reasons
    if (!k || !t) { notify('Заполните ключ и название обоснования', 'err'); return false }
    if (list.some(r => r.key === k)) { notify(`Обоснование с ключом «${k}» уже есть`, 'err'); return false }
    return set('settings.web.reasons', [...list, { key: k, title: t }])
  }
  function removeReason(key: string) {
    const before = clone(draft.config.settings.web.reasons)
    const gone = before.find(r => r.key === key)
    if (!gone || !set('settings.web.reasons', before.filter(r => r.key !== key))) return
    notify(`Обоснование «${gone.title}» удалено`, 'ok', true, () => set('settings.web.reasons', before))
  }

  /** Группа доступа схемы: отметка строки таблицы. */
  function toggleGroup(id: string) {
    const list = draft.config.settings.access.groups
    set('settings.access.groups', list.includes(id) ? list.filter(g => g !== id) : [...list, id])
  }

  /** «Сбросить к значениям по умолчанию» — стоимость классов отделки (r2 §1, §4). */
  function resetCosts() {
    const before = clone(draft.config.settings.ai.costs)
    if (!set('settings.ai.costs', Object.fromEntries(FINISH_CLASSES.map(c => [c.code, c.cost])))) { notify('Стоимость классов уже равна значениям по умолчанию'); return }
    notify('Стоимость классов сброшена к значениям по умолчанию', 'ok', true, () => set('settings.ai.costs', before))
  }

  /* Аномалии: массовое управление по уровням — блок, группа; роль — переопределением у детектора. */
  const detectors = computed(() => draft.config.settings.anomalies.detectors)
  const detectorsOn = computed(() => DETECTOR_IDS.filter(id => detectors.value[id]?.on).length)
  /** Состояние набора детекторов для флажка трёх состояний: все, часть, ни одного. */
  function detectorSetState(ids: readonly string[]): 'all' | 'some' | 'none' {
    const on = ids.filter(id => detectors.value[id]?.on).length
    return on === 0 ? 'none' : on === ids.length ? 'all' : 'some'
  }
  /** Включить либо снять набор: из «все» — снять, иначе — включить все. */
  function toggleDetectorSet(ids: readonly string[]) {
    const on = detectorSetState(ids) !== 'all'
    const next = clone(detectors.value)
    for (const id of ids) next[id] = { ...next[id]!, on }
    set('settings.anomalies.detectors', next)
  }
  function setDetector(id: string, patch: Partial<DetectorState>) {
    set(`settings.anomalies.detectors.${id}`, { ...detectors.value[id]!, ...patch })
  }

  /* Шаблоны PDF: добавление и правка — сайд, удаление — в строке с отменой (r2 §4, §7). */
  let templateSeq = 0
  function saveTemplate(t: PdfTemplateDraft): boolean {
    if (!t.title.trim()) { notify('Заполните отображаемое название шаблона', 'err'); return false }
    const list = clone(draft.config.settings.pdf.templates)
    const item: PdfTemplate = { ...t, title: t.title.trim(), id: t.id || `tpl-new-${++templateSeq}` }
    const k = list.findIndex(x => x.id === item.id)
    if (k >= 0) list[k] = item
    else list.push(item)
    /* Основной шаблон один. */
    if (item.main) for (const x of list) if (x.id !== item.id) x.main = false
    set('settings.pdf.templates', list)
    return true
  }
  function removeTemplate(id: string) {
    const before = clone(draft.config.settings.pdf.templates)
    const gone = before.find(t => t.id === id)
    if (!gone || !set('settings.pdf.templates', before.filter(t => t.id !== id))) return
    notify(`Шаблон «${gone.title}» удалён`, 'ok', true, () => set('settings.pdf.templates', before))
  }

  /* ------------------------------ «Форма» — П6, такт 69 ------------------------------ */
  /**
   * Таб «Форма» — r2 §5: слева группы, справа поля выбранной группы. Полотно пишет в черновик сразу (`set('form.groups')`
   * — тот же отказ в просмотре версии); поле и группа правятся в сайде — «Сохранить» отдаёт черновик сайда одной
   * операцией (`saveField`, `saveGroup`). Удаление и массовые действия — с «Отменить» в уведомлении (аудит, «Отмена при
   * автосейве»).
   */
  const formGroups = computed(() => shown.value.form.groups)
  /** Выбранная группа: заданная в интерфейсе, иначе первая. */
  const formGroup = computed<FormGroup | null>(() => formGroups.value.find(g => g.id === ui.group) ?? formGroups.value[0] ?? null)
  function selectGroup(id: string) {
    if (ui.group === id) return
    ui.group = id
    ui.selectedFields.splice(0)
  }
  const groupsCopy = () => clone(draft.config.form.groups)
  const writeGroups = (groups: FormGroup[]) => set('form.groups', groups)
  const fieldsWord = (n: number) => plural(n, 'поле', 'поля', 'полей')
  const fieldsDative = (n: number) => plural(n, 'полю', 'полям', 'полям')

  /** «Отправлять на согласование» у поля — «гасит»: доступно при включённом согласовании в «Настройках» (аудит, сайд поля). */
  const fieldApprovalReason = computed(() => (shown.value.settings.general.behavior.approval ? '' : 'Сначала включите согласование в разделе Настройки'))

  /** Проверка черновика поля: заголовок обязателен, алиас — латиницей без пробелов и не повторяется в группе. */
  function fieldError(groupId: string, f: FieldDraft): { key: 'title' | 'alias', text: string } | null {
    if (!f.title.trim()) return { key: 'title', text: 'Заполните заголовок поля' }
    const alias = f.alias.trim()
    if (alias && !ALIAS_RE.test(alias)) return { key: 'alias', text: 'Алиас — латиницей без пробелов, первая — буква' }
    const g = draft.config.form.groups.find(x => x.id === groupId)
    if (alias && g?.fields.some(x => x.id !== f.id && x.alias === alias)) return { key: 'alias', text: `Алиас «${alias}» уже есть в группе` }
    return null
  }
  let fieldSeq = 0
  /** «Сохранить» сайда поля: новое поле встаёт на свой порядковый номер, правка — на месте или на новом номере. */
  function saveField(groupId: string, f: FieldDraft): boolean {
    const error = fieldError(groupId, f)
    if (error) { notify(error.text, 'err'); return false }
    const groups = groupsCopy()
    const g = groups.find(x => x.id === groupId)
    if (!g) return false
    const { order, ...rest } = f
    const item: FormField = {
      ...rest, id: f.id || `f-new-${++fieldSeq}`, title: f.title.trim(), alias: f.alias.trim(),
      options: f.type === 'choice' ? f.options : '', dependsOn: f.type === 'choice' ? f.dependsOn : '',
    }
    item.dependent = !!item.dependsOn
    const k = g.fields.findIndex(x => x.id === item.id)
    if (k >= 0) g.fields.splice(k, 1)
    const at = Math.min(Math.max(1, Math.round(order) || g.fields.length + 1), g.fields.length + 1) - 1
    g.fields.splice(at, 0, item)
    return writeGroups(groups)
  }
  /** Удаление поля в строке — уведомление с «Отменить» вместо модалки-подтверждения (аудит, «Отмена при автосейве»). */
  function removeField(groupId: string, fieldId: string) {
    const before = groupsCopy()
    const groups = groupsCopy()
    const g = groups.find(x => x.id === groupId)
    const gone = g?.fields.find(x => x.id === fieldId)
    if (!g || !gone) return
    g.fields = g.fields.filter(x => x.id !== fieldId)
    for (const x of g.fields) if (x.dependsOn === fieldId) { x.dependsOn = ''; x.dependent = false }
    if (!writeGroups(groups)) return
    ui.selectedFields = ui.selectedFields.filter(id => id !== fieldId)
    notify(`Поле «${gone.title}» удалено`, 'ok', true, () => writeGroups(before))
  }

  /* Массовый выбор полей — r2 §5, §8: выделение живёт в выбранной группе. */
  function toggleField(id: string) {
    const k = ui.selectedFields.indexOf(id)
    if (k >= 0) ui.selectedFields.splice(k, 1)
    else ui.selectedFields.push(id)
  }
  /** Флажок «все» в шапке таблицы: из «все» — снять, иначе — выбрать все поля группы. */
  const selectionState = computed<'all' | 'some' | 'none'>(() => {
    const ids = formGroup.value?.fields.map(x => x.id) ?? []
    const n = ids.filter(id => ui.selectedFields.includes(id)).length
    return n === 0 ? 'none' : n === ids.length ? 'all' : 'some'
  })
  function toggleAllFields() {
    const ids = formGroup.value?.fields.map(x => x.id) ?? []
    ui.selectedFields = selectionState.value === 'all' ? [] : [...ids]
  }
  function clearFieldSelection() { ui.selectedFields.splice(0) }
  /**
   * Действие панели над выделенными полями — toast «Применено к N · Отменить» (аудит, «Отмена при автосейве»: bulk-операции —
   * обязательный toast с отменой). Удаление выделенных — тот же toast с «Отменить».
   */
  function bulkFields(action: 'required' | 'optional' | 'web' | 'all-platforms' | 'delete') {
    const g0 = formGroup.value
    if (!g0) return
    const ids = ui.selectedFields.filter(id => g0.fields.some(x => x.id === id))
    if (!ids.length) return
    const before = groupsCopy()
    const groups = groupsCopy()
    const g = groups.find(x => x.id === g0.id)!
    if (action === 'delete') {
      g.fields = g.fields.filter(x => !ids.includes(x.id))
      for (const x of g.fields) if (ids.includes(x.dependsOn)) { x.dependsOn = ''; x.dependent = false }
    }
    else {
      for (const x of g.fields) {
        if (!ids.includes(x.id)) continue
        if (action === 'required' || action === 'optional') x.required = action === 'required'
        else x.webOnly = action === 'web'
      }
    }
    if (!writeGroups(groups)) { notify(`Выбранные поля уже в этом состоянии`); return }
    if (action === 'delete') {
      ui.selectedFields.splice(0)
      notify(`Удалено ${ids.length} ${fieldsWord(ids.length)}`, 'ok', true, () => writeGroups(before))
    }
    else notify(`Применено к ${ids.length} ${fieldsDative(ids.length)}`, 'ok', true, () => writeGroups(before))
  }
  /**
   * «Заполнить алиасы автоматически» — только пустые, не трогая заданные (r2 §5; аудит, «Фидбек заказчика»: автозаполнение
   * только пустых). Алиас — по названию поля, занятые получают суффикс.
   */
  function fillAliases() {
    const g0 = formGroup.value
    if (!g0) return
    const before = groupsCopy()
    const groups = groupsCopy()
    const g = groups.find(x => x.id === g0.id)!
    const empty = g.fields.filter(x => !x.alias.trim())
    if (!empty.length) { notify('Пустых алиасов нет: заданные не меняются'); return }
    for (const x of empty) x.alias = suggestAlias(x.title, g.fields.map(y => y.alias))
    if (!writeGroups(groups)) return
    notify(`Применено к ${empty.length} ${fieldsDative(empty.length)}`, 'ok', true, () => writeGroups(before))
  }
  /** «Вставить из другой схемы» — заглушка кнопкой (r2 §8; аудит, «„Вставить поле из другой схемы“»). */
  function pasteFromScheme() { notify('Выбор поля из другой схемы — вне стенда') }

  let groupSeq = 0
  /** «Сохранить» сайда группы: название обязательно, алиас — латиницей и не повторяется среди групп. */
  function saveGroup(d: GroupDraft): boolean {
    if (!d.title.trim()) { notify('Заполните название группы', 'err'); return false }
    const alias = d.alias.trim()
    if (alias && !ALIAS_RE.test(alias)) { notify('Алиас — латиницей без пробелов, первая — буква', 'err'); return false }
    const groups = groupsCopy()
    if (alias && groups.some(x => x.id !== d.id && x.alias === alias)) { notify(`Алиас «${alias}» уже есть у другой группы`, 'err'); return false }
    const k = groups.findIndex(x => x.id === d.id)
    const item: FormGroup = { ...(k >= 0 ? groups[k]! : { fields: [] }), ...d, id: d.id || `g-new-${++groupSeq}`, title: d.title.trim(), alias }
    if (k >= 0) groups[k] = item
    else groups.push(item)
    if (!writeGroups(groups)) return k >= 0
    selectGroup(item.id)
    return true
  }
  /** Удаление выбранной группы — с «Отменить»; выбор уходит на соседнюю. */
  function removeGroup(id: string) {
    const before = groupsCopy()
    const k = before.findIndex(x => x.id === id)
    const gone = before[k]
    if (!gone) return
    if (!writeGroups(before.filter(x => x.id !== id))) return
    const next = draft.config.form.groups[Math.min(k, draft.config.form.groups.length - 1)]
    ui.group = next?.id ?? ''
    ui.selectedFields.splice(0)
    notify(`Группа «${gone.title}» удалена`, 'ok', true, () => { writeGroups(before); ui.group = id })
  }
  /**
   * Перестановка поля в группе — ручка строки таблицы полей (такт 70, решение 3 оркестратора): поле встаёт на место `to`
   * (с нуля), номер «№» и «Порядковый номер» сайда идут за порядком; запись — автосохранением.
   */
  function moveField(groupId: string, fieldId: string, to: number): boolean {
    const groups = groupsCopy()
    const g = groups.find(x => x.id === groupId)
    const k = g?.fields.findIndex(x => x.id === fieldId) ?? -1
    if (!g || k < 0) return false
    const at = Math.min(Math.max(0, to), g.fields.length - 1)
    if (at === k) return false
    g.fields.splice(at, 0, g.fields.splice(k, 1)[0]!)
    return writeGroups(groups)
  }

  /* ------------------------------ «Процессы и шаги» — П7, такт 70 ------------------------------ */
  /**
   * Таб «Процессы и шаги» — r2 §6: процессы карточками с таблицей шагов. Полотно пишет в черновик сразу
   * (`set('processes')` — тот же отказ в просмотре версии). Массовые действия и удаление — с «Отменить» в уведомлении
   * (аудит, «Отмена при автосейве»); фото-подсказка — инлайн-загрузкой в строке (аудит, «Принцип: атрибут — инлайн по
   * месту»). Сайды процесса и шага — такт 71: до него кнопки дают уведомление-заглушку (решение 2 оркестратора).
   */
  const processes = computed(() => shown.value.processes)
  const processesCopy = () => clone(draft.config.processes)
  const writeProcesses = (list: Process[]) => set('processes', list)
  const stepsWord = (n: number) => plural(n, 'шаг', 'шага', 'шагов')
  const stepsDative = (n: number) => plural(n, 'шагу', 'шагам', 'шагам')
  const allSteps = computed(() => processes.value.flatMap(p => p.steps))
  /** Выделенные шаги, которые есть в конфигурации на экране, — выделение идёт сквозь процессы. */
  const selectedSteps = computed(() => allSteps.value.filter(st => ui.selectedSteps.includes(st.id)))

  function toggleStep(id: string) {
    const k = ui.selectedSteps.indexOf(id)
    if (k >= 0) ui.selectedSteps.splice(k, 1)
    else ui.selectedSteps.push(id)
  }
  /** Флажок шапки таблицы процесса — три состояния по шагам этого процесса. */
  function processSelection(processId: string): 'all' | 'some' | 'none' {
    const ids = processes.value.find(p => p.id === processId)?.steps.map(st => st.id) ?? []
    const n = ids.filter(id => ui.selectedSteps.includes(id)).length
    return n === 0 ? 'none' : n === ids.length ? 'all' : 'some'
  }
  /** Из «все» — снять шаги процесса, иначе — выбрать все; выделение других процессов не трогается. */
  function toggleProcessSteps(processId: string) {
    const ids = processes.value.find(p => p.id === processId)?.steps.map(st => st.id) ?? []
    const rest = ui.selectedSteps.filter(id => !ids.includes(id))
    ui.selectedSteps = processSelection(processId) === 'all' ? rest : [...rest, ...ids]
  }
  function clearStepSelection() { ui.selectedSteps.splice(0) }
  /** Флаг у выделенных шагов: все, часть, ни одного — флажок трёх состояний панели. */
  function flagState(flag: StepFlag): 'all' | 'some' | 'none' {
    const list = selectedSteps.value
    const n = list.filter(st => st[flag]).length
    return n === 0 ? 'none' : n === list.length ? 'all' : 'some'
  }
  /** Правка выделенных шагов одной записью; уведомление «Применено к N шагам» с «Отменить». */
  function bulkSteps(change: (st: ProcessStep) => void): boolean {
    const ids = selectedSteps.value.map(st => st.id)
    if (!ids.length) return false
    const before = processesCopy()
    const list = processesCopy()
    for (const p of list) for (const st of p.steps) if (ids.includes(st.id)) change(st)
    if (!writeProcesses(list)) { notify('Выбранные шаги уже в этом состоянии'); return false }
    notify(`Применено к ${ids.length} ${stepsDative(ids.length)}`, 'ok', true, () => writeProcesses(before))
    return true
  }
  /** Флаг панели: из «все» — снять у выделенных, иначе (часть, ни одного) — поставить всем (прецедент флажка «все»). */
  function bulkFlag(flag: StepFlag) {
    const on = flagState(flag) !== 'all'
    bulkSteps((st) => { st[flag] = on })
  }
  /** Способ съёмки у выделенных — поле «Фото» панели (строка 128 реестра расхождений). */
  function bulkMethod(method: string) { bulkSteps((st) => { st.method = method }) }
  function bulkDeleteSteps() {
    const ids = selectedSteps.value.map(st => st.id)
    if (!ids.length) return
    const before = processesCopy()
    const list = processesCopy().map(p => ({ ...p, steps: p.steps.filter(st => !ids.includes(st.id)) }))
    if (!writeProcesses(list)) return
    ui.selectedSteps.splice(0)
    notify(`Удалено ${ids.length} ${stepsWord(ids.length)}`, 'ok', true, () => writeProcesses(before))
  }
  /** Правка одного шага на месте: тип шага в строке, фото-подсказки инлайн-загрузкой. */
  function patchStep(processId: string, stepId: string, change: (st: ProcessStep) => void): boolean {
    const list = processesCopy()
    const st = list.find(p => p.id === processId)?.steps.find(x => x.id === stepId)
    if (!st) return false
    change(st)
    return writeProcesses(list)
  }
  function setStepKind(processId: string, stepId: string, kind: string) { patchStep(processId, stepId, (st) => { st.kind = kind }) }
  /**
   * Инлайн-загрузка фото-подсказок в ячейке (аудит, «Принцип: атрибут — инлайн по месту»): применяется сразу, без
   * «Сохранить»; статус меняется на месте — «Не установлена» → «N · Все установлены».
   */
  function uploadHints(processId: string, stepId: string, count = 1) { patchStep(processId, stepId, (st) => { st.hints += Math.max(1, count) }) }
  /** Удаление шага в строке — уведомление с «Отменить» (аудит, «Точечные фиксы», «Отмена при автосейве»). */
  function removeStep(processId: string, stepId: string) {
    const before = processesCopy()
    const list = processesCopy()
    const p = list.find(x => x.id === processId)
    const gone = p?.steps.find(x => x.id === stepId)
    if (!p || !gone) return
    p.steps = p.steps.filter(x => x.id !== stepId)
    if (!writeProcesses(list)) return
    ui.selectedSteps = ui.selectedSteps.filter(id => id !== stepId)
    notify(`Шаг «${gone.title}» удалён`, 'ok', true, () => writeProcesses(before))
  }
  function removeProcess(processId: string) {
    const before = processesCopy()
    const gone = before.find(x => x.id === processId)
    if (!gone || !writeProcesses(before.filter(x => x.id !== processId))) return
    const ids = gone.steps.map(st => st.id)
    ui.selectedSteps = ui.selectedSteps.filter(id => !ids.includes(id))
    notify(`Процесс «${gone.title}» удалён`, 'ok', true, () => writeProcesses(before))
  }
  /** Перестановка шага в процессе — ручка строки (решение 3 оркестратора); механизм тот же, что у полей. */
  function moveStep(processId: string, stepId: string, to: number): boolean {
    const list = processesCopy()
    const p = list.find(x => x.id === processId)
    const k = p?.steps.findIndex(x => x.id === stepId) ?? -1
    if (!p || k < 0) return false
    const at = Math.min(Math.max(0, to), p.steps.length - 1)
    if (at === k) return false
    p.steps.splice(at, 0, p.steps.splice(k, 1)[0]!)
    return writeProcesses(list)
  }
  /* ------------------------------ сайды процесса и шага, оверлей — П7, часть 2, такт 71 ------------------------------ */
  /**
   * Сайд — атомарная транзакция (аудит, «Принцип: сайд = атомарная транзакция поверх автосейв-страницы»): черновик
   * сущности живёт на странице, «Сохранить» отдаёт его одной операцией, «Отмена» отбрасывает. Оверлей повторяемого
   * процесса (r2 §7) — та же транзакция для процесса целиком: форма и шаги вместе; сайд шага поверх оверлея правит
   * черновик оверлея; черновик схемы получает процесс целиком по «Сохранить» оверлея.
   */
  /** Проверка черновика процесса: название обязательно, алиас — латиницей и не повторяется среди процессов. */
  function processError(d: ProcessDraft): { key: 'title' | 'alias', text: string } | null {
    if (!d.title.trim()) return { key: 'title', text: 'Заполните название процесса' }
    const alias = d.alias.trim()
    if (alias && !ALIAS_RE.test(alias)) return { key: 'alias', text: 'Алиас — латиницей без пробелов, первая — буква' }
    if (alias && draft.config.processes.some(x => x.id !== d.id && x.alias === alias)) return { key: 'alias', text: `Алиас «${alias}» уже есть у другого процесса` }
    return null
  }
  let processSeq = 0
  /**
   * «Сохранить» сайда процесса и оверлея: новый процесс встаёт на свой порядковый номер, правка — на месте либо на новом
   * номере. Шаги черновика берутся, когда `withSteps` (оверлей); сайд шагов не трогает.
   */
  function saveProcess(d: ProcessDraft, withSteps = false): boolean {
    const error = processError(d)
    if (error) { notify(error.text, 'err'); return false }
    const list = processesCopy()
    const k = list.findIndex(x => x.id === d.id)
    const { order, ...rest } = clone(d)
    const item: Process = { ...rest, id: d.id || `p-new-${++processSeq}`, title: d.title.trim(), alias: d.alias.trim(), steps: withSteps || k < 0 ? rest.steps : list[k]!.steps }
    if (k >= 0) list.splice(k, 1)
    const at = Math.min(Math.max(1, Math.round(order) || list.length + 1), list.length + 1) - 1
    list.splice(at, 0, item)
    writeProcesses(list)
    return true
  }
  /** Проверка черновика шага: название обязательно. */
  function stepError(d: StepDraft): string { return d.title.trim() ? '' : 'Заполните название шага' }
  let stepSeq = 0
  /** Шаг из черновика сайда — в список шагов: на своё место по порядковому номеру. Общая часть для полотна и оверлея. */
  function placeStep(steps: ProcessStep[], d: StepDraft): ProcessStep[] {
    const { order, ...rest } = clone(d)
    const item: ProcessStep = { ...rest, id: d.id || `s-new-${++stepSeq}`, title: d.title.trim() }
    const next = steps.filter(x => x.id !== item.id)
    const at = Math.min(Math.max(1, Math.round(order) || next.length + 1), next.length + 1) - 1
    next.splice(at, 0, item)
    return next
  }
  /** «Сохранить» сайда шага на полотне: одна запись автосохранением. */
  function saveStep(processId: string, d: StepDraft): boolean {
    const error = stepError(d)
    if (error) { notify(error, 'err'); return false }
    const list = processesCopy()
    const p = list.find(x => x.id === processId)
    if (!p) return false
    p.steps = placeStep(p.steps, d)
    writeProcesses(list)
    return true
  }
  /** Нейросеть у выделенных шагов: у всех, у части, ни у одного. */
  function networkState(name: string): NetworkState {
    const list = selectedSteps.value
    const n = list.filter(st => st.networks.includes(name)).length
    return n === 0 ? 'none' : n === list.length ? 'all' : 'some'
  }
  /**
   * «Сохранить» сайда «Нейросети выбранных шагов»: «все» — нейросеть у каждого выбранного, «нет» — ни у одного, «часть» —
   * как было у каждого. Одна запись, уведомление «Применено к N шагам» с «Отменить» — как флаги панели.
   */
  function bulkNetworks(states: Record<string, NetworkState>): boolean {
    const on = Object.entries(states).filter(([, v]) => v === 'all').map(([k]) => k)
    const off = Object.entries(states).filter(([, v]) => v === 'none').map(([k]) => k)
    return bulkSteps((st) => {
      st.networks = [...st.networks.filter(n => !off.includes(n)), ...on.filter(n => !st.networks.includes(n))]
    })
  }
  /** Оверлей повторяемого процесса — полноэкранный слой (r2 §7); открытие — чтение, поэтому и в просмотре версии. */
  function openOverlay() { ui.surfaces.push({ kind: 'overlay', id: 'process-overlay' }) }
  /** Отказ правки в просмотре версии — для открытия сайдов правки. */
  function canEdit(): boolean {
    if (ui.viewing) { notify('Прошлая версия открыта только для чтения', 'err'); return false }
    return true
  }
  /** «Заполнить изображения» и «Вставить шаг из другой схемы» — вне стенда (r2 §8, §9). */
  function fillImages() { notify('Массовая заливка изображений — вне стенда') }
  function pasteStep() { notify('Выбор шага из другой схемы — вне стенда') }

  /* ------------------------------ поиск — П5 ------------------------------ */
  /** Выдача по текущему запросу: группы по пути «Настройки → Раздел», поля формы — «Форма → Группа» (такт 69). */
  const results = computed(() => searchSettings(ui.query, shown.value.form, shown.value.processes))
  function setQuery(q: string) { ui.query = q }
  /**
   * Переход к найденному — `spec-audit.md`, «Требования к поиску»: таб → раздел → якорь; цель для прокрутки и
   * подсветки страница берёт из `ui.found`. Запрос очищается, выдача снимается.
   */
  function goTo(item: SearchItem) {
    if (item.group) {
      /* Поле формы (такт 69): таб «Форма», его группа; цель — строка поля. */
      ui.tab = 'form'
      selectGroup(item.group)
    }
    else if (item.process) {
      /* Шаг процесса (такт 70): таб «Процессы и шаги»; цель — строка шага. */
      ui.tab = 'processes'
    }
    else {
      ui.tab = 'settings'
      setSection(item.section as SectionId, item.anchor)
    }
    ui.found = { target: item.target, n: ui.found.n + 1 }
    ui.query = ''
  }
  /** «Быстрый переход» пустой выдачи: раздел либо таб. */
  function quick(index: number) {
    const link = QUICK_LINKS[index]
    if (!link) return
    ui.tab = link.tab
    if (link.section) setSection(link.section as SectionId, SECTION_ANCHORS[link.section as SectionId][0]?.id ?? '')
    ui.query = ''
  }

  /** «Назад» — к списку схем; на стенде списка нет (СС-01). */
  function back() { notify('Список схем — вне стенда') }
  /* ------------------------------ публикация и версии — П4 ------------------------------ */
  /** Дифф черновика с текущей версией — модалка-гейт публикации и «Сбросить черновик». */
  const draftDiff = computed(() => (current.value ? diffConfigs(current.value.config, draft.config) : null))
  /** Предупреждения валидации черновика; критичное блокирует публикацию. */
  const warnings = computed(() => validateConfig(draft.config))
  const blocked = computed(() => warnings.value.some(w => w.critical))
  /** Сводка настроенного — первая публикация. */
  const summary = computed(() => summarize(draft.config))
  const draftDate = computed(() => formatDate(draft.editedAt))

  function openModal(id: string) { ui.surfaces.push({ kind: 'modal', id }) }
  /**
   * «Опубликовать схему» и клик по индикатору черновика: не применяет сразу — открывает гейт. У схемы без публикаций —
   * подтверждение без диффа (`spec-audit.md`, «Первая публикация ≠ дифф»).
   */
  function openPublish() {
    if (ui.viewing) { notify('Прошлая версия открыта только для чтения', 'err'); return }
    if (!current.value) { openModal('first-publish'); return }
    if (!dirty.value) { notify('Публиковать нечего: изменений нет'); return }
    openModal('publish')
  }
  /** Подтверждение публикации: рождается неизменяемый снимок, он становится текущей версией. */
  function confirmPublish(): boolean {
    if (blocked.value) { notify('Публикация невозможна: исправьте критичные предупреждения', 'err'); return false }
    const publishedAt = now()
    snapshots.push({ id: `v${snapshots.length + 1}`, publishedAt, author: user, inspections: 0, config: clone(draft.config) })
    closeSurface()
    notify(`Схема опубликована: версия от ${formatDate(publishedAt)}`)
    return true
  }
  /** «Сбросить черновик к текущей версии» — окно показывает, что сбрасывается. */
  function openReset() {
    if (!current.value || !dirty.value) { notify('Сбрасывать нечего: черновик совпадает с текущей версией'); return }
    openModal('reset')
  }
  function confirmReset() {
    if (!current.value) return
    Object.assign(draft.config, clone(current.value.config))
    draft.author = current.value.author
    draft.editedAt = current.value.publishedAt
    closeSurface()
    write()
    notify('Черновик сброшен к текущей версии')
  }
  /** «Сделать копию» — штатный механизм платформы; на стенде списка схем нет. */
  function copy() { notify('Копия схемы — вне стенда') }
  /** «Предпросмотр» — вход в демо-осмотр; сам демо-осмотр — вне VA-16377 (r2 §3, §9). */
  function preview() { notify('Демо-осмотр — вне стенда') }
  /** Меню «⋯»: экспорт, дамп, копия, сброс черновика, удаление (r2 §3). */
  function menu(action: 'export' | 'dump' | 'copy' | 'reset' | 'delete') {
    if (action === 'export') notify('Экспорт схемы — вне стенда')
    else if (action === 'dump') notify('Дамп схемы — вне стенда')
    else if (action === 'copy') copy()
    else if (action === 'reset') openReset()
    else openModal('delete')
  }
  function confirmDelete() {
    closeSurface()
    notify('Удаление схемы — вне стенда')
  }

  /** История версий: текущая сверху, ниже прошлые снимки (r2 §2). */
  const history = computed(() => [...snapshots].reverse().map((v, k) => ({
    id: v.id, date: formatDate(v.publishedAt), author: v.author, inspections: v.inspections, current: k === 0,
    meta: `Опубликовал(а) ${v.author} · ${v.inspections} ${plural(v.inspections, 'осмотр', 'осмотра', 'осмотров')}`,
  })))
  function openHistory() {
    ui.historyVersion = ''
    openSide('history')
  }
  /** Версия вторым слоем сайда: её дифф с предыдущей; у первой версии сравнивать не с чем. */
  function openVersion(id: string) { ui.historyVersion = id }
  function closeVersion() { ui.historyVersion = '' }
  const versionDiff = computed(() => {
    const k = snapshots.findIndex(v => v.id === ui.historyVersion)
    return k > 0 ? diffConfigs(snapshots[k - 1]!.config, snapshots[k]!.config) : null
  })
  const versionShown = computed(() => history.value.find(v => v.id === ui.historyVersion) ?? null)

  /** Просмотр прошлой версии — r2 §2, состояние 7: поверхности закрываются, правка отказывает. */
  function view(id: string) {
    if (!snapshots.some(v => v.id === id)) return
    ui.surfaces.splice(0)
    ui.historyVersion = ''
    ui.viewing = id
  }
  function leaveView() { ui.viewing = '' }
  /** Плашка просмотра: «Вы смотрите версию от …, по ней проведено N осмотров. Текущая — от …». */
  const viewingText = computed(() => {
    const v = snapshots.find(x => x.id === ui.viewing)
    if (!v || !current.value) return ''
    return `Вы смотрите версию от ${formatDate(v.publishedAt)}, по ней ${plural(v.inspections, 'проведён', 'проведено', 'проведено')} ${v.inspections} ${plural(v.inspections, 'осмотр', 'осмотра', 'осмотров')}. Текущая — от ${formatDate(current.value.publishedAt)}`
  })

  /** Состояние модели одной строкой — прогону, для сравнения «до / после». */
  function dump() {
    return JSON.stringify({
      draft: draft.config, author: draft.author, versions: snapshots.map(s => s.id), current: current.value?.id ?? null,
      publish: publishState.value, save: save.state, writes: save.writes,
      ui: { tab: ui.tab, section: ui.section, anchor: ui.anchor, scroll: ui.scroll, viewing: ui.viewing, surfaces: ui.surfaces.map(x => x.id), historyVersion: ui.historyVersion, group: ui.group, selectedFields: ui.selectedFields, selectedSteps: ui.selectedSteps },
    })
  }

  return {
    snapshots, current, draft, dirty, publishState, save, ui, notices,
    rules, rule, approvalCount, sectionStatus, variables, variableSamples, topSurface,
    results, setQuery, goTo, quick,
    shown, draftDiff, warnings, blocked, summary, draftDate, history, versionDiff, versionShown, viewingText,
    openPublish, confirmPublish, openReset, confirmReset, copy, preview, menu, confirmDelete, openHistory, openVersion, closeVersion, view, leaveView,
    set, setTab, setSection, rememberScroll, back, retry, notify, dismissNotice, dump,
    neighbourSection, stepSection, goToFields, openSide, closeSurface,
    formGroups, formGroup, selectGroup, fieldApprovalReason, fieldError, saveField, removeField, toggleField, selectionState, toggleAllFields,
    clearFieldSelection, bulkFields, fillAliases, pasteFromScheme, saveGroup, removeGroup, moveField,
    processes, selectedSteps, toggleStep, processSelection, toggleProcessSteps, clearStepSelection, flagState, bulkFlag, bulkMethod, bulkDeleteSteps,
    setStepKind, uploadHints, removeStep, removeProcess, moveStep, fillImages, pasteStep,
    processError, saveProcess, stepError, placeStep, saveStep, networkState, bulkNetworks, openOverlay, canEdit,
    undo, addReason, removeReason, toggleGroup, resetCosts, detectorsOn, detectorSetState, toggleDetectorSet, setDetector, saveTemplate, removeTemplate,
  }
}

export type SchemeModel = ReturnType<typeof createModel>
