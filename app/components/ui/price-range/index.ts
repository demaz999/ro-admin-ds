import { groupDigits } from '../regress-scale/rules'

export { default as PriceRange } from './PriceRange.vue'

/**
 * Вилка цен — такт 80, ворота оркестратора 2026-10-04 (`docs/tariffs.md`, раздел 8, карточка 4; слияние с
 * `ProgressCounter` — нет: роль счётчика прогресса другая). Термин сводки — «вилка цен» (§11). Мастера в ките 1 нет:
 * источник вида — фреймы макета страницы тарификации (файл `U829JoK7KMZV8do3KNkWBh`).
 *
 * Роль — показ цены или диапазона цен с подписью. Значения приходят числами, формат — внутри компонента: потребитель не
 * собирает строку «от … до …» сам.
 *
 * ## Формат — `docs/tariffs.md`, 6.5
 *
 * | `min` | `max` | `layout="prefixed"` | `layout="dash"` |
 * |---|---|---|---|
 * | X | Y, Y ≠ X | «от X ₽ до Y ₽» | «X–Y ₽» |
 * | X | X | «X ₽» | «X ₽» |
 * | X | `null` | «от X ₽» | «от X ₽» |
 * | `null` | Y | «до Y ₽» | «до Y ₽» |
 * | `null` | `null` | «—» | «—» |
 *
 * `min` больше `max` — значения меняются местами. Разряды — неразрывным пробелом (`groupDigits` правил шкалы, такт 78).
 *
 * ## Вид
 *
 * | часть | кит | макет |
 * |---|---|---|
 * | подпись (`label`) | 15/20 regular, `--foreground` на ступени `--opacity-on-tone` | «Вилка цен» 15/20 `fg/secondary` (`30875:127825`) |
 * | предлоги «от», «до» | 15/20 medium, тот же тон | 15/20 Medium `fg/secondary` |
 * | суммы | 15/20 medium `--foreground` | 15/20 Medium `fg/primary` |
 * | значение `dash` | 15/20 regular `--foreground` | «3 500–4 500 ₽» 15/20 (`30875:127816`) |
 * | пояснение (`note`) | 12/16, тон подписи, через «·» | «· наследуется схемами без индивидуальной цены» 12/16 (`30875:127817`) |
 * | зазоры | подпись → значение и сумма → предлог 20 у `prefixed`; 8 у `dash`; предлог → сумма 4 | `30875:127825`: 20 и 4 |
 * | размер `sm` | 13/16 у подписи, предлогов и сумм | строки списков в панелях (`30959:25660` — 14/20, в шкале кита 13/16) |
 *
 * Второстепенный текст — `--foreground` на ступени `--opacity-on-tone` (правило такта 50): вилка стоит и на белой карточке
 * группы, и на тонированной строке схемы, тон подстраивается под подложку. Серый `--muted-foreground` из карточки 4 на тоне
 * не ставится.
 *
 * Состояний нет: вилка — текст, не контрол.
 */

/** Значения вилки по порядку: меньшее — первым. */
export function rangeBounds(min: number | null | undefined, max: number | null | undefined) {
  const a = min ?? null
  const b = max ?? null
  return a != null && b != null && a > b ? { min: b, max: a } : { min: a, max: b }
}

/** Вид вилки по 6.5: `range` — две разные суммы; `single` — одна; `from`, `to` — одна граница; `none` — цены нет. */
export type PriceRangeKind = 'range' | 'single' | 'from' | 'to' | 'none'

export function rangeKind(min: number | null | undefined, max: number | null | undefined): PriceRangeKind {
  const r = rangeBounds(min, max)
  if (r.min == null && r.max == null) return 'none'
  if (r.max == null) return 'from'
  if (r.min == null) return 'to'
  return r.min === r.max ? 'single' : 'range'
}

/** Сумма с единицей: «50 000 ₽» — разряды неразрывным пробелом. */
export const formatPrice = (n: number, unit = '₽') => `${groupDigits(n)} ${unit}`

/** Вилка одной строкой — для подписи для чтения с экрана и для потребителей вне разметки (уведомления). */
export function formatPriceRange(min: number | null | undefined, max: number | null | undefined, layout: 'prefixed' | 'dash' = 'prefixed', unit = '₽'): string {
  const r = rangeBounds(min, max)
  switch (rangeKind(min, max)) {
    case 'none': return '—'
    case 'single': return formatPrice(r.min!, unit)
    case 'from': return `от ${formatPrice(r.min!, unit)}`
    case 'to': return `до ${formatPrice(r.max!, unit)}`
    default: return layout === 'dash'
      ? `${groupDigits(r.min!)}–${formatPrice(r.max!, unit)}`
      : `от ${formatPrice(r.min!, unit)} до ${formatPrice(r.max!, unit)}`
  }
}
