import { SCHEME_TYPES } from './catalogs'
import { plural } from './diff'
import { DONOR_SCHEMES, type DonorSchemeRaw } from './donors'
import type { Dataset, SchemeConfig } from './model'

/**
 * Создание схемы — такт 91 (`docs/scheme-edit-review.md`, 5.3; решение 3 оркестратора 2026-10-08). Чистые функции и демо-данные
 * окна «Новая схема осмотра»: источники, карточки, основа, конфигурация новой схемы и передача её странице схемы.
 *
 * Пути: шаблон из «Отобранных шаблонов», схема из «Других схем» (по роли), «Недавние», «Пустая схема», копия схемы со страницы
 * (сразу шаг «Основа»). «Загрузить из дампа» — вне стенда (уведомление). «Создать схему» — первое сохранение: у схемы есть
 * идентификатор, «Форма» и «Процессы и шаги» открыты сразу (двухфазность — такт 72).
 *
 * Модуль не импортирует модель во время загрузки — только типы: циклического импорта нет (ловушка такта 64).
 */
export type CreateSourceId = 'templates' | 'other' | 'recent'
export const CREATE_SOURCES: { id: CreateSourceId, label: string, icon?: 'admin', access?: string }[] = [
  { id: 'templates', label: 'Отобранные шаблоны' },
  { id: 'other', label: 'Другие схемы', icon: 'admin', access: 'Схемы вашей компании — доступ по роли «Администратор»' },
  { id: 'recent', label: 'Недавние' },
]
/** Компания пользователя стенда — «Другие схемы» и компания-владелец новой схемы по умолчанию. */
export const CREATE_COMPANY = 'Демо Страхование'
/** «Недавние» — демо: схема компании и шаблон, свежие первыми. */
export const RECENT_IDS = ['d-osago', 't-car']

/** Карточка окна: шаблон либо схема. */
export interface CreateCard {
  id: string
  title: string
  object: string
  description: string
  /** «Шаблон» либо «Схема компании». */
  kind: 'template' | 'scheme'
  fields: number
  steps: number
  /** «Легковой автомобиль · 8 полей · 9 шагов». */
  meta: string
  schemeType: string
}

const count = (n: number, one: string, few: string, many: string) => `${n} ${plural(n, one, few, many)}`
function card(raw: DonorSchemeRaw): CreateCard {
  const fields = raw.groups.reduce((n, g) => n + g.fields.length, 0)
  const steps = raw.processes.reduce((n, p) => n + p.steps.length, 0)
  return {
    id: raw.id, title: raw.title, object: raw.object, description: raw.description, kind: raw.template ? 'template' : 'scheme', fields, steps,
    meta: [raw.object, count(fields, 'поле', 'поля', 'полей'), count(steps, 'шаг', 'шага', 'шагов')].join(' · '), schemeType: raw.schemeType,
  }
}
const byId = (id: string) => DONOR_SCHEMES.find(d => d.id === id)

/** Карточки источника: шаблоны платформы; схемы компании пользователя; недавние — в порядке использования. */
export function createCards(source: CreateSourceId): CreateCard[] {
  if (source === 'templates') return DONOR_SCHEMES.filter(d => d.template).map(card)
  if (source === 'other') return DONOR_SCHEMES.filter(d => !d.template && d.owner === CREATE_COMPANY).map(card)
  return RECENT_IDS.map(byId).filter((d): d is DonorSchemeRaw => !!d).map(card)
}
export const createCard = (id: string): CreateCard | null => { const d = byId(id); return d ? card(d) : null }

/** Основа новой схемы — шаг 2 окна: то, что нужно для идентификатора. */
export interface CreateBasics {
  name: string
  owner: string
  inspectionType: 'regular' | 'multi'
  schemeType: string
}
/** Откуда схема: шаблон или схема компании (`id`), пустая, копия конфигурации. */
export type CreateFrom = { kind: 'card', id: string } | { kind: 'empty' } | { kind: 'copy', config: SchemeConfig, title: string }

/** Основа по умолчанию для источника: название шаблона, у схемы компании и копии — «Копия — …». */
export function defaultBasics(from: CreateFrom): CreateBasics {
  if (from.kind === 'copy') {
    const g = from.config.settings.general
    return { name: `Копия — ${from.title}`, owner: g.owner, inspectionType: g.inspectionType, schemeType: g.schemeType }
  }
  if (from.kind === 'empty') return { name: '', owner: CREATE_COMPANY, inspectionType: 'regular', schemeType: SCHEME_TYPES[0]!.value }
  const raw = byId(from.id)
  return { name: raw ? (raw.template ? raw.title : `Копия — ${raw.title}`) : '', owner: CREATE_COMPANY, inspectionType: 'regular', schemeType: raw?.schemeType ?? 'vehicle' }
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))
/** Формулы по переменной наименования объекта источника; у пустой схемы — пустые, как у набора «новая схема» (такт 72). */
function formulas(v: string) {
  return v
    ? { objectName: v, schemeName: '{Scheme:type}', zipName: v, mailSubject: `Осмотр {Inspection:number} — ${v}` }
    : { objectName: '', schemeName: '', zipName: '', mailSubject: '' }
}
const EMPTY_SHOWCASE = { status: 'needs', title: '', summary: '', priceFrom: null, industry: '', spheres: [], problems: [], metrics: [], hiddenModules: [] }

/**
 * Конфигурация новой схемы. Шаблон и схема компании — группы, поля, процессы и шаги источника, формулы по его анкете, прочие
 * настройки — значения платформы по умолчанию (их проверяет этап «Правила»). Пустая — как набор «новая схема». Копия —
 * конфигурация целиком, карточка витрины снова «требует оформления»: новая схема на витрине не стоит.
 */
export function createConfig(from: CreateFrom, basics: CreateBasics): SchemeConfig {
  const general = { name: basics.name.trim(), owner: basics.owner.trim(), schemeType: basics.schemeType, inspectionType: basics.inspectionType }
  if (from.kind === 'copy') {
    const c = clone(from.config)
    Object.assign(c.settings.general, general)
    c.showcase.status = 'needs'
    return c
  }
  const raw = from.kind === 'card' ? byId(from.id) : undefined
  const v = raw?.formula ?? ''
  return {
    settings: {
      general: { ...general, description: raw?.description ?? '', purpose: 'standard', active: false, formulas: formulas(v) },
      mobile: {},
      web: raw ? {} : { feedback: false, reasons: [] },
      access: raw ? {} : { groups: [] },
      ai: {},
      anomalies: raw ? {} : { enabled: false },
      pdf: raw ? { fileName: `Лист осмотра ${v}` } : { templates: [], fileName: '' },
    },
    form: { groups: clone(raw?.groups ?? []) },
    processes: clone(raw?.processes ?? []),
    showcase: clone(EMPTY_SHOWCASE),
  } as unknown as SchemeConfig
}

/** Набор данных созданной схемы: публикаций нет, черновик — конфигурация. */
export function createdDataset(from: CreateFrom, basics: CreateBasics, draft: { author: string, editedAt: string }): Dataset {
  return { snapshots: [], draft: { ...draft, config: createConfig(from, basics) } }
}

/** Уведомление после создания: откуда схема. */
export function createdNotice(from: CreateFrom, name: string): string {
  if (from.kind === 'copy') return `Схема «${name}» создана копией «${from.title}»`
  if (from.kind === 'empty') return `Схема «${name}» создана`
  const raw = byId(from.id)
  return raw?.template ? `Схема «${name}» создана из шаблона «${raw.title}»` : `Схема «${name}» создана из схемы «${raw?.title ?? ''}»`
}

/** Значение `?from=` адреса созданной схемы. */
export const fromParam = (from: CreateFrom) => (from.kind === 'card' ? from.id : from.kind)

/**
 * Передача набора данных странице схемы при переходе: окно на `/scheme-edit/new` и копия на `/scheme-edit` кладут набор сюда,
 * страница схемы забирает его при создании модели. Прямой адрес `?data=created&from=…` (оснастка) — набор по умолчанию.
 */
let handoff: { dataset: Dataset, notice: string } | null = null
export function setHandoff(x: { dataset: Dataset, notice: string }) { handoff = x }
export function takeHandoff() {
  const x = handoff
  handoff = null
  return x
}
