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
export type ScreenWindow = null | 'hotkeys' | 'form' | 'progress' | 'wand' | 'summary' | 'finish'
export interface Notice { id: number, text: string, kind: 'ok' | 'err', undo: boolean }

/** Режим автораспределения (§12.1): полное, только структура, только кадры. */
export type WandMode = 'full' | 'struct' | 'photos'
export const MODE_T: Record<WandMode, string> = { full: 'полное', struct: 'только структура', photos: 'только кадры' }
/** Идущее автораспределение (§12.5) — прототип `runWand`: доля `k` растёт по таймеру. */
export interface WandRun { mode: WandMode, total: number, notes: number, objN: number, k: number }
/** Блок окна: `.sum` прототипа — тон, заголовок, текст. */
export interface WindowBlock { tone: 'success' | 'warning' | 'destructive', title: string, text: string }
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
  /** Окно формы повтора: какой повтор и на какой группе открыто (§14.3). */
  formWin: { obj: string, group: string } | null
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
    reviewTotal: init.reviewTotal ?? 0,
    onlyOpen: init.onlyOpen ?? false,
    formOpen: new Set(),
    size: init.size ?? 'md',
    win: init.win ?? null,
    formWin: init.formWin ?? null,
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

  /* ------------------------------ П2: повторы ------------------------------ */
  /** Прототип `createObject`: новый повтор становится текущим и раскрывается. */
  function createObject(stageId: string, form: Record<string, string>) {
    objects.push({ id: `o${++objSeq}`, stageId, form: { ...form } })
    const o = objects[objects.length - 1]!
    state.cur = o.id
    state.open.add(o.id)
    return o
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
    state.run = { mode, total, notes, objN, k: hold ?? 0 }
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
  }
}

export type FreeShootModel = ReturnType<typeof createModel>
