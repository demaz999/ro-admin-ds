import { parse } from '@vue/compiler-dom'

/**
 * Статическая проверка разметки экрана `/free-shoot` — довесок 1 к такту 35, решение владельца
 * 2026-09-23. Оснастка приёмки, не продукт. Дополняет автопроверку покрытия (`coverage.ts`):
 * та идёт по DOM и не отличает разметку страницы, вложенную в слот компонента, от разметки самого
 * компонента — обе лежат внутри `[data-slot]`. Эта идёт по исходнику страницы.
 *
 * Правило стендов экрана (`naming.md`, «Такт 31»): на странице — только компоненты кита, классы
 * раскладки и блоки «как есть». Вне блоков `data-asis` на странице:
 *
 * - ноль атрибутов `data-slot` — его ставят только компоненты `app/components/ui/`;
 * - ноль классов `text-*`, `bg-*`, `border-*`, `font-*`, `shadow-*`, `ring-*`, `rounded-*` — с любыми
 *   вариантами (`hover:`, `md:`…) и отрицанием;
 * - ноль произвольных значений в квадратных скобках;
 * - ноль встроенных стилей (`style`, `:style`) и `v-html` — ими оформление обходит правило классов.
 *
 * Зона «как есть» — поддерево элемента с `data-asis`: его классы — CSS прототипа. `.kit-island`
 * внутри блока «как есть» возвращает зону проверки: островок — территория кита, как и в `coverage.ts`.
 *
 * Классы из `:class` берутся из выражения — строковые литералы и ключи объекта. Литерал сравнения
 * внутри выражения тоже считается кандидатом в класс: проверка выходит строже нужного.
 * Не видит: классы, приходящие через `v-bind="объект"` без аргумента, и классы, которые возвращает
 * функция (`frameTileGridVariants(...)` — вариант кита, его классы — забота компонента).
 */
export interface MarkupFinding {
  file: string
  line: number
  tag: string
  what: string
  value: string
}

export interface MarkupResult {
  files: string[]
  checked: number
  findings: MarkupFinding[]
}

/** Исходники экрана — все `.vue` в `app/pages/free-shoot/`, кроме стенда матриц. */
const SOURCES = import.meta.glob('../../pages/free-shoot/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const EXCLUDED = new Set(['states.vue'])

const STYLING = /^(?:text|bg|border|font|shadow|ring|rounded)(?:-|$)/

/** Нарушение в одном классе, `null` — класс разрешён. */
function badClass(token: string): string | null {
  if (token.includes('[')) return 'произвольное значение'
  const base = token.split(':').pop()!.replace(/^!/, '').replace(/!$/, '').replace(/^-/, '')
  return STYLING.test(base) ? 'класс оформления' : null
}

/** Кандидаты в классы из выражения `:class`: строковые литералы и ключи объекта. */
function classesOfExpression(exp: string): string[] {
  const out: string[] = []
  for (const m of exp.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push(...m[2]!.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/))
  for (const m of exp.matchAll(/[{,]\s*([A-Za-z_$][\w$-]*)\s*:/g)) out.push(m[1]!)
  return out.filter(Boolean)
}

/* Узлы AST компилятора Vue — только то, чем пользуется проверка. */
interface AstProp {
  type: number
  name: string
  value?: { content: string }
  arg?: { content?: string }
  exp?: { content?: string }
  loc: { start: { line: number } }
}
interface AstNode {
  type: number
  tag?: string
  props?: AstProp[]
  children?: AstNode[]
  loc: { start: { line: number } }
}
const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

const isAttr = (p: AstProp, name: string) => p.type === ATTRIBUTE && p.name === name
const isBind = (p: AstProp, name: string) => p.type === DIRECTIVE && p.name === 'bind' && p.arg?.content === name
const has = (el: AstNode, name: string) => (el.props ?? []).some(p => isAttr(p, name) || isBind(p, name))
const staticClasses = (el: AstNode) => (el.props ?? []).filter(p => isAttr(p, 'class')).flatMap(p => (p.value?.content ?? '').split(/\s+/)).filter(Boolean)

/** Проверка одного исходника `.vue`: разбирается блок `<template>` верхнего уровня. */
export function auditMarkupSource(file: string, source: string): { checked: number, findings: MarkupFinding[] } {
  const open = source.match(/^<template>/m)
  const close = source.lastIndexOf('\n</template>')
  if (!open || open.index === undefined || close < 0) return { checked: 0, findings: [] }
  const start = open.index + open[0].length
  const lineOffset = source.slice(0, start).split('\n').length - 1
  const ast = parse(source.slice(start, close)) as unknown as AstNode

  const findings: MarkupFinding[] = []
  let checked = 0
  const add = (node: { loc: { start: { line: number } } }, tag: string, what: string, value: string) =>
    findings.push({ file, line: node.loc.start.line + lineOffset, tag, what, value })

  function walk(node: AstNode, asis: boolean) {
    if (node.type !== ELEMENT) {
      node.children?.forEach(c => walk(c, asis))
      return
    }
    const tag = node.tag ?? ''
    const inAsis = has(node, 'data-asis') || (asis && !staticClasses(node).includes('kit-island'))
    if (!inAsis) {
      checked += 1
      for (const p of node.props ?? []) {
        if (isAttr(p, 'data-slot') || isBind(p, 'data-slot')) add(p, tag, 'data-slot на странице', p.value?.content ?? p.exp?.content ?? '')
        if (isAttr(p, 'style') || isBind(p, 'style')) add(p, tag, 'встроенный стиль', p.value?.content ?? p.exp?.content ?? '')
        if (p.type === DIRECTIVE && p.name === 'html') add(p, tag, 'v-html', p.exp?.content ?? '')
        const classes = isAttr(p, 'class')
          ? (p.value?.content ?? '').split(/\s+/).filter(Boolean)
          : isBind(p, 'class') ? classesOfExpression(p.exp?.content ?? '') : []
        for (const c of classes) {
          const bad = badClass(c)
          if (bad) add(p, tag, bad, c)
        }
      }
    }
    node.children?.forEach(c => walk(c, inAsis))
  }
  walk(ast, false)
  return { checked, findings }
}

/** Проверка всех исходников экрана. */
export function auditMarkup(): MarkupResult {
  const files: string[] = []
  const findings: MarkupFinding[] = []
  let checked = 0
  for (const [path, source] of Object.entries(SOURCES).sort()) {
    const file = path.split('/').pop()!
    if (EXCLUDED.has(file)) continue
    files.push(`app/pages/free-shoot/${file}`)
    const r = auditMarkupSource(file, source)
    checked += r.checked
    findings.push(...r.findings)
  }
  return { files, checked, findings }
}

/**
 * Контрольный образец — проверка не слепая: в нём пять нарушений, и все пять обязаны найтись.
 * Класс оформления в слоте компонента внутри островка, `data-slot` страницы, произвольное значение,
 * класс из `:class`, встроенный стиль; разрешённые — раскладка и всё внутри блока «как есть».
 */
export const MARKUP_CONTROL = {
  expected: 5,
  source: `<template>
  <div class="flex gap-4">
    <div class="topbar" data-asis="шапка">
      <b class="text-sm bg-muted">как есть — разрешено</b>
      <span class="kit-island">
        <ModalCardBody class="flex flex-col gap-6">
          <p class="text-sm">класс оформления в слоте</p>
          <span data-slot="page-made">самоназванный слот</span>
          <span class="w-[13px]">произвольное значение</span>
        </ModalCardBody>
      </span>
    </div>
    <div :class="{ 'hover:bg-muted': on, grow: true }" />
    <div style="color: red" />
  </div>
</template>
`,
}
