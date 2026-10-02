#!/usr/bin/env node
/**
 * Прогон сценариев страницы «Редактирование схемы осмотра» (VA-16377). Оснастка приёмки, не продукт.
 * План — `docs/scheme-edit.md`, раздел 7; образец — `scripts/free-shoot-scenarios.mjs` (такт 59).
 *
 * Одна сторона — кит: сценарий выполняется на стенде `/scheme-edit`, после каждого шага снимается слепок.
 *
 * **До приёмки экрана ожидания стоят в самих сценариях.** Шаг — `[название, действие, ожидание, опции]`; ожидание —
 * часть слепка, взятая из спеки, со ссылкой на § в названии сценария. Слепок шага обязан содержать все поля ожидания.
 * **После приёмки** — эталон `scripts/scheme-edit-baseline/` по файлу на сценарий: `--update-baseline` пишет слепки и
 * печатает список изменённых; если файл эталона есть, обычный запуск сравнивает с ним весь слепок.
 *
 * Запуск (dev-сервер на 3000 уже поднят):
 *   node scripts/scheme-edit-scenarios.mjs                    — все сценарии
 *   node scripts/scheme-edit-scenarios.mjs СС-20 СС-49        — выбранные
 *   node scripts/scheme-edit-scenarios.mjs --update-baseline  — записать эталон
 *
 * Защита от пустой зелени: клик, не попавший в цель, — провал шага (намеренный клик по выключенному — опция `blind`);
 * уведомления и смены статуса сохранения пишут наблюдатели в странице — слепок их забирает. Статус «Сохранение…» живёт
 * меньше шага: он попадает в слепок журналом `saveLog`, время в слепок не идёт.
 * `NOTICES=1` печатает тексты уведомлений, `DEBUG_CLICK=1` — координаты и цель каждого клика.
 *
 * Chrome ищется на CDP-порту `CDP_PORT` (по умолчанию 9335); если его нет — запускается headless.
 * Адрес стенда — `KIT_URL` (по умолчанию http://localhost:3000/scheme-edit/).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = join(ROOT, 'scripts/scheme-edit-baseline')
const KIT_URL = process.env.KIT_URL ?? 'http://localhost:3000/scheme-edit/'
const PORT = Number(process.env.CDP_PORT ?? 9335)
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
  const profile = mkdtempSync(join(tmpdir(), 'se-scen-'))
  /* Фоновой вкладке Chrome тормозит таймеры — автосохранение на `setTimeout`; ловушка такта 39 `CLAUDE.md`. */
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
     * краем окна: прокрутка ради клика по видимой цели сбивала положение страницы, и возврат прокрутки таба (СС-13)
     * проверялся на нуле.
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
      if (process.env.DEBUG_CLICK) console.log('   клик', p, await evaluate(`document.elementFromPoint(${p.x}, ${p.y})?.outerHTML.slice(0, 120)`))
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
      await sleep(250)
    },
    async key(key, code = key, extra = {}) {
      await send('Page.bringToFront')
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, ...extra })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...extra })
      await sleep(150)
    },
    async type(text) { await send('Input.insertText', { text }); await sleep(200) },
    /** Прокрутка окна колесом — реальным вводом. */
    async wheel(dy) {
      await send('Page.bringToFront')
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: dy })
      await sleep(300)
    },
    close() { ws.close(); return fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`) },
  }
  return page
}

/* ------------------------------ адаптер кита ------------------------------ */
const norm = s => (s ?? '').replace(/\s+/g, ' ').trim()
/** Ждать, пока выражение не станет истинным. */
async function until(page, expr, ms = 6000) {
  for (let t = 0; t < ms; t += 50) {
    if (await page.evaluate(expr)) return
    await sleep(50)
  }
  throw new Error(`не дождались: ${expr}`)
}
/**
 * Наблюдатели в странице. Уведомление живёт 3 с, «Сохранение…» — 0.7 с: слепок, снятый после действия, их теряет
 * (ловушка такта 57 `CLAUDE.md`). Журналы пишутся в момент события; слепок забирает их и очищает.
 */
const WATCH = `(() => {
  const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
  window.__notices = []; window.__saveLog = []
  const take = el => setTimeout(() => { const x = t(el.querySelector('[data-slot=toast-title]')?.textContent || el.textContent); if (x) window.__notices.push(x) }, 0)
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return
    if (n.matches?.('[data-slot=toast]')) take(n); else n.querySelectorAll?.('[data-slot=toast]').forEach(take) }))).observe(document.body, { childList: true, subtree: true })
  const root = document.querySelector('[data-scheme-edit]')
  new MutationObserver(() => { const s = root.dataset.save; if (window.__saveLog[window.__saveLog.length - 1] !== s) window.__saveLog.push(s) }).observe(root, { attributes: true, attributeFilter: ['data-save'] })
  return 1 })()`

const Q = {
  root: `document.querySelector('[data-scheme-edit]')`,
  back: `document.querySelector('[data-act=back]')`,
  publish: `document.querySelector('[data-act=publish]')`,
  tab: id => `document.querySelector('[data-tab-trigger=${id}]')`,
  field: k => `document.querySelector('[data-field=${k}]')`,
  nameInput: `(document.querySelector('[data-field=name]')?.matches('input') ? document.querySelector('[data-field=name]') : document.querySelector('[data-field=name] input'))`,
  retry: `document.querySelector('[data-slot=app-bar-status-retry]')`,
}

function kit(page) {
  return {
    page,
    async start(query = '') {
      await page.goto(`${KIT_URL}${query ? `?${query}` : ''}`, 1500)
      await until(page, `!!${Q.root} && !!window.__scheme`, 20000)
      await page.evaluate(`(async () => { await document.fonts.ready; return 1 })()`)
      await page.evaluate(WATCH)
      await sleep(300)
    },
    back: () => page.click(Q.back),
    publish: () => page.click(Q.publish),
    tab: id => page.click(Q.tab(id)),
    /** Наименование: выделить всё и набрать новый текст реальным вводом. */
    async rename(text) {
      await page.click(Q.nameInput)
      await page.evaluate(`(${Q.nameInput}.select(), 1)`)
      await page.type(text)
    },
    toggleActive: () => page.click(`${Q.field('active')}.matches('button') ? ${Q.field('active')} : (${Q.field('active')}.querySelector('button') ?? ${Q.field('active')})`),
    retry: () => page.click(Q.retry),
    /** Дождаться конца записи черновика: статус ушёл из «Сохранение…». */
    settled: () => until(page, `${Q.root}.dataset.save !== 'saving'`),
    scrollBy: dy => page.wheel(dy),
    /** Высота документа меньше окна — прокручивать нечего: сценарий растягивает страницу оснасткой, не трогая вид. */
    async stretch() { await page.evaluate(`(document.body.style.minHeight = '2400px', 1)`) },
    dump: () => page.evaluate(`window.__scheme.dump()`),
    async snapshot() {
      const s = await page.evaluate(`(() => {
        const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
        const root = ${Q.root}
        const status = document.querySelector('[data-slot=app-bar-status]')
        const M = window.__scheme
        const notices = window.__notices.splice(0)
        const saveLog = window.__saveLog.splice(0)
        return JSON.stringify({
          title: t(document.querySelector('[data-scheme-title]')?.textContent),
          tab: root.dataset.tab,
          tabActive: [...document.querySelectorAll('[data-tab-trigger]')].filter(b => b.dataset.state === 'active' || b.getAttribute('aria-selected') === 'true').map(b => b.dataset.tabTrigger),
          tabs: [...document.querySelectorAll('[data-tab-trigger]')].map(b => t(b.textContent)),
          section: root.dataset.section,
          save: root.dataset.save,
          saveText: t(status?.childNodes ? [...status.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ') : ''),
          saveSurface: status?.dataset.surface ?? 'dark',
          retry: !!${Q.retry},
          saveLog,
          publish: root.dataset.publish,
          publishButton: t(${Q.publish}?.textContent),
          name: ${Q.nameInput}?.value ?? null,
          active: M.draft.config.settings.general.active,
          writes: M.save.writes,
          dirty: M.dirty.value,
          versions: M.snapshots.length,
          scrollY: Math.round(window.scrollY),
          pending: t(document.querySelector('[data-slot=tabs-content]:not([hidden]) [data-slot=empty-title], [data-slot=tabs-content][data-state=active] [data-slot=empty-title]')?.textContent) || null,
          notices,
        })
      })()`)
      return JSON.parse(s)
    },
  }
}

/* ------------------------------ сценарии ------------------------------ */
/**
 * Сценарии П1 — `docs/scheme-edit.md`, 6.1. Шаг — [название, действие, ожидание из спеки, опции].
 * Ожидание — подмножество слепка; источник — в названии сценария.
 */
const NAME = 'КАСКО — осмотр легкового автомобиля'
const SCENARIOS = {
  'СС-01': ['«Назад» ведёт к списку схем; на стенде — уведомление-заглушка (r2 §3)', [
    ['старт', null, { title: NAME, tab: 'settings', save: 'saved', saveText: 'Все изменения сохранены', publishButton: 'Опубликовать схему', notices: [] }],
    ['«Назад»', K => K.back(), { notices: ['Список схем — вне стенда'], tab: 'settings', save: 'saved', writes: 0 }],
  ]],
  'СС-13': ['табы: переключение сохраняет раздел и прокрутку таба (r2 §3; аудит, «Верхний уровень: табы по сущностям»)', [
    ['старт', null, { tabs: ['Настройки', 'Форма', 'Процессы и шаги', 'Витрина'], tab: 'settings', tabActive: ['settings'], section: 'general', scrollY: 0 }],
    ['прокрутить «Настройки» на 120', async (K) => { await K.stretch(); await K.scrollBy(120) }, { tab: 'settings', scrollY: 120 }],
    ['таб «Форма»', K => K.tab('form'), { tab: 'form', tabActive: ['form'], section: 'general', scrollY: 0, pending: '«Форма» — порция П6' }],
    ['таб «Процессы и шаги»', K => K.tab('processes'), { tab: 'processes', tabActive: ['processes'], pending: '«Процессы и шаги» — порция П7' }],
    ['таб «Витрина»', K => K.tab('showcase'), { tab: 'showcase', tabActive: ['showcase'], pending: '«Витрина» — порция П8' }],
    ['прокрутить «Витрину» на 60', K => K.scrollBy(60), { tab: 'showcase', scrollY: 60 }],
    ['назад в «Настройки»', K => K.tab('settings'), { tab: 'settings', tabActive: ['settings'], section: 'general', scrollY: 120, save: 'saved', writes: 0 }],
    ['снова «Витрина» — своя прокрутка', K => K.tab('showcase'), { tab: 'showcase', scrollY: 60 }],
  ]],
  'СС-20': ['«Основное»: правка поля уходит автосохранением, «Схема активна» переключается (r2 §2, §4)', [
    ['старт', null, { name: NAME, title: NAME, active: true, save: 'saved', writes: 0, dirty: true, publish: 'draft', versions: 2 }],
    ['наименование: новый текст', async (K) => { await K.rename('КАСКО — осмотр автомобиля'); await K.settled() },
      { name: 'КАСКО — осмотр автомобиля', title: 'КАСКО — осмотр автомобиля', saveLog: ['saving', 'saved'], save: 'saved', saveText: 'Все изменения сохранены', writes: 1, dirty: true, versions: 2 }],
    ['«Схема активна» — выключить', async (K) => { await K.toggleActive(); await K.settled() },
      { active: false, saveLog: ['saving', 'saved'], save: 'saved', writes: 2, versions: 2 }],
    ['«Схема активна» — включить', async (K) => { await K.toggleActive(); await K.settled() },
      { active: true, saveLog: ['saving', 'saved'], save: 'saved', writes: 3 }],
    ['таб «Форма» и обратно — правка на месте', async (K) => { await K.tab('form'); await K.tab('settings') },
      { name: 'КАСКО — осмотр автомобиля', saveLog: [], save: 'saved', writes: 3 }],
  ]],
  'СС-49': ['автосохранение: «Сохранение…» → «Все изменения сохранены»; ошибка — с «Повторить» (r2 §2, состояния 4–5)', [
    ['старт', null, { save: 'saved', saveText: 'Все изменения сохранены', saveSurface: 'light', retry: false, writes: 0 }],
    ['правка: запись падает', async (K) => { await K.rename('КАСКО — проверка записи'); await K.settled() },
      { saveLog: ['saving', 'error'], save: 'error', saveText: 'Ошибка сохранения', retry: true, writes: 0, name: 'КАСКО — проверка записи' }],
    ['«Повторить»', async (K) => { await K.retry(); await K.settled() },
      { saveLog: ['saving', 'saved'], save: 'saved', saveText: 'Все изменения сохранены', retry: false, writes: 1, name: 'КАСКО — проверка записи' }],
    ['следующая правка сохраняется', async (K) => { await K.toggleActive(); await K.settled() },
      { saveLog: ['saving', 'saved'], save: 'saved', retry: false, writes: 2, active: false }],
  ], { query: 'save=fail' }],
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
const ids = pick.length ? pick : Object.keys(SCENARIOS)
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
  /* Провал действия или ожидания из спеки — провал и при обновлении эталона. */
  const bad = UPDATE ? r.fails : [...r.fails, ...r.changes]
  if (bad.length) {
    failed++
    console.log(`✗ ${r.id} ${r.title} — шагов ${r.steps}, слепков ${r.snaps}`)
    for (const f of bad) { console.log(`   шаг «${f.step}»:`); f.lines.forEach(l => console.log(`     ${l}`)) }
  }
  else console.log(`✓ ${r.id} ${r.title} — шагов ${r.steps}, слепков ${r.snaps}, ${r.hadBaseline ? 'ожидания и эталон совпали' : 'ожидания спеки совпали'}`)
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
