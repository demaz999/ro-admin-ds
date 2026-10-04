export { default as PeriodSwitcher } from './PeriodSwitcher.vue'
export { default as PeriodSwitcherItem } from './PeriodSwitcherItem.vue'

/**
 * Переключатель тарифного периода — такт 82, ворота оркестратора 2026-10-04 (`docs/tariffs.md`, раздел 8, карточка 3).
 * Термины сводки — «тарифный период», статусы «текущий, черновик, запланированный, архив» (§8). Мастера в ките 1 нет:
 * источник вида — локальные компоненты макета страницы тарификации (файл `U829JoK7KMZV8do3KNkWBh`): «Hero-переключатель
 * режима» `30957:7855` (4 варианта) и «Модальное окно тарификации» `31089:12090`.
 *
 * Роль — показать выбранный период и переключить его: метка-триггер в шапке страницы, список периодов группами, действие
 * «Запланировать изменение цен». Срок периода компонент выводит сам по `from` и `to` (`ГГГГ-ММ`).
 *
 * ## Части
 *
 * | часть | кит | макет |
 * |---|---|---|
 * | триггер | кнопка 28, поля 6 / 12, зазор 8, радиус `--radius-xs`, подложка `--accent` — тон плитки `Card tone="muted"`: белая метка на белой рабочей зоне кита не читается кнопкой (строка 93 реестра `tariffs.md`; карточка 3 называла `--background`) | `30957:7813`: 28, поля 6 / 12, зазор 8, радиус 4, `bg/page` |
 * | точка | `Indicator size="sm"` 8 × 8: текущий — `success`, запланированный — `default`, черновик — `warning`, архив — `neutral` | `PeriodIcon` 8 × 8: `#27ae60` без переменной, `accent/default`, `service/warning-default`, `neutral/disabled` |
 * | статус и срок в триггере | 13/16 regular `--muted-foreground` оба | 12/16 Regular `#999999` и `#bbbbbb` без переменных |
 * | шеврон | `Icon chevron-down` 16 `--muted-foreground` | `Icon` 16, вектор 8 × 4 |
 * | список | `PopoverContent` 280 · `SelectContent` 280 · `SelectGroup` — группы через линию | плашка 280 с уголком 16 × 8, группы на `bg/surface_hover` через 4 |
 * | пункт (`PeriodSwitcherItem`) | `SelectItem` 44: точка, статус 15/20 medium, срок 12/16 `--muted-foreground` справа; выбранный — `--list-selected` | 272 × 44, поля 12 / 16, радиус 4: статус 15/20 Bold `fg/primary`, срок 12/16 `#bbbbbb`; выбранный `bg/surface_selected` |
 * | действие | `ButtonAction strong` с глифом `add` | `btn_txt` accent Bold «Запланировать изменение цен» |
 *
 * ## Группы списка
 *
 * Первая — действующие и будущие: текущий, запланированные по дате начала, черновики по желаемой дате. Вторая — архив,
 * новые сверху. Третья — действие. Пустая группа не рисуется.
 *
 * ## Срок
 *
 * | статус | срок | пример |
 * |---|---|---|
 * | текущий | «до <месяц год>» — последний месяц интервала; без следующего в очереди — «с <месяц год>» | «до июня 2026» |
 * | запланированный, черновик | «с <месяц год>» | «с июля 2026» |
 * | архив | «до <месяц год>» | «до декабря 2025» |
 *
 * ## Поведение
 *
 * Триггер открывает список (Reka `Popover`: Esc и клик мимо закрывают, фокус возвращается на триггер); фокус при открытии —
 * на выбранном пункте (`aria-current`), кольцо не встаёт на чужой период. Пункты — кнопки:
 * Tab по пунктам, Enter и пробел выбирают; выбор закрывает список и отдаёт `update:modelValue`. Действие закрывает список
 * и отдаёт `plan`. `PeriodSwitcherItem` годится и вне списка — пункт без нажатия с меткой в слоте `badge` (окно очереди,
 * № 49 `tariffs.md`).
 */

export type PeriodStatus = 'current' | 'planned' | 'draft' | 'archive'
export interface PeriodSwitcherPeriod {
  id: string
  status: PeriodStatus
  /** Начало интервала — `ГГГГ-ММ`. */
  from: string
  /** Последний месяц интервала — `ГГГГ-ММ`; у последнего в очереди и у черновика — `null`. */
  to: string | null
}

/** Подпись статуса — тексты макета `30957:7855`, `31089:12090`. */
export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  current: 'Текущие тарифы',
  planned: 'Запланировано',
  draft: 'Черновик',
  archive: 'Архив',
}

/** Роль точки — варианты `Indicator`. */
export const PERIOD_TONE: Record<PeriodStatus, 'success' | 'default' | 'warning' | 'neutral'> = {
  current: 'success',
  planned: 'default',
  draft: 'warning',
  archive: 'neutral',
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** «апреля 2026» — месяц `ГГГГ-ММ` в родительном падеже. */
export function monthGenitive(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_GEN[(m ?? 1) - 1]} ${y}`
}

/** Срок периода по таблице выше. */
export function periodTerm(p: Pick<PeriodSwitcherPeriod, 'status' | 'from' | 'to'>): string {
  if ((p.status === 'current' || p.status === 'archive') && p.to) return `до ${monthGenitive(p.to)}`
  return `с ${monthGenitive(p.from)}`
}

/** Группы списка: действующие и будущие, архив. */
export function periodGroups<T extends PeriodSwitcherPeriod>(periods: T[]): T[][] {
  const rank: Record<PeriodStatus, number> = { current: 0, planned: 1, draft: 2, archive: 3 }
  const live = periods.filter(p => p.status !== 'archive')
    .sort((a, b) => rank[a.status] - rank[b.status] || a.from.localeCompare(b.from))
  const archive = periods.filter(p => p.status === 'archive').sort((a, b) => b.from.localeCompare(a.from))
  return [live, archive].filter(g => g.length)
}
