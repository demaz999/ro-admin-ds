<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { AssignBound } from '@/components/ui/assign'
import { frameTileGridVariants, type FrameTileState } from '@/components/ui/frame-tile'
import type { StepThumbItem, StepVerdict } from '@/components/ui/step-row'
import AsisMarks from '~/stands/free-shoot/AsisMarks.vue'
import proto from '~/stands/free-shoot/prototype-data.json'

/**
 * Экран «Распределение свободной съёмки» (VA-9265) — такт 31, решение владельца 2026-09-23.
 *
 * Собран целиком. Где элемент экрана покрывается компонентом кита — существующим или
 * новым такта 30, — стоит компонент кита. Всё остальное перенесено из прототипа v17
 * **как есть**: его разметка и его CSS (`~/stands/free-shoot/asis.css`), без подгонки под
 * токены, — чтобы на глаз было видно, что ещё не закрыто. Каждый перенесённый блок несёт
 * `data-asis="<имя>"`; реестр покрытия — `docs/free-shoot.md`, раздел 8.
 *
 * Компонент кита внутри перенесённого блока стоит в `.kit-island` — островке, который
 * сбрасывает шрифт и цвет прототипа (правило в `asis.css`).
 *
 * ## Данные
 *
 * `~/stands/free-shoot/prototype-data.json` снят с обезличенного прототипа
 * (`docs/sources/va-9265/`) функциями самого прототипа: `A` — набор «Частично проверен»
 * (7 замороженных шагов, 1 «Повторить», привязанные ранее и отклонённые кадры), `B` — тот
 * же набор после полного автораспределения (режим приёмки); `html` — разметка окон,
 * отрисованная прототипом. Изображения — демо-кадры `public/free-shoot/`.
 *
 * ## Бизнес-логики нет
 *
 * Прецедент стендов: перетаскивание, клавиатура, автораспределение, отмена, автосохранение
 * не реализованы. Работает то, что несёт сам компонент кита (наведение, отметка выделения),
 * и переключатели вида — размер превью, «Разобранные», вкладки панели.
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | `?state=link` | связь шага и кадров: кадры шага подсвечены, остальные приглушены (§15.1–15.2) |
 * | `?state=flash` | вспышка шага и обводка миниатюры после «Показать в структуре» (§15.3) |
 * | `?state=tooltip` | подсказка названия шага на плашке кадра (§15.4) |
 * | `?state=drop` | цель приёма перетаскивания и перетаскиваемые кадры (§9.5) |
 * | `?selected=demo` | выделение пяти кадров и панель выделения (§10.2) |
 * | `?open=assign` | панель выделения и поповер «Назначить на шаг», текущий объект (§10.3); с такта 33 поповер и пункты — кит (`Popover`, `SelectContent`, `SelectGroup`, `AssignOption`) |
 * | `?open=viewer-free` / `viewer-assigned` / `viewer-locked` / `viewer-suggest` | полноэкранный просмотр, четыре состояния нижней плашки (§11.2); с такта 33 список шагов — кит (`StageSection`, `AssignOption`), с такта 34 весь просмотр — кит (`Lightbox` со слотом `aside`, `FrameStage`, `FrameBindBar`, `FrameMeta`) |
 * | `?open=viewer-flash` | просмотр привязанного кадра со вспышкой «Распределено» по кругу — вспышка длится 820 мс, снимок её застаёт (§11.3), такт 34 |
 * | `?open=wand` | окно запуска автораспределения (§12.1–12.4) |
 * | `?open=progress` | окно прогресса автораспределения (§12.5) |
 * | `?open=summary` | сводка результата автораспределения (§12.12) |
 * | `?open=finish` | сводка завершения распределения (§17.4) |
 * | `?view=review` | режим приёмки: полоса приёмки, предложенные объекты и кадры (§13) |
 * | `?tab=form` | вкладка «Форма осмотра» (§7) |
 * | `?asis=mark` | пунктир и подпись вокруг каждого перенесённого блока |
 */
definePageMeta({ layout: false })
useHead({ title: 'Распределение свободной съёмки — экран' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')
const state = q('state')
const openWin = q('open')
const view = q('view')
const asisMark = q('asis') === 'mark'

/* eslint-disable @typescript-eslint/no-explicit-any */
const P = proto as any
const D = view === 'review' ? P.B : P.A
const H = P.html
const STAGES: any[] = P.stages
const stageById: Record<string, any> = Object.fromEntries(STAGES.map(s => [s.id, s]))

/** Демо-кадр по индексу кадра прототипа: 24 снимка по кругу. */
const img = (i: number) => `/free-shoot/demo-${String(((i - 1) % 24) + 1).padStart(2, '0')}.jpg`

const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100
  const k = n % 10
  return `${n} ${m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c}`
}

const O = (id: string | null) => D.objects.find((o: any) => o.id === id) ?? null
const ownerStage = (owner: string) => (O(owner) ? stageById[O(owner).stageId] : stageById[owner])
const objName = (o: any) => (o.stageId === 'eq' ? (o.form.mark || 'Объект без названия') : (o.form.no || 'Здание без названия'))
const objSub = (o: any) => (o.stageId === 'eq'
  ? [o.form.sn ? `зав. № ${o.form.sn}` : '', o.form.inv ? `инв. ${o.form.inv}` : '', o.form.bld, o.form.use].filter(Boolean).join(' · ')
  : [o.form.purpose, o.form.cond, o.form.heat].filter(Boolean).join(' · '))
const verdictOf = (o: string, s: string) => D.review[`${o}|${s}`] ?? null
const isFrozen = (o: string, s: string) => verdictOf(o, s)?.v === 'ok'
const framesIn = (o: string, s: string) => D.frames.filter((f: any) => f.objId === o && f.stepId === s)
const isMedia = (f: any) => f.type !== 'voice'
const frameWhy = (f: any) => (f.rej ? 'Кадр отклонён проверяющим' : f.origin === 'step' ? 'Кадр снят прямо в шаге при обычном осмотре' : 'Кадр в проверенном шаге')

const eqId: string = D.objects.find((o: any) => o.stageId === 'eq')?.id
const cur = ref<string | null>(openWin === 'assign' ? P.selectCur : D.cur)
/** Раскрытые повторы. У прототипа после загрузки свёрнуты все — здесь раскрыт один, чтобы строки шагов были видны. */
const firstAuto = D.objects.find((o: any) => o.auto && o.stageId === 'eq')?.id
const openObjs = ref(new Set<string>([view === 'review' ? firstAuto : eqId].filter(Boolean)))

/* ------------------------------- оснастка ------------------------------- */
const LINK = { owner: eqId, step: 'e3' }
const selected = ref(new Set<number>(
  state === 'drop' || openWin === 'assign' || q('selected') === 'demo' ? P.selected : [],
))
const showSelbar = openWin === 'assign' || q('selected') === 'demo'
const flashNonce = ref<number | null>(null)

/* --------------------------------- лента --------------------------------- */
const size = ref<'md' | 'lg'>('md')
const mode = ref<'keep' | 'hide'>('keep')
const search = ref('')
const tab = ref(q('tab') === 'form' ? 'form' : 'scheme')

const feed = computed(() => D.frames.filter((f: any) => {
  if (isMedia(f) && f.origin === 'step') return false
  if (mode.value === 'hide' && isMedia(f) && f.objId) return false
  return true
}))
const linkedSet = computed(() => new Set(state === 'link' ? framesIn(LINK.owner, LINK.step).map((f: any) => f.i) : []))

function tileState(f: any): FrameTileState {
  if (!f.objId) return 'free'
  if (f.rej) return 'rejected'
  if (f.lock) return 'locked'
  if (f.auto) return 'suggested'
  return 'assigned'
}
function tileProps(f: any) {
  const st = f.objId ? ownerStage(f.objId).steps.find((s: any) => s.id === f.stepId) : null
  const owner = f.objId ? (O(f.objId) ? objName(O(f.objId)) : ownerStage(f.objId).title) : ''
  const s = tileState(f)
  return {
    src: img(f.i),
    alt: f.n,
    time: f.t,
    kind: f.type === 'video' ? 'video' as const : 'photo' as const,
    duration: f.dur ?? '',
    state: s,
    stepName: st?.n ?? '',
    locateHint: st ? `${owner} · ${st.n}` : '',
    lockReason: s === 'locked' || s === 'rejected' ? frameWhy(f) : '',
    selected: selected.value.has(f.i),
    selectionMode: selected.value.size > 0,
    linked: linkedSet.value.has(f.i),
    dimmed: state === 'link' && !linkedSet.value.has(f.i),
    dragging: state === 'drop' && selected.value.has(f.i),
    tooltipOpen: state === 'tooltip' && f.i === 1 ? true : undefined,
  }
}
function toggle(i: number) {
  const next = new Set(selected.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  selected.value = next
}

/* ------------------------------ заметки (как есть) ------------------------------ */
const noteWave = (f: any) => Array.from({ length: 80 }, (_, i) => Math.round((3 + Math.abs(Math.sin((i + (f.i - 9000) * 3) * 0.8)) * 11) * 10) / 10)

/* ------------------------------ панель структуры ------------------------------ */
const nfrz = Object.values(D.review).filter((v: any) => v.v === 'ok').length
const totalSteps = STAGES.reduce((a, s) => a + s.steps.length, 0)

function thumbState(f: any): StepThumbItem['state'] {
  if (f.rej) return 'rejected'
  if (f.origin === 'step') return 'from-step'
  if (f.lock) return 'locked'
  if (f.auto) return 'suggested'
  return 'free'
}
function stepProps(owner: string, st: any, index: number) {
  const inStep = framesIn(owner, st.id)
  const counted = inStep.filter((f: any) => !f.rej)
  const v = verdictOf(owner, st.id)
  const verdict: StepVerdict | null = v ? { kind: v.v === 'ok' ? 'ok' : 'redo', at: v.at, note: v.note } : null
  const isLink = owner === LINK.owner && st.id === LINK.step
  return {
    name: st.n,
    required: !!st.req,
    kind: st.kind === 'Видео' ? 'video' as const : 'photo' as const,
    min: st.min,
    max: st.max,
    count: counted.length,
    wasCount: counted.filter((f: any) => f.lock).length,
    instruction: st.hint ?? '',
    hotkey: cur.value === owner ? index + 1 : null,
    verdict,
    thumbs: inStep.map((f: any) => ({ id: f.i, src: img(f.i), state: thumbState(f) })),
    highlighted: state === 'link' && isLink,
    dropTarget: state === 'drop' && owner === eqId && st.id === 'e4',
    flash: isLink ? flashNonce.value : null,
    locatedThumb: state === 'flash' && isLink ? inStep[0]?.i ?? null : null,
  }
}

function objState(o: any) {
  const st = stageById[o.stageId]
  const bad = st.steps.filter((x: any) => {
    const n = framesIn(o.id, x.id).filter((f: any) => !f.rej).length
    return (x.max && n > x.max) || (n === 0 && x.req)
  }).length
  const frz = st.steps.filter((x: any) => isFrozen(o.id, x.id)).length
  return { total: D.frames.filter((f: any) => f.objId === o.id).length, bad, frz, steps: st.steps.length }
}

/** Компактная форма повтора — прототип `formPreview`, как есть. */
function formPreview(o: any) {
  const st = stageById[o.stageId]
  const vis = (f: any) => !(f.dep && o.form[f.dep.k] !== f.dep.v)
  const fields = st.form.filter(vis)
  const key = fields.filter((f: any) => o.form[f.k] || f.req).slice(0, 6)
  const src = o.auto && o.autoSrc ? o.autoSrc : {}
  return { fields, key, src, locked: objState(o).frz > 0 }
}
/** Поля компактной формы для `RepeatForm`: видимые по зависимостям, с источником автозаполнения. */
function formFields(o: any) {
  const { fields, src } = formPreview(o)
  return fields.map((f: any) => ({
    key: f.k,
    label: f.l,
    value: o.form[f.k] || '',
    required: !!f.req,
    source: src[f.k] === 'rec' ? 'recognized' as const : src[f.k] === 'def' ? 'default' as const : undefined,
    group: f.grp,
  }))
}

/* Состояние интерфейса панели, без бизнес-логики: этап свёрнут, повтор текущий, форма развёрнута. */
const closedStages = ref(new Set<string>())
const formOpen = ref(new Set<string>())
function toggleStage(id: string) {
  const next = new Set(closedStages.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  closedStages.value = next
}
function toggleForm(id: string) {
  const next = new Set(formOpen.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  formOpen.value = next
}
/** §9.3: клик делает повтор текущим и раскрывает; повторный клик по текущему — сворачивает. */
function clickRepeat(id: string) {
  const next = new Set(openObjs.value)
  if (cur.value === id) {
    if (next.has(id)) next.delete(id)
    else next.add(id)
  }
  else {
    cur.value = id
    next.add(id)
  }
  openObjs.value = next
}

function repList(st: any) {
  let list = D.objects.filter((o: any) => o.stageId === st.id)
  let hidden = 0
  if (view === 'review') {
    hidden = list.filter((o: any) => !o.auto).length
    list = list.filter((o: any) => o.auto)
  }
  return { list, hidden }
}

/* ------------------------------ подшапка ------------------------------ */
const S = D.stats
const reviewTitle = computed(() => (D.reviewHtml.match(/<span class="t">([\s\S]*?)<\/span>\s*<span class="sp">/)?.[1] ?? ''))

/* --------------------------- форма осмотра (кит) --------------------------- */
const general = ref<Record<string, string>>({ ...P.general })
const generalVisible = (f: any) => !f.dep || general.value[f.dep.k] === f.dep.v
const eqCount = D.objects.filter((o: any) => o.stageId === 'eq').length

/* -------------------------------- окна -------------------------------- */
const viewerKey = openWin === 'viewer-flash' ? 'assigned' : openWin.startsWith('viewer-') ? openWin.slice(7) : ''
const viewer = viewerKey
  ? ({ free: H.viewerFree, assigned: H.viewerAssigned, locked: H.viewerLocked, suggest: H.viewerSuggest } as Record<string, any>)[viewerKey] ?? null
  : null
const modalWin = ({ wand: H.wand, summary: H.summary, finish: H.finish } as Record<string, any>)[openWin] ?? null
const progressValue = parseFloat(H.progress.width)

/* ---------------------- пункт назначения, такт 33 (§10.3, §11.1–11.2) ---------------------- */
/** Кадров в шаге без отклонённых — прототип `cnt`. */
const cnt = (owner: string, stepId: string) => framesIn(owner, stepId).filter((f: any) => !f.rej).length
function stepOption(owner: string, st: any, hotkey: number | null, bound: AssignBound = null) {
  return {
    type: 'step' as const,
    value: `${owner}|${st.id}`,
    name: st.n,
    kind: st.kind === 'Видео' ? 'video' as const : 'photo' as const,
    min: st.min,
    max: st.max,
    count: cnt(owner, st.id),
    frozen: isFrozen(owner, st.id),
    hotkey,
    bound,
  }
}
const objectOption = (o: any, frames: number | null) => ({ type: 'object' as const, value: `obj|${o.id}`, name: objName(o), frames })

/** Поповер «Назначить на шаг» — группы прототипа `#btnToStep`: текущий → неповторяемые этапы → другие объекты. */
const assignGroups = computed(() => {
  const groups: { key: string, header: string, items: any[] }[] = []
  if (cur.value) {
    const o = O(cur.value)
    groups.push({ key: 'cur', header: `Текущий · ${objName(o)}`, items: stageById[o.stageId].steps.map((x: any, k: number) => stepOption(o.id, x, k + 1)) })
  }
  STAGES.filter(s => !s.rep).forEach(s => groups.push({ key: s.id, header: s.title, items: s.steps.map((x: any) => stepOption(s.id, x, null)) }))
  const others = D.objects.filter((o: any) => o.id !== cur.value)
  if (others.length) groups.push({ key: 'others', header: 'Другие объекты', items: others.map((o: any) => objectOption(o, null)) })
  return groups
})

/* ------------------ полноэкранный просмотр, такт 34 (§11.1–11.3) ------------------ */
/** Кадры просмотра — прототип `visibleMedia` в режиме «оставлять»: медиа свободной съёмки. */
const lbFrames = D.frames.filter((f: any) => isMedia(f) && f.origin !== 'step')
const viewerOpen = ref(!!viewer)
const viewerIdx = ref(Math.max(0, viewer ? lbFrames.findIndex((f: any) => f.i === viewer.i) : 0))
/**
 * Привязка кадра окна «viewer-assigned» берётся из разметки, которую прототип отрисовал для
 * этого состояния: окно снималось после привязки, в наборе данных кадр свободен.
 */
const BIND = String(H.viewerAssigned.list).match(/class="it bound" data-owner="([^"]+)" data-step="([^"]+)"/)
const bindOverride = viewerKey === 'assigned' && BIND ? { i: H.viewerAssigned.i, objId: BIND[1], stepId: BIND[2] } : null
const viewerFrame = computed(() => {
  const f = lbFrames[viewerIdx.value]
  return bindOverride && f?.i === bindOverride.i ? { ...f, objId: bindOverride.objId, stepId: bindOverride.stepId } : f
})
function openViewer(i: number) {
  viewerIdx.value = Math.max(0, lbFrames.findIndex((f: any) => f.i === i))
  suggestion.value = null
  viewerOpen.value = true
}
function stepViewer(index: number) {
  viewerIdx.value = index - 1
  suggestion.value = null
}

/** Нижняя плашка — из данных кадра, как прототип `renderLB`. */
const bindProps = computed(() => {
  const f = viewerFrame.value
  const st = f?.objId ? ownerStage(f.objId).steps.find((x: any) => x.id === f.stepId) : null
  return {
    state: (st ? (f.lock || f.rej ? 'locked' : 'assigned') : 'free') as 'free' | 'assigned' | 'locked',
    stepName: st?.n ?? '',
    ownerName: f?.objId ? (O(f.objId) ? objName(O(f.objId)) : ownerStage(f.objId).title) : '',
    /* «или нажмите 1–N» — только при текущем объекте: решение владельца 3, такт 34 (§16.2). */
    keys: cur.value ? stageById[O(cur.value).stageId].steps.length : null,
    rejected: !!f?.rej,
    reason: f ? frameWhy(f) : '',
  }
})
const metaRows = computed(() => {
  const f = viewerFrame.value
  if (!f) return []
  const rows = [{ label: 'Файл', value: f.n }, { label: 'Время', value: f.ts }, { label: 'Тип', value: f.type === 'video' ? 'Видео' : 'Фото' }]
  if (f.ocr) rows.push({ label: 'Распознано', value: f.ocr })
  return rows
})

/**
 * Подбор (§11.2). Логики подбора у стенда нет: предложение взято из окна «viewer-suggest»,
 * отрисованного прототипом, и показывается только для его кадра.
 */
const SUGGEST_HTML = String(H.viewerSuggest.bind)
const SUGGEST = {
  i: H.viewerSuggest.i,
  s: {
    kind: 'create' as const,
    title: SUGGEST_HTML.match(/<b>([^<]+)<\/b>/)?.[1] ?? '',
    inv: SUGGEST_HTML.match(/инв\. ([^<]+)</)?.[1]?.trim() ?? '',
    stageTitle: SUGGEST_HTML.match(/Создать «([^»]+)»/)?.[1] ?? '',
  },
}
const suggestion = ref<any>(viewerKey === 'suggest' ? SUGGEST.s : null)
function onSuggest() {
  if (viewerFrame.value?.i === SUGGEST.i) suggestion.value = SUGGEST.s
}
const bindFlash = ref<number | null>(null)

const viewerGroups = computed(() => {
  const f = viewerFrame.value
  if (!f) return []
  const locked = f.lock || f.rej
  const bound = (owner: string, sid: string): AssignBound => (f.objId === owner && f.stepId === sid ? (locked ? 'locked' : 'here') : null)
  const groups: { id: string, title: string, repeatable?: boolean, items: any[] }[] = []
  if (cur.value) {
    const o = O(cur.value)
    const s = stageById[o.stageId]
    groups.push({ id: s.id, title: `Текущий · ${objName(o)}`, items: s.steps.map((x: any, k: number) => stepOption(o.id, x, k + 1, bound(o.id, x.id))) })
  }
  /* Номера клавиш — только у текущего объекта (§16.3). Прототип выводит их и в группе
     «Привязан к», но клавиши 1–9 привязывают только к текущему объекту. */
  if (f.objId && O(f.objId) && f.objId !== cur.value) {
    const o = O(f.objId)
    groups.push({ id: `bnd_${o.id}`, title: `Привязан к · ${objName(o)}`, items: stageById[o.stageId].steps.map((x: any) => stepOption(o.id, x, null, bound(o.id, x.id))) })
  }
  STAGES.filter(s => !s.rep).forEach(s => groups.push({ id: s.id, title: s.title, items: s.steps.map((x: any) => stepOption(s.id, x, null, bound(s.id, x.id))) }))
  STAGES.filter(s => s.rep).forEach((s) => {
    const list = D.objects.filter((o: any) => o.stageId === s.id && o.id !== cur.value)
    groups.push({
      id: `rep_${s.id}`,
      title: s.title,
      repeatable: true,
      items: [{ type: 'create' as const, value: `new|${s.id}`, name: s.title }, ...list.map((o: any) => objectOption(o, D.frames.filter((x: any) => x.objId === o.id).length))],
    })
  })
  return groups
})
/** Счёт в заголовке группы — число пунктов без «Создать» (прототип `grp`). */
const groupCount = (g: { items: any[] }) => String(g.items.filter(i => i.type !== 'create').length)

const assignOpen = ref(false)
const assignAnchor = ref<HTMLElement | null>(null)
/** Клик по самой кнопке переключает плашку сам — закрытие «кликом мимо» ему не мешает. */
function onAssignOutside(e: Event) {
  if (assignAnchor.value?.contains(e.target as Node)) e.preventDefault()
}
/** Кнопка «Назначить на шаг» — разметка прототипа, не `PopoverTrigger`: фокус возвращается на неё вручную. */
function onAssignCloseFocus(e: Event) {
  e.preventDefault()
  assignAnchor.value?.focus()
}

const feedEl = ref<HTMLElement | null>(null)
const selbarLeft = ref('50%')
onMounted(async () => {
  /* Вспышка длится 1.5 с — оснастка повторяет её по кругу, чтобы снимок её застал. */
  /* Вспышка плашки длится 820 мс — оснастка ?open=viewer-flash повторяет её по кругу. */
  if (openWin === 'viewer-flash') {
    bindFlash.value = Date.now()
    setInterval(() => { bindFlash.value = Date.now() }, 1200)
  }
  if (state === 'flash') {
    flashNonce.value = Date.now()
    setInterval(() => { flashNonce.value = Date.now() }, 2000)
  }
  await nextTick()
  /* Целевой шаг оснастки — в центр панели, как у перехода «Показать в структуре». */
  const target = state === 'drop' ? `${eqId}|e4` : ['link', 'flash'].includes(state) ? `${LINK.owner}|${LINK.step}` : ''
  if (target) document.querySelector(`[data-step-key="${target}"]`)?.scrollIntoView({ block: 'center' })
  if (feedEl.value) {
    const r = feedEl.value.getBoundingClientRect()
    selbarLeft.value = `${r.left + r.width / 2}px`
  }
  /* Поповер назначения привязан к кнопке панели выделения — она разметка прототипа (№ 27, как есть). */
  const btn = document.getElementById('btnToStep')
  if (btn) {
    assignAnchor.value = btn
    btn.addEventListener('click', () => { assignOpen.value = !assignOpen.value })
    if (openWin === 'assign') {
      await nextTick()
      assignOpen.value = true
    }
  }
})

const SVG_NOTE = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2.5h10v11H3z"/><path d="M5.5 6h5M5.5 9h4"/></svg>'
const SVG_PLAY = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l8 5-8 5z"/></svg>'
</script>

<template>
  <div data-theme="rososmotr" class="font-sans" :class="{ 'asis-mark': asisMark }">
    <div class="va">
      <div class="app min-w-320" data-asis="каркас экрана">
        <!-- ============================ шапка 48, §7 ============================ -->
        <div class="topbar" data-asis="шапка">
          <span class="logo">VIEWAPP</span>
          <div class="crumbs">
            <span>Осмотры</span><span>/</span><span>Демо-осмотр · мониторинг оборудования</span><span>/</span><b>Распределение свободной съёмки</b>
          </div>
          <div style="flex:1" />
          <div class="saved" data-asis="индикатор сохранения">
            <span class="dot" /><span>Все изменения сохранены</span>
          </div>
          <button class="tbtn" data-asis="кнопка «Горячие клавиши»">
            Горячие клавиши
          </button>
          <span class="kit-island">
            <Button>Завершить распределение</Button>
          </span>
        </div>

        <!-- ============================ подшапка, §7 ============================ -->
        <div class="subhead" data-asis="подшапка">
          <div v-if="view === 'review'" class="review show" data-asis="полоса приёмки">
            <span class="t" v-html="reviewTitle" />
            <span class="sp" />
            <span class="kit-island">
              <Checkbox :model-value="true">только непроверенные</Checkbox>
              <Button variant="secondary" size="sm">Отменить автораспределение</Button>
              <Button size="sm">Принять все объекты</Button>
            </span>
          </div>
          <div class="sh-row">
            <span class="sess-badge" data-asis="бейдж «Свободная съёмка»">Свободная съёмка</span>
            <span class="sess-meta" data-asis="сводка сессии">{{ D.sessMeta }}</span>
            <div class="stats">
              <div class="stat">
                <span class="kit-island">
                  <ProgressStat
                    label="Кадры разложены"
                    :value="S.framesText"
                    :progress="{ value: S.placed, max: S.total, locked: S.pre }"
                    :sub="S.pre ? `${S.pre} привязано до вас` : ''"
                  />
                </span>
              </div>
              <div class="stat">
                <span class="kit-island">
                  <ProgressStat
                    label="Обязательные шаги"
                    :value="S.reqText"
                    :progress="{ value: S.ok, max: S.req, locked: S.frz }"
                    :sub="S.frz ? `${S.frz} закрыто проверкой` : ''"
                  />
                </span>
              </div>
              <div class="stat">
                <span class="kit-island">
                  <ProgressStat label="Объекты" :value="S.objText" :sub="S.objSub" />
                </span>
              </div>
            </div>
          </div>
          <div style="height:11px" />
        </div>

        <!-- ============================ рабочая зона ============================ -->
        <div class="work" data-asis="рабочая зона">
          <div class="pane">
            <!-- тулбар ленты, §7 -->
            <div class="bar-tools" data-asis="тулбар ленты">
              <span class="kit-island">
                <Button variant="secondary">Распределить автоматически</Button>
                <Button variant="secondary">Выделить всё</Button>
                <div class="w-55 shrink">
                  <Input v-model="search" placeholder="Поиск по расшифровкам и именам файлов…" />
                </div>
              </span>
              <span id="curHint" data-asis="индикатор текущего объекта">{{ cur ? `Текущий: ${objName(O(cur))} · клавиши 1–${stageById[O(cur).stageId].steps.length}` : 'Текущий объект не выбран' }}</span>
              <div class="ctlgrp">
                <span class="segl">Разобранные</span>
                <span class="kit-island">
                  <Tabs v-model="mode">
                    <TabsList variant="pill">
                      <TabsTrigger value="keep" variant="pill">оставлять</TabsTrigger>
                      <TabsTrigger value="hide" variant="pill">убирать</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </span>
              </div>
              <div class="ctlgrp">
                <span class="segl">Размер</span>
                <span class="kit-island">
                  <Tabs v-model="size">
                    <TabsList variant="pill">
                      <TabsTrigger value="md" variant="pill">M</TabsTrigger>
                      <TabsTrigger value="lg" variant="pill">L</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </span>
              </div>
            </div>

            <!-- лента материалов, §8 -->
            <div ref="feedEl" class="feed" data-asis="лента (прокрутка)">
              <span class="kit-island">
                <div :class="frameTileGridVariants({ size })">
                  <template v-for="f in feed" :key="f.i">
                    <FrameTile v-if="f.type !== 'voice'" v-bind="tileProps(f)" @toggle-select="toggle(f.i)" @open="openViewer(f.i)" />
                    <div v-else class="va">
                      <div
                        class="card voice"
                        :class="{ note: f.kind === 'note', exp: f.text.length <= 110 }"
                        data-asis="заметка"
                      >
                        <button class="pl" v-html="f.kind === 'note' ? SVG_NOTE : SVG_PLAY" />
                        <div class="vb">
                          <div class="vh">
                            <span class="vt">{{ f.kind === 'note' ? 'Текстовая заметка' : 'Голосовой комментарий' }}</span>
                            <span class="vm">{{ f.t }}</span><span v-if="f.dur" class="vm">{{ f.dur }}</span>
                          </div>
                          <div class="vx">{{ f.text }}</div>
                          <div v-if="f.kind !== 'note'" class="wv">
                            <i v-for="(h, k) in noteWave(f)" :key="k" :style="{ height: `${h}px` }" />
                          </div>
                        </div>
                        <div class="acts">
                          <button v-if="f.text.length > 110" class="copy">Показать полностью</button>
                          <button class="copy">Копировать</button>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </span>
            </div>
          </div>

          <div class="splitter" data-asis="разделитель" />

          <!-- панель структуры, §9 -->
          <div class="pane right" data-asis="панель структуры">
            <span class="kit-island">
              <Tabs v-model="tab">
                <TabsList>
                  <TabsTrigger value="scheme">Схема осмотра</TabsTrigger>
                  <TabsTrigger value="form">Форма осмотра</TabsTrigger>
                </TabsList>
              </Tabs>
            </span>

            <div class="rbody">
              <template v-if="tab === 'scheme'">
                <div class="schtools" data-asis="инструменты схемы">
                  <span class="kit-island">
                    <Button variant="secondary" size="sm">Свернуть все</Button>
                    <Button v-if="nfrz" variant="secondary" size="sm">Только открытые</Button>
                  </span>
                  <span style="font-size:12px;color:var(--va-muted);align-self:center">этапов: {{ STAGES.length }} · шагов: {{ totalSteps }}<template v-if="nfrz"> · заморожено {{ nfrz }}</template></span>
                </div>

                <span v-for="st in STAGES" :key="st.id" class="kit-island">
                  <StageSection
                    :title="st.title"
                    :repeatable="st.rep"
                    :count="st.rep ? String(D.objects.filter((o: any) => o.stageId === st.id).length) : plural(st.steps.length, 'шаг', 'шага', 'шагов')"
                    :open="!closedStages.has(st.id)"
                    :add-label="st.rep ? (st.id === 'bld' ? 'Новое здание' : 'Новая единица') : ''"
                    @toggle="toggleStage(st.id)"
                  >
                    <template v-if="st.rep">
                      <RepeatCard
                        v-for="o in repList(st).list"
                        :key="o.id"
                        :name="objName(o)"
                        :details="objSub(o)"
                        :frames="objState(o).total"
                        :open="openObjs.has(o.id)"
                        :current="cur === o.id"
                        :suggested="o.auto"
                        :checked-steps="objState(o).frz"
                        :errors="objState(o).bad"
                        :highlighted="state === 'link' && o.id === LINK.owner"
                        @header="clickRepeat(o.id)"
                      >
                        <template #form>
                          <RepeatForm
                            :fields="formFields(o)"
                            :expanded="formOpen.has(o.id)"
                            :deletable="!formPreview(o).locked && !o.auto"
                            @toggle="toggleForm(o.id)"
                          />
                        </template>
                        <StepRow v-for="(x, k) in stageById[o.stageId].steps" :key="x.id" v-bind="stepProps(o.id, x, k)" :data-step-key="`${o.id}|${x.id}`" />
                      </RepeatCard>
                      <StageNote v-if="!repList(st).list.length">
                        {{ view === 'review' && repList(st).hidden ? 'Все повторы этапа проверены' : 'Повторов пока нет — выделите кадры и нажмите «Новый объект из выделенного»' }}
                      </StageNote>
                      <StageNote v-if="repList(st).hidden && view === 'review' && repList(st).list.length">
                        Принято и скрыто: {{ plural(repList(st).hidden, 'объект', 'объекта', 'объектов') }}
                      </StageNote>
                    </template>
                    <div v-else class="flex flex-col gap-0.5 px-1.5 pt-1 pb-2">
                      <StepRow v-for="(x, k) in st.steps" :key="x.id" v-bind="stepProps(st.id, x, k)" />
                    </div>
                  </StageSection>
                </span>
              </template>

              <!-- вкладка «Форма осмотра»: поля — кит, группы и сверка — как есть -->
              <div v-else class="gform" data-asis="форма осмотра">
                <template v-for="g in P.GENERAL" :key="g.g">
                  <div class="gl">{{ g.g }}</div>
                  <div v-for="f in g.fields.filter(generalVisible)" :key="f.k" class="grow">
                    <span class="kit-island">
                      <Field :label="f.l">
                        <Select
                          v-if="f.opts"
                          v-model="general[f.k]"
                          :show-icon="false"
                          placeholder=""
                          :items="f.opts.map((o: string) => ({ value: o, label: o }))"
                        />
                        <Input v-else v-model="general[f.k]" :show-icon="false" placeholder="" />
                      </Field>
                    </span>
                    <div v-if="f.k === 'number'" class="cmp">Оформлено единиц оборудования: <b>{{ eqCount }}</b></div>
                  </div>
                </template>
                <div class="note">
                  Общая форма схемы. «Общее количество объектов по документам» вместе с «Имущество, которое не удалось осмотреть» отвечают на вопрос, всё ли обошли.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================ панель выделения, §10.2 ============================ -->
      <div
        v-if="showSelbar"
        id="selbar"
        class="selbar show"
        :style="{ left: selbarLeft }"
        data-asis="панель выделения"
        v-html="H.selbar"
      />

      <!-- ============================ поповер «Назначить на шаг», §10.3 — кит, такт 33 ============================ -->
      <!--
        Положение — как у прототипа (`#btnToStep`): над кнопкой на 8, левый край на 40 левее
        кнопки, от краёв окна не ближе 12. Ширина 360 и высота до 62vh — `.pop` прототипа.
      -->
      <Popover v-if="assignAnchor" v-model:open="assignOpen">
        <PopoverAnchor :reference="assignAnchor" />
        <PopoverContent
          as-child
          side="top"
          align="start"
          :align-offset="-40"
          :side-offset="8"
          :collision-padding="12"
          :width="360"
          @interact-outside="onAssignOutside"
          @close-auto-focus="onAssignCloseFocus"
        >
          <SelectContent :width="360" max-height="62vh">
            <AssignList>
              <SelectGroup v-for="g in assignGroups" :key="g.key" :header="g.header">
                <AssignOption v-for="it in g.items" :key="it.value" v-bind="it" @select="assignOpen = false" />
              </SelectGroup>
            </AssignList>
          </SelectContent>
        </PopoverContent>
      </Popover>

      <!-- ============================ полноэкранный просмотр, §11 — кит, такт 34 ============================ -->
      <!--
        Каркас — Lightbox со слотом боковой панели (решение владельца 1, такт 34). Логика страницы:
        переход через 820 мс, клавиши 1–N, стрелки, Enter — у стенда не реализованы (бизнес-логики нет).
      -->
      <Lightbox
        v-model:open="viewerOpen"
        :index="viewerIdx + 1"
        :total="lbFrames.length"
        @update:index="stepViewer"
      >
        <template #actions>
          <span class="flex min-w-0 items-center gap-3">
            <span data-slot="frame-file" class="truncate text-sm font-medium text-foreground">{{ viewerFrame?.n }}</span>
            <FrameStatus :assigned="bindProps.state !== 'free'" />
          </span>
        </template>
        <FrameStage :src="img(viewerFrame?.i ?? 1)" :alt="viewerFrame?.n" :assigned="bindProps.state !== 'free'">
          <FrameBindBar
            v-bind="bindProps"
            :suggestion="suggestion"
            :flash="bindFlash"
            @suggest="onSuggest"
            @dismiss="suggestion = null"
            @locate="viewerOpen = false"
          />
        </FrameStage>
        <template #aside>
          <FrameMeta :rows="metaRows" />
          <!-- список шагов, §11.1–11.2 — такт 33: группа — StageSection, пункт — AssignOption -->
          <StageSection
            v-for="g in viewerGroups"
            :key="g.id"
            :title="g.title"
            :repeatable="g.repeatable"
            :count="groupCount(g)"
            :open="!closedStages.has(g.id)"
            @toggle="toggleStage(g.id)"
          >
            <AssignList class="p-1">
              <AssignOption v-for="it in g.items" :key="it.value" v-bind="it" />
            </AssignList>
          </StageSection>
        </template>
      </Lightbox>

      <!-- ============================ окна: запуск, сводки, §12, §17 ============================ -->
      <div v-if="modalWin" class="modal show" data-asis="модальное окно">
        <div class="mbox">
          <h3>{{ modalWin.title }}</h3>
          <div class="sub">{{ modalWin.sub }}</div>
          <div class="body" v-html="modalWin.body" />
          <div class="foot">
            <span class="kit-island">
              <Button v-for="b in modalWin.buttons" :key="b.t" :variant="b.primary ? 'default' : 'secondary'">{{ b.t }}</Button>
            </span>
          </div>
        </div>
      </div>

      <!-- ============================ окно прогресса, §12.5 ============================ -->
      <div v-if="openWin === 'progress'" class="wandov" data-asis="окно прогресса">
        <div class="wbox">
          <div style="display:contents" v-html="H.progress.head" />
          <div style="margin:14px 0 12px">
            <span class="kit-island">
              <Progress :value="progressValue" :max="100" label="Автораспределение" />
            </span>
          </div>
          <div v-for="(r, k) in H.progress.rows" :key="k" style="display:contents" v-html="r" />
          <div class="wfoot">
            <span class="wnote">Структура заблокирована до конца обработки</span>
            <span class="kit-island">
              <Button variant="secondary" size="sm">Прервать</Button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <AsisMarks v-if="asisMark" />
  </div>
</template>

<style src="~/stands/free-shoot/asis.css"></style>
