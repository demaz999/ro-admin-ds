/**
 * Правила ступеней регресс-шкалы — сводка `docs/sources/tariffs/spec.md`, §5; модель — `docs/tariffs.md`, 6.2. Чистые
 * функции без Vue: ими пользуется `RegressScale` и модель страницы (`app/stands/tariffs/model.ts`). Такт 78.
 *
 * | Правило §5 | Функция |
 * |---|---|
 * | шкала покрывает диапазон от 1 до бесконечности; первая ступень с 1; «От» следующих — предыдущее «До» + 1 | `chainSteps` |
 * | «До» последней пустое — бесконечность; новая ступень появляется, когда заполняют «До» у последней | `setStepTo` |
 * | удаление: единственную не удалить; средняя — «От» следующей пересчитывается; последняя — «До» предыдущей очищается | `removeStep` |
 * | две формы: «Единая цена» и «По ролям»; смена формы переносит цены | `changeForm`, `setStepPrice` |
 * | «До» меньше «От» — ошибка поля (сводка молчит: строка 50 реестра `tariffs.md`) | `stepErrors` |
 */

/** Цена ступени — пара «клиент / не клиент» (§1); в форме «Единая цена» обе цены равны, пара связана. */
export interface ScalePrice { client: number | null, nonClient: number | null, linked: boolean }
/** Ступень: «От» вычисляется, «До» последней — `null` (бесконечность). */
export interface RegressStep { from: number, to: number | null, price: ScalePrice }
/** Форма шкалы: «Единая цена» (От · До · Цена) или «По ролям» (От · До · Клиент · Не клиент). */
export type ScaleForm = 'single' | 'roles'

/** Цена новой ступени — пустая и связанная (новая пара создаётся связанной, строка 51 реестра). */
export const emptyPrice = (): ScalePrice => ({ client: null, nonClient: null, linked: true })

/** «От» каждой ступени: первая — 1, следующие — предыдущее «До» + 1; у пустого «До» в середине — «От» предыдущей + 1. */
export function chainSteps(steps: RegressStep[]): RegressStep[] {
  const out: RegressStep[] = []
  steps.forEach((s, k) => {
    const prev = out[k - 1]
    out.push({ ...s, price: { ...s.price }, from: prev ? (prev.to ?? prev.from) + 1 : 1 })
  })
  return out
}

/** Ввод «До» ступени `k`. Заполненное «До» у последней рождает новую ступень: «От» = «До» + 1, «До» и цена пустые. */
export function setStepTo(steps: RegressStep[], k: number, to: number | null): RegressStep[] {
  const next = steps.map(s => ({ ...s, price: { ...s.price } }))
  if (!next[k]) return chainSteps(next)
  next[k]!.to = to
  if (k === next.length - 1 && to != null) next.push({ from: 0, to: null, price: emptyPrice() })
  return chainSteps(next)
}

/** Удаление ступени `k`. Единственную ступень не удалить; у последней после удаления «До» пустое — бесконечность. */
export function removeStep(steps: RegressStep[], k: number): RegressStep[] {
  if (steps.length <= 1 || !steps[k]) return chainSteps(steps)
  const next = steps.filter((_, i) => i !== k).map(s => ({ ...s, price: { ...s.price } }))
  if (k === steps.length - 1) next[next.length - 1]!.to = null
  return chainSteps(next)
}

/** Цена ступени `k`. В форме «Единая цена» берётся цена клиента: обе цены равны, пара связана. */
export function setStepPrice(steps: RegressStep[], k: number, price: ScalePrice, form: ScaleForm): RegressStep[] {
  return chainSteps(steps.map((s, i) => (i !== k
    ? s
    : { ...s, price: form === 'single' ? { client: price.client, nonClient: price.client, linked: true } : { ...price } })))
}

/**
 * Смена формы (6.2, строка 09 реестра): «Единая цена» → «По ролям» — пара связана, обе цены равны цене ступени;
 * «По ролям» → «Единая цена» — берётся цена клиента. Обе стороны сводятся к одной записи: цена клиента, пара связана.
 */
export function changeForm(steps: RegressStep[]): RegressStep[] {
  return chainSteps(steps.map(s => ({ ...s, price: { client: s.price.client, nonClient: s.price.client, linked: true } })))
}

/** Разряды неразрывным пробелом — как в полях цены. */
export const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/**
 * Ошибки «До» по ступеням: «До» меньше «От» — «Не меньше <От>»; пустое «До» не у последней ступени — «Заполните «До»»
 * (пустым «До» бывает только у последней — §5).
 */
export function stepErrors(steps: RegressStep[]): (string | null)[] {
  return steps.map((s, k) => {
    if (s.to == null) return k < steps.length - 1 ? 'Заполните «До»' : null
    return s.to < s.from ? `Не меньше ${groupDigits(s.from)}` : null
  })
}
