import { normalizeText, queryWords } from '~/components/ui/highlight-text'

/**
 * Каталог фото-подсказок и подбор подсказки к шагу — такт 87 (`docs/scheme-edit-review.md`, 4.3, 4.4; решения 3–5
 * оркестратора 2026-10-08). Чистые функции и справочник: DOM и реактивности модуль не знает.
 *
 * **Каталог** — демо-данные стенда. Настоящий каталог продукта — 1512 иконок и гифок (`spec-audit.md`, «Принцип: атрибут —
 * инлайн по месту»), поэтому иллюстрации — в его жанре: у «Транспорта» и «Документов» — схематичные рисунки части и ракурса
 * (`public/scheme-edit/hints/`, нарисованы на стенде, такт 87), у «Недвижимости» — кадры `public/free-shoot/` (Unsplash
 * License, `CREDITS.md`). Марок, номеров и людей на иллюстрациях нет. У каждой подсказки — часть и ракурс.
 *
 * **Подсказки шага** — список: элементы каталога и свои загрузки. Счёт и статус ячейки считаются по списку.
 *
 * **Подбор для массовой заливки** — по названию шага и типу объекта: категории каталога, подходящие типу объекта процесса
 * (без него — типу схемы), и «Документы», которые снимают в любой схеме. Оценка — «Совпадает» (все значимые слова названия
 * нашли одну подсказку), «Похоже» (несколько подсказок поровну, совпала часть слов либо только описание), «Нет предложения».
 */

export type HintCategory = 'vehicle' | 'realty' | 'documents'
/** Категория каталога или все сразу — колонка категорий сайда каталога. */
export type HintCategoryFilter = 'all' | HintCategory
export const HINT_CATEGORIES: { id: HintCategory, label: string }[] = [
  { id: 'vehicle', label: 'Транспорт' },
  { id: 'realty', label: 'Недвижимость' },
  { id: 'documents', label: 'Документы' },
]

export interface CatalogHint {
  id: string
  category: HintCategory
  /** Часть объекта — первая строка подписи. */
  part: string
  /** Ракурс — вторая строка подписи. */
  angle: string
  src: string
  /**
   * Основы слов для подбора и поиска: слово названия шага либо запроса начинается с основы. Основа с `$` на конце — слово
   * целиком (`пол$` не находит «полис»).
   */
  stems: string[]
}

const art = (id: string) => `/scheme-edit/hints/${id}.svg`
const photo = (n: string) => `/free-shoot/demo-${n}.jpg`

/** Демо-каталог: 30 подсказок — «Транспорт» 16, «Документы» 6, «Недвижимость» 8. */
export const HINT_CATALOG: CatalogHint[] = [
  { id: 'car-front', category: 'vehicle', part: 'Передняя часть', angle: 'Анфас', src: art('car-front'), stems: ['передн', 'фар', 'бампер', 'решетк', 'анфас'] },
  { id: 'car-front-left', category: 'vehicle', part: 'Передняя часть', angle: 'Три четверти слева', src: art('car-front-left'), stems: ['передн', 'слев', 'угл'] },
  { id: 'car-front-right', category: 'vehicle', part: 'Передняя часть', angle: 'Три четверти справа', src: art('car-front-right'), stems: ['передн', 'справ', 'угл'] },
  { id: 'car-rear', category: 'vehicle', part: 'Задняя часть', angle: 'Анфас', src: art('car-rear'), stems: ['задн', 'фонар', 'багажн', 'анфас'] },
  { id: 'car-rear-left', category: 'vehicle', part: 'Задняя часть', angle: 'Три четверти слева', src: art('car-rear-left'), stems: ['задн', 'слев', 'угл'] },
  { id: 'car-rear-right', category: 'vehicle', part: 'Задняя часть', angle: 'Три четверти справа', src: art('car-rear-right'), stems: ['задн', 'справ', 'угл'] },
  { id: 'car-left', category: 'vehicle', part: 'Левая сторона', angle: 'Профиль', src: art('car-left'), stems: ['лев', 'слев', 'бок', 'профил', 'сторон'] },
  { id: 'car-right', category: 'vehicle', part: 'Правая сторона', angle: 'Профиль', src: art('car-right'), stems: ['прав', 'справ', 'бок', 'профил', 'сторон'] },
  { id: 'car-vin-glass', category: 'vehicle', part: 'VIN под стеклом', angle: 'Через лобовое стекло', src: art('car-vin-glass'), stems: ['vin', 'вин', 'стекл', 'лобов'] },
  { id: 'car-vin-body', category: 'vehicle', part: 'VIN на кузове', angle: 'Выбитый номер', src: art('car-vin-body'), stems: ['vin', 'вин', 'кузов', 'металл', 'выбит', 'стойк'] },
  { id: 'car-plate', category: 'vehicle', part: 'Табличка изготовителя', angle: 'Крупно', src: art('car-plate'), stems: ['табличк', 'шильд', 'изготовител'] },
  { id: 'car-odometer', category: 'vehicle', part: 'Одометр', angle: 'Приборная панель', src: art('car-odometer'), stems: ['одометр', 'пробег', 'прибор'] },
  { id: 'car-wheel', category: 'vehicle', part: 'Колесо', angle: 'Крупно', src: art('car-wheel'), stems: ['колес', 'шин', 'диск', 'протектор'] },
  { id: 'car-interior', category: 'vehicle', part: 'Салон', angle: 'Передние сиденья', src: art('car-interior'), stems: ['салон', 'сиден', 'руль'] },
  { id: 'car-engine', category: 'vehicle', part: 'Моторный отсек', angle: 'Сверху', src: art('car-engine'), stems: ['мотор', 'двигател', 'отсек', 'подкапот'] },
  { id: 'car-damage', category: 'vehicle', part: 'Повреждение', angle: 'Крупный план', src: art('car-damage'), stems: ['поврежд', 'царапин', 'вмятин', 'скол', 'дефект', 'детал'] },

  { id: 'doc-pts', category: 'documents', part: 'ПТС', angle: 'Разворот с данными', src: art('doc-pts'), stems: ['птс', 'паспорт'] },
  { id: 'doc-sts', category: 'documents', part: 'СТС', angle: 'Лицевая сторона', src: art('doc-sts'), stems: ['стс', 'свидетельств', 'регистрац'] },
  { id: 'doc-policy', category: 'documents', part: 'Страховой полис', angle: 'Первая страница', src: art('doc-policy'), stems: ['полис', 'страхов'] },
  { id: 'doc-diag', category: 'documents', part: 'Диагностическая карта', angle: 'Первая страница', src: art('doc-diag'), stems: ['диагност', 'техосмотр'] },
  { id: 'doc-contract', category: 'documents', part: 'Договор', angle: 'Страница с подписями', src: art('doc-contract'), stems: ['договор', 'подпис'] },
  { id: 'doc-act', category: 'documents', part: 'Акт осмотра', angle: 'Первая страница', src: art('doc-act'), stems: ['акт$', 'акта$'] },

  { id: 'realty-facade', category: 'realty', part: 'Фасад здания', angle: 'Общий план', src: photo('22'), stems: ['фасад', 'здани', 'стен', 'кирпич'] },
  { id: 'realty-cladding', category: 'realty', part: 'Облицовка фасада', angle: 'Крупный план', src: photo('12'), stems: ['облицов', 'фасад', 'панел'] },
  { id: 'realty-roof', category: 'realty', part: 'Кровля и верх фасада', angle: 'Снизу', src: photo('10'), stems: ['кровл', 'крыш', 'карниз'] },
  { id: 'realty-territory', category: 'realty', part: 'Здание с территорией', angle: 'Общий план издали', src: photo('24'), stems: ['территор', 'участ', 'двор'] },
  { id: 'realty-room', category: 'realty', part: 'Помещение', angle: 'Общий план от входа', src: photo('04'), stems: ['помещени', 'комнат', 'интерьер', 'окн'] },
  { id: 'realty-floor', category: 'realty', part: 'Пол', angle: 'Покрытие на всю глубину', src: photo('16'), stems: ['пол$', 'пола$', 'напольн', 'покрыти'] },
  { id: 'realty-ceiling', category: 'realty', part: 'Потолок и освещение', angle: 'Снизу', src: photo('17'), stems: ['потол', 'освещ', 'светильн'] },
  { id: 'realty-pipes', category: 'realty', part: 'Инженерные системы', angle: 'Трубы и вентили', src: photo('07'), stems: ['инженер', 'труб', 'вентил', 'коммуникац', 'отоплени'] },
]

const BY_ID = new Map(HINT_CATALOG.map(h => [h.id, h]))
export const catalogHint = (id: string): CatalogHint | undefined => BY_ID.get(id)

/* ------------------------------ подсказки шага ------------------------------ */

/** Подсказка шага: элемент каталога либо своя загрузка (имя файла). */
export type StepHint = { kind: 'catalog', id: string } | { kind: 'upload', id: string, name: string }

/** Своя загрузка на стенде — одна нейтральная картинка «своё фото»: файлов стенд не принимает. */
export const UPLOAD_SRC = '/scheme-edit/hints/upload.svg'

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
/** Подпись подсказки одной строкой: «Передняя часть · три четверти слева»; у своей загрузки — «Своя загрузка · front-1.jpg». */
export function hintLabel(h: StepHint): string {
  if (h.kind === 'upload') return `Своя загрузка · ${h.name}`
  const c = catalogHint(h.id)
  return c ? catalogLabel(c) : h.id
}
export const catalogLabel = (c: CatalogHint) => `${c.part} · ${lowerFirst(c.angle)}`
export const hintSrc = (h: StepHint): string => (h.kind === 'upload' ? UPLOAD_SRC : catalogHint(h.id)?.src ?? UPLOAD_SRC)
/** Статус ячейки и сайда — макет `32765:6709`, `32765:6773`: «N · Все установлены» либо «Не установлена». */
export const hintStatus = (n: number) => (n ? `${n} · Все установлены` : 'Не установлена')

/* ------------------------------ поиск по каталогу ------------------------------ */

const tokens = (s: string) => { const n = normalizeText(s); return n ? n.split(' ') : [] }
const stemHit = (word: string, stem: string) => (stem.endsWith('$') ? word === stem.slice(0, -1) : word.startsWith(stem))

/**
 * Совпадение слова запроса с подсказкой: начало слова в части или ракурсе, основа слова (запрос «фара» — основа «фар»),
 * середина слова от трёх знаков — как у поиска страницы (`search.ts`).
 */
function queryHit(c: CatalogHint, w: string): boolean {
  const text = normalizeText(`${c.part} ${c.angle}`)
  if (tokens(text).some(x => x.startsWith(w))) return true
  if (c.stems.some(s => stemHit(w, s))) return true
  return w.length >= 3 && text.includes(w)
}

/** Подсказки по запросу и категории; пустой запрос — все подсказки категории в порядке каталога. */
export function searchCatalog(query: string, category: HintCategoryFilter): CatalogHint[] {
  const words = queryWords(query)
  return HINT_CATALOG.filter(c => (category === 'all' || c.category === category) && words.every(w => queryHit(c, w)))
}

/** Число подсказок по запросу в каждой категории и всего — счётчики колонки категорий. */
export function catalogCounts(query: string): Record<HintCategoryFilter, number> {
  const all = searchCatalog(query, 'all')
  return { all: all.length, vehicle: all.filter(c => c.category === 'vehicle').length, realty: all.filter(c => c.category === 'realty').length,
    documents: all.filter(c => c.category === 'documents').length }
}

/* ------------------------------ подбор для массовой заливки ------------------------------ */

/** Тип объекта процесса и тип схемы — категория каталога. Тип схемы «оборудование» категории не имеет. */
const OBJECT_CATEGORY: Record<string, HintCategory> = { car: 'vehicle', truck: 'vehicle', moto: 'vehicle', house: 'realty', document: 'documents' }
const SCHEME_CATEGORY: Record<string, HintCategory> = { vehicle: 'vehicle', house: 'realty' }
/** Категория шага: тип объекта процесса, без него — тип схемы; пусто — категории нет. */
export function stepCategory(objectType: string, schemeType: string): HintCategory | '' {
  return OBJECT_CATEGORY[objectType] ?? SCHEME_CATEGORY[schemeType] ?? ''
}
/** Категория, выбранная заранее в сайде каталога, — категория шага, без неё — «Все». */
export const categoryAtOpen = (objectType: string, schemeType: string): HintCategoryFilter => stepCategory(objectType, schemeType) || 'all'

export type HintMatch = 'match' | 'similar' | 'none'
export const HINT_MATCH_LABEL: Record<HintMatch, string> = { match: 'Совпадает', similar: 'Похоже', none: 'Нет предложения' }

export interface HintProposal {
  hint: CatalogHint | null
  match: HintMatch
  /** Почему предложено — вторая строка у предложения: «по названию шага», «по описанию шага». */
  reason: string
}

/** Служебные слова названия шага: в подборе не участвуют. */
const STOP = new Set(['вид', 'под', 'над', 'для', 'при', 'или', 'без', 'про', 'после', 'перед'])
const significant = (s: string) => tokens(s).filter(w => w.length >= 3 && !STOP.has(w))
const hits = (c: CatalogHint, words: string[]) => words.filter(w => c.stems.some(s => stemHit(w, s))).length

/**
 * Подсказка к шагу из каталога — 4.4: по значимым словам названия (служебные и короче трёх знаков не в счёт), при равенстве —
 * по описанию, затем порядок каталога. Кандидаты — категории шага и «Документы»; без категории — весь каталог. Подсказки,
 * которые уже у шага, не предлагаются.
 */
export function proposeHint(step: { title: string, description: string, hints: readonly StepHint[] }, category: HintCategory | ''): HintProposal {
  const own = new Set(step.hints.filter(h => h.kind === 'catalog').map(h => h.id))
  const pool = HINT_CATALOG.filter(c => !category || c.category === category || c.category === 'documents')
  const title = significant(step.title)
  const desc = significant(step.description)
  const scored = pool.map(c => ({ c, t: hits(c, title), d: hits(c, desc) }))
  const fit = scored.filter(x => x.t || x.d)
  const free = fit.filter(x => !own.has(x.c.id))
  if (!free.length) return { hint: null, match: 'none', reason: fit.length ? 'подходящие подсказки уже у шага' : 'в каталоге нет подходящей подсказки' }
  const bestT = Math.max(...free.map(x => x.t))
  if (bestT > 0) {
    const top = free.filter(x => x.t === bestT).sort((a, b) => b.d - a.d)
    const hint = top[0]!.c
    if (top.length > 1) return { hint, match: 'similar', reason: `по названию шага · похожих ещё ${top.length - 1}` }
    if (bestT < title.length) return { hint, match: 'similar', reason: 'по части названия шага' }
    return { hint, match: 'match', reason: 'по названию шага' }
  }
  const bestD = Math.max(...free.map(x => x.d))
  const hint = free.find(x => x.d === bestD)!.c
  return { hint, match: 'similar', reason: 'по описанию шага' }
}
