import { nextTick, onBeforeUnmount, ref } from 'vue'

/**
 * Перестановка строк ручкой — такт 70, решение 3 оркестратора: один механизм на таблицу шагов и таблицу полей «Формы».
 * Ручка — `IconButton` с глифом `drag` в первой колонке строки (макет `32765:6653`, `32765:5659`).
 *
 * **Мышью.** Нажатие на ручку начинает протяжку; пока кнопка зажата, строка переезжает живьём — порядок строится по
 * середине соседних строк под указателем, номер «№» идёт за ним. Отпускание отдаёт модели одну перестановку — запись
 * автосохранением; Esc отменяет протяжку. Движение и отпускание слушает окно: строка, которую Vue переставляет в DOM,
 * теряет захват указателя.
 *
 * **С клавиатуры** (решение агента по правилу 21, строка 129 реестра расхождений): ручка в фокусе, Alt+↑ и Alt+↓
 * переставляют строку на одну позицию; фокус остаётся на ручке переехавшей строки.
 *
 * Разметка страницы: таблица несёт `data-reorder-list`, строка — `data-reorder-id`, ручка — `data-reorder-handle`.
 * Модель DOM не знает: страница отдаёт ей `commit(list, id, to)` — индекс с нуля.
 */
export interface ReorderDrag { list: string, id: string, order: string[], from: number }

export function useReorder(commit: (list: string, id: string, to: number) => unknown) {
  const drag = ref<ReorderDrag | null>(null)

  /** Строки в порядке протяжки: у таблицы, где идёт протяжка, — предварительный порядок, у прочих — как есть. */
  function ordered<T extends { id: string }>(list: string, items: readonly T[]): T[] {
    const d = drag.value
    if (!d || d.list !== list) return [...items]
    const byId = new Map(items.map(x => [x.id, x]))
    const out = d.order.map(id => byId.get(id)).filter((x): x is T => !!x)
    return out.length === items.length ? out : [...items]
  }

  const rows = (list: string) => [...document.querySelectorAll<HTMLElement>(`[data-reorder-list="${list}"] [data-reorder-id]`)]

  function move(e: PointerEvent) {
    const d = drag.value
    if (!d) return
    let at = 0
    for (const r of rows(d.list)) {
      if (r.dataset.reorderId === d.id) continue
      const b = r.getBoundingClientRect()
      if (e.clientY > b.top + b.height / 2) at++
    }
    if (d.order.indexOf(d.id) === at) return
    const order = d.order.filter(x => x !== d.id)
    order.splice(at, 0, d.id)
    d.order = order
  }
  function stop() {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', drop)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', onEscape, true)
  }
  function drop() {
    const d = drag.value
    stop()
    drag.value = null
    if (!d) return
    const to = d.order.indexOf(d.id)
    if (to !== d.from) commit(d.list, d.id, to)
  }
  function cancel() {
    stop()
    drag.value = null
  }
  function onEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    cancel()
  }

  /** Нажатие на ручку: `ids` — порядок строк таблицы до протяжки. */
  function start(e: PointerEvent, list: string, id: string, ids: readonly string[]) {
    if (e.button !== 0 || drag.value) return
    /* Без этого браузер выделяет текст строк, через которые идёт указатель. */
    e.preventDefault()
    drag.value = { list, id, order: [...ids], from: ids.indexOf(id) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', drop)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onEscape, true)
  }

  /** Alt+↑ и Alt+↓ на ручке в фокусе. */
  async function key(e: KeyboardEvent, list: string, id: string, ids: readonly string[]) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const to = ids.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1)
    if (to < 0 || to >= ids.length) return
    commit(list, id, to)
    await nextTick()
    document.querySelector<HTMLElement>(`[data-reorder-list="${list}"] [data-reorder-handle="${id}"]`)?.focus()
  }

  onBeforeUnmount(stop)
  return { drag, ordered, start, key }
}
