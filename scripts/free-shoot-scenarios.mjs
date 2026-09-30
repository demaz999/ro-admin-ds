#!/usr/bin/env node
/**
 * Прогон сценариев экрана «Распределение свободной съёмки» (VA-9265) — такт 38, порция П1; такт 39, порция П2 —
 * автораспределение и приёмка (С-15, 27–30). План — `docs/free-shoot.md`, 16.4; итоги — разделы 17 и 18.
 * Оснастка приёмки, не продукт. `DEBUG_CLICK=1` печатает координаты и цель каждого клика.
 *
 * Одни и те же действия выполняются в прототипе v17 (`docs/sources/va-9265/va-9265-v17.html`) и на
 * стенде `/free-shoot`; после каждого шага с обоих снимается слепок (лента, выделение, режимы,
 * текущий и раскрытые повторы, счётчики подшапки, окно, вкладка «Форма осмотра»), слепки
 * сравниваются построчно. Расхождение — провал с именем сценария и шага.
 *
 * Запуск (dev-сервер на 3000 уже поднят):
 *   node scripts/free-shoot-scenarios.mjs            — все сценарии
 *   node scripts/free-shoot-scenarios.mjs С-16 С-38  — выбранные
 * Chrome ищется на CDP-порту `CDP_PORT` (по умолчанию 9333); если его нет — запускается headless.
 * Адрес стенда — `KIT_URL` (по умолчанию http://localhost:3000/free-shoot/).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROTO_URL = pathToFileURL(join(ROOT, 'docs/sources/va-9265/va-9265-v17.html')).href
const KIT_URL = process.env.KIT_URL ?? 'http://localhost:3000/free-shoot/'
const PORT = Number(process.env.CDP_PORT ?? 9333)
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ------------------------------ CDP ------------------------------ */
async function ensureChrome() {
  try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); return } catch {}
  const bins = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  const bin = bins.find(b => existsSync(b))
  if (!bin) throw new Error('Chrome не найден: задайте CHROME или поднимите его с --remote-debugging-port')
  const profile = mkdtempSync(join(tmpdir(), 'fs-scen-'))
  /* Две вкладки идут параллельно: фоновой нельзя тормозить таймеры — у прототипа запуск и прогресс на `setTimeout` / `setInterval`. */
  spawn(bin, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'],
    { detached: true, stdio: 'ignore' }).unref()
  for (let k = 0; k < 60; k++) {
    await sleep(250)
    try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); return } catch {}
  }
  throw new Error(`Chrome не поднялся на порту ${PORT}`)
}

async function openPage() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise(r => { ws.onopen = r })
  let id = 0
  const pend = new Map()
  const waiters = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
    if (m.method) for (const w of waiters.splice(0)) (w.method === m.method ? w.resolve(m.params) : waiters.push(w))
  }
  /** Событие CDP — перехват перетаскивания (`Input.dragIntercepted`). */
  const once = (method, ms = 3000) => new Promise((resolve, reject) => { waiters.push({ method, resolve }); setTimeout(() => reject(new Error(`нет события ${method}`)), ms) })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? JSON.stringify(r.result.exceptionDetails))
    return r.result?.result?.value
  }
  await send('Page.enable')
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const page = {
    evaluate,
    async goto(url, wait) { await send('Page.navigate', { url }); await sleep(wait) },
    /** Реальный клик мышью по центру элемента: выражение `sel` возвращает элемент; `modifiers` CDP: Alt 1, Ctrl 2, ⌘ 4, Shift 8. */
    async click(sel, modifiers = 0) {
      const p = await this.point(sel)
      if (process.env.DEBUG_CLICK) console.log('   клик', p, await evaluate(`document.elementFromPoint(${p.x}, ${p.y})?.outerHTML.slice(0, 120)`))
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1, modifiers })
      await sleep(250)
    },
    /** Центр элемента в окне, когда он встал: см. ниже, почему ждать. */
    async point(sel) {
      /* Плавная прокрутка панели (`revealObj` прототипа, `reveal` стенда) двигает цель — клик после того, как она встала:
         положение меряется без прокрутки, пока два замера подряд не совпадут. */
      const at = scroll => evaluate(`(() => { const el = ${sel}; if (!el) return null; ${scroll ? "el.scrollIntoView({ block: 'center', behavior: 'instant' });" : ''} const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
      const settle = async (p) => {
        for (let k = 0; p && k < 30; k++) {
          await sleep(100)
          const q = await at(false)
          if (q && q.x === p.x && q.y === p.y) break
          p = q
        }
        return p
      }
      /* Фоновая вкладка headless не рисует кадры, и плавная прокрутка догоняет в момент нажатия — вкладка действия выходит вперёд.
         Сначала дать докрутиться чужой плавной прокрутке, потом поставить цель в центр мгновенно и убедиться, что она встала. */
      await send('Page.bringToFront')
      await settle(await at(false))
      let p = await settle(await at(true))
      if (!p) throw new Error(`нет элемента для клика: ${sel}`)
      /* Цель бывает накрыта уведомлением (у прототипа плашка ложится на панель выделения): берётся непокрытая точка
         цели, а если накрыта вся — ждать, пока уведомление уйдёт, как ждал бы человек. */
      for (let k = 0; k < 40; k++) {
        const free = await evaluate(`(() => { const el = ${sel}; const r = el.getBoundingClientRect()
          for (const [fx, fy] of [[0.5, 0.5], [0.8, 0.5], [0.2, 0.5], [0.5, 0.25], [0.5, 0.75]]) {
            const x = r.x + r.width * fx; const y = r.y + r.height * fy; const hit = document.elementFromPoint(x, y)
            if (hit && (el === hit || el.contains(hit))) return { x, y }
          }
          return null })()`)
        if (free) { p = free; break }
        await sleep(250)
      }
      return p
    },
    /** Двойной клик по центру элемента: два нажатия, второе с `clickCount: 2` — браузер даёт click, click, dblclick. */
    async dblclick(sel) {
      const p = await this.point(sel)
      for (const n of [1, 2]) for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: n })
      await sleep(300)
    },
    /** Клик в точке окна — мимо всего (шапка экрана): закрывает плашки, как клик человека мимо. */
    async clickAt(x, y) {
      await send('Page.bringToFront')
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
      await sleep(250)
    },
    /** Наблюдатель в странице: каждые 10 мс снимает выражения и пишет время первого включения и выключения каждого. */
    async watch(exprs) {
      await evaluate(`(() => { clearInterval(window.__wt); const E = { ${Object.entries(exprs).map(([k, e]) => `${JSON.stringify(k)}: () => (${e})`).join(', ')} }
        const t0 = performance.now(); const first = {}; for (const k in E) first[k] = E[k]()
        window.__w = { t0, first, on: {}, off: {} }
        window.__wt = setInterval(() => { const t = performance.now() - t0; for (const k in E) { const v = E[k](); const w = window.__w
          if (v !== first[k] && w.on[k] == null) w.on[k] = t
          if (w.on[k] != null && v === first[k] && w.off[k] == null) w.off[k] = t } }, 10); return 1 })()`)
    },
    async watched() { return evaluate(`(clearInterval(window.__wt), JSON.stringify(window.__w))`) },
    /** Указатель в полосу шапки — уход с ленты и панели (`mouseleave`). */
    async away() {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 10 })
      await sleep(200)
    },
    /** Наведение: указатель на центр элемента. */
    async hover(sel) {
      const p = await this.point(sel)
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y })
      await sleep(200)
    },
    /** Протяжка мышью по точкам `[x, y]` с зажатой левой кнопкой — рамка выделения (§10.1). */
    async sweep(points, modifiers = 0) {
      await send('Page.bringToFront')
      const [a, ...rest] = points
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a[0], y: a[1], modifiers })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a[0], y: a[1], button: 'left', buttons: 1, clickCount: 1, modifiers })
      for (const [x, y] of rest) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1, modifiers }); await sleep(30) }
      const z = points[points.length - 1]
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: z[0], y: z[1], button: 'left', buttons: 0, clickCount: 1, modifiers })
      await sleep(250)
    },
    /**
     * Перетаскивание (§9.5) реальным вводом: нажатие на источнике и сдвиг запускают `dragstart` страницы, CDP
     * перехватывает перенос (`Input.setInterceptDrags`) и отдаёт его данные, бросок — `dragEnter`, `dragOver`, `drop` над целью.
     */
    async drag(fromSel, toSel) {
      const a = await this.point(fromSel)
      const b = await this.point(toSel)
      await send('Input.setInterceptDrags', { enabled: true })
      const got = once('Input.dragIntercepted')
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
      for (let k = 1; k <= 5; k++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (b.x - a.x) * k / 10, y: a.y + (b.y - a.y) * k / 10, button: 'left', buttons: 1 })
      const { data } = await got
      for (const type of ['dragEnter', 'dragOver', 'drop']) { await send('Input.dispatchDragEvent', { type, x: b.x, y: b.y, data }); await sleep(60) }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
      await send('Input.setInterceptDrags', { enabled: false })
      await sleep(300)
    },
    /** Клавиша; `extra.modifiers` — как у клика (Ctrl 2, ⌘ 4). */
    async key(key, code = key, extra = {}) {
      await send('Page.bringToFront')
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, ...extra })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...extra })
      await sleep(250)
    },
    async type(text) { await send('Input.insertText', { text }); await sleep(250) },
    close() { ws.close(); return fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`) },
  }
  return page
}

/* ------------------------------ адаптеры ------------------------------ */
/**
 * Оба адаптера отвечают на один язык действий и выдают слепок одной формы.
 * Действия П1: tile(i), mode('keep'|'hide'), size('md'|'lg'), repeat(id), tab('scheme'|'form'),
 * hotkeys(), windowButton(text), key(name), general(k, value).
 * Действия П2 (такт 39): wand() — «Распределить автоматически», wandMode('full'|'struct'|'photos') — режим в окне
 * запуска, stop() — «Прервать», waitWand() — дождаться сводки результата, reviewOnly() — «только непроверенные»,
 * reviewAll('accept'|'reject') — кнопки полосы приёмки, repeatAct(id, 'accept'|'reject') — кнопки карточки повтора,
 * dump() — состояние модели для сравнения «до / после» внутри одной стороны.
 * Старт — старт прототипа (решение чата 2026-09-30, такт 39): повторы свёрнуты, текущего нет; набор — `review`
 * («Частично проверен») или `empty` («Пустой осмотр»).
 */
const norm = s => (s ?? '').replace(/\s+/g, ' ').trim()
const GENERAL_KEYS = { type: 'Тип акта', storage: 'Тип хранения', heating: 'Наличие отопления', number: 'Общее количество объектов по документам' }
const MODE_TITLES = { full: 'Полное автораспределение', struct: 'Только структура', photos: 'Только кадры' }
/** Ждать, пока выражение не станет истинным (конец обработки автораспределения — до 4.6 с у прототипа). */
async function until(page, expr, ms = 9000) {
  for (let t = 0; t < ms; t += 100) {
    if (await page.evaluate(expr)) { await sleep(300); return }
    await sleep(100)
  }
  throw new Error(`не дождались: ${expr}`)
}
/** Состояние модели для «до / после» — одни поля у обеих сторон, множества — отсортированными массивами. */
const DUMP = `(M) => {
  const arr = s => [...s].sort()
  return JSON.stringify({
    frames: M.frames.map(f => [f.i, f.objId, f.stepId, !!f.auto, !!f.lock, !!f.rej, f.origin]),
    objects: M.objects.map(o => [o.id, o.stageId, o.form, !!o.auto, o.autoSrc ?? null]),
    review: M.review,
    state: { sel: arr(M.state.sel), cur: M.state.cur, open: arr(M.state.open), closed: arr(M.state.closed), mode: M.state.mode,
      review: M.state.review, reviewOnly: M.state.reviewOnly, reviewTotal: M.state.reviewTotal, onlyOpen: M.state.onlyOpen, rtab: M.state.rtab },
  })
}`

/**
 * Рамка по первой строке ленты: из поля ленты слева от кадра `from` (или с Alt — из центра кадра) до центра кадра `to`.
 * Раскладка ленты у прототипа и стенда разная до вёрстки П5 (5 колонок против 4), поэтому рамка идёт внутри строки,
 * где набор кадров совпадает. `tile` — выражение плитки по номеру кадра, `feed` — лента.
 */
async function sweepRow(page, tile, feed, from, to, { alt = false, shift = false } = {}) {
  const pts = await page.evaluate(`(() => { const a = ${tile(from)}.getBoundingClientRect(); const b = ${tile(to)}.getBoundingClientRect(); const f = ${feed}.getBoundingClientRect()
    const start = ${alt} ? [a.x + a.width / 2, a.y + a.height / 2] : [f.x + 6, a.y + a.height / 2]
    const end = [b.x + b.width / 2, b.y + b.height / 2]
    return [start, ...[1, 2, 3, 4, 5].map(k => [start[0] + (end[0] - start[0]) * k / 5, start[1] + (end[1] - start[1]) * k / 5])] })()`)
  await page.sweep(pts, (alt ? 1 : 0) | (shift ? 8 : 0))
}
/**
 * Рамка к нижнему краю ленты: `moves` движений у края — автопрокрутка по 14 на каждое (§10.1). Лента сначала в начало;
 * возвращает сдвиг прокрутки — его и сравнивает шаг: выделение под рамкой зависит от раскладки.
 */
async function sweepEdge(page, tile, feed, from, moves) {
  await page.evaluate(`(${feed}.scrollTop = 0, 1)`)
  const pts = await page.evaluate(`(() => { const a = ${tile(from)}.getBoundingClientRect(); const f = ${feed}.getBoundingClientRect()
    return [[f.x + 6, a.y + a.height / 2], ...Array.from({ length: ${moves} }, (_, k) => [f.x + 300, f.bottom - 20 - (k % 2)])] })()`)
  await page.sweep(pts)
  return page.evaluate(`Math.round(${feed}.scrollTop)`)
}

const prototype = page => ({
  name: 'прототип',
  async start(dataset) {
    await page.goto(PROTO_URL, 1500)
    /* Окно входа (`showEntry`) открывается при загрузке — закрыть «Разложу вручную». Окно входа на ките — П5. */
    await page.click(`[...document.querySelectorAll('#mFoot button')].find(b => b.textContent.trim() === 'Разложу вручную')`)
    /* «Пустой осмотр» — функция самого прототипа, как кнопка переключателя сценариев окна входа. */
    if (dataset === 'empty') await page.evaluate(`(() => { applyScenario('empty'); return 1 })()`)
  },
  wand: () => page.click(`document.querySelector('#btnWand')`),
  wandMode: v => page.click(`document.querySelector('#mBody input[name="wm"][value="${v}"]')`),
  stop: () => page.click(`document.querySelector('#wStop')`),
  waitWand: () => until(page, `document.querySelector('#modal.show #mTitle')?.textContent === 'Автораспределение завершено'`),
  reviewOnly: () => page.click(`document.querySelector('#review [data-rev="only"]')`),
  reviewAll: v => page.click(`document.querySelector('#review [data-rev="${v}"]')`),
  repeatAct: (id, v) => page.click(`document.querySelector('.obj[data-obj="${id}"] [data-act="${v === 'accept' ? 'acc' : 'rej'}"]')`),
  dump: () => page.evaluate(`(${DUMP})({ frames, objects, review: REVIEW, state })`),
  /* П3 */
  tileMod: (i, modifiers) => page.click(`document.querySelector('#feed .card[data-i="${i}"] img')`, modifiers),
  selectAllButton: () => page.click(`document.querySelector('#btnSelAll')`),
  selbar: b => page.click(`document.querySelector('#${{ toStep: 'btnToStep', misc: 'btnMisc', unassign: 'btnUnassign', clear: 'btnSelClear' }[b]}')`),
  popOption: v => page.click(v.startsWith('obj|') ? `document.querySelector('#popList [data-setcur="${v.slice(4)}"]')` : `document.querySelector('#popList .it[data-owner="${v.split('|')[0]}"][data-step="${v.split('|')[1]}"]')`),
  step: k => page.click(`document.querySelector('.step[data-owner="${k.split('|')[0]}"][data-step="${k.split('|')[1]}"] .nm')`),
  async thumbRemove(k, n) { const th = `document.querySelectorAll('.step[data-owner="${k.split('|')[0]}"][data-step="${k.split('|')[1]}"] .th')[${n}]`; await page.hover(th); await page.click(`${th}.querySelector('.rm')`) },
  async tileUnassign(i) { await page.hover(`document.querySelector('#feed .card[data-i="${i}"] img')`); await page.click(`document.querySelector('#feed .card[data-i="${i}"] .mark .x')`) },
  async viewer(i) { await page.hover(`document.querySelector('#feed .card[data-i="${i}"] img')`); await page.click(`document.querySelector('#feed .card[data-i="${i}"] .zoom')`) },
  bindUnbind: () => page.click(`document.querySelector('#lbBind [data-act="unbind-bar"]')`),
  toastUndo: () => page.click(`[...document.querySelectorAll('#toasts .toast button')].pop()`),
  marquee: (a, b, o) => sweepRow(page, i => `document.querySelector('#feed .card[data-i="${i}"]')`, `document.getElementById('feed')`, a, b, o),
  marqueeEdge: (a, n) => sweepEdge(page, i => `document.querySelector('#feed .card[data-i="${i}"]')`, `document.getElementById('feed')`, a, n),
  dragTo: (i, k) => page.drag(`document.querySelector('#feed .card[data-i="${i}"] img')`, `document.querySelector('.step[data-owner="${k.split('|')[0]}"][data-step="${k.split('|')[1]}"] .nm')`),
  savingNow: () => page.evaluate(`document.getElementById('saveState').classList.contains('busy')`),
  /* П4 */
  toggleAll: async () => { await page.evaluate(`(document.getElementById('rbody').scrollTop = 0, 1)`); await page.click(`document.querySelector('.schtools [data-coll]')`) },
  onlyOpen: async () => { await page.evaluate(`(document.getElementById('rbody').scrollTop = 0, 1)`); await page.click(`document.querySelector('.schtools [data-onlyopen]')`) },
  clickAway: () => page.clickAt(700, 10),
  foundWatch: () => page.watch({ step: `!!document.querySelector('.step.found')`, thumb: `[...document.querySelectorAll('.th')].some(t => t.style.outline)` }),
  bindWatch: () => page.watch({ flash: `document.getElementById('lbBind').classList.contains('flash')`, index: `state.lb` }),
  watched: () => page.watched(),
  hoverTile: i => page.hover(`document.querySelector('#feed .card[data-i="${i}"] img')`),
  hoverStep: k => page.hover(`document.querySelector('.step[data-owner="${k.split('|')[0]}"][data-step="${k.split('|')[1]}"] .nm')`),
  hoverRepeat: id => page.hover(`document.querySelector('.obj[data-obj="${id}"] .obj-h')`),
  away: () => page.away(),
  async locate(i) { await page.hover(`document.querySelector('#feed .card[data-i="${i}"] img')`); await page.click(`document.querySelector('#feed .card[data-i="${i}"] .mark .find')`) },
  found: () => page.evaluate(`JSON.stringify({ step: [...document.querySelectorAll('.step.found')].map(x => x.dataset.owner + '|' + x.dataset.step), thumb: [...document.querySelectorAll('.th')].filter(t => t.style.outline).map(t => +t.dataset.i) })`),
  dblTile: i => page.dblclick(`document.querySelector('#feed .card[data-i="${i}"] img')`),
  thumbOpen: (k, n) => page.click(`document.querySelectorAll('.step[data-owner="${k.split('|')[0]}"][data-step="${k.split('|')[1]}"] .th')[${n}]`),
  lbItem: v => page.click(v.startsWith('obj|') ? `document.querySelector('#lbList [data-setcur="${v.slice(4)}"]')` : `document.querySelector('#lbList .it[data-owner="${v.split('|')[0]}"][data-step="${v.split('|')[1]}"]')`),
  suggest: () => page.click(`document.querySelector('#lbBind [data-act="suggest"]')`),
  suggestNo: () => page.click(`document.querySelector('#lbBind [data-act="no"]')`),
  bindLocate: () => page.click(`document.querySelector('#lbBind [data-act="locate"]')`),
  bindFlashing: () => page.evaluate(`document.getElementById('lbBind').classList.contains('flash')`),
  lbIndex: () => page.evaluate(`document.getElementById('lb').classList.contains('show') ? state.lb : -1`),
  tile: i => page.click(`document.querySelector('#feed .card[data-i="${i}"] img')`),
  mode: v => page.click(`document.querySelector('#mode button[data-m="${v}"]')`),
  size: v => page.click(`document.querySelector('#sizer button[data-s="${v === 'lg' ? 272 : 176}"]')`),
  repeat: id => page.click(`document.querySelector('.obj[data-obj="${id}"] .obj-h')`),
  tab: v => page.click(`document.querySelector('.rtab[data-r="${v}"]')`),
  hotkeys: () => page.click(`document.querySelector('#btnHelp')`),
  windowButton: text => page.click(`[...document.querySelectorAll('#mFoot button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`),
  key: (name, code, extra) => page.key(name, code, extra),
  async general(k, value) {
    const isSelect = await page.evaluate(`document.querySelector('#rbody [data-g="${k}"]').tagName === 'SELECT'`)
    if (isSelect) {
      /* Нативный список прототипа кликом не раскрыть — значение выставляется, событие `change` — как у выбора. */
      await page.evaluate(`(() => { const el = document.querySelector('#rbody [data-g="${k}"]'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return 1 })()`)
      await sleep(250)
    }
    else {
      await page.click(`document.querySelector('#rbody [data-g="${k}"]')`)
      await page.evaluate(`document.querySelector('#rbody [data-g="${k}"]').select()`)
      await page.type(value)
    }
  },
  snapshot: () => page.evaluate(`(() => {
    const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
    const cards = [...document.querySelectorAll('#feed .card')]
    const tileState = c => { if (!c.classList.contains('placed')) return 'free'; const m = c.querySelector('.mark'); if (m?.classList.contains('rej')) return 'rejected'; if (m?.classList.contains('lk')) return 'locked'; if (c.classList.contains('auto')) return 'suggested'; return 'assigned' }
    const modal = document.querySelector('#modal.show')
    const wov = document.getElementById('wandov')
    const TONE = { ok: 'success', warn: 'warning', err: 'destructive' }
    const sum = s => { const b = s.querySelector('b'); return [TONE[[...s.classList].find(c => TONE[c])], t(b?.textContent), t(s.textContent.replace(b?.textContent ?? '', ''))].join(' | ') }
    const win = modal ? {
      head: t(modal.querySelector('#mTitle').textContent) + ' / ' + t(modal.querySelector('#mSub').textContent),
      text: [...modal.querySelectorAll('#mBody .wsrc, #mBody > p')].map(e => t(e.textContent)),
      modes: [...modal.querySelectorAll('#mBody .wmode')].map(w => [t(w.querySelector('.wt').textContent), t(w.querySelector('.wd').textContent), t(w.querySelector('.wn').textContent), w.classList.contains('dis') ? 'выключен' : '', w.querySelector('input').checked ? 'выбран' : ''].join(' | ')),
      blocks: [...modal.querySelectorAll('#mBody .sum')].map(sum),
      buttons: [...modal.querySelectorAll('#mFoot button')].map(b => t(b.textContent)),
      rows: [],
    } : wov ? {
      head: t(wov.querySelector('.wh').firstChild.textContent) + ' / ' + t(wov.querySelector('.wh small').textContent),
      text: [], modes: [], blocks: [],
      buttons: [...wov.querySelectorAll('button')].map(b => t(b.textContent)),
      rows: [...wov.querySelectorAll('.wrow span')].map(s => t(s.textContent)),
    } : null
    const rv = document.querySelector('#review.show')
    const tab = document.querySelector('.rtab.on')?.dataset.r
    const form = tab === 'form' ? {
      rows: [...document.querySelectorAll('#rbody .grow')].filter(r => getComputedStyle(r).display !== 'none').map(r => {
        const c = r.querySelector('[data-g]'); const v = c.value === '—' ? '' : c.value
        return t(r.querySelector('label').textContent) + ' = ' + t(v) }),
      check: t(document.querySelector('#rbody .cmp')?.textContent),
    } : null
    return {
      feed: cards.map(c => +c.dataset.i),
      tiles: cards.filter(c => !c.classList.contains('voice')).map(c => c.dataset.i + ':' + tileState(c)),
      /* Выделение — из состояния: после привязки прототип чистит state.sel, но ленту не перерисовывает, и класс .sel
         висит на плитках до следующей отрисовки (такт 40, строка реестра расхождений). */
      sel: cards.filter(c => state.sel.has(+c.dataset.i)).map(c => +c.dataset.i),
      mode: document.querySelector('#mode button.on')?.dataset.m,
      size: document.querySelector('#sizer button.on')?.dataset.s === '272' ? 'lg' : 'md',
      tab,
      cur: document.querySelector('.obj.cur')?.dataset.obj ?? null,
      open: [...document.querySelectorAll('.obj.open')].map(o => o.dataset.obj).sort(),
      curHint: t(document.querySelector('#curHint')?.textContent),
      sessMeta: t(document.querySelector('#sessMeta')?.textContent),
      stats: ['stFrames', 'stFramesSub', 'stReq', 'stReqSub', 'stObj', 'stObjSub'].map(id => t(document.getElementById(id)?.textContent)),
      window: win,
      form,
      review: rv ? {
        title: t(rv.querySelector('.t').firstChild.textContent),
        text: t(rv.querySelector('.t small').textContent),
        only: rv.querySelector('[data-rev="only"]') ? rv.querySelector('[data-rev="only"]').checked : null,
      } : null,
      repeats: [...document.querySelectorAll('.obj[data-obj]')].filter(o => o.getClientRects().length).map(o => o.dataset.obj + (o.classList.contains('auto') ? '*' : '')),
      hints: [...document.querySelectorAll('#rbody .hintbox')].filter(h => h.getClientRects().length).map(h => t(h.textContent)),
      bind: frames.filter(f => f.objId).map(f => f.i + '>' + f.objId + '|' + f.stepId + (f.auto ? '*' : '')),
      notices: [...document.querySelectorAll('#toasts .toast')].filter(e => !e.dataset.seen).map(e => { e.dataset.seen = '1'; return t(e.querySelector('span').textContent) }),
      selbar: document.querySelector('#selbar.show') ? { count: t(document.getElementById('selN').textContent), sub: t(document.getElementById('selSub').textContent) } : null,
      pop: !!document.querySelector('#pop.show'),
      viewer: document.getElementById('lb').classList.contains('show') ? lbList()[state.lb]?.n ?? null : null,
      bind: (() => { const lb = document.getElementById('lb'); if (!lb.classList.contains('show')) return null; const b = document.getElementById('lbBind')
        const name = [...b.querySelectorAll('b')].map(x => t(x.textContent)).filter(x => x !== 'Отклонён проверяющим').pop() ?? ''
        const blocked = /— шаг (проверен и закрыт|уже заполнен)/.exec(b.textContent)?.[1] ?? ''
        if (b.querySelector('[data-act="mk"]')) return 'создать: ' + name
        if (b.querySelector('[data-act="ok"]') || /Предложение:/.test(b.textContent)) return 'предложение: ' + name + (blocked ? ' — ' + blocked : '')
        return b.classList.contains('on') ? 'распределён: ' + name : 'свободен' })(),
      linked: [...document.querySelectorAll('#feed .card.linked')].map(c => +c.dataset.i),
      dim: document.getElementById('feed').classList.contains('linking'),
      hl: [...document.querySelectorAll('.step.hl')].map(x => x.dataset.owner + '|' + x.dataset.step),
      hlObj: [...document.querySelectorAll('.obj.hl')].map(x => x.dataset.obj),
      closed: [...document.querySelectorAll('.stage.closed')].map(x => x.dataset.st),
      steps: [...document.querySelectorAll('#rbody .step')].filter(x => x.getClientRects().length).map(x => x.dataset.owner + '|' + x.dataset.step),
      tools: [...document.querySelectorAll('.schtools button')].map(b => t(b.textContent)),
    }
  })()`),
})

const kit = page => ({
  name: 'кит',
  async start(dataset) {
    await page.goto(KIT_URL + '?asis=off' + (dataset === 'empty' ? '&data=empty' : ''), 4000)
  },
  wand: () => page.click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Распределить автоматически')`),
  wandMode: v => page.click(`[...document.querySelectorAll('[data-slot=choice][data-variant=card]')].find(c => c.querySelector('[data-slot=choice-title]').textContent.trim() === ${JSON.stringify(MODE_TITLES[v])})?.querySelector('[data-slot=choice-control]')`),
  stop: () => page.click(`[...document.querySelectorAll('[data-slot=modal-card] button')].find(b => b.textContent.trim() === 'Прервать')`),
  waitWand: () => until(page, `document.querySelector('[data-slot=modal-card] [data-slot=modal-card-title]')?.textContent.trim() === 'Автораспределение завершено'`),
  reviewOnly: () => page.click(`document.querySelector('[data-slot=callout] [role=checkbox]')`),
  reviewAll: v => page.click(`[...document.querySelectorAll('[data-slot=callout] button')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'accept' ? 'Принять все объекты' : 'Отменить автораспределение')})`),
  repeatAct: (id, v) => page.click(`[...document.querySelectorAll('[data-obj="${id}"] [data-slot=repeat-review] button')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'accept' ? 'Принять объект' : 'Отклонить')})`),
  dump: () => page.evaluate(`(${DUMP})(window.__freeShoot)`),
  /* П3 */
  tileMod: (i, modifiers) => page.click(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`, modifiers),
  selectAllButton: () => page.click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Выделить всё')`),
  selbar: b => page.click(`[...document.querySelectorAll('[data-slot=action-bar] button')].find(x => x.textContent.trim() === ${JSON.stringify({ toStep: 'Назначить на шаг', misc: 'В «Прочее»', unassign: 'Открепить', clear: 'Снять' }[b])})`),
  popOption: v => page.click(`document.querySelector('[data-slot=popover] [data-value="${v}"]')`),
  step: k => page.click(`document.querySelector('[data-step-key="${k}"] [data-slot=step-row-name]')`),
  async thumbRemove(k, n) { const th = `document.querySelectorAll('[data-step-key="${k}"] [data-slot=step-thumb]')[${n}]`; await page.hover(th); await page.click(`${th}.querySelector('[data-slot=step-thumb-remove]')`) },
  async tileUnassign(i) { await page.hover(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`); await page.click(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] [data-slot=frame-tile-unassign]')`) },
  async viewer(i) { await page.hover(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`); await page.click(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] [data-slot=frame-tile-open]')`) },
  bindUnbind: () => page.click(`[...document.querySelectorAll('[data-slot=frame-bind-bar] button')].find(b => b.textContent.trim() === 'Открепить')`),
  toastUndo: () => page.click(`[...document.querySelectorAll('[data-slot=toast] button')].filter(b => b.textContent.trim() === 'Отменить').pop()`),
  marquee: (a, b, o) => sweepRow(page, i => `document.querySelector('[data-slot=frame-tile][data-frame="${i}"]')`, `document.querySelector('.feed')`, a, b, o),
  marqueeEdge: (a, n) => sweepEdge(page, i => `document.querySelector('[data-slot=frame-tile][data-frame="${i}"]')`, `document.querySelector('.feed')`, a, n),
  dragTo: (i, k) => page.drag(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`, `document.querySelector('[data-step-key="${k}"] [data-slot=step-row-name]')`),
  savingNow: () => page.evaluate(`window.__freeShoot.state.saving`),
  /* П4 */
  toggleAll: async () => { await page.evaluate(`(document.querySelector('.rbody').scrollTop = 0, 1)`); await page.click(`document.querySelectorAll('.schtools button')[0]`) },
  onlyOpen: async () => { await page.evaluate(`(document.querySelector('.rbody').scrollTop = 0, 1)`); await page.click(`document.querySelectorAll('.schtools button')[1]`) },
  clickAway: () => page.clickAt(700, 10),
  foundWatch: () => page.watch({ step: `!!document.querySelector('[data-step-key][data-flash]')`, thumb: `!!document.querySelector('[data-step-key] [data-located]')` }),
  bindWatch: () => page.watch({ flash: `!!document.querySelector('[data-slot=frame-bind-bar][data-flash]')`, index: `window.__freeShoot.state.lb` }),
  watched: () => page.watched(),
  hoverTile: i => page.hover(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`),
  hoverStep: k => page.hover(`document.querySelector('[data-step-key="${k}"] [data-slot=step-row-name]')`),
  hoverRepeat: id => page.hover(`document.querySelector('[data-obj="${id}"] [data-slot=repeat-header]')`),
  away: () => page.away(),
  async locate(i) { await page.hover(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`); await page.click(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] [data-slot=frame-tile-locate]')`) },
  found: () => page.evaluate(`JSON.stringify({ step: [...document.querySelectorAll('[data-step-key][data-flash]')].map(x => x.dataset.stepKey), thumb: [...document.querySelectorAll('[data-step-key]')].flatMap(r => { const M = window.__freeShoot; const [o, st] = r.dataset.stepKey.split('|'); return [...r.querySelectorAll('[data-slot=step-thumb]')].map((t, k) => t.dataset.located ? M.framesIn(o, st)[k]?.i : null).filter(x => x != null) }) })`),
  dblTile: i => page.dblclick(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`),
  thumbOpen: (k, n) => page.click(`document.querySelectorAll('[data-step-key="${k}"] [data-slot=step-thumb-open]')[${n}]`),
  lbItem: v => page.click(`document.querySelector('[role=dialog] [data-value="${v}"]')`),
  suggest: () => page.click(`[...document.querySelectorAll('[data-slot=frame-bind-bar] button')].find(b => b.textContent.trim() === 'Подобрать шаг')`),
  suggestNo: () => page.click(`[...document.querySelectorAll('[data-slot=frame-bind-bar] button')].find(b => b.textContent.trim() === 'Не то')`),
  bindLocate: () => page.click(`[...document.querySelectorAll('[data-slot=frame-bind-bar] button')].find(b => b.textContent.trim() === 'Показать в структуре')`),
  bindFlashing: () => page.evaluate(`!!document.querySelector('[data-slot=frame-bind-bar][data-flash]')`),
  lbIndex: () => page.evaluate(`window.__freeShoot.state.lb`),
  tile: i => page.click(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`),
  mode: v => page.click(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'hide' ? 'убирать' : 'оставлять')})`),
  size: v => page.click(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'lg' ? 'L' : 'M')})`),
  repeat: id => page.click(`document.querySelector('[data-obj="${id}"] [data-slot=repeat-header]')`),
  tab: v => page.click(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'form' ? 'Форма осмотра' : 'Схема осмотра')})`),
  hotkeys: () => page.click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Горячие клавиши')`),
  windowButton: text => page.click(`[...document.querySelectorAll('[data-slot=modal-card] button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`),
  key: (name, code, extra) => page.key(name, code, extra),
  async general(k, value) {
    const field = `[...document.querySelectorAll('.gform [data-slot=field-wrapper]')].find(w => w.querySelector('label').textContent.trim() === ${JSON.stringify(GENERAL_KEYS[k])})`
    const isSelect = await page.evaluate(`!!(${field}).querySelector('button[aria-haspopup]')`)
    if (isSelect) {
      await page.click(`(${field}).querySelector('button[aria-haspopup]')`)
      await page.click(`[...document.getElementById((${field}).querySelector('button[aria-haspopup]').getAttribute('aria-controls')).querySelectorAll('[role=option]')].find(o => o.textContent.trim() === ${JSON.stringify(value)})`)
    }
    else {
      await page.click(`(${field}).querySelector('input')`)
      await page.evaluate(`(${field}).querySelector('input').select()`)
      await page.type(value)
    }
  },
  snapshot: () => page.evaluate(`(() => {
    const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
    const items = [...document.querySelectorAll('[data-frame]')]
    const tiles = items.filter(e => e.dataset.slot === 'frame-tile')
    const activeTab = texts => [...document.querySelectorAll('[role=tab][data-state=active]')].map(b => t(b.textContent)).find(x => texts.includes(x))
    const tabText = activeTab(['Схема осмотра', 'Форма осмотра'])
    const tab = tabText === 'Форма осмотра' ? 'form' : 'scheme'
    const stat = label => [...document.querySelectorAll('[data-slot=progress-stat]')].find(s => t(s.querySelector('[data-slot=progress-stat-label]')?.textContent) === label)
    const val = (s, part) => t(s?.querySelector('[data-slot=progress-stat-' + part + ']')?.textContent)
    const card = document.querySelector('[data-slot=modal-card]')
    const win = card ? {
      head: t(card.querySelector('[data-slot=modal-card-title]')?.textContent) + ' / ' + t(card.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
      text: [...card.querySelectorAll('[data-slot=modal-card-body] [data-slot=modal-card-text]')].map(e => t(e.textContent)),
      modes: [...card.querySelectorAll('[data-slot=choice][data-variant=card]')].map(c => {
        const ctl = c.querySelector('[data-slot=choice-control]')
        return [t(c.querySelector('[data-slot=choice-title]').textContent), t(c.querySelector('[data-slot=choice-description]')?.textContent), t(c.querySelector('[data-slot=choice-meta]')?.textContent), ctl.disabled ? 'выключен' : '', ctl.dataset.state === 'checked' ? 'выбран' : ''].join(' | ')
      }),
      blocks: [...card.querySelectorAll('[data-slot=callout]')].map(c => [c.dataset.tone, t(c.querySelector('[data-slot=callout-title]')?.textContent), t(c.querySelector('[data-slot=callout-text]')?.textContent)].join(' | ')),
      buttons: [...card.querySelectorAll('[data-slot=modal-card-footer] button')].map(b => t(b.textContent)),
      rows: [...card.querySelectorAll('[data-slot=progress-counter]')].map(r => t(r.firstElementChild?.textContent)),
    } : null
    const rv = document.querySelector('.subhead [data-slot=callout]')
    const M = window.__freeShoot
    const form = tab === 'form' ? {
      rows: [...document.querySelectorAll('.gform [data-slot=field-wrapper]')].map(w => {
        const input = w.querySelector('input'); const sel = w.querySelector('button[aria-haspopup] [data-slot=field-input]')
        return t(w.querySelector('label').textContent) + ' = ' + t(input ? input.value : sel?.textContent) }),
      check: t(document.querySelector('.gform .cmp')?.textContent),
    } : null
    const frames = stat('Кадры разложены'), req = stat('Обязательные шаги'), obj = stat('Объекты')
    return {
      feed: items.map(e => +e.dataset.frame),
      tiles: tiles.map(e => e.dataset.frame + ':' + e.dataset.state),
      sel: tiles.filter(e => e.getAttribute('aria-checked') === 'true').map(e => +e.dataset.frame),
      mode: activeTab(['оставлять', 'убирать']) === 'убирать' ? 'hide' : 'keep',
      size: activeTab(['M', 'L']) === 'L' ? 'lg' : 'md',
      tab,
      cur: document.querySelector('[data-obj][data-current]')?.dataset.obj ?? null,
      open: [...document.querySelectorAll('[data-obj][data-state=open]')].map(o => o.dataset.obj).sort(),
      curHint: t(document.querySelector('#curHint')?.textContent),
      sessMeta: t(document.querySelector('[data-asis="сводка сессии"]')?.textContent),
      stats: [val(frames, 'value'), val(frames, 'sub'), val(req, 'value'), val(req, 'sub'), val(obj, 'value'), val(obj, 'sub')],
      window: win,
      form,
      review: rv ? {
        title: t(rv.querySelector('[data-slot=callout-title]')?.textContent),
        text: t(rv.querySelector('[data-slot=callout-text]')?.textContent),
        only: rv.querySelector('[role=checkbox]') ? rv.querySelector('[role=checkbox]').getAttribute('aria-checked') === 'true' : null,
      } : null,
      repeats: [...document.querySelectorAll('[data-obj]')].filter(o => o.getClientRects().length).map(o => o.dataset.obj + ([...o.querySelectorAll('[data-slot=repeat-header] span')].some(s => t(s.textContent) === 'предложено') ? '*' : '')),
      hints: [...document.querySelectorAll('[data-slot=stage-note]')].filter(h => h.getClientRects().length).map(h => t(h.textContent)),
      bind: M.frames.filter(f => f.objId).map(f => f.i + '>' + f.objId + '|' + f.stepId + (f.auto ? '*' : '')),
      notices: [...document.querySelectorAll('[data-slot=toast]')].filter(e => e.dataset.state !== 'closed' && !e.dataset.seen).map(e => { e.dataset.seen = '1'; return t(e.querySelector('[data-slot=alert] p')?.textContent) }),
      selbar: document.querySelector('[data-slot=action-bar][data-state=open]') ? { count: t(document.querySelector('[data-slot=action-bar-count]').textContent), sub: t(document.querySelector('[data-slot=action-bar-sub]')?.textContent) } : null,
      pop: !!document.querySelector('[data-slot=popover] [data-slot=assign-list]'),
      viewer: M.state.lb >= 0 ? M.visibleMedia()[M.state.lb]?.n ?? null : null,
      bind: (() => { if (M.state.lb < 0) return null; const b = document.querySelector('[data-slot=frame-bind-bar]'); if (!b) return null
        const name = [...b.querySelectorAll('b')].map(x => t(x.textContent)).filter(x => x !== 'Отклонён проверяющим').pop() ?? ''
        const blocked = /— шаг (проверен и закрыт|уже заполнен)/.exec(b.textContent)?.[1] ?? ''
        if (b.dataset.state === 'suggest') return /Похоже на новый объект/.test(b.textContent) ? 'создать: ' + name : 'предложение: ' + name + (blocked ? ' — ' + blocked : '')
        return b.dataset.state === 'free' ? 'свободен' : 'распределён: ' + name })(),
      linked: [...document.querySelectorAll('[data-slot=frame-tile][data-linked]')].map(c => +c.dataset.frame),
      dim: !!document.querySelector('[data-slot=frame-tile][data-dimmed]'),
      hl: [...document.querySelectorAll('[data-step-key][data-highlighted]')].map(x => x.dataset.stepKey),
      hlObj: [...document.querySelectorAll('[data-obj][data-highlighted]')].map(x => x.dataset.obj),
      closed: [...document.querySelectorAll('[data-stage][data-state=closed]')].map(x => x.dataset.stage),
      steps: [...document.querySelectorAll('[data-step-key]')].filter(x => x.getClientRects().length).map(x => x.dataset.stepKey),
      tools: [...document.querySelectorAll('.schtools button')].map(b => t(b.textContent)),
    }
  })()`),
})

/* ------------------------------ сценарии ------------------------------ */
/** Шаг — [название, действие(адаптер)]. Слепок снимается после каждого шага, включая старт. */
const SCENARIOS = {
  'С-01': ['лента по времени, порядок не меняется (§4.3)', [
    ['выделить кадр 21', a => a.tile(21)],
    ['выделить кадр 25', a => a.tile(25)],
    ['убирать разобранные', a => a.mode('hide')],
    ['оставлять разобранные', a => a.mode('keep')],
    ['размер L', a => a.size('lg')],
    ['размер M', a => a.size('md')],
    ['снять выделение 21', a => a.tile(21)],
  ]],
  'С-02': ['«Разобранные: оставлять / убирать» (§8.2)', [
    ['убирать', a => a.mode('hide')],
    ['оставлять', a => a.mode('keep')],
    ['убирать снова', a => a.mode('hide')],
  ]],
  'С-03': ['размер превью M / L (§8.1)', [
    ['L', a => a.size('lg')],
    ['M', a => a.size('md')],
  ]],
  'С-16': ['текущий повтор: клик по заголовку, повторный — свернуть (§9.3)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['заголовок o2 — свернуть', a => a.repeat('o2')],
    ['заголовок o2 — раскрыть', a => a.repeat('o2')],
    ['заголовок o1 — текущий', a => a.repeat('o1')],
  ]],
  'С-32': ['окно «Горячие клавиши»', [
    ['открыть', a => a.hotkeys()],
    ['«Понятно»', a => a.windowButton('Понятно')],
    ['открыть снова', a => a.hotkeys()],
    ['Esc', a => a.key('Escape')],
  ]],
  'С-38': ['форма осмотра: поля, зависимые, сверка (§7)', [
    ['вкладка «Форма осмотра»', a => a.tab('form')],
    ['хранение — открытая площадка', a => a.general('storage', 'Открытая площадка')],
    ['хранение — здание', a => a.general('storage', 'Здание')],
    ['по документам 1', a => a.general('number', '1')],
    ['по документам 3', a => a.general('number', '3')],
    ['вкладка «Схема осмотра»', a => a.tab('scheme')],
  ]],
  /* ------------------------------ П2, такт 39 ------------------------------ */
  'С-15': ['счётчики подшапки пересчитываются (§7.1–7.2)', [
    ['открыть запуск', a => a.wand()],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['конец обработки', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
    ['принять o3', a => a.repeatAct('o3', 'accept')],
    ['отклонить o4', a => a.repeatAct('o4', 'reject')],
    ['«Принять все объекты»', a => a.reviewAll('accept')],
  ]],
  'С-27': ['запуск: три режима с прогнозом, «Нечего распределять» (§12.1–12.4) · «Частично проверен»', [
    ['открыть запуск', a => a.wand()],
    ['режим «Только структура»', a => a.wandMode('struct')],
    ['режим «Только кадры»', a => a.wandMode('photos')],
    ['«Отмена»', a => a.windowButton('Отмена')],
    ['открыть снова — режим «полное»', a => a.wand()],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['конец обработки', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
    ['«Принять все объекты»', a => a.reviewAll('accept')],
    ['запуск — нечего распределять', a => a.wand()],
  ]],
  'С-27/пустой': ['запуск: недоступный режим, полное на пустом (§12.1–12.4, §19) · «Пустой осмотр»', [
    ['открыть запуск', a => a.wand()],
    ['режим «Только кадры» — недоступен', a => a.wandMode('photos')],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['конец обработки', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
  ], { dataset: 'empty' }],
  'С-28': ['прогресс и прерывание без частичного применения (§12.5–12.6)', [
    ['открыть запуск', a => a.wand(), { remember: 'до запуска' }],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['«Прервать»', a => a.stop(), { same: 'до запуска' }],
    ['открыть запуск снова', a => a.wand()],
    ['режим «Только структура»', a => a.wandMode('struct')],
    ['запустить структуру', a => a.windowButton('Запустить')],
    ['«Прервать» структуру', a => a.stop(), { same: 'до запуска' }],
  ]],
  'С-29': ['сводка результата и её действия (§12.12–12.13) · полное', [
    ['открыть запуск', a => a.wand()],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['конец обработки — сводка', a => a.waitWand()],
    ['«Показать кадры без места»', a => a.windowButton('Показать кадры без места')],
    ['оставлять разобранные', a => a.mode('keep')],
  ]],
  'С-29/режимы': ['сводка и привязки: «Только структура», затем «Только кадры» (§12.1, §12.12)', [
    ['открыть запуск', a => a.wand()],
    ['режим «Только структура»', a => a.wandMode('struct')],
    ['запустить структуру', a => a.windowButton('Запустить')],
    ['конец обработки — сводка', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
    ['«Принять все объекты»', a => a.reviewAll('accept')],
    ['открыть запуск', a => a.wand()],
    ['режим «Только кадры»', a => a.wandMode('photos')],
    ['запустить кадры', a => a.windowButton('Запустить')],
    ['конец обработки — сводка', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
  ]],
  'С-30': ['приёмка: объект, «только непроверенные», отмена (§13)', [
    ['открыть запуск', a => a.wand()],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['конец обработки', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
    ['принять o3', a => a.repeatAct('o3', 'accept')],
    ['отклонить o4', a => a.repeatAct('o4', 'reject')],
    ['«только непроверенные» — снять', a => a.reviewOnly()],
    ['«только непроверенные» — вернуть', a => a.reviewOnly()],
    ['«Отменить автораспределение»', a => a.reviewAll('reject')],
  ]],
  /* ------------------------------ П3, такт 40 ------------------------------ */
  'С-05': ['выделение: клик, Shift, Ctrl+A, «Выделить всё», «Снять», рамка, автопрокрутка (§10.1)', [
    ['кадр 21', a => a.tile(21)],
    ['Shift + кадр 25 — диапазон', a => a.tileMod(25, 8)],
    ['кадр 23 — снять', a => a.tile(23)],
    ['«Снять»', a => a.selbar('clear')],
    ['Ctrl+A', a => a.key('a', 'KeyA', { modifiers: 2 })],
    ['Ctrl+A — снять видимое', a => a.key('a', 'KeyA', { modifiers: 2 })],
    ['«Выделить всё»', a => a.selectAllButton()],
    ['«Снять» после «Выделить всё»', a => a.selbar('clear')],
    ['рамка с поля ленты до кадра 3', a => a.marquee(1, 3)],
    ['Shift + Alt: рамка с кадра 4 — к выделению', a => a.marquee(4, 4, { alt: true, shift: true })],
    ['Alt: рамка с кадра 2 до 3 — заново', a => a.marquee(2, 3, { alt: true })],
    ['Esc — снять', a => a.key('Escape')],
    ['рамка к нижнему краю — автопрокрутка', async (a) => { a.probe = [await a.marqueeEdge(1, 8)] }, { only: ['probe'] }],
    ['«Снять» после рамки к краю', a => a.selbar('clear')],
  ]],
  'С-06': ['панель выделения: счёт, распределено, видео (§10.2)', [
    ['кадр 1 — распределён до вас', a => a.tile(1)],
    ['кадр 2', a => a.tile(2)],
    ['кадр 22 — видео', a => a.tile(22)],
    ['кадр 1 — снять', a => a.tile(1)],
    ['«Снять»', a => a.selbar('clear')],
  ]],
  'С-07': ['поповер «Назначить на шаг»: шаг, «сделать текущим», тип, предел (§10.3–10.5)', [
    ['кадр 21', a => a.tile(21)],
    ['«Назначить на шаг»', a => a.selbar('toStep')],
    ['«Поэтажные планы»', a => a.popOption('gen|g2')],
    ['кадр 23', a => a.tile(23)],
    ['«Назначить на шаг» — снова', a => a.selbar('toStep')],
    ['«сделать текущим» o2', a => a.popOption('obj|o2')],
    ['«Назначить на шаг» — с текущим', a => a.selbar('toStep')],
    ['«Контрольное видео» — не тот тип', a => a.popOption('o2|e8')],
    ['Shift + кадр 24', a => a.tileMod(24, 8)],
    ['«Назначить на шаг» — два кадра', a => a.selbar('toStep')],
    ['«Фото с представителем» — сверх предела', a => a.popOption('fin|f3')],
    ['«В «Прочее»»', a => a.selbar('misc')],
  ]],
  'С-08': ['привязка кликом по строке шага (§9.5)', [
    ['шаг g2 без выделения', a => a.step('gen|g2')],
    ['кадр 21', a => a.tile(21)],
    ['шаг g2', a => a.step('gen|g2')],
    ['кадр 23', a => a.tile(23)],
    ['шаг g1 — проверен и закрыт', a => a.step('gen|g1')],
    ['Esc', a => a.key('Escape')],
  ]],
  'С-09': ['перетаскивание на шаг, запрет на закрытый (§9.5)', [
    ['тянуть кадр 21 на g2', a => a.dragTo(21, 'gen|g2')],
    ['кадр 23', a => a.tile(23)],
    ['Shift + кадр 24', a => a.tileMod(24, 8)],
    ['тянуть выделение за кадр 24 на g2', a => a.dragTo(24, 'gen|g2')],
    ['тянуть кадр 25 на g1 — закрыт', a => a.dragTo(25, 'gen|g1')],
    ['Esc', a => a.key('Escape')],
  ]],
  'С-10': ['клавиши 1–8, «Сначала выберите текущий объект» (§16.2)', [
    ['кадр 21', a => a.tile(21)],
    ['1 без текущего', a => a.key('1', 'Digit1')],
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['4 — «Узлы и агрегаты»', a => a.key('4', 'Digit4')],
    ['кадр 23', a => a.tile(23)],
    ['9 — шага нет', a => a.key('9', 'Digit9')],
    ['Esc', a => a.key('Escape')],
  ]],
  'С-11': ['открепление: крестик миниатюры, Del, крестик плашки, «Открепить» в просмотре (§6, §9.6, §11.2)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['кадр 21', a => a.tile(21)],
    ['4', a => a.key('4', 'Digit4')],
    ['крестик миниатюры', a => a.thumbRemove('o2|e4', 0)],
    ['кадр 21 — снова', a => a.tile(21)],
    ['4 — снова', a => a.key('4', 'Digit4')],
    ['кадр 21 — выделить распределённый', a => a.tile(21)],
    ['Del', a => a.key('Delete')],
    ['кадр 21 — третий раз', a => a.tile(21)],
    ['4 — третий раз', a => a.key('4', 'Digit4')],
    ['крестик плашки кадра', a => a.tileUnassign(21)],
    ['кадр 21 — четвёртый раз', a => a.tile(21)],
    ['4 — четвёртый раз', a => a.key('4', 'Digit4')],
    ['просмотр кадра 21', a => a.viewer(21)],
    ['«Открепить» на плашке просмотра', a => a.bindUnbind()],
    ['Del в просмотре — «и так не распределён»', a => a.key('Delete')],
    ['Esc — закрыть просмотр', a => a.key('Escape')],
  ]],
  'С-12': ['отказы с причиной (§6.1, тексты §18), привязки не меняются', [
    ['кадр 21', a => a.tile(21)],
    ['1 — «Сначала выберите текущий объект»', a => a.key('1', 'Digit1'), { remember: 'до отказов' }],
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['1 — шаг проверен и закрыт', a => a.key('1', 'Digit1')],
    ['8 — фото в шаг видео', a => a.key('8', 'Digit8')],
    ['кадр 21 — снять', a => a.tile(21)],
    ['кадр 22 — видео', a => a.tile(22)],
    ['4 — видео в шаг фото', a => a.key('4', 'Digit4')],
    ['кадр 85 — второе видео', a => a.tile(85)],
    ['8 — сверх предела 1', a => a.key('8', 'Digit8')],
    ['Del — «и так не распределено»', a => a.key('Delete')],
    ['кадр 1 — в проверенном шаге', a => a.tile(1)],
    ['Del — открепить нельзя', a => a.key('Delete')],
    ['кадр 3 — отклонён', a => a.tile(3)],
    ['Del — отклонённый открепить нельзя', a => a.key('Delete')],
    ['тянуть кадр 21 на e1 — закрыт', a => a.dragTo(21, 'o2|e1'), { sameBind: 'до отказов' }],
    ['кадр 22 — видео снова', a => a.tile(22)],
    ['8 — видео в «Контрольное видео»', a => a.key('8', 'Digit8')],
    ['кадр 85', a => a.tile(85)],
    ['клик по заполненному e8 — «Шаг уже заполнен»', a => a.step('o2|e8')],
    ['тянуть кадр 85 на заполненный e8', a => a.dragTo(85, 'o2|e8')],
  ]],
  'С-13': ['отмена: «Отменить» в уведомлении, Ctrl+Z, «Нечего отменять» (§10.6)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['кадр 21', a => a.tile(21)],
    ['4', a => a.key('4', 'Digit4')],
    ['«Отменить» в уведомлении', a => a.toastUndo()],
    ['кадр 21 — снова', a => a.tile(21)],
    ['4 — снова', a => a.key('4', 'Digit4')],
    ['Ctrl+Z', a => a.key('z', 'KeyZ', { modifiers: 2 })],
    ['Ctrl+Z — нечего отменять', a => a.key('z', 'KeyZ', { modifiers: 2 })],
  ]],
  'С-13/глубина': ['отмена: 21 привязка и 21 отмена — модель как до них (§10.6, глубина не меньше 20)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['21 кадр по одному клавишей 4', async (a) => { for (const i of DEPTH) { await a.tile(i); await a.key('4', 'Digit4') } }, { remember: 'до привязок', skip: ['notices'] }],
    ['21 × Ctrl+Z', async (a) => { for (let k = 0; k < DEPTH.length; k++) await a.key('z', 'KeyZ', { modifiers: 2 }) }, { same: 'до привязок', skip: ['notices'] }],
  ]],
  'С-14': ['автосохранение: «Сохранение…» 700 мс после операции, затем «сохранены» (§17.2)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['кадр 21', a => a.tile(21)],
    ['4 — сохранение идёт, через 0.9 с — сохранено', async (a) => { await a.key('4', 'Digit4'); a.probe = [await a.savingNow()]; await sleep(900); a.probe.push(await a.savingNow()) }],
  ]],
  'С-35': ['Esc по приоритету: просмотр → окно → выделение (§16)', [
    ['кадр 21', a => a.tile(21)],
    ['кадр 23', a => a.tile(23)],
    ['просмотр кадра 6', a => a.viewer(6)],
    ['Esc — закрыт просмотр, выделение на месте', a => a.key('Escape')],
    ['«Горячие клавиши»', a => a.hotkeys()],
    ['Esc — закрыто окно, выделение на месте', a => a.key('Escape')],
    ['Esc — снято выделение', a => a.key('Escape')],
  ]],
  /* ------------------------------ П4, такт 41 ------------------------------ */
  'С-07/закрытый пункт': ['поповер: закрытый пункт даёт отказ с причиной, плашка открыта (решение чата, такт 41)', [
    ['кадр 21', a => a.tile(21)],
    ['«Назначить на шаг»', a => a.selbar('toStep')],
    ['закрытый «Генплан» — отказ', a => a.popOption('gen|g1')],
    ['«Фото с представителем» — привязка', a => a.popOption('fin|f3')],
    ['кадр 23', a => a.tile(23)],
    ['«Назначить на шаг» — снова', a => a.selbar('toStep')],
    ['заполненный «Фото с представителем» — отказ', a => a.popOption('fin|f3')],
    ['клик мимо — плашка закрыта', a => a.clickAway()],
  ]],
  'С-17': ['«Свернуть все / Развернуть все», «Только открытые», «Скрыто проверенных шагов» (§9.1–9.2)', [
    ['«Свернуть все»', a => a.toggleAll()],
    ['«Развернуть все»', a => a.toggleAll()],
    ['заголовок o2 — раскрыть', a => a.repeat('o2')],
    ['«Только открытые»', a => a.onlyOpen()],
    ['«Показать все (+N)»', a => a.onlyOpen()],
  ]],
  'С-21': ['наведение в обе стороны без прокрутки (§15.1–15.2)', [
    ['кадр 1 — шаг свёрнут, подсветки нет', a => a.hoverTile(1)],
    ['заголовок o2 — раскрыть: кадры объекта', a => a.repeat('o2')],
    ['кадр 1 — шаг виден: шаг и объект', a => a.hoverTile(1)],
    ['шаг «Шильдик» — его кадры', a => a.hoverStep('o2|e1')],
    ['шаг g4 — кадры сняты в шаге, лента приглушена', a => a.hoverStep('gen|g4')],
    ['заголовок o2 — кадры объекта', a => a.hoverRepeat('o2')],
    ['указатель ушёл', a => a.away()],
  ], { hover: true }],
  'С-22': ['«Показать в структуре»: раскрытие, текущий, снять фильтр, вспышка, обводка (§15.3)', [
    ['кадр 1 — показать в структуре', a => findProbe(a, 1)],
    ['«Только открытые»', a => a.onlyOpen()],
    ['кадр 2 — показать: фильтр снят', a => findProbe(a, 2)],
  ], { hover: true }],
  'С-22/не найден': ['«Шаг не найден в структуре»: объект скрыт фильтром приёмки (§15.3)', [
    ['открыть запуск', a => a.wand()],
    ['запустить полное', a => a.windowButton('Запустить')],
    ['конец обработки', a => a.waitWand()],
    ['«К проверке»', a => a.windowButton('К проверке')],
    ['кадр 1 — показать: объект скрыт', a => a.locate(1)],
  ]],
  'С-23': ['просмотр: иконка, двойной клик, миниатюра, ← →, Esc (§11, §9.7)', [
    ['кадр 21 — иконкой', a => a.viewer(21)],
    ['→', a => a.key('ArrowRight')],
    ['← ←', async (a) => { await a.key('ArrowLeft'); await a.key('ArrowLeft') }],
    ['Esc', a => a.key('Escape')],
    /* Прототип двойным кликом просмотр не открывает: первый клик перерисовывает ленту, узел плитки подменён, dblclick не приходит.
       Кит открывает, как хочет код прототипа и спека (§11.1), — строка реестра расхождений; шаг кадр просмотра не сравнивает. */
    ['двойной клик по кадру 23', a => a.dblTile(23), { skip: ['viewer', 'bind'] }],
    ['Esc — после двойного клика', a => a.key('Escape')],
    ['заголовок o2 — раскрыть', a => a.repeat('o2')],
    ['миниатюра кадра 1 в «Шильдике»', a => a.thumbOpen('o2|e1', 0)],
    ['← у первого кадра', a => a.key('ArrowLeft')],
    ['Esc — после миниатюры', a => a.key('Escape')],
  ]],
  'С-24': ['просмотр, сценарий А: привязка, вспышка, переход через 820 мс; 1–N (§11.3)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['просмотр кадра 20', a => a.viewer(20)],
    ['4 — вспышка и переход', a => flashProbe(a, () => a.key('4', 'Digit4'))],
    ['пункт «Узлы и агрегаты» для кадра 21', a => flashProbe(a, () => a.lbItem('o2|e4'))],
    ['пункт «Узлы и агрегаты» для видео 22 — не тот тип', a => a.lbItem('o2|e4')],
    ['закрытый пункт «Шильдик» — отказ', a => a.lbItem('o2|e1')],
    ['«сделать текущим» o1', a => a.lbItem('obj|o1')],
    ['Esc', a => a.key('Escape')],
  ]],
  'С-25': ['просмотр, сценарий Б: «Перенести кадр?», без перехода (§11.4)', [
    ['заголовок o2 — текущий', a => a.repeat('o2')],
    ['просмотр кадра 21', a => a.viewer(21)],
    ['4 — привязка', a => flashProbe(a, () => a.key('4', 'Digit4'))],
    ['← к кадру 21', a => a.key('ArrowLeft')],
    ['5 — окно «Перенести кадр?»', a => a.key('5', 'Digit5')],
    ['«Отмена»', a => a.windowButton('Отмена')],
    ['5 — снова', a => a.key('5', 'Digit5')],
    ['«Перенести» — вспышка, кадр остаётся', a => flashProbe(a, () => a.windowButton('Перенести'))],
    ['«Открепить» на плашке', a => a.bindUnbind()],
    ['Esc', a => a.key('Escape')],
    ['просмотр кадра 1 — привязан до вас', a => a.viewer(1)],
    ['5 — перенести нельзя', a => a.key('5', 'Digit5')],
    ['«Показать в структуре» на плашке', a => a.bindLocate().then(() => sleep(400))],
  ]],
  'С-26': ['«Подобрать шаг»: закрытый шаг, новый объект, «Не то», честный отказ (§12.14)', [
    ['просмотр кадра 6', a => a.viewer(6)],
    ['«Подобрать шаг» — шаг закрыт', a => a.suggest()],
    ['Enter — у закрытого не действует', a => a.key('Enter', 'Enter', { text: '\r' })],
    ['«Не то»', a => a.suggestNo()],
    ['→ кадр 7', a => a.key('ArrowRight')],
    ['«Подобрать шаг» — новый объект', a => a.suggest()],
    ['«Не то» — снова', a => a.suggestNo()],
    ['Esc', a => a.key('Escape')],
    ['просмотр кадра 23', a => a.viewer(23)],
    ['«Подобрать шаг» — не распознан', a => a.suggest()],
    ['Esc — после отказа', a => a.key('Escape')],
  ]],
  'С-26/пустой': ['«Подобрать шаг» → Enter: привязка, вспышка, переход (§12.14) · «Пустой осмотр»', [
    ['просмотр кадра 6', a => a.viewer(6)],
    ['«Подобрать шаг» — «Общий вид территории»', a => a.suggest()],
    ['Enter — принять', a => flashProbe(a, () => a.key('Enter', 'Enter', { text: '\r' }))],
    ['Esc', a => a.key('Escape')],
  ], { dataset: 'empty' }],
}

/**
 * Замер «Показать в структуре» (С-22): какой шаг вспыхнул и какая миниатюра обведена — в сравнение (`probe`); сколько
 * держатся вспышка и обводка — в замеры (`measure`, печатаются, не сравниваются). Время снимает наблюдатель в странице,
 * задержка CDP в числа не входит. После действия указатель уходит: прототип теряет подсветку наведения при перерисовке.
 */
async function findProbe(a, i) {
  await a.foundWatch()
  await a.locate(i)
  a.probe = [JSON.parse(await a.found())]
  await a.away()
  await sleep(2000)
  const w = JSON.parse(await a.watched())
  const span = k => (w.on[k] != null && w.off[k] != null ? Math.round(w.off[k] - w.on[k]) : null)
  a.measure = { 'вспышка шага, мс': span('step'), 'обводка миниатюры, мс': span('thumb') }
}
/**
 * Замер привязки в просмотре (С-24–26): вспышка плашки и переход к следующему кадру. В сравнение — были ли вспышка и
 * переход; длительности — в замеры: вспышка от включения до выключения, переход — от включения вспышки.
 */
async function flashProbe(a, act) {
  await a.bindWatch()
  await act()
  await sleep(1400)
  const w = JSON.parse(await a.watched())
  const on = w.on.flash
  a.probe = [on != null, w.on.index != null]
  a.measure = {
    'вспышка плашки, мс': on != null && w.off.flash != null ? Math.round(w.off.flash - on) : null,
    'переход после начала вспышки, мс': on != null && w.on.index != null ? Math.round(w.on.index - on) : null,
  }
}

/** Кадры для глубины отмены: 21 свободное фото ленты. */
const DEPTH = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27]

function diff(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], path ? `${path}.${k}` : k))
  }
  const show = v => { const s = JSON.stringify(v); return s && s.length > 160 ? `${s.slice(0, 157)}…` : s }
  /* Длинные списки (лента, привязки) — с первой расходящейся позиции. */
  if (Array.isArray(a) && Array.isArray(b)) {
    const k = a.findIndex((x, n) => JSON.stringify(x) !== JSON.stringify(b[n]))
    const at = k < 0 ? Math.min(a.length, b.length) : k
    return [`${path}[${at}…]: прототип ${show(a.slice(at, at + 6))} (всего ${a.length}) · кит ${show(b.slice(at, at + 6))} (всего ${b.length})`]
  }
  return [`${path}: прототип ${show(a)} · кит ${show(b)}`]
}

/**
 * Шаг — [название, действие, опции]. Опции П2: `remember: имя` — снять состояние модели обеих сторон до действия;
 * `same: имя` — после действия состояние каждой стороны глубоко равно запомненному (прерывание без частичного
 * применения, §12.6). Опция сценария `dataset` — набор старта.
 */
async function run(id) {
  const [title, steps, opts = {}] = SCENARIOS[id]
  const pp = await openPage()
  const kp = await openPage()
  const P = prototype(pp)
  const K = kit(kp)
  const fails = []
  const kept = {}
  const measures = []
  let snaps = 0
  try {
    await P.start(opts.dataset)
    await K.start(opts.dataset)
    const all = [['старт', null], ...steps]
    for (const [name, act, o = {}] of all) {
      if (o.remember) kept[o.remember] = [await P.dump(), await K.dump()]
      if (act) { await act(P); await act(K); await sleep(150) }
      if (o.sameBind) {
        const now = [await P.dump(), await K.dump()]
        const bindOf = j => { const d = JSON.parse(j); return JSON.stringify([d.frames, d.objects, d.review]) }
        ;[P, K].forEach((side, k) => {
          if (bindOf(now[k]) !== bindOf(kept[o.sameBind][k])) fails.push({ step: name, lines: [`${side.name}: привязки изменились после отказов с «${o.sameBind}»`] })
        })
      }
      if (o.same) {
        const now = [await P.dump(), await K.dump()]
        ;[P, K].forEach((side, k) => {
          if (now[k] !== kept[o.same][k]) fails.push({ step: name, lines: [`${side.name}: состояние модели не равно состоянию «${o.same}»`, ...diff(JSON.parse(kept[o.same][k]), JSON.parse(now[k])).slice(0, 6)] })
        })
      }
      const [a, b] = [await P.snapshot(), await K.snapshot()]
      /* Замер действия (С-14): сохранение идёт сразу после операции и закончилось через 0.9 с. */
      ;[[a, P], [b, K]].forEach(([x, side]) => { if (side.probe) { x.probe = side.probe; side.probe = null } })
      if (process.env.DEBUG_PROBE && (a.probe || b.probe)) console.log('   замер', name, JSON.stringify(a.probe), JSON.stringify(b.probe))
      if (P.measure || K.measure) { measures.push({ step: name, p: P.measure, k: K.measure }); P.measure = null; K.measure = null }
      /* Шаг, где раскладка ленты различается до вёрстки П5, сравнивает только названные поля. */
      if (o.only) for (const x of [a, b]) for (const key of Object.keys(x)) if (!o.only.includes(key)) delete x[key]
      /* Шаг-цикл: стороны действуют по очереди, и уведомления первой истекают, пока идёт вторая, — их шаг не сравнивает. */
      if (o.skip) for (const x of [a, b]) for (const key of o.skip) delete x[key]
      /* Подсветку наведения сравнивают сценарии наведения (опция сценария `hover`): в остальных указатель остаётся там, где
         кликнул, а прототип пересчитывает подсветку, когда перерисовка подменяет узел под курсором, — строка реестра, такт 41. */
      if (!opts.hover) for (const x of [a, b]) for (const key of ['linked', 'dim', 'hl', 'hlObj']) delete x[key]
      snaps += 2
      const d = diff(a, b)
      if (d.length) fails.push({ step: name, lines: d })
    }
  }
  finally { await pp.close(); await kp.close() }
  return { id, title, steps: steps.length, snaps, fails, measures }
}

await ensureChrome()
const pick = process.argv.slice(2)
const ids = pick.length ? pick : Object.keys(SCENARIOS)
let failed = 0
let totalSteps = 0
let totalSnaps = 0
for (const id of ids) {
  if (!SCENARIOS[id]) { console.log(`${id}: нет такого сценария`); failed++; continue }
  const r = await run(id)
  totalSteps += r.steps
  totalSnaps += r.snaps
  if (r.fails.length) {
    failed++
    console.log(`✗ ${r.id} ${r.title} — шагов ${r.steps}, слепков ${r.snaps}`)
    for (const f of r.fails) { console.log(`   шаг «${f.step}»:`); f.lines.forEach(l => console.log(`     ${l}`)) }
  }
  else console.log(`✓ ${r.id} ${r.title} — шагов ${r.steps}, слепков ${r.snaps}, совпали`)
  for (const x of r.measures) console.log(`   замер «${x.step}»: прототип ${JSON.stringify(x.p)} · кит ${JSON.stringify(x.k)}`)
}
console.log(`\nСценариев ${ids.length}, зелёных ${ids.length - failed}; шагов ${totalSteps}, слепков ${totalSnaps}`)
process.exit(failed ? 1 : 0)
