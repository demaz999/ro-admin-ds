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
 *   node scripts/scheme-edit-scenarios.mjs СС-33 --repeat=10  — сценарий десять раз подряд
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
      if (process.env.DEBUG_CLICK) console.log('   клик', p, await evaluate(`(e => e ? e.outerHTML.slice(0, 90) + ' «' + e.textContent.trim().slice(0, 40) + '»' : null)(document.elementFromPoint(${p.x}, ${p.y}))`))
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
      await sleep(250)
    },
    /**
     * Клавиша реальным вводом. Служебным клавишам нужен `windowsVirtualKeyCode`: без него Delete и стрелки до
     * редактируемой области не доходят (ловушка `CLAUDE.md`, «Синтетический Delete по CDP»).
     */
    async key(key, code = key, extra = {}) {
      const VK = { End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Backspace: 8, Delete: 46, Escape: 27, Enter: 13, Tab: 9 }
      const vk = VK[key] ? { windowsVirtualKeyCode: VK[key], nativeVirtualKeyCode: VK[key] } : {}
      await send('Page.bringToFront')
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, ...vk, ...extra })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, ...vk, ...extra })
      await sleep(150)
    },
    async type(text) { await send('Input.insertText', { text }); await sleep(200) },
    /**
     * Выделение текста протяжкой мыши — такт 68: нажатие у левого края текста, десять шагов движения, отпускание у правого.
     * Цель — элемент с текстом (поле ввода или узел значения); проверка — `String(getSelection())` в слепке (`sel`), у полей
     * ввода — ещё `selectionStart` и `selectionEnd` (`selRange`).
     *
     * Такт 72, решение чата (внешняя проверка тактов 67–70): протяжка идёт **по первой строке текста** — верх поля плюс
     * рамка, внутренний отступ и половина интерлиньяжа. Протяжка через середину многострочного поля шла по пустой части
     * ниже текста: в Linux курсор вставал в конец (42 / 42), выделения не было. У узла с текстом строка — первый
     * прямоугольник `Range`. `SELECT_BELOW=1` — намеренная поломка: протяжка по пустой части поля — ниже текста, от середины поля вправо (в Windows нажатие ниже текста у левого края ещё попадает в начало строки).
     */
    async selectText(sel) {
      await this.point(sel)
      const below = process.env.SELECT_BELOW ? 1 : 0
      const r = await evaluate(`(() => { const el = ${sel}; const b = el.getBoundingClientRect()
        if (el.matches('input, textarea')) {
          const cs = getComputedStyle(el); const px = v => parseFloat(v) || 0
          const top = b.y + px(cs.borderTopWidth) + px(cs.paddingTop); const lh = px(cs.lineHeight) || px(cs.fontSize) * 1.25
          const y = ${below} ? b.y + b.height - px(cs.paddingBottom) - px(cs.borderBottomWidth) - 4 : el.matches('textarea') ? top + lh / 2 : b.y + b.height / 2
          const x1 = ${below} ? b.x + b.width / 2 : b.x + px(cs.borderLeftWidth) + px(cs.paddingLeft)
          return { x1, x2: b.x + b.width - px(cs.borderRightWidth) - px(cs.paddingRight) - 2, y }
        }
        const range = document.createRange(); range.selectNodeContents(el); const line = range.getClientRects()[0] ?? b
        return { x1: line.x + 1, x2: line.x + line.width - 1, y: line.y + line.height / 2 } })()`)
      await send('Page.bringToFront')
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x1, y: r.y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x1, y: r.y, button: 'left', clickCount: 1 })
      for (let k = 1; k <= 10; k++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x1 + (r.x2 - r.x1) * k / 10, y: r.y, button: 'left', buttons: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x2, y: r.y, button: 'left', clickCount: 1 })
      await sleep(200)
    },
    /**
     * Протяжка мышью — такт 70: нажатие в центре ручки, движение шагами по 4 px до середины цели со сдвигом `dy`
     * (минус — выше середины, плюс — ниже), отпускание. `esc` — Esc перед отпусканием: протяжка отменяется.
     * Шаги по 4 px — ловушка такта 42: резкий рывок сдвигает раскладку под указателем.
     */
    async drag(fromSel, toSel, dy = 0, esc = false) {
      const a = await this.point(fromSel)
      const b = await evaluate(`(() => { const r = (${toSel}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
      await send('Page.bringToFront')
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
      const y2 = b.y + dy
      const n = Math.max(1, Math.ceil(Math.abs(y2 - a.y) / 4))
      for (let k = 1; k <= n; k++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y + (y2 - a.y) * k / n, button: 'left', buttons: 1 }); if (k % 8 === 0) await sleep(16) }
      await sleep(150)
      if (esc) await this.key('Escape')
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: a.x, y: y2, button: 'left', buttons: 0, clickCount: 1 })
      await sleep(250)
    },
    /** «/» — клавиша с текстом: `keyDown` доходит до обработчика хоткея; если его не перехватили, знак печатается. */
    async slash() {
      await send('Page.bringToFront')
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '/', code: 'Slash', text: '/', unmodifiedText: '/', windowsVirtualKeyCode: 191, nativeVirtualKeyCode: 191 })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: '/', code: 'Slash', windowsVirtualKeyCode: 191, nativeVirtualKeyCode: 191 })
      await sleep(150)
    },
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
    /* ---------- П6, такт 69: «Форма» ---------- */
    rowEdit: id => page.click(`document.querySelector('[data-form-row="${id}"] [data-slot=table-row-action]')`),
    async rowDelete(id) {
      await page.click(`document.querySelector('[data-form-row="${id}"] [data-slot=table-row-actions-secondary] button')`)
      await page.click(`document.querySelector('[data-menu=row-actions] [data-action=delete]')`)
    },
    group: id => page.click(`document.querySelector('[data-form-group="${id}"] [data-slot=choice-control]')`),
    rowCheck: id => page.click(`document.querySelector('[data-form-row="${id}"] [data-slot=choice-control]')`),
    fieldsAll: () => page.click(`document.querySelector('[data-fields-all] [data-slot=choice-control], [data-fields-all][data-slot=choice-control]')`),
    /** Новое поле через сайд: «Добавить поле», заголовок, тип, «Добавить поле» в подвале; дождаться записи. */
    async addField(title, type) {
      await this.act('field-add')
      await this.typeInto('fdTitle', title)
      if (type) await this.select('fdType', type)
      await this.act('field-save')
      await this.settled()
    },
    /* ---------- П7, часть 1, такт 70: «Процессы и шаги» ---------- */
    stepCheck: id => page.click(`document.querySelector('[data-step-row="${id}"] [data-slot=choice-control]')`),
    stepsAll: pid => page.click(`document.querySelector('[data-steps-all="${pid}"] [data-slot=choice-control], [data-steps-all="${pid}"][data-slot=choice-control]')`),
    flag: key => page.click(`document.querySelector('[data-steps-bar] [data-flag=${key}] [data-slot=choice-control], [data-steps-bar] [data-flag=${key}][data-slot=choice] [data-slot=choice-control]')`),
    stepEdit: id => page.click(`document.querySelector('[data-step-row="${id}"] [data-slot=table-row-action]')`),
    async stepDelete(id) {
      await page.click(`document.querySelector('[data-step-row="${id}"] [data-slot=table-row-actions-secondary] button')`)
      await page.click(`document.querySelector('[data-menu=row-actions] [data-action=delete]')`)
    },
    processAct: (pid, act) => page.click(`document.querySelector('[data-process="${pid}"] [data-act=${act}]')`),
    /** Тип шага в строке: метка со списком, пункт списка. */
    async stepKind(id, kind) {
      await page.click(`document.querySelector('[data-step-row="${id}"] [data-step-kind]')`)
      await page.click(`document.querySelector('[data-kind-menu="${id}"] [data-kind=${kind}]')`)
    },
    hint: id => page.click(`document.querySelector('[data-step-row="${id}"] [data-act^=hint]')`),
    uploadZone: id => page.click(`document.querySelector('[data-upload-zone="${id}"]')`),
    /** Протяжка ручкой строки `id` к строке `to`: `dy` — сдвиг от середины цели. Строка — шага либо поля. */
    dragRow: (id, to, dy = 0, esc = false) => page.drag(
      `document.querySelector('[data-reorder-handle="${id}"]')`, `document.querySelector('[data-reorder-id="${to}"]')`, dy, esc),
    /** Клавиатурная перестановка: фокус на ручке, Alt+↑ либо Alt+↓. */
    async moveKey(id, key) {
      await page.evaluate(`(document.querySelector('[data-reorder-handle="${id}"]').focus(), 1)`)
      await page.key(key, key, { modifiers: 1 })
    },
    /* ---------- П7, часть 2, такт 71: сайды процесса и шага, оверлей ---------- */
    /** Флажок нейросети в сайде шага либо в сайде «Нейросети выбранных шагов». */
    net: (side, name) => page.click(`document.querySelector('[data-side=${side}] [data-network="${name}"] [data-slot=choice-control], [data-side=${side}] [data-network="${name}"][data-slot=choice] [data-slot=choice-control]')`),
    stepAct: (id, act) => page.click(`document.querySelector('[data-step-row="${id}"] [data-act=${act}]')`),
    overlayStepEdit: id => page.click(`document.querySelector('[data-overlay-step="${id}"] [data-slot=table-row-action]')`),
    /* ---------- П8, такт 72: «Витрина», новая схема, плашка ---------- */
    /** Клик по элементу из выражения. */
    clickEl: sel => page.click(sel),
    /** Клик в поле (выражение элемента) и набор текста в конец значения. */
    async typeIn(sel, text) { await page.click(sel); await page.key('End'); await page.type(text) },
    /** Фокус на элементе программно — для подсказки обёртки выключенного таба. */
    focus: sel => page.evaluate(`(${sel}.focus(), 1)`),
    /** Пауза: подсказка открывается с задержкой. */
    wait: ms => sleep(ms),
    /* ---------- такт 68: только чтение ---------- */
    selectText: sel => page.selectText(sel),
    /** Поле ввода: клик в середину значения и набор знака — в «только чтении» значение прежнее. */
    async tryType(field) {
      await page.click(`(el => el?.matches('input, textarea') ? el : el?.querySelector('input, textarea'))(document.querySelector('[data-field=${field}]'))`)
      await page.type('Ж')
    },
    /** Стирание в поле с фокусом: Backspace и Delete — каретка в середине значения, оба стёрли бы по знаку. */
    async tryErase() {
      await page.key('Backspace')
      await page.key('Delete')
    },
    /** Одиночный выбор: клик по полю, Enter, пробел и стрелка вниз — в «только чтении» список не открывается. */
    async tryOpen(field) {
      await page.click(`document.querySelector('[data-field=${field}] [data-slot=field]')`)
      await page.key('Enter', 'Enter', { text: '\r' })
      await page.key(' ', 'Space', { text: ' ' })
      await page.key('ArrowDown')
    },
    /** Флажок строки настройки: клик по подписи, клик по контролу и пробел — в «только чтении» значение прежнее. */
    async tryToggle(key) {
      await page.click(`document.querySelector('[data-setting=${key}] [data-slot=choice-title]')`)
      await page.click(Q.setting(key))
      await page.key(' ', 'Space', { text: ' ' })
    },
    check: field => page.click(`document.querySelector('[data-field=${field}] [data-slot=choice-control], [data-field=${field}][data-slot=choice] [data-slot=choice-control]')`),
    async tabs(n) { for (let k = 0; k < n; k++) await page.key('Tab') },
    /* ---------- П5 ---------- */
    /** Клавиша «/» реальным вводом — как набор знака: событие клавиши и текст. */
    slash: () => page.slash(),
    searchClick: () => page.click(`document.querySelector('[data-field=search] input')`),
    result: key => page.click(`document.querySelector('[data-search-results] [data-result="${key}"]')`),
    quickLink: k => page.click(`document.querySelector('[data-search-results] [data-quick="${k}"]')`),
    /** Вспышка живёт 1.5 с — снять слепок раньше: короткая пауза вместо обычной. */
    /* ---------- П4 ---------- */
    /** Очистить поле: клик, выделить всё, Delete. */
    async clear(sel) {
      const input = `(el => el?.matches('input') ? el : el?.querySelector('input'))(document.querySelector('${sel}'))`
      await page.click(input)
      await page.evaluate(`(${input}.select(), 1)`)
      await page.key('Delete')
    },
    statusOpen: () => page.click(`document.querySelector('button[data-slot=publish-status-main]')`),
    async menu(action) {
      await page.click(Q.act('menu'))
      if (action) await page.click(`document.querySelector('[data-menu=scheme] [data-action=${action}]')`)
    },
    version: id => page.click(`document.querySelector('[data-version=${id}]')`),
    backLayer: () => page.click(`document.querySelector('[data-modal-back]')`),
    area: id => page.click(`document.querySelector('[data-area=${id}] [data-slot=diff-area-trigger]')`),
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
          /* ---------- П5 ---------- */
          query: document.querySelector('[data-field=search] input')?.value ?? null,
          searchFocus: document.activeElement === document.querySelector('[data-field=search] input'),
          searchOpen: !!document.querySelector('[data-search-results]'),
          results: [...document.querySelectorAll('[data-search-results] [data-slot=list-group]')].map(grp => ({
            path: t(grp.querySelector('[data-slot=list-group-header]')?.textContent),
            items: [...grp.querySelectorAll('[data-slot=list-item]')].map(i => [t(i.querySelector('[data-slot=list-item-title]').textContent), t(i.querySelector('[data-slot=list-item-subtitle]')?.textContent)].filter(Boolean).join(' | ')),
          })),
          resultActive: t(document.querySelector('[data-search-results] [data-slot=list-item][data-selected] [data-slot=list-item-title]')?.textContent) || null,
          searchEmpty: t(document.querySelector('[data-search-empty] [data-slot=empty-title]')?.textContent) || null,
          quickLinks: [...document.querySelectorAll('[data-search-results] [data-quick]')].map(b => t(b.textContent)),
          searchMore: t(document.querySelector('[data-search-more]')?.textContent) || null,
          hotkey: t(document.querySelector('[data-search-hotkey]')?.textContent) || null,
          /* Такт 67: подсказка хоткея — слот end поля; при значении на её месте крестик. Высота строки шапки — 44 всегда. */
          searchClear: !!document.querySelector('[data-field=search] [data-slot=field-clear]'),
          hotkeyInField: !!document.querySelector('[data-field=search] [data-slot=field] [data-search-hotkey]'),
          headerH: Math.round(document.querySelector('[data-header-row]')?.getBoundingClientRect().height ?? 0),
          flash: [...document.querySelectorAll('[data-setting][data-flash]')].map(r => r.dataset.setting),
          /* Найденное в окне: цель перехода видна целиком. */
          foundVisible: (() => { const key = M.ui.found.target; if (!key) return null
            const el = ['data-setting', 'data-field', 'data-radio', 'data-formula'].map(a => document.querySelector('[' + a + '="' + key + '"]')).find(Boolean); if (!el) return false
            const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })(),
          focusField: document.activeElement?.closest?.('[data-field]')?.dataset.field ?? null,
          /* ---------- П4 ---------- */
          status: (() => { const el = document.querySelector('[data-slot=publish-status]'); if (!el) return null
            const main = el.querySelector('[data-slot=publish-status-main]')
            return { state: el.dataset.state, text: t(main.textContent), clickable: main.matches('button'), editing: t(el.querySelector('[data-slot=publish-status-editing] > span:last-child')?.textContent) } })(),
          headerActs: [...document.querySelectorAll('[data-header-row] [data-act]')].map(b => b.dataset.act),
          modalTitle: t([...document.querySelectorAll('[data-slot=modal-card-title]')].pop()?.textContent) || null,
          modalSub: t([...document.querySelectorAll('[data-slot=modal-card-subtitle]')].pop()?.textContent) || null,
          headerType: [...document.querySelectorAll('[data-slot=modal-card-header]')].pop()?.dataset.type ?? null,
          diff: (() => { const el = [...document.querySelectorAll('[data-slot=diff]')].pop(); if (!el) return null
            return {
              attention: [...el.querySelectorAll('[data-diff-attention] li')].map(x => t(x.textContent)),
              warnings: [...el.querySelectorAll('[data-diff-warnings] li')].map(x => ({ text: t(x.textContent), critical: x.hasAttribute('data-critical') })),
              areas: [...el.querySelectorAll('[data-slot=diff-area]')].map(a => ({ id: a.dataset.area ?? '', count: t(a.querySelector('[data-slot=diff-area-count]').textContent), tone: a.dataset.tone })),
              open: [...el.querySelectorAll('[data-slot=diff-area][data-open]')].map(a => ({ id: a.dataset.area ?? '', groups: [...a.querySelectorAll('[data-slot=diff-group]')].map(grp => ({
                kind: grp.dataset.kind, title: t(grp.querySelector('[data-slot=diff-group-title]').textContent),
                items: [...grp.querySelectorAll('[data-slot=diff-change]')].map(c => [t(c.querySelector('[data-slot=diff-change-label]').textContent), [t(c.querySelector('[data-slot=diff-change-before]')?.textContent), t(c.querySelector('[data-slot=diff-change-after]')?.textContent)].filter(Boolean).join(' → '), t(c.querySelector('[data-slot=diff-change-effect]')?.textContent)].filter(Boolean).join(' | ')),
              })) })),
              total: t(el.querySelector('[data-slot=diff-total]')?.textContent) || null,
            } })(),
          confirmOff: (document.querySelector('[data-act=publish-confirm]') ?? document.querySelector('[data-act=first-confirm]'))?.disabled ?? null,
          firstSummary: [...document.querySelectorAll('[data-first-summary] li')].map(x => t(x.textContent)),
          historyRows: [...document.querySelectorAll('[data-version]')].map(r => ({ id: r.dataset.version, text: t(r.innerText), current: r.getAttribute('aria-current') === 'true' })),
          historyEmpty: t(document.querySelector('[data-side=history] [data-slot=empty-title]')?.textContent) || null,
          versionFirst: !!document.querySelector('[data-version-first]'),
          sideActs: [...document.querySelectorAll('[data-side=history] [data-act]')].map(b => b.dataset.act),
          menuItems: [...document.querySelectorAll('[data-menu=scheme] [data-slot=list-item]')].map(x => t(x.textContent)),
          viewing: root.dataset.viewing,
          banner7: t(document.querySelector('[data-viewing-banner]')?.textContent) || null,
          /*
           * Такт 68: поля разделов — «только чтение» осью readonly; inert — только у действий. Признак истинен, когда
           * обёртка разделов помечена и каждое невыключенное поле и контрол выбора вне inert несут ось; часть — 'partial'.
           */
          readonly: (() => {
            const col = document.querySelector('[data-settings-column]')
            if (!col) return null
            const wrap = !!col.querySelector('[data-readonly]:not([data-slot])')
            const live = x => !x.closest('[inert]')
            const fields = [...col.querySelectorAll('[data-slot=field-wrapper]')].filter(x => live(x) && x.dataset.state !== 'disabled').map(x => 'readonly' in x.dataset)
            const ctrls = [...col.querySelectorAll('[data-slot=choice-control]')].filter(x => live(x) && !x.disabled).map(x => x.getAttribute('aria-readonly') === 'true')
            const all = [wrap, ...fields, ...ctrls]
            return all.every(Boolean) ? true : all.some(Boolean) ? 'partial' : false
          })(),
          inertOnFields: !!document.querySelector('[data-settings-column] [inert] [data-slot=field-wrapper], [data-settings-column] [inert] [data-slot=choice]'),
          sel: String(window.getSelection()) || null,
          typeValue: t(document.querySelector('[data-field=schemeType] [data-slot=field-input]')?.textContent) || null,
          listOpen: !!document.querySelector('[data-slot=popover] [data-slot=list-item]'),
          focusRo: document.activeElement ? (document.activeElement.readOnly === true || document.activeElement.getAttribute('aria-readonly') === 'true') : false,
          shownDescription: document.querySelector('[data-field=description] textarea, textarea[data-field=description]')?.value ?? null,
          current: M.current.value?.id ?? null,
          atMark: window.__markY == null ? null : Math.abs(window.scrollY - window.__markY) <= 1 && window.__markY > 300,
          surface: root.dataset.surface,
          sideTitle: t(document.querySelector('[data-side] [data-slot=modal-card-title]')?.textContent) || null,
          sideDict: t(document.querySelector('[data-field=sideDict] [data-slot=field-input]')?.textContent) || null,
          sideComments: document.querySelectorAll('[data-side-comments] [data-slot=chip]').length,
          commentDict: t(document.querySelector('[data-act=open-comments]')?.textContent) || null,
          focusAct: document.activeElement?.dataset?.act ?? null,
          /* ---------- П6, такт 69: «Форма» ---------- */
          form: (() => { const el = document.querySelector('[data-form]'); if (!el) return null
            const bar = el.querySelector('[data-fields-bar]')
            return {
              groups: [...el.querySelectorAll('[data-form-group]')].map(g => t(g.querySelector('[data-slot=choice-title]').textContent)),
              group: t(el.querySelector('[data-form-group] [data-slot=choice-control][data-state=checked]')?.closest('[data-form-group]')?.querySelector('[data-slot=choice-title]').textContent) || null,
              /* Довесок 1: «Настройки группы» — пары FrameMeta; слепок — значения пар. */
              settings: [...el.querySelectorAll('[data-group-settings] [data-slot=frame-meta] dd')].map(x => t(x.textContent)),
              title: t(el.querySelector('[data-fields-title]')?.textContent) || null,
              rows: [...el.querySelectorAll('[data-form-row]')].map(r => [t(r.querySelector('[data-row-number]').textContent), t(r.querySelector('[data-slot=table-cell-identity]').textContent),
                t(r.querySelector('[data-field-alias]').textContent), t(r.querySelector('[data-slot=chip]').textContent),
                [...r.querySelectorAll('[data-badge]')].map(b => t(b.textContent)).join(', ')].filter(Boolean).join(' · ')),
              selected: el.querySelectorAll('[data-form-row][data-state=selected]').length,
              all: el.querySelector('[data-fields-all] [data-slot=choice-control], [data-fields-all][data-slot=choice-control]')?.getAttribute('aria-checked') ?? null,
              bar: bar && bar.dataset.state === 'open' && getComputedStyle(bar).display !== 'none' ? t(bar.querySelector('[data-slot=action-bar-count]').textContent) : null,
              empty: t(el.querySelector('[data-slot=empty-title]')?.textContent) || null,
            } })(),
          /* Просмотр версии на «Форме»: поля группы — «только чтение», флажки строк — aria-readonly, действия — под inert. */
          formRo: (() => { const el = document.querySelector('[data-form]'); if (!el) return null
            const checks = [...el.querySelectorAll('[data-fields-table] [data-slot=choice-control]')]
            const acts = [...el.querySelectorAll('[data-act]')]
            /* Довесок 1: настройки группы — текст FrameMeta; редактируемых полей вне inert на «Форме» нет. */
            const editable = [...el.querySelectorAll('input, textarea, [contenteditable=true]')].filter(x => !x.readOnly && !x.closest('[inert]'))
            return { noEdit: editable.length === 0, checks: checks.length > 0 && checks.every(x => x.getAttribute('aria-readonly') === 'true'),
              actsInert: acts.length > 0 && acts.every(x => !!x.closest('[inert]')), rowActsInert: [...el.querySelectorAll('[data-slot=table-row-actions]')].every(x => !!x.closest('[inert]')) } })(),
          fieldSide: (() => { const el = document.querySelector('[data-side=field]'); if (!el) return null
            return {
              legends: [...el.querySelectorAll('[data-slot=field-set-legend]')].map(x => t(x.textContent)),
              title: el.querySelector('[data-field=fdTitle] input, input[data-field=fdTitle]')?.value ?? null,
              alias: el.querySelector('[data-field=fdAlias] input, input[data-field=fdAlias]')?.value ?? null,
              type: t(el.querySelector('[data-field=fdType] [data-slot=field-input]')?.textContent) || null,
              choices: !!el.querySelector('[data-field-choices]'),
              /* Довесок 1: флажки секции «Поведение и видимость» — Checkbox; причина — строка пояснения под флажком. */
              checks: Object.fromEntries([...el.querySelectorAll('[data-field-flags] [data-slot=choice][data-field]')].map(c => [c.dataset.field, {
                checked: c.querySelector('[data-slot=choice-control]').getAttribute('aria-checked') === 'true', off: !!c.querySelector('[data-slot=choice-control]').disabled,
                sub: t(c.querySelector('[data-slot=choice-subtitle]')?.textContent) }])),
              help: [...el.querySelectorAll('[data-field-help]')].map(b => b.closest('div')?.querySelector('[data-slot=choice]')?.dataset.field ?? null),
              /* Шаг строк флажков: верх строки к верху следующей. */
              step: (() => { const r = [...el.querySelectorAll('[data-field-flags] [data-slot=choice]')].map(c => Math.round(c.getBoundingClientRect().top)); return r.slice(1).map((y, k) => y - r[k]) })(),
            } })(),
          focusRow: document.activeElement?.closest?.('[data-form-row]')?.dataset.formRow ?? null,
          /* ---------- П7, часть 1, такт 70: «Процессы и шаги» ---------- */
          proc: (() => { const el = document.querySelector('[data-processes]'); if (!el) return null
            const bar = el.querySelector('[data-steps-bar]')
            const check = x => x?.getAttribute('aria-checked') ?? null
            return {
              cards: [...el.querySelectorAll('[data-process]')].map(c => [t(c.querySelector('[data-slot=heading]')?.textContent), t(c.querySelector('[data-slot=heading-meta]')?.textContent),
                t(c.querySelector('[data-process-alias]')?.textContent), c.querySelector('[data-badge=repeatable]') ? 'повторяемый' : '',
                c.querySelector('[data-act=process-open]') ? 'открыть' : ''].filter(Boolean).join(' · ')),
              /* Строка шага: № · название · тип · способ · нейросети · фото-подсказка · флаги. */
              rows: Object.fromEntries([...el.querySelectorAll('[data-process]')].map(c => [c.dataset.process, [...c.querySelectorAll('[data-step-row]')].map(r => [
                t(r.querySelector('[data-row-number]').textContent), t(r.querySelector('[data-slot=table-cell-identity] [data-slot=table-cell-text]')?.textContent ?? r.querySelector('[data-slot=table-cell-identity]').textContent),
                t(r.querySelector('[data-step-kind] [data-slot=chip-label]')?.textContent), t(r.querySelector('[data-step-method]').textContent),
                [...r.querySelectorAll('[data-step-networks] [data-slot=table-cell-text], [data-step-networks] [data-networks-empty]')].map(x => t(x.textContent)).join(', '),
                t(r.querySelector('[data-hint-status]').textContent),
                [...r.querySelectorAll('[data-badge]')].map(b => t(b.textContent)).join(', ')].filter(Boolean).join(' · '))])),
              selected: el.querySelectorAll('[data-step-row][data-state=selected]').length,
              all: Object.fromEntries([...el.querySelectorAll('[data-process]')].filter(c => c.querySelector('[data-steps-all]')).map(c => [c.dataset.process,
                check(c.querySelector('[data-steps-all] [data-slot=choice-control], [data-steps-all][data-slot=choice-control]'))])),
              bar: bar && bar.dataset.state === 'open' && getComputedStyle(bar).display !== 'none' ? t(bar.querySelector('[data-slot=action-bar-count]').textContent) : null,
              flags: bar && getComputedStyle(bar).display !== 'none' ? Object.fromEntries([...bar.querySelectorAll('[data-flag]')].map(x => [x.dataset.flag, check(x.querySelector('[data-slot=choice-control]') ?? x)])) : null,
              upload: el.querySelector('[data-upload-zone]')?.dataset.uploadZone ?? null,
              kindMenu: !!document.querySelector('[data-kind-menu]'),
              dragging: el.querySelector('[data-dragging]')?.dataset.reorderId ?? null,
            } })(),
          /* Просмотр версии на «Процессах»: флажки — aria-readonly, действия и ручки — под inert; «Открыть процесс» — вне inert. */
          procRo: (() => { const el = document.querySelector('[data-processes]'); if (!el) return null
            const checks = [...el.querySelectorAll('[data-slot=choice-control]')].filter(x => !x.closest('[data-steps-bar]'))
            const acts = [...el.querySelectorAll('[data-act]')].filter(x => x.dataset.act !== 'process-open')
            return { checks: checks.length > 0 && checks.every(x => x.getAttribute('aria-readonly') === 'true'),
              actsInert: acts.length > 0 && acts.every(x => !!x.closest('[inert]')),
              handlesInert: [...el.querySelectorAll('[data-reorder-handle]')].every(x => !!x.closest('[inert]')),
              kindInert: [...el.querySelectorAll('[data-step-kind]')].every(x => !!x.closest('[inert]')),
              rowActsInert: [...el.querySelectorAll('[data-slot=table-row-actions]')].every(x => !!x.closest('[inert]')) } })(),
          focusStep: document.activeElement?.closest?.('[data-step-row]')?.dataset.stepRow ?? null,
          focusHandle: document.activeElement?.dataset?.reorderHandle ?? null,
          /* ---------- П7, часть 2, такт 71: сайды процесса и шага, оверлей, стек слоёв ---------- */
          surfaces: M.ui.surfaces.map(x => x.id),
          /* Слой, в котором фокус: сайд по data-side либо оверлей. */
          focusIn: document.activeElement?.closest?.('[data-side]')?.dataset.side ?? (document.activeElement?.closest?.('[data-overlay]') ? 'overlay' : null),
          procHidden: [...document.querySelectorAll('[data-process]')].filter(c => c.querySelector('[data-badge=hidden]')).map(c => c.dataset.process),
          procSide: (() => { const el = document.querySelector('[data-side=process]'); if (!el) return null
            const val = k => { const x = el.querySelector('[data-field=' + k + ']'); return (x?.matches('input, textarea') ? x : x?.querySelector('input, textarea'))?.value ?? null }
            return {
              title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent),
              legends: [...el.querySelectorAll('[data-slot=field-set-legend]')].map(x => t(x.textContent)),
              name: val('pdTitle'), alias: val('pdAlias'),
              order: Number(t(el.querySelector('[data-field=pdOrder] [data-slot=stepper-value]')?.textContent)),
              flags: [...el.querySelectorAll('[data-process-flags] [data-slot=choice]')].filter(c => c.querySelector('[data-slot=choice-control]').getAttribute('aria-checked') === 'true').map(c => c.dataset.field),
              objectType: t(el.querySelector('[data-field=pdObjectType] [data-slot=field-input]')?.textContent) || null,
              icon: t(el.querySelector('[data-act=process-icon]')?.textContent),
              duration: t(el.querySelector('[data-radio=pdDuration] [data-slot=choice-control][data-state=checked]')?.closest('[data-slot=choice]')?.textContent) || null,
            } })(),
          stepSide: (() => { const el = document.querySelector('[data-side=step]'); if (!el) return null
            const val = k => { const x = el.querySelector('[data-field=' + k + ']'); return (x?.matches('input, textarea') ? x : x?.querySelector('input, textarea'))?.value ?? null }
            const nets = [...el.querySelectorAll('[data-step-networks-list] [data-network]')]
            const ctl = c => c.matches('[data-slot=choice-control]') ? c : c.querySelector('[data-slot=choice-control]')
            return {
              title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent), sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
              host: el.dataset.host,
              legends: [...el.querySelectorAll('[data-slot=field-set-legend]')].map(x => t(x.textContent)),
              name: val('sdTitle'),
              order: Number(t(el.querySelector('[data-field=sdOrder] [data-slot=stepper-value]')?.textContent)),
              flags: [...el.querySelectorAll('[data-step-section] [data-slot=choice][data-field]')].filter(c => ctl(c).getAttribute('aria-checked') === 'true').map(c => c.dataset.field),
              networks: nets.filter(c => ctl(c).getAttribute('aria-checked') === 'true').map(c => c.dataset.network),
              denied: nets.filter(c => ctl(c).disabled).map(c => c.dataset.network + ' | ' + t(c.querySelector('[data-slot=choice-subtitle]')?.textContent)),
              hint: t(el.querySelector('[data-step-hint-status]')?.textContent),
              links: [...el.querySelectorAll('[data-field=sdLinks] [data-slot=select-chip]')].map(c => t(c.textContent)),
              /* Секция «Нейросети» в окне сайда: верх секции виден. */
              networksInView: (() => { const sec = el.querySelector('[data-step-section=networks]'); const body = el.querySelector('[data-slot=modal-card-body]'); if (!sec || !body) return null
                const a = sec.getBoundingClientRect(); const b = body.getBoundingClientRect(); return a.top >= b.top - 1 && a.top < b.bottom })(),
            } })(),
          focusNetwork: document.activeElement?.closest?.('[data-network]')?.dataset.network ?? null,
          netSide: (() => { const el = document.querySelector('[data-side=networks]'); if (!el) return null
            return { sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
              states: Object.fromEntries([...el.querySelectorAll('[data-networks-list] [data-network]')].map(c => [c.dataset.network,
                (c.matches('[data-slot=choice-control]') ? c : c.querySelector('[data-slot=choice-control]')).disabled ? 'off' : (c.matches('[data-slot=choice-control]') ? c : c.querySelector('[data-slot=choice-control]')).getAttribute('aria-checked')])) } })(),
          overlay: (() => { const el = document.querySelector('[data-overlay=process]'); if (!el) return null
            const live = x => !x.closest('[inert]')
            return {
              title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent), sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
              placement: el.dataset.placement,
              name: el.querySelector('[data-field=odTitle] input, input[data-field=odTitle]')?.value ?? null,
              alias: el.querySelector('[data-field=odAlias] input, input[data-field=odAlias]')?.value ?? null,
              steps: [...el.querySelectorAll('[data-overlay-step]')].map(r => [t(r.querySelector('[data-row-number]').textContent), t(r.querySelector('[data-slot=table-cell-identity] [data-slot=table-cell-text]')?.textContent ?? r.querySelector('[data-slot=table-cell-identity]').textContent)].join(' · ')),
              empty: t(el.querySelector('[data-overlay-empty] [data-slot=empty-title]')?.textContent) || null,
              acts: [...el.querySelectorAll('[data-act]')].filter(live).map(b => b.dataset.act),
              ro: !!el.dataset.readonly,
              /* Только чтение: поля формы оверлея несут ось, флажки — aria-readonly. */
              fieldsRo: [...el.querySelectorAll('[data-overlay-form] [data-slot=field-wrapper]')].every(x => 'readonly' in x.dataset)
                && [...el.querySelectorAll('[data-overlay-form] [data-slot=choice-control]')].every(x => x.getAttribute('aria-readonly') === 'true'),
              /* Полноэкранный слой: карточка во всё окно. */
              full: (() => { const r = el.getBoundingClientRect(); return Math.round(r.left) === 0 && Math.round(r.top) === 0 && Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight })(),
            } })(),
          focusOverlayStep: document.activeElement?.closest?.('[data-overlay-step]')?.dataset.overlayStep ?? null,
          /* ---------- такт 72: выделение в поле ввода — решение чата, внешняя проверка тактов 67–70 ---------- */
          selRange: (() => { const a = document.activeElement; return a?.matches?.('input, textarea') ? [a.selectionStart, a.selectionEnd] : null })(),
          /* ---------- П8, такт 72: «Витрина», пустые состояния, новая схема, плашка ---------- */
          sc: M.draft.config.showcase,
          showcase: (() => { const el = document.querySelector('[data-showcase]'); if (!el) return null
            const val = k => { const x = el.querySelector('[data-field=' + k + ']'); return (x?.matches('input, textarea') ? x : x?.querySelector('input, textarea'))?.value ?? null }
            const btn = el.querySelector('[data-act=publish-showcase]')
            const status = el.querySelector('[data-showcase-status]')
            return {
              status: t(status?.querySelector('[data-slot=callout-title]')?.textContent), tone: status?.dataset.tone ?? null,
              text: t(status?.querySelector('[data-slot=callout-text]')?.textContent),
              publish: btn ? (btn.disabled ? 'off' : 'on') : null,
              title: val('scTitle'), summary: val('scSummary'), price: val('scPrice'),
              image: t(el.querySelector('[data-act=showcase-image]')?.textContent),
              industry: t(el.querySelector('[data-field=scIndustry] [data-slot=field-input]')?.textContent) || null,
              spheres: [...el.querySelectorAll('[data-field=scSpheres] [data-slot=select-chip]')].map(c => t(c.textContent)),
              spheresOff: !!el.querySelector('[data-field=scSpheres] [data-multiple][data-disabled]'),
              object: t(el.querySelector('[data-field=scObject] [data-slot=field-input]')?.textContent) || null,
              template: t(el.querySelector('[data-template-note] [data-slot=callout-text]')?.textContent),
              description: val('scDescription'),
              problems: [...el.querySelectorAll('[data-problem]')].map(p => [...p.querySelectorAll('input')].map(i => i.value).join(' | ')),
              metrics: [...el.querySelectorAll('[data-metric]')].map(p => [...p.querySelectorAll('input')].map(i => i.value).join(' | ')),
              modules: [...el.querySelectorAll('[data-module]')].map(c => t(c.textContent)),
              hidden: [...el.querySelectorAll('[data-module-show]')].map(c => t(c.textContent)),
              flow: [...el.querySelectorAll('[data-flow] [data-slot=chip]')].map(c => t(c.textContent)),
              /* Просмотр версии: поля «только чтение», действия под inert, крестиков у модулей нет. */
              ro: { fields: [...el.querySelectorAll('[data-slot=field-wrapper]')].every(x => 'readonly' in x.dataset),
                actsInert: [...el.querySelectorAll('[data-act]')].every(x => !!x.closest('[inert]')), removable: el.querySelectorAll('[data-slot=chip-remove]').length },
            } })(),
          hint: t(document.querySelector('[data-autosave-hint] [data-slot=callout-text]')?.textContent) || null,
          /* Двухфазность новой схемы: выключенные табы и обёртки с причиной; подсказка — текст открытой подсказки. */
          tabLock: { off: [...document.querySelectorAll('[data-tab-trigger]')].filter(b => b.disabled).map(b => b.dataset.tabTrigger),
            wrap: [...document.querySelectorAll('[data-tab-lock]')].map(w => w.dataset.tabLock + ' | ' + w.getAttribute('aria-label')) },
          tooltip: t([...document.querySelectorAll('[data-slot=tooltip-content]')].pop()?.innerText.split(String.fromCharCode(10))[0]) || null,
          focusLock: document.activeElement?.dataset?.tabLock ?? null,
          emptyActs: [...document.querySelectorAll('[data-slot=tabs-content][data-state=active] [data-slot=empty] [data-act]')].map(b => b.dataset.act),
        })
      })()`)
      return JSON.parse(s)
    },
  }
}

/* ------------------------------ сценарии ------------------------------ */
/**
 * Сценарии П1–П6 — `docs/scheme-edit.md`, 6.1. Шаг — [название, действие, ожидание из спеки, опции].
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
    ['таб «Форма»', K => K.tab('form'), { tab: 'form', tabActive: ['form'], section: 'general', scrollY: 0, pending: null, 'form.title': 'Заявка · 3 поля' }],
    ['таб «Процессы и шаги»', K => K.tab('processes'), { tab: 'processes', tabActive: ['processes'], pending: null, 'proc.cards.length': 3 }],
    ['таб «Витрина» (такт 72): статус карточки и три карточки', K => K.tab('showcase'), { tab: 'showcase', tabActive: ['showcase'], pending: null, 'showcase.status': 'Статус витрины: Черновик карточки', scrollY: 0 }],
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
    ['«Перейти к полям»', async (K) => { await K.mark(); await K.act('go-fields') }, { tab: 'form', tabActive: ['form'], pending: null, 'form.group': 'Заявка', writes: 1, scrollY: 0 }],
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
  /* ============================ П5, такт 65 ============================ */
  'СС-09': ['поиск: хоткей `/` ставит фокус, Esc очищает и снимает выдачу (r2 §3; аудит, «Клавиатура и фокус»)', [
    ['старт: поиск под шапкой, подсказка хоткея внутри поля', null, { query: '', searchFocus: false, searchOpen: false, hotkey: '/', hotkeyInField: true, searchClear: false, headerH: 44 }],
    ['«/» — фокус в поиске, знак не напечатан; у пустого поля подсказка, крестика нет', K => K.slash(), { searchFocus: true, query: '', searchOpen: false, hotkey: '/', searchClear: false }],
    ['набор «согл» — выдача открыта, фокус в поле; на месте подсказки крестик', K => K.type('согл'), { query: 'согл', searchFocus: true, searchOpen: true, hotkey: null, searchClear: true,
      results: [{ path: 'Настройки → Общие', items: ['Отправлять поля на согласование согласующему лицу', 'Обязательное согласование осмотра после экспертизы'] },
        { path: 'Настройки → PDF', items: ['Запрашивать подписание документа после успешной экспертизы | по запросу «согласование с клиентом»'] }],
      resultActive: 'Отправлять поля на согласование согласующему лицу' }],
    ['Esc — запрос очищен, выдача снята, подсказка вернулась', K => K.key('Escape'), { query: '', searchOpen: false, writes: 0, hotkey: '/', searchClear: false }],
    ['«/» при наборе в поле — знак печатается в поле', async (K) => { await K.typeInto('confirmHint', 'Да'); await K.slash(); await K.settled() },
      { 'g.confirm.hint': 'Да/', searchFocus: false, focusField: 'confirmHint' }],
  ]],
  'СС-10': ['поиск: буквальный матч сквозь все табы и разделы, синонимы из словаря; выдача сгруппирована по пути (r2 §3; аудит, «Требования к поиску»)', [
    ['«подпис» — два раздела, группы по пути', async (K) => { await K.searchClick(); await K.type('подпис') }, { searchOpen: true, searchEmpty: null, results: [
      { path: 'Настройки → Веб-приложение', items: ['Запретить переход в «Подписание» или «Контракт»'] },
      { path: 'Настройки → PDF', items: ['Запрашивать подписание документа после успешной экспертизы', 'Кто подписывает документ', 'Показывать подписанный PDF в приложении', 'Отправлять подписанный PDF на почту',
        'Формировать PDF без подписи и показывать в приложении после экспертизы', 'Отправлять PDF без подписи на почту'] }], searchMore: null }],
    ['синоним «размытые фото» — детектор размытых изображений', K => K.fill('[data-field=search]', 'размытые фото'),
      { results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»'] }] }],
    ['регистр и «ё» не мешают: «СЪЕМК»', K => K.fill('[data-field=search]', 'СЪЕМК'),
      { 'results.0.path': 'Настройки → Аномалии', 'results.0.items': ['Детектор «Аномалии кластеризации (съёмка вне основной точки)»', 'Детектор «Съёмка с экрана»'] }],
    ['по описанию: «промежуточного экрана»', K => K.fill('[data-field=search]', 'промежуточного экрана'),
      { results: [{ path: 'Настройки → Мобильное приложение', items: ['Запустить осмотр сразу после создания | Пользователь сразу переходит к выполнению без промежуточного экрана'] }] }],
    ['длинная выдача обрезается с подсказкой: «детектор»', K => K.fill('[data-field=search]', 'детектор'), { searchMore: 'Показаны первые 12 из 15 — уточните запрос', 'results.0.path': 'Настройки → Аномалии', 'results.0.items.0': 'Отображать блок аномалий | Детекторы подозрительной активности при проведении осмотра' }],
    ['поле формы по алиасу (такт 69): «regnum» — путь «Форма → Автомобиль»', K => K.fill('[data-field=search]', 'regnum'),
      { results: [{ path: 'Форма → Автомобиль', items: ['Поле «Госномер» | алиас regnum'] }] }],
    ['шаг процесса (такт 70): «металле» — путь «Процессы → Осмотр автомобиля»', K => K.fill('[data-field=search]', 'металле'),
      { results: [{ path: 'Процессы → Осмотр автомобиля', items: ['Шаг «VIN на металле»'] }] }],
    ['шаг по описанию: «лобовое стекло»', K => K.fill('[data-field=search]', 'лобовое стекло'),
      { results: [{ path: 'Процессы → Осмотр автомобиля', items: ['Шаг «VIN под стеклом» | Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден'] }] }],
    ['поле витрины (такт 72): «теги» — путь «Витрина → Витринная карточка»', K => K.fill('[data-field=search]', 'теги'),
      { results: [{ path: 'Витрина → Витринная карточка', items: ['Индустрия | по запросу «теги»', 'Сфера применения | по запросу «теги»', 'Объект | по запросу «теги»'] }] }],
    ['поиск работает с любого таба', async (K) => { await K.key('Escape'); await K.tab('showcase'); await K.slash(); await K.type('дедлайн') },
      { tab: 'showcase', searchOpen: true, 'results.0.path': 'Настройки → Общие', 'results.0.items.0': 'Дедлайн проверки' }],
  ]],
  'СС-11': ['поиск: выбор результата ведёт к месту — таб, раздел, прокрутка, подсветка (r2 §3; аудит, «Требование к поиску при вложенности»)', [
    ['с таба «Форма»: «/», «размытые фото», Enter — раздел «Аномалии», строка подсвечена', async (K) => { await K.tab('form'); await K.slash(); await K.type('размытые фото'); await K.key('Enter') },
      { tab: 'settings', section: 'anomalies', navActive: ['anomalies'], flash: ['det-blur'], foundVisible: true, query: '', searchOpen: false, searchFocus: false, writes: 0 }],
    ['клик по результату: «кадастр» — «Общие», якорь «Поведение процесса», прокрутка и подсветка', async (K) => { await K.searchClick(); await K.type('кадастр'); await K.result('general.behavior.cadastreMap') },
      { section: 'general', anchor: 'behavior', flash: ['cadastreMap'], foundVisible: true, searchOpen: false, query: '' }],
    ['стрелка вниз и Enter — второй результат', async (K) => { await K.slash(); await K.type('опытным'); await K.key('ArrowDown'); await K.key('Enter') },
      { section: 'mobile', anchor: 'mobile-behavior', flash: ['skipConfirm'], foundVisible: true }],
    ['цель — поле: «наименование» — фокус в поле «Наименование»', async (K) => { await K.slash(); await K.type('наименование'); await K.key('Enter') },
      { section: 'general', anchor: 'main', focusField: 'name', flash: [], foundVisible: true, writes: 0 }],
    ['настройка, скрытая под выключенным родителем, — подсвечен родитель: «кто подписывает»', async (K) => { await K.searchClick(); await K.type('кто подписывает'); await K.key('Enter') },
      { section: 'pdf', flash: ['pdfSign'], foundVisible: true, 'rows.pdfSign.children': false }],
    ['поле формы (такт 69): «госномер», Enter — таб «Форма», группа «Автомобиль», фокус на строке поля', async (K) => { await K.searchClick(); await K.type('госномер'); await K.key('Enter') },
      { tab: 'form', 'form.group': 'Автомобиль', focusRow: 'f-plate', searchOpen: false, query: '', writes: 0 }],
    ['шаг процесса (такт 70): «вид справа», Enter — таб «Процессы и шаги», фокус на флажке строки шага', async (K) => { await K.searchClick(); await K.type('вид справа'); await K.key('Enter') },
      { tab: 'processes', focusStep: 's-right', focusHandle: null, searchOpen: false, query: '', writes: 0 }],
    ['поле витрины (такт 72): «продающее», Enter — таб «Витрина», фокус в поле', async (K) => { await K.searchClick(); await K.type('продающее'); await K.key('Enter') },
      { tab: 'showcase', focusField: 'scTitle', searchOpen: false, query: '', writes: 0 }],
  ]],
  'СС-11/просмотр': ['поиск работает в просмотре прошлой версии: переход и подсветка есть, правки нет (r2 §2, состояние 7)', [
    ['«/», «пропускать», Enter', async (K) => { await K.slash(); await K.type('пропускать'); await K.key('Enter') },
      { viewing: 'v1', section: 'general', flash: ['skipExpertise'], foundVisible: true, readonly: true, writes: 0 }],
    ['найденный флажок: клик по подписи, по контролу и пробел — правки нет, фокус на флажке', K => K.tryToggle('skipExpertise'),
      { 'g.behavior.skipExpertise': false, focusRo: true, writes: 0, saveLog: [] }],
    ['«/», «наименование», Enter — фокус в поле только для чтения; набор знака — правки нет', async (K) => { await K.slash(); await K.type('наименование'); await K.key('Enter'); await K.type('Ж') },
      { focusField: 'name', focusRo: true, name: 'КАСКО — осмотр легкового автомобиля', writes: 0, saveLog: [] }],
    ['значение найденного поля выделяется', K => K.selectText(Q.nameInput),
      { sel: 'КАСКО — осмотр легкового автомобиля', selRange: [0, 35], focusField: 'name' }],
  ], { query: 'view=v1' }],
  'СС-12': ['поиск: пустая выдача — «Ничего не найдено по «…»» и «Быстрый переход» (r2 §3; аудит, «Требования к поиску»)', [
    ['«фаыфа» — пустая выдача подсказывает', async (K) => { await K.searchClick(); await K.type('фаыфа') },
      { searchOpen: true, results: [], searchEmpty: 'Ничего не найдено по «фаыфа»', quickLinks: ['Аномалии', 'Права доступа', 'PDF', 'Процессы и шаги'] }],
    ['Enter при пустой выдаче — на месте', K => K.key('Enter'), { searchOpen: true, section: 'general', tab: 'settings' }],
    ['быстрый переход «PDF»', K => K.quickLink(2), { section: 'pdf', tab: 'settings', searchOpen: false, query: '', 'templates.length': 2 }],
    ['быстрый переход «Процессы и шаги»', async (K) => { await K.searchClick(); await K.type('ъъъ'); await K.quickLink(3) }, { tab: 'processes', searchOpen: false, query: '', pending: null, 'proc.cards.length': 3 }],
  ]],
  /* ============================ П4, такт 64 ============================ */
  'СС-02': ['новая схема: индикатор «Ни разу не опубликовано», главная кнопка ведёт в первую публикацию (r2 §2, состояние 1)', [
    ['старт', null, { publish: 'never', status: { state: 'never', text: 'Ни разу не опубликовано', clickable: false, editing: '' }, versions: 0, current: null, headerActs: ['history', 'preview', 'publish', 'menu'] }],
    ['«Опубликовать схему» — первая публикация', K => K.publish(), { surface: 'first-publish', modalTitle: 'Первая публикация схемы', diff: null, versions: 0 }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  'СС-03': ['правка делает черновик грязным: индикатор «Черновик: правки {автор} от {дата}»; клик по индикатору открывает дифф (r2 §2, состояние 2; аудит, «Индикатор состояния схемы»)', [
    ['старт: черновик с чужими правками', null, { publish: 'draft', status: { state: 'draft', text: 'Черновик: правки Игорь Петров от 01.10.2026, 11:40', clickable: true, editing: '' } }],
    ['своя правка — автор и дата последних правок', async (K) => { await K.toggle('skipExpertise'); await K.settled() },
      { 'status.text': 'Черновик: правки Анна Смирнова от 03.10.2026, 09:00', 'status.clickable': true, writes: 1 }],
    ['клик по индикатору открывает дифф', K => K.statusOpen(), { surface: 'publish', modalTitle: 'Публикация схемы', 'diff.areas.0': { id: 'settings', count: '2 изменения', tone: 'changed' }, versions: 2 }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-04': ['«Предпросмотр» открывает заглушку демо-осмотра (r2 §3, §9)', [
    ['«Предпросмотр»', K => K.act('preview'), { notices: ['Демо-осмотр — вне стенда'], surface: '', writes: 0, versions: 2 }],
  ]],
  'СС-05': ['публикация: дифф-гейт — сводка по четырём областям, «Требует внимания» сверху, детали свёрнуты, подтверждение рождает снимок, current меняется, индикатор «Всё опубликовано» (r2 §2; аудит, «Как устроен дифф», «Масштабируемость диффа»)', [
    ['«Опубликовать схему» — гейт с диффом, детали свёрнуты', K => K.publish(), { surface: 'publish', modalTitle: 'Публикация схемы', modalSub: 'Эти изменения войдут в новую версию и будут применяться к новым осмотрам',
      diff: { attention: ['Удалён шаг «Страховой полис»'], warnings: [], areas: [{"id":"settings","count":"1 изменение","tone":"changed"},{"id":"form","count":"2 изменения","tone":"changed"},{"id":"processes","count":"−1 шаг","tone":"removed"},{"id":"showcase","count":"без изменений","tone":"none"}], open: [], total: 'Итого: 4 изменения в 3 разделах' }, confirmOff: false, versions: 2 }],
    ['раскрыть «Форма» — группы «Добавлено» и «Изменено»', K => K.area('form'), { 'diff.open': [{ id: 'form', groups: [
      { kind: 'added', title: 'Добавлено · 1', items: ['Поле «Цвет кузова» | группа «Автомобиль», алиас body_color'] },
      { kind: 'changed', title: 'Изменено · 1', items: ['Поле «Пробег»: обязательное | нет → да'] }] }] }],
    ['«Отменить» — версий по-прежнему две', K => K.act('publish-cancel'), { surface: '', versions: 2, current: 'v2', publish: 'draft', focusAct: 'publish' }],
    ['включить согласование — в диффе правка со следствием', async (K) => { await K.toggle('approval'); await K.settled(); await K.publish(); await K.area('settings') },
      { 'diff.areas.0': { id: 'settings', count: '2 изменения', tone: 'changed' }, 'diff.total': 'Итого: 5 изменений в 3 разделах',
        'diff.open.0.groups.0.items': ['Описание | Осмотр автомобиля перед оформлением полиса добровольного страхования → Комплексный осмотр автомобиля перед оформлением полиса добровольного страхования',
          'Отправлять поля на согласование согласующему лицу | выключено → включено | В процесс добавится этап согласования'] }],
    ['«Опубликовать» — снимок, новая текущая версия', K => K.act('publish-confirm'), { surface: '', versions: 3, current: 'v3', publish: 'published', dirty: false,
      status: { state: 'published', text: 'Всё опубликовано', clickable: false, editing: '' }, notices: ['Схема опубликована: версия от 03.10.2026, 09:00'] }],
    ['история: новая версия сверху', K => K.act('history'), { surface: 'history', 'historyRows.0': { id: 'v3', text: 'Версия от 03.10.2026, 09:00 Опубликовал(а) Анна Смирнова · 0 осмотров Текущая', current: true }, 'historyRows.1.current': false }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-06': ['первая публикация: подтверждение без диффа со сводкой настроенного (r2 §2; аудит, «Первая публикация ≠ дифф»)', [
    ['«Опубликовать схему»', K => K.publish(), { surface: 'first-publish', modalTitle: 'Первая публикация схемы', diff: null, confirmOff: false,
      firstSummary: ['Настройки — настроены', 'Форма — 0 полей в 0 группах', 'Процессы — 0 шагов в 0 процессах', 'Витрина — требует оформления'] }],
    ['«Отмена»', K => K.act('first-cancel'), { surface: '', versions: 0, publish: 'never' }],
    ['«Опубликовать» — первая версия', async (K) => { await K.publish(); await K.act('first-confirm') },
      { surface: '', versions: 1, current: 'v1', publish: 'published', 'status.text': 'Всё опубликовано', notices: ['Схема опубликована: версия от 03.10.2026, 09:00'] }],
    ['повторное нажатие — публиковать нечего', K => K.publish(), { surface: '', versions: 1, notices: ['Публиковать нечего: изменений нет'] }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  'СС-07': ['меню «⋯»: экспорт, дамп, копия, удаление — пункты с уведомлением-заглушкой, удаление с подтверждением (r2 §3)', [
    ['открыть меню', K => K.menu(), { menuItems: ['Экспортировать схему', 'Скачать дамп', 'Сделать копию', 'Сбросить черновик к текущей версии', 'Удалить схему'] }],
    ['«Экспортировать схему»', K => K.act('menu').then(() => K.menu('export')), { notices: ['Экспорт схемы — вне стенда'], menuItems: [] }],
    ['«Скачать дамп»', K => K.menu('dump'), { notices: ['Дамп схемы — вне стенда'] }],
    ['«Сделать копию»', K => K.menu('copy'), { notices: ['Копия схемы — вне стенда'] }],
    ['«Удалить схему» — подтверждение', K => K.menu('delete'), { surface: 'delete', modalTitle: 'Удалить схему?', notices: [] }],
    ['«Отмена»', K => K.act('delete-cancel'), { surface: '', notices: [], versions: 2 }],
    ['«Удалить»', async (K) => { await K.menu('delete'); await K.act('delete-confirm') }, { surface: '', notices: ['Удаление схемы — вне стенда'], versions: 2, writes: 0 }],
  ]],
  'СС-08': ['чистый черновик: индикатор «Всё опубликовано», перехода в дифф нет (r2 §2, состояние 3; аудит, «Дифф вместо переключателя»)', [
    ['сбросить черновик — он чистый', async (K) => { await K.menu('reset'); await K.act('reset-confirm'); await K.settled() },
      { dirty: false, publish: 'published', status: { state: 'published', text: 'Всё опубликовано', clickable: false, editing: '' } }],
    ['«Опубликовать схему» — диффа нет, уведомление', K => K.publish(), { surface: '', notices: ['Публиковать нечего: изменений нет'], versions: 2 }],
    ['правка возвращает черновик', async (K) => { await K.toggle('skipExpertise'); await K.settled() }, { dirty: true, 'status.state': 'draft', 'status.clickable': true }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-45': ['история версий: сайд из шапки, current сверху, снимки с датой публикации и числом осмотров (r2 §2; аудит, «Список версий = read-only история публикаций»)', [
    ['«История версий»', K => K.act('history'), { surface: 'history', modalTitle: 'История версий', headerType: 'close', focusInSide: true, historyEmpty: null, historyRows: [
      { id: 'v2', text: 'Версия от 22.09.2026, 16:05 Опубликовал(а) Игорь Петров · 41 осмотр Текущая', current: true },
      { id: 'v1', text: 'Версия от 14.08.2026, 10:20 Опубликовал(а) Анна Смирнова · 128 осмотров', current: false }] }],
    ['Esc закрывает, фокус на «Истории версий»', K => K.key('Escape'), { surface: '', focusAct: 'history', writes: 0 }],
  ]],
  'СС-45/новая': ['история версий у новой схемы — «Публикаций ещё не было» (r2 §2, §8; аудит, «Пустые состояния»)', [
    ['«История версий»', K => K.act('history'), { surface: 'history', historyRows: [], historyEmpty: 'Публикаций ещё не было' }],
  ], { query: 'data=new' }],
  'СС-46': ['история: клик по версии — её дифф с предыдущей вторым слоем сайда, «← назад», «Сделать копию» (r2 §2; аудит, «Два режима одного дифф-компонента»)', [
    ['версия от 22.09 — второй слой с диффом', async (K) => { await K.act('history'); await K.version('v2') }, { surface: 'history', headerType: 'back', modalTitle: 'Версия от 22.09.2026, 16:05', modalSub: 'Опубликовал(а) Игорь Петров · 41 осмотр',
      'diff.areas': [{ id: 'settings', count: '1 изменение', tone: 'changed' }, { id: 'form', count: '2 изменения', tone: 'changed' }, { id: 'processes', count: '6 изменений', tone: 'changed' }, { id: 'showcase', count: '4 изменения', tone: 'changed' }],
      'diff.total': 'Итого: 13 изменений в 4 разделах', 'diff.attention': [], sideActs: ['version-copy'], versionFirst: false }],
    ['раскрыть «Процессы и шаги»', K => K.area('processes'), { 'diff.open.0.groups.0': { kind: 'added', title: 'Добавлено · 4', items: ['Шаг «VIN на металле» | процесс «Осмотр автомобиля»', 'Шаг «Вид справа» | процесс «Осмотр автомобиля»', 'Процесс «Осмотр документов» | 2 шага', 'Процесс «Осмотр повреждений» | 0 шагов'] } }],
    ['«←» — назад к списку', K => K.backLayer(), { headerType: 'close', modalTitle: 'История версий', 'historyRows.length': 2 }],
    ['первая версия — сравнивать не с чем; «Открыть версию» есть', K => K.version('v1'), { headerType: 'back', modalTitle: 'Версия от 14.08.2026, 10:20', versionFirst: true, diff: null, sideActs: ['version-copy', 'version-view'] }],
    ['«Сделать копию»', K => K.act('version-copy'), { notices: ['Копия схемы — вне стенда'], versions: 2, writes: 0 }],
  ]],
  'СС-47': ['просмотр прошлой версии: плашка с датой и числом осмотров, поля только для чтения, табы и навигатор работают, «Перейти к текущей версии», «Сделать копию»; индикатора черновика и «Опубликовать схему» нет (r2 §2, состояние 7)', [
    ['история → версия от 14.08 → «Открыть версию»', async (K) => { await K.act('history'); await K.version('v1'); await K.act('version-view') },
      { viewing: 'v1', surface: '', status: null, headerActs: ['history', 'view-copy', 'view-leave'], readonly: true,
        banner7: 'Вы смотрите версию от 14.08.2026, 10:20, по ней проведено 128 осмотров. Текущая — от 22.09.2026, 16:05. Настройки открыты только для чтения',
        shownDescription: 'Осмотр автомобиля перед оформлением полиса', title: 'КАСКО — осмотр легкового автомобиля' }],
    ['нажатие по настройке — правки нет: клик доходит до флажка только для чтения', K => K.toggle('skipExpertise'), { 'g.behavior.skipExpertise': false, writes: 0, saveLog: [], dirty: true, focusRo: true, inertOnFields: false }],
    ['навигатор работает: раздел «PDF»', K => K.section('pdf'), { section: 'pdf', viewing: 'v1', readonly: true, 'templates.length': 2 }],
    ['таб «Форма»: поля группы только для чтения, действия под inert, выбор группы работает', async (K) => { await K.tab('form'); await K.group('g-car') },
      { tab: 'form', viewing: 'v1', 'form.group': 'Автомобиль', 'form.title': 'Автомобиль · 2 поля', 'form.settings': ['Car', '1-й экран', 'Всегда', 'Разрешено'],
        formRo: { noEdit: true, checks: true, actsInert: true, rowActsInert: true }, writes: 0 }],
    ['«Форма»: клик по флажку строки — выделения нет, фокус на флажке', K => K.rowCheck('f-vin'), { 'form.selected': 0, 'form.bar': null, focusRo: true, focusRow: 'f-vin', writes: 0 }],
    ['таб «Процессы и шаги» (такт 70): флажки только для чтения, действия, ручки и тип шага — под inert', K => K.tab('processes'),
      { tab: 'processes', viewing: 'v1', 'proc.cards': ['Осмотр автомобиля · 2 шага · auto_inspection'], procRo: { checks: true, actsInert: true, handlesInert: true, kindInert: true, rowActsInert: true }, writes: 0 }],
    ['протяжка ручкой и клик по флажку строки — порядок и выделение прежние', async (K) => { await K.dragRow('s-vin-glass', 's-front', 12); await K.stepCheck('s-front') },
      { 'proc.rows.p-auto': ['1 · VIN под стеклом · Основной · 1 фото · Распознавание VIN, Распознавание шильдиков · Не установлена · Обязательный',
        '2 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · Не установлена · Обязательный'], 'proc.selected': 0, 'proc.bar': null, focusStep: 's-front', writes: 0, saveLog: [] }, { blind: true }],
    ['таб «Витрина» (такт 72): поля только для чтения, действия под inert, крестиков у модулей нет', K => K.tab('showcase'),
      { tab: 'showcase', viewing: 'v1', 'showcase.title': '', 'showcase.ro': { fields: true, actsInert: true, removable: 0 }, writes: 0 }],
    ['«Витрина»: клик в продающее название и набор — правки нет', K => K.tryType('scTitle'), { 'showcase.title': '', focusRo: true, writes: 0, saveLog: [] }],
    ['табы работают', async (K) => { await K.tab('settings') }, { tab: 'settings', viewing: 'v1' }],
    ['«Сделать копию»', K => K.act('view-copy'), { notices: ['Копия схемы — вне стенда'], viewing: 'v1' }],
    ['«Перейти к текущей версии» — снова черновик', K => K.act('view-leave'), { viewing: '', readonly: false, banner7: null, 'status.state': 'draft', headerActs: ['history', 'preview', 'publish', 'menu'] }],
  ]],
  'СС-47/вход': ['просмотр прошлой версии — вход адресом, как из осмотра, прошедшего по старому снимку (r2 §2, состояние 7)', [
    ['старт', null, { viewing: 'v1', readonly: true, status: null, headerActs: ['history', 'view-copy', 'view-leave'], shownDescription: 'Осмотр автомобиля перед оформлением полиса', inertOnFields: false }],
    ['«Наименование»: значение выделяется протяжкой мыши', K => K.selectText(Q.nameInput),
      { sel: 'КАСКО — осмотр легкового автомобиля', selRange: [0, 35], focusField: 'name', focusRo: true }],
    ['«Наименование»: клик и набор знака — правки нет', K => K.tryType('name'),
      { name: 'КАСКО — осмотр легкового автомобиля', focusRo: true, writes: 0, saveLog: [] }],
    ['«Наименование»: Backspace и Delete — правки нет', K => K.tryErase(),
      { name: 'КАСКО — осмотр легкового автомобиля', focusField: 'name', writes: 0, saveLog: [] }],
    ['«Описание»: значение выделяется', K => K.selectText(`document.querySelector('[data-field=description] textarea')`),
      { sel: 'Осмотр автомобиля перед оформлением полиса', selRange: [0, 42], focusField: 'description' }],
    ['«Тип схемы»: значение выделяется', K => K.selectText(`document.querySelector('[data-field=schemeType] [data-slot=field-input]')`),
      { sel: 'Осмотр транспорта', typeValue: 'Осмотр транспорта' }],
    ['«Тип схемы»: клик, Enter, пробел и стрелка — список не открывается, фокус на поле', K => K.tryOpen('schemeType'),
      { listOpen: false, typeValue: 'Осмотр транспорта', focusField: 'schemeType', focusRo: true, writes: 0 }],
    ['флажок «Пропускать экспертизу»: клик по подписи, по контролу и пробел — правки нет', K => K.tryToggle('skipExpertise'),
      { 'g.behavior.skipExpertise': false, focusRo: true, writes: 0, saveLog: [] }],
    ['подпись флажка выделяется', K => K.selectText(`document.querySelector('[data-setting=skipExpertise] [data-slot=choice-title]')`),
      { sel: 'Пропускать экспертизу' }],
  ], { query: 'view=v1' }],
  'СС-48': ['валидация: блок предупреждений в диффе; критичное выключает «Опубликовать» с причиной (r2 §8; аудит, «Валидационный гейт публикации»)', [
    ['формула с переменной, которой нет в форме, — предупреждение, публикация доступна', async (K) => { await K.formulaEnd('zipName'); await K.paste('zipName', '_{Car:colour}'); await K.settled(); await K.publish() },
      { surface: 'publish', 'diff.warnings': [{ text: 'Формула имени zip-архива ссылается на переменную {Car:colour}, которой нет в форме', critical: false }], confirmOff: false }],
    ['пустое наименование — критичное: «Опубликовать» выключена', async (K) => { await K.act('publish-cancel'); await K.clear('[data-field=name]'); await K.settled(); await K.publish() },
      { surface: 'publish', name: '', confirmOff: true, 'diff.warnings': [{ text: 'Наименование схемы не заполнено — публикация невозможна', critical: true }, { text: 'Формула имени zip-архива ссылается на переменную {Car:colour}, которой нет в форме', critical: false }] }],
    ['нажатие по выключенной «Опубликовать» — снимка нет', K => K.act('publish-confirm'), { surface: 'publish', versions: 2 }, { blind: true }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-48/первая': ['валидация в первой публикации: согласование без полей — предупреждение (аудит, «Валидационный гейт публикации»)', [
    ['включить согласование и открыть первую публикацию', async (K) => { await K.toggle('approval'); await K.settled(); await K.publish() },
      { surface: 'first-publish', 'diff.warnings': [{ text: 'Согласование включено, поля для согласования не отмечены', critical: false }], confirmOff: false }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  'СС-50': ['presence: «Сейчас редактирует {кто}» (r2 §2, состояние 6)', [
    ['старт', null, { status: { state: 'draft', text: 'Черновик: правки Игорь Петров от 01.10.2026, 11:40', clickable: true, editing: 'Сейчас редактирует Игорь Петров' }, save: 'saved' }],
  ], { query: 'presence=1' }],
  'СС-51': ['«Сбросить черновик к текущей версии»: окно показывает, что сбрасывается; после сброса черновик равен current (r2 §2; аудит, «Конкурентный доступ к черновику»)', [
    ['меню → «Сбросить черновик к текущей версии»', K => K.menu('reset'), { surface: 'reset', modalTitle: 'Сбросить черновик?', modalSub: 'Черновик вернётся к текущей версии от 22.09.2026, 16:05. Будет сброшено:',
      'diff.areas': [{"id":"settings","count":"1 изменение","tone":"changed"},{"id":"form","count":"2 изменения","tone":"changed"},{"id":"processes","count":"−1 шаг","tone":"removed"},{"id":"showcase","count":"без изменений","tone":"none"}], 'diff.total': 'Итого: 4 изменения в 3 разделах', 'diff.attention': ['Удалён шаг «Страховой полис»'] }],
    ['«Отмена» — черновик прежний', K => K.act('reset-cancel'), { surface: '', dirty: true, writes: 0 }],
    ['«Сбросить черновик» — черновик равен текущей версии', async (K) => { await K.menu('reset'); await K.act('reset-confirm'); await K.settled() },
      { surface: '', dirty: false, publish: 'published', 'status.text': 'Всё опубликовано', notices: ['Черновик сброшен к текущей версии'], saveLog: ['saving', 'saved'],
        shownDescription: 'Осмотр автомобиля перед оформлением полиса добровольного страхования', versions: 2 }],
    ['сбрасывать нечего — уведомление', K => K.menu('reset'), { surface: '', notices: ['Сбрасывать нечего: черновик совпадает с текущей версией'] }],
  ], { query: 'now=2026-10-03T09:00:00' }],
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
    /* Без ожидания конца записи (такт 67): клик по списку приходится на смену статуса сохранения — строка шапки не меняет высоту. */
    ['формула имени файла: переменная «Номер осмотра»', async (K) => { await K.formulaEnd('pdfFileName'); await K.type(' '); await K.addVariable('pdfFileName', 'Inspection:number'); await K.settled() },
      { 's.pdf.fileName': 'Лист осмотра {Car:vin} {Inspection:number}', 'formulas.pdfFileName': { chips: ['VIN', 'Номер осмотра'], preview: 'Лист осмотра DEMO0000000001024 № 1024' }, headerH: 44 }],
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
    ['сайд поля (такт 69): «Добавить поле», Tab по кругу — фокус в сайде', async (K) => { await K.tab('form'); await K.act('field-add'); await K.tabs(30) }, { surface: 'field', focusInSide: true }],
    ['заголовок введён, Esc — поле не добавлено, фокус на «Добавить поле»', async (K) => { await K.typeInto('fdTitle', 'Черновик поля'); await K.key('Escape') },
      { surface: '', 'form.title': 'Заявка · 3 поля', writes: 0, focusAct: 'field-add' }],
    ['сайд группы: карандаш, Esc — фокус на карандаше', async (K) => { await K.act('group-edit'); await K.typeInto('gdTitle', ' плюс'); await K.key('Escape') },
      { surface: '', 'form.groups.0': 'Заявка', writes: 0, focusAct: 'group-edit' }],
    ['сайд процесса (такт 71): «Изменить процесс», Tab по кругу — фокус в сайде', async (K) => { await K.tab('processes'); await K.processAct('p-auto', 'process-edit'); await K.tabs(30) },
      { surface: 'process', focusIn: 'process' }],
    ['название, Esc — процесс прежний, фокус на «Изменить процесс»', async (K) => { await K.typeInto('pdTitle', ' плюс'); await K.key('Escape') },
      { surface: '', 'proc.cards.0': 'Осмотр автомобиля · 4 шага · auto_inspection', writes: 0, focusAct: 'process-edit' }],
    ['сайд шага: карандаш строки, Tab по кругу, Esc — фокус на строке шага', async (K) => { await K.stepEdit('s-vin-metal'); await K.tabs(40); await K.key('Escape') },
      { surface: '', focusStep: 's-vin-metal', writes: 0 }],
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
  /* ============================ П6, такт 69: «Форма» ============================ */
  'СС-34': ['форма: выбор группы, настройки группы, «Добавить группу» (r2 §5; макет `32765:5584`, блок `33179:4467`)', [
    ['старт: группы, выбрана первая, настройки группы только для чтения', null, { tab: 'form', 'form.groups': ['Заявка', 'Автомобиль', 'Кузов и комплектация'], 'form.group': 'Заявка',
      'form.settings': ['Lead', '1-й экран', 'После создания', 'Разрешено'], 'form.title': 'Заявка · 3 поля', 'form.rows.length': 3, 'form.bar': null }],
    ['выбрать «Кузов и комплектация» — поля и настройки группы', K => K.group('g-body'),
      { 'form.group': 'Кузов и комплектация', 'form.settings': ['Body', '2-й экран', 'После создания', 'Разрешено'], 'form.title': 'Кузов и комплектация · 4 поля',
        'form.rows': ['1 · Тип кузова · body_type · Выбор · Обязательное', '2 · Комплектация · trim · Выбор · Зависимое', '3 · Повреждения кузова · has_damage · Чекбокс', '4 · Год выпуска · year · Число'], writes: 0 }],
    ['«Добавить группу» — сайд новой группы', K => K.act('group-add'), { surface: 'group', sideTitle: 'Новая группа', writes: 0 }],
    ['пустое название — отказ, сайд открыт', K => K.act('group-save'), { notices: ['Заполните название группы'], surface: 'group', 'form.groups.length': 3, writes: 0 }],
    ['название «Документы», алиас по названию, экран создания — добавить', async (K) => { await K.typeInto('gdTitle', 'Документы'); await K.act('group-alias-suggest'); await K.select('gdScreen', 'Не показывать при создании'); await K.act('group-save'); await K.settled() },
      { surface: '', 'form.groups': ['Заявка', 'Автомобиль', 'Кузов и комплектация', 'Документы'], 'form.group': 'Документы', 'form.settings': ['Dokumenty', 'Не показывать при создании', 'После создания', 'Разрешено'],
        'form.title': 'Документы · 0 полей', 'form.empty': 'В группе нет полей', saveLog: ['saving', 'saved'], writes: 1 }],
    ['удалить группу «Документы» — уведомление с «Отменить», выбрана соседняя', async (K) => { await K.act('group-delete'); await K.settled() },
      { notices: ['Группа «Документы» удалена'], 'form.groups.length': 3, 'form.group': 'Кузов и комплектация', writes: 2 }],
    ['«Отменить» возвращает группу', async (K) => { await K.undo(); await K.settled() }, { 'form.groups.length': 4, 'form.group': 'Документы', writes: 3 }],
  ], { query: 'tab=form' }],
  'СС-35': ['форма: добавить поле; удалить поле — toast с «Отменить» (r2 §5; аудит, «Отмена при автосейве»)', [
    ['старт: группа «Автомобиль»', null, { 'form.group': 'Автомобиль', 'form.title': 'Автомобиль · 4 поля' }],
    ['«Добавить поле» — сайд нового поля, номер — следующий', K => K.act('field-add'), { surface: 'field', sideTitle: 'Новое поле', 'steppers.fdOrder': 5, 'fieldSide.choices': false, writes: 0 }],
    ['пустой заголовок — отказ, сайд открыт', K => K.act('field-save'), { notices: ['Заполните заголовок поля'], surface: 'field', 'form.title': 'Автомобиль · 4 поля', writes: 0 }],
    ['заголовок и тип «Выбор» — появилась секция вариантов', async (K) => { await K.typeInto('fdTitle', 'Цвет салона'); await K.select('fdType', 'Выбор') },
      { 'fieldSide.choices': true, 'fieldSide.legends': ['Основное', 'Поведение и видимость', 'Варианты выбора', 'Валидация и подсказки'], writes: 0 }],
    ['«Добавить поле» — строка в конце группы, алиас пуст', async (K) => { await K.act('field-save'); await K.settled() },
      { surface: '', 'form.title': 'Автомобиль · 5 полей', 'form.rows.4': '5 · Цвет салона · не задан · Выбор', saveLog: ['saving', 'saved'], writes: 1 }],
    ['удалить «Цвет салона» из меню строки — уведомление с «Отменить»', async (K) => { await K.rowDelete('f-new-1'); await K.settled() },
      { notices: ['Поле «Цвет салона» удалено'], 'form.title': 'Автомобиль · 4 поля', writes: 2 }],
    ['«Отменить» возвращает поле на место', async (K) => { await K.undo(); await K.settled() }, { 'form.title': 'Автомобиль · 5 полей', 'form.rows.4': '5 · Цвет салона · не задан · Выбор', writes: 3 }],
  ], { query: 'tab=form&group=g-car' }],
  'СС-36': ['форма: массовый выбор полей и панель действий; «Заполнить алиасы автоматически» трогает только пустые; toast «Применено к N · Отменить» (r2 §5, §8; аудит, «Отмена при автосейве»)', [
    ['два поля без алиаса', async (K) => { await K.addField('Цвет салона'); await K.addField('Тип топлива') },
      { 'form.rows.4': '5 · Цвет салона · не задан · Текст', 'form.rows.5': '6 · Тип топлива · не задан · Текст', writes: 2 }],
    ['«Заполнить алиасы автоматически» — только пустые', async (K) => { await K.act('fill-aliases'); await K.settled() },
      { notices: ['Применено к 2 полям'], 'form.rows': ['1 · VIN · vin · Текст · Обязательное, Согласование', '2 · Госномер · regnum · Текст · Обязательное, Согласование', '3 · Пробег · mileage · Число · Обязательное',
        '4 · Цвет кузова · body_color · Текст', '5 · Цвет салона · tsvet_salona · Текст', '6 · Тип топлива · tip_topliva · Текст'], writes: 3 }],
    ['«Отменить» — алиасы снова пусты, заданные прежние', async (K) => { await K.undo(); await K.settled() },
      { 'form.rows.3': '4 · Цвет кузова · body_color · Текст', 'form.rows.4': '5 · Цвет салона · не задан · Текст', 'form.rows.5': '6 · Тип топлива · не задан · Текст', writes: 4 }],
    ['заполнить ещё раз, затем повторно — пустых нет', async (K) => { await K.act('fill-aliases'); await K.settled(); await K.act('fill-aliases') },
      { notices: ['Применено к 2 полям', 'Пустых алиасов нет: заданные не меняются'], 'form.rows.5': '6 · Тип топлива · tip_topliva · Текст', writes: 5 }],
    ['выбрать VIN и «Пробег» — панель массовых действий', async (K) => { await K.rowCheck('f-vin'); await K.rowCheck('f-mileage') },
      { 'form.bar': 'Выбрано: 2 поля', 'form.selected': 2, 'form.all': 'mixed', writes: 5 }],
    ['«Сделать необязательными» — уведомление «Применено к 2 полям»', async (K) => { await K.act('bulk-optional'); await K.settled() },
      { notices: ['Применено к 2 полям'], 'form.rows.0': '1 · VIN · vin · Текст · Согласование', 'form.rows.2': '3 · Пробег · mileage · Число', 'form.bar': 'Выбрано: 2 поля', writes: 6 }],
    ['«Отменить» — обязательность вернулась', async (K) => { await K.undo(); await K.settled() },
      { 'form.rows.0': '1 · VIN · vin · Текст · Обязательное, Согласование', 'form.rows.2': '3 · Пробег · mileage · Число · Обязательное', writes: 7 }],
    ['«Только для web» — метка у выбранных', async (K) => { await K.act('bulk-web'); await K.settled() },
      { notices: ['Применено к 2 полям'], 'form.rows.2': '3 · Пробег · mileage · Число · Обязательное, Только web', writes: 8 }],
    ['флажок «все» — выбраны все шесть', K => K.fieldsAll(), { 'form.bar': 'Выбрано: 6 полей', 'form.selected': 6, 'form.all': 'true' }],
    ['«Удалить» — все поля группы, уведомление с «Отменить»', async (K) => { await K.act('bulk-delete'); await K.settled() },
      { notices: ['Удалено 6 полей'], 'form.title': 'Автомобиль · 0 полей', 'form.empty': 'В группе нет полей', 'form.bar': null, writes: 9 }],
    ['«Отменить» — поля на месте', async (K) => { await K.undo(); await K.settled() }, { 'form.title': 'Автомобиль · 6 полей', 'form.selected': 0, 'form.bar': null, writes: 10 }],
    ['«Снять выделение»', async (K) => { await K.rowCheck('f-plate'); await K.act('bulk-clear') }, { 'form.bar': null, 'form.selected': 0 }],
  ], { query: 'tab=form&group=g-car' }],
  'СС-37': ['сайд поля: четыре секции; «Варианты выбора» — только у типа с выбором; «Отправлять на согласование» выключено с причиной; «Сохранить» применяет, признак «зависимое» виден в строке (r2 §5; аудит, «Сайд „Редактирование поля“ — эталон»)', [
    ['карандаш у «Года выпуска» — сайд с тремя секциями: тип без выбора', K => K.rowEdit('f-year'),
      { surface: 'field', sideTitle: 'Редактирование поля — Год выпуска', 'fieldSide.legends': ['Основное', 'Поведение и видимость', 'Валидация и подсказки'],
        'fieldSide.title': 'Год выпуска', 'fieldSide.alias': 'year', 'fieldSide.type': 'Число', 'steppers.fdOrder': 4,
        'fieldSide.checks.fdApproval': { checked: false, off: true, sub: 'Сначала включите согласование в разделе Настройки' }, 'fieldSide.help': ['fdNoConfidential'],
        'fieldSide.step': [32, 32, 32, 48, 32] }],
    ['тип «Выбор» — четыре секции', K => K.select('fdType', 'Выбор'), { 'fieldSide.legends': ['Основное', 'Поведение и видимость', 'Варианты выбора', 'Валидация и подсказки'], 'fieldSide.choices': true }],
    ['тип «Число», «Отмена» — полотно прежнее', async (K) => { await K.select('fdType', 'Число'); await K.act('field-cancel') },
      { surface: '', fieldSide: null, 'form.rows.3': '4 · Год выпуска · year · Число', writes: 0 }],
    ['«Повреждения кузова»: тип «Выбор», зависит от «Тип кузова», номер 1 — «Сохранить»: признак «зависимое» в строке', async (K) => { await K.rowEdit('f-damage'); await K.select('fdType', 'Выбор'); await K.typeInto('fdOptions', 'none|Нет\nlight|Лёгкие'); await K.select('fdDepends', 'Тип кузова'); await K.stepper('fdOrder', 'Уменьшить'); await K.stepper('fdOrder', 'Уменьшить'); await K.act('field-save'); await K.settled() },
      { surface: '', 'form.rows': ['1 · Повреждения кузова · has_damage · Выбор · Зависимое', '2 · Тип кузова · body_type · Выбор · Обязательное', '3 · Комплектация · trim · Выбор · Зависимое', '4 · Год выпуска · year · Число'],
        saveLog: ['saving', 'saved'], writes: 1 }],
    ['алиас кириллицей — отказ с ошибкой поля', async (K) => { await K.rowEdit('f-body-type'); await K.fill('[data-field=fdAlias]', 'тип кузова'); await K.act('field-save') },
      { notices: ['Алиас — латиницей без пробелов, первая — буква'], surface: 'field', writes: 1 }],
    ['«Предложить по названию» и «Сохранить»', async (K) => { await K.act('alias-suggest'); await K.act('field-save'); await K.settled() },
      { surface: '', 'form.rows.1': '2 · Тип кузова · tip_kuzova · Выбор · Обязательное', writes: 2 }],
    ['согласование включено в «Настройках» — у поля флажок доступен; отметить и сохранить', async (K) => { await K.tab('settings'); await K.toggle('approval'); await K.settled(); await K.tab('form'); await K.rowEdit('f-year'); await K.check('fdApproval'); await K.act('field-save'); await K.settled() },
      { surface: '', 'form.rows.3': '4 · Год выпуска · year · Число · Согласование', 'g.behavior.approval': true, writes: 4 }],
  ], { query: 'tab=form&group=g-body' }],
  'СС-58': ['сайд группы: открывается карандашом у списка групп; «Сохранить» меняет настройки группы в панели (r2 §5; аудит, «Принцип: всё редактирование сущности — в сайде»)', [
    ['карандаш — сайд группы «Автомобиль»', K => K.act('group-edit'), { surface: 'group', sideTitle: 'Настройки группы — Автомобиль', writes: 0 }],
    ['правки и «Отмена» — настройки прежние', async (K) => { await K.select('gdScreen', '2-й экран'); await K.select('gdMobile', 'Не показывать'); await K.check('gdEditable'); await K.act('group-cancel') },
      { surface: '', 'form.settings': ['Car', '1-й экран', 'Всегда', 'Разрешено'], writes: 0, saveLog: [] }],
    ['правки и «Сохранить» — настройки в панели', async (K) => { await K.act('group-edit'); await K.select('gdScreen', '2-й экран'); await K.select('gdMobile', 'Не показывать'); await K.check('gdEditable'); await K.act('group-save'); await K.settled() },
      { surface: '', 'form.settings': ['Car', '2-й экран', 'Не показывать', 'Запрещено'], 'form.group': 'Автомобиль', saveLog: ['saving', 'saved'], writes: 1 }],
    ['переименовать группу — название в списке и в заголовке панели', async (K) => { await K.act('group-edit'); await K.fill('[data-field=gdTitle]', 'Транспортное средство'); await K.act('group-save'); await K.settled() },
      { 'form.groups': ['Заявка', 'Транспортное средство', 'Кузов и комплектация'], 'form.title': 'Транспортное средство · 4 поля', writes: 2 }],
  ], { query: 'tab=form&group=g-car' }],
  'СС-60': ['«Вставить из другой схемы»: кнопка даёт уведомление-заглушку (r2 §8; аудит, «„Вставить поле из другой схемы“ → типовой паттерн „выбор из справочника“»)', [
    ['«Вставить из другой схемы»', K => K.act('field-paste'), { notices: ['Выбор поля из другой схемы — вне стенда'], surface: '', 'form.title': 'Заявка · 3 поля', writes: 0 }],
    ['«Процессы и шаги» (такт 70): «Вставить шаг из другой схемы»', async (K) => { await K.tab('processes'); await K.act('step-paste') },
      { notices: ['Выбор шага из другой схемы — вне стенда'], surface: '', 'proc.cards.0': 'Осмотр автомобиля · 4 шага · auto_inspection', writes: 0 }],
  ], { query: 'tab=form' }],
  /* ============================ П7, часть 1, такт 70 ============================ */
  'СС-38': ['процессы: карточки процессов; добавить и изменить процесс в сайде — три секции макета, «Сохранить» одной записью, «Отмена» отбрасывает; «Открыть процесс» у повторяемого — оверлей (r2 §6, §7; макеты `33245:5722`, `33245:6032`)', [
    ['старт: три процесса, шаги таблицами', null, { 'proc.cards': ['Осмотр автомобиля · 4 шага · auto_inspection', 'Осмотр документов · 1 шаг · docs_inspection',
      'Осмотр повреждений · 0 шагов · damage_inspection · повторяемый · открыть'], 'proc.rows': { 'p-auto': ["1 · VIN под стеклом · Основной · 1 фото · Распознавание VIN, Распознавание шильдиков · 5 · Все установлены · Обязательный","2 · VIN на металле · Основной · 1 фото · Распознавание VIN · Не установлена · Обязательный","3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный","4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена"], 'p-docs': ["1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · Не установлена · Из галереи, Скан документов"], 'p-damage': [] },
      'proc.bar': null, writes: 0 }],
    ['«Добавить процесс» — сайд «Добавление процесса»: «Основное», «Поведение», «Подсказки»; номер — следующий', K => K.act('process-add'),
      { surface: 'process', focusIn: 'process', procSide: { title: 'Добавление процесса', legends: ['Основное', 'Поведение', 'Подсказки'], name: '', alias: '', order: 4, flags: [], objectType: 'Не выбран', icon: 'Загрузить иконку SVG или PNG · или перетащите файл сюда', duration: 'Автоматически' }, writes: 0 }],
    ['пустое название — отказ, сайд открыт', K => K.act('process-save'), { notices: ['Заполните название процесса'], surface: 'process', writes: 0 }],
    ['«Осмотр салона», алиас по названию, повторяемый, иконка — «Добавить процесс»', async (K) => {
      await K.typeInto('pdTitle', 'Осмотр салона'); await K.act('process-alias-suggest'); await K.check('pdRepeatable'); await K.act('process-icon'); await K.act('process-save'); await K.settled() },
      { surface: '', notices: [], 'proc.cards.3': 'Осмотр салона · 0 шагов · osmotr_salona · повторяемый · открыть', saveLog: ['saving', 'saved'], writes: 1, focusAct: 'process-add' }],
    ['«Изменить процесс» у «Осмотра документов» — сайд «Редактирование процесса — …» со значениями процесса', K => K.processAct('p-docs', 'process-edit'),
      { surface: 'process', 'procSide.title': 'Редактирование процесса — Осмотр документов', 'procSide.name': 'Осмотр документов', 'procSide.alias': 'docs_inspection', 'procSide.order': 2, 'procSide.flags': [], writes: 1 }],
    ['правки и «Отмена» — полотно прежнее, фокус на «Изменить процесс»', async (K) => { await K.typeInto('pdTitle', ' ТС'); await K.check('pdHidden'); await K.act('process-cancel') },
      { surface: '', 'proc.cards.1': 'Осмотр документов · 1 шаг · docs_inspection', procHidden: [], writes: 1, focusAct: 'process-edit' }],
    ['снова: название, «Скрытый процесс», тип объекта, номер 1 — «Сохранить» одной записью', async (K) => {
      await K.processAct('p-docs', 'process-edit'); await K.typeInto('pdTitle', ' ТС'); await K.check('pdHidden'); await K.select('pdObjectType', 'Документ'); await K.stepper('pdOrder', 'Уменьшить'); await K.act('process-save'); await K.settled() },
      { surface: '', 'proc.cards.0': 'Осмотр документов ТС · 1 шаг · docs_inspection', 'proc.cards.1': 'Осмотр автомобиля · 4 шага · auto_inspection', procHidden: ['p-docs'], saveLog: ['saving', 'saved'], writes: 2 }],
    ['дифф публикации: название, настройки процесса, порядок процессов, новый процесс', async (K) => { await K.publish(); await K.area('processes') },
      { surface: 'publish', 'diff.open.0.groups': [
        { kind: 'added', title: 'Добавлено · 1', items: ['Процесс «Осмотр салона» | 0 шагов'] },
        { kind: 'changed', title: 'Изменено · 3', items: ['Процесс «Осмотр документов»: название | Осмотр документов → Осмотр документов ТС', 'Процесс «Осмотр документов ТС»: настройки процесса | скрытый: нет, тип объекта: пусто → скрытый: да, тип объекта: Документ', 'Порядок процессов | Осмотр автомобиля, Осмотр документов, Осмотр повреждений → Осмотр документов ТС, Осмотр автомобиля, Осмотр повреждений'] },
        { kind: 'removed', title: 'Удалено · 1', items: ['Шаг «Страховой полис» | процесс «Осмотр документов ТС»'] }] }],
    ['«Открыть процесс» у повторяемого — полноэкранный оверлей', async (K) => { await K.act('publish-cancel'); await K.processAct('p-damage', 'process-open') },
      { surface: 'process-overlay', surfaces: ['process-overlay'], 'overlay.title': 'Осмотр повреждений', 'overlay.full': true, 'overlay.placement': 'full', writes: 2 }],
    ['«Заполнить изображения» — вне стенда (r2 §9)', async (K) => { await K.key('Escape'); await K.act('fill-images') }, { surface: '', notices: ['Массовая заливка изображений — вне стенда'], writes: 2 }],
  ], { query: 'tab=processes' }],
  'СС-39': ['процессы: массовый выбор шагов сквозь процессы, флаги в трёх состояниях, фото, нейросети; toast «Применено к N · Отменить» (r2 §6; аудит, «Отмена при автосейве»)', [
    ['выбрать два шага «Осмотра автомобиля» и ПТС — панель «Выбрано: 3 шага», флаги трёх состояний', async (K) => { await K.stepCheck('s-vin-glass'); await K.stepCheck('s-vin-metal'); await K.stepCheck('s-pts') },
      { 'proc.bar': 'Выбрано: 3 шага', 'proc.selected': 3, 'proc.all': { 'p-auto': 'mixed', 'p-docs': 'true' },
        'proc.flags': { required: 'mixed', hidden: 'false', gallery: 'mixed', web: 'false', noConfidential: 'false', docScan: 'mixed' }, writes: 0 }],
    ['«Обязательный» из «−» — ставит всем выбранным', async (K) => { await K.flag('required'); await K.settled() },
      { notices: ['Применено к 3 шагам'], 'proc.flags.required': 'true', 'proc.rows.p-docs.0': "1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · Не установлена · Обязательный, Из галереи, Скан документов", saveLog: ['saving', 'saved'], writes: 1 }],
    ['«Отменить» — флаг снова у части', async (K) => { await K.undo(); await K.settled() },
      { 'proc.flags.required': 'mixed', 'proc.rows.p-docs.0': "1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · Не установлена · Из галереи, Скан документов", writes: 2 }],
    ['«Скрытый» из «нет» — ставит всем; повторно из «все» — снимает', async (K) => { await K.flag('hidden'); await K.settled(); await K.flag('hidden'); await K.settled() },
      { notices: ['Применено к 3 шагам', 'Применено к 3 шагам'], 'proc.flags.hidden': 'false', 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · Не установлена · Обязательный", writes: 4 }],
    ['«Фото» — способ съёмки «2 фото» у выбранных', async (K) => { await K.select('bulkMethod', '2 фото'); await K.settled() },
      { notices: ['Применено к 3 шагам'], 'proc.rows.p-auto.0': "1 · VIN под стеклом · Основной · 2 фото · Распознавание VIN, Распознавание шильдиков · 5 · Все установлены · Обязательный", 'proc.rows.p-auto.2': "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", writes: 5 }],
    /* Уведомления прежних шагов живут 3 с: «Отменить» ниже должно попасть в уведомление этого действия. */
    ['«Настроить нейросети» — сайд нейросетей выбранных шагов, флажки трёх состояний; недоступные компании выключены', async (K) => { await sleep(3200); await K.act('bulk-networks') },
      { surface: 'networks', 'netSide.sub': 'Выбрано: 3 шага', 'netSide.states': { 'Распознавание VIN': 'mixed', 'Распознавание шильдиков': 'mixed', 'Распознавание госномера': 'false',
        'Ракурсы авто · Передняя': 'false', 'Ракурсы авто · Правая сторона': 'false', 'Ракурсы авто · Левая сторона': 'false', 'Оценка повреждений': 'false', 'Сканер документов': 'mixed',
        'Детектор подмены снимка': 'off', 'Оценка износа шин': 'off' }, writes: 5 }],
    ['«Распознавание VIN» из «−» — всем; «Сохранить» — уведомление «Применено к 3 шагам»', async (K) => { await K.net('networks', 'Распознавание VIN'); await K.act('networks-save'); await K.settled() },
      { surface: '', notices: ['Применено к 3 шагам'], 'proc.rows.p-docs.0': '1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов, Распознавание VIN · Не установлена · Из галереи, Скан документов', writes: 6 }],
    ['«Отменить» — нейросети как были', async (K) => { await K.undo(); await K.settled() },
      { 'proc.rows.p-docs.0': '1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · Не установлена · Из галереи, Скан документов', writes: 7 }],
    ['снова: «Отмена» сайда — записи нет', async (K) => { await K.act('bulk-networks'); await K.net('networks', 'Оценка повреждений'); await K.act('networks-cancel') },
      { surface: '', notices: [], saveLog: [], writes: 7 }],
    ['флажок шапки «Осмотра автомобиля» — выбраны все его шаги', K => K.stepsAll('p-auto'), { 'proc.bar': 'Выбрано: 5 шагов', 'proc.all.p-auto': 'true', 'proc.selected': 5 }],
    ['«Удалить выбранные» — уведомление с «Отменить»', async (K) => { await K.act('steps-delete'); await K.settled() },
      { notices: ['Удалено 5 шагов'], 'proc.cards': ['Осмотр автомобиля · 0 шагов · auto_inspection', 'Осмотр документов · 0 шагов · docs_inspection',
        'Осмотр повреждений · 0 шагов · damage_inspection · повторяемый · открыть'], 'proc.bar': null, writes: 8 }],
    ['«Отменить» — шаги на месте, выделения нет', async (K) => { await K.undo(); await K.settled() },
      { 'proc.cards.0': 'Осмотр автомобиля · 4 шага · auto_inspection', 'proc.cards.1': 'Осмотр документов · 1 шаг · docs_inspection', 'proc.selected': 0, 'proc.bar': null, writes: 9 }],
    ['«Снять выделение»', async (K) => { await K.stepCheck('s-front'); await K.act('steps-clear') }, { 'proc.bar': null, 'proc.selected': 0, writes: 9 }],
  ], { query: 'tab=processes' }],
  'СС-40': ['фото-подсказка: инлайн-загрузка в ячейке, статус меняется на месте; тип шага — по месту (r2 §6; аудит, «Принцип: атрибут — инлайн по месту»)', [
    ['старт: «VIN на металле» — «Не установлена»', null, { 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · Не установлена · Обязательный", 'proc.upload': null }],
    ['«Загрузить» раскрывает загрузчик в ячейке, сайда нет', K => K.hint('s-vin-metal'), { 'proc.upload': 's-vin-metal', surface: '', writes: 0 }],
    ['нажатие на зону — подсказка загружена без «Сохранить», статус на месте, загрузчик свёрнут', async (K) => { await K.uploadZone('s-vin-metal'); await K.settled() },
      { 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · 1 · Все установлены · Обязательный", 'proc.upload': null, saveLog: ['saving', 'saved'], notices: [], writes: 1 }],
    ['«Редактировать» у «VIN под стеклом» — ещё одна подсказка', async (K) => { await K.hint('s-vin-glass'); await K.uploadZone('s-vin-glass'); await K.settled() },
      { 'proc.rows.p-auto.0': "1 · VIN под стеклом · Основной · 1 фото · Распознавание VIN, Распознавание шильдиков · 6 · Все установлены · Обязательный", writes: 2 }],
    ['тип шага в строке: «Вид справа» — «Техническое фото»', async (K) => { await K.stepKind('s-right', 'tech'); await K.settled() },
      { 'proc.rows.p-auto.3': "4 · Вид справа · Техническое фото · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", 'proc.kindMenu': false, surface: '', writes: 3 }],
  ], { query: 'tab=processes' }],
  'СС-41': ['удаление шага и процесса в строке — toast с «Отменить» (r2 §6; аудит, «Точечные фиксы»)', [
    ['удалить «Вид справа» из меню строки — уведомление с «Отменить»', async (K) => { await K.stepDelete('s-right'); await K.settled() },
      { notices: ['Шаг «Вид справа» удалён'], 'proc.cards.0': 'Осмотр автомобиля · 3 шага · auto_inspection', 'proc.rows.p-auto.2': "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", writes: 1 }],
    ['«Отменить» — шаг на месте', async (K) => { await K.undo(); await K.settled() },
      { 'proc.cards.0': 'Осмотр автомобиля · 4 шага · auto_inspection', 'proc.rows.p-auto.3': "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", writes: 2 }],
    ['удалить процесс «Осмотр документов» корзиной в шапке', async (K) => { await K.processAct('p-docs', 'process-delete'); await K.settled() },
      { notices: ['Процесс «Осмотр документов» удалён'], 'proc.cards.length': 2, writes: 3 }],
    ['«Отменить» — процесс на месте', async (K) => { await K.undo(); await K.settled() }, { 'proc.cards.1': 'Осмотр документов · 1 шаг · docs_inspection', writes: 4 }],
    ['карандаш строки — сайд шага (такт 71)', K => K.stepEdit('s-front'), { surface: 'step', 'stepSide.title': 'Редактирование шага — Передняя часть', notices: [], writes: 4 }],
  ], { query: 'tab=processes' }],
  'СС-52': ['сайд шага: шесть секций — «Основное», «Поведение», «Съёмка», «Нейросети» с недоступными компании, «Подсказки», «Связи»; «Сохранить» одной записью, «Отмена» отбрасывает (r2 §6, §8; аудит, «Принцип: всё редактирование сущности — в сайде»)', [
    ['карандаш «Передней части» — сайд шага, шесть секций, значения шага', K => K.stepEdit('s-front'),
      { surface: 'step', focusIn: 'step', stepSide: { title: 'Редактирование шага — Передняя часть', sub: 'Процесс «Осмотр автомобиля»', host: 'page',
        legends: ['Основное', 'Поведение', 'Съёмка', 'Нейросети · выбрано 2', 'Подсказки', 'Связи'], name: 'Передняя часть', order: 3, flags: ['sd-required'],
        networks: ['Ракурсы авто · Передняя', 'Оценка повреждений'],
        denied: ['Детектор подмены снимка | Недоступна компании «Демо Страхование» — подключается через менеджера', 'Оценка износа шин | Недоступна компании «Демо Страхование» — подключается через менеджера'],
        hint: '8 · Все установлены', links: [], networksInView: false }, writes: 0 }],
    ['правки и «Отмена» — строка прежняя, фокус на карандаше строки', async (K) => { await K.typeInto('sdTitle', ' авто'); await K.check('sd-web'); await K.act('step-cancel') },
      { surface: '', 'proc.rows.p-auto.2': '3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный', focusStep: 's-front', writes: 0 }],
    ['снова: название, «Можно в web», нейросеть, подсказка, поле формы — «Сохранить» одной записью', async (K) => {
      await K.stepEdit('s-front'); await K.typeInto('sdTitle', ' авто'); await K.check('sd-web'); await K.net('step', 'Распознавание госномера'); await K.act('step-hint-upload')
      await K.pick('sdLinks', 'Автомобиль · Госномер'); await K.act('step-save'); await K.settled() },
      { surface: '', notices: [], 'proc.rows.p-auto.2': '3 · Передняя часть авто · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений, Распознавание госномера · 9 · Все установлены · Обязательный, Можно в web', saveLog: ['saving', 'saved'], writes: 1 }],
    ['«Настроить нейросети» в строке «Вида справа» — сайд шага, секция «Нейросети» в окне, фокус на первом флажке', K => K.stepAct('s-right', 'step-networks'),
      { surface: 'step', 'stepSide.title': 'Редактирование шага — Вид справа', 'stepSide.networksInView': true, focusNetwork: 'Распознавание VIN', writes: 1 }],
    ['нажатие на недоступную компании нейросеть — не выбирается', K => K.net('step', 'Детектор подмены снимка'), { 'stepSide.networks': ['Ракурсы авто · Правая сторона'], writes: 1 }, { blind: true }],
    ['Esc — сайд закрыт, фокус на «Настроить нейросети» строки', K => K.key('Escape'), { surface: '', focusAct: 'step-networks', focusStep: 's-right', writes: 1 }],
    ['«Добавить шаг» у «Осмотра документов» — «Новый шаг», номер следующий; пустое название — отказ', async (K) => { await K.processAct('p-docs', 'step-add'); await K.act('step-save') },
      { surface: 'step', notices: ['Заполните название шага'], 'stepSide.title': 'Новый шаг', 'stepSide.order': 2, 'stepSide.flags': [], writes: 1 }],
    ['«Свидетельство о регистрации», «2 фото» — «Добавить шаг»: строка в конце процесса', async (K) => { await K.typeInto('sdTitle', 'Свидетельство о регистрации'); await K.select('sdMethod', '2 фото'); await K.act('step-save'); await K.settled() },
      { surface: '', 'proc.cards.1': 'Осмотр документов · 2 шага · docs_inspection', 'proc.rows.p-docs.1': '2 · Свидетельство о регистрации · Основной · 2 фото · Нейросети не выбраны · Не установлена', writes: 2 }],
  ], { query: 'tab=processes' }],
  'СС-53': ['оверлей повторяемого процесса: форма и шаги вместе; стек «оверлей → сайд», Esc закрывает верхний слой, фокус возвращается к триггеру своего слоя; «Сохранить» оверлея — одной записью (r2 §7; аудит, «Клавиатура и фокус»)', [
    ['«Открыть процесс» — оверлей во всё окно: форма процесса и шаги, шагов нет', K => K.processAct('p-damage', 'process-open'),
      { surface: 'process-overlay', focusIn: 'overlay', overlay: { title: 'Осмотр повреждений', sub: 'Повторяемый процесс · форма и шаги вместе', placement: 'full', name: 'Осмотр повреждений', alias: 'damage_inspection',
        steps: [], empty: 'В процессе нет шагов', acts: ['overlay-alias-suggest', 'overlay-step-add', 'overlay-cancel', 'overlay-save'], ro: false, fieldsRo: false, full: true }, writes: 0 }],
    ['Tab по кругу — фокус остаётся в оверлее', K => K.tabs(30), { surface: 'process-overlay', focusIn: 'overlay' }],
    ['«Добавить шаг» — сайд шага поверх оверлея: стек из двух слоёв, фокус в сайде', K => K.act('overlay-step-add'),
      { surface: 'step', surfaces: ['process-overlay', 'step'], focusIn: 'step', 'stepSide.title': 'Новый шаг', 'stepSide.sub': 'Процесс «Осмотр повреждений»', 'stepSide.host': 'overlay', 'overlay.title': 'Осмотр повреждений' }],
    ['Tab по кругу — фокус остаётся в сайде', K => K.tabs(40), { surface: 'step', focusIn: 'step' }],
    ['название, Esc — закрыт только сайд, оверлей открыт, фокус на «Добавить шаг» оверлея', async (K) => { await K.typeInto('sdTitle', 'Черновик шага'); await K.key('Escape') },
      { surface: 'process-overlay', surfaces: ['process-overlay'], focusIn: 'overlay', focusAct: 'overlay-step-add', 'overlay.steps': [], writes: 0 }],
    ['«Добавить шаг», название — «Добавить шаг»: шаг в черновике оверлея, полотно прежнее', async (K) => { await K.act('overlay-step-add'); await K.typeInto('sdTitle', 'Общий план повреждения'); await K.act('step-save') },
      { surface: 'process-overlay', 'overlay.steps': ['1 · Общий план повреждения'], 'overlay.empty': null, 'proc.cards.2': 'Осмотр повреждений · 0 шагов · damage_inspection · повторяемый · открыть', writes: 0 }],
    ['карандаш шага оверлея — сайд правки поверх; «Отмена» — фокус на карандаше строки оверлея', async (K) => { await K.overlayStepEdit('s-new-1'); await K.act('step-cancel') },
      { surface: 'process-overlay', focusOverlayStep: 's-new-1', 'overlay.steps': ['1 · Общий план повреждения'] }],
    ['Esc в оверлее — оверлей закрыт без записи, фокус на «Открыть процесс»', K => K.key('Escape'),
      { surface: '', surfaces: [], focusAct: 'process-open', 'proc.rows.p-damage': [], writes: 0 }],
    ['снова — черновик оверлея сброшен; шаг, название процесса, «Сохранить» — одна запись', async (K) => {
      await K.processAct('p-damage', 'process-open'); await K.act('overlay-step-add'); await K.typeInto('sdTitle', 'Деталь крупным планом'); await K.act('step-save')
      await K.typeInto('odTitle', ' кузова'); await K.act('overlay-save'); await K.settled() },
      { surface: '', 'proc.cards.2': 'Осмотр повреждений кузова · 1 шаг · damage_inspection · повторяемый · открыть',
        'proc.rows.p-damage': ['1 · Деталь крупным планом · Основной · 1 фото · Нейросети не выбраны · Не установлена'], saveLog: ['saving', 'saved'], writes: 1 }],
  ], { query: 'tab=processes' }],
  'СС-53/просмотр': ['оверлей в просмотре версии — чтение: поля только для чтения, «Добавить шаг» и действия под inert, в подвале «Закрыть»; сайды правки не открываются (r2 §2, состояние 7; строки 108, 138 реестра)', [
    ['просмотр текущей версии: «Открыть процесс» у повторяемого — оверлей на чтение', K => K.processAct('p-damage', 'process-open'),
      { viewing: 'v2', surface: 'process-overlay', 'overlay.sub': 'Повторяемый процесс · только чтение', 'overlay.ro': true, 'overlay.fieldsRo': true, 'overlay.acts': ['overlay-close'], writes: 0 }],
    ['«Закрыть» — фокус на «Открыть процесс»', K => K.act('overlay-close'), { surface: '', focusAct: 'process-open', writes: 0 }],
    ['«Изменить процесс» и «Добавить процесс» под inert — сайды не открываются', async (K) => { await K.processAct('p-auto', 'process-edit'); await K.act('process-add') },
      { surface: '', procRo: { checks: true, actsInert: true, handlesInert: true, kindInert: true, rowActsInert: true }, writes: 0 }, { blind: true }],
  ], { query: 'view=v2&tab=processes' }],
  'СС-63': ['перестановка строк ручкой: шаги — мышью и с клавиатуры, номер «№» пересчитан, запись автосохранением; дифф показывает порядок (решение 3 оркестратора 2026-10-03; макет `32765:6653`)', [
    ['протяжка «VIN под стеклом» ниже «VIN на металле»', async (K) => { await K.dragRow('s-vin-glass', 's-vin-metal', 12); await K.settled() },
      { 'proc.rows.p-auto': ["1 · VIN на металле · Основной · 1 фото · Распознавание VIN · Не установлена · Обязательный","2 · VIN под стеклом · Основной · 1 фото · Распознавание VIN, Распознавание шильдиков · 5 · Все установлены · Обязательный","3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный","4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена"], 'proc.dragging': null, saveLog: ['saving', 'saved'], writes: 1 }],
    ['Alt+↑ на ручке «Вид справа» — строка выше, фокус остаётся на ручке', async (K) => { await K.moveKey('s-right', 'ArrowUp'); await K.settled() },
      { 'proc.rows.p-auto.2': "3 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", 'proc.rows.p-auto.3': "4 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", focusHandle: 's-right', writes: 2 }],
    ['Alt+↓ — обратно', async (K) => { await K.moveKey('s-right', 'ArrowDown'); await K.settled() },
      { 'proc.rows.p-auto.3': "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", focusHandle: 's-right', writes: 3 }],
    ['Alt+↓ на последней строке — на месте, записи нет', K => K.moveKey('s-right', 'ArrowDown'), { 'proc.rows.p-auto.3': "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", saveLog: [], writes: 3 }],
    ['Esc во время протяжки — порядок прежний', K => K.dragRow('s-front', 's-vin-metal', -12, true),
      { 'proc.rows.p-auto.2': "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", 'proc.dragging': null, saveLog: [], writes: 3 }],
    ['дифф публикации: «Процесс «Осмотр автомобиля»: порядок шагов»', async (K) => { await K.publish(); await K.area('processes') },
      { surface: 'publish', 'diff.areas.2': { id: 'processes', count: '2 изменения', tone: 'changed' },
        'diff.open.0.groups.0': { kind: 'changed', title: 'Изменено · 1', items: ['Процесс «Осмотр автомобиля»: порядок шагов | VIN под стеклом, VIN на металле, Передняя часть, Вид справа → VIN на металле, VIN под стеклом, Передняя часть, Вид справа'] } }],
  ], { query: 'tab=processes' }],
  'СС-63/форма': ['перестановка строк ручкой в таблице полей «Формы»: тот же механизм; «Порядковый номер» сайда согласован с порядком (решение 3 оркестратора 2026-10-03; макет `32765:5659`)', [
    ['протяжка «Пробег» на первое место', async (K) => { await K.dragRow('f-mileage', 'f-vin', -12); await K.settled() },
      { 'form.rows': ['1 · Пробег · mileage · Число · Обязательное', '2 · VIN · vin · Текст · Обязательное, Согласование', '3 · Госномер · regnum · Текст · Обязательное, Согласование', '4 · Цвет кузова · body_color · Текст'],
        saveLog: ['saving', 'saved'], writes: 1 }],
    ['«Порядковый номер» в сайде поля — 1', K => K.rowEdit('f-mileage'), { surface: 'field', 'steppers.fdOrder': 1, writes: 1 }],
    ['«Отмена»; Alt+↓ на ручке «Пробег»', async (K) => { await K.act('field-cancel'); await K.moveKey('f-mileage', 'ArrowDown'); await K.settled() },
      { surface: '', 'form.rows.0': '1 · VIN · vin · Текст · Обязательное, Согласование', 'form.rows.1': '2 · Пробег · mileage · Число · Обязательное', focusHandle: 'f-mileage', writes: 2 }],
  ], { query: 'tab=form&group=g-car' }],
  /* ============================ П8, такт 72 ============================ */
  'СС-42': ['витрина: «Опубликовать на витрину» выключена с причиной до публикации схемы; жизненный цикл карточки (r2 §7; аудит, «Структура таба», «Две независимые публикации»)', [
    ['таб «Витрина» новой схемы: требует оформления, кнопка выключена с причиной', K => K.tab('showcase'),
      { tab: 'showcase', 'showcase.status': 'Статус витрины: Требует оформления', 'showcase.tone': 'warning', 'showcase.text': 'Схема ещё не опубликована в ядре — витрина станет доступна после', 'showcase.publish': 'off' }],
    ['нажатие по выключенной кнопке — карточка прежняя', K => K.act('publish-showcase'), { 'showcase.publish': 'off', 'sc.status': 'needs', notices: [], writes: 0 }, { blind: true }],
    ['продающее название — карточка в черновике', async (K) => { await K.fill('[data-field=scTitle]', 'Осмотр автомобиля онлайн'); await K.settled() },
      { 'showcase.title': 'Осмотр автомобиля онлайн', 'showcase.status': 'Статус витрины: Черновик карточки', 'showcase.tone': 'neutral', 'showcase.publish': 'off', saveLog: ['saving', 'saved'] }],
    ['первая публикация схемы — кнопка доступна', async (K) => { await K.publish(); await K.act('first-confirm') },
      { versions: 1, 'showcase.publish': 'on', 'showcase.text': 'Карточка появится на витрине после публикации', notices: ['Схема опубликована: версия от 03.10.2026, 09:00'] }],
    ['«Опубликовать на витрину» — карточка на витрине', async (K) => { await K.act('publish-showcase'); await K.settled() },
      { 'sc.status': 'published', 'showcase.status': 'Статус витрины: Опубликована на витрине', 'showcase.tone': 'success', 'showcase.publish': null, notices: ['Карточка опубликована на витрине'] }],
    ['правка опубликованной карточки — снова черновик, кнопка вернулась', async (K) => { await K.fill('[data-field=scPrice]', '1990'); await K.settled() },
      { 'showcase.price': '1990', 'sc.priceFrom': 1990, 'sc.status': 'draft', 'showcase.status': 'Статус витрины: Черновик карточки', 'showcase.publish': 'on' }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  'СС-43': ['витрина: карточка и «Зачем нужен осмотр» — ввод, теги каскадом, четыре пары, метрики (r2 §7; аудит, «Структура таба», «Стержневой принцип: три типа данных»)', [
    ['старт: карточка, теги, шаблон по типу объекта', null, { 'showcase.title': 'Дистанционный осмотр автомобиля перед страхованием', 'showcase.price': '2599', 'showcase.industry': 'Страхование',
      'showcase.spheres': ['ПСО — предстраховой осмотр'], 'showcase.object': 'Транспорт', 'showcase.problems.length': 4, 'showcase.metrics.length': 2,
      'showcase.problems.0': 'Дорого и долго | Выезд эксперта занимает дни и стоит денег | Клиент снимает автомобиль сам за 10–15 минут',
      'showcase.template': 'Заполнено шаблоном для типа «Осмотр транспорта» — отредактируйте текст под конкретный кейс или оставьте как есть' }],
    ['краткое описание — запись автосохранением', async (K) => { await K.typeIn("document.querySelector('[data-field=scSummary] textarea')", 'Осмотр по фото за 15 минут'); await K.settled() },
      { 'showcase.summary': 'Осмотр по фото за 15 минут', 'sc.summary': 'Осмотр по фото за 15 минут', saveLog: ['saving', 'saved'] }],
    ['цена «от» — только цифры', async (K) => { await K.fill('[data-field=scPrice]', '3 490 ₽'); await K.settled() }, { 'showcase.price': '3490', 'sc.priceFrom': 3490 }],
    ['изображение — загрузка нажатием', async (K) => { await K.act('showcase-image'); await K.settled() }, { 'sc.image': 'showcase-cover.jpg', 'showcase.image': 'Изображение загружено · showcase-cover.jpg нажмите, чтобы заменить' }],
    ['индустрия «Лизинг» — сферы другой индустрии сняты', async (K) => { await K.select('scIndustry', 'Лизинг'); await K.settled() },
      { 'showcase.industry': 'Лизинг', 'showcase.spheres': [], 'sc.industry': 'leasing', 'sc.spheres': [] }],
    ['сферы: «Передача в лизинг», «Возврат из лизинга»', async (K) => { await K.pick('scSpheres', 'Передача в лизинг', 'Возврат из лизинга'); await K.settled() },
      { 'showcase.spheres': ['Передача в лизинг', 'Возврат из лизинга'], 'sc.spheres': ['lease-out', 'lease-back'] }],
    ['пара 2: последствия — правка, текст отличается от шаблона', async (K) => { await K.fill('[data-field=scEffect1]', 'Подмена фото'); await K.settled() },
      { 'showcase.problems.1': 'Высокий риск мошенничества | Подмена фото | Детекторы аномалий проверяют координаты, устройство и качество съёмки',
        'showcase.template': 'Текст отличается от шаблона для типа «Осмотр транспорта»' }],
    ['«Добавить метрику» и ввод', async (K) => { await K.act('metric-add'); await K.fill('[data-field=scMetric2]', 'Осмотров без выезда'); await K.fill('[data-field=scMetricValue2]', '90 %'); await K.settled() },
      { 'showcase.metrics': ['Снижение выездов | 50–80 %', 'Ускорение получения материалов | до 10 раз', 'Осмотров без выезда | 90 %'] }],
    ['удалить метрику — уведомление с «Отменить»', async (K) => { await K.clickEl("document.querySelector('[data-metric=\"0\"] [data-act=metric-delete]')"); await K.settled() },
      { 'showcase.metrics.length': 2, 'showcase.metrics.0': 'Ускорение получения материалов | до 10 раз', notices: ['Метрика «Снижение выездов» удалена'] }],
    ['«Отменить» — метрика на месте', async (K) => { await K.undo(); await K.settled() }, { 'showcase.metrics.length': 3, 'showcase.metrics.0': 'Снижение выездов | 50–80 %' }],
    ['«Заполнить шаблоном» — пары и метрики из шаблона, «Отменить» в уведомлении', async (K) => { await K.act('showcase-template'); await K.settled() },
      { 'showcase.metrics.length': 2, 'showcase.problems.1': 'Высокий риск мошенничества | Подмена фото и повторное использование кадров | Детекторы аномалий проверяют координаты, устройство и качество съёмки',
        'showcase.template': 'Заполнено шаблоном для типа «Осмотр транспорта» — отредактируйте текст под конкретный кейс или оставьте как есть', notices: ['«Зачем нужен осмотр» заполнен шаблоном'] }],
    ['пустое продающее название — «Опубликовать на витрину» отказывает', async (K) => { await K.clear('[data-field=scTitle]'); await K.settled(); await K.act('publish-showcase') },
      { 'showcase.title': '', 'sc.status': 'draft', notices: ['Заполните продающее название — без него карточку не опубликовать'] }],
    ['дифф публикации схемы — правки витрины в области «Витрина»', async (K) => { await K.publish(); await K.area('showcase') },
      { surface: 'publish', 'diff.areas.3.id': 'showcase', 'diff.areas.3.tone': 'changed' }],
  ], { query: 'tab=showcase' }],
  'СС-44': ['витрина: «Из схемы» — модуль можно скрыть; «Как устроена схема» читается из статусов (r2 §7; аудит, «Стержневой принцип: три типа данных»)', [
    ['старт: модули из настроек, статусы схемы', null, { 'showcase.modules': ['Распознавание повреждений', 'Распознавание VIN', 'Проверка геолокации', 'Контроль качества съёмки'],
      'showcase.hidden': [], 'showcase.flow': ['Создание', 'Выполнение', 'ИИ-анализ', 'Экспертиза', 'Завершение'] }],
    ['скрыть «Распознавание VIN» — уведомление с «Отменить»', async (K) => { await K.clickEl("document.querySelector('[data-module=vin] [data-slot=chip-remove]')"); await K.settled() },
      { 'showcase.modules': ['Распознавание повреждений', 'Проверка геолокации', 'Контроль качества съёмки'], 'showcase.hidden': ['Распознавание VIN'], 'sc.hiddenModules': ['vin'], notices: ['«Распознавание VIN» скрыт на витрине'] }],
    ['вернуть модуль кнопкой', async (K) => { await K.clickEl("document.querySelector('[data-module-show=vin]')"); await K.settled() },
      { 'showcase.modules': ['Распознавание повреждений', 'Распознавание VIN', 'Проверка геолокации', 'Контроль качества съёмки'], 'showcase.hidden': [], 'sc.hiddenModules': [] }],
    ['согласование в «Настройках» — статус «Согласование» в схеме', async (K) => { await K.tab('settings'); await K.toggle('approval'); await K.settled(); await K.tab('showcase') },
      { 'showcase.flow': ['Создание', 'Выполнение', 'ИИ-анализ', 'Экспертиза', 'Согласование', 'Завершение'] }],
    ['«Пропускать экспертизу» — статуса «Экспертиза» нет', async (K) => { await K.tab('settings'); await K.toggle('skipExpertise'); await K.settled(); await K.tab('showcase') },
      { 'showcase.flow': ['Создание', 'Выполнение', 'ИИ-анализ', 'Согласование', 'Завершение'] }],
    ['тип схемы «Осмотр недвижимости» — модули, объект и шаблон другого типа', async (K) => { await K.tab('settings'); await K.select('schemeType', 'Осмотр недвижимости'); await K.settled(); await K.tab('showcase') },
      { 'showcase.modules': ['Анализ стоимости отделки', 'Проверка геолокации', 'Контроль качества съёмки'], 'showcase.object': 'Недвижимость',
        'showcase.template': 'Текст отличается от шаблона для типа «Осмотр недвижимости»' }],
  ], { query: 'tab=showcase' }],
  'СС-54': ['пустые состояния: пустая форма, пустая группа, ноль процессов (r2 §8; аудит, «Пустые состояния»)', [
    ['таб «Форма» новой схемы — «В форме нет групп» с «Добавить группу»', K => K.tab('form'), { tab: 'form', pending: 'В форме нет групп', emptyActs: ['group-add-empty'], 'form.groups': [] }],
    ['«Добавить группу» из пустого состояния — сайд новой группы', K => K.act('group-add-empty'), { surface: 'group', sideTitle: 'Новая группа' }],
    ['группа создана — «В группе нет полей» с «Добавить поле»', async (K) => { await K.typeInto('gdTitle', 'Объект'); await K.act('group-save'); await K.settled() },
      { surface: '', 'form.groups': ['Объект'], pending: 'В группе нет полей', emptyActs: ['field-add-empty'] }],
    ['«Добавить поле» из пустого состояния — сайд нового поля', K => K.act('field-add-empty'), { surface: 'field', sideTitle: 'Новое поле' }],
    ['таб «Процессы и шаги» — «В схеме нет процессов» с «Добавить процесс»', async (K) => { await K.key('Escape'); await K.tab('processes') },
      { surface: '', tab: 'processes', pending: 'В схеме нет процессов', emptyActs: ['process-add-empty'], 'proc.cards': [] }],
    ['«Добавить процесс» из пустого состояния — сайд процесса', K => K.act('process-add-empty'), { surface: 'process', 'procSide.title': 'Добавление процесса' }],
  ], { query: 'data=new&saved=1' }],
  'СС-55': ['новая схема: «Форма» и «Процессы и шаги» неактивны с пояснением до первого автосохранения (r2 §8; аудит, «Двухфазность и табы»)', [
    ['старт: две вкладки выключены, причину держат обёртки', null, { tab: 'settings', 'tabLock.off': ['form', 'processes'],
      'tabLock.wrap': ['form | Форма: Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор', 'processes | Процессы и шаги: Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['клик по «Форме» — таб прежний', K => K.tab('form'), { tab: 'settings', notices: [], writes: 0 }, { blind: true }],
    ['Tab из поиска: «Настройки», затем обёртка «Формы» — подсказка с причиной', async (K) => { await K.searchClick(); await K.tabs(2); await K.wait(900) },
      { focusLock: 'form', tooltip: 'Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор' }],
    ['быстрый переход «Процессы и шаги» — отказ с причиной', async (K) => { await K.searchClick(); await K.type('ъъъ'); await K.quickLink(3) },
      { tab: 'settings', notices: ['Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['первая правка сохранена — вкладки активны', async (K) => { await K.rename('Осмотр склада'); await K.settled() }, { 'tabLock.off': [], 'tabLock.wrap': [], writes: 1, saveLog: ['saving', 'saved'] }],
    ['таб «Форма» открывается — пустая форма', K => K.tab('form'), { tab: 'form', pending: 'В форме нет групп' }],
  ], { query: 'data=new' }],
  'СС-56': ['плашка «Сохранение теперь автоматическое» закрывается и больше не появляется (r2 §8; аудит, «Смена парадигмы — одноразовая ориентация»)', [
    ['старт: плашка под шапкой', null, { hint: 'Сохранение теперь автоматическое. В боевые осмотры изменения попадают по кнопке «Опубликовать схему»' }],
    ['крестик — плашка закрыта', K => K.clickEl("document.querySelector('[data-autosave-hint] [data-slot=callout-close]')"), { hint: null, writes: 0 }],
    ['перезагрузка страницы — плашка не возвращается', K => K.start(), { hint: null }],
    ['другой таб — плашки нет', K => K.tab('showcase'), { tab: 'showcase', hint: null }],
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
/* `--repeat=N` — каждый выбранный сценарий N раз подряд: проверка редкого провала (такт 67, СС-33). */
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
