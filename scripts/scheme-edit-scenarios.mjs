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
     * проверялся на нуле. Цель внутри окна, срезанная областью прокрутки (пункт длинного списка в поповере), ставится
     * в видимую часть этой области — `nearest` видимую цель не двигает.
     */
    async point(sel) {
      await send('Page.bringToFront')
      const at = scroll => evaluate(`(() => { const el = ${sel}; if (!el) return null; ${scroll ? "{ const v = el.getBoundingClientRect(); if (v.top < 0 || v.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' }); else el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }) }" : ''} const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
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
    /**
     * Клавиша реальным вводом. Служебным клавишам нужен `windowsVirtualKeyCode`: без него Delete и стрелки до
     * редактируемой области не доходят (ловушка `CLAUDE.md`, «Синтетический Delete по CDP»).
     */
    async key(key, code = key, extra = {}) {
      const VK = { End: 35, Home: 36, ArrowLeft: 37, ArrowRight: 39, Backspace: 8, Delete: 46, Escape: 27, Enter: 13, Tab: 9 }
      const vk = VK[key] ? { windowsVirtualKeyCode: VK[key], nativeVirtualKeyCode: VK[key] } : {}
      await send('Page.bringToFront')
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, ...vk, ...extra })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...vk, ...extra })
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
  const take = el => setTimeout(() => { const c = el.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); const x = t(c.textContent); if (x) window.__notices.push(x) }, 0)
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
  /* П2 */
  navItem: id => `document.querySelector('[data-slot=section-nav-item][data-value=${id}]')`,
  navAnchor: id => `document.querySelector('[data-anchor-link=${id}]')`,
  act: id => `document.querySelector('[data-act=${id}]')`,
  /** Контрол строки настройки: первый в строке — её собственный, вложенные идут ниже. */
  setting: key => `document.querySelector('[data-setting=${key}] [data-slot=choice-control]')`,
  radio: (group, text) => `[...document.querySelectorAll('[data-radio=${group}] [data-slot=choice]')].find(l => l.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(text)})?.querySelector('[data-slot=choice-control]')`,
  listItem: text => `[...document.querySelectorAll('[data-slot=popover] [data-slot=list-item]')].find(i => i.querySelector('[data-slot=list-item-title]').textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(text)})`,
  editor: key => `document.querySelector('[data-formula=${key}] [data-slot=formula-editor]')`,
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
    /* ---------- П2 ---------- */
    section: id => page.click(Q.navItem(id)),
    anchor: id => page.click(Q.navAnchor(id)),
    act: id => page.click(Q.act(id)),
    /** Прокрутка колесом до подраздела: его начало встаёт на 24 от верха окна и на 6 дальше — якорь уже сменился. */
    async wheelTo(id) {
      const dy = await page.evaluate(`Math.round(document.getElementById('anchor-${id}').getBoundingClientRect().top - 24 + 6)`)
      await page.wheel(dy)
      await sleep(300)
    },
    /** Запомнить положение окна: слепок сообщает, вернулась ли прокрутка к отметке (`atMark`). */
    mark: () => page.evaluate(`(window.__markY = window.scrollY, 1)`),
    toggle: key => page.click(Q.setting(key)),
    radio: (group, text) => page.click(Q.radio(group, text)),
    /** Одиночный выбор: открыть список поля и нажать пункт. */
    async select(field, text) {
      await page.click(`document.querySelector('[data-field=${field}] button[data-slot=field]')`)
      await page.click(Q.listItem(text))
    },
    /** Набор значений: открыть список, нажать пункты, закрыть Esc. */
    async pick(field, ...texts) {
      await page.click(`document.querySelector('[data-field=${field}] [data-slot=select-toggle]')`)
      for (const t of texts) await page.click(Q.listItem(t))
      await page.key('Escape')
    },
    unpick: (field, value) => page.click(`document.querySelector('[data-field=${field}] [data-slot=select-chip][data-value=${value}] [data-slot=select-chip-remove]')`),
    stepper: (field, label) => page.click(`document.querySelector('[data-field=${field}] button[aria-label=${label}]')`),
    async typeInto(field, text) {
      await page.click(`document.querySelector('[data-field=${field}]')`)
      await page.type(text)
    },
    /* ---------- П3 ---------- */
    /** Заменить значение поля: клик, выделить всё, набрать. */
    async fill(sel, text) {
      const input = `(el => el?.matches('input') ? el : el?.querySelector('input'))(document.querySelector('${sel}'))`
      await page.click(input)
      await page.evaluate(`(${input}.select(), 1)`)
      await page.type(text)
    },
    /** «Отменить» в уведомлении. */
    undo: () => page.click(`[...document.querySelectorAll('[data-slot=toast] button')].find(b => b.textContent.replace(/\\s+/g, ' ').trim() === 'Отменить')`),
    removeReason: key => page.click(`document.querySelector('[data-reason=${key}] [data-slot=chip-remove]')`),
    groupCheck: id => page.click(`document.querySelector('[data-group=${id}] [data-slot=choice-control]')`),
    groupsAll: () => page.click(`document.querySelector('[data-groups-all] [data-slot=choice-control], [data-groups-all][data-slot=choice-control]')`),
    groupsPage: n => page.click(`[...document.querySelectorAll('[data-groups-table] [data-slot=pagination-page]')].find(b => b.textContent.trim() === '${n}')`),
    groupsReset: () => page.click(`document.querySelector('[data-groups-table] [data-slot=table-empty-search] button')`),
    detectorSet: id => page.click(`document.querySelector('[data-detector-set=${id}] [data-slot=choice-control]')`),
    templateEdit: id => page.click(`document.querySelector('[data-template=${id}] [data-slot=table-row-action]')`),
    async templateDelete(id) {
      await page.click(`document.querySelector('[data-template=${id}] [data-slot=table-row-actions-secondary] button')`)
      await page.click(`document.querySelector('[data-menu=row-actions] [data-action=delete]')`)
    },
    check: field => page.click(`document.querySelector('[data-field=${field}] [data-slot=choice-control], [data-field=${field}][data-slot=choice] [data-slot=choice-control]')`),
    async tabs(n) { for (let k = 0; k < n; k++) await page.key('Tab') },
    /* Формула: курсор в конец — клик по области и End. */
    async formulaEnd(key) {
      await page.click(Q.editor(key))
      await page.key('End')
    },
    key: k => page.key(k),
    type: text => page.type(text),
    async addVariable(key, variable) {
      await page.click(`document.querySelector('[data-formula=${key}] [data-slot=formula-add]')`)
      await page.click(`document.querySelector('[data-formula-variables] [data-var="${variable}"]')`)
    },
    removeVariable: (key, variable) => page.click(`document.querySelector('[data-formula=${key}] [data-slot=formula-chip][data-var="${variable}"] [data-slot=formula-chip-remove]')`),
    /**
     * Вставка из буфера: событие `paste` с текстом — обработчик поля получает то же, что при Ctrl+V. Буфер обмена
     * headless-браузера прогону не доступен, поэтому событие создаётся в странице; набор руками идёт `type`.
     */
    async paste(key, text) {
      await page.evaluate(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(text)})
        ${Q.editor(key)}.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return 1 })()`)
      await sleep(200)
    },
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
          /* ---------- П2 ---------- */
          anchor: root.dataset.anchor,
          navActive: [...document.querySelectorAll('[data-slot=section-nav-item][aria-current=true]')].map(b => b.dataset.value),
          navAnchors: [...document.querySelectorAll('[data-slot=section-nav-anchor]')].map(b => t(b.textContent)),
          anchorActive: [...document.querySelectorAll('[data-slot=section-nav-anchor][aria-current=location]')].map(b => t(b.textContent)),
          /* Где стоит начало активного подраздела относительно верха окна. */
          anchorTop: (() => { const el = document.getElementById('anchor-' + root.dataset.anchor); return el ? Math.round(el.getBoundingClientRect().top) : null })(),
          navSticky: (() => { const n = document.querySelector('[data-slot=section-nav]'); return n ? Math.round(n.getBoundingClientRect().top) : null })(),
          dots: Object.fromEntries([...document.querySelectorAll('[data-slot=section-nav-item]')].filter(b => b.dataset.status !== 'none').map(b => [b.dataset.value, b.dataset.status])),
          prevDisabled: document.querySelector('[data-act=section-prev]')?.disabled ?? null,
          nextDisabled: document.querySelector('[data-act=section-next]')?.disabled ?? null,
          g: M.draft.config.settings.general,
          rows: Object.fromEntries([...document.querySelectorAll('[data-setting]')].map(r => {
            const own = sel => [...r.querySelectorAll(sel)].find(x => x.closest('[data-setting]') === r)
            const c = own('[data-slot=choice-control]')
            return [r.dataset.setting, {
              checked: c?.getAttribute('aria-checked') === 'true',
              off: !!c?.disabled,
              reason: t(own('[data-slot=setting-row-reason]')?.textContent),
              meta: t(own('[data-slot=setting-row-meta-text]')?.textContent),
              tone: own('[data-slot=setting-row-meta-text]')?.dataset.tone ?? '',
              help: !!own('[data-setting-help]'),
              children: !!own('[data-slot=setting-row-children]'),
            }]
          })),
          steppers: Object.fromEntries([...document.querySelectorAll('[data-field]')].filter(x => x.querySelector('[data-slot=stepper-value]')).map(x => [x.dataset.field, Number(t(x.querySelector('[data-slot=stepper-value]').textContent))])),
          chips: Object.fromEntries([...document.querySelectorAll('[data-field]')].filter(x => x.matches('[data-field]') && x.querySelector('[data-multiple]')).map(x => [x.dataset.field, [...x.querySelectorAll('[data-slot=select-chip]')].map(c => t(c.textContent))])),
          formulas: Object.fromEntries([...document.querySelectorAll('[data-formula]')].map(x => [x.dataset.formula, {
            chips: [...x.querySelectorAll('[data-slot=formula-chip]')].map(c => t(c.querySelector('[data-slot=formula-chip-label]').textContent) + (c.hasAttribute('data-invalid') ? ' !' : '')),
            preview: t(x.querySelector('[data-slot=formula-preview-value]')?.textContent),
          }])),
          /* Курсор в поле формулы: сколько чипов и знаков текста слева от него. */
          caret: (() => {
            const sel = getSelection(); const ed = document.activeElement?.closest?.('[data-slot=formula-editor]')
            if (!ed || !sel.rangeCount) return null
            const r = document.createRange(); r.selectNodeContents(ed); r.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset)
            const frag = r.cloneContents()
            const chips = frag.querySelectorAll('[data-slot=formula-chip]').length
            frag.querySelectorAll('[data-slot=formula-chip]').forEach(c => c.remove())
            return { chips, text: frag.textContent.length }
          })(),
          /* ---------- П3 ---------- */
          s: M.draft.config.settings,
          reasons: [...document.querySelectorAll('[data-reason]')].map(c => t(c.querySelector('[data-slot=chip-label]').textContent)),
          reasonsRemovable: [...document.querySelectorAll('[data-reason] [data-slot=chip-remove]')].length,
          reasonForm: !!document.querySelector('[data-reason-form]'),
          reasonAddOff: document.querySelector('[data-act=reason-add]')?.disabled ?? null,
          callouts: Object.fromEntries([...document.querySelectorAll('[data-reason-callout]')].map(c => [c.dataset.reasonCallout, t(c.textContent)])),
          banner: t(document.querySelector('[data-ai-banner]')?.textContent) || null,
          fieldsOff: [...document.querySelectorAll('[data-field]')].filter(x => x.querySelector('[data-multiple][data-disabled], button[data-slot=field]:disabled, input:disabled')).map(x => x.dataset.field),
          groupRows: [...document.querySelectorAll('[data-group]')].map(r => t(r.querySelector('[data-slot=table-cell-identity]').textContent)),
          groupsChecked: [...document.querySelectorAll('[data-group]')].filter(r => r.querySelector('[data-slot=choice-control]').getAttribute('aria-checked') === 'true').length,
          groupsCount: t(document.querySelector('[data-groups-count]')?.textContent) || null,
          groupsRange: t(document.querySelector('[data-groups-table] [data-slot=table-range]')?.textContent) || null,
          groupsAll: document.querySelector('[data-groups-all] [data-slot=choice-control], [data-groups-all][data-slot=choice-control]')?.getAttribute('aria-checked') ?? null,
          groupsEmpty: !!document.querySelector('[data-groups-table] [data-slot=table-empty-search]'),
          costs: Object.fromEntries([...document.querySelectorAll('[data-cost]')].map(x => [x.dataset.cost, (x.matches('input') ? x : x.querySelector('input')).value])),
          costsOff: [...document.querySelectorAll('[data-cost]')].filter(x => (x.matches('input') ? x : x.querySelector('input')).disabled).length,
          resetOff: document.querySelector('[data-act=costs-reset]')?.disabled ?? null,
          linkTarget: document.querySelector('[data-link=region-matrices]')?.getAttribute('target') ?? null,
          detSets: Object.fromEntries([...document.querySelectorAll('[data-detector-set]')].map(x => [x.dataset.detectorSet, x.querySelector('[data-slot=choice-control]').getAttribute('aria-checked')])),
          detAll: t(document.querySelector('[data-detector-set=all] [data-slot=choice-title]')?.textContent) || null,
          templates: [...document.querySelectorAll('[data-template]')].map(r => ({
            title: t(r.querySelector('[data-slot=table-cell-identity]').textContent), main: !!r.querySelector('[data-template-main]'),
            program: t(r.querySelectorAll('[data-slot=table-cell]')[1].textContent), access: t(r.querySelectorAll('[data-slot=table-cell]')[2].textContent),
          })),
          focusInSide: !!document.activeElement?.closest?.('[data-side]'),
          atMark: window.__markY == null ? null : Math.abs(window.scrollY - window.__markY) <= 1 && window.__markY > 300,
          surface: root.dataset.surface,
          sideTitle: t(document.querySelector('[data-side] [data-slot=modal-card-title]')?.textContent) || null,
          sideDict: t(document.querySelector('[data-field=sideDict] [data-slot=field-input]')?.textContent) || null,
          sideComments: document.querySelectorAll('[data-side-comments] [data-slot=chip]').length,
          commentDict: t(document.querySelector('[data-act=open-comments]')?.textContent) || null,
          focusAct: document.activeElement?.dataset?.act ?? null,
        })
      })()`)
      return JSON.parse(s)
    },
  }
}

/* ------------------------------ сценарии ------------------------------ */
/**
 * Сценарии П1–П3 — `docs/scheme-edit.md`, 6.1. Шаг — [название, действие, ожидание из спеки, опции].
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
    ['прокрутить «Настройки» на 120', K => K.scrollBy(120), { tab: 'settings', scrollY: 120 }],
    ['таб «Форма»', K => K.tab('form'), { tab: 'form', tabActive: ['form'], section: 'general', scrollY: 0, pending: '«Форма» — порция П6' }],
    ['таб «Процессы и шаги»', K => K.tab('processes'), { tab: 'processes', tabActive: ['processes'], pending: '«Процессы и шаги» — порция П7' }],
    ['таб «Витрина»', K => K.tab('showcase'), { tab: 'showcase', tabActive: ['showcase'], pending: '«Витрина» — порция П8', scrollY: 0 }],
    ['назад в «Настройки»', K => K.tab('settings'), { tab: 'settings', tabActive: ['settings'], section: 'general', scrollY: 120, save: 'saved', writes: 0 }],
  ]],
  /* ============================ П2, такт 62 ============================ */
  'СС-14': ['навигатор: клик по разделу и якорю; у активного раскрыты якоря; активный якорь следует за прокруткой (r2 §3)', [
    ['старт', null, { section: 'general', navActive: ['general'], anchor: 'main', anchorActive: ['Основное'],
      navAnchors: ['Основное', 'Поведение процесса', 'Формулы и служебное', 'Словари', 'Дедлайны и доступ к осмотру', 'Экран подтверждения'] }],
    ['якорь «Формулы и служебное»', K => K.anchor('formulas'), { anchor: 'formulas', anchorActive: ['Формулы и служебное'], anchorTop: 24, section: 'general', writes: 0 }],
    ['прокрутка колесом до «Словарей» — якорь следует', K => K.wheelTo('dictionaries'), { anchor: 'dictionaries', anchorActive: ['Словари'], navSticky: 24 }],
    ['прокрутка колесом назад к «Поведению процесса»', K => K.wheelTo('behavior'), { anchor: 'behavior', anchorActive: ['Поведение процесса'], navSticky: 24 }],
    ['раздел «Права доступа»', K => K.section('access'), { section: 'access', navActive: ['access'], navAnchors: ['Выполнение осмотра', 'Создание и проверка осмотров', 'Группы доступа'], anchor: 'execution', anchorActive: ['Выполнение осмотра'] }],
    ['якорь «Группы доступа»', K => K.anchor('groups'), { anchor: 'groups', anchorActive: ['Группы доступа'], anchorTop: 24 }],
    ['раздел «Аномалии» — якорей нет', K => K.section('anomalies'), { section: 'anomalies', navAnchors: [], anchor: '' }],
    ['раздел «Общие»', K => K.section('general'), { section: 'general', navActive: ['general'], anchor: 'main', anchorActive: ['Основное'], save: 'saved', writes: 0 }],
  ]],
  'СС-15': ['навигатор: статус-точки разделов по единой системе индикаторов (r2 §4; аудит, «Единая система статус-индикаторов»)', [
    ['старт: включённые разделы — точка «включено»', null, { dots: { web: 'on', anomalies: 'on', pdf: 'on' } }],
    ['согласование включено, поля отмечены — точки у «Общих» нет', async (K) => { await K.toggle('approval'); await K.settled() },
      { dots: { web: 'on', anomalies: 'on', pdf: 'on' }, 'g.behavior.approval': true }],
  ]],
  'СС-16': ['«Назад / Далее»: соседний раздел; на первом выключена «Назад», на последнем — «Далее» (r2 §3)', [
    ['старт: первый раздел', null, { section: 'general', prevDisabled: true, nextDisabled: false }],
    ['«Далее»', K => K.act('section-next'), { section: 'mobile', navActive: ['mobile'], prevDisabled: false, nextDisabled: false, anchor: 'shooting', navAnchors: ['Параметры съёмки', 'Поведение в мобильном приложении'] }],
    ['«Далее» до последнего', async (K) => { for (let k = 0; k < 5; k++) await K.act('section-next') }, { section: 'pdf', navActive: ['pdf'], prevDisabled: false, nextDisabled: true }],
    ['«Назад»', K => K.act('section-prev'), { section: 'anomalies', prevDisabled: false, nextDisabled: false, writes: 0 }],
  ]],
  'СС-17': ['дерево решений: параметры родителя доступны при включённом родителе (аудит, «Механизм разбора стены чекбоксов»)', [
    ['старт: родитель включён — параметр виден', null, { 'rows.lockOnReview.checked': true, 'rows.lockOnReview.children': true, 'steppers.unlockMinutes': 60 }],
    ['выключить «Блокировать осмотр при проверке»', async (K) => { await K.toggle('lockOnReview'); await K.settled() },
      { 'rows.lockOnReview.checked': false, 'rows.lockOnReview.children': false, steppers: {}, 'g.behavior.lockOnReview': false, saveLog: ['saving', 'saved'], writes: 1 }],
    ['включить обратно — параметр на месте с прежним значением', async (K) => { await K.toggle('lockOnReview'); await K.settled() },
      { 'rows.lockOnReview.children': true, 'steppers.unlockMinutes': 60, 'g.behavior.lockOnReview': true, writes: 2 }],
  ]],
  'СС-18': ['«гасит»: зависимая настройка выключена с причиной (r2 §4; аудит, «Паттерны кросс-таб зависимостей»)', [
    ['старт: параметр отказа выключен с причиной', null,
      { 'rows.refuseRepeatable.off': true, 'rows.refuseRepeatable.reason': 'Сначала разрешите отказ с отметкой «Осмотр невозможен»', 'rows.quickAccept.off': false, 'rows.quickAccept.reason': '' }],
    ['нажатие по выключенному — значение прежнее', K => K.toggle('refuseRepeatable'), { 'g.behavior.refuseRepeatable': false, writes: 0, saveLog: [] }, { blind: true }],
    ['разрешить отказ — причина снята', async (K) => { await K.toggle('refuse'); await K.settled() },
      { 'rows.refuseRepeatable.off': false, 'rows.refuseRepeatable.reason': '', 'g.behavior.refuse': true, writes: 1 }],
    ['параметр отказа включается', async (K) => { await K.toggle('refuseRepeatable'); await K.settled() }, { 'g.behavior.refuseRepeatable': true, writes: 2 }],
    ['назначение «Типовая» гасит приём одной кнопкой', async (K) => { await K.radio('purpose', 'Типовая'); await K.settled() },
      { 'g.purpose': 'typical', 'rows.quickAccept.off': true, 'rows.quickAccept.reason': 'Доступно только для стандартной схемы', writes: 3 }],
    ['назначение «Стандартная» — доступно', async (K) => { await K.radio('purpose', 'Стандартная'); await K.settled() },
      { 'g.purpose': 'standard', 'rows.quickAccept.off': false, 'rows.quickAccept.reason': '' }],
  ]],
  'СС-19': ['«вооружает»: «Согласование» — счётчик «Отмечено N полей», «Перейти к полям» ведёт в «Форму» (r2 §4; аудит, «Паттерны кросс-таб зависимостей»)', [
    ['старт: согласование выключено — счётчика нет', null, { 'rows.approval.checked': false, 'rows.approval.meta': '', 'rows.approval.help': true }],
    ['включить согласование — счётчик полей', async (K) => { await K.toggle('approval'); await K.settled() },
      { 'rows.approval.meta': 'Отмечено 2 поля на согласование', 'rows.approval.tone': 'default', 'g.behavior.approval': true, writes: 1 }],
    ['«Перейти к полям»', async (K) => { await K.mark(); await K.act('go-fields') }, { tab: 'form', tabActive: ['form'], pending: '«Форма» — порция П6', writes: 1, scrollY: 0 }],
    ['назад в «Настройки» — на прежнем месте', K => K.tab('settings'), { tab: 'settings', section: 'general', atMark: true, 'rows.approval.meta': 'Отмечено 2 поля на согласование' }],
  ]],
  'СС-19/ноль': ['«вооружает» при нуле: предупреждение и точка «требует внимания» у раздела (аудит, «Паттерны кросс-таб зависимостей», «Единая система статус-индикаторов»)', [
    ['старт: новая схема, полей нет', null, { 'rows.approval.meta': '', dots: { web: 'off', anomalies: 'off', pdf: 'off' }, publish: 'never' }],
    ['включить согласование — предупреждение', async (K) => { await K.toggle('approval'); await K.settled() },
      { 'rows.approval.meta': 'Отмечено 0 полей на согласование — согласование не сработает, пока поля не отмечены', 'rows.approval.tone': 'warning',
        dots: { general: 'attention', web: 'off', anomalies: 'off', pdf: 'off' } }],
    ['выключить — предупреждение снято', async (K) => { await K.toggle('approval'); await K.settled() }, { 'rows.approval.meta': '', dots: { web: 'off', anomalies: 'off', pdf: 'off' } }],
  ], { query: 'data=new' }],
  'СС-21': ['«Поведение процесса»: число минут разблокировки доступно при включённом родителе (r2 §4)', [
    ['старт', null, { 'steppers.unlockMinutes': 60, 'g.behavior.unlockMinutes': 60 }],
    ['плюс — 65 минут', async (K) => { await K.stepper('unlockMinutes', 'Увеличить'); await K.settled() }, { 'steppers.unlockMinutes': 65, 'g.behavior.unlockMinutes': 65, saveLog: ['saving', 'saved'], writes: 1 }],
    ['минус дважды — 55 минут', async (K) => { await K.stepper('unlockMinutes', 'Уменьшить'); await K.stepper('unlockMinutes', 'Уменьшить'); await K.settled() }, { 'steppers.unlockMinutes': 55, 'g.behavior.unlockMinutes': 55 }],
    ['родитель выключен — поля минут нет, значение в черновике цело', async (K) => { await K.toggle('lockOnReview'); await K.settled() }, { steppers: {}, 'g.behavior.unlockMinutes': 55 }],
  ]],
  'СС-22': ['формулы: добавить и убрать чип-переменную, превью результата пересчитывается (r2 §4)', [
    ['старт: четыре формулы', null, {
      'formulas.objectName': { chips: ['VIN'], preview: 'DEMO0000000001024' },
      'formulas.schemeName': { chips: ['Тип схемы'], preview: 'Осмотр транспорта' },
      'formulas.zipName': { chips: ['VIN'], preview: 'DEMO0000000001024' },
      'formulas.mailSubject': { chips: ['Номер осмотра', 'VIN'], preview: 'Осмотр № 1024 — DEMO0000000001024' },
    }],
    ['«Переменная» → «Госномер» в имя архива', async (K) => { await K.formulaEnd('zipName'); await K.addVariable('zipName', 'Car:regnum'); await K.settled() },
      { 'g.formulas.zipName': '{Car:vin}{Car:regnum}', 'formulas.zipName': { chips: ['VIN', 'Госномер'], preview: 'DEMO0000000001024А000АА00' }, saveLog: ['saving', 'saved'], writes: 1 }],
    ['убрать чип «VIN» крестиком', async (K) => { await K.removeVariable('zipName', 'Car:vin'); await K.settled() },
      { 'g.formulas.zipName': '{Car:regnum}', 'formulas.zipName': { chips: ['Госномер'], preview: 'А000АА00' }, writes: 2 }],
    ['текст перед переменной — набором', async (K) => { await K.formulaEnd('zipName'); await K.key('Home'); await K.type('Архив '); await K.settled() },
      { 'g.formulas.zipName': 'Архив {Car:regnum}', 'formulas.zipName': { chips: ['Госномер'], preview: 'Архив А000АА00' } }],
  ]],
  'СС-61': ['формула с клавиатуры: стрелки проходят чип целиком, Backspace и Delete стирают чип целиком (решение владельца 2026-10-03, карточка 7; аудит, «Фидбек заказчика» — атомарные переменные)', [
    ['курсор в конец темы письма', K => K.formulaEnd('mailSubject'), { caret: { chips: 2, text: 10 }, 'g.formulas.mailSubject': 'Осмотр {Inspection:number} — {Car:vin}' }],
    ['← проходит чип «VIN» целиком', K => K.key('ArrowLeft'), { caret: { chips: 1, text: 10 } }],
    ['→ возвращает за чип', K => K.key('ArrowRight'), { caret: { chips: 2, text: 10 } }],
    ['Backspace стирает чип «VIN» целиком', async (K) => { await K.key('Backspace'); await K.settled() },
      { 'g.formulas.mailSubject': 'Осмотр {Inspection:number} — ', 'formulas.mailSubject': { chips: ['Номер осмотра'], preview: 'Осмотр № 1024 —' }, caret: { chips: 1, text: 10 }, saveLog: ['saving', 'saved'], writes: 1 }],
    ['Backspace по тексту стирает по знаку', async (K) => { await K.key('Backspace'); await K.key('Backspace'); await K.key('Backspace'); await K.settled() },
      { 'g.formulas.mailSubject': 'Осмотр {Inspection:number}', caret: { chips: 1, text: 7 } }],
    ['← к началу чипа и Delete — чип «Номер осмотра» стёрт', async (K) => { await K.key('ArrowLeft'); await K.key('Delete'); await K.settled() },
      { 'g.formulas.mailSubject': 'Осмотр ', 'formulas.mailSubject': { chips: [], preview: 'Осмотр' }, caret: { chips: 0, text: 7 } }],
    ['Enter строку не переносит', async (K) => { await K.key('Enter'); await K.type('без даты'); await K.settled() }, { 'g.formulas.mailSubject': 'Осмотр без даты' }],
  ]],
  'СС-62': ['формула: вставка текста с {Группа:ключ} превращается в чипы; неизвестная переменная — чип в состоянии ошибки (решение владельца 2026-10-03, карточка 7)', [
    ['вставка из буфера в конец наименования объекта', async (K) => { await K.formulaEnd('objectName'); await K.paste('objectName', ' {Car:regnum} и {Car:color}'); await K.settled() },
      { 'g.formulas.objectName': '{Car:vin} {Car:regnum} и {Car:color}', 'formulas.objectName': { chips: ['VIN', 'Госномер', 'Car:color !'], preview: 'DEMO0000000001024 А000АА00 и {Car:color}' },
        caret: { chips: 3, text: 4 }, saveLog: ['saving', 'saved'], writes: 1 }],
    ['Backspace стирает неизвестную переменную целиком', async (K) => { await K.key('Backspace'); await K.settled() },
      { 'g.formulas.objectName': '{Car:vin} {Car:regnum} и ', 'formulas.objectName': { chips: ['VIN', 'Госномер'], preview: 'DEMO0000000001024 А000АА00 и' } }],
    ['набор {Lead:policy_number} руками — чип «Номер полиса»', async (K) => { await K.type('{Lead:policy_number}'); await K.settled() },
      { 'g.formulas.objectName': '{Car:vin} {Car:regnum} и {Lead:policy_number}', 'formulas.objectName': { chips: ['VIN', 'Госномер', 'Номер полиса'], preview: 'DEMO0000000001024 А000АА00 и К-0001024' }, caret: { chips: 3, text: 4 } }],
    ['вставка многострочного текста — одной строкой', async (K) => { await K.formulaEnd('schemeName'); await K.paste('schemeName', '\n— {Scheme:type}'); await K.settled() },
      { 'g.formulas.schemeName': '{Scheme:type} — {Scheme:type}', 'formulas.schemeName': { chips: ['Тип схемы', 'Тип схемы'], preview: 'Осмотр транспорта — Осмотр транспорта' } }],
  ]],
  'СС-23': ['словари: выбор словаря статусов и словаря комментариев (r2 §4)', [
    ['старт', null, { 'g.dictionaries': { statuses: 'standard', comments: 'vehicle' }, commentDict: 'Комментарии к осмотру транспорта Комментариев: 4' }],
    ['словарь статусов — «Сокращённый словарь статусов»', async (K) => { await K.select('statusDict', 'Сокращённый словарь статусов'); await K.settled() },
      { 'g.dictionaries.statuses': 'short', saveLog: ['saving', 'saved'], writes: 1 }],
    ['словарь комментариев открывает сайд', K => K.act('open-comments'), { surface: 'comments', sideTitle: 'Словарь комментариев', sideDict: 'Комментарии к осмотру транспорта', sideComments: 4, writes: 1 }],
  ]],
  'СС-24': ['дедлайны: режим, число, событие отсчёта; роли чипами; кто делится осмотром (r2 §4)', [
    ['старт', null, { 'g.deadlines.mode': 'none', steppers: { unlockMinutes: 60 }, chips: { deadlineEditors: ['Администратор'], manualCoordinate: ['Администратор'] } }],
    ['режим «Установить через N часов» — поле часов', async (K) => { await K.radio('deadlineMode', 'Установить через N часов'); await K.settled() },
      { 'g.deadlines.mode': 'hours', 'steppers.deadlineHours': 48, writes: 1 }],
    ['плюс час', async (K) => { await K.stepper('deadlineHours', 'Увеличить'); await K.settled() }, { 'g.deadlines.hours': 49, 'steppers.deadlineHours': 49 }],
    ['режим «Установить через N дней» — поле дней', async (K) => { await K.radio('deadlineMode', 'Установить через N дней'); await K.settled() },
      { 'g.deadlines.mode': 'days', 'steppers.deadlineDays': 4, 'g.deadlines.hours': 49 }],
    ['событие отсчёта — «От создания осмотра»', async (K) => { await K.select('deadlineFrom', 'От создания осмотра'); await K.settled() }, { 'g.deadlines.from': 'created' }],
    ['роли дедлайна: добавить «Эксперт» и «Оператор»', async (K) => { await K.pick('deadlineEditors', 'Эксперт', 'Оператор'); await K.settled() },
      { 'g.deadlines.editors': ['admin', 'expert', 'operator'], 'chips.deadlineEditors': ['Администратор', 'Эксперт', 'Оператор'] }],
    ['убрать «Администратор» крестиком чипа', async (K) => { await K.unpick('deadlineEditors', 'admin'); await K.settled() },
      { 'g.deadlines.editors': ['expert', 'operator'], 'chips.deadlineEditors': ['Эксперт', 'Оператор'], 'chips.manualCoordinate': ['Администратор'] }],
    ['повторный выбор в списке снимает роль', async (K) => { await K.pick('deadlineEditors', 'Оператор'); await K.settled() }, { 'g.deadlines.editors': ['expert'] }],
    ['делиться осмотром — «Только исполнитель»', async (K) => { await K.radio('share', 'Только исполнитель'); await K.settled() }, { 'g.deadlines.share': 'executor' }],
  ]],
  /* ============================ П3, такт 63 ============================ */
  'СС-25': ['мобильное приложение: режим выполнения, разрешения, телефон; три настройки поведения (r2 §4)', [
    ['старт', null, { section: 'mobile', anchor: 'shooting', navAnchors: ['Параметры съёмки', 'Поведение в мобильном приложении'], 's.mobile.mode': 'regular', 's.mobile.photo': 'medium', 'rows.startAfterCreate.checked': true }],
    ['режим «Чек-лист»', async (K) => { await K.radio('mobileMode', 'Чек-лист Пошаговое выполнение с отметкой о завершении каждого пункта'); await K.settled() }, { 's.mobile.mode': 'checklist', saveLog: ['saving', 'saved'], writes: 1 }],
    ['разрешение фото и видео', async (K) => { await K.select('photo', 'Высокое — 5 Мп'); await K.select('video', 'Среднее — HD'); await K.settled() }, { 's.mobile.photo': 'high', 's.mobile.video': 'hd' }],
    ['телефон и его название', async (K) => { await K.typeInto('phone', '+7 900 000 00 00'); await K.typeInto('phoneName', 'Служба поддержки'); await K.settled() },
      { 's.mobile.phone': '+7 900 000 00 00', 's.mobile.phoneName': 'Служба поддержки', save: 'saved' }],
    ['запрос подтверждения звонка', async (K) => { await K.typeInto('callConfirm', 'Позвонить в поддержку?'); await K.settled() }, { 's.mobile.callConfirm': 'Позвонить в поддержку?' }],
    ['поведение: три настройки', async (K) => { await K.toggle('startAfterCreate'); await K.toggle('hideHints'); await K.toggle('skipConfirm'); await K.settled() },
      { 's.mobile.startAfterCreate': false, 's.mobile.hideHints': false, 's.mobile.skipConfirm': true, save: 'saved' }],
  ], { query: 'section=mobile' }],
  'СС-26': ['веб-приложение: рубильник блока гасит варианты и запреты; добавление обоснования «ключ — название», удаление с отменой (r2 §4)', [
    ['старт', null, { section: 'web', reasons: ['Координаты — geo', 'Фото с экрана — screen-photo'], reasonsRemovable: 2, reasonForm: false, reasonAddOff: false, 'rows.blockRepeat.off': false, callouts: {}, 'dots.web': 'on' }],
    ['«Добавить вариант» — форма с пустыми полями', K => K.act('reason-add'), { reasonForm: true, writes: 0 }],
    ['«Создать обоснование» с пустыми полями — отказ', K => K.act('reason-create'), { notices: ['Заполните ключ и название обоснования'], reasonForm: true, reasons: ['Координаты — geo', 'Фото с экрана — screen-photo'], writes: 0 }],
    ['ключ «blur», название «Размытое фото» — создано', async (K) => { await K.typeInto('reasonKey', 'blur'); await K.typeInto('reasonTitle', 'Размытое фото'); await K.act('reason-create'); await K.settled() },
      { reasons: ['Координаты — geo', 'Фото с экрана — screen-photo', 'Размытое фото — blur'], reasonForm: false, saveLog: ['saving', 'saved'], writes: 1 }],
    ['повтор ключа «geo» — отказ', async (K) => { await K.act('reason-add'); await K.typeInto('reasonKey', 'geo'); await K.typeInto('reasonTitle', 'Геометка'); await K.act('reason-create') },
      { notices: ['Обоснование с ключом «geo» уже есть'], reasonForm: true, writes: 1 }],
    ['«Отменить» закрывает форму', K => K.act('reason-cancel'), { reasonForm: false, writes: 1 }],
    ['удалить «Координаты» крестиком — уведомление с отменой', async (K) => { await K.removeReason('geo'); await K.settled() },
      { reasons: ['Фото с экрана — screen-photo', 'Размытое фото — blur'], notices: ['Обоснование «Координаты» удалено'], writes: 2 }],
    ['«Отменить» в уведомлении — вариант на месте', async (K) => { await K.undo(); await K.settled() }, { reasons: ['Координаты — geo', 'Фото с экрана — screen-photo', 'Размытое фото — blur'], writes: 3 }],
    ['выключить блок — варианты и запреты погашены с причиной', async (K) => { await K.toggle('feedback'); await K.settled() },
      { 's.web.feedback': false, reasonsRemovable: 0, reasonAddOff: true, 'rows.blockRepeat.off': true, 'rows.blockRefuse.off': true, 'rows.blockContract.off': true,
        callouts: { feedback: 'Включите блок обратной связи на странице экспертизы' }, 'dots.web': 'off' }],
    ['включить блок и поставить запрет перехода в «Отказ»', async (K) => { await K.toggle('feedback'); await K.toggle('blockRefuse'); await K.settled() },
      { 's.web.feedback': true, 's.web.blockRefuse': true, 'rows.blockRefuse.off': false, callouts: {}, reasonsRemovable: 3 }],
  ], { query: 'section=web' }],
  'СС-27': ['права доступа: роли чипами, режим управления созданием (r2 §4)', [
    ['старт', null, { section: 'access', anchor: 'execution', 'chips.executors': ['Создатель осмотра', 'Администратор', 'Эксперт', 'Оператор осмотров', 'Агент', 'Клиент'], 's.access.manage': 'all', 's.access.createMode': 'groups', fieldsOff: [] }],
    ['убрать роль «Клиент» крестиком', async (K) => { await K.unpick('executors', 'client'); await K.settled() }, { 's.access.executors': ['creator', 'admin', 'expert', 'operator', 'agent'], saveLog: ['saving', 'saved'], writes: 1 }],
    ['управление выполнением — «Эксперт и выше»', async (K) => { await K.radio('manage', 'Эксперт и выше'); await K.settled() }, { 's.access.manage': 'expert' }],
    ['«Открытое создание» — поле ролей выключено', async (K) => { await K.radio('createMode', 'Открытое создание Создавать может любой пользователь с доступом к схеме, роль не проверяется'); await K.settled() },
      { 's.access.createMode': 'open', fieldsOff: ['createRoles'] }],
    ['«Только по роли» — поле ролей доступно, добавить «Эксперт»', async (K) => { await K.radio('createMode', 'Только по роли Достаточно подходящей роли без проверки групп'); await K.pick('createRoles', 'Эксперт'); await K.settled() },
      { 's.access.createMode': 'role', 's.access.createRoles': ['admin', 'operator', 'agent', 'expert'], fieldsOff: [], 'chips.createRoles': ['Администратор', 'Оператор осмотров', 'Агент', 'Эксперт'] }],
  ], { query: 'section=access' }],
  'СС-28': ['группы доступа: поиск, выбор строк, пагинация; счётчик строк согласован с пагинацией (r2 §4; figma-nodes.md, «Права доступа»)', [
    ['старт', null, { groupsCount: 'Выбрано 2', groupsRange: '1 – 10 из 23', groupsChecked: 2, groupsAll: 'mixed', groupsEmpty: false,
      groupRows: ['Осмотр Юг', 'Служба проверок', 'Региональные операторы', 'Осмотр Восток', 'Служба контроля', 'Региональный контроль', 'Осмотр Север', 'Служба осмотров', 'Контроль Запад', 'Контроль Центр'] }],
    ['отметить «Региональные операторы»', async (K) => { await K.groupCheck('grp-03'); await K.settled() }, { 's.access.groups': ['grp-01', 'grp-02', 'grp-03'], groupsCount: 'Выбрано 3', groupsChecked: 3, saveLog: ['saving', 'saved'], writes: 1 }],
    ['страница 2', K => K.groupsPage(2), { groupsRange: '11 – 20 из 23', groupsChecked: 0, groupsAll: 'false', 'groupRows.0': 'Осмотр Урал', writes: 1 }],
    ['флажок шапки — все строки страницы', async (K) => { await K.groupsAll(); await K.settled() }, { groupsCount: 'Выбрано 13', groupsChecked: 10, groupsAll: 'true', writes: 2 }],
    ['поиск «контроль» — по названию без учёта регистра', K => K.typeInto('groupQuery', 'контроль'), { groupsRange: '1 – 4 из 4', groupRows: ['Региональный контроль', 'Контроль Запад', 'Контроль Центр', 'Контроль качества'], writes: 2 }],
    ['поиск по компании — «образец»', K => K.fill('[data-field=groupQuery]', 'образец'), { groupsRange: '1 – 6 из 6', 'groupRows.0': 'Региональные операторы' }],
    ['поиск без совпадений — пустой результат, подвала нет', K => K.fill('[data-field=groupQuery]', 'нет такой группы'), { groupRows: [], groupsEmpty: true, groupsRange: null }],
    ['сброс поиска', K => K.groupsReset(), { groupsEmpty: false, groupsRange: '1 – 10 из 23' }],
    ['фильтр «Только выбранные»', K => K.select('groupFilter', 'Только выбранные'), { groupsRange: '1 – 10 из 13', groupsChecked: 10, groupsAll: 'true' }],
  ], { query: 'section=access' }],
  'СС-29': ['ИИ-анализ: алиасы полей, стоимость классов, «Сбросить к значениям по умолчанию», матрица регионов со ссылкой в новой вкладке (r2 §1, §4; аудит, «Раздел „ИИ-анализ стоимости“»)', [
    ['старт: схема недвижимости', null, { section: 'ai', banner: 'Доступные ИИ-модули зависят от типа объекта схемы Текущий тип: Осмотр недвижимости', costsOff: 0, resetOff: false,
      'costs.A1': '15000', 'costs.D1': '200000', linkTarget: '_blank', navAnchors: ['Анализ стоимости отделки', 'Стоимость классов отделки', 'Матрица регионов'] }],
    ['алиас общей площади', async (K) => { await K.fill('[data-field=aliasTotal]', 'common:area'); await K.settled() }, { 's.ai.aliasTotal': 'common:area', saveLog: ['saving', 'saved'] }],
    ['стоимость класса B0 — «7 500 руб»: остаются цифры', async (K) => { await K.fill('[data-cost=B0]', '7 500 руб'); await K.settled() }, { 's.ai.costs.B0': 7500, 'costs.B0': '7500' }],
    ['«Сбросить к значениям по умолчанию»', async (K) => { await K.act('costs-reset'); await K.settled() }, { 's.ai.costs.B0': 5000, 'costs.B0': '5000', notices: ['Стоимость классов сброшена к значениям по умолчанию'] }],
    ['«Отменить» возвращает стоимость', async (K) => { await K.undo(); await K.settled() }, { 's.ai.costs.B0': 7500, 'costs.B0': '7500' }],
    ['матрица регионов — «Корректировки: южные регионы»', async (K) => { await K.select('regionMatrix', 'Корректировки: южные регионы'); await K.settled() }, { 's.ai.regionMatrix': 'south', linkTarget: '_blank' }],
  ], { query: 'section=ai&type=house' }],
  'СС-30': ['ИИ-анализ: модули, недоступные для типа объекта, выключены с причиной (r2 §4; аудит, «Раздел „ИИ-анализ стоимости“»)', [
    ['старт: схема транспорта — анализ отделки погашен', null, { banner: 'Доступные ИИ-модули зависят от типа объекта схемы Текущий тип: Осмотр транспорта',
      callouts: { finish: "Анализ стоимости доступен только для схем недвижимости. Тип схемы задаётся в разделе «Общие → Основное»" }, costsOff: 8, resetOff: true, fieldsOff: ['aliasTotal', 'aliasRoom', 'regionMatrix'], 'rows.damage.off': false }],
    ['модуль для авто включается', async (K) => { await K.toggle('damageCost'); await K.settled() }, { 's.ai.damageCost': true, writes: 1 }],
    ['тип схемы «Осмотр недвижимости» в «Общих» — доступность переворачивается', async (K) => { await K.section('general'); await K.select('schemeType', 'Осмотр недвижимости'); await K.settled(); await K.section('ai') },
      { 'g.schemeType': 'house', callouts: { auto: "Модули доступны только для схем с типом «Осмотр транспорта». Тип схемы задаётся в разделе «Общие → Основное»" }, costsOff: 0, resetOff: false, fieldsOff: [], 'rows.damage.off': true, 'rows.vinRecognition.off': true, 'rows.damageCost.off': true }],
    ['нажатие по выключенному модулю — значение прежнее', K => K.toggle('damage'), { 's.ai.damage': true, saveLog: [] }, { blind: true }],
  ], { query: 'section=ai' }],
  'СС-31': ['аномалии: рубильник блока, «N из 14 включено», включить и снять группу, роль по умолчанию и её переопределение у детектора (r2 §4; аудит, «Раздел „Аномалии“»)', [
    ['старт', null, { section: 'anomalies', detAll: '4 из 14 включено', detSets: { all: 'mixed', geo: 'mixed', device: 'false', quality: 'mixed' },
      'rows.det-spoof.meta': 'роль: Эксперт и выше — по умолчанию', 'rows.det-spoof.help': true, 'dots.anomalies': 'on' }],
    ['включить группу «Целостность устройства»', async (K) => { await K.detectorSet('device'); await K.settled() }, { detAll: '7 из 14 включено', 'detSets.device': 'true', saveLog: ['saving', 'saved'], writes: 1 }],
    ['группа «Геолокация и трек»: из части — все', async (K) => { await K.detectorSet('geo'); await K.settled() }, { detAll: '10 из 14 включено', 'detSets.geo': 'true' }],
    ['группа «Геолокация и трек»: из всех — снять', async (K) => { await K.detectorSet('geo'); await K.settled() }, { detAll: '5 из 14 включено', 'detSets.geo': 'false', 's.anomalies.detectors.spoof.on': false }],
    ['детектор «Плохая освещённость»', async (K) => { await K.toggle('det-light'); await K.settled() }, { detAll: '6 из 14 включено', 's.anomalies.detectors.light.on': true }],
    ['роль по умолчанию — «Только администратор»', async (K) => { await K.select('defaultRole', 'Только администратор'); await K.settled() },
      { 's.anomalies.defaultRole': 'admin', 'rows.det-blur.meta': 'роль: Только администратор — по умолчанию' }],
    ['«Переопределить роль» у «Размытых изображений» и выбрать «Эксперт и выше»', async (K) => { await K.act('det-override-blur'); await K.select('detRole-blur', 'Эксперт и выше'); await K.settled() },
      { 's.anomalies.detectors.blur.role': 'expert', 'rows.det-blur.meta': 'роль: Эксперт и выше — задана у детектора', 'rows.det-light.meta': 'роль: Только администратор — по умолчанию' }],
    ['«Вернуть роль по умолчанию»', async (K) => { await K.act('det-inherit-blur'); await K.settled() }, { 's.anomalies.detectors.blur.role': '', 'rows.det-blur.meta': 'роль: Только администратор — по умолчанию' }],
    ['рубильник блока выключен — детекторы погашены с причиной', async (K) => { await K.toggle('anomaliesEnabled'); await K.settled() },
      { 's.anomalies.enabled': false, callouts: { anomalies: 'Включите отображение блока аномалий' }, 'rows.det-blur.off': true, 'rows.det-otherRefusals.off': true, fieldsOff: ['defaultRole'], 'dots.anomalies': 'off' }],
    ['включить блок, «включить все» и «снять все»', async (K) => { await K.toggle('anomaliesEnabled'); await K.detectorSet('all'); await K.settled() }, { detAll: '14 из 14 включено', 'detSets.all': 'true', 'dots.anomalies': 'on' }],
    ['«снять все»', async (K) => { await K.detectorSet('all'); await K.settled() }, { detAll: '0 из 14 включено', detSets: { all: 'false', geo: 'false', device: 'false', quality: 'false' } }],
  ], { query: 'section=anomalies' }],
  'СС-32': ['PDF: шаблон добавляется в сайде, меняется, удаляется с отменой (r2 §4, §7; аудит, «Раздел „PDF“»)', [
    ['старт', null, { section: 'pdf', templates: [{ title: 'Акт осмотра', main: true, program: 'act-vehicle-v2', access: 'Всегда, клиент и выше' }, { title: 'Технический отчёт', main: false, program: 'tech-report-v1', access: 'После успешной экспертизы, эксперт и выше' }], 'dots.pdf': 'on' }],
    ['«Добавить шаблон» открывает сайд', K => K.act('template-add'), { surface: 'template', sideTitle: 'Добавление шаблона', writes: 0 }],
    ['пустое название — отказ, сайд открыт', K => K.act('template-save'), { notices: ['Заполните отображаемое название шаблона'], surface: 'template', 's.pdf.templates.length': 2, writes: 0 }],
    ['заполнить и добавить — основной шаблон один', async (K) => { await K.typeInto('tplTitle', 'Краткая сводка'); await K.select('tplProgram', 'client-summary-v1'); await K.check('tplMain'); await K.radio('tplRole', 'Агент и выше'); await K.select('tplWhen', 'После подписания'); await K.act('template-save'); await K.settled() },
      { surface: '', saveLog: ['saving', 'saved'], writes: 1, templates: [{ title: 'Акт осмотра', main: false, program: 'act-vehicle-v2', access: 'Всегда, клиент и выше' }, { title: 'Технический отчёт', main: false, program: 'tech-report-v1', access: 'После успешной экспертизы, эксперт и выше' },
        { title: 'Краткая сводка', main: true, program: 'client-summary-v1', access: 'После подписания, агент и выше' }] }],
    ['изменить «Технический отчёт»', async (K) => { await K.templateEdit('tpl-tech'); await K.fill('[data-field=tplTitle]', 'Технический отчёт для эксперта'); await K.act('template-save'); await K.settled() },
      { surface: '', 'templates.1.title': 'Технический отчёт для эксперта', 's.pdf.templates.length': 3, writes: 2 }],
    ['удалить «Краткую сводку» из меню строки', async (K) => { await K.templateDelete('tpl-new-1'); await K.settled() }, { 's.pdf.templates.length': 2, notices: ['Шаблон «Краткая сводка» удалён'], writes: 3 }],
    ['«Отменить» возвращает шаблон', async (K) => { await K.undo(); await K.settled() }, { 's.pdf.templates.length': 3, 'templates.2.title': 'Краткая сводка', 'templates.2.main': true }],
  ], { query: 'section=pdf' }],
  'СС-33': ['PDF: подписание — родитель и параметры; формула имени файла; вложения (r2 §4; аудит, «Раздел „PDF“»)', [
    ['старт: подписание выключено — параметров нет', null, { 'rows.pdfSign.checked': false, 'rows.pdfSign.children': false, 'rows.unsignedShow.checked': true,
      'formulas.pdfFileName': { chips: ['VIN'], preview: 'Лист осмотра DEMO0000000001024' } }],
    ['включить подписание — параметры родителя', async (K) => { await K.toggle('pdfSign'); await K.settled() }, { 's.pdf.sign': true, 'rows.pdfSign.children': true, 'rows.showSigned.checked': true, 'rows.mailSigned.checked': false, writes: 1 }],
    ['кто подписывает и отправка на почту', async (K) => { await K.select('signer', 'Исполнитель осмотра'); await K.toggle('mailSigned'); await K.settled() }, { 's.pdf.signer': 'executor', 's.pdf.mailSigned': true }],
    ['PDF без подписи — на почту', async (K) => { await K.toggle('unsignedMail'); await K.settled() }, { 's.pdf.unsignedMail': true, 's.pdf.unsignedShow': true }],
    ['формула имени файла: переменная «Номер осмотра»', async (K) => { await K.formulaEnd('pdfFileName'); await K.type(' '); await K.addVariable('pdfFileName', 'Inspection:number'); await K.settled() },
      { 's.pdf.fileName': 'Лист осмотра {Car:vin} {Inspection:number}', 'formulas.pdfFileName': { chips: ['VIN', 'Номер осмотра'], preview: 'Лист осмотра DEMO0000000001024 № 1024' } }],
    ['вложения из дополнительных файлов', async (K) => { await K.toggle('attachExtra'); await K.settled() }, { 's.pdf.attachExtra': true }],
    ['выключить подписание — параметры скрыты, значения целы', async (K) => { await K.toggle('pdfSign'); await K.settled() }, { 's.pdf.sign': false, 'rows.pdfSign.children': false, 's.pdf.signer': 'executor', 's.pdf.mailSigned': true }],
  ], { query: 'section=pdf' }],
  'СС-57': ['сайд: ловушка фокуса, Esc закрывает, фокус возвращается к триггеру; «Отмена» отбрасывает правки сайда, полотно остаётся прежним (r2 §7; аудит, «Принцип: сайд = атомарная транзакция поверх автосейв-страницы», «Клавиатура и фокус»)', [
    ['сайд шаблона открыт — фокус внутри', K => K.act('template-add'), { surface: 'template', focusInSide: true }],
    ['Tab по кругу — фокус остаётся в сайде', K => K.tabs(14), { surface: 'template', focusInSide: true }],
    ['название введено, «Отмена» — шаблон не добавлен', async (K) => { await K.typeInto('tplTitle', 'Черновик шаблона'); await K.act('template-cancel') },
      { surface: '', 's.pdf.templates.length': 2, writes: 0, saveLog: [], focusAct: 'template-add' }],
    ['снова открыть — поля пустые; Esc закрывает, фокус на кнопке', async (K) => { await K.act('template-add'); await K.typeInto('tplTitle', 'Ещё черновик'); await K.key('Escape') },
      { surface: '', 's.pdf.templates.length': 2, writes: 0, focusAct: 'template-add' }],
    ['сайд словаря комментариев: Tab по кругу и Esc', async (K) => { await K.section('general'); await K.act('open-comments'); await K.tabs(8) }, { surface: 'comments', focusInSide: true }],
    ['Esc — сайд словаря закрыт, фокус на строке словаря', K => K.key('Escape'), { surface: '', focusAct: 'open-comments', writes: 0 }],
  ], { query: 'section=pdf' }],
  'СС-59': ['сайд словаря комментариев: привязка словаря к схеме, «Сохранить» меняет значение в «Словарях»; «Отмена» и Esc отбрасывают (r2 §4, §7; аудит, «Финальная карта подсекций „Общих“», п. 4)', [
    ['открыть сайд', K => K.act('open-comments'), { surface: 'comments', sideTitle: 'Словарь комментариев', sideDict: 'Комментарии к осмотру транспорта', sideComments: 4 }],
    ['выбрать «Общий словарь комментариев» — черновик сайда', K => K.select('sideDict', 'Общий словарь комментариев'),
      { sideDict: 'Общий словарь комментариев', sideComments: 3, 'g.dictionaries.comments': 'vehicle', writes: 0, saveLog: [] }],
    ['«Отмена» — полотно прежнее', K => K.act('side-cancel'), { surface: '', sideTitle: null, 'g.dictionaries.comments': 'vehicle', commentDict: 'Комментарии к осмотру транспорта Комментариев: 4', writes: 0, focusAct: 'open-comments' }],
    ['открыть, выбрать, Esc — тоже отброшено', async (K) => { await K.act('open-comments'); await K.select('sideDict', 'Комментарии к документам'); await K.key('Escape') },
      { surface: '', 'g.dictionaries.comments': 'vehicle', writes: 0, focusAct: 'open-comments' }],
    ['открыть, выбрать, «Сохранить»', async (K) => { await K.act('open-comments'); await K.select('sideDict', 'Общий словарь комментариев'); await K.act('side-save'); await K.settled() },
      { surface: '', 'g.dictionaries.comments': 'common', commentDict: 'Общий словарь комментариев Комментариев: 3', saveLog: ['saving', 'saved'], writes: 1 }],
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
    ['тип осмотра — «Мультиосмотр»', async (K) => { await K.radio('inspectionType', 'Мультиосмотр'); await K.settled() }, { 'g.inspectionType': 'multi', saveLog: ['saving', 'saved'], writes: 4 }],
    ['тип схемы осмотра — «Осмотр недвижимости»', async (K) => { await K.select('schemeType', 'Осмотр недвижимости'); await K.settled() }, { 'g.schemeType': 'house', writes: 5 }],
    ['«Экран подтверждения»: подсказка клиенту', async (K) => { await K.typeInto('confirmHint', 'Проверьте кадры перед отправкой'); await K.settled() },
      { 'g.confirm.hint': 'Проверьте кадры перед отправкой', saveLog: ['saving', 'saved'], save: 'saved' }],
    ['«Экран подтверждения»: текст галочки', async (K) => { await K.typeInto('confirmCheckbox', 'Данные верны'); await K.settled() }, { 'g.confirm.checkbox': 'Данные верны', save: 'saved' }],
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
/** Ключ ожидания — поле слепка либо путь через точку (`g.behavior.refuse`): сравнивается значение по пути. */
const at = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const diffExpect = (exp, snap) => Object.keys(exp ?? {}).flatMap(k => diff(exp[k], k in snap ? snap[k] : at(snap, k), k))

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
