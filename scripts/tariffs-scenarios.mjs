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
      /* Клавиша с текстом (Enter, пробел) — `keyDown`: только он нажимает нативную кнопку; служебные — `rawKeyDown`. */
      await send('Input.dispatchKeyEvent', { type: extra.text ? 'keyDown' : 'rawKeyDown', key, code, ...vk, ...extra })
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
  /* Такт 78, П2: пара базовой цены, рубильник и шкала, учёт прогресса, подсказка. */
  pairClient: `document.querySelector('[data-field=base-price] [data-slot=price-pair-client] input')`,
  pairNonClient: `document.querySelector('[data-field=base-price] [data-slot=price-pair-non-client] input')`,
  pairLock: `document.querySelector('[data-field=base-price] [data-pair-lock]')`,
  scaleSwitch: `document.querySelector('[data-field=scale-switch] [data-slot=choice-control]')`,
  step: k => `document.querySelectorAll('[data-field=base-scale] [data-slot=regress-scale-step]')[${k}]`,
  stepTo: k => `document.querySelectorAll('[data-field=base-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-to] input')`,
  stepPrice: k => `document.querySelectorAll('[data-field=base-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-price] input, [data-slot=price-pair-client] input')`,
  stepNonClient: k => `document.querySelectorAll('[data-field=base-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=price-pair-non-client] input')`,
  stepLock: k => `document.querySelectorAll('[data-field=base-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-pair-lock]')`,
  stepRemove: k => `document.querySelectorAll('[data-field=base-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-step-remove]')`,
  scaleForm: f => `document.querySelector('[data-field=base-scale] [data-scale-form=${f}]')`,
  counter: v => `document.querySelector('[data-counter=${v}] [data-slot=choice-control]')`,
  help: `document.querySelector('[data-act=help]')`,
  undo: `[...document.querySelectorAll('[data-slot=toast] button')].find(b => b.textContent.replace(/\\s+/g, ' ').trim() === 'Отменить')`,
  /* Такт 79, П3: вкладка «Типы объектов» — строки, раскрытие, рубильник, удаление, выбор типа. */
  typeExpand: id => `document.querySelector('[data-type-row=${id}] [data-act=type-expand]')`,
  typeSwitch: id => `document.querySelector('[data-type-row=${id}] [data-field=type-scale-switch] [data-slot=choice-control]')`,
  typeRemove: id => `document.querySelector('[data-type-row=${id}] [data-act=type-remove]')`,
  typeClient: id => `document.querySelector('[data-type-row=${id}] [data-slot=price-pair-client] input')`,
  typeForm: (id, f) => `document.querySelector('[data-type-body=${id}] [data-scale-form=${f}]')`,
  typeStepTo: (id, k) => `document.querySelectorAll('[data-type-body=${id}] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-to] input')`,
  addType: `document.querySelector('[data-act=add-type]')`,
  typeSearch: `(document.querySelector('[data-field=type-search]')?.matches('input') ? document.querySelector('[data-field=type-search]') : document.querySelector('[data-field=type-search] input'))`,
  typeOption: id => `document.querySelector('[data-type-option=${id}]')`,
  /* Такт 80, П4: вкладка «Схемы осмотра», панель группы. */
  groupSettings: id => `document.querySelector('[data-group=${id}] [data-act=group-settings]')`,
  schemeSettings: id => `document.querySelector('[data-scheme=${id}] [data-act=scheme-settings]')`,
  groupMode: v => `document.querySelector('[data-side=group] [data-group-mode=${v}] [data-slot=choice-control]')`,
  groupClient: `document.querySelector('[data-field=group-price] [data-slot=price-pair-client] input')`,
  groupNonClient: `document.querySelector('[data-field=group-price] [data-slot=price-pair-non-client] input')`,
  groupLock: `document.querySelector('[data-field=group-price] [data-pair-lock]')`,
  groupStepTo: k => `document.querySelectorAll('[data-field=group-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-to] input')`,
  groupStepPrice: k => `document.querySelectorAll('[data-field=group-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-price] input')`,
  panelClose: `[...document.querySelectorAll('[data-side=group] [data-slot=modal-card-header] button')].find(b => b.getAttribute('aria-label') === 'Закрыть')`,
  /* Такт 81, П5: панель схемы. */
  schemeClose: `[...document.querySelectorAll('[data-side=scheme] [data-slot=modal-card-header] button')].find(b => b.getAttribute('aria-label') === 'Закрыть')`,
  schemeCopy: `document.querySelector('[data-side=scheme] [data-slot=copyable-id] button')`,
  panelTab: v => `document.querySelector('[data-side=scheme] [data-panel-tab=${v}]')`,
  schemeMode: v => `document.querySelector('[data-side=scheme] [data-scheme-mode=${v}] [data-slot=choice-control]')`,
  schemeClient: `document.querySelector('[data-field=scheme-price] [data-slot=price-pair-client] input')`,
  schemeNonClient: `document.querySelector('[data-field=scheme-price] [data-slot=price-pair-non-client] input')`,
  schemeLock: `document.querySelector('[data-field=scheme-price] [data-pair-lock]')`,
  schemeStepTo: k => `document.querySelectorAll('[data-field=scheme-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-to] input')`,
  schemeStepRemove: k => `document.querySelectorAll('[data-field=scheme-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-step-remove]')`,
  schemeStepPrice: k => `document.querySelectorAll('[data-field=scheme-scale] [data-slot=regress-scale-step]')[${k}]?.querySelector('[data-slot=regress-scale-price] input')`,
  processClient: id => `document.querySelector('[data-process=${id}] [data-slot=price-pair-client] input')`,
  processLock: id => `document.querySelector('[data-process=${id}] [data-pair-lock]')`,
  customizeTypes: `document.querySelector('[data-act=customize-types]')`,
  resetTypes: `document.querySelector('[data-act=reset-types]')`,
  addSchemeType: `document.querySelector('[data-act=add-scheme-type]')`,
  schemeTypeOption: id => `document.querySelector('[data-scheme-type-option=${id}]')`,
  schemeTypeClient: id => `document.querySelector('[data-scheme-type=${id}] [data-slot=price-pair-client] input')`,
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
    /** Поле: нажать, выделить всё и набрать текст реальным вводом; пустая строка — Delete. */
    async fill(sel, text) {
      await page.click(sel)
      await page.evaluate(`(${sel}.select(), 1)`)
      if (text) await page.type(text)
      else await page.key('Delete')
    },
    click: sel => page.click(sel),
    /** Клавиши фокуса и нажатия: Tab, Enter с текстом `\r` (ловушка «Синтетический Enter»), пробел с текстом. */
    tabKey: () => page.key('Tab'),
    enter: () => page.key('Enter', 'Enter', { text: '\r', unmodifiedText: '\r' }),
    space: () => page.key(' ', 'Space', { text: ' ', unmodifiedText: ' ', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }),
    escape: () => page.key('Escape'),
    undo: () => page.click(Q.undo),
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
        const pairEl = document.querySelector('[data-field=base-price]')
        const pinput = (root, part) => root?.querySelector('[data-slot=price-pair-' + part + '] input')
        const lock = pairEl?.querySelector('[data-pair-lock]')
        const hint = document.querySelector('[data-field=base-price-field] [data-slot=field-hint]')
        const scaleEl = document.querySelector('[data-field=base-scale]')
        const stepEls = [...(scaleEl?.querySelectorAll('[data-slot=regress-scale-step]') ?? [])]
        const val = el => (el ? t(el.value) : null)
        const help = document.querySelector('[data-help]')
        const stepsOf = el => [...el.querySelectorAll('[data-slot=regress-scale-step]')].map((s) => {
          const x = { from: val(s.querySelector('[data-slot=regress-scale-from] input')), to: val(s.querySelector('[data-slot=regress-scale-to] input')) }
          const single = s.querySelector('[data-slot=regress-scale-price] input')
          if (single) x.price = val(single)
          else { const pp = s.querySelector('[data-slot=price-pair]'); x.client = val(pinput(pp, 'client')); x.nonClient = val(pinput(pp, 'non-client')); x.linked = pp.hasAttribute('data-linked') }
          x.error = t(s.querySelector('[data-slot=field-error]')?.textContent) || null
          x.removable = !!s.querySelector('[data-step-remove]')
          return x
        })
        /* Такт 79: строки типов, раскрытая строка со шкалой типа, пустой список, выбор типа. */
        const typeRows = [...document.querySelectorAll('[data-type-row]')]
        const picker = document.querySelector('[data-type-picker]')
        const typesEmpty = document.querySelector('[data-types-empty]')
        /* Такт 80: текст по текстовым узлам через пробел (ловушка такта 64); тон метки — по роли рамки. */
        const leaf = (el) => { if (!el) return null; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; while (w.nextNode()) { const x = t(w.currentNode.textContent); if (x) out.push(x) } return out.join(' ') }
        const TONES = ['primary', 'warning', 'foreground-secondary', 'success', 'destructive', 'background']
        const badgesOf = el => el ? [...el.querySelectorAll('[data-slot=badge]')].map(b => t(b.textContent) + ' | ' + (b.dataset.appearance ?? 'filled') + ' ' + (TONES.find(x => b.classList.contains('border-' + x)) ?? '?')) : null
        const side = document.querySelector('[data-side=group]')
        const gpair = side?.querySelector('[data-field=group-price]')
        const gscale = side?.querySelector('[data-field=group-scale]')
        const sside = document.querySelector('[data-side=scheme]')
        const spair = sside?.querySelector('[data-field=scheme-price]')
        const sscale = sside?.querySelector('[data-field=scheme-scale]')
        const stypes = sside?.querySelector('[data-scheme-types]')
        const spicker = document.querySelector('[data-scheme-type-picker]')
        const base = M.view.value.base
        /* Где фокус: поле пары, замок, часть ступени шкалы, кнопка подсказки. */
        const where = (() => {
          const a = document.activeElement
          if (!a || a === document.body) return null
          if (a.closest('[data-act=help]')) return 'help'
          const st = a.closest('[data-slot=regress-scale-step]')
          const pre = st ? 'step' + st.dataset.step : a.closest('[data-field=base-price]') ? 'base-price' : null
          if (!pre) return a.closest('[data-field]')?.dataset.field ?? a.closest('[data-act]')?.dataset.act ?? a.tagName.toLowerCase()
          const part = a.closest('[data-pair-lock]') ? 'lock' : a.closest('[data-step-remove]') ? 'remove'
            : a.closest('[data-slot=price-pair-non-client]') ? 'non-client' : a.closest('[data-slot=price-pair-client]') ? 'client'
            : a.closest('[data-slot=regress-scale-from]') ? 'from' : a.closest('[data-slot=regress-scale-to]') ? 'to'
            : a.closest('[data-slot=regress-scale-price]') ? 'price' : '?'
          return pre + ':' + part
        })()
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
          minPayment: ${Q.minInput} ? t(${Q.minInput}.value) : null,
          viewMin: M.view.value.base.minPayment,
          appliedMin: M.selected.value.settings.base.minPayment,
          writes: M.save.writes,
          applied: M.apply.count,
          pending: t(document.querySelector('[data-slot=tabs-content][data-state=active] [data-slot=empty-title]')?.textContent) || null,
          minUnit: t(document.querySelector('[data-field=min-payment] [data-slot=field-unit]')?.textContent) || null,
          pair: pairEl ? {
            client: val(pinput(pairEl, 'client')),
            nonClient: val(pinput(pairEl, 'non-client')),
            linked: pairEl.hasAttribute('data-linked'),
            disabled: !!pinput(pairEl, 'client')?.disabled,
            nonClientDisabled: !!pinput(pairEl, 'non-client')?.disabled,
            lock: lock ? lock.getAttribute('aria-label') + (lock.getAttribute('aria-pressed') === 'true' ? ' | нажат' : '') + (lock.disabled ? ' | выкл' : '') : null,
            units: [...pairEl.querySelectorAll('[data-slot=field-unit]')].map(u => t(u.textContent)),
          } : null,
          modelPrice: base.price,
          pairHint: hint ? t(hint.textContent) + ' | ' + (hint.dataset.tone ?? 'default') : null,
          scale: root.dataset.scale,
          scaleSwitch: document.querySelector('[data-field=scale-switch] [data-slot=choice-control]')?.getAttribute('data-state') ?? null,
          scaleForm: scaleEl?.dataset.form ?? null,
          scaleHead: scaleEl ? [...scaleEl.querySelectorAll('[data-slot=regress-scale-head] span:not(:has(span))')].map(s => t(s.textContent)).filter(Boolean) : null,
          steps: scaleEl ? stepEls.map((s) => {
            const from = s.querySelector('[data-slot=regress-scale-from] input')
            const x = { from: val(from), fromReadonly: !!from?.readOnly, to: val(s.querySelector('[data-slot=regress-scale-to] input')) }
            const single = s.querySelector('[data-slot=regress-scale-price] input')
            if (single) x.price = val(single)
            else {
              const pp = s.querySelector('[data-slot=price-pair]')
              x.client = val(pinput(pp, 'client')); x.nonClient = val(pinput(pp, 'non-client')); x.linked = pp.hasAttribute('data-linked')
            }
            x.error = t(s.querySelector('[data-slot=field-error]')?.textContent) || null
            x.removable = !!s.querySelector('[data-step-remove]')
            return x
          }) : null,
          modelScale: { on: base.scale.on, form: base.scale.form, steps: base.scale.steps.map(s => [s.from, s.to, s.price.client, s.price.nonClient, s.price.linked]) },
          counterChecked: document.querySelector('[data-counter] [data-slot=choice-control][data-state=checked]')?.closest('[data-counter]')?.dataset.counter ?? null,
          modelCounter: base.counter,
          help: help ? {
            title: t(help.querySelector('[data-slot=heading]')?.textContent),
            steps: [...help.querySelectorAll('[data-help-step]')].map(r => t(r.innerText)),
          } : null,
          helpOpen: root.dataset.open === 'help',
          types: document.querySelector('[data-block=types]') ? typeRows.map((r) => {
            const id = r.dataset.typeRow
            const pp = r.querySelector('[data-slot=price-pair]')
            const sc = document.querySelector('[data-type-body=' + id + '] [data-field=type-scale]')
            return {
              id,
              name: t(r.querySelector('[data-type-name]')?.textContent),
              client: val(pinput(pp, 'client')),
              nonClient: val(pinput(pp, 'non-client')),
              linked: pp.hasAttribute('data-linked'),
              pairDisabled: !!pinput(pp, 'client')?.disabled,
              scale: r.querySelector('[data-field=type-scale-switch] [data-slot=choice-control]')?.getAttribute('data-state') ?? null,
              expanded: r.querySelector('[data-act=type-expand]')?.getAttribute('aria-expanded') === 'true',
              body: sc ? {
                disabled: !!sc.querySelector('[data-slot=regress-scale-to] input')?.disabled,
                form: sc.dataset.form ?? null,
                head: [...sc.querySelectorAll('[data-slot=regress-scale-head] span:not(:has(span))')].map(s => t(s.textContent)).filter(Boolean),
                steps: stepsOf(sc),
              } : null,
            }
          }) : null,
          typesEmpty: typesEmpty ? { title: t(typesEmpty.querySelector('[data-slot=empty-title]')?.textContent), action: t(typesEmpty.querySelector('[data-act=add-type]')?.textContent) } : null,
          picker: picker ? {
            options: [...picker.querySelectorAll('[data-type-option]')].map(o => t(o.textContent)),
            active: t(picker.querySelector('[data-type-option][data-selected]')?.textContent) || null,
            empty: t(picker.querySelector('[data-type-picker-empty] [data-slot=empty-title]')?.textContent) || null,
          } : null,
          modelTypes: M.view.value.objectTypes.map(x => [x.typeId, x.price.client, x.price.nonClient, x.price.linked, x.scale.on, x.scale.form, x.scale.steps.length]),
          expanded: [...M.ui.expanded],
          /* Такт 80: группы и схемы вкладки, панель группы. Текст вилки — листовые узлы через пробел (ловушка такта 64). */
          groups: document.querySelector('[data-block=schemes]') ? [...document.querySelectorAll('[data-group]')].map((g) => {
            const empty = g.querySelector('[data-group-empty]')
            return {
              id: g.dataset.group,
              name: t(g.querySelector('[data-group-name]')?.textContent),
              badges: badgesOf(g.querySelector('[data-group-head] [data-badges]')),
              range: leaf(g.querySelector('[data-group-range]')),
              schemes: [...g.querySelectorAll('[data-scheme]')].map(x => ({
                id: x.dataset.scheme,
                name: t(x.querySelector('[data-scheme-name]')?.textContent),
                badges: badgesOf(x.querySelector('[data-badges]')),
                range: leaf(x.querySelector('[data-scheme-range]')),
                dimmed: x.hasAttribute('data-dimmed'),
              })),
              empty: empty ? t(empty.querySelector('[data-slot=empty-title]')?.textContent) : null,
            }
          }) : null,
          panel: side ? {
            title: t(side.querySelector('[data-slot=modal-card-title]')?.textContent),
            name: t(side.querySelector('[data-panel-name] [data-slot=heading]')?.textContent),
            count: t(side.querySelector('[data-panel-name] [data-slot=heading-description]')?.textContent),
            modes: [...side.querySelectorAll('[data-group-mode]')].map(x => ({
              value: x.dataset.groupMode,
              checked: x.querySelector('[data-slot=choice-control]')?.getAttribute('data-state') === 'checked',
              title: t(x.querySelector('[data-slot=choice-title]')?.textContent),
              description: leaf(x.querySelector('[data-slot=choice-description]')),
              body: x.querySelector('[data-slot=choice-panel]') ? (x.querySelector('[data-field=group-price]') ? 'pair' : x.querySelector('[data-field=group-scale]') ? 'scale' : 'other') : null,
            })),
            pair: gpair ? { client: val(pinput(gpair, 'client')), nonClient: val(pinput(gpair, 'non-client')), linked: gpair.hasAttribute('data-linked') } : null,
            steps: gscale ? stepsOf(gscale) : null,
            inheriting: t(side.querySelector('[data-inheriting]')?.textContent) || null,
            schemes: [...side.querySelectorAll('[data-group-scheme]')].map(x => t(x.querySelector('[data-group-scheme-name]')?.textContent) + ' | ' + leaf(x.querySelector('[data-group-scheme-range]'))),
            schemesEmpty: t(side.querySelector('[data-group-schemes-empty] [data-slot=empty-title]')?.textContent) || null,
            /* Только чтение: в списке схем группы нет ни полей, ни кнопок. */
            schemesControls: side.querySelectorAll('[data-group-schemes] [data-slot=table] :is(button, input, a, [tabindex])').length,
          } : null,
          modelGroups: M.view.value.groups.map(g => [g.id, g.mode, g.price.client, g.price.nonClient, g.price.linked, g.scale.on, g.scale.steps.map(x => [x.from, x.to, x.price.client])]),
          focusGroup: document.activeElement?.closest('[data-group]')?.dataset.group ?? null,
          /* Такт 81: панель схемы — шапка, вкладки, режимы с телом, процессы, типы объектов; строка открытой схемы на странице. */
          schemePanel: sside ? {
            title: t(sside.querySelector('[data-slot=modal-card-title]')?.textContent),
            name: t(sside.querySelector('[data-panel-name] [data-slot=heading]')?.textContent),
            code: t(sside.querySelector('[data-slot=copyable-id-value]')?.textContent),
            tab: sside.querySelector('[data-panel-tab][data-state=active]')?.dataset.panelTab ?? null,
            modes: sside.querySelector('[data-panel-pricing]') ? [...sside.querySelectorAll('[data-scheme-mode]')].map(x => ({
              value: x.dataset.schemeMode,
              checked: x.querySelector('[data-slot=choice-control]')?.getAttribute('data-state') === 'checked',
              title: t(x.querySelector('[data-slot=choice-title]')?.textContent),
              description: leaf(x.querySelector('[data-slot=choice-description]')),
              body: x.querySelector('[data-slot=choice-panel]') ? (x.querySelector('[data-field=scheme-price]') ? 'pair' : x.querySelector('[data-field=scheme-scale]') ? 'scale' : 'other') : null,
            })) : null,
            pair: spair ? { client: val(pinput(spair, 'client')), nonClient: val(pinput(spair, 'non-client')), linked: spair.hasAttribute('data-linked') } : null,
            steps: sscale ? stepsOf(sscale) : null,
            processes: sside.querySelector('[data-scheme-processes]') ? [...sside.querySelectorAll('[data-process]')].map((p) => {
              const pp = p.querySelector('[data-slot=price-pair]')
              return t(p.querySelector('[data-process-name]')?.textContent) + ' | ' + val(pinput(pp, 'client')) + ' / ' + val(pinput(pp, 'non-client')) + (pp.hasAttribute('data-linked') ? ' | связано' : '')
            }) : null,
            processesEmpty: t(sside.querySelector('[data-processes-empty] [data-slot=empty-title]')?.textContent) || null,
            types: stypes ? stypes.dataset.schemeTypes : null,
            callout: stypes ? leaf(stypes.querySelector('[data-slot=callout]')) : null,
            globalTypes: stypes && stypes.dataset.schemeTypes === 'global' ? [...stypes.querySelectorAll('[data-global-type]')].map(r => t(r.querySelector('[data-global-type-name]')?.textContent) + ' | ' + (t(r.querySelector('[data-global-type-scale]')?.textContent) || '—') + ' | ' + leaf(r.querySelector('[data-global-type-range]'))) : null,
            globalControls: stypes ? stypes.querySelectorAll('[data-slot=table] :is(button, input, a, [tabindex])').length : null,
            schemeTypes: stypes && stypes.dataset.schemeTypes === 'individual' ? [...stypes.querySelectorAll('[data-scheme-type]')].map((r) => {
              const pp = r.querySelector('[data-slot=price-pair]')
              return t(r.querySelector('[data-scheme-type-name]')?.textContent) + ' | ' + val(pinput(pp, 'client')) + ' / ' + val(pinput(pp, 'non-client')) + (pp.hasAttribute('data-linked') ? ' | связано' : '')
            }) : null,
            /* Шкалы у типов в схеме нет (ждут людей, п. 9): ни рубильника, ни ступеней во вкладке. */
            typesScale: stypes ? stypes.querySelectorAll('[data-slot=regress-scale], [data-slot=switch], [role=switch]').length : null,
            picker: spicker ? [...spicker.querySelectorAll('[data-scheme-type-option]')].map(o => t(o.textContent)) : null,
          } : null,
          schemeRow: sside && M.ui.panel ? (() => { const r = document.querySelector('[data-scheme=' + M.ui.panel.id + ']'); return r ? { badges: badgesOf(r.querySelector('[data-badges]')), range: leaf(r.querySelector('[data-scheme-range]')) } : null })() : null,
          modelSchemes: M.view.value.schemes.map(x => [x.id, x.mode, x.price.client, x.price.nonClient, x.price.linked, x.scale.on, x.scale.steps.map(s => [s.from, s.to, s.price.client]),
            x.individualTypes, x.types.map(y => [y.typeId, y.price.client, y.price.nonClient, y.price.linked]), x.processes.map(p => [p.id, p.repeatable, p.price.client, p.price.nonClient, p.price.linked])]),
          focusScheme: document.activeElement?.closest('[data-scheme]')?.dataset.scheme ?? null,
          focus: where,
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
/** Справочник типов демо-данных (6.7) в его порядке; свободные — без трёх типов вкладки. */
const TYPES_ALL = ['Легковой автомобиль', 'Грузовой автомобиль', 'Мотоцикл', 'Автобус', 'Прицеп', 'Спецтехника', 'Сельхозтехника',
  'Водный транспорт', 'Оборудование', 'Квартира', 'Частный дом', 'Коммерческая недвижимость', 'Земельный участок']
const TYPES_FREE = TYPES_ALL.filter(x => !['Легковой автомобиль', 'Спецтехника', 'Квартира'].includes(x))
/* Такт 80, П4: ожидания вкладки «Схемы осмотра» и панели группы по демо-данным (6.7). */
const G = range => `Стоимость осмотров группы по умолчанию: ${range} · наследуется схемами без индивидуальной цены`
const B = (text, tone) => `${text} | outline ${tone}`
const SCHEMES_START = [
  { id: 'g-kasko', name: 'КАСКО', badges: [B('3 схемы', 'foreground-secondary')], range: G('500–700 ₽'), empty: null, schemes: [
    { id: 's-car', name: 'Осмотр легкового автомобиля', badges: [B('По группе', 'primary')], range: 'Вилка цен от 500 ₽ до 700 ₽', dimmed: false },
    { id: 's-moto', name: 'Осмотр мотоцикла', badges: [B('Индивид. цены', 'primary'), B('Новая', 'warning')], range: 'Вилка цен от 450 ₽ до 650 ₽', dimmed: false },
    { id: 's-pre', name: 'Предстраховой осмотр автомобиля', badges: [B('Регресс-шкала', 'primary')], range: 'Вилка цен от 600 ₽ до 900 ₽', dimmed: false }] },
  { id: 'g-osago', name: 'ОСАГО', badges: [B('2 схемы', 'foreground-secondary')], range: G('900–1 100 ₽'), empty: null, schemes: [
    { id: 's-vehicle', name: 'Осмотр транспортного средства', badges: [B('По группе', 'primary')], range: 'Вилка цен от 900 ₽ до 1 100 ₽', dimmed: false },
    { id: 's-trailer', name: 'Осмотр прицепа', badges: [B('По группе', 'primary'), B('Устаревшая', 'foreground-secondary')], range: 'Вилка цен от 900 ₽ до 1 100 ₽', dimmed: true }] },
  { id: 'g-realty', name: 'Недвижимость', badges: [B('2 схемы', 'foreground-secondary'), B('Регресс-шкала', 'primary')], range: G('1 000–1 200 ₽'), empty: null, schemes: [
    { id: 's-flat', name: 'Осмотр квартиры', badges: [B('По группе', 'primary'), B('Индивидуальные типы', 'primary'), B('Мульти', 'foreground-secondary')], range: 'Вилка цен от 1 000 ₽ до 1 200 ₽', dimmed: false },
    { id: 's-house', name: 'Осмотр частного дома', badges: [B('Индивид. цены', 'primary'), B('Вложенный', 'foreground-secondary')], range: 'Вилка цен 1 500 ₽', dimmed: false }] },
]
/** Режимы панели: отмечен `checked`, у него тело `body` (`pair`, `scale`; у компании тела нет — «—»). */
const MODES = (checked, body) => [
  { value: 'company', checked: checked === 'company', title: 'Базовая цена компании', description: 'Наследует цену компании: 500–700 ₽', body: null },
  { value: 'fixed', checked: checked === 'fixed', title: 'Фиксированная цена группы', description: 'Фиксированная цена только для этой группы', body: checked === 'fixed' ? body : null },
  { value: 'scale', checked: checked === 'scale', title: 'Регресс-шкала группы', description: 'Цена снижается при росте объёма осмотров', body: checked === 'scale' ? body : null },
]
const PANEL_KASKO = {
  title: 'Настройка группы', name: 'КАСКО', count: '3 схемы', pair: null, steps: null, inheriting: '1 по группе',
  schemes: ['Осмотр легкового автомобиля | 500–700 ₽', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'], schemesEmpty: null, schemesControls: 0,
}
/** Панель ОСАГО в режиме `mode`: фиксированная — пара 900 / 1 100; компания — вилка компании у обеих схем. */
const PANEL_OSAGO = mode => ({
  title: 'Настройка группы', name: 'ОСАГО', count: '2 схемы', modes: MODES(mode, mode === 'fixed' ? 'pair' : '—'),
  pair: mode === 'fixed' ? { client: '900', nonClient: '1 100', linked: false } : null, steps: null, inheriting: '2 по группе',
  schemes: mode === 'fixed' ? ['Осмотр транспортного средства | 900–1 100 ₽', 'Осмотр прицепа | 900–1 100 ₽'] : ['Осмотр транспортного средства | 500–700 ₽', 'Осмотр прицепа | 500–700 ₽'],
  schemesEmpty: null, schemesControls: 0,
})
const MG_KASKO = ['g-kasko', 'company', null, null, true, false, [[1, null, null]]]
const MG_OSAGO = ['g-osago', 'fixed', 900, 1100, false, false, [[1, null, null]]]
const MG_REALTY = ['g-realty', 'scale', null, null, true, true, [[1, 500, 1200], [501, null, 1000]]]

/* Такт 81, П5: ожидания панели схемы по демо-данным (6.7). */
const S_DESC = range => `Наследует цену из общих настроек группы или компании: ${range}`
/** Режимы схемы: отмечен `checked`, у него тело `body` (`pair`, `scale`; у «По группе» тела нет). */
const SMODES = (checked, body, range = '500–700 ₽') => [
  { value: 'group', checked: checked === 'group', title: 'По группе', description: S_DESC(range), body: null },
  { value: 'individual', checked: checked === 'individual', title: 'Индивидуальная цена', description: 'Фиксированная цена только для этой схемы', body: checked === 'individual' ? body : null },
  { value: 'scale', checked: checked === 'scale', title: 'Регресс-шкала', description: 'Цена снижается при росте объёма осмотров', body: checked === 'scale' ? body : null },
]
const TYPES_REPLACE = 'Заменяет цену схемы для осмотров с этим типом'
const NO_TYPES_TAB = { types: null, callout: null, globalTypes: null, globalControls: null, schemeTypes: null, typesScale: null, picker: null }
const NO_PRICING_TAB = { modes: null, pair: null, steps: null, processes: null, processesEmpty: null }
/** Процессы «Осмотра легкового автомобиля»: сингл «Осмотр кузова» в блок не выводится. */
const PROC_CAR = ['Повреждение | 200 / 250', 'Колесо |  /  | связано']
/** Панель «Осмотра легкового автомобиля» на «Ценообразовании» в режиме «По группе». */
const SP_CAR = { title: 'КАСКО', name: 'Осмотр легкового автомобиля', code: '100101', tab: 'pricing', modes: SMODES('group', null), pair: null, steps: null, processes: PROC_CAR, processesEmpty: null, ...NO_TYPES_TAB }
const GLOBAL_TYPES = ['Легковой автомобиль | — | 300 ₽', 'Спецтехника | Шкала | 700–1 000 ₽', 'Квартира | — | 600 ₽']
const CALLOUT_GLOBAL = `Цены из раздела «Типы объектов» ${TYPES_REPLACE} Настроить индивидуально`
const CALLOUT_INDIVIDUAL = `Индивидуальные цены для этой схемы ${TYPES_REPLACE} Сбросить к глобальным`
/** Вкладка «Типы объектов» панели: глобальные цены только для чтения. */
const TYPES_GLOBAL = { ...NO_PRICING_TAB, tab: 'types', types: 'global', callout: CALLOUT_GLOBAL, globalTypes: GLOBAL_TYPES, globalControls: 0, schemeTypes: null, typesScale: 0, picker: null }
const TYPES_IND = list => ({ ...NO_PRICING_TAB, tab: 'types', types: 'individual', callout: CALLOUT_INDIVIDUAL, globalTypes: null, globalControls: 0, schemeTypes: list, typesScale: 0, picker: null })
/** Модель схем по порядку данных: правки — объектом `{ id: запись }`. */
const MS_START = {
  's-car': ['s-car', 'group', null, null, true, false, [[1, null, null]], false, [], [['pr-body', false, null, null, true], ['pr-damage', true, 200, 250, false], ['pr-wheel', true, null, null, true]]],
  's-moto': ['s-moto', 'individual', 450, 650, false, false, [[1, null, null]], false, [], []],
  's-pre': ['s-pre', 'scale', null, null, true, true, [[1, 300, 700], [301, null, 600]], false, [], []],
  's-vehicle': ['s-vehicle', 'group', null, null, true, false, [[1, null, null]], false, [], []],
  's-trailer': ['s-trailer', 'group', null, null, true, false, [[1, null, null]], false, [], []],
  's-flat': ['s-flat', 'group', null, null, true, false, [[1, null, null]], true, [['t-flat', 700, 700, true]], [['pr-room', true, 300, 350, false]]],
  's-house': ['s-house', 'individual', 1500, 1500, true, false, [[1, null, null]], false, [], [['pr-building', true, 500, 500, true]]],
}
const MS = (patch = {}) => Object.keys(MS_START).map(id => patch[id] ?? MS_START[id])
const CAR = (mode, client, nonClient, linked, on, steps, ind = false, types = [], proc = MS_START['s-car'][9]) => ['s-car', mode, client, nonClient, linked, on, steps, ind, types, proc]
const ROW = (badges, range) => ({ badges: badges.map(([x, tone]) => B(x, tone)), range: `Вилка цен ${range}` })

const SCENARIOS = {
  'ТФ-01': ['«Назад» ведёт к карточке компании; вход вне скоупа — уведомление-заглушка (§11 «Вход»; scope, «Вне скоупа»)', [
    ['старт', null, { title: 'Тарификация', tab: 'base', period: 'current', save: 'saved', saveText: 'Все изменения сохранены', saveSurface: 'light', applyButton: 'Сохранить изменения', applyIcon: true, notices: [] }],
    ['«Назад»', K => K.back(), { notices: ['Карточка компании — вне стенда'], tab: 'base', save: 'saved', writes: 0, dirty: false }],
  ]],
  'ТФ-02': ['три вкладки; правки между вкладками не теряются; счётчики по данным (§11)', [
    ['старт', null, { tabs: TABS, tab: 'base', tabActive: ['base'], tabIcons: [true, true, true], counts: { base: null, types: '3', schemes: '7' }, minPayment: '20 000' }],
    ['правка на «Базовых»: минимальная сумма 25000', async (K) => { await K.setMin('25000'); await K.settled() },
      { minPayment: '25 000', viewMin: 25000, saveLog: ['saving', 'saved'], writes: 1, dirty: true }],
    ['вкладка «Схемы осмотра» — собрана (П4, такт 80)', K => K.tab('schemes'), { tab: 'schemes', tabActive: ['schemes'], pending: null, dirty: true }],
    ['вкладка «Типы объектов» — собрана (П3, такт 79)', K => K.tab('types'), { tab: 'types', tabActive: ['types'], pending: null, dirty: true }],
    ['назад на «Базовые» — правка на месте', K => K.tab('base'), { tab: 'base', tabActive: ['base'], minPayment: '25 000', viewMin: 25000, dirty: true, saveLog: [], writes: 1, pending: null }],
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
        notices: ['Изменения применены'], dirty: false, applyDisabled: true, applyLoading: false, appliedMin: 24000, viewMin: 24000, minPayment: '24 000', applied: 1 }],
  ]],

  /* ------------------------------ П2 — такт 78: «Базовые настройки», пара цен, регресс-шкала ------------------------------ */
  'ТФ-05': ['минимальная сумма: только цифры, разряды при показе; пустое — минималка не применяется (§7, §11; scope п. 7)', [
    ['старт', null, { minPayment: '20 000', minUnit: '₽', viewMin: 20000 }],
    ['ввести буквы и цифры «12ab34»', async (K) => { await K.fill(Q.minInput, '12ab34'); await K.settled() },
      { minPayment: '1 234', viewMin: 1234, saveLog: ['saving', 'saved'], dirty: true }],
    ['набрать «7» в конец — разряды переставлены', async (K) => { await K.click(Q.minInput); await K.page.evaluate(`(e => (e.setSelectionRange(e.value.length, e.value.length), 1))(${Q.minInput})`); await K.page.type('7'); await K.settled() },
      { minPayment: '12 347', viewMin: 12347 }],
    ['очистить — пустое, минималка не применяется', async (K) => { await K.fill(Q.minInput, ''); await K.settled() },
      { minPayment: '', viewMin: null, saveLog: ['saving', 'saved'] }],
    ['ввести «0» — ноль допустим', async (K) => { await K.fill(Q.minInput, '0'); await K.settled() },
      { minPayment: '0', viewMin: 0 }],
  ]],
  'ТФ-06': ['пара «клиент / не клиент»: связь замком (§1; scope п. 7; 6.3)', [
    ['старт — пара развязана', null, { pair: { client: '500', nonClient: '700', linked: false, disabled: false, nonClientDisabled: false, lock: 'Связать цены', units: ['₽', '₽'] } }],
    ['связать — «Не клиент» принимает «Клиент» и выключен', K => K.click(Q.pairLock),
      { pair: { client: '500', nonClient: '500', linked: true, disabled: false, nonClientDisabled: true, lock: 'Развязать цены | нажат', units: ['₽', '₽'] }, modelPrice: { client: 500, nonClient: 500, linked: true }, dirty: true }],
    ['изменить «Клиент» — «Не клиент» повторяет', async (K) => { await K.fill(Q.pairClient, '6000'); await K.settled() },
      { pair: { client: '6 000', nonClient: '6 000', linked: true, disabled: false, nonClientDisabled: true, lock: 'Развязать цены | нажат', units: ['₽', '₽'] }, modelPrice: { client: 6000, nonClient: 6000, linked: true } }],
    ['развязать — значение «Не клиент» прежнее, поле доступно', K => K.click(Q.pairLock),
      { pair: { client: '6 000', nonClient: '6 000', linked: false, disabled: false, nonClientDisabled: false, lock: 'Связать цены', units: ['₽', '₽'] }, modelPrice: { client: 6000, nonClient: 6000, linked: false } }],
    ['изменить «Не клиент» отдельно', async (K) => { await K.fill(Q.pairNonClient, '8000'); await K.settled() },
      { pair: { client: '6 000', nonClient: '8 000', linked: false, disabled: false, nonClientDisabled: false, lock: 'Связать цены', units: ['₽', '₽'] }, modelPrice: { client: 6000, nonClient: 8000, linked: false } }],
    ['связать снова — «Не клиент» равен «Клиент»', K => K.click(Q.pairLock),
      { pair: { client: '6 000', nonClient: '6 000', linked: true, disabled: false, nonClientDisabled: true, lock: 'Развязать цены | нажат', units: ['₽', '₽'] }, modelPrice: { client: 6000, nonClient: 6000, linked: true } }],
  ]],
  'ТФ-07': ['общая шкала и фиксированная цена взаимоисключающие (§5)', [
    ['старт — шкала выключена, пара доступна', null, {
      scale: 'off', scaleSwitch: 'unchecked', steps: null, pair: { client: '500', nonClient: '700', linked: false, disabled: false, nonClientDisabled: false, lock: 'Связать цены', units: ['₽', '₽'] },
      pairHint: 'Применяется к схеме осмотра по умолчанию, если не заданы индивидуальная цена, регресс-шкала или стоимость по типу объекта. | default' }],
    ['включить шкалу — пара выключена, подсказка тоном предупреждения', async (K) => { await K.click(Q.scaleSwitch); await K.settled() }, {
      scale: 'on', scaleSwitch: 'checked', scaleForm: 'single', dirty: true, saveLog: ['saving', 'saved'],
      pair: { client: '500', nonClient: '700', linked: false, disabled: true, nonClientDisabled: true, lock: 'Связать цены | выкл', units: ['₽', '₽'] },
      pairHint: 'Не применяется при включённой регресс-шкале. Выключите общую регресс-шкалу для переключения на базовую стоимость | warning',
      steps: [{ from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true }, { from: '1 001', fromReadonly: true, to: '', price: '400', error: null, removable: true }] }],
    ['выключить — пара доступна, шкала скрыта', async (K) => { await K.click(Q.scaleSwitch); await K.settled() }, {
      scale: 'off', scaleSwitch: 'unchecked', steps: null, dirty: false,
      pair: { client: '500', nonClient: '700', linked: false, disabled: false, nonClientDisabled: false, lock: 'Связать цены', units: ['₽', '₽'] },
      pairHint: 'Применяется к схеме осмотра по умолчанию, если не заданы индивидуальная цена, регресс-шкала или стоимость по типу объекта. | default' }],
  ]],
  'ТФ-08': ['ступени: рождение по «До» последней, удаление с «Отменить» (§5; стр. 03, 52)', [
    ['старт — две ступени, «До» последней пустое', null, {
      steps: [{ from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true }, { from: '1 001', fromReadonly: true, to: '', price: '400', error: null, removable: true }],
      modelScale: { on: true, form: 'single', steps: [[1, 1000, 500, 500, true], [1001, null, 400, 400, true]] } }],
    ['заполнить «До» последней — новая ступень с «От» = «До» + 1, пустыми «До» и ценой', async (K) => { await K.fill(Q.stepTo(1), '5000'); await K.settled() }, {
      steps: [
        { from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true },
        { from: '1 001', fromReadonly: true, to: '5 000', price: '400', error: null, removable: true },
        { from: '5 001', fromReadonly: true, to: '', price: '', error: null, removable: true }],
      modelScale: { on: true, form: 'single', steps: [[1, 1000, 500, 500, true], [1001, 5000, 400, 400, true], [5001, null, null, null, true]] }, dirty: true }],
    ['цена новой ступени', async (K) => { await K.fill(Q.stepPrice(2), '300'); await K.settled() },
      { modelScale: { on: true, form: 'single', steps: [[1, 1000, 500, 500, true], [1001, 5000, 400, 400, true], [5001, null, 300, 300, true]] } }],
    ['удалить среднюю — «От» следующей пересчитано, уведомление с «Отменить»', async (K) => { await K.click(Q.stepRemove(1)); await K.settled() }, {
      steps: [{ from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true }, { from: '1 001', fromReadonly: true, to: '', price: '300', error: null, removable: true }],
      notices: ['Ступень удалена'] }],
    ['«Отменить» — ступени до удаления', async (K) => { await K.undo(); await K.settled() },
      { modelScale: { on: true, form: 'single', steps: [[1, 1000, 500, 500, true], [1001, 5000, 400, 400, true], [5001, null, 300, 300, true]] } }],
    ['удалить последнюю — «До» предыдущей очищено', async (K) => { await K.click(Q.stepRemove(2)); await K.settled() }, {
      steps: [{ from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true }, { from: '1 001', fromReadonly: true, to: '', price: '400', error: null, removable: true }],
      notices: ['Ступень удалена'] }],
    ['удалить вторую — у единственной ступени удаления нет', async (K) => { await K.click(Q.stepRemove(1)); await K.settled() }, {
      steps: [{ from: '1', fromReadonly: true, to: '', price: '500', error: null, removable: false }],
      modelScale: { on: true, form: 'single', steps: [[1, null, 500, 500, true]] }, notices: ['Ступень удалена'] }],
  ], { query: 'scale=on' }],
  'ТФ-09': ['форма шкалы «Единая цена» ↔ «По ролям»: колонки и перенос цен (§5; 6.2, стр. 09)', [
    ['старт — «Единая цена»', null, { scaleForm: 'single', scaleHead: ['От', 'До', 'Цена'] }],
    ['«По ролям» — пара связана, обе цены равны цене ступени', async (K) => { await K.click(Q.scaleForm('roles')); await K.settled() }, {
      scaleForm: 'roles', scaleHead: ['От', 'До', 'Клиент', 'Не клиент'],
      steps: [
        { from: '1', fromReadonly: true, to: '1 000', client: '500', nonClient: '500', linked: true, error: null, removable: true },
        { from: '1 001', fromReadonly: true, to: '', client: '400', nonClient: '400', linked: true, error: null, removable: true }],
      modelScale: { on: true, form: 'roles', steps: [[1, 1000, 500, 500, true], [1001, null, 400, 400, true]] } }],
    ['развязать первую ступень и ввести «Не клиент» 450', async (K) => { await K.click(Q.stepLock(0)); await K.fill(Q.stepNonClient(0), '450'); await K.settled() },
      { modelScale: { on: true, form: 'roles', steps: [[1, 1000, 500, 450, false], [1001, null, 400, 400, true]] } }],
    ['«Единая цена» — берётся цена клиента', async (K) => { await K.click(Q.scaleForm('single')); await K.settled() }, {
      scaleForm: 'single', scaleHead: ['От', 'До', 'Цена'],
      steps: [{ from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true }, { from: '1 001', fromReadonly: true, to: '', price: '400', error: null, removable: true }],
      modelScale: { on: true, form: 'single', steps: [[1, 1000, 500, 500, true], [1001, null, 400, 400, true]] } }],
  ], { query: 'scale=on' }],
  'ТФ-10': ['«До» меньше «От» — ошибка поля (§5; стр. 50)', [
    ['ввести «До» последней 500 при «От» 1 001', async (K) => { await K.fill(Q.stepTo(1), '500'); await K.settled() }, {
      steps: [
        { from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true },
        { from: '1 001', fromReadonly: true, to: '500', price: '400', error: 'Не меньше 1 001', removable: true },
        { from: '501', fromReadonly: true, to: '', price: '', error: null, removable: true }] }],
    ['исправить на 2 000 — ошибки нет, «От» следующей пересчитано', async (K) => { await K.fill(Q.stepTo(1), '2000'); await K.settled() }, {
      steps: [
        { from: '1', fromReadonly: true, to: '1 000', price: '500', error: null, removable: true },
        { from: '1 001', fromReadonly: true, to: '2 000', price: '400', error: null, removable: true },
        { from: '2 001', fromReadonly: true, to: '', price: '', error: null, removable: true }] }],
  ], { query: 'scale=on' }],
  'ТФ-11': ['учёт прогресса: сквозной по умолчанию, выбор меняется (§5, §11)', [
    ['старт — сквозной', null, { counterChecked: 'global', modelCounter: 'global', dirty: false }],
    ['«Раздельный учет»', async (K) => { await K.click(Q.counter('individual')); await K.settled() },
      { counterChecked: 'individual', modelCounter: 'individual', dirty: true, saveLog: ['saving', 'saved'] }],
    ['снова «Сквозной учет» — правок нет', async (K) => { await K.click(Q.counter('global')); await K.settled() },
      { counterChecked: 'global', modelCounter: 'global', dirty: false }],
  ]],
  'ТФ-12': ['«Как считается стоимость»: порядок поиска цены §4; Esc закрывает (§3, §4)', [
    ['старт — подсказка закрыта', null, { helpOpen: false, help: null }],
    ['открыть', K => K.click(Q.help), {
      helpOpen: true,
      help: { title: 'Приоритет выбора цены', steps: [
        '1 Цена типа объекта в схеме Максимум по этапам — панель схемы',
        '2 Индивидуальная цена схемы Панель схемы, «Ценообразование»',
        '3 Цена группы схем Панель «Настройка группы»',
        '4 Цена типа объекта Максимум по этапам — вкладка «Типы»',
        '5 Базовая цена компании Вкладка «Базовые настройки»'] } }],
    ['Esc — закрыта, фокус на кнопке', K => K.escape(), { helpOpen: false, help: null, focus: 'help' }],
  ]],
  'ТФ-36': ['клавиатура: Tab по паре и замку, Enter и пробел на замке, Tab по ступеням (§5; scope п. 7)', [
    ['фокус в «Клиент»', K => K.click(Q.pairClient), { focus: 'base-price:client' }],
    ['Tab — замок', K => K.tabKey(), { focus: 'base-price:lock' }],
    ['Enter — связано', async (K) => { await K.enter(); await K.settled() }, { focus: 'base-price:lock', pair: { client: '500', nonClient: '500', linked: true, disabled: false, nonClientDisabled: true, lock: 'Развязать цены | нажат', units: ['₽', '₽'] } }],
    ['пробел — развязано', async (K) => { await K.space(); await K.settled() }, { focus: 'base-price:lock', pair: { client: '500', nonClient: '500', linked: false, disabled: false, nonClientDisabled: false, lock: 'Связать цены', units: ['₽', '₽'] } }],
    ['Tab — «Не клиент»', K => K.tabKey(), { focus: 'base-price:non-client' }],
    ['шкала: фокус в «До» первой ступени', async (K) => { await K.start('scale=on'); await K.click(Q.stepTo(0)) }, { focus: 'step1:to' }],
    ['Tab — цена', K => K.tabKey(), { focus: 'step1:price' }],
    ['Tab — удаление', K => K.tabKey(), { focus: 'step1:remove' }],
    ['Tab — «От» второй ступени', K => K.tabKey(), { focus: 'step2:from' }],
    ['Tab — «До» второй ступени', K => K.tabKey(), { focus: 'step2:to' }],
  ]],

  /* ------------------------------ П3 — такт 79: «Типы объектов» ------------------------------ */
  'ТФ-13': ['выбор типа из справочника: поиск, добавленные уходят из списка, пустой поиск — «Ничего не найдено» (§11)', [
    ['старт — три типа', null, { counts: { base: null, types: '3', schemes: '7' }, picker: null,
      modelTypes: [['t-car', 300, 300, true, false, 'single', 1], ['t-special', 800, 1000, false, true, 'roles', 2], ['t-flat', 600, 600, true, false, 'single', 1]] }],
    ['«Добавить тип объекта» — справочник без добавленных, фокус в поиске', K => K.click(Q.addType), {
      picker: { options: TYPES_FREE, active: null, empty: null }, focus: 'type-search' }],
    ['поиск «мото»', async (K) => { await K.page.type('мото') }, { picker: { options: ['Мотоцикл'], active: null, empty: null } }],
    ['выбрать «Мотоцикл» — в таблице последним, цена не задана, пара связана, шкала выключена', async (K) => { await K.click(Q.typeOption('t-moto')); await K.settled() }, {
      picker: null, counts: { base: null, types: '4', schemes: '7' }, dirty: true, saveLog: ['saving', 'saved'],
      modelTypes: [['t-car', 300, 300, true, false, 'single', 1], ['t-special', 800, 1000, false, true, 'roles', 2], ['t-flat', 600, 600, true, false, 'single', 1], ['t-moto', null, null, true, false, 'single', 1]] }],
    ['открыть снова — «Мотоцикла» в списке нет', K => K.click(Q.addType), { picker: { options: TYPES_FREE.filter(x => x !== 'Мотоцикл'), active: null, empty: null } }],
    ['стрелка вниз дважды — второй пункт', async (K) => { await K.page.key('ArrowDown'); await K.page.key('ArrowDown') }, { picker: { options: TYPES_FREE.filter(x => x !== 'Мотоцикл'), active: 'Автобус', empty: null } }],
    ['Enter — «Автобус» добавлен, выбор закрыт', async (K) => { await K.enter(); await K.settled() }, { picker: null, counts: { base: null, types: '5', schemes: '7' } }],
    ['открыть и искать «яхта» — «Ничего не найдено»', async (K) => { await K.click(Q.addType); await K.page.type('яхта') }, { picker: { options: [], active: null, empty: 'Ничего не найдено' } }],
    ['Esc — выбор закрыт, фокус на кнопке, типов прежнее число', K => K.escape(), { picker: null, focus: 'add-type', counts: { base: null, types: '5', schemes: '7' } }],
  ], { query: 'tab=types' }],
  'ТФ-14': ['строка типа: раскрытие, шкала типа и пара цен взаимоисключающие, форма «По ролям» (§5, §11; стр. 08, 69)', [
    ['старт — строки свёрнуты; у «Спецтехники» шкала включена и пара выключена', null, { types: [
      { id: 't-car', name: 'Легковой автомобиль', client: '300', nonClient: '300', linked: true, pairDisabled: false, scale: 'unchecked', expanded: false, body: null },
      { id: 't-special', name: 'Спецтехника', client: '800', nonClient: '1 000', linked: false, pairDisabled: true, scale: 'checked', expanded: false, body: null },
      { id: 't-flat', name: 'Квартира', client: '600', nonClient: '600', linked: true, pairDisabled: false, scale: 'unchecked', expanded: false, body: null }] }],
    ['раскрыть «Легковой автомобиль» — шкала выключена', K => K.click(Q.typeExpand('t-car')), { expanded: ['t-car'], types: [
      { id: 't-car', name: 'Легковой автомобиль', client: '300', nonClient: '300', linked: true, pairDisabled: false, scale: 'unchecked', expanded: true,
        body: { disabled: true, form: 'single', head: ['От', 'До', 'Цена'], steps: [{ from: '1', to: '', price: '300', error: null, removable: false }] } },
      { id: 't-special', name: 'Спецтехника', client: '800', nonClient: '1 000', linked: false, pairDisabled: true, scale: 'checked', expanded: false, body: null },
      { id: 't-flat', name: 'Квартира', client: '600', nonClient: '600', linked: true, pairDisabled: false, scale: 'unchecked', expanded: false, body: null }] }],
    ['включить шкалу — пара выключена, шкала доступна', async (K) => { await K.click(Q.typeSwitch('t-car')); await K.settled() }, { dirty: true, saveLog: ['saving', 'saved'], types: [
      { id: 't-car', name: 'Легковой автомобиль', client: '300', nonClient: '300', linked: true, pairDisabled: true, scale: 'checked', expanded: true,
        body: { disabled: false, form: 'single', head: ['От', 'До', 'Цена'], steps: [{ from: '1', to: '', price: '300', error: null, removable: false }] } },
      { id: 't-special', name: 'Спецтехника', client: '800', nonClient: '1 000', linked: false, pairDisabled: true, scale: 'checked', expanded: false, body: null },
      { id: 't-flat', name: 'Квартира', client: '600', nonClient: '600', linked: true, pairDisabled: false, scale: 'unchecked', expanded: false, body: null }] }],
    ['форма «По ролям» — колонки «Клиент», «Не клиент», пара связана', async (K) => { await K.click(Q.typeForm('t-car', 'roles')); await K.settled() }, {
      modelTypes: [['t-car', 300, 300, true, true, 'roles', 1], ['t-special', 800, 1000, false, true, 'roles', 2], ['t-flat', 600, 600, true, false, 'single', 1]] }],
    ['выключить шкалу — пара доступна, раскрытая строка остаётся, шкала выключена', async (K) => { await K.click(Q.typeSwitch('t-car')); await K.settled() }, { types: [
      { id: 't-car', name: 'Легковой автомобиль', client: '300', nonClient: '300', linked: true, pairDisabled: false, scale: 'unchecked', expanded: true,
        body: { disabled: true, form: 'roles', head: ['От', 'До', 'Клиент', 'Не клиент'], steps: [{ from: '1', to: '', client: '300', nonClient: '300', linked: true, error: null, removable: false }] } },
      { id: 't-special', name: 'Спецтехника', client: '800', nonClient: '1 000', linked: false, pairDisabled: true, scale: 'checked', expanded: false, body: null },
      { id: 't-flat', name: 'Квартира', client: '600', nonClient: '600', linked: true, pairDisabled: false, scale: 'unchecked', expanded: false, body: null }] }],
    ['свернуть', K => K.click(Q.typeExpand('t-car')), { expanded: [] }],
    ['включить шкалу у свёрнутой «Квартиры» — строка раскрывается сама', async (K) => { await K.click(Q.typeSwitch('t-flat')); await K.settled() }, { expanded: ['t-flat'] }],
    ['«До» первой ступени «Квартиры» 100 — новая ступень', async (K) => { await K.fill(Q.typeStepTo('t-flat', 0), '100'); await K.settled() }, {
      modelTypes: [['t-car', 300, 300, true, false, 'roles', 1], ['t-special', 800, 1000, false, true, 'roles', 2], ['t-flat', 600, 600, true, true, 'single', 2]] }],
    ['цена «Клиент» строки при выключенной шкале правится', async (K) => { await K.fill(Q.typeClient('t-car'), '350'); await K.settled() }, {
      modelTypes: [['t-car', 350, 350, true, false, 'roles', 1], ['t-special', 800, 1000, false, true, 'roles', 2], ['t-flat', 600, 600, true, true, 'single', 2]] }],
  ], { query: 'tab=types' }],
  'ТФ-15': ['удаление типа с «Отменить»: тип исчез и вернулся на место (§11; стр. 31, 52)', [
    ['старт — «Спецтехника» раскрыта', null, { counts: { base: null, types: '3', schemes: '7' }, expanded: ['t-special'] }],
    ['удалить «Спецтехнику»', async (K) => { await K.click(Q.typeRemove('t-special')); await K.settled() }, {
      notices: ['Тип «Спецтехника» удалён'], counts: { base: null, types: '2', schemes: '7' }, dirty: true, expanded: [],
      modelTypes: [['t-car', 300, 300, true, false, 'single', 1], ['t-flat', 600, 600, true, false, 'single', 1]] }],
    ['выбор типа — «Спецтехника» снова в справочнике', K => K.click(Q.addType), { picker: { options: TYPES_ALL.filter(x => x !== 'Легковой автомобиль' && x !== 'Квартира'), active: null, empty: null } }],
    /* Esc закрыл бы и уведомление с «Отменить» (слой Reka): выбор закрывается повторным нажатием открывателя. */
    ['повторное нажатие «Добавить тип объекта» — выбор закрыт', K => K.click(Q.addType), { picker: null }],
    ['«Отменить» — тип на своём месте, строка раскрыта, правок нет', async (K) => { await K.undo(); await K.settled() }, {
      counts: { base: null, types: '3', schemes: '7' }, dirty: false, expanded: ['t-special'],
      modelTypes: [['t-car', 300, 300, true, false, 'single', 1], ['t-special', 800, 1000, false, true, 'roles', 2], ['t-flat', 600, 600, true, false, 'single', 1]] }],
  ], { query: 'tab=types&expand=t-special' }],
  'ТФ-16': ['пустой список типов: «Empty» с «Добавить тип объекта» (§11; стр. 46)', [
    ['старт — `?data=empty`', null, { counts: { base: null, types: '0', schemes: '5' }, types: [],
      typesEmpty: { title: 'Типов объектов пока нет', action: 'Добавить тип объекта' }, picker: null }],
    ['«Добавить тип объекта» из пустого — весь справочник', K => K.click(Q.addType), { picker: { options: TYPES_ALL, active: null, empty: null } }],
    ['выбрать «Квартиру» — таблица вместо пустого', async (K) => { await K.click(Q.typeOption('t-flat')); await K.settled() }, {
      typesEmpty: null, picker: null, counts: { base: null, types: '1', schemes: '5' }, modelTypes: [['t-flat', null, null, true, false, 'single', 1]] }],
  ], { query: 'data=empty&tab=types' }],

  /* ------------------------------ П4 — такт 80: «Схемы осмотра» и панель группы ------------------------------ */
  'ТФ-17': ['вкладка «Схемы осмотра»: группы со схемами, метки по 6.6, вилки по 6.5, устаревшая приглушена, пустая группа (§11; стр. 25, 45, 46, 55, 56)', [
    ['старт — три группы, семь схем', null, { counts: { base: null, types: '3', schemes: '7' }, groups: SCHEMES_START }],
    ['шестерёнка схемы — панель схемы (П5, такт 81)', K => K.click(Q.schemeSettings('s-car')), { notices: [], panel: null, schemePanel: SP_CAR, dirty: false }],
    ['крестик панели — назад к списку', K => K.click(Q.schemeClose), { schemePanel: null, focus: 'scheme-settings', focusScheme: 's-car' }],
    ['набор `?data=empty` — группа «Недвижимость» без схем', K => K.start('tab=schemes&data=empty'), { counts: { base: null, types: '0', schemes: '5' }, groups: [
      SCHEMES_START[0], SCHEMES_START[1],
      { id: 'g-realty', name: 'Недвижимость', badges: ['0 схем | outline foreground-secondary', 'Регресс-шкала | outline primary'], range: G('1 000–1 200 ₽'), schemes: [], empty: 'В группе пока нет схем' }] }],
  ], { query: 'tab=schemes' }],
  'ТФ-18': ['панель группы: три режима; цена и шкала группы; вилка и метка группы на странице следуют режиму (§11, §3, §5; стр. 29, 36, 53)', [
    ['«Настроить группу» у КАСКО — по умолчанию «Базовая цена компании»', K => K.click(Q.groupSettings('g-kasko')), {
      panel: { ...PANEL_KASKO, modes: MODES('company', '—') }, dirty: false }],
    ['«Фиксированная цена группы» — тело с парой, вилка группы и схем «По группе» пустая', async (K) => { await K.click(Q.groupMode('fixed')); await K.settled() }, {
      dirty: true, saveLog: ['saving', 'saved'],
      panel: { ...PANEL_KASKO, modes: MODES('fixed', 'pair'), pair: { client: '', nonClient: '', linked: true }, schemes: ['Осмотр легкового автомобиля | —', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'] },
      groups: [{ ...SCHEMES_START[0], range: G('—'), schemes: [{ ...SCHEMES_START[0].schemes[0], range: 'Вилка цен —' }, SCHEMES_START[0].schemes[1], SCHEMES_START[0].schemes[2]] }, SCHEMES_START[1], SCHEMES_START[2]] }],
    ['цена «Клиент» 800 — пара связана, одна цена', async (K) => { await K.fill(Q.groupClient, '800'); await K.settled() }, {
      panel: { ...PANEL_KASKO, modes: MODES('fixed', 'pair'), pair: { client: '800', nonClient: '800', linked: true }, schemes: ['Осмотр легкового автомобиля | 800 ₽', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'] },
      groups: [{ ...SCHEMES_START[0], range: G('800 ₽'), schemes: [{ ...SCHEMES_START[0].schemes[0], range: 'Вилка цен 800 ₽' }, SCHEMES_START[0].schemes[1], SCHEMES_START[0].schemes[2]] }, SCHEMES_START[1], SCHEMES_START[2]] }],
    ['развязать и «Не клиент» 1000 — вилка «от … до …»', async (K) => { await K.click(Q.groupLock); await K.fill(Q.groupNonClient, '1000'); await K.settled() }, {
      panel: { ...PANEL_KASKO, modes: MODES('fixed', 'pair'), pair: { client: '800', nonClient: '1 000', linked: false }, schemes: ['Осмотр легкового автомобиля | 800–1 000 ₽', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'] },
      groups: [{ ...SCHEMES_START[0], range: G('800–1 000 ₽'), schemes: [{ ...SCHEMES_START[0].schemes[0], range: 'Вилка цен от 800 ₽ до 1 000 ₽' }, SCHEMES_START[0].schemes[1], SCHEMES_START[0].schemes[2]] }, SCHEMES_START[1], SCHEMES_START[2]] }],
    ['«Регресс-шкала группы» — тело со шкалой, метка «Регресс-шкала» у группы', async (K) => { await K.click(Q.groupMode('scale')); await K.settled() }, {
      panel: { ...PANEL_KASKO, modes: MODES('scale', 'scale'), pair: null, steps: [{ from: '1', to: '', price: '', error: null, removable: false }],
        schemes: ['Осмотр легкового автомобиля | —', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'] },
      groups: [{ ...SCHEMES_START[0], badges: ['3 схемы | outline foreground-secondary', 'Регресс-шкала | outline primary'], range: G('—'), schemes: [{ ...SCHEMES_START[0].schemes[0], range: 'Вилка цен —' }, SCHEMES_START[0].schemes[1], SCHEMES_START[0].schemes[2]] }, SCHEMES_START[1], SCHEMES_START[2]],
      modelGroups: [['g-kasko', 'scale', 800, 1000, false, true, [[1, null, null]]], MG_OSAGO, MG_REALTY] }],
    ['ступени: цена 1200, «До» 100, цена второй 1000 — вилка мин–макс', async (K) => {
      await K.fill(Q.groupStepPrice(0), '1200'); await K.settled()
      await K.fill(Q.groupStepTo(0), '100'); await K.settled()
      await K.fill(Q.groupStepPrice(1), '1000'); await K.settled() }, {
      panel: { ...PANEL_KASKO, modes: MODES('scale', 'scale'), pair: null,
        steps: [{ from: '1', to: '100', price: '1 200', error: null, removable: true }, { from: '101', to: '', price: '1 000', error: null, removable: true }],
        schemes: ['Осмотр легкового автомобиля | 1 000–1 200 ₽', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'] },
      groups: [{ ...SCHEMES_START[0], badges: ['3 схемы | outline foreground-secondary', 'Регресс-шкала | outline primary'], range: G('1 000–1 200 ₽'), schemes: [{ ...SCHEMES_START[0].schemes[0], range: 'Вилка цен от 1 000 ₽ до 1 200 ₽' }, SCHEMES_START[0].schemes[1], SCHEMES_START[0].schemes[2]] }, SCHEMES_START[1], SCHEMES_START[2]] }],
    ['снова «Базовая цена компании» — вилка компании; цена и ступени группы сохранены', async (K) => { await K.click(Q.groupMode('company')); await K.settled() }, {
      panel: { ...PANEL_KASKO, modes: MODES('company', '—'), pair: null, steps: null },
      groups: SCHEMES_START,
      modelGroups: [['g-kasko', 'company', 800, 1000, false, false, [[1, 100, 1200], [101, null, 1000]]], MG_OSAGO, MG_REALTY] }],
  ], { query: 'tab=schemes' }],
  'ТФ-19': ['«Схемы в группе» — только чтение: цена каждой схемы, «N по группе» (§11)', [
    ['`?open=group` — КАСКО: три схемы, одна наследует цену группы', null, { tab: 'schemes', panel: { ...PANEL_KASKO, modes: MODES('company', '—') } }],
    ['ОСАГО — фиксированная цена группы, обе схемы по группе', K => K.start('open=group&group=g-osago'), { panel: PANEL_OSAGO('fixed') }],
    ['«Недвижимость» в наборе `?data=empty` — схем нет', K => K.start('open=group&group=g-realty&data=empty'), { panel: {
      title: 'Настройка группы', name: 'Недвижимость', count: '0 схем',
      modes: [
        { value: 'company', checked: false, title: 'Базовая цена компании', description: 'Наследует цену компании: 500–700 ₽', body: null },
        { value: 'fixed', checked: false, title: 'Фиксированная цена группы', description: 'Фиксированная цена только для этой группы', body: null },
        { value: 'scale', checked: true, title: 'Регресс-шкала группы', description: 'Цена снижается при росте объёма осмотров', body: 'scale' }],
      pair: null, steps: [{ from: '1', to: '500', price: '1 200', error: null, removable: true }, { from: '501', to: '', price: '1 000', error: null, removable: true }],
      inheriting: '0 по группе', schemes: [], schemesEmpty: 'В группе пока нет схем', schemesControls: 0 } }],
    ['`?mode=fixed` — режим открытой группы как данные, правки нет', K => K.start('open=group&mode=fixed'), { dirty: false, writes: 0, panel: { ...PANEL_KASKO, modes: MODES('fixed', 'pair'), pair: { client: '', nonClient: '', linked: true }, schemes: ['Осмотр легкового автомобиля | —', 'Осмотр мотоцикла | 450–650 ₽', 'Предстраховой осмотр автомобиля | 600–900 ₽'] } }],
  ], { query: 'open=group' }],
  'ТФ-24': ['панели группы и схемы: Esc и крестик закрывают, фокус на открывателе, правки панели остались (§8; стр. 53)', [
    ['открыть панель ОСАГО', K => K.click(Q.groupSettings('g-osago')), { panel: PANEL_OSAGO('fixed') }],
    ['режим «Базовая цена компании» — пишется сразу', async (K) => { await K.click(Q.groupMode('company')); await K.settled() }, { dirty: true, saveLog: ['saving', 'saved'], panel: PANEL_OSAGO('company') }],
    ['Esc — панель закрыта, фокус на «Настроить группу» ОСАГО, вилка группы — компании', K => K.escape(), {
      panel: null, focus: 'group-settings', focusGroup: 'g-osago', dirty: true,
      groups: [SCHEMES_START[0], { ...SCHEMES_START[1], range: G('500–700 ₽'), schemes: [{ ...SCHEMES_START[1].schemes[0], range: 'Вилка цен от 500 ₽ до 700 ₽' }, { ...SCHEMES_START[1].schemes[1], range: 'Вилка цен от 500 ₽ до 700 ₽' }] }, SCHEMES_START[2]],
      modelGroups: [MG_KASKO, ['g-osago', 'company', 900, 1100, false, false, [[1, null, null]]], MG_REALTY] }],
    ['открыть снова — режим сохранён', K => K.click(Q.groupSettings('g-osago')), { panel: PANEL_OSAGO('company') }],
    ['крестик — панель закрыта, фокус на открывателе', K => K.click(Q.panelClose), { panel: null, focus: 'group-settings', focusGroup: 'g-osago' }],
    /* Такт 81: то же у панели схемы. */
    ['шестерёнка «Осмотра мотоцикла» — панель схемы', K => K.click(Q.schemeSettings('s-moto')), { schemePanel: { ...SP_CAR, name: 'Осмотр мотоцикла', code: '100102', modes: SMODES('individual', 'pair'), pair: { client: '450', nonClient: '650', linked: false }, processes: [], processesEmpty: 'В схеме нет повторяемых процессов' } }],
    ['режим «Регресс-шкала» — пишется сразу', async (K) => { await K.click(Q.schemeMode('scale')); await K.settled() }, { saveLog: ['saving', 'saved'], schemeRow: ROW([['Регресс-шкала', 'primary'], ['Новая', 'warning']], '—') }],
    ['Esc — панель схемы закрыта, фокус на шестерёнке «Осмотра мотоцикла», метка строки — «Регресс-шкала»', K => K.escape(), {
      schemePanel: null, focus: 'scheme-settings', focusScheme: 's-moto',
      modelSchemes: MS({ 's-moto': ['s-moto', 'scale', 450, 650, false, true, [[1, null, null]], false, [], []] }) }],
    ['открыть снова — режим сохранён', K => K.click(Q.schemeSettings('s-moto')), { schemePanel: { ...SP_CAR, name: 'Осмотр мотоцикла', code: '100102', modes: SMODES('scale', 'scale'), steps: [{ from: '1', to: '', price: '', error: null, removable: false }], processes: [], processesEmpty: 'В схеме нет повторяемых процессов' } }],
    ['крестик — панель схемы закрыта, фокус на открывателе', K => K.click(Q.schemeClose), { schemePanel: null, focus: 'scheme-settings', focusScheme: 's-moto' }],
  ], { query: 'tab=schemes' }],

  /* ------------------------------ П5 — такт 81: панель схемы ------------------------------ */
  'ТФ-20': ['панель схемы: вход шестерёнкой строки; шапка — группа, имя, идентификатор с копированием, вкладки (§11; стр. 06)', [
    ['шестерёнка «Осмотра легкового автомобиля»', K => K.click(Q.schemeSettings('s-car')), { schemePanel: SP_CAR, notices: [], dirty: false }],
    ['копировать идентификатор — «Скопировано»', K => K.click(Q.schemeCopy), { notices: ['Скопировано'], schemePanel: SP_CAR, dirty: false }],
    ['вкладка панели «Типы объектов»', K => K.click(Q.panelTab('types')), { schemePanel: { ...SP_CAR, ...TYPES_GLOBAL } }],
    ['крестик, шестерёнка «Осмотра прицепа» ОСАГО — шапка другой группы, вкладка «Ценообразование»', async (K) => { await K.click(Q.schemeClose); await K.click(Q.schemeSettings('s-trailer')) }, {
      schemePanel: { ...SP_CAR, title: 'ОСАГО', name: 'Осмотр прицепа', code: '100202', modes: SMODES('group', null, '900–1 100 ₽'), processes: [], processesEmpty: 'В схеме нет повторяемых процессов' } }],
    ['`?open=scheme&scheme=s-flat&panel=types` — индивидуальные цены типов', K => K.start('open=scheme&scheme=s-flat&panel=types'), {
      tab: 'schemes', schemePanel: { ...SP_CAR, title: 'Недвижимость', name: 'Осмотр квартиры', code: '100301', ...TYPES_IND(['Квартира | 700 / 700 | связано']) } }],
  ], { query: 'tab=schemes' }],
  'ТФ-21': ['режимы схемы «По группе» → «Индивидуальная цена» → «Регресс-шкала»: вилка и метка строки схемы следуют (§11, §3, §5; стр. 06, 36, 53, 56)', [
    ['`?open=scheme` — «По группе», вилка группы', null, { tab: 'schemes', schemePanel: SP_CAR, schemeRow: ROW([['По группе', 'primary']], 'от 500 ₽ до 700 ₽'), dirty: false }],
    ['«Индивидуальная цена» — тело с парой, вилка строки пустая', async (K) => { await K.click(Q.schemeMode('individual')); await K.settled() }, {
      dirty: true, saveLog: ['saving', 'saved'], schemePanel: { ...SP_CAR, modes: SMODES('individual', 'pair'), pair: { client: '', nonClient: '', linked: true } },
      schemeRow: ROW([['Индивид. цены', 'primary']], '—') }],
    ['«Клиент» 900 — пара связана, одна цена', async (K) => { await K.fill(Q.schemeClient, '900'); await K.settled() }, {
      schemePanel: { ...SP_CAR, modes: SMODES('individual', 'pair'), pair: { client: '900', nonClient: '900', linked: true } }, schemeRow: ROW([['Индивид. цены', 'primary']], '900 ₽') }],
    ['развязать и «Не клиент» 1200 — вилка «от … до …»', async (K) => { await K.click(Q.schemeLock); await K.fill(Q.schemeNonClient, '1200'); await K.settled() }, {
      schemePanel: { ...SP_CAR, modes: SMODES('individual', 'pair'), pair: { client: '900', nonClient: '1 200', linked: false } }, schemeRow: ROW([['Индивид. цены', 'primary']], 'от 900 ₽ до 1 200 ₽') }],
    ['«Регресс-шкала» — тело со шкалой, метка «Регресс-шкала»', async (K) => { await K.click(Q.schemeMode('scale')); await K.settled() }, {
      schemePanel: { ...SP_CAR, modes: SMODES('scale', 'scale'), steps: [{ from: '1', to: '', price: '', error: null, removable: false }] },
      schemeRow: ROW([['Регресс-шкала', 'primary']], '—'), modelSchemes: MS({ 's-car': CAR('scale', 900, 1200, false, true, [[1, null, null]]) }) }],
    ['ступени: цена 800, «До» 50, цена второй 600 — вилка мин–макс', async (K) => {
      await K.fill(Q.schemeStepPrice(0), '800'); await K.settled()
      await K.fill(Q.schemeStepTo(0), '50'); await K.settled()
      await K.fill(Q.schemeStepPrice(1), '600'); await K.settled() }, {
      schemePanel: { ...SP_CAR, modes: SMODES('scale', 'scale'), steps: [{ from: '1', to: '50', price: '800', error: null, removable: true }, { from: '51', to: '', price: '600', error: null, removable: true }] },
      schemeRow: ROW([['Регресс-шкала', 'primary']], 'от 600 ₽ до 800 ₽') }],
    ['удалить вторую ступень — уведомление с «Отменить», панель открыта', async (K) => { await K.click(Q.schemeStepRemove(1)); await K.settled() }, {
      notices: ['Ступень удалена'], schemePanel: { ...SP_CAR, modes: SMODES('scale', 'scale'), steps: [{ from: '1', to: '', price: '800', error: null, removable: false }] },
      schemeRow: ROW([['Регресс-шкала', 'primary']], '800 ₽') }],
    ['«Отменить» поверх панели — ступени вернулись', async (K) => { await K.undo(); await K.settled() }, {
      schemePanel: { ...SP_CAR, modes: SMODES('scale', 'scale'), steps: [{ from: '1', to: '50', price: '800', error: null, removable: true }, { from: '51', to: '', price: '600', error: null, removable: true }] },
      schemeRow: ROW([['Регресс-шкала', 'primary']], 'от 600 ₽ до 800 ₽') }],
    ['снова «По группе» — вилка группы; пара и ступени схемы сохранены', async (K) => { await K.click(Q.schemeMode('group')); await K.settled() }, {
      schemePanel: SP_CAR, schemeRow: ROW([['По группе', 'primary']], 'от 500 ₽ до 700 ₽'),
      modelSchemes: MS({ 's-car': CAR('group', 900, 1200, false, false, [[1, 50, 800], [51, null, 600]]) }) }],
    ['`?mode=individual` — режим открытой схемы как данные, правки нет', K => K.start('open=scheme&mode=individual'), {
      dirty: false, writes: 0, schemePanel: { ...SP_CAR, modes: SMODES('individual', 'pair'), pair: { client: '', nonClient: '', linked: true } } }],
  ], { query: 'open=scheme' }],
  'ТФ-22': ['«Процессы»: цены повторяемых процессов пишутся в модель; синглов в списке нет (§1, §6; ждут людей, п. 2 и 4 — стр. 14, 16)', [
    ['`?open=scheme` — два повторяемых процесса, сингл «Осмотр кузова» не выводится', null, { schemePanel: SP_CAR, modelSchemes: MS() }],
    ['«Колесо»: «Клиент» 150 — пара связана; вилка схемы не меняется', async (K) => { await K.fill(Q.processClient('pr-wheel'), '150'); await K.settled() }, {
      dirty: true, saveLog: ['saving', 'saved'], schemePanel: { ...SP_CAR, processes: ['Повреждение | 200 / 250', 'Колесо | 150 / 150 | связано'] },
      schemeRow: ROW([['По группе', 'primary']], 'от 500 ₽ до 700 ₽'),
      modelSchemes: MS({ 's-car': CAR('group', null, null, true, false, [[1, null, null]], false, [], [['pr-body', false, null, null, true], ['pr-damage', true, 200, 250, false], ['pr-wheel', true, 150, 150, true]]) }) }],
    ['«Повреждение»: связать — «Не клиент» принимает «Клиент»', async (K) => { await K.click(Q.processLock('pr-damage')); await K.settled() }, {
      schemePanel: { ...SP_CAR, processes: ['Повреждение | 200 / 200 | связано', 'Колесо | 150 / 150 | связано'] },
      modelSchemes: MS({ 's-car': CAR('group', null, null, true, false, [[1, null, null]], false, [], [['pr-body', false, null, null, true], ['pr-damage', true, 200, 200, true], ['pr-wheel', true, 150, 150, true]]) }) }],
    ['схема без повторяемых процессов — пустое состояние', K => K.start('open=scheme&scheme=s-moto'), {
      schemePanel: { ...SP_CAR, name: 'Осмотр мотоцикла', code: '100102', modes: SMODES('individual', 'pair'), pair: { client: '450', nonClient: '650', linked: false }, processes: [], processesEmpty: 'В схеме нет повторяемых процессов' } }],
  ], { query: 'open=scheme' }],
  'ТФ-23': ['«Типы объектов» панели: глобальные — только чтение; «Настроить индивидуально» — копия глобальных; «Сбросить к глобальным» с «Отменить»; шкалы нет (§3, §11; ждут людей, п. 1 и 9 — стр. 13, 17, 52)', [
    ['`?open=scheme&panel=types` — глобальные цены только для чтения', null, { schemePanel: { ...SP_CAR, ...TYPES_GLOBAL }, schemeRow: ROW([['По группе', 'primary']], 'от 500 ₽ до 700 ₽') }],
    ['«Настроить индивидуально» — копия глобальных пар, метка «Индивидуальные типы»', async (K) => { await K.click(Q.customizeTypes); await K.settled() }, {
      dirty: true, saveLog: ['saving', 'saved'],
      schemePanel: { ...SP_CAR, ...TYPES_IND(['Легковой автомобиль | 300 / 300 | связано', 'Спецтехника | 800 / 1 000', 'Квартира | 600 / 600 | связано']) },
      schemeRow: ROW([['По группе', 'primary'], ['Индивидуальные типы', 'primary']], 'от 500 ₽ до 700 ₽') }],
    ['«Квартира»: «Клиент» 650 — пишется в цены схемы', async (K) => { await K.fill(Q.schemeTypeClient('t-flat'), '650'); await K.settled() }, {
      schemePanel: { ...SP_CAR, ...TYPES_IND(['Легковой автомобиль | 300 / 300 | связано', 'Спецтехника | 800 / 1 000', 'Квартира | 650 / 650 | связано']) } }],
    ['«Добавить тип объекта» — справочник без типов схемы', K => K.click(Q.addSchemeType), {
      schemePanel: { ...SP_CAR, ...TYPES_IND(['Легковой автомобиль | 300 / 300 | связано', 'Спецтехника | 800 / 1 000', 'Квартира | 650 / 650 | связано']), picker: TYPES_FREE } }],
    ['выбрать «Мотоцикл» — в конец списка, цена не задана', async (K) => { await K.click(Q.schemeTypeOption('t-moto')); await K.settled() }, {
      schemePanel: { ...SP_CAR, ...TYPES_IND(['Легковой автомобиль | 300 / 300 | связано', 'Спецтехника | 800 / 1 000', 'Квартира | 650 / 650 | связано', 'Мотоцикл |  /  | связано']) },
      modelSchemes: MS({ 's-car': CAR('group', null, null, true, false, [[1, null, null]], true, [['t-car', 300, 300, true], ['t-special', 800, 1000, false], ['t-flat', 650, 650, true], ['t-moto', null, null, true]]) }) }],
    ['«Сбросить к глобальным» — глобальные цены, уведомление с «Отменить»', async (K) => { await K.click(Q.resetTypes); await K.settled() }, {
      notices: ['Цены типов сброшены к глобальным'], schemePanel: { ...SP_CAR, ...TYPES_GLOBAL }, schemeRow: ROW([['По группе', 'primary']], 'от 500 ₽ до 700 ₽'),
      modelSchemes: MS() }],
    ['«Отменить» — индивидуальные цены вернулись с правками', async (K) => { await K.undo(); await K.settled() }, {
      schemePanel: { ...SP_CAR, ...TYPES_IND(['Легковой автомобиль | 300 / 300 | связано', 'Спецтехника | 800 / 1 000', 'Квартира | 650 / 650 | связано', 'Мотоцикл |  /  | связано']) },
      schemeRow: ROW([['По группе', 'primary'], ['Индивидуальные типы', 'primary']], 'от 500 ₽ до 700 ₽'),
      modelSchemes: MS({ 's-car': CAR('group', null, null, true, false, [[1, null, null]], true, [['t-car', 300, 300, true], ['t-special', 800, 1000, false], ['t-flat', 650, 650, true], ['t-moto', null, null, true]]) }) }],
  ], { query: 'open=scheme&panel=types' }],
}

/* ------------------------------ прогон ------------------------------ */
function diff(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], path ? `${path}.${k}` : k))
  }
  /* Массивы одной длины — по элементам: провал называет номер и поле (такт 80, списки групп и схем). */
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.flatMap((x, k) => diff(x, b[k], `${path}[${k}]`))
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
