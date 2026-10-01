<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AssignBound } from '@/components/ui/assign'
import type { FeedNoteSelection } from '@/components/ui/feed-note'
import { frameTileColumns, frameTileGridVariants, type FrameTileState } from '@/components/ui/frame-tile'
import type { StepThumbItem, StepVerdict } from '@/components/ui/step-row'
import AsisMarks from '~/stands/free-shoot/AsisMarks.vue'
import { createModel, emptyDataset, MODE_T, plural, type FormDef, type ScreenWindow, type Suggestion, type WandMode } from '~/stands/free-shoot/model'
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
 * **С такта 43 блоков «как есть» нет:** последний — заметка № 25 — на `FeedNote`; экран целиком на ките (раздел 22).
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
 * ## Поведение — модель `~/stands/free-shoot/model.ts`
 *
 * С такта 38 (П1) состояние экрана — модель прототипа: переключатели вида, текущий повтор, окна,
 * форма осмотра. С такта 39 (П2) — автораспределение и приёмка: окно запуска с прогнозом трёх
 * режимов, прогресс с прерыванием, сводка результата, полоса приёмки, принятие и отклонение
 * объектов (§12–§13). Перетаскивание, клавиатура, отмена, автосохранение — по порциям П3–П6
 * (`docs/free-shoot.md`, 16.5). С такта 43 (П6) — заметки, фрагмент заметки, создание повтора (форма, «+ Новая
 * единица», из выделенного, из фрагмента, из просмотра), сохранение формы и удаление повтора (С-18–20, 33).
 *
 * **Старт стенда — старт прототипа** (решение чата 2026-09-30, такт 39): после загрузки все повторы
 * свёрнуты, текущего нет. Раскрытый повтор — только оснасткой `?expand=eq`.
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | `?state=link` | связь шага и кадров: кадры шага подсвечены, остальные приглушены (§15.1–15.2) |
 * | `?state=flash` | вспышка шага и обводка миниатюры после «Показать в структуре» (§15.3) |
 * | `?state=tooltip` | подсказка названия шага на плашке кадра (§15.4) |
 * | `?state=drop` | цель приёма перетаскивания и перетаскиваемые кадры (§9.5) |
 * | `?state=marquee` | рамка выделения над первыми тремя кадрами ленты и их выделение (§10.1) — такт 40 |
 * | `?open=move` | окно «Перенести кадр?» над просмотром: кадр 21 привязан к «Узлам и агрегатам», выбран «Органы управления» (§11.4) — такт 41 |
 * | `?state=undo` | уведомление привязки с «Отменить» без таймера (§10.6) — такт 40: кадр 21 привязан к «Узлам и агрегатам» |
 * | `?selected=demo` | выделение пяти кадров и панель выделения (§10.2) |
 * | `?open=assign` | панель выделения и поповер «Назначить на шаг», текущий объект (§10.3); с такта 33 поповер и пункты — кит (`Popover`, `SelectContent`, `SelectGroup`, `AssignOption`) |
 * | `?open=viewer-free` / `viewer-assigned` / `viewer-locked` / `viewer-suggest` | полноэкранный просмотр, четыре состояния нижней плашки (§11.2); с такта 33 список шагов — кит (`StageSection`, `AssignOption`), с такта 34 весь просмотр — кит (`Lightbox` со слотом `aside`, `FrameStage`, `FrameBindBar`, `FrameMeta`) |
 * | `?open=viewer-flash` | просмотр привязанного кадра со вспышкой «Распределено» по кругу — вспышка длится 820 мс, снимок её застаёт (§11.3), такт 34 |
 * | `?open=wand` | окно запуска автораспределения (§12.1–12.4) — с такта 39 на ките и на модели: прогнозы трёх режимов считает `autoPlan` |
 * | `?open=progress` | окно прогресса автораспределения (§12.5); с такта 35 — на ките (`ModalCard` center 440, закрытие заблокировано), с такта 39 — на модели: полное автораспределение, остановленное на доле снимка прототипа (59 из 132 кадров) |
 * | `?open=hotkeys` | окно «Горячие клавиши» (§16) — на ките (`ModalCard` center 600, `ShortcutList`); такт 35 |
 * | `?open=form` | окно формы повтора оборудования целиком (§14.4) — кит, такт 36 (`ModalCard`, `FieldSet`, `Field` с колонкой подписи) |
 * | `?open=form-group` | то же окно, открытое «Изменить» у группы «Состояние и эксплуатация»: тело прокручено к группе, фокус на её первом поле (§14.3) |
 * | `?open=form-errors` | окно после «Сохранить» с пустым «Наименование, марка, модель»: ошибка у поля и уведомление «Заполните: …» без таймера (§14.6) |
 * | `?open=summary` | сводка результата автораспределения (§12.12) — с такта 39 модель применяет полное автораспределение и открывает сводку, как прототип после прогресса |
 * | `?open=finish` | сводка завершения распределения (§17.4) |
 * | `?view=review` | режим приёмки: полоса приёмки, предложенные объекты и кадры (§13) — с такта 39 модель применяет полное автораспределение к набору (результат совпадает со снимком прототипа) |
 * | `?expand=eq` | раскрыт повтор оборудования (в режиме приёмки — первый предложенный); без параметра все свёрнуты, как у прототипа — такт 39. Нужен состояниям `state=link`, `state=flash`, `state=drop` |
 * | `?data=empty` | набор «Пустой осмотр» — прототип `applyScenario('empty')`: повторов и вердиктов нет, режим «Только кадры» недоступен (С-27), такт 39 |
 * | `?tab=form` | вкладка «Форма осмотра» (§7) |
 * | `?open=new` | окно «Новый повтор · Оборудование» из пяти выделенных кадров: подпись, начальные значения, подсказки распознанного (§10, §14.5) — такт 43 |
 * | `?open=newobj` | панель выделения и поповер «Новый объект из выделенного» (№ 29) — такт 43 |
 * | `?open=delete` | окно «Удалить объект?» у нового повтора «Объект без названия»: у повторов набора есть проверенные шаги (§6.2, С-20) — такт 43 |
 * | `?open=fragment` | полоса «Новый объект:» над началом первой длинной голосовой заметки (§8.5, № 26) — такт 43 |
 * | по умолчанию | тонкий пунктир `--muted-foreground` вокруг каждого перенесённого блока — незакрытое видно глазом (довесок 2 к такту 35) |
 * | `?asis=mark` | пунктир толще и подпись вокруг каждого перенесённого блока |
 * | `?asis=off` | без обводки — для чистых снимков |
 */
definePageMeta({ layout: false })
useHead({ title: 'Распределение свободной съёмки — экран' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')
const state = q('state')
const openWin = q('open')
const view = q('view')
const asisMark = q('asis') === 'mark'
/** По умолчанию блоки «как есть» обведены; `?asis=off` — чистый экран для снимков. */
const asisOutline = q('asis') !== 'off'

/* eslint-disable @typescript-eslint/no-explicit-any */
const P = proto as any
/** Набор: «Частично проверен» (`A`) или «Пустой осмотр» (`?data=empty`). Режим приёмки модель строит сама — `P.B` не читается. */
const D = q('data') === 'empty' ? emptyDataset(P.A) : P.A
const H = P.html

/** Демо-кадр по индексу кадра прототипа: 24 снимка по кругу. */
const img = (i: number) => `/free-shoot/demo-${String(((i - 1) % 24) + 1).padStart(2, '0')}.jpg`

/* ------------------------------ модель состояния, такт 38 ------------------------------ */
/**
 * Состояние экрана — модель прототипа `~/stands/free-shoot/model.ts` (порция П1, `free-shoot.md`, 16.2).
 * Страница переводит модель в пропы компонентов, события компонентов — в операции модели.
 * Оснастка адреса выставляет начальное состояние модели.
 */
const eqId: string = D.objects.find((o: any) => o.stageId === 'eq')?.id

const viewerKey = openWin === 'viewer-flash' ? 'assigned' : openWin.startsWith('viewer-') ? openWin.slice(7) : ''
const viewer = viewerKey
  ? ({ free: H.viewerFree, assigned: H.viewerAssigned, locked: H.viewerLocked, suggest: H.viewerSuggest } as Record<string, any>)[viewerKey] ?? null
  : null
/** Кадры просмотра — прототип `visibleMedia` в режиме «оставлять»: медиа свободной съёмки. */
const LB_FRAMES = D.frames.filter((f: any) => f.type !== 'voice' && f.origin !== 'step')
const WINDOWS = ['hotkeys', 'wand', 'finish'] as const

const m = createModel({
  data: D,
  stages: P.stages,
  general: P.general,
  blocks: P.blocks,
  scenario: q('data') === 'empty' ? 'empty' : 'review',
  initial: {
    cur: openWin === 'assign' ? P.selectCur : D.cur,
    sel: state === 'drop' || ['assign', 'new', 'newobj'].includes(openWin) || q('selected') === 'demo' ? P.selected : [],
    rtab: q('tab') === 'form' ? 'form' : 'scheme',
    win: (WINDOWS as readonly string[]).includes(openWin) ? openWin as ScreenWindow : null,
    lb: viewer ? Math.max(0, LB_FRAMES.findIndex((f: any) => f.i === viewer.i)) : -1,
  },
})
/* Оснастка П2 — состояние выставляет модель своими операциями, как прототип после автораспределения. */
if (view === 'review' || openWin === 'summary') {
  m.applyWandNow('full')
  if (openWin !== 'summary') m.closeWindow()
}
if (openWin === 'progress') m.runWand('full', parseFloat(H.progress.width) / 100)
/* Раскрытый повтор — только оснасткой (решение чата 2026-09-30, такт 39): у прототипа после загрузки свёрнуты все. */
if (q('expand') === 'eq') {
  const id = m.state.review ? m.objects.find(o => o.auto && o.stageId === 'eq')?.id : eqId
  if (id) m.state.open.add(id)
}
const { STAGES, stageById, O, ownerStage, objName, objSub, isFrozen, framesIn, frameWhy, cnt } = m
const { feed, stats: S, sessMeta, curHint, eqCount, reviewBar, wandWindow, progressWindow } = m
const verdictOf = m.verdict

/* Обёртки состояния под именами шаблона: чтение — из модели, запись — операцией модели. */
const cur = computed(() => m.state.cur)
const openObjs = computed(() => m.state.open)
const closedStages = computed(() => m.state.closed)
const formOpen = computed(() => m.state.formOpen)
const selected = computed(() => m.state.sel)
const mode = computed({ get: () => m.state.mode, set: v => m.setMode(v) })
const size = computed({ get: () => m.state.size, set: v => m.setSize(v) })
const tab = computed({ get: () => m.state.rtab, set: v => m.setTab(v) })
/** Поиск §8.6 — фильтр ленты моделью (С-04), такт 42. */
const search = computed({ get: () => m.state.q, set: (v: string) => m.setQuery(v ?? '') })
const { clickRepeat, toggleStage, toggleForm } = m

/* ------------------------------- оснастка ------------------------------- */
const LINK = { owner: eqId, step: 'e3' }
const flashNonce = ref<number | null>(null)

/* ------------------------------ связь в обе стороны, такт 40–41 (§15.1–15.2) ------------------------------ */
/**
 * Наведение — прототип `mouseover` ленты и панели. Кадр ленты под курсором подсвечивает свой шаг и повтор, только если шаг
 * уже виден в панели (без прокрутки); шаг или заголовок повтора под курсором подсвечивает свои кадры ленты, остальные
 * приглушены. Оснастка `?state=link` — то же без курсора.
 */
const hoverTile = ref<number | null>(null)
const hoverFeed = ref<{ key: string, obj: string | null } | null>(null)
const hoverPanel = ref<string | null>(null)
const panelEl = ref<HTMLElement | null>(null)
/** Шаг кадра под курсором — подсветить, если строка шага уже видна в панели; пересчёт и при смене данных под неподвижным курсором. */
function recomputeFeedHover() {
  const f = hoverTile.value != null ? m.frames.find(x => x.i === hoverTile.value) : null
  const key = f?.objId ? `${f.objId}|${f.stepId}` : null
  const el = key ? document.querySelector(`[data-step-key="${key}"]`) : null
  const rb = panelEl.value?.getBoundingClientRect()
  if (!key || !el || !rb) { hoverFeed.value = null; return }
  const r = el.getBoundingClientRect()
  hoverFeed.value = r.bottom > rb.top && r.top < rb.bottom ? { key, obj: m.O(f!.objId) ? f!.objId : null } : null
}
function onFeedOver(e: MouseEvent) {
  const card = (e.target as HTMLElement).closest('[data-frame]') as HTMLElement | null
  hoverTile.value = card ? Number(card.dataset.frame) : null
  recomputeFeedHover()
}
function onFeedLeave() {
  hoverTile.value = null
  hoverFeed.value = null
}
watch(() => {
  const f = hoverTile.value != null ? m.frames.find(x => x.i === hoverTile.value) : null
  return [f?.objId, f?.stepId, m.state.open.size, m.state.closed.size, m.state.onlyOpen, m.state.cur]
}, () => nextTick(recomputeFeedHover), { flush: 'post' })
function onPanelOver(e: MouseEvent) {
  const t = e.target as HTMLElement
  const step = t.closest('[data-step-key]') as HTMLElement | null
  const head = t.closest('[data-slot=repeat-header]')
  const obj = head ? (head.closest('[data-obj]') as HTMLElement | null)?.dataset.obj : null
  hoverPanel.value = step ? `s:${step.dataset.stepKey}` : obj ? `o:${obj}` : null
}
const linkedSet = computed(() => {
  if (state === 'link') return new Set(framesIn(LINK.owner, LINK.step).map((f: any) => f.i))
  const k = hoverPanel.value
  if (!k) return new Set<number>()
  const [owner, sid] = k.slice(2).split('|')
  return new Set(m.frames.filter(f => (k.startsWith('s:') ? f.objId === owner && f.stepId === sid : f.objId === owner)).map(f => f.i))
})
const linking = computed(() => state === 'link' || linkedSet.value.size > 0)

function tileState(f: any): FrameTileState {
  if (!f.objId) return 'free'
  if (f.rej) return 'rejected'
  if (f.lock) return 'locked'
  if (f.auto) return 'suggested'
  return 'assigned'
}
function tileProps(f: any) {
  const st = f.objId ? ownerStage(f.objId).steps.find((s: any) => s.id === f.stepId) : null
  const owner = f.objId ? (O(f.objId) ? objName(O(f.objId)!) : ownerStage(f.objId).title) : ''
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
    dimmed: linking.value && !linkedSet.value.has(f.i),
    dragging: (state === 'drop' && selected.value.has(f.i)) || dragIds.value.includes(f.i),
    tooltipOpen: state === 'tooltip' && f.i === 1 ? true : undefined,
  }
}

/* ------------------------------ «Показать в структуре», такт 41 (§15.3) ------------------------------ */
/** Найденный шаг: вспышка 1.5 с (`StepRow flash`), обводка миниатюры 1.6 с — как у прототипа `locateFrame`. */
const found = ref<{ key: string, i: number, nonce: number, thumb: boolean } | null>(null)
let foundTimer: ReturnType<typeof setTimeout> | undefined
async function onLocate(i: number) {
  const r = m.locateFrame(i)
  if (!r) return
  await nextTick()
  const key = `${r.owner}|${r.stepId}`
  const el = document.querySelector(`[data-step-key="${key}"]`)
  if (!el) { m.notify('Шаг не найден в структуре', 'err'); return }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  found.value = { key, i, nonce: Date.now(), thumb: true }
  clearTimeout(foundTimer)
  foundTimer = setTimeout(() => { if (found.value) found.value = { ...found.value, thumb: false } }, 1600)
}


/* ------------------------------ панель структуры ------------------------------ */
const nfrz = computed(() => m.frzSteps())
/** «Только открытые» (§9.2): этап без повторов, где закрыты все шаги, скрывается целиком — прототип `renderRight`. */
const visibleStages = computed(() => STAGES.filter(st => st.rep || !m.state.onlyOpen || st.steps.some(x => !isFrozen(st.id, x.id))))
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
    highlighted: (state === 'link' && isLink) || hoverFeed.value?.key === `${owner}|${st.id}`,
    dropTarget: (state === 'drop' && owner === eqId && st.id === 'e4') || hotStep.value === `${owner}|${st.id}`,
    flash: isLink && flashNonce.value ? flashNonce.value : found.value?.key === `${owner}|${st.id}` ? found.value.nonce : null,
    locatedThumb: state === 'flash' && isLink ? inStep[0]?.i ?? null : found.value?.key === `${owner}|${st.id}` && found.value.thumb ? found.value.i : null,
  }
}

function objState(o: any) {
  const st = stageById[o.stageId]
  const bad = st.steps.filter((x: any) => {
    const n = cnt(o.id, x.id)
    return (x.max && n > x.max) || (n === 0 && x.req)
  }).length
  const frz = st.steps.filter((x: any) => isFrozen(o.id, x.id)).length
  return { total: m.frames.filter((f: any) => f.objId === o.id).length, bad, frz, steps: st.steps.length }
}

/** Компактная форма повтора — прототип `formPreview`, как есть. */
function formPreview(o: any) {
  const st = stageById[o.stageId]
  const vis = (f: any) => !(f.dep && o.form[f.dep.k] !== f.dep.v)
  const fields = (st.form ?? []).filter(vis)
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

/** Повторы этапа — прототип `renderRight`: в режиме приёмки с фильтром «только непроверенные» — только предложенные. */
function repList(st: any) {
  let list = m.objects.filter((o: any) => o.stageId === st.id)
  if (m.state.onlyOpen) list = list.filter((o: any) => st.steps.some((x: any) => !isFrozen(o.id, x.id)))
  const revFilter = m.state.review && m.state.reviewOnly && m.objects.some((o: any) => o.auto)
  const hidden = revFilter ? list.filter((o: any) => !o.auto).length : 0
  if (revFilter) list = list.filter((o: any) => o.auto)
  return { list, hidden }
}

/* ------------------------------ приёмка, такт 39 (§13) ------------------------------ */
/** Панель прокручивается к объекту, который модель сделала текущим, — прототип `revealObj`. */
async function reveal(id: string | null) {
  if (!id) return
  await nextTick()
  document.querySelector(`[data-obj="${id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
/** Кнопки карточки повтора (№ 37) — обработчик панели прототипа: операция и подтверждение. */
function acceptRepeat(id: string) {
  const next = m.acceptObj(id)
  m.notify('Объект принят')
  reveal(next)
}
function rejectRepeat(id: string) {
  const next = m.rejectObj(id)
  m.notify('Объект отклонён, кадры вернулись в ленту')
  reveal(next)
}

/* --------------------------- форма осмотра (кит) --------------------------- */
const generalVisible = (f: any) => !f.dep || m.general[f.dep.k] === f.dep.v
/** Подсказка поля «Общее количество объектов по документам» — сверка прототипа `.cmp` одной строкой (такт 42). */
const generalHint = computed(() => `Оформлено единиц оборудования: ${eqCount.value}${generalCheck.value ? ` ${generalCheck.value.text}` : ''}`)
/** Сверка «Оформлено единиц» с полем «Общее количество объектов по документам» — прототип `renderRight`. */
const generalCheck = computed(() => {
  const n = m.general.number
  if (!n) return null
  return Number(n) === eqCount.value ? { ok: true, text: '— сходится' } : { ok: false, text: `— расхождение ${Math.abs(Number(n) - eqCount.value)}` }
})

/* -------------------------------- окна -------------------------------- */
const windowModel = (win: Exclude<ScreenWindow, null>) => computed({
  get: () => m.state.win === win,
  set: (v: boolean) => (v ? m.openWindow(win) : m.closeWindow()),
})
/** Сводка завершения (№ 55, §17.4–17.6) — кит, такт 42: `ModalCard` + `Callout`; тексты — модель. */
const finishOpen = windowModel('finish')
/** Окно входа (№ 59) — кит, такт 42: открывается при загрузке, как у прототипа; оснастка адреса его не открывает. */
const entryOpen = windowModel('entry')

/* ------------------------- автораспределение, такт 39 (§12) ------------------------- */
/** Окно запуска (№ 48–49): выбранный режим — черновик окна, как радио `#mBody` прототипа; при открытии — «полное». */
const wandOpen = windowModel('wand')
const wandMode = ref<WandMode>('full')
watch(() => m.state.win, (w) => { if (w === 'wand') wandMode.value = 'full' })
/** Сводка результата (№ 54): кнопки — операции модели, прокрутка ленты и панели — страница. */
const summaryOpen = windowModel('summary')
function onSummary(action: 'left' | 'review') {
  const id = m.summaryAction(action)
  if (action === 'left' && feedEl.value) feedEl.value.scrollTop = 0
  reveal(id)
}

/* ------------------------- окна на ките, такт 35 (§12.5, §16) ------------------------- */
/** Окно прогресса — модель (`runWand`): доля и строки счётчиков; «Прервать» — `abortWand`, ничего не применяется. */
const progressOpen = computed({
  get: () => m.state.win === 'progress',
  set: (v: boolean) => { if (!v) { stopFly(); m.abortWand() } },
})

/* --------------------- пролёт миниатюр в панель, такт 45 (№ 51, §12.5) --------------------- */
/**
 * Разовый эффект стенда — решение владельца 2026-10-01 (вопрос 1 входа приёмки): в кит не заносится, ни компонента, ни
 * оси, ни токена; исключение из правила страницы — `naming.md`, «Разовые эффекты стенда». Прототип `animateFly`: до 14
 * видимых плиток кадров плана, старт каждой через 55 мс; клон картинки плитки летит 0.55 с (`cubic-bezier(.4, 0, .2, 1)`)
 * к точке «середина панели, 130 от её верха», уменьшаясь до 0.12 с поворотом 7° и угасая; через 580 мс клон снят.
 * Движение — Web Animations API; клон без классов, отметка `data-flyer` — для прогона. Особого случая для
 * `prefers-reduced-motion` у прототипа нет — у стенда тоже. «Прервать» снимает и летящие, и ещё не выпущенные.
 */
const flyTimers: ReturnType<typeof setTimeout>[] = []
function stopFly() {
  flyTimers.splice(0).forEach(clearTimeout)
  document.querySelectorAll('[data-flyer]').forEach(x => x.remove())
}
function animateFly(ids: number[]) {
  const panel = panelEl.value?.getBoundingClientRect()
  if (!panel || !feedEl.value) return
  const vis = ids
    .map(i => feedEl.value!.querySelector<HTMLElement>(`[data-slot=frame-tile][data-frame="${i}"]`))
    .filter((el): el is HTMLElement => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 60 && r.top < window.innerHeight - 60 })
    .slice(0, 14)
  vis.forEach((el, k) => flyTimers.push(setTimeout(() => {
    const img = el.querySelector('img')
    if (!img) return
    const r = img.getBoundingClientRect()
    const c = img.cloneNode() as HTMLImageElement
    c.removeAttribute('class')
    c.dataset.flyer = ''
    Object.assign(c.style, {
      position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: '0',
      zIndex: '60', objectFit: 'cover', pointerEvents: 'none', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-dropdown)',
    })
    document.body.appendChild(c)
    const tx = panel.left + panel.width / 2 - (r.left + r.width / 2)
    const ty = panel.top + 130 - (r.top + r.height / 2)
    c.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) scale(.12) rotate(7deg)`, opacity: 0 }],
      { duration: 550, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' })
    flyTimers.push(setTimeout(() => c.remove(), 580))
  }, k * 55)))
}
/* Пролёт стартует с обработкой — как у прототипа, сразу за окном прогресса; оснастка `?open=progress` держит долю без пролёта. */
watch(() => m.state.run, (run, prev) => { if (run && !prev && openWin !== 'progress') animateFly(run.ids) })
onBeforeUnmount(stopFly)

/** Окно «Горячие клавиши» — состав прототипа `#btnHelp`, клавиши — в квадратных скобках. */
const HOTKEYS = [
  { keys: '[клик]', action: 'выбрать или снять выбор кадра' },
  { keys: '[Shift] + клик', action: 'выделить подряд идущие кадры' },
  { keys: 'значок в углу', action: 'открыть кадр во весь экран' },
  { keys: 'протянуть мышью', action: 'выделить рамкой (с пустого места или с [Alt])' },
  { keys: '[двойной клик]', action: 'то же самое' },
  { keys: '[1]–[8]', action: 'назначить на шаг текущего объекта' },
  { keys: '[←] [→]', action: 'листать в просмотре' },
  { keys: '[Del]', action: 'открепить' },
  { keys: '[Enter]', action: 'принять подобранный шаг в просмотре' },
  { keys: '[⌘]/[Ctrl]+[Z]', action: 'отменить' },
  { keys: '[Esc]', action: 'снять выделение' },
]
const HOTKEYS_NOTE = 'Порядок работы: сначала оформите здание, потом единицы оборудования внутри него — поле «Здание / цех» подставится автоматически. Перетаскивание работает так же, как клавиши.'
const hotkeysOpen = windowModel('hotkeys')

/* ------------------------- окно формы повтора, такт 36 (§14.3–14.6) ------------------------- */
/**
 * Окно открывают оба «Изменить» `RepeatForm` (событие `edit(group?)`): без группы — форма целиком,
 * с группой — сразу на ней (§14.3); «Все поля (N)» разворачивает карточку. Прототип `openObjForm`.
 * Какое окно открыто — модель; черновик полей — окно, как у прототипа (поля `#mBody`). С порции П6 (такт 43) окно
 * сохраняет форму в модель (С-18) и создаёт новый повтор (С-19) — `submitForm`; заголовок, подпись, начальные значения
 * и подсказки распознанного — `formWindow` модели.
 */
const EMPTY = '—'
const editWin = computed(() => m.state.formWin)
const formWin = m.formWindow
const editDraft = ref<Record<string, string>>({})
const editErrors = ref(new Set<string>())
const editOpen = windowModel('form')
const editStage = computed(() => (editWin.value ? stageById[editWin.value.stage] : null))
/** Черновик окна — начальные значения модели на момент открытия, как поля `#mBody` прототипа; у выбора пустое — «—». */
watch(editWin, (w, prev) => {
  if (!w || w === prev) return
  const init = m.formWindow.value?.init ?? {}
  editDraft.value = Object.fromEntries((stageById[w.stage]!.form ?? []).map(f => [f.k, init[f.k] || (f.opts ? EMPTY : '')]))
  editErrors.value = new Set()
}, { immediate: true })
/** Группы — как у прототипа: `grp` стоит у первого поля группы, следующие поля идут в неё же. */
const editGroups = computed(() => {
  const out: { title: string, fields: FormDef[] }[] = []
  for (const f of editStage.value?.form ?? []) {
    const last = out[out.length - 1]
    if (!last || (f.grp && f.grp !== last.title)) out.push({ title: f.grp ?? '', fields: [f] })
    else last.fields.push(f)
  }
  return out
})
const filled = (k: string) => { const v = (editDraft.value[k] ?? '').trim(); return !!v && v !== EMPTY }
/** Зависимое поле (§14.4): видно, когда родитель равен `dep.v`; связь — данные этапа, считает страница. */
const formVisible = (f: FormDef) => !f.dep || editDraft.value[f.dep.k] === f.dep.v
/** Ошибка у пустого обязательного — после попытки сохранить, снимается заполнением (решение владельца 2, такт 36). */
const formInvalid = (f: FormDef) => editErrors.value.has(f.k) && !filled(f.k)
const formItems = (opts: string[]) => [EMPTY, ...opts].map(x => ({ value: x, label: x }))
function openForm(objId: string, group?: string) {
  m.openForm(objId, group ?? '')
}
/**
 * Подсказка распознанного (§14.5) — прототип `[data-ocr]`: номер после «ИНВ» — в инвентарный, иначе текст — в пустое первое
 * поле (марка или номер здания), иначе номер — в пустой заводской.
 */
function applyOcr(t: string) {
  const d = editDraft.value
  const num = t.match(/(\d[\d/]{2,})/)
  const first = 'mark' in d ? 'mark' : 'no' in d ? 'no' : ''
  if (/ИНВ|Инв/i.test(t) && num && 'inv' in d) d.inv = num[1]!
  else if (first && !d[first]) d[first] = t
  else if ('sn' in d && !d.sn && num) d.sn = num[1]!
}

/** Уведомления экрана — очередь модели, отказы и подтверждения §18. Оснастка `?open=form-errors` держит отказ без таймера. */
const toasts = m.notices
/** Сроки прототипа `toast`: 3 с, с действием «Отменить» — 6 с (§10.6). */
const toastDuration = (undo: boolean) => (openWin === 'form-errors' || state === 'undo' ? Number.POSITIVE_INFINITY : undo ? 6000 : 3000)
/** §14.6: обязательные проверяются при сохранении — `form.required` «Заполните: <список полей>», окно открыто. */
function saveForm() {
  const need = m.submitForm({ ...editDraft.value })
  if (need.length) editErrors.value = new Set(need.map(f => f.k))
  /* Повтор создан из подбора шага — плашка просмотра показывает привязку, предложение снято (строка раздела 15, такт 43). */
  else suggestion.value = null
}

/* ------------------------------ П6: заметки и создание, такт 43 (§8.4–8.5, §10, §6.2) ------------------------------ */
/** Развёрнутые заметки — состояние страницы (строка раздела 15: у прототипа перерисовка ленты сворачивает). */
const expandedNotes = ref(new Set<number>())
function toggleNote(i: number) {
  const s = new Set(expandedNotes.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  expandedNotes.value = s
}
/** «Копировать» — прототип `copyText`: буфер обмена, в небезопасном контексте — через скрытое поле. */
function copyNote(f: any) {
  try { void navigator.clipboard?.writeText(f.text).catch(() => {}) }
  catch {}
  m.noteAction(f.i, 'copy')
}
/** Фрагмент заметки (№ 26): полоса над выделенным текстом; центр — середина выделения, от краёв окна не ближе 240 (полоса до 480). */
const fragment = ref<{ text: string, x: string, y: string } | null>(null)
function onNoteSelect(sel: FeedNoteSelection) {
  if (marquee.value) return
  const cx = Math.max(240, Math.min(sel.rect.left + sel.rect.width / 2, window.innerWidth - 240))
  fragment.value = { text: sel.text, x: `${Math.round(cx)}px`, y: `${Math.round(Math.max(58, sel.rect.top - 8))}px` }
}
/** Полоса фрагмента прячется, когда выделение снято или ушло из заметки, и при любой прокрутке — прототип `#selact`. */
function onDocMouseup() {
  setTimeout(() => {
    const sel = window.getSelection()
    const host = sel?.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode as Element : sel.anchorNode.parentElement) : null
    if (!sel || sel.isCollapsed || !host?.closest('[data-slot=feed-note]')) fragment.value = null
  }, 10)
}
/* Оснастка `?open=fragment` держит полосу: догрузка картинок сдвигает прокрутку ленты и прятала бы её до снимка. */
function onDocScroll() { if (openWin !== 'fragment') fragment.value = null }
/** «Оборудование» / «Здание» — форма нового повтора с именем из фрагмента, без кадров. */
function onFragment(stage: string) {
  const t = fragment.value?.text ?? ''
  fragment.value = null
  window.getSelection()?.removeAllRanges()
  m.openNewForm(stage, [], t)
}
/** Поповер «Новый объект из выделенного» (№ 29): этап — форма нового повтора с выделенными кадрами. */
const newObjOpen = ref(false)
function onNewObject(stage: string) {
  newObjOpen.value = false
  m.openNewForm(stage)
}
/** «Создать «<этап>»» подбора шага — форма нового повтора с кадром просмотра и именем, как прототип `data-act="mk"`. */
function onSuggestCreate() {
  const sg = suggestion.value
  const f = viewerFrame.value
  if (sg?.kind === 'create' && f) m.openNewForm(sg.stage, [f.i], sg.title)
}
/** Окно «Удалить объект?» (С-20). */
const deleteOpen = windowModel('delete')

/* ---------------------- пункт назначения, такт 33 (§10.3, §11.1–11.2) ---------------------- */
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
    const o = O(cur.value)!
    groups.push({ key: 'cur', header: `Текущий · ${objName(o)}`, items: stageById[o.stageId].steps.map((x: any, k: number) => stepOption(o.id, x, k + 1)) })
  }
  STAGES.filter(s => !s.rep).forEach(s => groups.push({ key: s.id, header: s.title, items: s.steps.map((x: any) => stepOption(s.id, x, null)) }))
  const others = m.objects.filter((o: any) => o.id !== cur.value)
  if (others.length) groups.push({ key: 'others', header: 'Другие объекты', items: others.map((o: any) => objectOption(o, null)) })
  return groups
})

/* ------------------ полноэкранный просмотр, такт 34 (§11.1–11.3) ------------------ */
/** Кадры просмотра — прототип `lbList` = `visibleMedia`: медиа ленты с её фильтрами, из модели (такт 40). */
const lbFrames = computed(() => m.visibleMedia())
const viewerOpen = computed({
  get: () => m.state.lb >= 0,
  set: (v: boolean) => { if (!v) m.setViewer(-1) },
})
const viewerIdx = computed(() => Math.max(0, m.state.lb))
/**
 * Привязка кадра окна «viewer-assigned» берётся из разметки, которую прототип отрисовал для
 * этого состояния: окно снималось после привязки, в наборе данных кадр свободен.
 */
const BIND = String(H.viewerAssigned.list).match(/class="it bound" data-owner="([^"]+)" data-step="([^"]+)"/)
const bindOverride = viewerKey === 'assigned' && BIND ? { i: H.viewerAssigned.i, objId: BIND[1], stepId: BIND[2] } : null
const viewerFrame = computed(() => {
  const f = lbFrames.value[viewerIdx.value]
  return bindOverride && f?.i === bindOverride.i ? { ...f, objId: bindOverride.objId, stepId: bindOverride.stepId } : f
})
function openViewer(i: number) {
  suggestion.value = null
  m.setViewer(Math.max(0, lbFrames.value.findIndex((f: any) => f.i === i)))
}
function stepViewer(index: number) {
  suggestion.value = null
  m.setViewer(index - 1)
}
/** Прототип `lbStep`: шаг по списку просмотра в пределах первого и последнего кадра. */
function lbStep(d: number) {
  stepViewer(Math.max(0, Math.min(lbFrames.value.length - 1, viewerIdx.value + d)) + 1)
}
/** Двойной клик по плитке — прототип: снять кадр из выделения и открыть просмотр (§11.1). */
function onTileDbl(i: number) {
  m.state.sel.delete(i)
  openViewer(i)
}

/** Нижняя плашка — из данных кадра, как прототип `renderLB`. */
const bindProps = computed(() => {
  const f = viewerFrame.value
  const st = f?.objId ? ownerStage(f.objId).steps.find((x: any) => x.id === f.stepId) : null
  return {
    state: (st ? (f.lock || f.rej ? 'locked' : 'assigned') : 'free') as 'free' | 'assigned' | 'locked',
    stepName: st?.n ?? '',
    ownerName: f?.objId ? (O(f.objId) ? objName(O(f.objId)!) : ownerStage(f.objId).title) : '',
    /* «или нажмите 1–N» — только при текущем объекте: решение владельца 3, такт 34 (§16.2). */
    keys: cur.value ? stageById[O(cur.value)!.stageId].steps.length : null,
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

/* ------------------------------ привязка в просмотре, такт 41 (§11.3–11.4, §12.14) ------------------------------ */
/** Подбор шага — модель (`suggestFor`); «Не то» и любая перерисовка плашки его снимают, как прототип `renderLB`. */
const suggestion = ref<Suggestion | null>(null)
function onSuggest() {
  const f = viewerFrame.value
  if (f) suggestion.value = m.lbSuggest(f.i)
}
/** Предложение шага для плашки: имена без ключей модели. */
const barSuggestion = computed(() => {
  const sg = suggestion.value
  if (!sg) return null
  return sg.kind === 'step'
    ? { kind: 'step' as const, stepName: sg.stepName, ownerName: sg.ownerName, blocked: sg.blocked }
    : { kind: 'create' as const, title: sg.title, inv: sg.inv, stageTitle: sg.stageTitle }
})
const bindFlash = ref<number | null>(null)
/**
 * Привязка из просмотра — прототип `lbAssign`: свободный кадр — тихо, вспышка плашки и через её длительность
 * (`--duration-bind-flash`, 820 мс) следующий кадр; распределённый — окно «Перенести кадр?», после него перехода нет.
 */
let advanceTimer: ReturnType<typeof setTimeout> | undefined
function flashMs() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-bind-flash')) || 820
}
function viewerAssign(owner: string, stepId: string) {
  const f = viewerFrame.value
  if (!f) return
  const r = m.lbAssign(f.i, owner, stepId)
  if (r !== 'done') return
  suggestion.value = null
  bindFlash.value = Date.now()
  clearTimeout(advanceTimer)
  advanceTimer = setTimeout(() => { if (m.state.lb >= 0) lbStep(1) }, flashMs())
}
/** «Перенести» — тихая привязка, вспышка, кадр остаётся. */
function onMoveConfirm() {
  if (m.confirmMove()) {
    suggestion.value = null
    bindFlash.value = Date.now()
  }
}
const moveOpen = windowModel('move')
/** «Принять» предложения (Enter) — привязка к предложенному шагу. */
function onSuggestAccept() {
  const sg = suggestion.value
  if (sg?.kind === 'step' && !sg.blocked) viewerAssign(sg.owner, sg.stepId)
}
/** Пункт списка просмотра: шаг — привязка, объект — «сделать текущим», «Создать «<этап>»» — форма нового повтора с кадром. */
function onViewerSelect(it: any) {
  const [a, b] = String(it.value).split('|')
  if (it.type === 'object') { m.setCurrent(b!); suggestion.value = null; return }
  if (it.type === 'create') { const f = viewerFrame.value; m.openNewForm(b!, f ? [f.i] : []); return }
  if (it.type === 'step') viewerAssign(a!, b!)
}
/** Нажат закрытый пункт списка просмотра — прототип `#lbList`: заморожен — отказ; заполнен — `lbAssign`; привязан до вас — отказ. */
function onViewerRefuse(it: any, reason: 'frozen' | 'full' | 'locked') {
  const f = viewerFrame.value
  if (!f) return
  const [a, b] = String(it.value).split('|')
  if (reason === 'locked') m.notify(`${frameWhy(f)} — открепить нельзя`, 'err')
  else if (reason === 'frozen') m.notify('Шаг проверен и закрыт — добавить нельзя', 'err')
  else viewerAssign(a!, b!)
}
/** Открепить из просмотра — плашка и привязанный пункт списка; плашка перерисовывается. */
function onViewerUnbind() {
  const f = viewerFrame.value
  if (!f) return
  m.unassignFrame(f.i)
  suggestion.value = null
}
/** «Показать в структуре» из плашки — прототип: просмотр закрыть, через 120 мс найти шаг. */
function onViewerLocate() {
  const f = viewerFrame.value
  viewerOpen.value = false
  if (f) setTimeout(() => onLocate(f.i), 120)
}

const viewerGroups = computed(() => {
  const f = viewerFrame.value
  if (!f) return []
  const locked = f.lock || f.rej
  const bound = (owner: string, sid: string): AssignBound => (f.objId === owner && f.stepId === sid ? (locked ? 'locked' : 'here') : null)
  const groups: { id: string, title: string, repeatable?: boolean, items: any[] }[] = []
  if (cur.value) {
    const o = O(cur.value)!
    const s = stageById[o.stageId]
    groups.push({ id: s.id, title: `Текущий · ${objName(o)}`, items: s.steps.map((x: any, k: number) => stepOption(o.id, x, k + 1, bound(o.id, x.id))) })
  }
  /* Номера клавиш — только у текущего объекта (§16.3). Прототип выводит их и в группе
     «Привязан к», но клавиши 1–9 привязывают только к текущему объекту. */
  if (f.objId && O(f.objId) && f.objId !== cur.value) {
    const o = O(f.objId)!
    groups.push({ id: `bnd_${o.id}`, title: `Привязан к · ${objName(o)}`, items: stageById[o.stageId].steps.map((x: any) => stepOption(o.id, x, null, bound(o.id, x.id))) })
  }
  STAGES.filter(s => !s.rep).forEach(s => groups.push({ id: s.id, title: s.title, items: s.steps.map((x: any) => stepOption(s.id, x, null, bound(s.id, x.id))) }))
  STAGES.filter(s => s.rep).forEach((s) => {
    const list = m.objects.filter((o: any) => o.stageId === s.id && o.id !== cur.value)
    groups.push({
      id: `rep_${s.id}`,
      title: s.title,
      repeatable: true,
      items: [{ type: 'create' as const, value: `new|${s.id}`, name: s.title }, ...list.map((o: any) => objectOption(o, m.frames.filter((x: any) => x.objId === o.id).length))],
    })
  })
  return groups
})
/** Счёт в заголовке группы — число пунктов без «Создать» (прототип `grp`). */
const groupCount = (g: { items: any[] }) => String(g.items.filter(i => i.type !== 'create').length)

const assignOpen = ref(false)
/** Нажат закрытый пункт поповера — прототип `#popList`: отказ с причиной, плашка остаётся открытой (решение чата, такт 41). */
function onAssignRefuse(reason: 'frozen' | 'full' | 'locked') {
  m.notify(reason === 'full' ? 'Шаг уже заполнен' : 'Шаг проверен и закрыт — добавить нельзя', 'err')
}
/**
 * Пункт поповера (§10.3) — прототип `#popList`: шаг — привязка выделения с проверкой шага, другой объект —
 * «сделать текущим». Плашка закрывается.
 */
function onAssignSelect(value: string) {
  const [a, b] = value.split('|')
  if (a === 'obj') m.setCurrent(b!)
  else m.assignTo([...m.state.sel], a!, b!)
  assignOpen.value = false
}

const feedEl = ref<HTMLElement | null>(null)
/**
 * Число колонок ленты — правилом прототипа по ширине содержимого сетки (`frameTileColumns`), решение чата 2026-09-30,
 * такт 42: при той же ширине окна и панели колонок столько же, сколько у прототипа. До замера — `auto-fill`.
 */
const gridEl = ref<HTMLElement | null>(null)
const gridWidth = ref(0)
const gridColumns = computed(() => (gridWidth.value ? frameTileColumns(gridWidth.value, size.value) : undefined))
let gridObserver: ResizeObserver | undefined
const selbarLeft = ref('50%')
onMounted(async () => {
  /* Оснастка прогона сценариев (`scripts/free-shoot-scenarios.mjs`): модель — слепку привязок и состояния. Не продукт. */
  if (import.meta.dev) (window as any).__freeShoot = m
  /* Вспышка длится 1.5 с — оснастка повторяет её по кругу, чтобы снимок её застал. */
  /* Вспышка плашки длится 820 мс — оснастка ?open=viewer-flash повторяет её по кругу. */
  if (openWin === 'viewer-flash') {
    bindFlash.value = Date.now()
    setInterval(() => { bindFlash.value = Date.now() }, 1200)
  }
  /* Оснастка такта 40: привязка с уведомлением «Отменить» — операцией модели. */
  if (state === 'undo' && eqId) m.assign([21], eqId, 'e4')
  if (state === 'flash') {
    flashNonce.value = Date.now()
    setInterval(() => { flashNonce.value = Date.now() }, 2000)
  }
  /* Окно формы повтора — оснастка такта 36: повтор оборудования, как `openObjForm('eq', 'o2')` разбора. */
  if (openWin === 'form' || openWin === 'form-errors') openForm(eqId)
  if (openWin === 'form-group') openForm(eqId, 'Состояние и эксплуатация')
  if (openWin === 'form-errors') {
    editDraft.value = { ...editDraft.value, mark: '' }
    saveForm()
  }
  await nextTick()
  /* Целевой шаг оснастки — в центр панели, как у перехода «Показать в структуре». */
  const target = state === 'drop' ? `${eqId}|e4` : ['link', 'flash'].includes(state) ? `${LINK.owner}|${LINK.step}` : ''
  if (target) document.querySelector(`[data-step-key="${target}"]`)?.scrollIntoView({ block: 'center' })
  if (feedEl.value) {
    const measure = () => { const el = feedEl.value; if (!el) return; const cs = getComputedStyle(el); gridWidth.value = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) }
    measure()
    gridObserver = new ResizeObserver(() => { measure(); placeSelbar() })
    gridObserver.observe(feedEl.value)
  }
  /* Окно входа (№ 59): при загрузке без параметров адреса — как прототип `showEntry` (решение чата 3, такт 42). */
  if (!Object.keys(route.query).length) m.openWindow('entry')
  placeSelbar()
  /* Оснастка такта 40: рамка над первыми тремя плитками — как протяжка с поля ленты до третьего кадра. */
  if (state === 'marquee' && feedEl.value) {
    const tiles = [...feedEl.value.querySelectorAll<HTMLElement>('[data-slot=frame-tile][data-frame]')].slice(0, 3)
    const f = feedEl.value.getBoundingClientRect()
    const b = tiles[2]!.getBoundingClientRect()
    marquee.value = { x: f.left + 6, y: b.top + 20, width: b.left + b.width / 2 - f.left - 6, height: b.height / 2 - 20 }
    m.setSelection(tiles.map(t => Number(t.dataset.frame)))
  }
  window.addEventListener('resize', placeSelbar)
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('mousemove', onMarqueeMove)
  window.addEventListener('mouseup', onMarqueeEnd)
  document.addEventListener('dragend', onDragEnd)
  document.addEventListener('mouseup', onDocMouseup)
  document.addEventListener('scroll', onDocScroll, true)
  /* Оснастка `?open=move` (такт 41): кадр 21 привязан к «Узлам и агрегатам», в просмотре выбран «Органы управления» — окно № 47. */
  if (openWin === 'move' && eqId) {
    m.assign([21], eqId, 'e4', true)
    openViewer(21)
    m.lbAssign(21, eqId, 'e5')
  }
  /* Оснастка `?open=viewer-suggest`: подбор шага для кадра — моделью, как кнопка «Подобрать шаг». */
  if (viewerKey === 'suggest') onSuggest()
  if (openWin === 'assign') {
    await nextTick()
    assignOpen.value = true
  }
  /* Оснастка П6 (такт 43): форма нового повтора из выделенного, поповер «Новый объект из выделенного», «Удалить объект?»,
     полоса фрагмента над первой длинной голосовой заметкой. */
  if (openWin === 'new') m.openNewForm('eq')
  if (openWin === 'newobj') {
    await nextTick()
    newObjOpen.value = true
  }
  /* У набора оба повтора с проверенными шагами — удалить нельзя, как у прототипа; оснастка создаёт повтор без названия. */
  if (openWin === 'delete') m.askDelete(m.createObject('eq', {}).id)
  if (openWin === 'fragment') {
    const el = document.querySelector<HTMLElement>('[data-slot=feed-note][data-kind=voice][data-state] [data-slot=feed-note-text]')
    if (el) {
      /* Прокрутка прячет полосу — сначала заметка в видимую часть, полоса — после события прокрутки. */
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      await new Promise(r => setTimeout(r, 150))
      const r = el.getBoundingClientRect()
      onNoteSelect({ text: el.textContent!.trim().split(' ').slice(0, 4).join(' '), rect: { left: r.left, top: r.top, width: r.width / 3, height: 20 } })
    }
  }
})
onBeforeUnmount(() => {
  gridObserver?.disconnect()
  window.removeEventListener('resize', placeSelbar)
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('mousemove', onMarqueeMove)
  window.removeEventListener('mouseup', onMarqueeEnd)
  document.removeEventListener('dragend', onDragEnd)
  document.removeEventListener('mouseup', onDocMouseup)
  document.removeEventListener('scroll', onDocScroll, true)
})

/* ------------------------------ выделение, такт 40 (§10.1–10.2) ------------------------------ */
/** Панель выделения — по центру ленты, как прототип `renderSelbar`. */
function placeSelbar() {
  if (!feedEl.value) return
  const r = feedEl.value.getBoundingClientRect()
  selbarLeft.value = `${r.left + r.width / 2}px`
}
/** Клик по плитке: Shift — диапазон (§10.1). */
function onTileClick(i: number, e: MouseEvent | KeyboardEvent) {
  /* Рамка — жест: отпускание кнопки на плитке после протяжки клика не даёт (прототип перерисовывает ленту в mouseup). */
  if (marqueeEnded) return
  m.clickTile(i, e.shiftKey)
}

/**
 * Рамка выделения — прототип «выделение рамкой»: с пустого места ленты или с Alt с плитки; с Shift, Ctrl или ⌘
 * к прежнему выделению. Под рамкой — плитки кадров (без заметок); у края ленты — автопрокрутка по 14.
 */
const marquee = ref<{ x: number, y: number, width: number, height: number } | null>(null)
let marq: { sx: number, sy: number, base: Set<number>, moved: boolean } | null = null
let marqueeEnded = false
function onFeedMousedown(e: MouseEvent) {
  if (e.button !== 0) return
  const onCard = (e.target as HTMLElement).closest('[data-frame]')
  if (onCard && !e.altKey) return
  marq = { sx: e.clientX, sy: e.clientY, base: e.shiftKey || e.metaKey || e.ctrlKey ? new Set(m.state.sel) : new Set(), moved: false }
  marquee.value = { x: e.clientX, y: e.clientY, width: 0, height: 0 }
  e.preventDefault()
}
function onMarqueeMove(e: MouseEvent) {
  if (!marq || !feedEl.value) return
  if (Math.abs(e.clientX - marq.sx) > 3 || Math.abs(e.clientY - marq.sy) > 3) marq.moved = true
  const x = Math.min(marq.sx, e.clientX)
  const y = Math.min(marq.sy, e.clientY)
  const w = Math.abs(e.clientX - marq.sx)
  const h = Math.abs(e.clientY - marq.sy)
  marquee.value = { x, y, width: w, height: h }
  const sel = new Set(marq.base)
  feedEl.value.querySelectorAll<HTMLElement>('[data-slot=frame-tile][data-frame]').forEach((c) => {
    const b = c.getBoundingClientRect()
    if (b.right > x && b.left < x + w && b.bottom > y && b.top < y + h) sel.add(Number(c.dataset.frame))
  })
  m.setSelection(sel)
  const fr = feedEl.value.getBoundingClientRect()
  if (e.clientY - fr.top < 60) feedEl.value.scrollTop -= 14
  else if (fr.bottom - e.clientY < 60) feedEl.value.scrollTop += 14
}
function onMarqueeEnd() {
  if (!marq) return
  marq = null
  marquee.value = null
  marqueeEnded = true
  setTimeout(() => { marqueeEnded = false })
}

/* ------------------------------ перетаскивание, такт 40 (§9.5) ------------------------------ */
/** Кадры в полёте — прототип `drag`; метка под курсором — `Badge` md (решение ворот 7), вне экрана до броска. */
const dragIds = ref<number[]>([])
const ghostEl = ref<HTMLElement | null>(null)
const ghostText = ref('')
const hotStep = ref('')
function onDragStart(i: number, e: DragEvent) {
  if (marq) { e.preventDefault(); return }
  const drag = m.dragStart(i)
  dragIds.value = drag
  ghostText.value = m.dragLabel(drag)
  /* Картинка переноса снимается синхронно — текст метки ставится в узел сразу, не дожидаясь перерисовки. */
  const badge = ghostEl.value?.firstElementChild
  if (badge) badge.textContent = ghostText.value
  if (e.dataTransfer && ghostEl.value) {
    e.dataTransfer.setDragImage(ghostEl.value, 10, 10)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', drag.join(','))
  }
}
function onDragEnd() {
  dragIds.value = []
  hotStep.value = ''
}
const stepKeyOf = (e: Event) => ((e.target as HTMLElement).closest('[data-step-key]') as HTMLElement | null)?.dataset.stepKey ?? ''
/** Над панелью: шаг под курсором — цель приёма, у заполненного и замороженного приёма нет; у края — автопрокрутка. */
function onPanelDragover(e: DragEvent) {
  if (!dragIds.value.length) return
  e.preventDefault()
  const rb = e.currentTarget as HTMLElement
  const r = rb.getBoundingClientRect()
  if (e.clientY - r.top < 60) rb.scrollTop -= 14
  else if (r.bottom - e.clientY < 60) rb.scrollTop += 14
  const key = stepKeyOf(e)
  const [owner, sid] = key.split('|')
  const st = key ? m.ownerStage(owner!)?.steps.find(x => x.id === sid) : null
  const closed = !st || m.isFrozen(owner!, sid!) || m.stepFull(owner!, st)
  hotStep.value = closed ? '' : key
  if (e.dataTransfer) e.dataTransfer.dropEffect = key && closed ? 'none' : 'move'
}
/** Бросок на шаг — прототип `drop`: отказ с причиной или привязка; выделение снимается. */
function onPanelDrop(e: DragEvent) {
  const key = stepKeyOf(e)
  if (!key || !dragIds.value.length) return
  e.preventDefault()
  const [owner, sid] = key.split('|')
  m.assignTo([...dragIds.value], owner!, sid!)
  onDragEnd()
}
/** Клик по строке шага при выделении — привязка (С-08); без выделения ничего. */
function onStepSelect(owner: string, stepId: string) {
  if (m.state.sel.size) m.assignTo([...m.state.sel], owner, stepId)
}

/* ------------------------------ клавиатура, такт 40 (§16) ------------------------------ */
/**
 * Один обработчик по таблице прототипа (`keydown` документа). П3: Esc, Ctrl+Z, Ctrl+A, 1–8, Del / Backspace;
 * в просмотре — Del / Backspace. П4 (такт 41): в просмотре ← →, Enter (принять предложенный шаг) и 1–N.
 *
 * Esc по приоритету «просмотр → окно → выделение»: просмотр и окна закрывает Reka сама, поэтому обработчик
 * стоит в фазе перехвата и снимает выделение, только если ни просмотра, ни окна нет.
 */
function onKeydown(e: KeyboardEvent) {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName ?? '')
  if (e.key === 'Escape') {
    if (m.state.lb < 0 && !m.state.win) m.clearSel()
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); m.undoLast(); return }
  if (typing) return
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); m.selectAll(); return }
  const lbOpen = m.state.lb >= 0
  if (lbOpen) {
    if (e.key === 'Enter' && suggestion.value?.kind === 'step' && !suggestion.value.blocked) { e.preventDefault(); onSuggestAccept(); return }
    if (e.key === 'ArrowLeft') { lbStep(-1); return }
    if (e.key === 'ArrowRight') { lbStep(1); return }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const f = viewerFrame.value
      if (f) m.unassignViewed(f.i)
      suggestion.value = null
      return
    }
  }
  if (/^[1-9]$/.test(e.key)) {
    const n = Number(e.key)
    /* В просмотре — привязка показанного кадра к шагу текущего объекта (§11.3, §16.2). */
    if (lbOpen && m.state.cur) {
      const st = stageById[m.O(m.state.cur)!.stageId]!.steps[n - 1]
      if (st) viewerAssign(m.state.cur, st.id)
      return
    }
    m.pressDigit(n)
    return
  }
  if ((e.key === 'Backspace' || e.key === 'Delete') && m.state.sel.size) m.unassignSelection()
}

/* ------------------------------ уведомления, такт 40 (§10.6) ------------------------------ */
/** «Отменить» — прототип: действие `undoLast`, плашка снимается. */
function onUndo(id: number) {
  m.undoLast()
  m.dismissNotice(id)
}

</script>

<template>
  <!-- Тема и гарнитура — с корня документа (`:root`, `body`), как у других стендов: узла темы на экране нет. -->
  <div :class="{ 'asis-outline': asisOutline, 'asis-mark': asisMark }">
    <div>
      <!-- каркас экрана, §7 — такт 42: раскладка классами, полосы — AppBar и Toolbar, рабочая зона — Resizable -->
      <div class="flex h-screen min-w-320 flex-col overflow-hidden">
        <!-- ============================ шапка, §7 — кит, такт 42: AppBar (№ 2–7) ============================ -->
        <AppBar>
          <template #start>
            <AppBarBrand>VIEWAPP</AppBarBrand>
          </template>
          <Breadcrumb surface="dark">
            <li>
              <ButtonNavigation size="sm" muted>Осмотры</ButtonNavigation>
            </li>
            <li>
              <ButtonNavigation size="sm" muted>Демо-осмотр · мониторинг оборудования</ButtonNavigation>
            </li>
            <li>
              <ButtonNavigation size="sm" direction="none">Распределение свободной съёмки</ButtonNavigation>
            </li>
          </Breadcrumb>
          <template #end>
            <AppBarStatus :state="m.state.saving ? 'saving' : 'saved'" />
            <Button variant="sidebar" @click="hotkeysOpen = true">Горячие клавиши</Button>
            <Button @click="m.openWindow('finish')">Завершить распределение</Button>
          </template>
        </AppBar>

        <!-- ============================ подшапка, §7 — кит, такт 42: Toolbar (№ 11–14) ============================ -->
        <Toolbar class="gap-y-3 py-3">
          <!-- полоса приёмки, §13.2 — кит, такт 39: Callout warning во всю строку, текст — модель (`renderReview`) -->
          <Callout v-if="reviewBar" data-review tone="warning" :title="reviewBar.title" class="basis-full">
            {{ reviewBar.text }}
            <template #actions>
              <Checkbox v-if="reviewBar.only !== null" :model-value="reviewBar.only" @update:model-value="m.setReviewOnly(!!$event)">
                только непроверенные
              </Checkbox>
              <Button variant="secondary" size="sm" @click="m.rejectAll()">Отменить автораспределение</Button>
              <Button size="sm" @click="m.acceptAll()">Принять все объекты</Button>
            </template>
          </Callout>
          <!-- № 11 — нейтральная метка сессии (решение чата 2026-09-30, прецедент такта 26) -->
          <Chip variant="neutral" trailing="none">Свободная съёмка</Chip>
          <ToolbarText data-sess-meta>{{ sessMeta }}</ToolbarText>
          <div class="ml-auto flex items-center gap-5">
            <ProgressStat
              class="min-w-38 max-w-47.5"
              label="Кадры разложены"
              :value="S.framesText"
              :progress="{ value: S.placed, max: S.total, locked: S.pre }"
              :sub="S.framesSub"
            />
            <ProgressStat
              class="min-w-38 max-w-47.5"
              label="Обязательные шаги"
              :value="S.reqText"
              :progress="{ value: S.ok, max: S.req, locked: S.frz }"
              :sub="S.reqSub"
            />
            <ProgressStat class="min-w-38 max-w-47.5" label="Объекты" :value="S.objText" :sub="S.objSub" />
          </div>
        </Toolbar>

        <!-- ============================ рабочая зона — кит, такт 42: Resizable (№ 1, 30), панель 320–820, по умолчанию 440 ============================ -->
        <ResizablePanelGroup direction="horizontal" class="min-h-0 flex-1">
          <ResizablePanel class="flex flex-col">
            <!-- тулбар ленты, §7 — кит, такт 42: Toolbar (№ 15–21) -->
            <Toolbar>
              <Button variant="secondary" @click="m.magicWand()">Распределить автоматически</Button>
              <Button variant="secondary" @click="m.selectAll()">Выделить всё</Button>
              <div class="w-55 shrink" data-search>
                <Input v-model="search" placeholder="Поиск по расшифровкам и именам файлов…" />
              </div>
              <ToolbarText id="curHint" truncate grow align="end">{{ curHint }}</ToolbarText>
              <ToolbarGroup label="Разобранные">
                <Tabs v-model="mode">
                  <TabsList variant="pill">
                    <TabsTrigger value="keep" variant="pill">оставлять</TabsTrigger>
                    <TabsTrigger value="hide" variant="pill">убирать</TabsTrigger>
                  </TabsList>
                </Tabs>
              </ToolbarGroup>
              <ToolbarGroup label="Размер">
                <Tabs v-model="size">
                  <TabsList variant="pill">
                    <TabsTrigger value="md" variant="pill">M</TabsTrigger>
                    <TabsTrigger value="lg" variant="pill">L</TabsTrigger>
                  </TabsList>
                </Tabs>
              </ToolbarGroup>
            </Toolbar>

            <!-- лента материалов, §8 -->
            <!-- лента, §8 — такт 42: прокрутка и поля классами раскладки (№ 22), число колонок — правилом прототипа -->
            <div ref="feedEl" data-feed class="min-h-0 flex-1 overflow-auto px-4 pt-3.5 pb-32" @mousedown="onFeedMousedown" @mouseover="onFeedOver" @mouseleave="onFeedLeave">
              <div>
                <div ref="gridEl" :class="frameTileGridVariants({ size, columns: gridColumns })">
                  <Empty v-if="!feed.length" class="col-span-full" title="Ничего не найдено" description="Измените фильтр или запрос" />
                  <template v-for="f in feed" :key="f.i">
                    <FrameTile
                      v-if="f.type !== 'voice'"
                      v-bind="tileProps(f)"
                      :data-frame="f.i"
                      draggable="true"
                      @toggle-select="onTileClick(f.i, $event)"
                      @open="openViewer(f.i)"
                      @unassign="m.unassignFrame(f.i)"
                      @locate="onLocate(f.i)"
                      @dblclick="onTileDbl(f.i)"
                      @dragstart="onDragStart(f.i, $event)"
                    />
                    <!-- № 25: заметка — FeedNote, такт 43 (карточка 5); строка воспроизведения — PlayerAudio -->
                    <FeedNote
                      v-else
                      :data-frame="f.i"
                      :kind="f.kind === 'note' ? 'note' : 'voice'"
                      :time="f.t"
                      :duration="f.dur ?? ''"
                      :name="f.n"
                      :text="f.text"
                      :expanded="expandedNotes.has(f.i)"
                      @toggle="toggleNote(f.i)"
                      @copy="copyNote(f)"
                      @play="m.noteAction(f.i, 'play')"
                      @select-text="onNoteSelect"
                    />
                  </template>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle with-handle />

          <!-- панель структуры, §9 -->
          <ResizablePanel data-pane-right :default-size="440" :min-size="320" :max-size="820" size-unit="px" class="flex flex-col">
            <Tabs v-model="tab">
              <TabsList>
                <TabsTrigger value="scheme">Схема осмотра</TabsTrigger>
                <TabsTrigger value="form">Форма осмотра</TabsTrigger>
              </TabsList>
            </Tabs>

            <div ref="panelEl" data-panel class="min-h-0 flex-1 overflow-auto pb-30" @dragover="onPanelDragover" @drop="onPanelDrop" @mouseover="onPanelOver" @mouseleave="hoverPanel = null">
              <template v-if="tab === 'scheme'">
                <!-- инструменты схемы, §9.1–9.2 — кит, такт 42: Toolbar (№ 32–33), липкий поверх заголовков этапов -->
                <Toolbar data-schtools class="sticky top-0 z-20 px-3">
                  <Button variant="secondary" size="sm" @click="m.toggleAllStages()">{{ m.allClosed.value ? 'Развернуть все' : 'Свернуть все' }}</Button>
                  <Button v-if="nfrz" :variant="m.state.onlyOpen ? 'default' : 'secondary'" size="sm" @click="m.toggleOnlyOpen()">
                    {{ m.state.onlyOpen ? `Показать все (+${nfrz})` : 'Только открытые' }}
                  </Button>
                  <ToolbarText>этапов: {{ STAGES.length }} · шагов: {{ totalSteps }}{{ nfrz ? ` · заморожено ${nfrz}` : '' }}</ToolbarText>
                </Toolbar>

                <template v-for="st in visibleStages" :key="st.id">
                  <StageSection
                    :data-stage="st.id"
                    :title="st.title"
                    :repeatable="st.rep"
                    :count="st.rep ? String(m.objects.filter((o: any) => o.stageId === st.id).length) : plural(st.steps.length, 'шаг', 'шага', 'шагов')"
                    :open="!closedStages.has(st.id)"
                    :add-label="st.rep ? (st.id === 'bld' ? 'Новое здание' : 'Новая единица') : ''"
                    @toggle="toggleStage(st.id)"
                    @add="m.openNewForm(st.id, [])"
                  >
                    <template v-if="st.rep">
                      <RepeatCard
                        v-for="o in repList(st).list"
                        :key="o.id"
                        :data-obj="o.id"
                        :data-current="cur === o.id || undefined"
                        :name="objName(o)"
                        :details="objSub(o)"
                        :frames="objState(o).total"
                        :open="openObjs.has(o.id)"
                        :current="cur === o.id"
                        :suggested="o.auto"
                        :checked-steps="objState(o).frz"
                        :errors="objState(o).bad"
                        :highlighted="(state === 'link' && o.id === LINK.owner) || hoverFeed?.obj === o.id"
                        :hidden-steps="m.state.onlyOpen ? objState(o).frz : 0"
                        @header="clickRepeat(o.id)"
                        @accept="acceptRepeat(o.id)"
                        @reject="rejectRepeat(o.id)"
                      >
                        <template #form>
                          <RepeatForm
                            :fields="formFields(o)"
                            :expanded="formOpen.has(o.id)"
                            :deletable="!formPreview(o).locked && !o.auto"
                            @toggle="toggleForm(o.id)"
                            @edit="openForm(o.id, $event)"
                            @delete="m.askDelete(o.id)"
                          />
                        </template>
                        <template v-for="(x, k) in stageById[o.stageId].steps" :key="x.id">
                          <StepRow
                            v-if="!m.state.onlyOpen || !isFrozen(o.id, x.id)"
                            v-bind="stepProps(o.id, x, k)"
                            :data-step-key="`${o.id}|${x.id}`"
                            @select="onStepSelect(o.id, x.id)"
                            @thumb-open="openViewer(Number($event))"
                            @thumb-remove="m.unassignFrame(Number($event))"
                          />
                        </template>
                      </RepeatCard>
                      <StageNote v-if="!repList(st).list.length">
                        {{ repList(st).hidden ? 'Все повторы этапа проверены' : m.state.onlyOpen ? 'Все повторы этого этапа проверены и закрыты' : 'Повторов пока нет — выделите кадры и нажмите «Новый объект из выделенного»' }}
                      </StageNote>
                      <StageNote v-if="repList(st).hidden && repList(st).list.length">
                        Принято и скрыто: {{ plural(repList(st).hidden, 'объект', 'объекта', 'объектов') }}
                      </StageNote>
                    </template>
                    <div v-else class="flex flex-col gap-0.5 px-1.5 pt-1 pb-2">
                      <template v-for="(x, k) in st.steps" :key="x.id">
                        <StepRow
                          v-if="!m.state.onlyOpen || !isFrozen(st.id, x.id)"
                          v-bind="stepProps(st.id, x, k)"
                          :data-step-key="`${st.id}|${x.id}`"
                          @select="onStepSelect(st.id, x.id)"
                          @thumb-open="openViewer(Number($event))"
                          @thumb-remove="m.unassignFrame(Number($event))"
                        />
                      </template>
                    </div>
                  </StageSection>
                </template>
              </template>

              <!-- вкладка «Форма осмотра», §7 — кит, такт 42 (№ 42–43): группы — FieldSet, сверка — подсказка Field, примечание — StageNote -->
              <div v-else data-general class="flex flex-col gap-3 px-3 pt-2 pb-3">
                <FieldSet v-for="g in P.GENERAL" :key="g.g" :legend="g.g">
                  <template v-for="f in g.fields" :key="f.k">
                    <Field v-if="generalVisible(f)" :label="f.l" :hint="f.k === 'number' ? generalHint : ''">
                      <Select
                        v-if="f.opts"
                        :model-value="m.general[f.k] || EMPTY"
                        :show-icon="false"
                        placeholder=""
                        :items="formItems(f.opts)"
                        @update:model-value="m.setGeneral(f.k, $event)"
                      />
                      <Input v-else :model-value="m.general[f.k]" :show-icon="false" placeholder="" @update:model-value="m.setGeneral(f.k, $event)" />
                    </Field>
                  </template>
                </FieldSet>
                <StageNote>
                  Общая форма схемы. «Общее количество объектов по документам» вместе с «Имущество, которое не удалось осмотреть» отвечают на вопрос, всё ли обошли.
                </StageNote>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <!-- ============================ панель выделения, §10.2 — кит, такт 40 ============================ -->
      <!-- № 27: ActionBar по центру ленты; закрытая уезжает вниз, как у прототипа. «Новый объект из выделенного» (№ 29) — порция П6. -->
      <ActionBar :open="m.state.sel.size > 0" :count="m.selbar.value.count" :sub="m.selbar.value.sub" :x="selbarLeft">
        <!--
          Поповер «Назначить на шаг», §10.3 — кит, такт 33. Положение — как у прототипа (`#btnToStep`): над
          кнопкой на 8, левый край на 40 левее кнопки, от краёв окна не ближе 12. Ширина 360 и высота до 62vh — `.pop`.
        -->
        <Popover v-model:open="assignOpen">
          <PopoverTrigger as-child>
            <Button size="sm">Назначить на шаг</Button>
          </PopoverTrigger>
          <PopoverContent
            as-child
            side="top"
            align="start"
            :align-offset="-40"
            :side-offset="8"
            :collision-padding="12"
            :width="360"
          >
            <SelectContent :width="360" max-height="62vh">
              <AssignList>
                <SelectGroup v-for="g in assignGroups" :key="g.key" :header="g.header">
                  <AssignOption v-for="it in g.items" :key="it.value" v-bind="it" :data-value="it.value" @select="onAssignSelect(it.value)" @refuse="onAssignRefuse" />
                </SelectGroup>
              </AssignList>
            </SelectContent>
          </PopoverContent>
        </Popover>
        <!-- № 29: «Новый объект из выделенного» — такт 43: тот же поповер, что № 28; пункт — AssignOption type="stage" -->
        <Popover v-model:open="newObjOpen">
          <PopoverTrigger as-child>
            <Button variant="secondary" size="sm">Новый объект из выделенного</Button>
          </PopoverTrigger>
          <PopoverContent
            as-child
            side="top"
            align="start"
            :align-offset="-40"
            :side-offset="8"
            :collision-padding="12"
            :width="360"
          >
            <SelectContent :width="360" max-height="62vh">
              <AssignList>
                <SelectGroup header="Создать повтор этапа">
                  <AssignOption
                    v-for="it in m.newObjectOptions.value"
                    :key="it.stage"
                    type="stage"
                    :value="`stage|${it.stage}`"
                    :data-value="`stage|${it.stage}`"
                    :name="it.title"
                    :frames="it.count"
                    @select="onNewObject(it.stage)"
                  />
                </SelectGroup>
              </AssignList>
            </SelectContent>
          </PopoverContent>
        </Popover>
        <Button variant="secondary" size="sm" @click="m.assignMisc()">В «Прочее»</Button>
        <Button variant="secondary" size="sm" @click="m.unassignSelection()">Открепить</Button>
        <ActionBarSeparator />
        <Button variant="secondary" size="sm" @click="m.clearSel()">Снять</Button>
      </ActionBar>

      <!-- № 26: фрагмент заметки — ActionBar, второе размещение (такт 43): над выделенным текстом, §8.5 -->
      <ActionBar data-fragment :open="!!fragment" count="Новый объект:" :sub="fragment ? `«${fragment.text}»` : ''" :x="fragment?.x" :y="fragment?.y ?? '0px'">
        <Button size="sm" @click="onFragment('eq')">Оборудование</Button>
        <Button variant="secondary" size="sm" @click="onFragment('bld')">Здание</Button>
      </ActionBar>

      <!-- ============================ рамка и метка перетаскивания, §10.1, §9.5 — кит, такт 40 ============================ -->
      <SelectionMarquee v-if="marquee" :rect="marquee" />
      <!-- Метка «N кадров» — Badge md как есть (решение ворот 7), вне экрана: из неё снимается картинка переноса. -->
      <div ref="ghostEl" class="pointer-events-none fixed -top-96 -left-96">
        <Badge>{{ ghostText }}</Badge>
      </div>

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
          <FrameTitle :name="viewerFrame?.n ?? ''" :assigned="bindProps.state !== 'free'" />
        </template>
        <FrameStage :src="img(viewerFrame?.i ?? 1)" :alt="viewerFrame?.n" :assigned="bindProps.state !== 'free'">
          <FrameBindBar
            v-bind="bindProps"
            :suggestion="barSuggestion"
            :flash="bindFlash"
            @suggest="onSuggest"
            @accept="onSuggestAccept"
            @create="onSuggestCreate"
            @dismiss="suggestion = null"
            @locate="onViewerLocate"
            @unbind="onViewerUnbind"
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
              <AssignOption v-for="it in g.items" :key="it.value" v-bind="it" :data-value="it.value" @select="onViewerSelect(it)" @refuse="onViewerRefuse(it, $event)" @unbind="onViewerUnbind" />
            </AssignList>
          </StageSection>
        </template>
      </Lightbox>

      <!-- ============================ окно запуска автораспределения, §12.1–12.4 — кит, такт 39 ============================ -->
      <!-- № 48–49: ModalCard center 600, источники — ModalCardText, режимы — RadioGroupItem card, «пропущено» и «черновик» — Callout warning. -->
      <ModalCard v-model:open="wandOpen">
        <ModalCardContent>
          <ModalCardHeader title="Автораспределение" subtitle="Система предложит, вы проверите" />
          <ModalCardBody class="flex flex-col gap-3">
            <ModalCardText>
              {{ wandWindow.source.before }}<b>{{ wandWindow.source.strong }}</b>{{ wandWindow.source.after }}
            </ModalCardText>
            <RadioGroup v-model="wandMode" class="gap-2">
              <RadioGroupItem
                v-for="w in wandWindow.modes"
                :key="w.value"
                variant="card"
                :value="w.value"
                :disabled="w.disabled"
                :checked="wandMode === w.value"
              >
                {{ w.title }}
                <template #description>
                  {{ w.description }}
                </template>
                <template #meta>
                  {{ w.forecast }}
                </template>
              </RadioGroupItem>
            </RadioGroup>
            <Callout v-for="b in wandWindow.blocks" :key="b.title" :tone="b.tone" :title="b.title">
              {{ b.text }}
            </Callout>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" @click="wandOpen = false">
              Отмена
            </Button>
            <Button @click="m.launchWand(wandMode)">
              Запустить
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- ============================ сводка результата, §12.12 — кит, такт 39 ============================ -->
      <!-- № 54: ModalCard center 600, блоки — Callout, примечание — ModalCardText, кнопки — Button. -->
      <ModalCard v-model:open="summaryOpen">
        <ModalCardContent>
          <ModalCardHeader title="Автораспределение завершено" :subtitle="m.state.summary ? `Режим: ${MODE_T[m.state.summary.mode]}` : ''" />
          <ModalCardBody class="flex flex-col gap-3">
            <Callout v-for="b in m.state.summary?.blocks ?? []" :key="b.title" :tone="b.tone" :title="b.title">
              {{ b.text }}
            </Callout>
            <ModalCardText>{{ m.state.summary?.note }}</ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button
              v-for="b in m.state.summary?.buttons ?? []"
              :key="b.t"
              :variant="b.primary ? 'default' : 'secondary'"
              @click="onSummary(b.action)"
            >
              {{ b.t }}
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- ============================ «Перенести кадр?», §11.4 — кит, такт 41 ============================ -->
      <!-- № 47: ModalCard center 600, «Откуда» — Callout warning, «Куда» — Callout success, примечание — ModalCardText. -->
      <ModalCard v-model:open="moveOpen">
        <ModalCardContent>
          <ModalCardHeader title="Перенести кадр?" subtitle="Кадр уже распределён — перенос это тот же выбор шага, но с подтверждением" />
          <ModalCardBody class="flex flex-col gap-3">
            <Callout tone="warning" title="Откуда">
              {{ m.state.move?.from }}
            </Callout>
            <Callout tone="success" title="Куда">
              {{ m.state.move?.to }}
            </Callout>
            <ModalCardText>После переноса автоматического перехода к следующему кадру не будет — останетесь здесь.</ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" @click="moveOpen = false">
              Отмена
            </Button>
            <Button @click="onMoveConfirm">
              Перенести
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- ============================ сводка завершения, §17.4–17.6 — кит, такт 42 ============================ -->
      <!-- № 55: ModalCard center 600, блоки — Callout, незакрытые обязательные — список до шести и «…и ещё N», примечание — ModalCardText. -->
      <ModalCard v-model:open="finishOpen">
        <ModalCardContent>
          <ModalCardHeader title="Завершить распределение?" subtitle="Привязки уйдут в Core" />
          <ModalCardBody class="flex flex-col gap-3">
            <Callout v-for="b in m.finishWindow.value.blocks" :key="b.title" :tone="b.tone" :title="b.title">
              <ul v-if="b.list">
                <li v-for="x in b.list" :key="x">{{ x }}</li>
              </ul>
              <template v-else>
                {{ b.text }}
              </template>
            </Callout>
            <ModalCardText>{{ m.finishWindow.value.note }}</ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" @click="finishOpen = false">
              Продолжить
            </Button>
            <Button @click="m.finish()">
              Завершить
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- ============================ окно входа — кит, такт 42 ============================ -->
      <!-- № 59: прототип showEntry; сводка состояния осмотра — Callout. Переключатель сценариев прототипа не переносится (раздел 15). -->
      <ModalCard v-model:open="entryOpen">
        <ModalCardContent>
          <ModalCardHeader :title="m.entryWindow.value.title" :subtitle="m.entryWindow.value.sub" />
          <ModalCardBody class="flex flex-col gap-3">
            <Callout v-for="b in m.entryWindow.value.blocks" :key="b.title" :tone="b.tone" :title="b.title">
              {{ b.text }}
            </Callout>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" @click="entryOpen = false">
              Разложу вручную
            </Button>
            <Button @click="m.entryAuto()">
              Распределить автоматически
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- ============================ окно прогресса, §12.5 — кит, такт 35 ============================ -->
      <!-- Закрыть можно только «Прервать»: ни крестика, ни Esc, ни клика мимо (§12.5). Прерывание — модель, ничего не применяется (§12.6). -->
      <ModalCard v-model:open="progressOpen">
        <ModalCardContent :closable="false" size="sm">
          <ModalCardHeader :title="progressWindow?.title ?? ''" :subtitle="progressWindow?.sub ?? ''" />
          <ModalCardBody class="flex flex-col gap-3">
            <Progress :value="progressWindow?.value ?? 0" :max="100" label="Автораспределение" />
            <div>
              <ProgressCounter v-for="r in progressWindow?.rows ?? []" :key="r.label" :label="r.label" :value="r.value" />
            </div>
          </ModalCardBody>
          <ModalCardFooter>
            <template #note>
              Структура заблокирована до конца обработки
            </template>
            <Button variant="secondary" @click="progressOpen = false">
              Прервать
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <!-- ============================ окно «Горячие клавиши», §16 — кит, такт 35 ============================ -->
      <ModalCard v-model:open="hotkeysOpen">
        <ModalCardContent>
          <ModalCardHeader title="Горячие клавиши" subtitle="Разбор ленты с клавиатуры" />
          <ModalCardBody class="flex flex-col gap-6">
            <ShortcutList :items="HOTKEYS" />
            <ModalCardText>{{ HOTKEYS_NOTE }}</ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button @click="hotkeysOpen = false">
              Понятно
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>
    </div>

    <!-- ============================ окно формы повтора, §14.3–14.6 — кит, такт 36 ============================ -->
    <ModalCard v-model:open="editOpen">
      <ModalCardContent>
        <ModalCardHeader :title="formWin?.title ?? ''" :subtitle="formWin?.sub ?? ''" />
        <ModalCardBody>
          <FieldSet
            v-for="g in editGroups"
            :key="g.title || 'form'"
            :legend="g.title"
            :autofocus="!!editWin?.group && g.title === editWin.group"
          >
            <template v-for="f in g.fields" :key="f.k">
              <Field v-if="formVisible(f)" :data-k="f.k" orientation="left" label-width="form" :label="f.l" :required="!!f.req" :invalid="formInvalid(f)">
                <Select v-if="f.opts" v-model="editDraft[f.k]" :items="formItems(f.opts)" :show-icon="false" placeholder="" />
                <Input v-else v-model="editDraft[f.k]" :invalid="formInvalid(f)" :show-icon="false" placeholder="" />
              </Field>
            </template>
          </FieldSet>
          <!-- Подсказки распознанного на кадрах окна — прототип `.ocrhint`, такт 43: подпись — ModalCardText, пилюли — Button secondary sm -->
          <template v-if="formWin?.hints.length">
            <ModalCardText>Распознано на выделенных кадрах:</ModalCardText>
            <div data-ocr-hints class="flex flex-wrap gap-2">
              <Button v-for="h in formWin.hints" :key="h" variant="secondary" size="sm" @click="applyOcr(h)">
                {{ h }}
              </Button>
            </div>
          </template>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" @click="m.closeWindow()">
            Отмена
          </Button>
          <Button @click="saveForm">
            {{ formWin?.primary ?? 'Сохранить' }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ «Удалить объект?», §6.2 — кит, такт 43 (С-20): ModalCard + Callout ============================ -->
    <ModalCard v-model:open="deleteOpen">
      <ModalCardContent>
        <ModalCardHeader title="Удалить объект?" :subtitle="m.state.del?.name ?? ''" />
        <ModalCardBody>
          <Callout tone="warning" title="Кадры вернутся в ленту">
            Привязки будут сняты, объект удалён.
          </Callout>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" @click="m.closeWindow()">
            Отмена
          </Button>
          <Button @click="m.confirmDelete()">
            Удалить
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- Уведомления экрана: отказ «Заполните: …» (§18 form.required). Угол и тон — долг Toast. -->
    <Toaster>
      <Toast
        v-for="t in toasts"
        :key="t.id"
        :open="true"
        :duration="toastDuration(t.undo)"
        :show-action="t.undo"
        @update:open="m.dismissNotice(t.id)"
        @action="onUndo(t.id)"
      >
        {{ t.text }}
        <template v-if="t.undo" #action>
          Отменить
        </template>
      </Toast>
    </Toaster>

    <AsisMarks v-if="asisMark" />
  </div>
</template>

<style src="~/stands/free-shoot/asis.css"></style>
