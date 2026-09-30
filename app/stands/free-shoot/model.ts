import { computed, reactive } from 'vue'

/**
 * Модель состояния экрана «Распределение свободной съёмки» (VA-9265) — такт 38, порция П1.
 * Повторяет модель прототипа v17 (`docs/sources/va-9265/va-9265-v17.html`, раздел «СОСТОЯНИЕ» и
 * «ОПЕРАЦИИ») и спеку §3. План и границы — `docs/free-shoot.md`, 16.2.
 *
 * ## Границы
 *
 * - DOM и компонентов модуль не знает: только данные, чистые операции и вычисления на
 *   реактивности Vue. Прокрутка, фокус, положение плашек — страница.
 * - Отказы и подтверждения — очередь `notices` с текстами §18; показывает её страница (`Toast`).
 * - Сохранение — поле `state.saving` с таймером 700 мс, как `markSaving` прототипа (§17.2).
 * - Оснастка адреса выставляет состояние модели параметрами `createModel`.
 *
 * В П1 перенесены операции сценариев С-01–03, 16, 32, 38 (16.2); остальные операции прототипа
 * (`assign`, `unassign`, `undoLast`, `autoPlan`, `applyWand`, `acceptObj`…) — по своим порциям (16.5).
 */

export type FrameOrigin = 'free' | 'step'
export interface Frame {
  i: number
  type: 'photo' | 'video' | 'voice'
  kind: string
  t: string
  ts: string
  n: string
  k: string
  ocr: string
  dur: string | null
  text: string
  objId: string | null
  stepId: string | null
  origin: FrameOrigin
  lock: boolean
  rej: boolean
  auto: boolean
}
export interface Repeat {
  id: string
  stageId: string
  form: Record<string, string>
  auto?: boolean
  autoSrc?: Record<string, 'rec' | 'def'>
  fromInspection?: boolean
}
export interface Verdict { v: 'ok' | 'redo', at: string, by?: string, note?: string }
export interface Step { id: string, n: string, req?: boolean, min: number, max: number | null, kind: string, hint?: string }
export interface FormDef { k: string, l: string, req?: boolean, opts?: string[], dep?: { k: string, v: string }, grp?: string }
export interface Stage { id: string, title: string, rep?: boolean, steps: Step[], form?: FormDef[] }
export interface Dataset { frames: Frame[], objects: Repeat[], review: Record<string, Verdict> }

/** Окно поверх экрана: у прототипа одно (`#modal`), плюс прогресс автораспределения. */
export type ScreenWindow = null | 'hotkeys' | 'form' | 'progress' | 'wand' | 'summary' | 'finish'
export interface Notice { id: number, text: string, kind: 'ok' | 'err', undo: boolean }

export interface UiState {
  sel: Set<number>
  last: number | null
  mode: 'keep' | 'hide'
  q: string
  cur: string | null
  open: Set<string>
  closed: Set<string>
  rtab: 'scheme' | 'form'
  lb: number
  review: boolean
  reviewOnly: boolean
  onlyOpen: boolean
  formOpen: Set<string>
  /** Размер превью: у прототипа — CSS-переменная `--card` 176 / 272, в модели — состояние. */
  size: 'md' | 'lg'
  win: ScreenWindow
  /** Окно формы повтора: какой повтор и на какой группе открыто (§14.3). */
  formWin: { obj: string, group: string } | null
  saving: boolean
}

export const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100
  const k = n % 10
  return `${n} ${m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c}`
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

export interface ModelOptions {
  data: Dataset
  stages: Stage[]
  general: Record<string, string>
  /** Начальное состояние интерфейса — оснастка адреса и выбор стенда. */
  initial?: Partial<Omit<UiState, 'sel' | 'open' | 'closed' | 'formOpen'>> & { sel?: number[], open?: string[] }
}

export function createModel(opts: ModelOptions) {
  const STAGES = opts.stages
  const stageById: Record<string, Stage> = Object.fromEntries(STAGES.map(s => [s.id, s]))
  const frames = reactive(clone(opts.data.frames)) as Frame[]
  const objects = reactive(clone(opts.data.objects)) as Repeat[]
  const review = reactive(clone(opts.data.review)) as Record<string, Verdict>
  const general = reactive({ ...opts.general }) as Record<string, string>
  const init = opts.initial ?? {}

  const state = reactive<UiState>({
    sel: new Set(init.sel ?? []),
    last: init.last ?? null,
    mode: init.mode ?? 'keep',
    q: init.q ?? '',
    cur: init.cur ?? null,
    open: new Set(init.open ?? []),
    closed: new Set(),
    rtab: init.rtab ?? 'scheme',
    lb: init.lb ?? -1,
    review: init.review ?? false,
    reviewOnly: init.reviewOnly ?? true,
    onlyOpen: init.onlyOpen ?? false,
    formOpen: new Set(),
    size: init.size ?? 'md',
    win: init.win ?? null,
    formWin: init.formWin ?? null,
    saving: false,
  }) as UiState

  const notices = reactive<Notice[]>([])

  /* ------------------------------ справочные ------------------------------ */
  const isMedia = (f: Frame) => f.type !== 'voice'
  const O = (id: string | null) => objects.find(o => o.id === id) ?? null
  const freeFrames = () => frames.filter(f => isMedia(f) && f.origin === 'free')
  const ownerStage = (owner: string) => { const o = O(owner); return o ? stageById[o.stageId] : stageById[owner] }
  const objName = (o: Repeat) => (o.stageId === 'eq' ? (o.form.mark || 'Объект без названия') : (o.form.no || 'Здание без названия'))
  const objSub = (o: Repeat) => (o.stageId === 'eq'
    ? [o.form.sn ? `зав. № ${o.form.sn}` : '', o.form.inv ? `инв. ${o.form.inv}` : '', o.form.bld, o.form.use].filter(Boolean).join(' · ')
    : [o.form.purpose, o.form.cond, o.form.heat].filter(Boolean).join(' · '))
  const verdict = (o: string, s: string) => review[`${o}|${s}`] ?? null
  const isFrozen = (o: string, s: string) => verdict(o, s)?.v === 'ok'
  const objLocked = (id: string) => { const o = O(id); return !!o && stageById[o.stageId].steps.some(x => isFrozen(id, x.id)) }
  const frameWhy = (f: Frame) => (f.rej ? 'Кадр отклонён проверяющим' : f.origin === 'step' ? 'Кадр снят прямо в шаге при обычном осмотре' : 'Кадр в проверенном шаге')
  const frzSteps = () => STAGES.filter(s => !s.rep).reduce((a, s) => a + s.steps.filter(x => isFrozen(s.id, x.id)).length, 0)
    + objects.reduce((a, o) => a + stageById[o.stageId].steps.filter(x => isFrozen(o.id, x.id)).length, 0)
  const framesIn = (owner: string, stepId: string) => frames.filter(f => f.objId === owner && f.stepId === stepId)
  /** Отклонённые кадры остаются в шаге, но не занимают место (§4.2). */
  const cnt = (owner: string, stepId: string) => framesIn(owner, stepId).filter(f => !f.rej).length
  const stepOk = (owner: string, st: Step) => {
    const n = cnt(owner, st.id)
    if (st.req && n < st.min) return false
    if (st.max && n > st.max) return false
    return true
  }

  /* ------------------------------ лента (§4.3, §8) ------------------------------ */
  /** Прототип `visible`: порядок кадров — порядок данных (по времени), действия его не меняют. */
  function visible() {
    const q = state.q.trim().toLowerCase()
    return frames.filter((f) => {
      if (isMedia(f) && f.origin === 'step') return false
      if (state.mode === 'hide' && isMedia(f) && f.objId) return false
      if (q && !(`${f.ocr || ''} ${f.text || ''} ${f.n}`).toLowerCase().includes(q)) return false
      return true
    })
  }
  const feed = computed(visible)

  /* ------------------------------ подшапка (§7.1–7.2) — прототип `renderStats` ------------------------------ */
  const stats = computed(() => {
    const media = freeFrames()
    const placed = media.filter(f => f.objId).length
    const pre = media.filter(f => f.objId && f.lock).length
    let req = 0
    let ok = 0
    let frz = 0
    const acc = (owner: string, x: Step) => {
      if (!x.req) return
      req++
      if (stepOk(owner, x)) ok++
      if (isFrozen(owner, x.id)) frz++
    }
    STAGES.filter(s => !s.rep).forEach(s => s.steps.forEach(x => acc(s.id, x)))
    objects.forEach(o => stageById[o.stageId].steps.forEach(x => acc(o.id, x)))
    const nb = objects.filter(o => o.stageId === 'bld').length
    const ne = objects.filter(o => o.stageId === 'eq').length
    const lo = objects.filter(o => objLocked(o.id)).length
    return {
      total: media.length,
      placed,
      pre,
      framesText: `${placed} из ${media.length}`,
      framesSub: pre ? `${pre} привязано до вас` : '',
      req,
      ok,
      frz,
      reqText: req ? `${ok} из ${req} закрыто` : 'обязательных нет',
      reqSub: frz ? `${frz} закрыто проверкой` : '',
      objText: `${plural(nb, 'здание', 'здания', 'зданий')} · ${plural(ne, 'единица', 'единицы', 'единиц')}`,
      objSub: lo ? `${plural(lo, 'объект', 'объекта', 'объектов')} проверено` : '',
    }
  })
  const sessMeta = computed(() => {
    const media = freeFrames()
    const vid = media.filter(f => f.type === 'video').length
    const vc = frames.filter(f => !isMedia(f)).length
    return `${media.length - vid} фото · ${vid} видео · ${plural(vc, 'заметка', 'заметки', 'заметок')} · 13 июня 2018, ${media[0]?.t}–${media[media.length - 1]?.t}`
  })
  const curHint = computed(() => {
    const o = state.cur ? O(state.cur) : null
    return o ? `Текущий: ${objName(o)} · клавиши 1–${stageById[o.stageId].steps.length}` : 'Текущий объект не выбран'
  })
  /** Сверка общей формы (вкладка «Форма осмотра», поле «Общее количество объектов по документам»). */
  const eqCount = computed(() => objects.filter(o => o.stageId === 'eq').length)

  /* ------------------------------ уведомления и сохранение ------------------------------ */
  let noticeSeq = 0
  function notify(text: string, kind: 'ok' | 'err' = 'ok', undo = false) {
    /* Прототип держит не больше трёх плашек: перед новой снимает старые. */
    while (notices.length > 2) notices.shift()
    notices.push({ id: ++noticeSeq, text, kind, undo })
  }
  function dismissNotice(id: number) {
    const k = notices.findIndex(n => n.id === id)
    if (k >= 0) notices.splice(k, 1)
  }
  let savingTimer: ReturnType<typeof setTimeout> | null = null
  function markSaving() {
    state.saving = true
    if (savingTimer) clearTimeout(savingTimer)
    savingTimer = setTimeout(() => { state.saving = false }, 700)
  }

  /* ------------------------------ операции П1 ------------------------------ */
  /** §8.2 «Разобранные: оставлять / убирать». Переключение снимает выделение — прототип, обработчик `#mode`. */
  function setMode(mode: UiState['mode']) {
    state.mode = mode
    state.sel.clear()
  }
  /** §8.1 размер превью M / L. */
  function setSize(size: UiState['size']) { state.size = size }
  /** Вкладки панели: «Схема осмотра» / «Форма осмотра». */
  function setTab(tab: UiState['rtab']) { state.rtab = tab }
  /** §8.3 клик по плитке: выделение и снятие, последний кликнутый — опора диапазона. */
  function toggleSelect(i: number) {
    if (state.sel.has(i)) state.sel.delete(i)
    else state.sel.add(i)
    state.last = i
  }
  /** §9.3: клик делает повтор текущим и раскрывает; повторный клик по текущему — сворачивает. */
  function clickRepeat(id: string) {
    if (state.cur === id) {
      if (state.open.has(id)) state.open.delete(id)
      else state.open.add(id)
    }
    else {
      state.cur = id
      state.open.add(id)
    }
  }
  /** §9.1: этап сворачивается по клику в заголовок. */
  function toggleStage(id: string) {
    if (state.closed.has(id)) state.closed.delete(id)
    else state.closed.add(id)
  }
  /** §14.3: «Все поля (N)» разворачивает компактную форму. */
  function toggleForm(id: string) {
    if (state.formOpen.has(id)) state.formOpen.delete(id)
    else state.formOpen.add(id)
  }
  /** Поле общей формы; «—» — пустое значение, как у прототипа. */
  function setGeneral(k: string, v: string) { general[k] = v === '—' ? '' : v }
  function openWindow(win: Exclude<ScreenWindow, null>) { state.win = win }
  function closeWindow() { state.win = null; state.formWin = null }
  /** Окно формы повтора: без группы — форма целиком, с группой — сразу на ней (§14.3). */
  function openForm(obj: string, group = '') { state.formWin = { obj, group }; state.win = 'form' }
  /** Полноэкранный просмотр (§11): индекс кадра в списке просмотра, -1 — закрыт. */
  function setViewer(index: number) { state.lb = index }

  return {
    STAGES,
    stageById,
    frames,
    objects,
    review,
    general,
    state,
    notices,
    /* справочные */
    isMedia,
    O,
    ownerStage,
    objName,
    objSub,
    verdict,
    isFrozen,
    objLocked,
    frameWhy,
    frzSteps,
    framesIn,
    cnt,
    stepOk,
    visible,
    /* вычисления */
    feed,
    stats,
    sessMeta,
    curHint,
    eqCount,
    /* операции */
    notify,
    dismissNotice,
    markSaving,
    setMode,
    setSize,
    setTab,
    toggleSelect,
    clickRepeat,
    toggleStage,
    toggleForm,
    setGeneral,
    openWindow,
    closeWindow,
    openForm,
    setViewer,
  }
}

export type FreeShootModel = ReturnType<typeof createModel>
