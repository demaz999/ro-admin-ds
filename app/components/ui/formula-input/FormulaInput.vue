<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у поля формулы нет нигде (мастера нет).
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import type { FormulaVariable } from '.'
import { computed, h, onBeforeUnmount, onMounted, ref, render, watch } from 'vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'
import { READONLY_SURFACE, useReadonly } from '../field'
import { Icon } from '../icon'
import { SelectContent, SelectGroup, SelectItem } from '../select'
import { FORMULA_TOKEN, hasFormulaToken } from '.'

/**
 * Поле формулы: свободный текст с переменными-чипами. Значение — строка с `{Группа:ключ}`. Разбор — `index.ts`.
 *
 * Пример: `<FormulaInput v-model="formula" :variables="variables" label="Имя zip-архива" />`
 */
const props = withDefaults(defineProps<{
  variables?: FormulaVariable[]
  /** Подпись кнопки вставки. */
  addLabel?: string
  placeholder?: string
  /** Имя поля для чтения с экрана. */
  label?: string
  invalid?: boolean
  disabled?: boolean
  /**
   * Только чтение — своё либо от `Field readonly` (такт 68): область не редактируется, но фокусируема и выделяется;
   * кнопки «Переменная» и крестиков у чипов нет. Разбор — `ui/field/index.ts`, «Ось readonly».
   */
  readonly?: boolean
  class?: string
}>(), { variables: () => [], addLabel: 'Переменная', placeholder: '', label: '', invalid: false, disabled: false, readonly: false })

const ro = useReadonly(() => props.readonly, () => props.disabled)

const model = defineModel<string>({ default: '' })

const editor = ref<HTMLElement | null>(null)
const empty = ref(true)
const open = ref(false)

/** Группы списка вставки — в порядке первого появления. */
const groups = computed(() => {
  const out: { header: string, items: FormulaVariable[] }[] = []
  for (const v of props.variables) {
    const header = v.group ?? ''
    let g = out.find(x => x.header === header)
    if (!g) out.push(g = { header, items: [] })
    g.items.push(v)
  }
  return out
})

/* ------------------------------ узлы области ------------------------------ */
const CHIP = 'mx-px inline-flex h-6 items-center gap-1 rounded-full bg-secondary pr-1.5 pl-3 align-middle text-2xs font-bold text-primary select-none'
const CHIP_INVALID = 'mx-px inline-flex h-6 items-center gap-1 rounded-full bg-destructive-surface pr-1.5 pl-3 align-middle text-2xs font-bold text-destructive-strong select-none'
/* Крестик чипа в «только чтении» не рисуется: чипы строятся в обход шаблона, поэтому прячет их атрибут корня. */
const CHIP_REMOVE = 'flex size-3 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:opacity-[var(--opacity-icon-muted)] group-data-[readonly]/formula:hidden'

const isChip = (n: Node | null | undefined): n is HTMLElement => !!n && n.nodeType === 1 && (n as HTMLElement).dataset.slot === 'formula-chip'

function makeChip(key: string): HTMLElement {
  const known = props.variables.find(v => v.value === key)
  const chip = document.createElement('span')
  chip.contentEditable = 'false'
  chip.dataset.slot = 'formula-chip'
  chip.dataset.var = key
  if (!known) chip.dataset.invalid = ''
  chip.className = known ? CHIP : CHIP_INVALID
  chip.title = known ? `{${key}}` : `Неизвестная переменная {${key}}`
  const text = document.createElement('span')
  text.dataset.slot = 'formula-chip-label'
  text.textContent = known?.label ?? key
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.tabIndex = -1
  remove.dataset.slot = 'formula-chip-remove'
  remove.className = CHIP_REMOVE
  remove.setAttribute('aria-label', `Убрать переменную: ${known?.label ?? key}`)
  render(h(Icon, { name: 'close', size: 8 }), remove)
  chip.append(text, remove)
  return chip
}

/** Строка формулы — в узлы: текст и чипы. */
function toNodes(value: string): Node[] {
  const out: Node[] = []
  let last = 0
  for (const m of value.matchAll(FORMULA_TOKEN)) {
    if (m.index! > last) out.push(document.createTextNode(value.slice(last, m.index)))
    out.push(makeChip(m[1]!))
    last = m.index! + m[0].length
  }
  if (last < value.length) out.push(document.createTextNode(value.slice(last)))
  return out
}

/** Узлы области — в строку формулы. */
function serialize(): string {
  const el = editor.value
  if (!el) return model.value
  let out = ''
  for (const n of Array.from(el.childNodes)) {
    if (isChip(n)) out += `{${n.dataset.var}}`
    else if (n.nodeType === 3) out += (n.textContent ?? '').replace(/ /g, ' ')
  }
  return out
}

function rebuild(value: string) {
  const el = editor.value
  if (!el) return
  el.replaceChildren(...toNodes(value))
  empty.value = value === ''
}

function commit() {
  const value = serialize()
  empty.value = value === ''
  if (value !== model.value) model.value = value
}

/* ------------------------------ курсор ------------------------------ */
function caret(): Range | null {
  const sel = window.getSelection()
  const el = editor.value
  if (!sel || !sel.rangeCount || !el) return null
  const r = sel.getRangeAt(0)
  return el.contains(r.startContainer) ? r : null
}
function setCaret(node: Node, offset: number) {
  const sel = window.getSelection()
  if (!sel) return
  const r = document.createRange()
  r.setStart(node, offset)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
}
const indexOf = (n: Node) => Array.from(n.parentNode!.childNodes).indexOf(n as ChildNode)

/** Сосед курсора слева (`-1`) или справа (`1`): чип либо `null`. Пустые текстовые узлы пропускаются. */
function neighbour(dir: -1 | 1): HTMLElement | null {
  const r = caret()
  const el = editor.value
  if (!r || !el || !r.collapsed) return null
  let node: Node | null
  if (r.startContainer === el) node = el.childNodes[dir < 0 ? r.startOffset - 1 : r.startOffset] ?? null
  else if (r.startContainer.nodeType === 3 && r.startContainer.parentNode === el) {
    const len = r.startContainer.textContent?.length ?? 0
    if (dir < 0 ? r.startOffset > 0 : r.startOffset < len) return null
    node = dir < 0 ? r.startContainer.previousSibling : r.startContainer.nextSibling
  }
  else return null
  while (node && node.nodeType === 3 && !node.textContent) node = dir < 0 ? node.previousSibling : node.nextSibling
  return isChip(node) ? node : null
}

let lastRange: Range | null = null
function rememberCaret() {
  const r = caret()
  if (r) lastRange = r.cloneRange()
}

/* ------------------------------ правка ------------------------------ */
/**
 * Вставка в место курсора. `remembered` — вставка кнопкой «Переменная»: фокус уходил в список, и браузер при
 * возврате ставит курсор в начало области — место берётся из запомненного положения.
 */
function insertNodes(nodes: Node[], remembered = false) {
  const el = editor.value
  if (!el || !nodes.length) return
  const last0 = lastRange && el.contains(lastRange.startContainer) ? lastRange : null
  let r = remembered ? last0 : (caret() ?? last0)
  if (!r) { r = document.createRange(); r.selectNodeContents(el); r.collapse(false) }
  r.deleteContents()
  const frag = document.createDocumentFragment()
  frag.append(...nodes)
  const last = nodes[nodes.length - 1]!
  r.insertNode(frag)
  el.normalize()
  if (last.parentNode === el) setCaret(el, indexOf(last) + 1)
  else { const end = document.createRange(); end.selectNodeContents(el); end.collapse(false); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(end) }
  rememberCaret()
  commit()
}

function insertVariable(key: string) {
  open.value = false
  editor.value?.focus()
  insertNodes([makeChip(key)], true)
}

function removeChip(chip: HTMLElement) {
  const el = editor.value!
  const at = indexOf(chip)
  chip.remove()
  el.normalize()
  el.focus()
  setCaret(el, Math.min(at, el.childNodes.length))
  /* После слияния текстовых узлов курсор встаёт на стык: позиция считается по длине левой части. */
  commit()
}

/** Набранный руками `{Группа:ключ}` превращается в чип. */
function convertTyped() {
  const el = editor.value
  if (!el) return
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType !== 3) continue
    const text = n.textContent ?? ''
    if (!hasFormulaToken(text)) continue
    const nodes = toNodes(text)
    const lastChip = [...nodes].reverse().find(isChip)
    if (!lastChip) continue
    n.replaceWith(...nodes)
    setCaret(el, indexOf(lastChip) + 1)
  }
}

function onInput() {
  convertTyped()
  commit()
  rememberCaret()
}

function onKeydown(event: KeyboardEvent) {
  if (ro.value) return
  const el = editor.value!
  if (event.key === 'Enter') { event.preventDefault(); return }
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key === 'Backspace' || event.key === 'Delete') {
    const chip = neighbour(event.key === 'Backspace' ? -1 : 1)
    if (!chip) return
    event.preventDefault()
    removeChip(chip)
  }
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const dir = event.key === 'ArrowLeft' ? -1 : 1
    const chip = neighbour(dir)
    if (!chip) return
    event.preventDefault()
    setCaret(el, indexOf(chip) + (dir < 0 ? 0 : 1))
    rememberCaret()
  }
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  if (ro.value) return
  const text = (event.clipboardData?.getData('text/plain') ?? '').replace(/\s*\r?\n\s*/g, ' ')
  if (text) insertNodes(toNodes(text))
}

function onClick(event: MouseEvent) {
  const remove = (event.target as HTMLElement).closest?.('[data-slot=formula-chip-remove]')
  const chip = remove?.closest('[data-slot=formula-chip]') as HTMLElement | null
  if (chip && !props.disabled && !ro.value) { event.preventDefault(); removeChip(chip) }
  else rememberCaret()
}

onMounted(() => rebuild(model.value))
/* Значение пришло снаружи — область перестраивается; собственная правка совпадает со значением и узлы не трогает. */
watch(model, (value) => { if (value !== serialize()) rebuild(value) })
/* Список переменных сменился — известность чипов пересчитывается. */
watch(() => props.variables, () => rebuild(serialize()), { deep: true })
onBeforeUnmount(() => { editor.value?.querySelectorAll('[data-slot=formula-chip-remove]').forEach(b => render(null, b)) })
</script>

<template>
  <div
    data-slot="formula-input"
    :data-invalid="props.invalid ? '' : undefined"
    :data-disabled="props.disabled ? '' : undefined"
    :data-readonly="ro ? '' : undefined"
    :class="cn(
      'group/formula flex min-h-10 w-full items-start gap-1 rounded-md p-2 transition-colors',
      ro ? READONLY_SURFACE : 'focus-within:ring-2 focus-within:ring-ring',
      ro ? '' : props.invalid ? 'bg-field-error' : 'bg-field hover:bg-field-hover',
      props.disabled ? 'pointer-events-none opacity-[var(--opacity-disabled)]' : '',
      props.class,
    )"
    :style="{ transitionDuration: 'var(--duration-hover)' }"
  >
    <!-- Редактируемая область: узлы внутри строит компонент, шаблон их не описывает. Перенос длинной формулы — по ширине. -->
    <div
      ref="editor"
      data-slot="formula-editor"
      role="textbox"
      aria-multiline="false"
      :aria-label="props.label || undefined"
      :aria-invalid="props.invalid || undefined"
      :aria-readonly="ro ? 'true' : undefined"
      :tabindex="ro ? 0 : undefined"
      :contenteditable="props.disabled || ro ? 'false' : 'true'"
      spellcheck="false"
      :data-empty="empty ? '' : undefined"
      :data-placeholder="props.placeholder"
      class="min-h-6 min-w-0 flex-1 px-2 text-sm leading-6 font-medium break-words whitespace-pre-wrap outline-none data-[empty]:before:pointer-events-none data-[empty]:before:text-field-placeholder data-[empty]:before:content-[attr(data-placeholder)]"
      :class="ro ? 'text-foreground' : 'text-field-foreground'"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
      @click="onClick"
      @keyup="rememberCaret"
      @blur="rememberCaret"
    />

    <PopoverRoot v-if="!ro" v-model:open="open">
      <PopoverTrigger as-child>
        <button
          type="button"
          data-slot="formula-add"
          :disabled="props.disabled"
          class="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-foreground-secondary pr-3 pl-1.5 text-2xs font-bold text-foreground-secondary outline-none transition-colors hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          :style="{ transitionDuration: 'var(--duration-hover)' }"
        >
          <!--
            Такт 98, решение владельца 2026-10-09: плюс тоньше — глиф 10.5 в прежнем боксе 12 (`scale` 0.875), штрих 1.5 против
            1.71: ближе к основному штриху букв подписи 12/16 bold. Раскладка кнопки прежняя. Строка реестра `scheme-edit.md`, раздел 11.
          -->
          <Icon name="add" :size="12" :scale="0.875" />
          {{ props.addLabel }}
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent as-child align="end" :side-offset="4">
          <SelectContent data-formula-variables>
            <SelectGroup v-for="g in groups" :key="g.header" :header="g.header">
              <SelectItem
                v-for="v in g.items"
                :key="v.value"
                role="option"
                tabindex="0"
                :data-var="v.value"
                :subtitle="`{${v.value}}`"
                class="cursor-pointer outline-none focus-visible:bg-list-hover"
                @click="insertVariable(v.value)"
                @keydown.enter.prevent="insertVariable(v.value)"
              >
                {{ v.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
