export { default as HighlightText } from './HighlightText.vue'

/**
 * Фрагмент текста с подсветкой совпадения — такт 86, ворота оркестратора 2026-10-08 (`docs/scheme-edit.md`, раздел 8,
 * карточка 8). Мастера в ките 1 нет. Эталон поведения — поиск JetBrains (`docs/scheme-edit-review.md`, 3.1): совпавшие
 * фрагменты выделены подложкой, текст вокруг — как был.
 *
 * | что | кит | эталон |
 * |---|---|---|
 * | подложка совпадения | `--search-match` (ступень `--warning-surface`), радиус 2 `--radius-2xs` | JetBrains `SEARCH_MATCH` — светлая жёлтая подложка за фрагментом |
 * | текст совпадения | кегль и начертание строки — наследуются; цвет — `--foreground`: к подложке 14.8:1, серый текст пояснения (`--field-placeholder`) на ней дал бы 4.24:1 | — |
 * | текущее совпадение на странице | `--search-match-current` (ступень `--warning-disabled`) | поиск в редакторе IDE и браузере: текущее плотнее |
 *
 * Роль одна на выдачу и страницу: в строке выдачи совпадение рисует `HighlightText` (`<mark>`), на странице — CSS Custom
 * Highlight API (`highlightMatches` ниже, правила `::highlight(search-match)` и `::highlight(search-match-current)` в
 * `app/assets/css/tailwind.css`): разметку страницы подсветка не трогает (решение 2 оркестратора 2026-10-08). Браузер без
 * API — подсветки текста на странице нет, остальное работает.
 *
 * ## Сопоставление
 *
 * Слово запроса — начало слова в тексте (`разм` в «Размытые»); не нашлось началом — фрагмент с середины слова от трёх знаков
 * (`фото` в «Сфотографируйте»). Регистр и «ё» не важны, знаки препинания — разделители. Порядок слов любой.
 */

/** Буква или цифра — часть слова; остальное разделяет слова. */
const WORD = /[\p{L}\p{N}]/u

/** Нормализация для сопоставления: регистр, «ё» — «е», знаки препинания — пробел. */
export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/** Слова запроса без повторов: «размыт фото» → `['размыт', 'фото']`. */
export function queryWords(query: string): string[] {
  const n = normalizeText(query)
  return n ? [...new Set(n.split(' '))] : []
}

/**
 * Где в тексте совпали слова запроса: пары `[начало, конец)` в индексах исходной строки, без пересечений, по порядку.
 * Слово ищется началом слова; не нашлось — с середины слова, если в нём от трёх знаков.
 */
export function matchRanges(text: string, words: readonly string[]): [number, number][] {
  if (!text || !words.length) return []
  const low = text.toLowerCase().replace(/ё/g, 'е')
  /* Нижний регистр кириллицы и латиницы длину не меняет; иначе индексы разъехались бы — тогда без подсветки. */
  if (low.length !== text.length) return []
  const starts: number[] = []
  for (let i = 0; i < low.length; i++) if (WORD.test(low[i]!) && (i === 0 || !WORD.test(low[i - 1]!))) starts.push(i)
  const found: [number, number][] = []
  for (const w of words) {
    if (!w) continue
    let hit = false
    for (const s of starts) {
      if (low.startsWith(w, s)) { found.push([s, s + w.length]); hit = true }
    }
    if (!hit && w.length >= 3) {
      for (let i = low.indexOf(w); i >= 0; i = low.indexOf(w, i + 1)) found.push([i, i + w.length])
    }
  }
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1])
  const merged: [number, number][] = []
  for (const r of found) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}

/** Текст, разрезанный по совпадениям: части с признаком `hit`. */
export function splitMatches(text: string, ranges: readonly [number, number][]): { text: string, hit: boolean }[] {
  const out: { text: string, hit: boolean }[] = []
  let at = 0
  for (const [a, b] of ranges) {
    if (a > at) out.push({ text: text.slice(at, a), hit: false })
    out.push({ text: text.slice(a, b), hit: true })
    at = b
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false })
  return out
}

/** Подсветки страницы: все совпадения и текущее — имена правил `::highlight()` в `tailwind.css`. */
export const HIGHLIGHT_MATCH = 'search-match'
export const HIGHLIGHT_CURRENT = 'search-match-current'

/** Цель подсветки на странице: узел, в тексте которого ищутся слова; без слов — подсвечивается весь текст узла. */
export interface HighlightTarget {
  el: Element
  /** Текущее совпадение режима «найдено» — подложка плотнее. */
  current?: boolean
  /** Слова запроса; пусто — весь текст узла (режим «Изменено в черновике»: совпадение — сама подпись). */
  words?: readonly string[]
}

type HighlightRegistry = { set: (name: string, value: unknown) => void, delete: (name: string) => void }
const registry = (): HighlightRegistry | null => {
  const css = globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined
  return css?.highlights && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function' ? css.highlights : null
}

/** Браузер умеет CSS Custom Highlight API: без него подсветки текста на странице нет, остальное работает. */
export const highlightSupported = (): boolean => !!registry()

/**
 * Подсветка совпадений на странице — CSS Custom Highlight API: диапазоны по текстовым узлам целей, разметку страницы не
 * трогает. Повторный вызов заменяет прежнюю подсветку. Возвращает число подсвеченных фрагментов — всех и текущих.
 */
export function highlightMatches(targets: readonly HighlightTarget[]): { all: number, current: number } {
  const reg = registry()
  if (!reg) return { all: 0, current: 0 }
  const all: Range[] = []
  const cur: Range[] = []
  for (const t of targets) {
    const walker = document.createTreeWalker(t.el, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const text = node.data
      const ranges: [number, number][] = t.words?.length ? matchRanges(text, t.words) : (text.trim() ? [[text.length - text.trimStart().length, text.trimEnd().length]] : [])
      for (const [a, b] of ranges) {
        const r = document.createRange()
        r.setStart(node, a)
        r.setEnd(node, b)
        ;(t.current ? cur : all).push(r)
      }
    }
  }
  const H = (globalThis as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight
  reg.set(HIGHLIGHT_MATCH, new H(...all))
  reg.set(HIGHLIGHT_CURRENT, new H(...cur))
  return { all: all.length, current: cur.length }
}

/** Снять подсветку совпадений со страницы. */
export function clearMatches(): void {
  const reg = registry()
  if (!reg) return
  reg.delete(HIGHLIGHT_MATCH)
  reg.delete(HIGHLIGHT_CURRENT)
}
