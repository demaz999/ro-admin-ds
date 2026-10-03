#!/usr/bin/env node
/**
 * Прогон сценариев страницы «Тарификация» (Биллинг 2.0, VA-14629). Оснастка приёмки, не продукт.
 * План — `docs/tariffs.md`, раздел 7; образец — `scripts/scheme-edit-scenarios.mjs` (такт 61).
 *
 * Одна сторона — кит: сценарий выполняется на стенде `/tariffs`, после каждого шага снимается слепок.
 *
 * **До приёмки экрана ожидания стоят в самих сценариях.** Шаг — `[название, действие, ожидание, опции]`; ожидание —
 * часть слепка, взятая из сводки, со ссылкой на § в названии сценария. Слепок шага обязан содержать все поля ожидания.
 * **После приёмки** — эталон `scripts/tariffs-baseline/` по файлу на сценарий: `--update-baseline` пишет слепки и
 * печатает список изменённых; если файл эталона есть, обычный запуск сравнивает с ним весь слепок.
 *
 * Запуск (dev-сервер на 3000 уже поднят):
 *   node scripts/tariffs-scenarios.mjs                    — все сценарии
 *   node scripts/tariffs-scenarios.mjs ТФ-03 ТФ-04        — выбранные
 *   node scripts/tariffs-scenarios.mjs --update-baseline  — записать эталон
 *   node scripts/tariffs-scenarios.mjs ТФ-04 --repeat=10  — сценарий десять раз подряд
 *
 * Защита от пустой зелени: клик, не попавший в цель, — провал шага (намеренный клик по выключенному — опция `blind`);
 * уведомления, смены статуса сохранения и загрузка «Сохранить изменения» пишут наблюдатели в странице — слепок их
 * забирает. Статус «Сохранение…» и загрузка кнопки живут меньше шага: они попадают в слепок журналами `saveLog` и
 * `applyLog`, время в слепок не идёт. Часы модели прогон ставит параметром `?now=` — сроки периодов не плывут.
 * `NOTICES=1` печатает тексты уведомлений, `DEBUG_CLICK=1` — координаты и цель каждого клика.
 *
 * Chrome ищется на CDP-порту `CDP_PORT` (по умолчанию 9335); если его нет — запускается headless.
 * Адрес стенда — `KIT_URL` (по умолчанию http://localhost:3000/tariffs/).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = join(ROOT, 'scripts/tariffs-baseline')
const KIT_URL = process.env.KIT_URL ?? 'http://localhost:3000/tariffs/'
const PORT = Number(process.env.CDP_PORT ?? 9335)
/** Часы модели на прогоне — 6.4 `tariffs.md`: статусы и сроки периодов считаются от них. */
const NOW = '2026-04'
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
  const profile = mkdtempSync(join(tmpdir(), 'tf-scen-'))
  /* Фоновой вкладке Chrome тормозит таймеры — автосохранение и применение на `setTimeout`; ловушка такта 39 `CLAUDE.md`. */
  spawn(bin, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'],
  { detached: true, stdio: 'ignore' }).unref()
  for (let k = 0; k < 60; k++) {
    await sleep(250)
    try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); return } catch {}
  }
  throw new Error(`Chrome не поднялся на порту ${PORT}`)
}

async function openPage(width = 1440) {
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
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
  const page = {
    /** Клики, не попавшие в цель, — см. `point`. */
    blind: [],
    evaluate,
    async goto(url, wait) { await send('Page.navigate', { url }); await sleep(wait) },
    /**
     * Центр элемента в окне: клик — когда цель встала и не накрыта. В видимую часть цель ставится, только если она за
     * краем окна (ловушка такта 61 `CLAUDE.md`).
     */
    async point(sel) {
      await send('Page.bringToFront')
      const at = scroll => evaluate(`(() => { const el = ${sel}; if (!el) return null; ${scroll ? "{ const v = el.getBoundingClientRect(); if (v.top < 0 || v.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' }) }" : ''} const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
      let p = await at(true)
      if (!p) throw new Error(`нет элемента для клика: ${sel}`)
      for (let k = 0; k < 30; k++) { await sleep(100); const q = await at(false); if (q && q.x === p.x && q.y === p.y) break; p = q }
      for (let k = 0; k < 20; k++) {
        const free = await evaluate(`(() => { const el = ${sel}; const r = el.getBoundingClientRect()
          for (const [fx, fy] of [[0.5, 0.5], [0.8, 0.5], [0.2, 0.5], [0.5, 0.25], [0.5, 0.75]]) {
            const x = r.x + r.width * fx; const y = r.y + r.height * fy; const hit = document.elementFromPoint(x, y)
            if (hit && (el === hit || el.contains(hit))) return { x, y }
          }
          return null })()`)
        if (free) return free
        await sleep(250)
      }
      /* Цель так и не под указателем: клик уйдёт мимо — в журнал, прогон считает это провалом шага без опции `blind`. */
      page.blind.push(sel.length > 110 ? `${sel.slice(0, 107)}…` : sel)
      return p
    },
    /** Реальный клик мышью по элементу: выражение `sel` возвращает элемент. */
    async click(sel) {
      const p = await this.point(sel)
      if (process.env.DEBUG_CLICK) console.log('   клик', p, await evaluate(`(e => e ? e.outerHTML.slice(0, 90) + ' «' + e.textContent.trim().slice(0, 40) + '»' : null)(document.elementFromPoint(${p.x}, ${p.y}))`))
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
      await sleep(250)
    },
    /** Клавиша реальным вводом; служебным клавишам — `windowsVirtualKeyCode` (ловушка «Синтетический Delete по CDP»). */
    async key(key, code = key, extra = {}) {
      const VK = { Backspace: 8, Tab: 9, Enter: 13, Escape: 27, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46 }
      const vk = VK[key] ? { windowsVirtualKeyCode: VK[key], nativeVirtualKeyCode: VK[key] } : {}
      await send('Page.bringToFront')
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, ...vk, ...extra })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...vk, ...extra })
      await sleep(150)
    },
    async type(text) { await send('Input.insertText', { text }); await sleep(200) },
    close() { ws.close(); return fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`) },
  }
  return page
}

/* ------------------------------ адаптер кита ------------------------------ */
/** Ждать, пока выражение не станет истинным. */
async function until(page, expr, ms = 6000) {
  for (let t = 0; t < ms; t += 50) {
    if (await page.evaluate(expr)) return
    await sleep(50)
  }
  throw new Error(`не дождались: ${expr}`)
}
/**
 * Наблюдатели в странице. Уведомление живёт 3 с, «Сохранение…» — 0.7 с, загрузка «Сохранить изменения» — 0.9 с: слепок,
 * снятый после действия, их теряет (ловушка такта 57 `CLAUDE.md`). Журналы пишутся в момент события; слепок забирает их
 * и очищает. Загрузка кнопки пишется вместе с видом кнопки в этот момент: `aria-busy`, недоступность, спиннер и ширина
 * против ширины в покое.
 */
const WATCH = `(() => {
  const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
  window.__notices = []; window.__saveLog = []; window.__applyLog = []
  const take = el => setTimeout(() => { const c = el.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); const x = t(c.textContent); if (x) window.__notices.push(x) }, 0)
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return
    if (n.matches?.('[data-slot=toast]')) take(n); else n.querySelectorAll?.('[data-slot=toast]').forEach(take) }))).observe(document.body, { childList: true, subtree: true })
  const root = document.querySelector('[data-tariffs]')
  const btn = () => document.querySelector('[data-act=apply]')
  window.__applyRestWidth = Math.round(btn().getBoundingClientRect().width)
  new MutationObserver(() => { const s = root.dataset.save; if (window.__saveLog[window.__saveLog.length - 1] !== s) window.__saveLog.push(s) }).observe(root, { attributes: true, attributeFilter: ['data-save'] })
  new MutationObserver(() => { const b = btn()
    window.__applyLog.push({ state: root.dataset.apply, busy: b.getAttribute('aria-busy') === 'true', disabled: b.disabled, spinner: !!b.querySelector('[data-slot=spinner]'),
      sameWidth: Math.round(b.getBoundingClientRect().width) === window.__applyRestWidth }) }).observe(root, { attributes: true, attributeFilter: ['data-apply'] })
  return 1 })()`

const Q = {
  root: `document.querySelector('[data-tariffs]')`,
  back: `document.querySelector('[data-act=back]')`,
  apply: `document.querySelector('[data-act=apply]')`,
  tab: id => `document.querySelector('[data-tab-trigger=${id}]')`,
  minInput: `(document.querySelector('[data-field=min-payment]')?.matches('input') ? document.querySelector('[data-field=min-payment]') : document.querySelector('[data-field=min-payment] input'))`,
  retry: `document.querySelector('[data-slot=app-bar-status-retry]')`,
}

function kit(page) {
  return {
    page,
    async start(query = '') {
      const qs = [`now=${NOW}`, query].filter(Boolean).join('&')
      await page.goto(`${KIT_URL}?${qs}`, 1500)
      await until(page, `!!${Q.root} && !!window.__tariffs`, 20000)
      await page.evaluate(`(async () => { await document.fonts.ready; return 1 })()`)
      await page.evaluate(WATCH)
      await sleep(300)
    },
    back: () => page.click(Q.back),
    apply: () => page.click(Q.apply),
    tab: id => page.click(Q.tab(id)),
    /** Минимальная сумма: выделить всё и набрать новый текст реальным вводом; пустая строка — Delete. */
    async setMin(text) {
      await page.click(Q.minInput)
      await page.evaluate(`(${Q.minInput}.select(), 1)`)
      if (text) await page.type(text)
      else await page.key('Delete')
    },
    retry: () => page.click(Q.retry),
    /** Дождаться конца записи черновика: статус ушёл из «Сохранение…». */
    settled: () => until(page, `${Q.root}.dataset.save !== 'saving'`),
    /** Дождаться конца применения правок. */
    applied: () => until(page, `${Q.root}.dataset.apply === 'idle'`),
    async snapshot() {
      const s = await page.evaluate(`(() => {
        const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
        const root = ${Q.root}
        const status = document.querySelector('[data-slot=app-bar-status]')
        const btn = ${Q.apply}
        const M = window.__tariffs
        const notices = window.__notices.splice(0)
        const saveLog = window.__saveLog.splice(0)
        const applyLog = window.__applyLog.splice(0)
        const statusCopy = status?.cloneNode(true); statusCopy?.querySelectorAll('button').forEach(b => b.remove())
        const counter = id => t(document.querySelector('[data-tab-trigger=' + id + '] [data-slot=tabs-counter]')?.textContent) || null
        return JSON.stringify({
          title: t(document.querySelector('[data-tariffs-title]')?.textContent),
          tab: root.dataset.tab,
          tabActive: [...document.querySelectorAll('[data-tab-trigger]')].filter(b => b.dataset.state === 'active').map(b => b.dataset.tabTrigger),
          tabs: [...document.querySelectorAll('[data-tab-trigger]')].map((b) => { const c = b.cloneNode(true); c.querySelector('[data-slot=tabs-counter]')?.remove(); return t(c.textContent) }),
          counts: { base: counter('base'), types: counter('types'), schemes: counter('schemes') },
          tabIcons: [...document.querySelectorAll('[data-tab-trigger]')].map(b => !!b.querySelector('[data-slot=icon], svg')),
          period: root.dataset.period,
          save: root.dataset.save,
          saveText: t(statusCopy?.textContent),
          saveSurface: status?.dataset.surface ?? 'dark',
          retry: !!${Q.retry},
          saveLog,
          applyLog,
          applyButton: t(btn?.textContent),
          applyIcon: !!btn?.querySelector('svg'),
          applyDisabled: !!btn?.disabled,
          applyLoading: btn?.getAttribute('aria-busy') === 'true',
          apply: root.dataset.apply,
          dirty: root.dataset.dirty === '1',
          minPayment: ${Q.minInput}?.value ?? null,
          viewMin: M.view.value.base.minPayment,
          appliedMin: M.selected.value.settings.base.minPayment,
          writes: M.save.writes,
          applied: M.apply.count,
          pending: t(document.querySelector('[data-slot=tabs-content][data-state=active] [data-slot=empty-title]')?.textContent) || null,
          notices,
        })
      })()`)
      return JSON.parse(s)
    },
  }
}

/* ------------------------------ сценарии ------------------------------ */
/**
 * Сценарии П1 — `docs/tariffs.md`, 7.1. Шаг — [название, действие, ожидание из сводки, опции].
 * Ожидание — подмножество слепка; источник — в названии сценария.
 */
const TABS = ['Базовые настройки', 'Типы объектов', 'Схемы осмотра']
const SCENARIOS = {
  'ТФ-01': ['«Назад» ведёт к карточке компании; вход вне скоупа — уведомление-заглушка (§11 «Вход»; scope, «Вне скоупа»)', [
    ['старт', null, { title: 'Тарификация', tab: 'base', period: 'current', save: 'saved', saveText: 'Все изменения сохранены', saveSurface: 'light', applyButton: 'Сохранить изменения', applyIcon: true, notices: [] }],
    ['«Назад»', K => K.back(), { notices: ['Карточка компании — вне стенда'], tab: 'base', save: 'saved', writes: 0, dirty: false }],
  ]],
  'ТФ-02': ['три вкладки; правки между вкладками не теряются; счётчики по данным (§11)', [
    ['старт', null, { tabs: TABS, tab: 'base', tabActive: ['base'], tabIcons: [true, true, true], counts: { base: null, types: '3', schemes: '7' }, minPayment: '20000' }],
    ['правка на «Базовых»: минимальная сумма 25000', async (K) => { await K.setMin('25000'); await K.settled() },
      { minPayment: '25000', viewMin: 25000, saveLog: ['saving', 'saved'], writes: 1, dirty: true }],
    ['вкладка «Схемы осмотра»', K => K.tab('schemes'), { tab: 'schemes', tabActive: ['schemes'], pending: '«Схемы осмотра» — порция П4', dirty: true }],
    ['вкладка «Типы объектов»', K => K.tab('types'), { tab: 'types', tabActive: ['types'], pending: '«Типы объектов» — порция П3', dirty: true }],
    ['назад на «Базовые» — правка на месте', K => K.tab('base'), { tab: 'base', tabActive: ['base'], minPayment: '25000', viewMin: 25000, dirty: true, saveLog: [], writes: 1, pending: '«Базовые настройки» — порция П2' }],
    ['набор без типов объектов и с пустой группой — счётчики следуют', K => K.start('data=empty'), { counts: { base: null, types: '0', schemes: '5' }, tab: 'base' }],
  ]],
  'ТФ-03': ['автосохранение: «Сохранение…» → «Все изменения сохранены»; ошибка — с «Повторить» (§8)', [
    ['старт', null, { save: 'saved', saveText: 'Все изменения сохранены', retry: false, writes: 0 }],
    ['правка поля', async (K) => { await K.setMin('30000'); await K.settled() },
      { saveLog: ['saving', 'saved'], save: 'saved', saveText: 'Все изменения сохранены', writes: 1, viewMin: 30000 }],
    ['очистить поле — пустое значение пишется', async (K) => { await K.setMin(''); await K.settled() },
      { saveLog: ['saving', 'saved'], save: 'saved', writes: 2, minPayment: '', viewMin: null }],
    ['?save=error — ошибка сохранения', K => K.start('save=error'),
      { save: 'error', saveText: 'Ошибка сохранения', retry: true, writes: 0 }],
    ['«Повторить»', async (K) => { await K.retry(); await K.settled() },
      { saveLog: ['saving', 'saved'], save: 'saved', saveText: 'Все изменения сохранены', retry: false, writes: 1 }],
    ['следующая правка сохраняется', async (K) => { await K.setMin('21000'); await K.settled() },
      { saveLog: ['saving', 'saved'], save: 'saved', retry: false, writes: 2, viewMin: 21000 }],
  ]],
  'ТФ-04': ['«Сохранить изменения»: активна при неприменённых правках; во время применения — загрузка (§11, §8; стр. 40)', [
    ['старт — правок нет, кнопка выключена', null, { dirty: false, applyDisabled: true, applyLoading: false, apply: 'idle', applied: 0 }],
    ['нажатие по выключенной — ничего', K => K.apply(), { applyDisabled: true, apply: 'idle', applyLog: [], applied: 0, notices: [] }, { blind: true }],
    ['правка — кнопка включена', async (K) => { await K.setMin('24000'); await K.settled() },
      { dirty: true, applyDisabled: false, viewMin: 24000, appliedMin: 20000 }],
    ['возврат к прежнему значению — правок нет, кнопка выключена', async (K) => { await K.setMin('20000'); await K.settled() },
      { dirty: false, applyDisabled: true, viewMin: 20000 }],
    ['снова правка — кнопка включена', async (K) => { await K.setMin('24000'); await K.settled() },
      { dirty: true, applyDisabled: false }],
    ['«Сохранить изменения» — загрузка, затем применено', async (K) => { await K.apply(); await K.applied() },
      { applyLog: [{ state: 'applying', busy: true, disabled: true, spinner: true, sameWidth: true }, { state: 'idle', busy: false, disabled: true, spinner: false, sameWidth: true }],
        notices: ['Изменения применены'], dirty: false, applyDisabled: true, applyLoading: false, appliedMin: 24000, viewMin: 24000, minPayment: '24000', applied: 1 }],
  ]],
}

/* ------------------------------ прогон ------------------------------ */
function diff(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], path ? `${path}.${k}` : k))
  }
  const show = (v) => { const x = JSON.stringify(v); return x && x.length > 160 ? `${x.slice(0, 157)}…` : x }
  return [`${path}: ожидание ${show(a)} · кит ${show(b)}`]
}
/** Ожидание — подмножество слепка: сравниваются только поля ожидания. */
const diffExpect = (exp, snap) => Object.keys(exp ?? {}).flatMap(k => diff(exp[k], snap[k], k))

const baselineFile = id => join(BASELINE, `${id.replace(/\//g, '--').replace(/\s+/g, '_')}.json`)
const NOTICED = []

async function run(id) {
  const [title, steps, opts = {}] = SCENARIOS[id]
  const kp = await openPage()
  const K = kit(kp)
  const fails = []
  const snaps = []
  try {
    await K.start(opts.query)
    for (const [name, act, expect, o = {}] of steps) {
      if (act) { await act(K); await sleep(150) }
      const blind = kp.blind.splice(0)
      if (blind.length && !o.blind) fails.push({ step: name, lines: blind.map(x => `клик не попал в цель — ${x}`) })
      const snap = await K.snapshot()
      const d = diffExpect(expect, snap)
      if (d.length) fails.push({ step: name, lines: d })
      if (snap.notices?.length) NOTICED.push({ id, step: name, k: snap.notices })
      snaps.push({ step: name, snap })
    }
  }
  catch (e) { fails.push({ step: '—', lines: [String(e.message ?? e)] }) }
  finally { await kp.close() }
  /* Эталон — после приёмки экрана: сравнивается весь слепок. */
  const file = baselineFile(id)
  const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  const changes = []
  if (old) {
    if (old.steps.length !== snaps.length) changes.push({ step: '—', lines: [`шагов в эталоне ${old.steps.length}, в сценарии ${snaps.length}`] })
    snaps.forEach((x, k) => {
      const e = old.steps[k]
      if (!e) return
      const d = e.step !== x.step ? [`шаг эталона называется «${e.step}»`] : diff(e.snap, x.snap).map(l => l.replace('ожидание', 'эталон'))
      if (d.length) changes.push({ step: x.step, lines: d })
    })
  }
  if (UPDATE && !fails.length && (changes.length || !old)) {
    mkdirSync(BASELINE, { recursive: true })
    writeFileSync(file, `${JSON.stringify({ id, title, steps: snaps }, null, 1)}\n`)
  }
  return { id, title, steps: steps.filter(s => s[1]).length, snaps: snaps.length, fails, changes, hadBaseline: !!old }
}

const args = process.argv.slice(2)
const UPDATE = args.includes('--update-baseline')
const pick = args.filter(a => !a.startsWith('--'))
const repeat = Math.max(1, Number(args.find(a => a.startsWith('--repeat='))?.slice(9) ?? 1) || 1)
const ids = (pick.length ? pick : Object.keys(SCENARIOS)).flatMap(id => Array.from({ length: repeat }, () => id))
await ensureChrome()
const started = Date.now()
let failed = 0
let totalSteps = 0
let totalSnaps = 0
const updated = []
for (const id of ids) {
  if (!SCENARIOS[id]) { console.log(`${id}: нет такого сценария`); failed++; continue }
  const r = await run(id)
  totalSteps += r.steps
  totalSnaps += r.snaps
  /* Провал действия или ожидания из сводки — провал и при обновлении эталона. */
  const bad = UPDATE ? r.fails : [...r.fails, ...r.changes]
  if (bad.length) {
    failed++
    console.log(`✗ ${r.id} ${r.title} — шагов ${r.steps}, слепков ${r.snaps}`)
    for (const f of bad) { console.log(`   шаг «${f.step}»:`); f.lines.forEach(l => console.log(`     ${l}`)) }
  }
  else console.log(`✓ ${r.id} ${r.title} — шагов ${r.steps}, слепков ${r.snaps}, ${r.hadBaseline ? 'ожидания и эталон совпали' : 'ожидания сводки совпали'}`)
  if (UPDATE && (r.changes.length || !r.hadBaseline) && !r.fails.length) updated.push(r)
}
const secs = Math.round((Date.now() - started) / 1000)
console.log(`\nСценариев ${ids.length}, зелёных ${ids.length - failed}; шагов ${totalSteps}, слепков ${totalSnaps}; время ${Math.floor(secs / 60)} мин ${secs % 60} с`)
console.log(`Файлов эталона: ${existsSync(BASELINE) ? readdirSync(BASELINE).filter(f => f.endsWith('.json')).length : 0}`)
if (UPDATE) {
  console.log(`\nЭталон записан у сценариев — ${updated.length}:`)
  for (const r of updated) console.log(`  ${r.id}: ${r.changes.length ? r.changes.map(c => `«${c.step}»`).join(', ') : 'первое снятие'}`)
}
console.log(`Шагов с уведомлениями — ${NOTICED.length}`)
if (process.env.NOTICES) for (const n of NOTICED) console.log(`  ${n.id} · «${n.step}»: ${JSON.stringify(n.k)}`)
process.exit(failed ? 1 : 0)
