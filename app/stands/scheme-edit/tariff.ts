import tariffs from '~/stands/tariffs/demo-data.json'
import { addMonths, monthLabel, type Dataset as TariffDataset, type Price, type Scale, type TariffSettings } from '~/stands/tariffs/model'

/**
 * Цена из тарифа — такт 90 (`docs/scheme-edit-review.md`, 4.7; решения 3, 4 оркестратора 2026-10-08).
 *
 * Чистые функции чтения данных страницы «Тарификация»: модуль модели тарификации (`~/stands/tariffs/model.ts`) не меняется —
 * отсюда берутся только его типы и `addMonths`, `monthLabel`. Правила повторяют `docs/tariffs.md`:
 *
 * - **текущий период** — 6.4: очередь — периоды без черновиков по началу; текущий — последний из начавшихся по часам; настройки
 *   периода — базовые настройки набора и правки периода (`patch`);
 * - **вилка схемы** — 6.5: «По группе» — вилка группы, «Индивидуальная цена» — пара схемы, «Регресс-шкала» — ступени шкалы
 *   схемы; у группы — «Базовая цена компании» (пара либо общая шкала компании), фиксированная пара, ступени шкалы. Цены типов
 *   объектов в вилку схемы не входят (`tariffs.md`, строка 56 реестра); минимальная сумма за период — не цена осмотра, в вилку
 *   роли не входит.
 *
 * Роль — «не клиент» (§1, 6.3): посетитель сайта ещё не клиент, договора у него нет. Значение роли у пары — «Не клиент»,
 * у связанной пары — «Клиент»; у шкалы «Единая цена» — цена ступени, у шкалы «По ролям» — «Не клиент» ступени (6.2).
 */

/** Соответствие схемы стенда схеме тарификации — данные стенда (`demo-data.json`, поле `tariff`). */
export interface TariffLink {
  /** Компания тарификации — владелец схемы. */
  company: string
  /** Группа схем тарификации (id). */
  group: string
  /** Схема тарификации (id). */
  scheme: string
}

/** Цена схемы для не клиента по текущему периоду тарификации. */
export interface TariffPrice {
  company: string
  scheme: { id: string, name: string }
  group: { id: string, name: string }
  /** Уровень, с которого пришла цена (6.1): своя цена схемы, цена группы, базовая цена компании. */
  level: 'scheme' | 'group' | 'company'
  /** Пара цен либо регресс-шкала уровня. */
  kind: 'pair' | 'scale'
  /** Вилка роли «не клиент», ₽: нижняя и верхняя граница; цен нет — `null` и `null`. */
  min: number | null
  max: number | null
  /** Текущий период: начало и конец интервала `ГГГГ-ММ`; у последнего в очереди конца нет. */
  period: { from: string, to: string | null }
}

const pad = (n: number) => String(n).padStart(2, '0')
const yearOf = (month: string) => Number(month.slice(0, 4))
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

/** Правка периода по пути — как запись правок периода в модели тарификации: путь к несуществующему узлу пропускается. */
function setPath(root: unknown, path: string, value: unknown) {
  const keys = path.split('.')
  let node = root as Record<string, unknown>
  for (const k of keys.slice(0, -1)) {
    if (node[k] == null || typeof node[k] !== 'object') return
    node = node[k] as Record<string, unknown>
  }
  node[keys[keys.length - 1]!] = clone(value)
}

/**
 * Периоды тарификации по часам `month` (`ГГГГ-ММ`) — 6.4: начало периода — год от часов и месяц либо «через N месяцев»;
 * текущий — последний из начавшихся в очереди, запланированные — после часов, прочие начавшиеся — архив; черновик в
 * очередь не входит. Конец интервала — месяц перед началом следующего в очереди.
 */
export function tariffPeriods(data: TariffDataset, month: string) {
  const fromOf = (f: TariffDataset['periods'][number]['from']) => ('ahead' in f ? addMonths(month, f.ahead) : `${yearOf(month) + f.year}-${pad(f.month)}`)
  const all = data.periods.map((p) => {
    const settings = clone(data.settings)
    for (const [path, value] of p.patch) setPath(settings, path, value)
    return { id: p.id, draft: p.status === 'draft', from: fromOf(p.from), to: null as string | null, status: 'draft' as 'current' | 'planned' | 'archive' | 'draft', settings }
  })
  const queue = all.filter(p => !p.draft).sort((a, b) => a.from.localeCompare(b.from))
  const started = queue.filter(p => p.from <= month)
  const cur = started[started.length - 1]
  queue.forEach((p, k) => {
    p.status = p === cur ? 'current' : p.from > month ? 'planned' : 'archive'
    p.to = queue[k + 1] ? addMonths(queue[k + 1]!.from, -1) : null
  })
  return all
}

/** Значения роли «не клиент» уровня: пара — одно значение, шкала — по ступени (6.2, 6.3). */
export function nonClientValues(level: { price: Price } | { scale: Scale }): (number | null)[] {
  if ('scale' in level) {
    const sc = level.scale
    return sc.steps.map(st => (sc.form === 'single' || st.price.linked ? st.price.client : st.price.nonClient))
  }
  return [level.price.linked ? level.price.client : level.price.nonClient]
}

/** Вилка схемы для роли «не клиент» в настройках периода — 6.5; схемы нет — `null`. */
export function nonClientRange(settings: TariffSettings, schemeId: string): Pick<TariffPrice, 'level' | 'kind' | 'min' | 'max'> | null {
  const x = settings.schemes.find(s => s.id === schemeId)
  if (!x) return null
  const of = (level: TariffPrice['level'], src: { price: Price } | { scale: Scale }) => {
    const xs = nonClientValues(src).filter((v): v is number => v != null)
    return { level, kind: ('scale' in src ? 'scale' : 'pair') as TariffPrice['kind'], min: xs.length ? Math.min(...xs) : null, max: xs.length ? Math.max(...xs) : null }
  }
  if (x.mode === 'individual') return of('scheme', { price: x.price })
  if (x.mode === 'scale') return of('scheme', { scale: x.scale })
  const g = settings.groups.find(y => y.id === x.groupId)
  if (!g) return null
  if (g.mode === 'fixed') return of('group', { price: g.price })
  if (g.mode === 'scale') return of('group', { scale: g.scale })
  const b = settings.base
  return b.scale.on ? of('company', { scale: b.scale }) : of('company', { price: b.price })
}

/**
 * Цена схемы стенда из тарифа: текущий период по часам `month`, схема соответствия, вилка роли «не клиент». Схема другой
 * компании или группы, схемы нет в тарификации — `null`.
 */
export function tariffPrice(link: TariffLink, month: string, data: TariffDataset = tariffs as unknown as TariffDataset): TariffPrice | null {
  if (data.company !== link.company) return null
  const period = tariffPeriods(data, month).find(p => p.status === 'current')
  if (!period) return null
  const x = period.settings.schemes.find(s => s.id === link.scheme)
  const g = period.settings.groups.find(y => y.id === x?.groupId)
  if (!x || !g || g.id !== link.group) return null
  const range = nonClientRange(period.settings, x.id)
  if (!range) return null
  return { company: data.company, scheme: { id: x.id, name: x.name }, group: { id: g.id, name: g.name }, ...range, period: { from: period.from, to: period.to } }
}

/** «текущий тариф с января 2026» — срок периода для подписи цены. */
export const tariffPeriodText = (t: TariffPrice) => `текущий тариф с ${monthLabel(t.period.from)}`

/**
 * «Открыть тарификацию» — страница «Тарификация» на вкладке «Схемы осмотра» с панелью схемы. На стенде — оснастка адреса
 * страницы (`docs/tariffs.md`, 6.9); в продукте — маршрут страницы тарификации со схемой.
 */
export const tariffsHref = (link: TariffLink | null | undefined) => (link ? `/tariffs?tab=schemes&open=scheme&scheme=${link.scheme}` : '/tariffs?tab=schemes')
