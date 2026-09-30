#!/usr/bin/env node
/**
 * Прогон сценариев экрана «Распределение свободной съёмки» (VA-9265) — такт 38, порция П1.
 * План — `docs/free-shoot.md`, 16.4; итог — раздел 17. Оснастка приёмки, не продукт.
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
  spawn(bin, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'],
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  const page = {
    evaluate,
    async goto(url, wait) { await send('Page.navigate', { url }); await sleep(wait) },
    /** Реальный клик мышью по центру элемента: выражение `sel` возвращает элемент. */
    async click(sel) {
      const p = await evaluate(`(() => { const el = ${sel}; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
      if (!p) throw new Error(`нет элемента для клика: ${sel}`)
      await sleep(80)
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
 * Действия: tile(i), mode('keep'|'hide'), size('md'|'lg'), repeat(id), tab('scheme'|'form'),
 * hotkeys(), windowButton(text), key(name), general(k, value).
 */
const norm = s => (s ?? '').replace(/\s+/g, ' ').trim()
const GENERAL_KEYS = { type: 'Тип акта', storage: 'Тип хранения', heating: 'Наличие отопления', number: 'Общее количество объектов по документам' }

const prototype = page => ({
  name: 'прототип',
  async start() {
    await page.goto(PROTO_URL, 1500)
    /* Окно входа (`showEntry`) открывается при загрузке — закрыть «Разложу вручную». */
    await page.click(`[...document.querySelectorAll('#mFoot button')].find(b => b.textContent.trim() === 'Разложу вручную')`)
    /* Стартовое состояние стенда (такт 31): раскрыт повтор оборудования o2, текущего нет. У прототипа после
       загрузки свёрнуты все — выравнивание стартового состояния, строка реестра расхождений (раздел 15). */
    await page.evaluate(`(() => { state.open.add('o2'); render(); return 1 })()`)
  },
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
    const win = document.querySelector('#modal.show')
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
      window: win ? t(win.querySelector('#mTitle').textContent) + ' / ' + t(win.querySelector('#mSub').textContent) : null,
      form,
    }
  })()`),
})

const kit = page => ({
  name: 'кит',
  async start() {
    await page.goto(KIT_URL + '?asis=off', 4000)
  },
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
    const win = document.querySelector('[data-slot=modal-card]')
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
      window: win ? t(win.querySelector('[data-slot=modal-card-title]')?.textContent) + ' / ' + t(win.querySelector('[data-slot=modal-card-subtitle]')?.textContent) : null,
      form,
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
}

function diff(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], path ? `${path}.${k}` : k))
  }
  const show = v => { const s = JSON.stringify(v); return s && s.length > 160 ? `${s.slice(0, 157)}…` : s }
  return [`${path}: прототип ${show(a)} · кит ${show(b)}`]
}

async function run(id) {
  const [title, steps] = SCENARIOS[id]
  const pp = await openPage()
  const kp = await openPage()
  const P = prototype(pp)
  const K = kit(kp)
  const fails = []
  let snaps = 0
  try {
    await P.start()
    await K.start()
    const all = [['старт', null], ...steps]
    for (const [name, act] of all) {
      if (act) { await act(P); await act(K); await sleep(150) }
      const [a, b] = [await P.snapshot(), await K.snapshot()]
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
