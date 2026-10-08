import { normalizeText, queryWords } from '~/components/ui/highlight-text'
import type { IconName } from '~/components/ui/icon'
import {
  DETECTOR_GROUPS, FIELD_TYPES, INDUSTRIES, SHOWCASE_OBJECTS, SHOWCASE_STATUS, SPHERES, STEP_KINDS,
} from './catalogs'
import { plural, SETTINGS, type SettingMeta } from './diff'
import { catalogHint, catalogLabel } from './hints'
import type { Rule, SchemeConfig, TabId } from './model'

/**
 * Поиск страницы схемы как в IDE — такт 86 (`docs/scheme-edit-review.md`, раздел 3; эталон — JetBrains, решение владельца
 * 2026-10-08). До такта 86 — такт 65, П5: буквальный матч подстроки запроса целиком по подписи, синонимам и описанию.
 *
 * Чистые функции: DOM и реактивности модуль не знает.
 *
 * **Индекс** (`buildSearchIndex`) — по одной записи на место страницы и действие: настройки семи разделов (каталог `SETTINGS`
 * из `diff.ts`), группы и поля формы, процессы и шаги, поля витрины, действия страницы. У записи — тип, ключ, подпись,
 * синонимы, описание, алиас, путь (группа выдачи), место (таб, раздел, якорь, группа, процесс, цель), порядок страницы,
 * текущее значение либо признак булевой настройки и причина погашения. Тот же индекс годится агенту MCP.
 *
 * **Сопоставление** (`runSearch`) — 3.2, пп. 1–5: каждое слово запроса — начало слова в подписи, синонимах, описании, алиасе
 * или ключе, порядок слов любой; фрагмент с середины слова от трёх знаков — ниже по весу; регистр, «ё» и знаки препинания не
 * важны (`normalizeText`, `queryWords` — `ui/highlight-text`: та же нормализация подсвечивает совпадение). Пустая выдача
 * повторяется в другой раскладке. Порядок: точная подпись → подпись с начала → все слова в подписи → синоним → описание →
 * алиас и ключ → середина слова; при равенстве недавнее выше, затем порядок страницы.
 *
 * **Такт 87:** шаг находится и по части и ракурсу своих фото-подсказок каталога (`tags`) — уровень описания, пояснение
 * строки — «фото-подсказка «…»».
 *
 * **Такт 88:** повторяемый процесс находится по своим текстам в приложении (`tags`, `tagHint`) — уровень описания, пояснение
 * строки — «текст в приложении «…»»; вставленные из другой схемы поля и шаги — обычные записи индекса.
 */

export type SearchType = 'setting' | 'field' | 'group' | 'step' | 'process' | 'showcase' | 'action'
/** Область выдачи — охват над выдачей (3.2, п. 6). */
export type SearchArea = 'settings' | 'form' | 'processes' | 'showcase' | 'actions'
export type SearchScope = 'all' | SearchArea
export const SEARCH_SCOPES: { id: SearchScope, label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'settings', label: 'Настройки' },
  { id: 'form', label: 'Форма' },
  /* «Процессы» — как в путях выдачи («Процессы → Осмотр автомобиля»): с полной подписью таба охват и фильтр не встают в одну строку 846. */
  { id: 'processes', label: 'Процессы' },
  { id: 'showcase', label: 'Витрина' },
  { id: 'actions', label: 'Действия' },
]

/**
 * Демо-словарь синонимов: слова, которыми настройку называют в разговоре, — из текстов спеки и аудита
 * (пример аудита — «размытые фото» → детектор размытых изображений). Курируемый словарь из вики — за аналитиком.
 */
export const SYNONYMS: Record<string, string[]> = {
  'general.active': ['включить схему', 'отключить схему', 'выключить схему'],
  'general.schemeType': ['тип объекта', 'недвижимость', 'транспорт'],
  'general.owner': ['владелец', 'клиент', 'организация'],
  'general.purpose': ['образец', 'типовая схема', 'стандартная схема'],
  'general.behavior.skipExpertise': ['без экспертизы', 'сразу на проверку'],
  'general.behavior.lockOnReview': ['блокировка осмотра', 'занят другим'],
  'general.behavior.quickAccept': ['быстрое принятие', 'принять сразу'],
  'general.behavior.refuse': ['отказ от осмотра', 'осмотр невозможен'],
  'general.behavior.approval': ['согласующий', 'согласование полей', 'этап согласования'],
  'general.behavior.cadastreMap': ['кадастр', 'геолокация объекта'],
  'general.formulas.objectName': ['шаблон названия объекта', 'переменные'],
  'general.formulas.zipName': ['архив', 'выгрузка материалов'],
  'general.formulas.mailSubject': ['письмо клиенту', 'оповещение'],
  'general.dictionaries.comments': ['комментарии эксперта', 'причины возврата'],
  'general.deadlines.mode': ['срок проверки', 'сроки'],
  'general.deadlines.share': ['поделиться осмотром', 'ссылка на осмотр'],
  'mobile.mode': ['чек-лист', 'порядок выполнения'],
  'mobile.photo': ['качество фото', 'мегапиксели'],
  'mobile.video': ['качество видео'],
  'mobile.phone': ['звонок в поддержку', 'номер поддержки'],
  'web.feedback': ['обратная связь', 'оценка экспертизы'],
  'web.reasons': ['обоснования', 'причины оценки'],
  'access.executors': ['исполнитель', 'кто снимает'],
  'access.groups': ['группы пользователей', 'доступ по группам'],
  'ai.costs.A0': ['цена отделки', 'стоимость ремонта'],
  'ai.regionMatrix': ['региональные коэффициенты', 'поправки по регионам'],
  'ai.damage': ['повреждения кузова', 'нейросеть повреждений'],
  'anomalies.enabled': ['подозрительная активность', 'мошенничество'],
  'anomalies.detectors.blur.on': ['размытые фото', 'нерезкие фото', 'смазанные кадры'],
  'anomalies.detectors.spoof.on': ['фейковые координаты', 'подмена геолокации'],
  'anomalies.detectors.screen.on': ['фото с экрана', 'пересъёмка'],
  'anomalies.detectors.root.on': ['взломанный телефон', 'рут'],
  'pdf.templates': ['шаблон документа', 'акт осмотра'],
  'pdf.sign': ['подпись клиента', 'смс-подпись', 'согласование с клиентом'],
  'pdf.fileName': ['имя файла документа', 'название pdf'],
}

/** Описания — пояснения настроек со страницы: поиск находит по ним, когда слова нет в подписи. */
export const DESCRIPTIONS: Record<string, string> = {
  'general.behavior.skipExpertise': 'Осмотр будет сразу передан на проверку без этапа экспертизы',
  'general.behavior.lockOnReview': 'Запрещает редактирование осмотра другими пользователями во время проверки',
  'general.behavior.quickAccept': 'Проверяющий сможет утвердить осмотр без поэтапного прохождения всех шагов',
  'general.behavior.requireAllSteps': 'Возврат на доработку возможен только после вынесения решения по каждому шагу',
  'general.behavior.lowRolesReturn': 'Агенты и операторы смогут инициировать возврат осмотра на доработку',
  'general.behavior.approvalRequired': 'Осмотр не будет принят, пока не пройдёт согласование',
  'general.behavior.cadastreMap': 'Отображает геолокацию объекта на карте по кадастровому номеру',
  'general.behavior.forbidExtraFiles': 'Пользователь не сможет прикрепить файлы за пределами обязательных полей',
  'mobile.startAfterCreate': 'Пользователь сразу переходит к выполнению без промежуточного экрана',
  'web.feedback': 'Позволяет экспертам оставлять комментарии и оценки по результатам проверки',
  'pdf.sign': 'Добавляет в процесс этап подписания клиентом. Клиент получает документ и подписывает его кодом из СМС',
  'anomalies.enabled': 'Детекторы подозрительной активности при проведении осмотра',
  /* Такт 86: подсказки «?» детекторов — со страницы (`DETECTOR_GROUPS`, `help`). */
  ...Object.fromEntries(DETECTOR_GROUPS.flatMap(g => g.detectors.map(d => [`anomalies.detectors.${d.id}.on`, d.help]))),
}

export const SECTION_LABELS: Record<string, string> = {
  general: 'Общие', mobile: 'Мобильное приложение', web: 'Веб-приложение', access: 'Права доступа', ai: 'ИИ-анализ', anomalies: 'Аномалии', pdf: 'PDF',
}

/** «Быстрый переход» пустой выдачи — макет `33245:9031`: разделы и таб. */
export const QUICK_LINKS: { label: string, tab: 'settings' | 'processes', section?: string }[] = [
  { label: 'Аномалии', tab: 'settings', section: 'anomalies' },
  { label: 'Права доступа', tab: 'settings', section: 'access' },
  { label: 'PDF', tab: 'settings', section: 'pdf' },
  { label: 'Процессы и шаги', tab: 'processes' },
]

/**
 * Поля таба «Витрина» в индексе поиска — такт 72 (строка 102 реестра расхождений). Цель — значение `data-field` поля либо
 * `data-act` кнопки на странице; синонимы — слова из аудита, «Таб „Витрина“».
 */
export const SHOWCASE_INDEX: { key: string, label: string, card: string, target: string, synonyms: string[] }[] = [
  { key: 'showcase.publish', label: 'Опубликовать на витрину', card: 'Статус карточки', target: 'publish-showcase', synonyms: ['публикация карточки', 'страница сценария'] },
  { key: 'showcase.title', label: 'Продающее название', card: 'Витринная карточка', target: 'scTitle', synonyms: ['маркетинговое название', 'заголовок карточки'] },
  { key: 'showcase.summary', label: 'Краткое описание', card: 'Витринная карточка', target: 'scSummary', synonyms: ['описание для витрины'] },
  { key: 'showcase.image', label: 'Изображение карточки', card: 'Витринная карточка', target: 'scImage', synonyms: ['картинка', 'обложка'] },
  { key: 'showcase.priceFrom', label: 'Цена «от»', card: 'Витринная карточка', target: 'scPrice', synonyms: ['стоимость осмотра', 'цена из тарифа', 'источник цены'] },
  { key: 'showcase.industry', label: 'Индустрия', card: 'Витринная карточка', target: 'scIndustry', synonyms: ['теги', 'отрасль'] },
  { key: 'showcase.spheres', label: 'Сфера применения', card: 'Витринная карточка', target: 'scSpheres', synonyms: ['теги', 'сферы'] },
  { key: 'showcase.object', label: 'Объект', card: 'Витринная карточка', target: 'scObject', synonyms: ['теги'] },
  { key: 'showcase.description', label: 'Развёрнутое описание', card: 'Зачем нужен осмотр', target: 'scDescription', synonyms: ['ценность осмотра'] },
  { key: 'showcase.problems', label: 'Проблемы и решения', card: 'Зачем нужен осмотр', target: 'scProblem0', synonyms: ['боли клиента', 'последствия'] },
  { key: 'showcase.metrics', label: 'Метрики', card: 'Зачем нужен осмотр', target: 'scMetric0', synonyms: ['показатели'] },
  { key: 'showcase.modules', label: 'ИИ-модули и проверки', card: 'Из схемы', target: 'scModules', synonyms: ['модули на витрине'] },
  { key: 'showcase.flow', label: 'Как устроена схема', card: 'Из схемы', target: 'scFlow', synonyms: ['статусная модель', 'флоу'] },
]

/** Действия страницы в выдаче — 3.2, п. 10. Иконка — своя у каждого: тип «действие» их не различает. */
export type ActionKey = 'publish' | 'preview' | 'history' | 'reset' | 'copy' | 'add-field' | 'add-group' | 'add-process' | 'fill-images'
export const SEARCH_ACTIONS: { key: ActionKey, label: string, icon: IconName, synonyms: string[] }[] = [
  { key: 'publish', label: 'Опубликовать схему', icon: 'arrow-up', synonyms: ['публикация', 'выпустить версию'] },
  { key: 'preview', label: 'Предпросмотр', icon: 'visibility', synonyms: ['демо-осмотр', 'превью'] },
  { key: 'history', label: 'История версий', icon: 'schedule', synonyms: ['версии', 'прошлые публикации'] },
  { key: 'reset', label: 'Сбросить черновик', icon: 'refresh', synonyms: ['отменить правки', 'вернуть текущую версию'] },
  { key: 'copy', label: 'Сделать копию', icon: 'copy', synonyms: ['дублировать схему', 'копия схемы'] },
  { key: 'add-field', label: 'Добавить поле', icon: 'add', synonyms: ['новое поле'] },
  { key: 'add-group', label: 'Добавить группу', icon: 'add', synonyms: ['новая группа'] },
  { key: 'add-process', label: 'Добавить процесс', icon: 'add', synonyms: ['новый процесс'] },
  { key: 'fill-images', label: 'Заполнить изображения', icon: 'image', synonyms: ['фото-подсказки', 'заливка подсказок'] },
]

export interface SearchEntry {
  /** Ключ индекса: путь настройки, `form.<поле>`, `group.<группа>`, `step.<шаг>`, `process.<процесс>`, `showcase.<поле>`, `action.<действие>`. */
  key: string
  type: SearchType
  area: SearchArea
  label: string
  synonyms: string[]
  description: string
  alias: string
  /** Группа выдачи: «Настройки → Аномалии», «Форма → Автомобиль». */
  path: string
  /** Место на странице; у действий таба нет. */
  tab: TabId | ''
  section: string
  anchor: string
  group: string
  process: string
  /** Цель на странице — значение `data-setting`, `data-field`, `data-radio`, `data-formula`, `data-act` либо `row-`, `step-`, `group-`, `process-`. */
  target: string
  /** Порядок страницы: «найдено» ведёт по нему через разделы и табы. */
  order: number
  /** Текущее значение справа в строке выдачи; у булевой настройки пусто — справа переключатель. */
  value: string
  toggle: boolean
  checked: boolean
  /** Путь для записи булевой настройки: `settings.<путь>`. */
  setPath: string
  /** Причина погашения: зависимость, скрытый родитель, просмотр версии, недоступное действие. */
  reason: string
  /** Своя иконка действия. */
  icon?: IconName
  /**
   * Подписи фото-подсказок каталога у шага — такт 87: шаг находится по части и ракурсу своей подсказки, пояснение строки —
   * «фото-подсказка «…»». Свои загрузки подписи части и ракурса не несут. Такт 88: у повторяемого процесса — тексты в
   * приложении, пояснение — «текст в приложении «…»».
   */
  tags: string[]
  /** Чем назван тег в пояснении строки: «фото-подсказка» (по умолчанию), «текст в приложении». */
  tagHint: string
}

export interface IndexContext {
  config: SchemeConfig
  rules: Record<string, Rule>
  viewing: boolean
  phaseLocked: boolean
  phaseReason: string
  hasCurrent: boolean
  dirty: boolean
  /** Цена «от» на витрине с источником — такт 90: «из тарифа — от 700 ₽», «вручную — от 2 599 ₽», «не показывается». */
  price?: string
}

export const READONLY_REASON = 'Прошлая версия открыта только для чтения'

const at = (root: unknown, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), root)
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const quoted = (s: string) => s.replace(/«/g, '„').replace(/»/g, '“')

/** Единицы числовых настроек — подписи полей на странице: «минут», «Часов», «Дней», «₽/м²». */
const UNITS: Record<string, string> = { 'general.behavior.unlockMinutes': 'мин', 'general.deadlines.hours': 'ч', 'general.deadlines.days': 'дн.' }

/** Значение настройки для строки выдачи: «60 мин», «Стандартная», «2 из 6»; у булевой — пусто, справа переключатель. */
function settingValue(meta: SettingMeta, raw: unknown): string {
  if (typeof raw === 'boolean') return ''
  const label = (v: unknown) => meta.options?.find(o => o.value === v)?.label ?? String(v)
  if (Array.isArray(raw)) {
    if (!raw.length) return meta.options ? 'не выбрано' : 'пусто'
    if (raw.every(v => typeof v === 'string')) return raw.length === 1 ? label(raw[0]) : `${raw.length} из ${meta.options?.length ?? raw.length}`
    if (meta.path === 'pdf.templates') return `${raw.length} ${plural(raw.length, 'шаблон', 'шаблона', 'шаблонов')}`
    if (meta.path === 'web.reasons') return `${raw.length} ${plural(raw.length, 'вариант', 'варианта', 'вариантов')}`
    return String(raw.length)
  }
  if (typeof raw === 'number') {
    if (meta.path.startsWith('ai.costs.')) return `${grouped(raw)} ₽/м²`
    return UNITS[meta.path] ? `${raw} ${UNITS[meta.path]}` : String(raw)
  }
  if (raw === '' || raw == null) return meta.options?.find(o => o.value === '')?.label ?? 'не задано'
  return meta.options ? label(raw) : String(raw)
}

/** Причина погашения настройки — правила «гасит» страницы (`rules` модели) и скрытые параметры выключенного родителя. */
function settingReason(path: string, ctx: IndexContext, toggle: boolean): string {
  if (toggle && ctx.viewing) return READONLY_REASON
  const r = (k: string) => ctx.rules[k]?.reason ?? ''
  const g = ctx.config.settings.general
  if (path === 'general.behavior.quickAccept') return r('quickAccept')
  if (path === 'general.behavior.refuseRepeatable') return r('refuseRepeatable')
  if (path === 'general.behavior.unlockMinutes' && !g.behavior.lockOnReview) return 'Скрыто: выключено «Блокировать осмотр при проверке»'
  if (path === 'general.deadlines.from' && g.deadlines.mode === 'none') return 'Срок проверки не устанавливается автоматически'
  if (path === 'general.deadlines.hours' && g.deadlines.mode !== 'hours') return 'Скрыто: выбран другой режим дедлайна'
  if (path === 'general.deadlines.days' && g.deadlines.mode !== 'days') return 'Скрыто: выбран другой режим дедлайна'
  if (/^web\.(?:reasons|blockRepeat|blockRefuse|blockContract)$/.test(path)) return r('feedbackBlock')
  if (/^ai\.(?:aliasTotal|aliasRoom|regionMatrix|costs\.)/.test(path)) return r('finishCost')
  if (/^ai\.(?:damage|vinRecognition|damageCost)$/.test(path)) return r('autoModules')
  if (path === 'anomalies.defaultRole' || path.startsWith('anomalies.detectors.')) return r('anomalies')
  if (/^pdf\.(?:signer|showSigned|mailSigned)$/.test(path) && !ctx.config.settings.pdf.sign) return 'Скрыто: выключено «Запрашивать подписание документа после успешной экспертизы»'
  return ''
}

/** Причина недоступности действия: просмотр версии, двухфазность новой схемы, нечего публиковать или сбрасывать. */
function actionReason(key: ActionKey, ctx: IndexContext): string {
  const edit = ctx.viewing ? READONLY_REASON : ''
  switch (key) {
    case 'publish': return edit || (ctx.hasCurrent && !ctx.dirty ? 'Изменений нет — публиковать нечего' : '')
    case 'reset': return !ctx.hasCurrent || !ctx.dirty ? 'Черновик совпадает с текущей версией' : ''
    /* Такт 91 (ревью С-1): история — после первой публикации; копия — у схемы с идентификатором. */
    case 'history': return ctx.hasCurrent ? '' : 'Появится после первой публикации схемы'
    case 'copy': return ctx.phaseLocked ? ctx.phaseReason : ''
    case 'add-field': return edit || (ctx.phaseLocked ? ctx.phaseReason : ctx.config.form.groups.length ? '' : 'В форме нет групп — сначала добавьте группу')
    case 'add-group': case 'add-process': case 'fill-images': return edit || (ctx.phaseLocked ? ctx.phaseReason : '')
    default: return ''
  }
}

/** Значения полей витрины для строки выдачи. */
function showcaseValue(key: string, config: SchemeConfig, ctx?: Pick<IndexContext, 'price'>): string {
  const sc = config.showcase
  const n = (k: number, one: string, few: string, many: string) => `${k} ${plural(k, one, few, many)}`
  switch (key) {
    case 'showcase.publish': return SHOWCASE_STATUS[sc.status]
    case 'showcase.title': return sc.title || 'не задано'
    case 'showcase.summary': return sc.summary || 'не задано'
    case 'showcase.image': return sc.image ? 'загружено' : 'не загружено'
    /* Такт 90: значение — с источником цены (тариф, вручную, не показывается); без контекста — ручная цена. */
    case 'showcase.priceFrom': return ctx?.price ?? (sc.priceFrom == null ? 'не задана' : `от ${grouped(sc.priceFrom)} ₽`)
    case 'showcase.industry': return INDUSTRIES.find(x => x.value === sc.industry)?.label ?? 'не выбрана'
    case 'showcase.spheres': return sc.spheres.length === 1 ? (SPHERES.find(x => x.value === sc.spheres[0])?.label ?? '') : sc.spheres.length ? n(sc.spheres.length, 'сфера', 'сферы', 'сфер') : 'не выбрано'
    case 'showcase.object': return SHOWCASE_OBJECTS[config.settings.general.schemeType] ?? ''
    case 'showcase.problems': return n(sc.problems.length, 'пара', 'пары', 'пар')
    case 'showcase.metrics': return n(sc.metrics.length, 'метрика', 'метрики', 'метрик')
    default: return ''
  }
}

const base = (e: Partial<SearchEntry> & Pick<SearchEntry, 'key' | 'type' | 'area' | 'label' | 'path' | 'target'>): Omit<SearchEntry, 'order'> => ({
  synonyms: [], description: '', alias: '', tab: '', section: '', anchor: '', group: '', process: '', value: '', toggle: false, checked: false,
  setPath: '', reason: '', icon: undefined, tags: [], tagHint: 'фото-подсказка', ...e,
})

/**
 * Индекс страницы — записи в порядке страницы: «Настройки» по разделам, «Форма» (группа, затем её поля), «Процессы и шаги»
 * (процесс, затем его шаги), «Витрина», действия.
 */
export function buildSearchIndex(ctx: IndexContext): SearchEntry[] {
  const out: Omit<SearchEntry, 'order'>[] = []
  const { config } = ctx
  for (const meta of SETTINGS) {
    /* Роль детектора ищется через сам детектор: отдельной строкой выдачи она дублировала бы его 14 раз (строка 105). */
    if (/^anomalies\.detectors\.\w+\.role$/.test(meta.path)) continue
    const raw = at(config.settings, meta.path)
    const toggle = typeof raw === 'boolean'
    out.push(base({
      key: meta.path, type: 'setting', area: 'settings', label: meta.label, synonyms: SYNONYMS[meta.path] ?? [], description: DESCRIPTIONS[meta.path] ?? '',
      path: `Настройки → ${SECTION_LABELS[meta.section] ?? meta.section}`, tab: 'settings', section: meta.section, anchor: meta.anchor, target: meta.target ?? '',
      value: settingValue(meta, raw), toggle, checked: raw === true, setPath: `settings.${meta.path}`, reason: settingReason(meta.path, ctx, toggle),
    }))
  }
  for (const g of config.form.groups) {
    out.push(base({ key: `group.${g.id}`, type: 'group', area: 'form', label: g.title, alias: g.alias, path: 'Форма → Группы', tab: 'form', group: g.id,
      target: `group-${g.id}`, value: `${g.fields.length} ${plural(g.fields.length, 'поле', 'поля', 'полей')}` }))
    for (const f of g.fields) {
      out.push(base({ key: `form.${f.id}`, type: 'field', area: 'form', label: f.title, alias: f.alias, path: `Форма → ${g.title}`, tab: 'form', group: g.id,
        target: `row-${f.id}`, value: FIELD_TYPES.find(t => t.value === f.type)?.label ?? f.type }))
    }
  }
  for (const p of config.processes) {
    /* Такт 88: тексты в приложении повторяемого процесса — процесс находится по ним, уровень описания. */
    const texts = p.repeatable ? Object.values(p.texts ?? {}).map(x => x.trim()).filter(Boolean) : []
    out.push(base({ key: `process.${p.id}`, type: 'process', area: 'processes', label: p.title, alias: p.alias, path: 'Процессы и шаги', tab: 'processes', process: p.id,
      target: `process-${p.id}`, value: `${p.steps.length} ${plural(p.steps.length, 'шаг', 'шага', 'шагов')}`, tags: texts, tagHint: 'текст в приложении' }))
    for (const st of p.steps) {
      /* Такт 87: подсказки каталога у шага — части и ракурсы, по ним шаг находится. */
      const tags = st.hints.flatMap((h) => { const c = h.kind === 'catalog' ? catalogHint(h.id) : undefined; return c ? [catalogLabel(c)] : [] })
      out.push(base({ key: `step.${st.id}`, type: 'step', area: 'processes', label: st.title, description: st.description, path: `Процессы → ${p.title}`,
        tab: 'processes', process: p.id, target: `step-${st.id}`, value: STEP_KINDS.find(k => k.value === st.kind)?.label ?? st.kind, tags }))
    }
  }
  for (const s of SHOWCASE_INDEX) {
    out.push(base({ key: s.key, type: 'showcase', area: 'showcase', label: s.label, synonyms: s.synonyms, path: `Витрина → ${s.card}`, tab: 'showcase',
      target: s.target, value: showcaseValue(s.key, config, ctx) }))
  }
  for (const a of SEARCH_ACTIONS) {
    out.push(base({ key: `action.${a.key}`, type: 'action', area: 'actions', label: a.label, synonyms: a.synonyms, path: 'Действия', target: '', icon: a.icon,
      reason: actionReason(a.key, ctx) }))
  }
  return out.map((e, order) => ({ ...e, order }))
}

/* ------------------------------ сопоставление ------------------------------ */

/** Уровни совпадения слова — 3.2, п. 5. Уровень записи — худший из уровней её слов; 1 и 2 — вся подпись. */
const EXACT = 1
const LABEL_START = 2
const LABEL = 3
const SYNONYM = 4
const DESCRIPTION = 5
const ALIAS = 6
const MIDDLE = 7

/** camelCase ключа и алиаса — слова: `cadastreMap` → «cadastre map». */
const camel = (s: string) => s.replace(/([a-zа-яё0-9])([A-ZА-ЯЁ])/g, '$1 $2')
const tokens = (n: string) => (n ? n.split(' ') : [])

interface Prepared {
  e: SearchEntry
  label: string
  labelT: string[]
  syn: { text: string, n: string, t: string[] }[]
  /** Подсказки каталога шага — такт 87. */
  tag: { text: string, n: string, t: string[] }[]
  desc: string
  descT: string[]
  alias: string
  aliasT: string[]
  key: string
  keyT: string[]
}
const cache = new WeakMap<SearchEntry, Prepared>()
function prepare(e: SearchEntry): Prepared {
  let p = cache.get(e)
  if (p) return p
  const label = normalizeText(e.label)
  const desc = normalizeText(e.description)
  const alias = normalizeText(camel(e.alias))
  /* Ключ ищется у настроек — путь конфигурации; у прочих записей ключ служебный. */
  const key = e.type === 'setting' ? normalizeText(camel(e.key)) : ''
  p = {
    e, label, labelT: tokens(label), desc, descT: tokens(desc), alias, aliasT: tokens(alias), key, keyT: tokens(key),
    syn: e.synonyms.map((text) => { const n = normalizeText(text); return { text, n, t: tokens(n) } }),
    tag: e.tags.map((text) => { const n = normalizeText(text); return { text, n, t: tokens(n) } }),
  }
  cache.set(e, p)
  return p
}

interface WordHit { level: number, field: 'label' | 'synonym' | 'description' | 'tag' | 'alias' | 'key', synonym?: string }
function wordHit(p: Prepared, w: string): WordHit | null {
  const starts = (t: string[]) => t.some(x => x.startsWith(w))
  if (starts(p.labelT)) return { level: LABEL, field: 'label' }
  const s = p.syn.find(x => starts(x.t))
  if (s) return { level: SYNONYM, field: 'synonym', synonym: s.text }
  if (starts(p.descT)) return { level: DESCRIPTION, field: 'description' }
  /* Такт 87: подсказка каталога шага — уровень описания; пояснение строки называет подсказку. */
  const tag = p.tag.find(x => starts(x.t))
  if (tag) return { level: DESCRIPTION, field: 'tag', synonym: tag.text }
  if (starts(p.aliasT)) return { level: ALIAS, field: 'alias' }
  if (starts(p.keyT)) return { level: ALIAS, field: 'key' }
  if (w.length < 3) return null
  if (p.label.includes(w)) return { level: MIDDLE, field: 'label' }
  const s2 = p.syn.find(x => x.n.includes(w))
  if (s2) return { level: MIDDLE, field: 'synonym', synonym: s2.text }
  if (p.desc.includes(w)) return { level: MIDDLE, field: 'description' }
  const tag2 = p.tag.find(x => x.n.includes(w))
  if (tag2) return { level: MIDDLE, field: 'tag', synonym: tag2.text }
  if (p.alias.includes(w)) return { level: MIDDLE, field: 'alias' }
  if (p.key.includes(w)) return { level: MIDDLE, field: 'key' }
  return null
}

export interface SearchHit {
  entry: SearchEntry
  /** Уровень совпадения: 1 — точная подпись … 7 — середина слова; 0 — запись фильтра без запроса. */
  tier: number
  /** Пояснение строки выдачи: чем найдено, когда не подписью. */
  hint: string
}

function rank(p: Prepared, qn: string, words: string[]): SearchHit | null {
  const hits: WordHit[] = []
  for (const w of words) {
    const h = wordHit(p, w)
    if (!h) return null
    hits.push(h)
  }
  const worst = Math.max(...hits.map(h => h.level))
  let tier = worst
  if (tier === LABEL) tier = p.label === qn ? EXACT : p.label.startsWith(qn) ? LABEL_START : LABEL
  const weak = hits.find(h => h.level === worst)!
  const e = p.e
  const hint = weak.field === 'synonym'
    ? `по запросу «${weak.synonym}»`
    : weak.field === 'tag' ? `${e.tagHint} «${weak.synonym}»`
      : weak.field === 'description' ? e.description : weak.field === 'alias' ? `алиас ${e.alias}` : weak.field === 'key' ? `ключ ${e.key}` : ''
  return { entry: e, tier, hint }
}

/** Раскладки клавиатуры: та же клавиша в английской и русской. */
const EN = '`qwertyuiop[]asdfghjkl;\'zxcvbnm,.'
const RU = 'ёйцукенгшщзхъфывапролджэячсмитьбю'

/**
 * Запрос в другой раскладке — 3.2, п. 4: «hfpvsn» → «размыт», «фаыфа» → «afsaf». Пусто, если букв одной раскладки нет,
 * они смешаны или после нормализации ничего не осталось.
 */
export function otherLayout(query: string): string {
  const q = query.toLowerCase()
  const lat = /[a-z]/.test(q)
  const cyr = /[а-яё]/.test(q)
  if (lat === cyr) return ''
  const [from, to] = lat ? [EN, RU] : [RU, EN]
  const out = [...q].map((c) => { const k = from.indexOf(c); return k >= 0 ? to[k]! : c }).join('')
  return normalizeText(out) && normalizeText(out) !== normalizeText(q) ? out.trim() : ''
}

export interface SearchView {
  /** Запрос как в поле. */
  query: string
  /** Запрос, по которому найдено: тот же либо в другой раскладке. */
  effective: string
  /** Запрос в другой раскладке — для пустой выдачи; пусто, если раскладку не сменить. */
  alt: string
  /** Выдача показана по запросу в другой раскладке: «Показано по «размыт»». */
  shownFor: string
  /** Найденное по рангу, все области. */
  hits: SearchHit[]
  /** Число найденного по охватам. */
  counts: Record<SearchScope, number>
}

/**
 * Поиск по индексу. `only` — фильтр «Изменено в черновике»: ищется среди этих ключей, пустой запрос отдаёт их все в порядке
 * страницы. `recent` — ключи недавних мест, свежие первыми: при равном уровне недавнее выше.
 */
export function runSearch(index: readonly SearchEntry[], query: string, opts: { recent?: readonly string[], only?: ReadonlySet<string> | null } = {}): SearchView {
  const pool = opts.only ? index.filter(e => opts.only!.has(e.key)) : index
  const recent = opts.recent ?? []
  const recency = (key: string) => { const k = recent.indexOf(key); return k < 0 ? Number.POSITIVE_INFINITY : k }
  const exec = (q: string): SearchHit[] => {
    const words = queryWords(q)
    const qn = normalizeText(q)
    const out: SearchHit[] = []
    for (const e of pool) {
      const h = rank(prepare(e), qn, words)
      if (h) out.push(h)
    }
    return out.sort((a, b) => a.tier - b.tier || recency(a.entry.key) - recency(b.entry.key) || a.entry.order - b.entry.order)
  }
  const trimmed = query.trim()
  let hits: SearchHit[] = []
  let effective = trimmed
  let shownFor = ''
  let alt = ''
  if (!queryWords(trimmed).length) {
    if (opts.only) hits = pool.map(entry => ({ entry, tier: 0, hint: '' }))
  }
  else {
    hits = exec(trimmed)
    alt = otherLayout(trimmed)
    if (!hits.length && alt) {
      const again = exec(alt)
      if (again.length) { hits = again; effective = alt; shownFor = alt }
    }
  }
  const counts = Object.fromEntries(SEARCH_SCOPES.map(s => [s.id, s.id === 'all' ? hits.length : hits.filter(h => h.entry.area === s.id).length])) as Record<SearchScope, number>
  return { query, effective, alt, shownFor, hits, counts }
}

export interface SearchGroupView {
  path: string
  hits: SearchHit[]
  /** Сколько строк группы скрыто под «ещё N». */
  more: number
}

/** Сколько строк группы видно до «ещё N»: в охвате «Все» — 5, в области — 10. */
export const GROUP_LIMIT = { all: 5, area: 10 }

/**
 * Выдача группами по пути — 3.2, п. 7: группы в порядке лучшего совпадения, строки внутри — по рангу; у длинной группы —
 * «ещё N», раскрытые группы (`expanded`) показываются целиком.
 */
export function groupHits(hits: readonly SearchHit[], scope: SearchScope, expanded: readonly string[]): SearchGroupView[] {
  const limit = scope === 'all' ? GROUP_LIMIT.all : GROUP_LIMIT.area
  const groups: SearchGroupView[] = []
  for (const h of hits) {
    if (scope !== 'all' && h.entry.area !== scope) continue
    let g = groups.find(x => x.path === h.entry.path)
    if (!g) groups.push(g = { path: h.entry.path, hits: [], more: 0 })
    g.hits.push(h)
  }
  for (const g of groups) {
    if (expanded.includes(g.path) || g.hits.length <= limit) continue
    g.more = g.hits.length - limit
    g.hits = g.hits.slice(0, limit)
  }
  return groups
}

/* ------------------------------ «Изменено в черновике» ------------------------------ */

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const SHOWCASE_FIELDS: Record<string, string[]> = {
  'showcase.publish': ['status'], 'showcase.title': ['title'], 'showcase.summary': ['summary'], 'showcase.image': ['image'], 'showcase.priceFrom': ['priceSource', 'priceFrom'],
  'showcase.industry': ['industry'], 'showcase.spheres': ['spheres'], 'showcase.description': ['description'], 'showcase.problems': ['problems'],
  'showcase.metrics': ['metrics'], 'showcase.modules': ['hiddenModules'],
}

/**
 * Места, изменённые в черновике против текущей версии — 3.2, п. 17 (аналог `@modified` VS Code). Настройка — значение
 * сменилось (у детектора — включение или роль); поле и шаг — добавлены или сменились; группа и процесс — сменились свои
 * атрибуты, удалены или переставлены поля и шаги (у удалённого места на странице нет — место показывает его владелец).
 */
export function modifiedKeys(from: SchemeConfig, to: SchemeConfig): Set<string> {
  const out = new Set<string>()
  for (const meta of SETTINGS) {
    const det = meta.path.match(/^anomalies\.detectors\.(\w+)\.(on|role)$/)
    if (det) {
      if (!same(at(from.settings, `anomalies.detectors.${det[1]}`), at(to.settings, `anomalies.detectors.${det[1]}`))) out.add(`anomalies.detectors.${det[1]}.on`)
      continue
    }
    if (!same(at(from.settings, meta.path), at(to.settings, meta.path))) out.add(meta.path)
  }
  const fieldsOf = (c: SchemeConfig) => new Map(c.form.groups.flatMap(g => g.fields.map(f => [f.id, f] as const)))
  const fa = fieldsOf(from)
  for (const [id, f] of fieldsOf(to)) if (!same(fa.get(id), f)) out.add(`form.${id}`)
  const ga = new Map(from.form.groups.map(g => [g.id, g]))
  for (const g of to.form.groups) {
    const old = ga.get(g.id)
    const attrs = (x: typeof g) => ({ ...x, fields: undefined })
    const kept = (x: typeof g, ids: Set<string>) => x.fields.filter(f => ids.has(f.id)).map(f => f.id)
    if (!old || !same(attrs(old), attrs(g)) || old.fields.some(f => !g.fields.some(y => y.id === f.id))
      || !same(kept(old, new Set(g.fields.map(f => f.id))), kept(g, new Set(old.fields.map(f => f.id))))) out.add(`group.${g.id}`)
  }
  const pa = new Map(from.processes.map(p => [p.id, p]))
  for (const p of to.processes) {
    const old = pa.get(p.id)
    const attrs = (x: typeof p) => ({ ...x, steps: undefined })
    const kept = (x: typeof p, ids: Set<string>) => x.steps.filter(s => ids.has(s.id)).map(s => s.id)
    if (!old || !same(attrs(old), attrs(p)) || old.steps.some(s => !p.steps.some(y => y.id === s.id))
      || !same(kept(old, new Set(p.steps.map(s => s.id))), kept(p, new Set(old.steps.map(s => s.id))))) out.add(`process.${p.id}`)
    const sa = new Map((old?.steps ?? []).map(s => [s.id, s]))
    for (const st of p.steps) if (!same(sa.get(st.id), st)) out.add(`step.${st.id}`)
  }
  for (const [key, fields] of Object.entries(SHOWCASE_FIELDS)) {
    if (fields.some(f => !same((from.showcase as unknown as Record<string, unknown>)[f], (to.showcase as unknown as Record<string, unknown>)[f]))) out.add(key)
  }
  return out
}

/** Текст уведомления о переключении из выдачи — 3.2, п. 9: «Настройка «…» выключена». Кавычки внутри подписи — «лапками». */
export const toggleNotice = (label: string, on: boolean) => `Настройка «${quoted(label)}» ${on ? 'включена' : 'выключена'}`
