/**
 * Автопроверка покрытия экрана `/free-shoot` — довесок 2 к такту 35, решение владельца 2026-09-23.
 * Оснастка приёмки, не продукт.
 *
 * Правило: каждый видимый элемент с собственной отрисовкой лежит **внутри компонента кита**
 * (`[data-slot]`) или **внутри перенесённого «как есть» блока** (`[data-asis]`). Непомеченный —
 * значит, на экране есть что-то, что не отслеживается ни реестром, ни глазом.
 *
 * Собственная отрисовка: свой текстовый узел, изображение или `svg`, непрозрачный фон или
 * фоновое изображение, видимая рамка, тень. Контейнеры раскладки без отрисовки не считаются.
 *
 * Ближайший помеченный предок решает. Если это `.kit-island` — островок кита внутри блока «как
 * есть», — то элемент в островке, но не в компоненте кита: непомеченный. Внешний блок «как есть»
 * островок не покрывает, иначе обёртка «каркас экрана» закрывала бы собой весь экран.
 *
 * Не считаются: невидимое (`display: none`, `visibility: hidden`, прозрачность 0), элементы
 * меньше 2×2 — служебные визуально скрытые узлы (объявление смены маршрута Nuxt, `sr-only`), —
 * и внутренности `svg`.
 */
export interface CoverageFinding {
  kind: string
  tag: string
  className: string
  text: string
}

export interface CoverageResult {
  checked: number
  findings: CoverageFinding[]
}

/** Все значения оснастки экрана — `naming.md`, «Такт 31», параметры оснастки. */
export const COVERAGE_STATES = [
  '', 'open=assign', 'open=viewer-free', 'open=viewer-assigned', 'open=viewer-locked', 'open=viewer-suggest',
  'open=viewer-flash', 'open=wand', 'open=progress', 'open=hotkeys', 'open=form', 'open=form-group', 'open=form-errors',
  'open=summary', 'open=finish',
  'view=review', 'tab=form', 'state=link', 'state=flash', 'state=tooltip', 'state=drop', 'selected=demo',
] as const

const transparent = (c: string) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c)

/** Чем элемент рисует себя сам; `null` — ничем. */
function paint(el: Element, s: CSSStyleDeclaration): string | null {
  const tag = el.tagName.toLowerCase()
  if (['img', 'svg', 'video', 'canvas'].includes(tag)) return 'изображение'
  if (Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent?.trim())) return 'текст'
  if (!transparent(s.backgroundColor)) return 'фон'
  if (s.backgroundImage && s.backgroundImage !== 'none') return 'фон'
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const w = Number.parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`))
    const style = s.getPropertyValue(`border-${side.toLowerCase()}-style`)
    const color = s.getPropertyValue(`border-${side.toLowerCase()}-color`)
    if (w > 0 && style !== 'none' && !transparent(color)) return 'рамка'
  }
  if (s.boxShadow && s.boxShadow !== 'none' && !/^(rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?)+$/.test(s.boxShadow)) return 'тень'
  return null
}

/** Проверка одного документа — страницы или iframe с ней. */
export function auditCoverage(doc: Document): CoverageResult {
  const win = doc.defaultView!
  const findings: CoverageFinding[] = []
  let checked = 0
  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
    const s = win.getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number.parseFloat(s.opacity) === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const kind = paint(el, s)
    if (!kind) continue
    checked += 1
    const near = el.closest('[data-slot], [data-asis], .kit-island')
    if (near && !near.classList.contains('kit-island')) continue
    findings.push({
      kind,
      tag: el.tagName.toLowerCase(),
      className: String((el as HTMLElement).className ?? '').slice(0, 80),
      text: (el.textContent ?? '').trim().slice(0, 60),
    })
  }
  return { checked, findings }
}
