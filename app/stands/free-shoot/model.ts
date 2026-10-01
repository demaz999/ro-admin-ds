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
 * В П1 перенесены операции сценариев С-01–03, 16, 32, 38 (16.2); в П2 (такт 39) — автораспределение и
 * приёмка, сценарии С-15, 27–30: `autoPlan`, `planPhotosOnly`, `magicWand`, `runWand`, `applyWand`,
 * `wandSummary`, `acceptObj`, `rejectObj`, `acceptAll`, `rejectAll`, `renderReview`. Остальные операции
 * прототипа (`assign`, `unassign`, `undoLast`…) — по своим порциям (16.5).
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
  /** Предложен автоматом и не принят (§13.1). Прототип ключ снимает (`delete f.auto`), модель — тоже. */
  auto?: boolean
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
/** Блок съёмки — `window.VA_BLOCKS` прототипа: диапазон кадров одного объекта, распознанное с кадров и заметок. */
export interface Block { a: number, b: number, kind: 'eq' | 'bld' | 'terr', inv: string, shop: string, title: string, st: string }

/** Окно поверх экрана: у прототипа одно (`#modal`), плюс прогресс автораспределения. */
export type ScreenWindow = null | 'hotkeys' | 'form' | 'progress' | 'wand' | 'summary' | 'finish' | 'move' | 'entry' | 'delete'
/** Подбор шага для кадра (§12.14) — прототип `suggestFor`: существующий шаг или новый объект. */
export type Suggestion =
  | { kind: 'step', owner: string, stepId: string, stepName: string, ownerName: string, blocked?: 'frozen' | 'full' }
  | { kind: 'create', stage: string, title: string, inv: string, stepId: string, stageTitle: string }
export interface Notice { id: number, text: string, kind: 'ok' | 'err', undo: boolean }

/** Режим автораспределения (§12.1): полное, только структура, только кадры. */
export type WandMode = 'full' | 'struct' | 'photos'
export const MODE_T: Record<WandMode, string> = { full: 'полное', struct: 'только структура', photos: 'только кадры' }
/** Идущее автораспределение (§12.5) — прототип `runWand`: доля `k` растёт по таймеру. */
/** `ids` — кадры, которые раскладывает план (прототип `frameIds`): по ним страница ведёт пролёт миниатюр (такт 45). */
export interface WandRun { mode: WandMode, total: number, notes: number, objN: number, k: number, ids: number[] }
/** Блок окна: `.sum` прототипа — тон, заголовок, текст. */
export interface WindowBlock { tone: 'success' | 'warning' | 'destructive', title: string, text: string, list?: string[] }
/** Сводка результата (§12.12) — прототип `wandSummary`, тексты собраны в момент вызова, как у прототипа. */
export interface WandSummary {
  mode: WandMode
  blocks: WindowBlock[]
  note: string
  /** Кнопки подвала: «Показать кадры без места» — при кадрах без места, «К проверке» — всегда. */
  buttons: { t: string, primary: boolean, action: 'left' | 'review' }[]
}

/**
 * «Пустой осмотр» — прототип `applyScenario('empty')` (`resetScenario`): все кадры свободной съёмки,
 * повторов и вердиктов нет. Набор для С-27 (режим «Только кадры» недоступен), `free-shoot.md`, 16.4.
 */
export function emptyDataset(data: Dataset): Dataset {
  return {
    frames: data.frames.map(({ auto: _auto, ...f }) => ({ ...f, origin: 'free' as const, objId: null, stepId: null, lock: false, rej: false })),
    objects: [],
    review: {},
  }
}

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
  /** Сколько объектов предложено последним автораспределением — «Проверено N из M» (§13.2). */
  reviewTotal: number
  onlyOpen: boolean
  formOpen: Set<string>
  /** Размер превью: у прототипа — CSS-переменная `--card` 176 / 272, в модели — состояние. */
  size: 'md' | 'lg'
  win: ScreenWindow
  /**
   * Окно формы повтора (§14.3): повтор и группа; у нового повтора (`obj: null`, П6) — этап, кадры, которые разложатся по его
   * шагам, и подставленное имя (фрагмент заметки, подбор шага). Прототип `openObjForm(stageId, objId, ids, presetName)`.
   */
  formWin: { obj: string | null, stage: string, group: string, ids: number[], preset: string } | null
  /** Окно «Удалить объект?» (§6.2, П6): повтор и его имя. */
  del: { id: string, name: string } | null
  /** Стек отмены (§10.6) — прототип `state.undo`: на операцию — прежние привязки её кадров. Глубина не ограничена. */
  undo: { i: number, o: string | null, s: string | null }[][]
  /** Окно «Перенести кадр?» (§11.4, № 47): кадр, куда, тексты «Откуда» и «Куда». */
  move: { i: number, owner: string, stepId: string, from: string, to: string } | null
  /** Идущее автораспределение — окно прогресса (§12.5). */
  run: WandRun | null
  /** Сводка результата автораспределения — окно `summary` (§12.12). */
  summary: WandSummary | null
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
  /** Блоки съёмки для автораспределения — `window.VA_BLOCKS` прототипа. */
  blocks?: Block[]
  /**
   * Сценарий исходного состояния — прототип `scen`: окно входа говорит о нём. `review` — «Частично проверен»; `empty` —
   * осмотр до распределения: ничего не привязано, проверенных шагов и повторов нет (такт 55: он же обычный сценарий экрана).
   */
  scenario?: 'review' | 'empty'
  /** Начальное состояние интерфейса — оснастка адреса и выбор стенда. */
  initial?: Partial<Omit<UiState, 'sel' | 'open' | 'closed' | 'formOpen' | 'undo' | 'move' | 'del'>> & { sel?: number[], open?: string[] }
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
    reviewTotal: init.reviewTotal ?? 0,
    onlyOpen: init.onlyOpen ?? false,
    formOpen: new Set(),
    size: init.size ?? 'md',
    win: init.win ?? null,
    formWin: init.formWin ?? null,
    undo: [],
    move: null,
    del: null,
    run: null,
    summary: null,
    saving: false,
  }) as UiState

  const notices = reactive<Notice[]>([])
  const BLOCKS = opts.blocks ?? []
  /** Прототип `frameByI` — кадр по номеру; элементы реактивного массива, запись идёт в модель. */
  const frameByI: Record<number, Frame> = Object.fromEntries(frames.map(f => [f.i, f]))
  /** Прототип `objSeq`: номер следующего повтора продолжает уже выданные (`o1`, `o2` набора → `o3`). */
  let objSeq = objects.reduce((a, o) => Math.max(a, Number(o.id.slice(1)) || 0), 0)

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
    return o ? `Текущий: ${objName(o)}` : 'Текущий объект не выбран'
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
  function closeWindow() { state.win = null; state.formWin = null; state.del = null }
  /** Окно формы повтора: без группы — форма целиком, с группой — сразу на ней (§14.3). */
  function openForm(obj: string, group = '') {
    state.formWin = { obj, stage: O(obj)!.stageId, group, ids: [], preset: '' }
    state.win = 'form'
  }
  /** Полноэкранный просмотр (§11): индекс кадра в списке просмотра, -1 — закрыт. */
  function setViewer(index: number) { state.lb = index }

  /* ------------------------------ П2: повторы ------------------------------ */
  /** Прототип `createObject`: новый повтор становится текущим и раскрывается. */
  function createObject(stageId: string, form: Record<string, string>) {
    objects.push({ id: `o${++objSeq}`, stageId, form: { ...form } })
    const o = objects[objects.length - 1]!
    state.cur = o.id
    state.open.add(o.id)
    return o
  }

  /* ------------------------------ П6: создание, форма, удаление (§6.2, §10, §14) ------------------------------ */
  /** Прототип `lastBuilding`: здание последнего повтора «Здания» подставляется новой единице оборудования. */
  const lastBuilding = () => { const b = objects.filter(o => o.stageId === 'bld'); return b.length ? objName(b[b.length - 1]!) : '' }
  /** Прототип `autoStep`: шаг этапа, в который ляжет кадр нового повтора. */
  function autoStep(stageId: string, f: Frame) {
    if (f.type === 'video') return stageId === 'eq' ? 'e8' : null
    if (stageId === 'eq') return f.k === 'plate' ? 'e1' : f.k === 'inv' ? 'e2' : f.k === 'status' ? 'e6' : 'e3'
    if (stageId === 'bld') return f.k === 'building' ? 'b1' : 'b2'
    return null
  }
  /**
   * Новый повтор (§10, С-19) — прототип `openObjForm` без объекта: этап, кадры (по умолчанию — выделенные) и имя. Кнопки:
   * «Новый объект из выделенного» (№ 29), «+ Новый объект» этапа (№ 35, без кадров; до такта 56 — «+ Новая единица», «+ Новое здание»), фрагмент заметки (№ 26, с именем),
   * «Новый объект» просмотра (с кадром просмотра; до такта 56 — «Создать „этап“»).
   */
  function openNewForm(stage: string, ids?: number[], preset = '') {
    state.formWin = { obj: null, stage, group: '', ids: ids ?? [...state.sel], preset }
    state.win = 'form'
  }
  /** Окно формы (§14.3–14.6): заголовок, подпись, начальные значения и подсказки распознанного — прототип `openObjForm`. */
  const formWindow = computed(() => {
    const w = state.formWin
    if (!w) return null
    const o = w.obj ? O(w.obj) : null
    const stage = stageById[w.stage]!
    const sel = w.ids.map(i => frameByI[i]).filter((f): f is Frame => !!f)
    const init: Record<string, string> = o ? { ...o.form } : {}
    if (!o) {
      const p = sel.find(f => f.k === 'plate')
      const inv = sel.find(f => f.k === 'inv')
      const bl = sel.find(f => f.k === 'building')
      if (w.stage === 'eq') {
        if (p) init.mark = p.ocr
        if (inv) { const m = inv.ocr.match(/(\d[\d/]{2,})/); if (m) init.inv = m[1]! }
        init.bld = lastBuilding(); init.cond = 'Рабочее'; init.mount = 'Установлено'; init.use = 'Эксплуатируется'; init.def = 'Не выявлены'
      }
      else {
        if (bl) init.no = bl.ocr
        init.purpose = 'Производственный цех'; init.cond = 'Удовлетворительное'; init.access = 'Да'
      }
      if (w.preset) { if (w.stage === 'eq') init.mark = w.preset; else init.no = w.preset }
    }
    return {
      title: `${o ? 'Форма' : 'Новый повтор'} · ${stage.title}`,
      sub: !o && sel.length ? `${plural(sel.length, 'выделенный кадр', 'выделенных кадра', 'выделенных кадров')} разложится по шагам этапа` : 'Динамическая форма повторяемого этапа',
      init,
      hints: sel.filter(f => f.ocr).slice(0, 6).map(f => f.ocr),
      primary: o ? 'Сохранить' : 'Создать',
    }
  })
  /**
   * «Сохранить» / «Создать» окна формы (С-18, С-19) — прототип: «—» — пустое значение; пустые обязательные — отказ §18
   * `form.required`, окно открыто, возвращаются поля; иначе форма повтора сохраняется («Форма сохранена») либо создаётся
   * новый повтор, кадры окна раскладываются по шагам этапа, выделение снимается («Создан «…»»).
   */
  function submitForm(raw: Record<string, string>): FormDef[] {
    const w = state.formWin
    if (!w) return []
    const stage = stageById[w.stage]!
    const form = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === '—' ? '' : v.trim()]))
    const need = (stage.form ?? []).filter(f => f.req && !form[f.k])
    if (need.length) {
      notify(`Заполните: ${need.map(f => f.l).join(', ')}`, 'err')
      return need
    }
    const o = w.obj ? O(w.obj) : null
    if (o) {
      o.form = form
      markSaving()
      notify('Форма сохранена')
    }
    else {
      const ob = createObject(w.stage, form)
      w.ids.forEach((i) => {
        const f = frameByI[i]
        const st = f ? autoStep(w.stage, f) : null
        if (f && st) { f.objId = ob.id; f.stepId = st }
      })
      state.sel.clear()
      markSaving()
      notify(`Создан «${objName(ob)}»`)
    }
    closeWindow()
    return []
  }
  /** «Новый объект из выделенного» (№ 29) — прототип `#btnNewObj`: повторяемые этапы и число их повторов. */
  const newObjectOptions = computed(() => STAGES.filter(s => s.rep).map(s => ({ stage: s.id, title: s.title, count: objects.filter(o => o.stageId === s.id).length })))
  /** «Удалить» формы повтора (С-20) — прототип: при проверенных шагах отказ, иначе окно «Удалить объект?». */
  function askDelete(id: string) {
    if (objLocked(id)) { notify('В объекте есть проверенные шаги — удалить нельзя', 'err'); return }
    state.del = { id, name: objName(O(id)!) }
    state.win = 'delete'
  }
  /** Прототип `deleteObject`: кадры возвращаются в ленту, текущим становится последний повтор. */
  function deleteObject(id: string) {
    frames.forEach((f) => { if (f.objId === id) { f.objId = null; f.stepId = null } })
    objects.splice(objects.findIndex(o => o.id === id), 1)
    if (state.cur === id) state.cur = objects.length ? objects[objects.length - 1]!.id : null
    markSaving()
  }
  /** «Удалить» окна «Удалить объект?» — повтор удаляется, «Объект удалён». */
  function confirmDelete() {
    const d = state.del
    closeWindow()
    if (!d) return
    deleteObject(d.id)
    notify('Объект удалён')
  }
  /** Кнопки заметки (С-33) — прототип, обработчик ленты: «Копировать» и воспроизведение отвечают уведомлением. */
  function noteAction(i: number, act: 'copy' | 'play') {
    const f = frameByI[i]
    if (!f) return
    notify(act === 'copy' ? 'Текст скопирован' : f.kind === 'note' ? 'Текстовая заметка' : 'Воспроизведение (демо)')
  }

  /* ------------------------------ П2: автораспределение (§12) ------------------------------ */
  type PlanObj = { stageId: string, form: Record<string, string>, frames: { i: number, stepId: string }[] }
  type Place = { i: number, owner: string, stepId: string }
  type Plan = { objs: PlanObj[], loose: Place[], skipped: number[] }
  type PhotosPlan = { place: Place[], nomatch: number[], skipped: number[] }

  const autoStepEq = (f: Frame) => (f.type === 'video' ? 'e8' : f.k === 'plate' ? 'e1' : f.k === 'inv' ? 'e2' : f.k === 'status' ? 'e6' : 'e3')
  /** Прототип `autoPlan`: блоки съёмки → предложенные повторы, кадры общих шагов, пропущенные (шаг заморожен). */
  function autoPlan(): Plan {
    const objs: PlanObj[] = []
    const loose: Place[] = []
    const skipped: number[] = []
    BLOCKS.forEach((b) => {
      const ids: number[] = []
      for (let i = b.a; i <= b.b; i++) {
        const f = frameByI[i]
        if (f && isMedia(f) && f.origin === 'free' && !f.objId) ids.push(i)
      }
      if (!ids.length) return
      if (b.kind === 'eq' && !b.inv) return // номер не распознан — оставляем эксперту
      if (b.kind === 'eq') {
        objs.push({
          stageId: 'eq',
          form: { mark: b.title, inv: b.inv || '', shop: b.shop || '', cond: 'Рабочее', mount: 'Установлено', use: b.st ? 'Консервация' : 'Эксплуатируется', def: 'Не выявлены', bld: '' },
          frames: ids.map(i => ({ i, stepId: autoStepEq(frameByI[i]!) })),
        })
      }
      else if (b.kind === 'bld') {
        objs.push({
          stageId: 'bld',
          form: { no: b.shop || b.title, purpose: 'Производственный цех', cond: 'Удовлетворительное', access: 'Да' },
          frames: ids.map(i => ({ i, stepId: frameByI[i]!.k === 'building' ? 'b1' : 'b2' })),
        })
      }
      else {
        ids.forEach((i) => {
          const sid = frameByI[i]!.k === 'plan' ? 'g1' : 'g4'
          if (isFrozen('gen', sid)) { skipped.push(i); return } // шаг проверен и закрыт
          loose.push({ i, owner: 'gen', stepId: sid })
        })
      }
    })
    return { objs, loose, skipped }
  }
  /**
   * Прототип `planPhotosOnly` — режим «только кадры»: в уже существующие объекты, новых не создаёт.
   * Совпадение — по инвентарному номеру или названию; без совпадения кадр остаётся в ленте.
   */
  function planPhotosOnly(): PhotosPlan {
    const { objs, loose, skipped } = autoPlan()
    const place: Place[] = []
    const nomatch: number[] = []
    const cap: Record<string, number> = {}
    const room = (owner: string, st: Step) => {
      const k = `${owner}|${st.id}`
      if (!(k in cap)) cap[k] = st.max ? st.max - cnt(owner, st.id) : Number.POSITIVE_INFINITY
      return cap[k]!
    }
    objs.forEach((b) => {
      const same = (x: Repeat) => x.stageId === b.stageId
      const o = b.stageId === 'eq'
        ? (b.form.inv && objects.find(x => same(x) && x.form.inv === b.form.inv)) || objects.find(x => same(x) && !x.form.inv && x.form.mark === b.form.mark)
        : objects.find(x => same(x) && x.form.no === b.form.no)
      if (!o) { nomatch.push(...b.frames.map(f => f.i)); return }
      b.frames.forEach((f) => {
        const st = stageById[o.stageId]!.steps.find(x => x.id === f.stepId)!
        if (isFrozen(o.id, f.stepId) || room(o.id, st) <= 0) { skipped.push(f.i); return }
        cap[`${o.id}|${st.id}`]!--
        place.push({ i: f.i, owner: o.id, stepId: f.stepId })
      })
    })
    return { place: [...loose, ...place], nomatch, skipped }
  }

  /** Окно запуска (§12.1–12.4) — тексты и прогнозы прототипа `magicWand`, считаются от текущих данных. */
  const wandWindow = computed(() => {
    const plan = autoPlan()
    const nFull = plan.loose.length + plan.objs.reduce((a, o) => a + o.frames.length, 0)
    const ne = plan.objs.filter(o => o.stageId === 'eq').length
    const nb = plan.objs.filter(o => o.stageId === 'bld').length
    const po = planPhotosOnly()
    const notes = frames.filter(f => !isMedia(f)).length
    const eqT = plural(ne, 'единица', 'единицы', 'единиц')
    const bT = plural(nb, 'здание', 'здания', 'зданий')
    const blocks: WindowBlock[] = []
    if (plan.skipped.length) blocks.push({ tone: 'warning', title: `${plural(plan.skipped.length, 'кадр', 'кадра', 'кадров')} пропущено`, text: 'Их шаги проверены и закрыты — туда автомат не пишет.' })
    blocks.push({ tone: 'warning', title: 'Результат — черновик', text: 'Ничего не применится, пока вы не проверите объекты. Пока идёт обработка, структуру редактировать нельзя — операцию можно прервать.' })
    return {
      empty: !nFull && !plan.objs.length,
      source: {
        before: 'Будет прочитано: ',
        strong: plural(notes, 'заметка', 'заметки', 'заметок'),
        after: ' — голосовые и текстовые; надписи на кадрах — шильдики, инвентарные номера, таблички; хронология съёмки.',
      },
      modes: [
        {
          value: 'full' as WandMode,
          title: 'Полное автораспределение',
          description: 'Создаст повторы, заполнит часть их форм и разложит кадры. Максимум изменений — и больше всего проверки потом.',
          forecast: `${plural(nFull, 'кадр', 'кадра', 'кадров')} · ${eqT} оборудования · ${bT}`,
          disabled: false,
        },
        {
          value: 'struct' as WandMode,
          title: 'Только структура',
          description: 'Создаст повторы и заполнит формы по заметкам и надписям. Кадры не трогает: сначала проверяете список объектов, потом отдельно раскладываете.',
          forecast: `${eqT} оборудования · ${bT} · кадры остаются в ленте`,
          disabled: false,
        },
        {
          value: 'photos' as WandMode,
          title: 'Только кадры',
          description: 'Разложит по уже существующим шагам и повторам. Новых объектов не создаёт, состав осмотра не меняет.',
          forecast: objects.length
            ? `${plural(po.place.length, 'кадр', 'кадра', 'кадров')} в ${plural(objects.length, 'объект', 'объекта', 'объектов')}${po.nomatch.length ? ` · ${po.nomatch.length} без подходящего объекта` : ''}`
            : 'в осмотре пока нет повторов',
          disabled: !objects.length,
        },
      ],
      blocks,
    }
  })

  /** «Распределить автоматически» (№ 16) — прототип `magicWand`: окно запуска или отказ «Нечего распределять». */
  function magicWand() {
    if (wandWindow.value.empty) { notify('Нечего распределять автоматически'); return }
    state.win = 'wand'
  }
  let wandTimer: ReturnType<typeof setInterval> | null = null
  /** «Запустить» окна запуска: окно закрывается, обработка стартует через 60 мс — как у прототипа. */
  function launchWand(mode: WandMode) {
    closeWindow()
    setTimeout(() => runWand(mode), 60)
  }
  /**
   * Прототип `runWand` (§12.5): план считается при запуске, доля растёт по таймеру 40 мс за
   * `min(4600, 1500 + total × 16)` мс, в конце — `applyWand` с тем же планом. `hold` — оснастка
   * приёмки: окно прогресса на заданной доле, без таймера.
   */
  function runWand(mode: WandMode, hold?: number) {
    const plan = autoPlan()
    const po = mode === 'photos' ? planPhotosOnly() : null
    const notes = frames.filter(f => !isMedia(f)).length
    const frameIds = mode === 'full'
      ? [...plan.loose.map(x => x.i), ...plan.objs.flatMap(o => o.frames.map(f => f.i))]
      : mode === 'photos' ? po!.place.map(x => x.i) : []
    const objN = mode === 'photos' ? objects.length : plan.objs.length
    const total = mode === 'struct' ? objN : frameIds.length
    state.run = { mode, total, notes, objN, k: hold ?? 0, ids: frameIds }
    state.win = 'progress'
    if (hold !== undefined) return
    const dur = Math.min(4600, 1500 + total * 16)
    const t0 = Date.now()
    if (wandTimer) clearInterval(wandTimer)
    wandTimer = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / dur)
      if (state.run) state.run.k = k
      if (k >= 1) {
        clearInterval(wandTimer!)
        wandTimer = null
        state.run = null
        state.win = null
        applyWand(mode, plan, po)
      }
    }, 40)
  }
  /** «Прервать» (§12.6): таймер снят, окно закрыто, ничего не применено. */
  function abortWand() {
    if (wandTimer) clearInterval(wandTimer)
    wandTimer = null
    state.run = null
    state.win = null
    notify('Автораспределение прервано — ничего не применено')
  }
  /** Окно прогресса — строки прототипа `runWand`. */
  const progressWindow = computed(() => {
    const r = state.run
    if (!r) return null
    const rows = [
      { label: r.mode === 'struct' ? 'Объектов создано' : 'Кадров обработано', value: `${Math.round(r.total * r.k)} / ${r.total}` },
      { label: 'Заметок прочитано', value: `${Math.round(r.notes * Math.min(1, r.k * 1.7))} / ${r.notes}` },
    ]
    if (r.mode !== 'struct') rows.push({ label: r.mode === 'photos' ? 'Объектов сопоставлено' : 'Объектов создано', value: `${Math.round(r.objN * Math.min(1, r.k * 1.25))} / ${r.objN}` })
    return { title: 'Автораспределение', sub: `режим: ${MODE_T[r.mode]}`, value: r.k * 100, rows }
  })
  /** Прототип `applyWand`: предложенные повторы и кадры с меткой `auto`, режим приёмки, сводка. */
  function applyWand(mode: WandMode, plan: Plan, po: PhotosPlan | null) {
    let nObj = 0
    let nFr = 0
    let nomatch = 0
    if (mode !== 'photos') {
      plan.objs.forEach((o) => {
        const ob = createObject(o.stageId, o.form)
        ob.auto = true
        const REC = new Set(['mark', 'inv', 'shop', 'no']) // распознано на кадрах или в заметках
        ob.autoSrc = {}
        Object.keys(o.form).forEach((k) => { if (o.form[k]) ob.autoSrc![k] = REC.has(k) ? 'rec' : 'def' })
        nObj++
        if (mode === 'full') o.frames.forEach((x) => { const f = frameByI[x.i]!; f.objId = ob.id; f.stepId = x.stepId; f.auto = true; nFr++ })
      })
      if (mode === 'full') plan.loose.forEach((x) => { const f = frameByI[x.i]!; f.objId = x.owner; f.stepId = x.stepId; f.auto = true; nFr++ })
    }
    else {
      po!.place.forEach((x) => { const f = frameByI[x.i]!; f.objId = x.owner; f.stepId = x.stepId; f.auto = true; nFr++ })
      nomatch = po!.nomatch.length
    }
    objects.forEach((o) => { if (o.auto) state.open.delete(o.id) })
    state.cur = null
    state.review = true
    state.reviewOnly = true
    state.reviewTotal = objects.filter(o => o.auto).length
    markSaving()
    wandSummary(mode, nObj, nFr, nomatch, po ? po.skipped.length : plan.skipped.length)
  }
  /** Применить автораспределение сразу, без окон и таймера — оснастка приёмки (`?view=review`, `?open=summary`). */
  function applyWandNow(mode: WandMode) {
    applyWand(mode, autoPlan(), mode === 'photos' ? planPhotosOnly() : null)
  }
  /** Прототип `wandSummary` (§12.12): тексты собираются в момент вызова. */
  function wandSummary(mode: WandMode, nObj: number, nFr: number, nomatch: number, skipped: number) {
    const objs = mode === 'photos' ? objects.length : nObj
    const head = mode === 'struct'
      ? `Предложено ${plural(nObj, 'объект', 'объекта', 'объектов')}, кадры не тронуты`
      : `Предложено: ${plural(nFr, 'кадр', 'кадра', 'кадров')} в ${plural(objs, 'объект', 'объекта', 'объектов')}`
    const next = mode === 'struct'
      ? 'Проверьте список объектов: названия, формы, лишние. Примите каждый или отклоните. Потом запустите автораспределение в режиме «Только кадры».'
      : mode === 'photos'
        ? 'Проверьте кадры в объектах справа. Каждую фотографию подтверждать не нужно — если объект выглядит правильно, примите его целиком.'
        : 'Проверьте созданные объекты справа: примите или отклоните, поправьте названия и формы. Спорные кадры перетащите. Каждую фотографию отдельно подтверждать не нужно — принятие объекта принимает и его кадры.'
    const left = frames.filter(f => isMedia(f) && f.origin === 'free' && !f.objId).length
    const blocks: WindowBlock[] = [{ tone: 'success', title: head, text: next }]
    if (nomatch) blocks.push({ tone: 'warning', title: `${plural(nomatch, 'кадр', 'кадра', 'кадров')} без подходящего объекта`, text: 'Похожи на оборудование, которого нет в осмотре. Остались в ленте — создайте объект из них вручную или запустите «Только структура».' })
    if (skipped) blocks.push({ tone: 'warning', title: `${plural(skipped, 'кадр', 'кадра', 'кадров')} пропущено`, text: 'Шаги проверены и закрыты или уже заполнены до лимита.' })
    if (mode !== 'struct' && left - nomatch > 0) blocks.push({ tone: 'warning', title: `${plural(left, 'кадр', 'кадра', 'кадров')} осталось в ленте`, text: 'Идентификатор не распознан — автомат не угадывает. Разберите их вручную или оставьте в свободной съёмке.' })
    const buttons: WandSummary['buttons'] = [{ t: 'К проверке', primary: true, action: 'review' }]
    if (left) buttons.unshift({ t: 'Показать кадры без места', primary: false, action: 'left' })
    state.summary = { mode, blocks, note: 'Черновик сохраняется автоматически. Пока вы не завершите распределение, всё можно изменить.', buttons }
    state.win = 'summary'
  }
  /**
   * Кнопки сводки: «К проверке» — первый предложенный становится текущим и раскрывается; «Показать кадры
   * без места» — «Разобранные: убирать». Окно закрывается. Возвращает повтор, к которому странице прокрутить панель.
   */
  function summaryAction(action: 'left' | 'review') {
    let reveal: string | null = null
    if (action === 'review') {
      const n = objects.find(o => o.auto)
      if (n) { state.cur = n.id; state.open.add(n.id); reveal = n.id }
    }
    else setMode('hide')
    closeWindow()
    return reveal
  }

  /* ------------------------------ П2: приёмка (§13) ------------------------------ */
  /** Полоса приёмки (№ 8) — прототип `renderReview`; `null` — полосы нет. */
  const reviewBar = computed(() => {
    const n = frames.filter(f => f.auto).length
    const mm = objects.filter(o => o.auto).length
    if (!state.review || !(n > 0 || mm > 0)) return null
    const done = state.reviewTotal - mm
    return {
      title: mm ? `Проверка: осталось ${plural(mm, 'объект', 'объекта', 'объектов')}` : `Проверка: ${plural(n, 'кадр', 'кадра', 'кадров')} в общих шагах`,
      text: `${state.reviewTotal ? `Проверено ${done} из ${state.reviewTotal}. ` : ''}Принятый объект сворачивается и уходит из списка; его кадры принимаются вместе с ним`,
      /** «только непроверенные» — есть, пока остались предложенные объекты. */
      only: mm ? state.reviewOnly : null,
    }
  })
  /** «только непроверенные» (№ 9). */
  function setReviewOnly(v: boolean) { state.reviewOnly = v }
  /** «Принять все объекты» — прототип `acceptAll`. */
  function acceptAll() {
    objects.forEach((o) => { delete o.auto; delete o.autoSrc })
    frames.forEach((f) => { delete f.auto })
    state.review = false
    markSaving()
    notify('Все объекты приняты')
  }
  /** «Отменить автораспределение» — прототип `rejectAll`: снимает непринятое, принятые остаются. */
  function rejectAll() {
    frames.forEach((f) => { if (f.auto) { f.objId = null; f.stepId = null; delete f.auto } })
    for (let i = objects.length - 1; i >= 0; i--) if (objects[i]!.auto) objects.splice(i, 1)
    state.review = false
    state.cur = null
    markSaving()
    notify('Непринятое отменено — принятые объекты остались')
  }
  /**
   * «Принять объект» — прототип `acceptObj`: объект сворачивается, открывается следующий непроверенный;
   * последний принятый заканчивает режим приёмки. Возвращает следующий — странице прокрутить к нему.
   */
  function acceptObj(id: string) {
    const o = O(id)
    if (!o) return null
    delete o.auto
    delete o.autoSrc
    frames.forEach((f) => { if (f.objId === id) delete f.auto })
    state.open.delete(id)
    const next = objects.find(x => x.auto)
    if (next) { state.cur = next.id; state.open.add(next.id) }
    else state.cur = null
    if (!objects.some(x => x.auto) && !frames.some(f => f.auto)) { state.review = false; notify('Все объекты проверены') }
    markSaving()
    return next?.id ?? null
  }
  /** «Отклонить» — прототип `rejectObj`: кадры объекта возвращаются в ленту, объект удаляется. */
  function rejectObj(id: string) {
    frames.forEach((f) => { if (f.objId === id) { f.objId = null; f.stepId = null; delete f.auto } })
    const i = objects.findIndex(o => o.id === id)
    if (i >= 0) objects.splice(i, 1)
    const next = objects.find(x => x.auto)
    if (next) { state.cur = next.id; state.open.add(next.id) }
    else if (state.cur === id) state.cur = null
    if (!objects.some(x => x.auto) && !frames.some(f => f.auto)) state.review = false
    markSaving()
    return next?.id ?? null
  }

  /* ------------------------------ П3: выделение (§10.1–10.2) ------------------------------ */
  /** Прототип `visibleMedia`: кадры ленты без заметок — порядок выделения диапазоном и «Выделить всё». */
  const visibleMedia = () => visible().filter(isMedia)
  /** Прототип `selectRange`: от последнего кликнутого до `to` по порядку ленты; без опоры — только `to`. */
  function selectRange(to: number) {
    const l = visibleMedia().map(f => f.i)
    const a = l.indexOf(state.last ?? -1)
    const b = l.indexOf(to)
    if (a < 0 || b < 0) { state.sel.add(to); return }
    const [s, e] = a < b ? [a, b] : [b, a]
    for (let k = s; k <= e; k++) state.sel.add(l[k]!)
  }
  /** Клик по плитке (§8.3): с Shift — диапазон, иначе переключение; кликнутый — опора диапазона. */
  function clickTile(i: number, shift = false) {
    if (shift) selectRange(i)
    else if (state.sel.has(i)) state.sel.delete(i)
    else state.sel.add(i)
    state.last = i
  }
  /** «Выделить всё» и Ctrl+A — прототип `#btnSelAll`: всё видимое, повторно — снять видимое. */
  function selectAll() {
    const l = visibleMedia().map(f => f.i)
    const all = l.every(i => state.sel.has(i))
    if (all) l.forEach(i => state.sel.delete(i))
    else l.forEach(i => state.sel.add(i))
  }
  /** «Снять», Esc — прототип `clearSel`. */
  function clearSel() { state.sel.clear() }
  /** Рамка (§10.1): выделение = основа (с Shift, Ctrl, ⌘ — прежнее) плюс кадры под рамкой; геометрию считает страница. */
  function setSelection(ids: Iterable<number>) {
    state.sel.clear()
    for (const i of ids) state.sel.add(i)
  }
  /** Панель выделения (№ 27) — прототип `renderSelbar`: строка счёта и подпись. */
  const selbar = computed(() => {
    const n = state.sel.size
    const arr = [...state.sel].map(i => frameByI[i]!).filter(Boolean)
    const done = arr.filter(f => f.objId).length
    const vd = arr.filter(f => f.type === 'video').length
    return {
      n,
      count: plural(n, 'кадр выбран', 'кадра выбрано', 'кадров выбрано'),
      sub: [vd ? `${vd} видео` : '', done ? `${done} уже распределено` : ''].filter(Boolean).join(' · '),
    }
  })

  /* ------------------------------ П3: привязка и отмена (§6, §9.5, §10.3–10.6) ------------------------------ */
  const stepOf = (owner: string, stepId: string) => ownerStage(owner)?.steps.find(s => s.id === stepId) ?? null
  /** Прототип `stepFull`: у шага с верхним пределом места нет. */
  const stepFull = (owner: string, st: Step) => !!(st.max && cnt(owner, st.id) >= st.max)
  const ownerLabel = (owner: string) => { const o = O(owner); return o ? objName(o) : ownerStage(owner)?.title ?? '' }
  /**
   * Тип кадра и шаг — такт 55, решение владельца 2026-10-01: шаг «только фото» видео не принимает, шаг «только видео» —
   * фото. Причина известна заранее, до нажатия: пункт назначения выключен, причина — в его подсказке; при перетаскивании
   * неподходящий шаг приглушён. Пусто — шаг принимает все кадры `ids`. Тексты отказа — §18 (`assign`).
   */
  function kindRefusal(owner: string, stepId: string, ids: number[]) {
    const st = stepOf(owner, stepId)
    if (!st || !ids.length) return ''
    const video = st.kind === 'Видео'
    const fs = ids.map(i => frameByI[i]).filter((f): f is Frame => !!f)
    const wrong = fs.filter(f => video !== (f.type === 'video')).length
    if (!wrong) return ''
    const only = video ? 'Шаг принимает только видео' : 'Шаг принимает только фото'
    return wrong === fs.length ? only : `${only} — в выделении есть ${video ? 'фото' : 'видео'}`
  }
  /**
   * Прототип `assign`: отказы с причиной (§6.1, тексты §18) — заморожен, не тот тип, сверх предела; иначе
   * прежние привязки — в стек отмены, кадры — в шаг, «N кадров → «шаг» · объект» с «Отменить».
   */
  function assign(ids: number[], owner: string, stepId: string, silent = false) {
    const stage = ownerStage(owner)
    if (!stage) return false
    const st = stage.steps.find(s => s.id === stepId)
    if (!st) return false
    if (isFrozen(owner, stepId)) { notify(`«${st.n}» проверен и закрыт — добавить нельзя`, 'err'); return false }
    const wrong = ids.map(i => frameByI[i]!).find(f => (st.kind === 'Видео') !== (f.type === 'video'))
    if (wrong) { notify(st.kind === 'Видео' ? 'Шаг принимает только видео' : 'Шаг принимает только фото', 'err'); return false }
    const add = ids.filter(i => !(frameByI[i]!.objId === owner && frameByI[i]!.stepId === stepId)).length
    if (st.max && cnt(owner, stepId) + add > st.max) { notify(`«${st.n}» принимает не больше ${st.max}`, 'err'); return false }
    state.undo.push(ids.map(i => ({ i, o: frameByI[i]!.objId, s: frameByI[i]!.stepId })))
    ids.forEach((i) => { frameByI[i]!.objId = owner; frameByI[i]!.stepId = stepId })
    markSaving()
    if (!silent) notify(`${plural(ids.length, 'кадр', 'кадра', 'кадров')} → «${st.n}» · ${ownerLabel(owner)}`, 'ok', true)
    return true
  }
  /** Прототип `unassign`: защищённый кадр — отказ с причиной; нераспределённое — «и так не распределено». */
  function unassign(ids: number[]) {
    const blocked = ids.map(i => frameByI[i]!).find(f => f.lock || f.rej)
    if (blocked) { notify(`${frameWhy(blocked)} — открепить нельзя`, 'err'); return }
    const t = ids.filter(i => frameByI[i]!.objId)
    if (!t.length) { notify('Выбранное и так не распределено'); return }
    state.undo.push(t.map(i => ({ i, o: frameByI[i]!.objId, s: frameByI[i]!.stepId })))
    t.forEach((i) => { frameByI[i]!.objId = null; frameByI[i]!.stepId = null })
    markSaving()
    notify(`Откреплено ${plural(t.length, 'кадр', 'кадра', 'кадров')}`, 'ok', true)
  }
  /** Прототип `undoLast` — «Отменить» уведомления и Ctrl+Z (§10.6). */
  function undoLast() {
    const p = state.undo.pop()
    if (!p) { notify('Нечего отменять'); return }
    p.forEach((x) => { frameByI[x.i]!.objId = x.o; frameByI[x.i]!.stepId = x.s })
    markSaving()
    notify('Действие отменено')
  }
  /**
   * Привязка по намерению с проверкой шага до `assign` — пункт поповера, клик по строке шага, бросок
   * перетаскивания: «Шаг проверен и закрыт — добавить нельзя», «Шаг уже заполнен». Удалось — выделение снято.
   */
  function assignTo(ids: number[], owner: string, stepId: string) {
    const st = stepOf(owner, stepId)
    if (!st) return false
    if (isFrozen(owner, stepId)) { notify('Шаг проверен и закрыт — добавить нельзя', 'err'); return false }
    if (stepFull(owner, st)) { notify('Шаг уже заполнен', 'err'); return false }
    const ok = assign(ids, owner, stepId)
    if (ok) state.sel.clear()
    return ok
  }
  /** «В «Прочее»» панели выделения. */
  function assignMisc() { if (assign([...state.sel], 'misc', 'm1')) state.sel.clear() }
  /** «Открепить» панели выделения и Del / Backspace. */
  function unassignSelection() { unassign([...state.sel]); state.sel.clear() }
  /** Крестик плитки и миниатюры, «Открепить» плашки и списка просмотра: защищённый кадр — отказ с причиной. */
  function unassignFrame(i: number) {
    const f = frameByI[i]
    if (!f) return
    if (f.lock || f.rej) { notify(`${frameWhy(f)} — открепить нельзя`, 'err'); return }
    unassign([i])
  }
  /** Del / Backspace в просмотре (§11.2) — у нераспределённого «Кадр и так не распределён». */
  function unassignViewed(i: number) {
    const f = frameByI[i]
    if (!f) return
    if (f.lock || f.rej) { notify(`${frameWhy(f)} — открепить нельзя`, 'err'); return }
    if (f.objId) unassign([i])
    else notify('Кадр и так не распределён')
  }
  /** Пункт «сделать текущим» поповера назначения (§10.3). */
  function setCurrent(id: string) {
    state.cur = id
    state.open.add(id)
    notify(`Текущий: ${objName(O(id)!)}`)
  }
  /** Начало перетаскивания (§9.5) — прототип `dragstart`: тянется выделение, если кадр в нём, иначе только кадр. */
  function dragStart(i: number) {
    const drag = state.sel.has(i) ? [...state.sel] : [i]
    if (!state.sel.has(i)) { state.sel.clear(); state.sel.add(i) }
    return drag
  }
  /** Метка перетаскивания — прототип `#ghost`: «N кадров» или имя файла одного кадра. */
  const dragLabel = (drag: number[]) => (drag.length > 1 ? plural(drag.length, 'кадр', 'кадра', 'кадров') : frameByI[drag[0]!]?.n ?? '')

  /* ------------------------------ П4: панель (§9.1–9.2) ------------------------------ */
  /** «Свернуть все» / «Развернуть все» — прототип `data-coll`: все свёрнуты — развернуть, иначе свернуть все. */
  const allClosed = computed(() => STAGES.every(s => state.closed.has(s.id)))
  function toggleAllStages() {
    if (allClosed.value) state.closed.clear()
    else STAGES.forEach(s => state.closed.add(s.id))
  }
  /** «Только открытые» / «Показать все (+N)» — прототип `data-onlyopen`: проверенные шаги убираются с глаз. */
  function toggleOnlyOpen() { state.onlyOpen = !state.onlyOpen }

  /* ------------------------------ П4: связь (§15.3) ------------------------------ */
  /**
   * «Показать в структуре» — прототип `locateFrame`, часть модели: вкладка «Схема», этап раскрыт, повтор текущий и
   * раскрыт, фильтр «Только открытые» снят, если прячет шаг. Найти строку, прокрутить и зажечь — страница;
   * не нашла — «Шаг не найден в структуре». Возвращает шаг кадра или `null` («Кадр не распределён»).
   */
  function locateFrame(i: number) {
    const f = frameByI[i]
    if (!f || !f.objId) { notify('Кадр не распределён'); return null }
    const o = O(f.objId)
    state.closed.delete(o ? o.stageId : f.objId)
    if (o) { state.cur = o.id; state.open.add(o.id) }
    if (state.onlyOpen && isFrozen(f.objId, f.stepId!)) state.onlyOpen = false
    state.rtab = 'scheme'
    return { owner: f.objId, stepId: f.stepId! }
  }

  /* ------------------------------ П4: привязка в просмотре (§11.3–11.4, §12.14) ------------------------------ */
  /**
   * Прототип `lbAssign`: защищённый кадр, закрытый и заполненный шаг — отказ; кадр уже в другом шаге — окно
   * «Перенести кадр?» (`confirm`), иначе тихая привязка (`done`) — вспышку и переход через 820 мс делает страница.
   */
  function lbAssign(i: number, owner: string, stepId: string): 'done' | 'confirm' | null {
    const f = frameByI[i]
    if (!f) return null
    if (f.lock || f.rej) { notify(`${frameWhy(f)} — перенести нельзя`, 'err'); return null }
    const stage = ownerStage(owner)!
    const st = stage.steps.find(x => x.id === stepId)!
    if (isFrozen(owner, stepId)) { notify('Шаг проверен и закрыт — добавить нельзя', 'err'); return null }
    if (stepFull(owner, st) && !(f.objId === owner && f.stepId === stepId)) { notify('Шаг уже заполнен', 'err'); return null }
    if (f.objId) {
      const cs = ownerStage(f.objId)!.steps.find(x => x.id === f.stepId)
      state.move = { i, owner, stepId, from: `${ownerLabel(f.objId)} · ${cs ? cs.n : '—'}`, to: `${ownerLabel(owner)} · ${st.n}` }
      state.win = 'move'
      return 'confirm'
    }
    return assign([i], owner, stepId, true) ? 'done' : null
  }
  /** «Перенести» окна № 47 — тихая привязка; без перехода к следующему кадру (§11.4). */
  function confirmMove() {
    const mv = state.move
    closeWindow()
    state.move = null
    return !!mv && assign([mv.i], mv.owner, mv.stepId, true)
  }
  /** Прототип `suggestFor`: блок съёмки кадра → шаг существующего объекта, новый объект или `null` (не распознано). */
  function suggestFor(f: Frame): Suggestion | null {
    return suggestState(f).sg
  }
  const SUGGEST_UNKNOWN = 'Не удалось подобрать: идентификатор рядом с кадром не распознан'
  /**
   * Подбор и причина отказа — такт 52, решения владельца 2026-10-01. Закрытый для приёма шаг (проверен и закрыт либо
   * заполнен) из кандидатов исключается: из такого предложения нет выхода. Прототип v17 такой шаг предлагает — строка
   * раздела 15 для аналитика. Причина нужна заранее: кнопка «Подобрать шаг» выключена, причина — в её подсказке.
   */
  function suggestState(f: Frame): { sg: Suggestion | null, reason: string } {
    const raw = suggestRaw(f)
    if (!raw) return { sg: null, reason: SUGGEST_UNKNOWN }
    if (raw.kind === 'step' && raw.blocked) {
      return { sg: null, reason: `Не удалось подобрать: шаг «${raw.stepName}» · ${raw.ownerName} ${raw.blocked === 'frozen' ? 'проверен и закрыт' : 'уже заполнен'}` }
    }
    return { sg: raw, reason: '' }
  }
  /** Причина, по которой подобрать шаг нельзя; пусто — подбор доступен. */
  function suggestReason(i: number) {
    const f = frameByI[i]
    return f ? suggestState(f).reason : ''
  }
  /** Прототип `suggestFor` как есть: закрытый шаг помечен `blocked`. */
  function suggestRaw(f: Frame): Suggestion | null {
    const b = BLOCKS.find(x => f.i >= x.a && f.i <= x.b)
    if (!b) return null
    if (b.kind === 'terr') return stepSuggestion('gen', f.k === 'plan' ? 'g1' : 'g4')
    const stageId = b.kind === 'bld' ? 'bld' : 'eq'
    const stepId = stageId === 'eq' ? autoStepEq(f) : (f.k === 'building' ? 'b1' : 'b2')
    const o = stageId === 'eq'
      ? (b.inv && objects.find(x => x.stageId === 'eq' && x.form.inv === b.inv)) || objects.find(x => x.stageId === 'eq' && !x.form.inv && x.form.mark === b.title)
      : objects.find(x => x.stageId === 'bld' && x.form.no === (b.shop || b.title))
    if (o) return stepSuggestion(o.id, stepId)
    if (stageId === 'eq' && !b.inv) return null // идентификатор не распознан — не угадываем
    return { kind: 'create', stage: stageId, title: b.shop || b.title, inv: b.inv || '', stepId, stageTitle: stageById[stageId]!.title }
  }
  function stepSuggestion(owner: string, stepId: string): Suggestion {
    const st = ownerStage(owner)!.steps.find(x => x.id === stepId)!
    const blocked = isFrozen(owner, stepId) ? 'frozen' as const : stepFull(owner, st) ? 'full' as const : undefined
    return { kind: 'step', owner, stepId, stepName: st.n, ownerName: ownerLabel(owner), blocked }
  }
  /** «Подобрать шаг» — прототип `lbSuggest`: предложение или честный отказ. */
  function lbSuggest(i: number) {
    const f = frameByI[i]
    if (!f) return null
    const { sg, reason } = suggestState(f)
    if (!sg) notify(reason, 'err')
    return sg
  }

  /* ------------------------------ П5: каркас (§8.6, §17.4–17.6, окно входа) ------------------------------ */
  /** Поиск по расшифровкам и именам файлов (§8.6) — прототип `#feedSearch`: фильтр ленты. */
  function setQuery(q: string) { state.q = q }

  /** Сводка завершения (№ 55, §17.4–17.6) — прототип `#btnDone`: тексты в момент открытия. */
  const finishWindow = computed(() => {
    const media = freeFrames()
    const placed = media.filter(f => f.objId).length
    const left = media.length - placed
    const bad: string[] = []
    STAGES.filter(s => !s.rep).forEach(s => s.steps.forEach((x) => { if (x.req && !stepOk(s.id, x)) bad.push(`${s.title} — «${x.n}»`) }))
    objects.forEach(o => stageById[o.stageId]!.steps.forEach((x) => { if (x.req && !stepOk(o.id, x)) bad.push(`${objName(o)} — «${x.n}»`) }))
    const nb = objects.filter(o => o.stageId === 'bld').length
    const ne = objects.filter(o => o.stageId === 'eq').length
    const pre = frames.filter(f => isMedia(f) && f.lock).length
    const frz = frzSteps()
    const blocks: WindowBlock[] = [{
      tone: 'success',
      title: `Оформлено: ${plural(nb, 'здание', 'здания', 'зданий')}, ${plural(ne, 'единица', 'единицы', 'единиц')} оборудования`,
      text: `Из свободной съёмки разложено ${placed} из ${media.length}${pre ? `. Плюс ${pre} кадров были закреплены до вас` : ''}`,
    }]
    if (frz) blocks.push({ tone: 'success', title: `Проверено и заморожено шагов: ${frz}`, text: 'Их содержимое уходит в Core без изменений.' })
    if (general.number && Number(general.number) !== ne) {
      blocks.push({ tone: 'warning', title: 'Расхождение с общей формой', text: `По документам ${general.number} объектов, оформлено ${ne}. Заполните «Имущество, которое не удалось осмотреть».` })
    }
    if (bad.length) {
      blocks.push({ tone: 'destructive', title: `Не закрыты обязательные шаги: ${bad.length}`, text: '', list: [...bad.slice(0, 6), ...(bad.length > 6 ? [`…и ещё ${bad.length - 6}`] : [])] })
    }
    if (left) blocks.push({ tone: 'warning', title: `Не распределено: ${plural(left, 'кадр', 'кадра', 'кадров')}`, text: 'Останутся в свободной съёмке.' })
    return { blocks, note: 'Голосовые комментарии не распределяются и остаются в свободной съёмке как есть.' }
  })
  /** «Завершить» сводки — демо прототипа: привязки «уходят в Core». */
  function finish() {
    closeWindow()
    notify('Отправлено в Core (демо)')
  }

  /**
   * Окно входа (№ 59) — прототип `showEntry`: сводка состояния осмотра при загрузке. Переключатель сценариев внутри окна —
   * оснастка прототипа, не переносится (раздел 15). Заголовок и подзаголовок — строки прототипа.
   */
  const SCEN = opts.scenario ?? 'review'
  const entryWindow = computed(() => {
    const free = freeFrames()
    const left = free.filter(f => !f.objId).length
    const pre = frames.filter(f => isMedia(f) && f.lock).length
    const fromStep = frames.filter(f => isMedia(f) && f.origin === 'step').length
    const notes = frames.filter(f => !isMedia(f)).length
    const frz = frzSteps()
    const blocks: WindowBlock[] = SCEN === 'empty'
      ? [{ tone: 'warning', title: 'Осмотр пустой', text: 'Ни один шаг не заполнен, повторов нет — вся структура появится из свободной съёмки.' }]
      : [
          { tone: 'success', title: `Осмотр уже проверен частично: ${plural(frz, 'шаг', 'шага', 'шагов')} заморожено`, text: 'Проверяющий прошёл по схеме 20 июня. Шаги с решением «Ок» закрыты: дописать туда нельзя, открепить оттуда тоже. Они помечены замком.' },
          { tone: 'warning', title: 'По шагу «Общий вид» линии POLYPRISE вынесено «Повторить»', text: 'Старые кадры помечены отклонёнными и остаются в истории, но место в шаге освободилось — нужно переснять и разложить заново.' },
          { tone: 'warning', title: `${plural(pre, 'кадр', 'кадра', 'кадров')} привязано до вас`, text: `${plural(fromStep, 'кадр', 'кадра', 'кадров')} сняты прямо в шагах, ${plural(pre - fromStep, 'кадр', 'кадра', 'кадров')} разложены из свободной съёмки в прошлый заход. Счётчик «Кадры разложены» считает только вашу работу.` },
        ]
    blocks.push({ tone: 'warning', title: `Свободная съёмка: ${plural(left, 'кадр', 'кадра', 'кадров')} не распределено`, text: `Плюс ${notes} голосовых и текстовых заметок — они остаются как контекст.` })
    return { title: 'Распределение свободной съёмки', sub: '208 кадров и 8 видео, 13 июня 2018, 09:43–11:40', blocks }
  })
  /** «Распределить автоматически» окна входа — окно закрывается, через 80 мс запуск (`magicWand`), как у прототипа. */
  function entryAuto() {
    closeWindow()
    setTimeout(magicWand, 80)
  }

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
    /* П2 */
    createObject,
    autoPlan,
    planPhotosOnly,
    wandWindow,
    progressWindow,
    reviewBar,
    magicWand,
    launchWand,
    runWand,
    abortWand,
    applyWandNow,
    summaryAction,
    setReviewOnly,
    acceptAll,
    rejectAll,
    acceptObj,
    rejectObj,
    /* П3 */
    visibleMedia,
    selectRange,
    clickTile,
    selectAll,
    clearSel,
    setSelection,
    selbar,
    stepFull,
    kindRefusal,
    assign,
    unassign,
    undoLast,
    assignTo,
    assignMisc,
    unassignSelection,
    unassignFrame,
    unassignViewed,
    setCurrent,
    dragStart,
    dragLabel,
    /* П4 */
    allClosed,
    toggleAllStages,
    toggleOnlyOpen,
    locateFrame,
    lbAssign,
    confirmMove,
    suggestFor,
    suggestReason,
    lbSuggest,
    /* П5 */
    setQuery,
    finishWindow,
    finish,
    entryWindow,
    entryAuto,
    /* П6 */
    openNewForm,
    formWindow,
    submitForm,
    newObjectOptions,
    askDelete,
    deleteObject,
    confirmDelete,
    noteAction,
  }
}

export type FreeShootModel = ReturnType<typeof createModel>
