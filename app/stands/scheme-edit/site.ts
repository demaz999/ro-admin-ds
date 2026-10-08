import { scenarioPrice, type ScenarioGap, type ScenarioGapKey, type ScenarioPage } from '~/components/ui/scenario-preview'
import { INDUSTRIES, SHOWCASE_IMAGE_SRC, SHOWCASE_OBJECTS, SHOWCASE_STATUS, SPHERES, type PriceSource } from './catalogs'
import type { SchemeConfig, Showcase } from './model'
import type { TariffPrice } from './tariff'

/**
 * Витрина: цена «от» и превью публичной страницы сценария — такт 90 (`docs/scheme-edit-review.md`, 4.7, 4.8; решения 3, 5
 * оркестратора 2026-10-08). Чистые функции: цена на витрине по источнику, данные превью из полей витрины, список
 * незаполненного. Модель вызывает их с конфигурацией на экране (черновик либо открытый снимок).
 */

/** Цена «от» на витрине по источнику. */
export interface ShowcasePrice {
  source: PriceSource
  /**
   * Цена на сайте «от», ₽: из тарифа — нижняя граница цены для не клиента; вручную — своя; не показывать — `null`.
   * `null` у тарифа — схемы нет в тарификации, у ручной — цена не задана.
   */
  value: number | null
  /** Цена схемы в тарификации; схемы нет — `null`. */
  tariff: TariffPrice | null
  /** Подсказка под ручной ценой: цена по тарифу для сравнения. */
  hint: string
  /** Ручная цена ниже нижней границы тарифа — предупреждение под полем; иначе пусто. */
  warning: string
}

/**
 * Цена на витрине (решение 3): «Из тарифа» — нижняя граница вилки схемы для не клиента по текущему периоду; «Указать вручную» —
 * своя цена, ниже тарифа — предупреждение; «Не показывать» — цены нет. Ручная цена помнится при смене источника: возврат к
 * «Указать вручную» показывает прежнее значение (прецедент режимов «Тарификации», `docs/tariffs.md`, строка 78).
 */
export function showcasePrice(sc: Pick<Showcase, 'priceSource' | 'priceFrom'>, tariff: TariffPrice | null): ShowcasePrice {
  const floor = tariff?.min ?? null
  const hint = floor == null ? 'Схемы нет в тарификации — сравнить не с чем' : `По тарифу для не клиента — ${scenarioPrice(floor)}`
  if (sc.priceSource === 'hidden') return { source: 'hidden', value: null, tariff, hint, warning: '' }
  if (sc.priceSource === 'manual') {
    const v = sc.priceFrom
    const warning = v != null && floor != null && v < floor ? `Ниже тарифа: для не клиента — ${scenarioPrice(floor)}` : ''
    return { source: 'manual', value: v, tariff, hint, warning }
  }
  return { source: 'tariff', value: floor, tariff, hint, warning: '' }
}

/** Значение цены в строке выдачи поиска: источник и цена. */
export function priceSearchValue(p: ShowcasePrice): string {
  const at = p.value == null ? '' : ` — ${scenarioPrice(p.value)}`
  if (p.source === 'hidden') return 'не показывается'
  if (p.source === 'manual') return p.value == null ? 'вручную — не задана' : `вручную${at}`
  return p.value == null ? 'из тарифа — схемы нет в тарификации' : `из тарифа${at}`
}

/** Адрес сайта на стенде — зарезервированный домен примеров: сайт вымышленный. */
export const SITE_HOST = 'example.com'
/** Каталог сценариев на сайте. */
export const SITE_CATALOG = `${SITE_HOST}/scenarios`

/** Транслитерация адреса страницы: строчные латинские, слова через дефис. */
const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e',
  ю: 'yu', я: 'ya',
}
/** «Дистанционный осмотр автомобиля» → `distantsionnyy-osmotr-avtomobilya`. */
export function slugify(text: string): string {
  return [...text.toLowerCase()].map(c => LATIN[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Данные превью публичной страницы: страница сценария, статус карточки, адрес, незаполненное списком. */
export interface SitePreview extends ScenarioPage {
  status: Showcase['status']
  statusLabel: string
  /** Адрес страницы сценария без протокола; без продающего названия — пусто. */
  address: string
  /** Адрес каталога сценариев. */
  catalogAddress: string
  /** Незаполненное в порядке страницы. */
  gapList: (ScenarioGap & { key: ScenarioGapKey })[]
}

/** Что модель передаёт сборке: цена, модули «Из схемы» на витрине и скрытые, статусы «Как устроена схема». */
export interface SiteContext {
  price: ShowcasePrice
  modules: string[]
  hiddenModules: number
  flow: string[]
}

/** Порядок мест страницы — для списка незаполненного. */
const ORDER = ['tags', 'title', 'summary', 'price', 'image', 'description', 'pair', 'metrics', 'metric', 'modules']
const rank = (key: string) => ORDER.indexOf(key.split(':')[0]!) * 100 + Number(key.split(':')[1] ?? 0)

/**
 * Превью страницы сценария из полей витрины (ревью 4.8; решение 5): первый экран — продающее название, краткое описание,
 * изображение, цена «от», метки «Индустрия → Сфера применения → Объект», «Оставить заявку»; «Зачем нужен осмотр» — описание,
 * пары, метрики; «Как устроена схема» — статусы; «ИИ-модули и проверки» — показанные на витрине. Незаполненное — место и поле
 * таба для перехода.
 */
export function buildSitePreview(config: SchemeConfig, ctx: SiteContext): SitePreview {
  const sc = config.showcase
  const type = config.settings.general.schemeType
  const gaps: Partial<Record<ScenarioGapKey, ScenarioGap>> = {}
  const title = sc.title.trim()
  if (!sc.industry) gaps.tags = { field: 'scIndustry', label: 'Индустрия' }
  else if (!sc.spheres.length) gaps.tags = { field: 'scSpheres', label: 'Сфера применения' }
  if (!title) gaps.title = { field: 'scTitle', label: 'Продающее название' }
  if (!sc.summary.trim()) gaps.summary = { field: 'scSummary', label: 'Краткое описание' }
  if (ctx.price.source !== 'hidden' && ctx.price.value == null) gaps.price = { field: ctx.price.source === 'manual' ? 'scPriceValue' : 'scPrice', label: 'Цена «от»' }
  if (!sc.image) gaps.image = { field: 'scImage', label: 'Изображение' }
  if (!sc.description.trim()) gaps.description = { field: 'scDescription', label: 'Развёрнутое описание' }
  sc.problems.forEach((x, k) => {
    const miss = !x.problem.trim() ? 'scProblem' : !x.effect.trim() ? 'scEffect' : !x.solution.trim() ? 'scSolution' : ''
    if (miss) gaps[`pair:${k}`] = { field: `${miss}${k}`, label: `Проблемы и решения, пара ${k + 1}` }
  })
  if (!sc.metrics.length) gaps.metrics = { field: 'scMetrics', label: 'Метрики' }
  sc.metrics.forEach((x, k) => {
    const miss = !x.label.trim() ? 'scMetric' : !x.value.trim() ? 'scMetricValue' : ''
    if (miss) gaps[`metric:${k}`] = { field: `${miss}${k}`, label: `Метрика ${k + 1}` }
  })
  if (!ctx.modules.length && ctx.hiddenModules) gaps.modules = { field: 'scHidden', label: 'ИИ-модули и проверки' }

  const industry = INDUSTRIES.find(x => x.value === sc.industry)?.label
  const spheres = sc.spheres.map(v => SPHERES.find(x => x.value === v && x.industry === sc.industry)?.label).filter((x): x is string => !!x)
  const object = SHOWCASE_OBJECTS[type]
  return {
    status: sc.status,
    statusLabel: SHOWCASE_STATUS[sc.status],
    address: title ? `${SITE_CATALOG}/${slugify(title)}` : '',
    catalogAddress: SITE_CATALOG,
    title,
    summary: sc.summary.trim(),
    image: sc.image ? (SHOWCASE_IMAGE_SRC[type] ?? SHOWCASE_IMAGE_SRC.vehicle!) : '',
    price: ctx.price.value,
    tags: [industry, ...spheres, object].filter((x): x is string => !!x),
    action: 'Оставить заявку',
    description: sc.description.trim(),
    pairs: sc.problems.map(x => ({ problem: x.problem.trim(), effect: x.effect.trim(), solution: x.solution.trim() })),
    metrics: sc.metrics.map(x => ({ label: x.label.trim(), value: x.value.trim() })),
    steps: ctx.flow,
    modules: ctx.modules,
    gaps,
    gapList: (Object.entries(gaps) as [ScenarioGapKey, ScenarioGap][]).sort((a, b) => rank(a[0]) - rank(b[0])).map(([key, g]) => ({ key, ...g })),
  }
}
