import { computed, reactive } from 'vue'

/**
 * Модель состояния страницы «Редактирование схемы осмотра» (VA-16377) — такты 61–63, порции П1–П3.
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
 * наследованием роли, сброс стоимости классов, группы доступа. Дифф, валидация,
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

/** Классы отделки A0–D1: код и название статичны, правится стоимость (аудит, «Раздел „ИИ-анализ стоимости“»). */
export const FINISH_CLASSES = [
  { code: 'A0', title: 'Без отделки', cost: 0 },
  { code: 'A1', title: 'Под чистовую отделку', cost: 15000 },
  { code: 'B0', title: 'Эконом', cost: 5000 },
  { code: 'B1', title: 'Эконом+', cost: 20000 },
  { code: 'C0', title: 'Стандарт', cost: 25000 },
  { code: 'C1', title: 'Стандарт+', cost: 35000 },
  { code: 'D0', title: 'Евроремонт', cost: 50000 },
  { code: 'D1', title: 'Эксклюзив', cost: 200000 },
] as const

/** 14 детекторов аномалий: три группы и одиночный без подзаголовка (r2 §4; макет `33351:9928`). */
export const DETECTOR_GROUPS = [
  { id: 'geo', title: 'Геолокация и трек', detectors: [
    { id: 'spoof', title: 'Подмена координат', help: 'Координаты кадра заданы программно, а не получены от датчиков устройства' },
    { id: 'noCoords', title: 'Отсутствие исходных координат', help: 'У кадра нет координат съёмки' },
    { id: 'speed', title: 'Аномалии скорости перемещения', help: 'Между кадрами исполнитель переместился быстрее возможного' },
    { id: 'angles', title: 'Аномалии углов направленности движения', help: 'Направление движения между кадрами меняется неправдоподобно' },
    { id: 'cluster', title: 'Аномалии кластеризации (съёмка вне основной точки)', help: 'Часть кадров снята далеко от основной точки осмотра' },
  ] },
  { id: 'device', title: 'Целостность устройства', detectors: [
    { id: 'root', title: 'Разблокирован root-доступ', help: 'На устройстве открыт доступ администратора системы' },
    { id: 'checksum', title: 'Аномалия в контрольных суммах', help: 'Контрольная сумма приложения не совпала с эталонной' },
    { id: 'versions', title: 'Разные версии приложения / телефона', help: 'В одном осмотре — кадры с разных версий приложения или устройств' },
  ] },
  { id: 'quality', title: 'Качество съёмки', detectors: [
    { id: 'blur', title: 'Размытые изображения', help: 'Кадр нерезкий' },
    { id: 'light', title: 'Плохая освещённость', help: 'Кадр слишком тёмный или пересвеченный' },
    { id: 'palette', title: 'Сниженная цветовая палитра', help: 'В кадре мало цветов: возможна пересъёмка копии' },
    { id: 'screen', title: 'Съёмка с экрана', help: 'Кадр снят с экрана другого устройства' },
    { id: 'viewpoint', title: 'Детектор ракурсов транспортных средств', help: 'Ракурс автомобиля не соответствует шагу' },
  ] },
  { id: 'single', title: '', detectors: [
    { id: 'otherRefusals', title: 'Отказ по другим осмотрам исполнителя', help: 'У исполнителя есть отказы по другим осмотрам' },
  ] },
] as const
export const DETECTOR_IDS = DETECTOR_GROUPS.flatMap(g => g.detectors.map(d => d.id))
const DETECTORS_ON = ['spoof', 'noCoords', 'blur', 'screen']

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

/* Справочники стенда — вымышленные. */
export const PHOTO_RESOLUTIONS = [
  { value: 'low', label: 'Низкое — 1 Мп' },
  { value: 'medium', label: 'Среднее — 2 Мп' },
  { value: 'high', label: 'Высокое — 5 Мп' },
]
export const VIDEO_RESOLUTIONS = [
  { value: 'vga', label: 'Ниже среднего — VGA' },
  { value: 'hd', label: 'Среднее — HD' },
  { value: 'fullhd', label: 'Высокое — Full HD' },
]
/** Роли выполнения и создания осмотра — шире ролей «Общих»: с создателем осмотра и клиентом (макет `33351:6108`). */
export const ACCESS_ROLES = [
  { value: 'creator', label: 'Создатель осмотра' },
  { value: 'admin', label: 'Администратор' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'operator', label: 'Оператор осмотров' },
  { value: 'agent', label: 'Агент' },
  { value: 'client', label: 'Клиент' },
]
/** «И выше» — лестница ролей для видимости и доступа к документам. */
export const ROLE_LADDER = [
  { value: 'client', label: 'Клиент и выше' },
  { value: 'agent', label: 'Агент и выше' },
  { value: 'operator', label: 'Оператор осмотров' },
  { value: 'expert', label: 'Эксперт и выше' },
  { value: 'admin', label: 'Только администратор' },
]
const GROUP_NAMES = ['Осмотр Юг', 'Служба проверок', 'Региональные операторы', 'Осмотр Восток', 'Служба контроля', 'Региональный контроль', 'Осмотр Север', 'Служба осмотров',
  'Контроль Запад', 'Контроль Центр', 'Осмотр Урал', 'Выездные эксперты', 'Партнёрская сеть', 'Осмотр Волга', 'Контроль качества', 'Осмотр Сибирь', 'Дежурная смена',
  'Осмотр Кавказ', 'Обучение и стажёры', 'Осмотр Дальний Восток', 'Проверка документов', 'Осмотр Северо-Запад', 'Резервная группа']
const GROUP_OWNERS = ['Демо Страхование', 'Пример Лизинг', 'Образец Банк', 'Тест Финанс']
/** Группы доступа — 23 строки: три страницы по десять. */
export const ACCESS_GROUPS = GROUP_NAMES.map((name, k) => ({ id: `grp-${String(k + 1).padStart(2, '0')}`, name, owner: GROUP_OWNERS[k % GROUP_OWNERS.length]! }))
export const REGION_MATRICES = [
  { value: 'common', label: '[ОБЩИЙ] Корректировки по регионам' },
  { value: 'south', label: 'Корректировки: южные регионы' },
  { value: 'north', label: 'Корректировки: северные регионы' },
]
export const PDF_PROGRAMS = [
  { value: 'act-vehicle-v2', label: 'act-vehicle-v2' },
  { value: 'tech-report-v1', label: 'tech-report-v1' },
  { value: 'client-summary-v1', label: 'client-summary-v1' },
]
export const PDF_WHEN = [
  { value: 'always', label: 'Всегда' },
  { value: 'expertise', label: 'После успешной экспертизы' },
  { value: 'signed', label: 'После подписания' },
]
export const PDF_SIGNERS = [
  { value: 'client', label: 'Клиент' },
  { value: 'executor', label: 'Исполнитель осмотра' },
]
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
      /* ---------- П3 ---------- */
      /* «гасит»: рубильник блока обратной связи — r2 §4, «Веб-приложение». */
      feedbackBlock: draft.config.settings.web.feedback ? NONE : { ...NONE, reason: 'Включите блок обратной связи на странице экспертизы' },
      /* «гасит»: модули зависят от типа объекта схемы — аудит, «Раздел „ИИ-анализ стоимости“». */
      finishCost: draft.config.settings.general.schemeType === 'house' ? NONE : { ...NONE, reason: 'Анализ стоимости доступен только для схем недвижимости' },
      autoModules: draft.config.settings.general.schemeType === 'vehicle' ? NONE : { ...NONE, reason: 'Модули доступны только для схем с типом «Осмотр транспорта»' },
      /* «гасит»: рубильник блока аномалий. */
      anomalies: draft.config.settings.anomalies.enabled ? NONE : { ...NONE, reason: 'Включите отображение блока аномалий' },
    }
  })
  const rule = (key: string): Rule => rules.value[key] ?? NONE

  /** Статус-точки разделов — единая система индикаторов (аудит). Разделы П3 получают статус в своей порции. */
  const sectionStatus = computed<Record<SectionId, SectionStatus>>(() => ({
    general: rules.value.approval!.metaTone === 'warning' ? 'attention' : 'none',
    mobile: 'none',
    web: draft.config.settings.web.feedback ? 'on' : 'off',
    access: 'none', ai: 'none',
    anomalies: draft.config.settings.anomalies.enabled ? 'on' : 'off',
    pdf: draft.config.settings.pdf.templates.length ? 'on' : 'off',
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
    undo, addReason, removeReason, toggleGroup, resetCosts, detectorsOn, detectorSetState, toggleDetectorSet, setDetector, saveTemplate, removeTemplate,
  }
}

export type SchemeModel = ReturnType<typeof createModel>
