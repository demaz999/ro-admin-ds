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
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } }
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
    /** Реальный клик мышью по центру элемента: выражение `sel` возвращает элемент. */
    async click(sel) {
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
      const p = await settle(await at(true))
      if (!p) throw new Error(`нет элемента для клика: ${sel}`)
      if (process.env.DEBUG_CLICK) console.log('   клик', p, await evaluate(`document.elementFromPoint(${p.x}, ${p.y})?.outerHTML.slice(0, 120)`))
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
      await sleep(250)
    },
    async key(key, code = key, extra = {}) {
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
  tile: i => page.click(`document.querySelector('#feed .card[data-i="${i}"] img')`),
  mode: v => page.click(`document.querySelector('#mode button[data-m="${v}"]')`),
  size: v => page.click(`document.querySelector('#sizer button[data-s="${v === 'lg' ? 272 : 176}"]')`),
  repeat: id => page.click(`document.querySelector('.obj[data-obj="${id}"] .obj-h')`),
  tab: v => page.click(`document.querySelector('.rtab[data-r="${v}"]')`),
  hotkeys: () => page.click(`document.querySelector('#btnHelp')`),
  windowButton: text => page.click(`[...document.querySelectorAll('#mFoot button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`),
  key: name => page.key(name),
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
      sel: cards.filter(c => c.classList.contains('sel')).map(c => +c.dataset.i),
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
      repeats: [...document.querySelectorAll('.obj[data-obj]')].map(o => o.dataset.obj + (o.classList.contains('auto') ? '*' : '')),
      hints: [...document.querySelectorAll('#rbody .hintbox')].map(h => t(h.textContent)),
      bind: frames.filter(f => f.objId).map(f => f.i + '>' + f.objId + '|' + f.stepId + (f.auto ? '*' : '')),
      notices: [...document.querySelectorAll('#toasts .toast > span')].map(s => t(s.textContent)),
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
  tile: i => page.click(`document.querySelector('[data-slot=frame-tile][data-frame="${i}"] img')`),
  mode: v => page.click(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'hide' ? 'убирать' : 'оставлять')})`),
  size: v => page.click(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'lg' ? 'L' : 'M')})`),
  repeat: id => page.click(`document.querySelector('[data-obj="${id}"] [data-slot=repeat-header]')`),
  tab: v => page.click(`[...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === ${JSON.stringify(v === 'form' ? 'Форма осмотра' : 'Схема осмотра')})`),
  hotkeys: () => page.click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Горячие клавиши')`),
  windowButton: text => page.click(`[...document.querySelectorAll('[data-slot=modal-card] button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})`),
  key: name => page.key(name),
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
      repeats: [...document.querySelectorAll('[data-obj]')].map(o => o.dataset.obj + ([...o.querySelectorAll('[data-slot=repeat-header] span')].some(s => t(s.textContent) === 'предложено') ? '*' : '')),
      hints: [...document.querySelectorAll('[data-slot=stage-note]')].map(h => t(h.textContent)),
      bind: M.frames.filter(f => f.objId).map(f => f.i + '>' + f.objId + '|' + f.stepId + (f.auto ? '*' : '')),
      notices: [...document.querySelectorAll('[data-slot=toast]')].filter(e => e.dataset.state !== 'closed').map(e => t(e.querySelector('[data-slot=alert] p')?.textContent)),
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
}

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

/** Новые уведомления: текущие минус бывшие на прошлом слепке, с учётом повторов. */
function fresh(before, now) {
  const left = [...before]
  return now.filter((x) => { const k = left.indexOf(x); if (k < 0) return true; left.splice(k, 1); return false })
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
  const prev = [[], []]
  let snaps = 0
  try {
    await P.start(opts.dataset)
    await K.start(opts.dataset)
    const all = [['старт', null], ...steps]
    for (const [name, act, o = {}] of all) {
      if (o.remember) kept[o.remember] = [await P.dump(), await K.dump()]
      if (act) { await act(P); await act(K); await sleep(150) }
      if (o.same) {
        const now = [await P.dump(), await K.dump()]
        ;[P, K].forEach((side, k) => {
          if (now[k] !== kept[o.same][k]) fails.push({ step: name, lines: [`${side.name}: состояние модели не равно состоянию «${o.same}»`, ...diff(JSON.parse(kept[o.same][k]), JSON.parse(now[k])).slice(0, 6)] })
        })
      }
      const [a, b] = [await P.snapshot(), await K.snapshot()]
      /* Уведомления живут по таймеру — сравниваются появившиеся на этом шаге (разность мультимножеств). */
      ;[a, b].forEach((x, k) => { const now = x.notices; x.notices = fresh(prev[k], now); prev[k] = now })
      snaps += 2
      const d = diff(a, b)
      if (d.length) fails.push({ step: name, lines: d })
    }
  }
  finally { await pp.close(); await kp.close() }
  return { id, title, steps: steps.length, snaps, fails }
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
}
console.log(`\nСценариев ${ids.length}, зелёных ${ids.length - failed}; шагов ${totalSteps}, слепков ${totalSnaps}`)
process.exit(failed ? 1 : 0)
