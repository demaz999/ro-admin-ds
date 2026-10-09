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
 * Адрес стенда — `KIT_URL` (по умолчанию http://localhost:3000/scheme-edit/). Такт 91: опция сценария `path` — страница стенда от
 * адреса: `new` — окно «Новая схема осмотра» на фоне списка схем (`/scheme-edit/new`); «Создать схему» уводит на страницу схемы в
 * том же документе — адаптер `created` ждёт модель и снова вешает наблюдатель статуса сохранения.
 * Такт 92: опции сценария `width` и `height` — окно браузера (узкий экран — 375 × 812, раскладка телефона страницы и каркаса); без
 * них — 1440 × 900. Слепок узкого экрана — поле `phone`, каркаса — `frame`.
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

async function openPage(width = 1440, height = 900) {
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
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
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
      /*
       * Такт 92: на узком экране низ окна закрывает нижняя полоса, верх — прилипший выбор раздела: цель под ними тоже «за краем окна».
       * Цель внутри самой полосы или выбора раздела — в окне.
       */
      const edges = "const dock = document.querySelector('[data-dock]'); const stick = document.querySelector('[data-section-select]'); const own = x => x && x.contains(el); const lo = dock && !own(dock) ? dock.getBoundingClientRect().top : innerHeight; const sr = stick && !own(stick) ? stick.getBoundingClientRect() : null; const hi = sr && sr.top <= 0.5 ? sr.bottom : 0;"
      const at = scroll => evaluate(`(() => { const el = ${sel}; if (!el) return null; ${scroll ? `{ ${edges} const v = el.getBoundingClientRect(); if (v.top < hi || v.bottom > lo) el.scrollIntoView({ block: 'center', behavior: 'instant' }); else el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }) }` : ''} const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
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
    /** Курсор в точку окна реальным вводом — такт 89: увести курсор с элементов с наведением. */
    async mouseTo(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await sleep(150)
    },
    /** Курсор на элемент реальным вводом — такт 87: кнопки плитки и миниатюры видны на наведении. */
    async hover(sel) {
      const p = await this.point(sel)
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y })
      await sleep(200)
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
    /** Прокрутка окна колесом — реальным вводом; точка колеса — середина окна (такт 92: окно 375 × 812). */
    async wheel(dy) {
      await send('Page.bringToFront')
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(width / 2), y: Math.round(height / 2), deltaX: 0, deltaY: dy })
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
  window.__notices = []; window.__saveLog = []; window.__ctrlF = []
  /* Такт 86: Ctrl+F — перехватила ли страница нажатие (defaultPrevented после всех обработчиков). */
  window.addEventListener('keydown', e => { if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) setTimeout(() => window.__ctrlF.push(e.defaultPrevented), 0) }, true)
  const take = el => setTimeout(() => { const c = el.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); const x = t(c.textContent); if (x) window.__notices.push(x) }, 0)
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return
    if (n.matches?.('[data-slot=toast]')) take(n); else n.querySelectorAll?.('[data-slot=toast]').forEach(take) }))).observe(document.body, { childList: true, subtree: true })
  return 1 })()`
/** Наблюдатель статуса сохранения на корне страницы схемы — такт 91: после перехода из окна создания вешается заново. */
const WATCH_ROOT = `(() => {
  const root = document.querySelector('[data-scheme-edit]')
  if (!root || root.__watched) return 0
  root.__watched = 1
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
    async start(query = '', path = '') {
      await page.goto(`${KIT_URL}${path}${query ? `?${query}` : ''}`, 1500)
      await until(page, path ? `!!document.querySelector('[data-scheme-list]')` : `!!${Q.root} && !!window.__scheme`, 20000)
      await page.evaluate(`(async () => { await document.fonts.ready; return 1 })()`)
      await page.evaluate(WATCH)
      await page.evaluate(WATCH_ROOT)
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
    /* ---------- такт 87: фото-подсказки ---------- */
    /** «Выбрать из каталога» в ячейке шага. */
    catalogFrom: id => page.click(`document.querySelector('[data-step-row="${id}"] [data-act=hint-catalog]')`),
    /** Плитка каталога — нажатие по плитке выбирает. */
    tile: id => page.click(`document.querySelector('[data-side=catalog] [data-catalog-item="${id}"]')`),
    /** Кнопка «открыть крупно» плитки — видна на наведении: прогон ставит курсор на плитку, затем нажимает. */
    async tileOpen(id) {
      await page.hover(`document.querySelector('[data-side=catalog] [data-catalog-item="${id}"]')`)
      await page.click(`document.querySelector('[data-side=catalog] [data-catalog-item="${id}"] [data-slot=media-gallery-item-open]')`)
    },
    category: id => page.click(`document.querySelector('[data-side=catalog] [data-catalog-categories] [data-slot=section-nav-item][data-value=${id}]')`),
    /** Миниатюра ячейки шага либо «+N» (`more`). */
    thumb: (id, k) => page.click(k === 'more' ? `document.querySelector('[data-hint-thumbs="${id}"] [data-slot=thumb-strip-more]')` : `document.querySelectorAll('[data-hint-thumbs="${id}"] [data-slot=thumb-strip-item]')[${k}]`),
    /** Миниатюра сайда шага: «глаз» либо крестик — половины видны на наведении. */
    async sideThumb(hint, half) {
      await page.hover(`document.querySelector('[data-side=step] [data-hint="${hint}"]')`)
      await page.click(`document.querySelector('[data-side=step] [data-hint="${hint}"] [data-slot=step-thumb-${half}]')`)
    },
    /** Действие строки массовой заливки: `fill-replace` либо `fill-toggle`. */
    fillAct: (id, act) => page.click(`document.querySelector('[data-side=fill] [data-fill-row="${id}"] [data-act=${act}]')`),
    fillAll: () => page.click(`document.querySelector('[data-side=fill] [data-field=fill-all] [data-slot=choice-control], [data-side=fill] [data-field=fill-all][data-slot=choice] [data-slot=choice-control]')`),
    /** Стрелка просмотра крупно: `next` либо `prev`. */
    viewerArrow: dir => page.click(`document.querySelector('[data-slot=lightbox] button[aria-label="${dir === 'next' ? 'Следующий кадр' : 'Предыдущий кадр'}"]')`),
    /* ---------- такт 88: вставка из другой схемы, тексты повторяемого процесса ---------- */
    /** Строка схемы-донора — первый уровень сайда вставки. */
    pasteScheme: id => page.click(`document.querySelector('[data-side=paste] [data-paste-scheme="${id}"]')`),
    /** Группа или процесс донора — второй уровень. */
    pastePart: id => page.click(`document.querySelector('[data-side=paste] [data-paste-part="${id}"]')`),
    /** Флажок строки поля или шага — третий уровень. */
    pasteCheck: id => page.click(`document.querySelector('[data-side=paste] [data-paste-row="${id}"] [data-slot=choice-control]')`),
    pasteAll: () => page.click(`document.querySelector('[data-side=paste] [data-paste-all] [data-slot=choice-control], [data-side=paste] [data-paste-all][data-slot=choice-control]')`),
    /** Чип-вариант текста повторяемого процесса. */
    textChip: (key, v) => page.click(`document.querySelector('[data-overlay-texts] [data-text=${key}] [data-text-chips] [data-variant="${v}"]')`),
    /** «Все варианты» у поля текста — поповер. */
    textVariants: key => page.click(`document.querySelector('[data-overlay-texts] [data-text=${key}] [data-act=text-variants]')`),
    /** Вариант в поповере «Все варианты». */
    variantPick: v => page.click(`document.querySelector('[data-variants] [data-variant="${v}"]')`),
    /* ---------- такт 89: демо-осмотр и превью у «?» ---------- */
    /**
     * «Предпросмотр» и курсор в пустой угол оверлея: оверлей встаёт под неподвижный курсор, и Chrome шлёт наведение элементу под
     * ним — строке «Из чего собран экран» у кнопки шапки. Наведение в слепке даёт только действие шага.
     */
    async preview() { await page.click(Q.act('preview')); await page.mouseTo(8, 892) },
    /** Часть телефона демо-осмотра — кнопка или строка с переходом. */
    demoPart: id => page.click(`document.querySelector('[data-demo-phone] [data-part="${id}"]')`),
    /** Наведение курсора на часть телефона либо строку «Из чего собран экран» — реальным вводом. */
    demoHoverPart: id => page.hover(`document.querySelector('[data-demo-phone] [data-part="${id}"]')`),
    demoHoverSource: id => page.hover(`document.querySelector('[data-demo-sources] [data-source="${id}"]')`),
    /** Раздел оглавления (этап) и якорь (экран). */
    demoStage: id => page.click(`document.querySelector('[data-demo-toc] [data-slot=section-nav-item][data-value="${id}"]')`),
    demoAnchor: id => page.click(`document.querySelector('[data-demo-toc] [data-screen="${id}"]')`),
    /** «По шагам» либо «Карта». */
    demoMode: mode => page.click(`document.querySelector('[data-demo-mode=${mode}]')`),
    /** Миниатюра карты. */
    demoThumb: id => page.click(`document.querySelector('[data-thumb="${id}"]')`),
    /** «Изменить» строки «Из чего собран экран». */
    demoEdit: id => page.click(`document.querySelector('[data-demo-sources] [data-source="${id}"] [data-act=demo-edit]')`),
    /** «?» с превью у настройки либо поля («field:…»). */
    helpOpen: key => page.click(`document.querySelector('[data-help="${key}"] [data-help-preview]')`),
    /** «Открыть в демо-осмотре» в открытом поповере «?». */
    helpAction: () => page.click(`document.querySelector('[data-slot=help-preview] [data-help-action]')`),
    /* ---------- такт 90: цена «от» и превью публичной страницы ---------- */
    /** Источник цены «от» — радио-карточка по `data-price-source`: текст карточки склеивает подпись и описание (ловушка такта 69). */
    priceSource: v => page.click(`document.querySelector('[data-radio=priceSource] [data-price-source=${v}] [data-slot=choice-control]')`),
    /** «Предпросмотр страницы» и курсор в угол окна: оверлей встаёт под неподвижный курсор (ловушка такта 89). */
    async siteOpen() { await page.click(Q.act('site-preview')); await page.mouseTo(8, 892) },
    /** «Компьютер / Телефон» и «Страница сценария / Карточка в каталоге». */
    siteDevice: d => page.click(`document.querySelector('[data-site-device=${d}]')`),
    siteView: v => page.click(`document.querySelector('[data-site-view=${v}]')`),
    /** Метка «Не заполнено» в странице: место — `data-gap`. */
    siteGap: key => page.click(`document.querySelector('[data-overlay=site] [data-gap="${key}"]')`),
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
    /* ---------- такт 86: поиск как в IDE ---------- */
    /** Переключатель булевой настройки в строке выдачи. */
    resultToggle: key => page.click(`document.querySelector('[data-search-results] [data-result="${key}"] [data-slot=choice-control]')`),
    /** Охват над выдачей — сегмент `data-scope`. */
    scope: id => page.click(`document.querySelector('[data-search-results] [data-scope=${id}]')`),
    /** Фильтр «Изменено в черновике» в полосе охвата. */
    modifiedSwitch: () => page.click(`document.querySelector('[data-search-results] [data-field=search-modified] [data-slot=choice-control]')`),
    /** Стрелки ↑ ↓ в поле режима «найдено». */
    findArrow: dir => page.click(`document.querySelector('[data-act=find-${dir}]')`),
    /** Alt+Enter, Shift+Enter — Enter с модификатором (Alt — 1, Shift — 8) и текстом: так нажатие доходит, как у человека. */
    altEnter: () => page.key('Enter', 'Enter', { modifiers: 1, text: '\r' }),
    shiftEnter: () => page.key('Enter', 'Enter', { modifiers: 8, text: '\r' }),
    /** F3 и Shift+F3 — код клавиши 114. */
    f3: (shift = false) => page.key('F3', 'F3', { windowsVirtualKeyCode: 114, nativeVirtualKeyCode: 114, ...(shift ? { modifiers: 8 } : {}) }),
    /** Ctrl+F — клавиша `f` с Ctrl (2), код `KeyF`, 70: перехват страницы пишет наблюдатель `__ctrlF`. */
    ctrlF: () => page.key('f', 'KeyF', { modifiers: 2, windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 }),
    /** Снять фокус: клик по свободному месту шапки. */
    blur: () => page.evaluate(`(document.activeElement?.blur(), 1)`),
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
    /* ---------- такт 91: окно «Новая схема осмотра», модель готовности ---------- */
    /** Источник окна — строка колонки; карточка — радио-карточка по `data-card`; кнопка окна — по `data-act`. */
    createSource: id => page.click(`document.querySelector('[data-modal=create] [data-create-sources] [data-slot=section-nav-item][data-value=${id}]')`),
    createCard: id => page.click(`document.querySelector('[data-modal=create] [data-card="${id}"] [data-slot=choice-control]')`),
    createAct: id => page.click(`document.querySelector('[data-modal=create] [data-act=${id}]')`),
    /** Наименование шага «Основа»: выделить всё и набрать; пустой текст — стереть. */
    async createName(text) {
      const sel = `document.querySelector('[data-modal=create] [data-field=create-name] input')`
      await page.click(sel)
      await page.evaluate(`(${sel}.select(), 1)`)
      if (text) await page.type(text)
      else await page.key('Delete')
    },
    /** «Создать схему» уводит на страницу схемы в том же документе: дождаться модели и снова повесить наблюдатель статуса. */
    async created() {
      await until(page, `!!${Q.root} && !!window.__scheme`, 20000)
      await page.evaluate(`(async () => { await document.fonts.ready; return 1 })()`)
      await page.evaluate(WATCH_ROOT)
      await sleep(300)
    },
    /** Этап полосы, «Далее» полосы, «Свернуть». */
    stage: id => page.click(`document.querySelector('[data-slot=readiness-stage][data-stage=${id}]')`),
    stripNext: () => page.click(`document.querySelector('[data-readiness-next]')`),
    stripCollapse: () => page.click(`document.querySelector('[data-readiness-collapse]')`),
    /** Чип у «Опубликовать схему» — поповер. */
    chipOpen: () => page.click(Q.act('readiness')),
    /** «Исправить» у проверки — поповер либо окно публикации: последняя на странице. */
    fix: key => page.click(`[...document.querySelectorAll('[data-check="${key}"] [data-readiness-fix]')].pop()`),
    /** «Перейти» у группы списка. */
    groupGo: id => page.click(`[...document.querySelectorAll('[data-readiness-group=${id}] [data-readiness-go]')].pop()`),
    /** Ручная отметка «Правил» — флажок группы списка либо низ «Настроек». */
    manual: () => page.click(`(m => m.querySelector('[data-slot=choice-control]') ?? m)([...document.querySelectorAll('[data-readiness-manual]')].pop())`),
    rulesCheck: () => page.click(`(b => b.querySelector('[data-slot=choice-control]') ?? b)(document.querySelector('[data-field=rules-check]'))`),
    /** Новая группа «Формы» с одним полем и алиасом — из пустых состояний. */
    async groupWithField(group, field, alias) {
      await this.act('group-add-empty')
      await this.typeInto('gdTitle', group)
      await this.act('group-save')
      await this.settled()
      await this.act('field-add-empty')
      await this.typeInto('fdTitle', field)
      await this.typeInto('fdAlias', alias)
      await this.act('field-save')
      await this.settled()
    },
    /* ---------- такт 92: каркас и узкий экран ---------- */
    /** Бургер верхней полосы; на узком экране — выезжающая панель меню. */
    burger: () => page.click(`document.querySelector('[data-menu-burger]')`),
    /** Пункт выезжающей панели со страницей стенда — по `data-menu-link`. */
    drawerLink: id => page.click(`document.querySelector('[data-menu-drawer] [data-menu-link=${id}]')`),
    drawerClose: () => page.click(`document.querySelector('[data-menu-close]')`),
    /** Кнопка нижней полосы узкого экрана по `data-act`. */
    dock: act => page.click(`document.querySelector('[data-dock] [data-act=${act}]')`),
    /** «⋯» нижней полосы и пункт меню. */
    async dockMenu(action) {
      await page.click(`document.querySelector('[data-dock] [data-act=menu]')`)
      if (action) await page.click(`document.querySelector('[data-menu=scheme] [data-action=${action}]')`)
    },
    /** «⋯» строки-карточки поля либо шага и пункт меню: `edit` либо `delete`. */
    async cardMenu(kind, id, action) {
      const card = kind === 'field' ? `[data-fields-cards] [data-form-row="${id}"]` : kind === 'overlay' ? `[data-overlay-cards] [data-overlay-step="${id}"]` : `[data-steps-cards] [data-step-row="${id}"]`
      await page.click(`document.querySelector('${card} [data-act=card-menu]')`)
      if (action) await page.click(`document.querySelector('[data-menu=card] [data-action=${action}]')`)
    },
    /** Вкладка демо-осмотра на узком экране: `screen`, `toc`, `sources`. */
    demoPane: id => page.click(`document.querySelector('[data-demo-pane=${id}]')`),
    dump: () => page.evaluate(`window.__scheme.dump()`),
    async snapshot() {
      const s = await page.evaluate(`(() => {
        const t = s => (s ?? '').replace(/\\s+/g, ' ').trim()
        /* Такт 74: причина под флажком полным контрастом — произведение opacity от узла до слоя сайда (анимация слоя не в счёт). */
        const lit = el => { if (!el) return null; let o = 1; for (let x = el; x && x.nodeType === 1 && !x.matches('[data-side]'); x = x.parentElement) o *= Number(getComputedStyle(x).opacity); return o === 1 }
        const root = ${Q.root}
        const status = document.querySelector('[data-slot=app-bar-status]')
        const M = window.__scheme
        const notices = window.__notices.splice(0)
        const saveLog = window.__saveLog.splice(0)
        /* ---------- такт 91: модель готовности и окно «Новая схема осмотра» ---------- */
        /* Текст без строк для чтения с экрана: маркер и важность проверки несут их для вспомогательных технологий. */
        const txt = x => { if (!x) return ''; const c = x.cloneNode(true); c.querySelectorAll('.sr-only').forEach(n => n.remove()); return t(c.textContent) }
        /* Маркер: состояние и «! N» пилюли (у глифов готово и замок числа нет). */
        const markOf = mk => mk ? mk.dataset.state + ((p => p ? ' ' + t(p.textContent) : '')(mk.querySelector('span[aria-hidden=true]'))) : null
        const checked = x => x ? (x.querySelector('[data-slot=choice-control]') ?? x).getAttribute('aria-checked') : null
        /* Список готовности: группа — «id состояние ! N · название · пояснение», проверки — «ключ · важность · текст · место», флажок отметки. */
        const listOf = el => el ? [...el.querySelectorAll('[data-slot=readiness-group]')].map(g => ({
          head: [g.dataset.readinessGroup + ' ' + markOf(g.querySelector('[data-slot=readiness-mark]')), t(g.querySelector('[data-slot=readiness-group-title]')?.textContent),
            t(g.querySelector('[data-slot=readiness-group-meta]')?.textContent)].filter(Boolean).join(' · '),
          checks: [...g.querySelectorAll('[data-slot=readiness-check]')].map(c => [c.dataset.check, c.dataset.level, txt(c.querySelector('[data-slot=readiness-check-text]')),
            t(c.querySelector('[data-slot=readiness-check-area]')?.textContent)].filter(Boolean).join(' · ')),
          manual: checked(g.querySelector('[data-readiness-manual]')),
        })) : null
        const createWin = (el => { if (!el) return null
          const val = k => el.querySelector('[data-field=' + k + '] input')?.value ?? null
          return {
            step: el.dataset.step, mode: el.dataset.mode, source: el.dataset.source,
            title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent), sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
            sources: [...el.querySelectorAll('[data-create-sources] [data-slot=section-nav-item]')].map(b => b.dataset.value + ' ' + t(b.querySelector('[data-slot=section-nav-count]')?.textContent)
              + (b.querySelector('[data-slot=section-nav-badge]') ? ' ⚿' : '') + (b.getAttribute('aria-current') === 'true' ? ' *' : '')),
            access: t(el.querySelector('[data-create-access]')?.textContent) || null,
            cards: [...el.querySelectorAll('[data-card]')].map(c => c.dataset.card + ' · ' + t(c.querySelector('[data-slot=choice-meta]')?.textContent)
              + (c.querySelector('[data-slot=choice-control]')?.getAttribute('data-state') === 'checked' ? ' *' : '')),
            ai: el.querySelector('[data-field=create-ai]') ? { disabled: !!el.querySelector('[data-field=create-ai] input:disabled'), hint: t(el.querySelector('[data-field=create-ai] [data-slot=field-hint]')?.textContent),
              value: el.querySelector('[data-field=create-ai] input')?.value ?? null } : null,
            origin: t(el.querySelector('[data-create-origin] [data-slot=callout-title]')?.textContent) || null,
            name: val('create-name'), nameError: el.querySelector('[data-field=create-name]')?.dataset.state === 'error' ? t(el.querySelector('[data-field=create-name] [data-slot=field-hint]')?.textContent) : null,
            owner: val('create-owner'), type: t(el.querySelector('[data-field=create-type] [data-slot=field-input]')?.textContent) || null,
            inspection: el.querySelector('[data-radio=createInspection] [data-slot=choice-control][data-state=checked]')?.closest('[data-slot=choice]')?.querySelector('[data-slot=choice-title]')?.textContent.trim() ?? null,
            acts: [...el.querySelectorAll('[data-act]')].map(b => b.dataset.act + (b.disabled ? ' выкл' : '')),
          } })(document.querySelector('[data-modal=create]'))
        const url = location.pathname + location.search
        /*
         * Такт 92 — каркас: меню в потоке, кнопки полосы (без панели меню), выезжающая панель (край, ширина, высота, пунктов, фокус внутри),
         * подпись кнопки в фокусе.
         */
        const frame = (() => {
          const vis = el => !!el && el.getBoundingClientRect().width > 0
          const drawer = document.querySelector('[data-menu-drawer]')
          const flow = [...document.querySelectorAll('[data-slot=menu]')].find(x => !x.closest('[data-menu-drawer]'))
          const bar = [...document.querySelectorAll('[data-slot=app-bar]')].find(x => !x.closest('[data-menu-drawer]'))
          return {
            menuInFlow: vis(flow),
            bar: bar ? [...bar.querySelectorAll('button')].filter(vis).map(b => b.getAttribute('aria-label') || t(b.textContent)) : [],
            drawer: drawer ? (r => ({ x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), items: drawer.querySelectorAll('[data-slot=menu-item]').length,
              focusIn: drawer.contains(document.activeElement), expanded: document.querySelector('[data-menu-burger]')?.getAttribute('aria-expanded') ?? null }))(drawer.getBoundingClientRect()) : null,
            focus: document.activeElement?.getAttribute('aria-label') ?? null,
          } })()
        /* Фон окна создания — список схем вне стенда: модели страницы схемы на нём нет. Такт 92: и страницы стенда, куда ведёт меню каркаса. */
        if (!root || !M) return JSON.stringify({ page: 'list', url, notices, createWin, rows: document.querySelectorAll('[data-scheme-row]').length, frame })
        return JSON.stringify({
          title: t(document.querySelector('[data-scheme-title]')?.textContent),
          tab: root.dataset.tab,
          tabActive: [...document.querySelectorAll('[data-tab-trigger]')].filter(b => b.dataset.state === 'active' || b.getAttribute('aria-selected') === 'true').map(b => b.dataset.tabTrigger),
          /* Такт 91: маркер этапа у вкладки — поле tabMarks; подпись вкладки — без него. */
          tabs: [...document.querySelectorAll('[data-tab-trigger]')].map(b => { const c = b.cloneNode(true); c.querySelectorAll('[data-slot=readiness-mark]').forEach(x => x.remove()); return t(c.textContent) }),
          section: root.dataset.section,
          save: root.dataset.save,
          /* Такт 102: текст статуса без «Повторить»; у «сохранено» значком текст — строка для чтения с экрана, saveIcon — значок. */
          saveText: status ? ((c) => { c.querySelectorAll('[data-slot=app-bar-status-retry]').forEach(b => b.remove()); return t(c.textContent) })(status.cloneNode(true)) : '',
          saveIcon: !!status?.querySelector('[data-slot=app-bar-status-icon]'),
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
          /* Такт 100: подписи «← раздел» и «раздел →»; крайней кнопки нет — null. */
          prevText: t(document.querySelector('[data-act=section-prev]')?.textContent) || null,
          nextText: t(document.querySelector('[data-act=section-next]')?.textContent) || null,
          reasonActs: [...document.querySelectorAll('[data-form-actions] [data-act]')].map(b => b.dataset.act),
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
          /* Такт 86: строки выдачи — SearchResult; «подпись | пояснение либо причина». */
          results: [...document.querySelectorAll('[data-search-results] [data-slot=list-group]')].map(grp => ({
            path: t(grp.querySelector('[data-slot=list-group-header]')?.textContent),
            items: [...grp.querySelectorAll('[data-slot=search-result]')].map(i => [t(i.querySelector('[data-slot=search-result-title]').textContent),
              t(i.querySelector('[data-slot=search-result-hint], [data-slot=search-result-reason]')?.textContent)].filter(Boolean).join(' | ')),
          })),
          resultActive: t(document.querySelector('[data-search-results] [data-slot=search-result][data-active] [data-slot=search-result-title]')?.textContent) || null,
          /* Строка выдачи подробно: тип, подпись, значение, переключатель, приглушение, подсвеченные фрагменты подписи. */
          rowsX: [...document.querySelectorAll('[data-search-results] [data-slot=search-result]')].map(r => [r.dataset.type, t(r.querySelector('[data-slot=search-result-title]').textContent),
            t(r.querySelector('[data-slot=search-result-value]')?.textContent), r.querySelector('[data-slot=choice-control]')?.getAttribute('aria-checked') ?? '',
            r.hasAttribute('data-muted') ? 'приглушена' : '', [...r.querySelectorAll('[data-slot=search-result-title] [data-slot=highlight-text-match]')].map(m => m.textContent).join('+')].join(' · ')),
          scopes: [...document.querySelectorAll('[data-search-results] [data-scope]')].map(b => b.dataset.scope + ' ' + t(b.querySelector('[data-slot=tabs-counter]')?.textContent) + (b.dataset.state === 'active' ? ' *' : '')),
          searchLayout: t(document.querySelector('[data-search-layout]')?.textContent) || null,
          searchTotal: t(document.querySelector('[data-search-total]')?.textContent) || null,
          searchFooter: t(document.querySelector('[data-search-footer] [data-slot=kbd-text]')?.textContent) || null,
          modifiedSwitch: document.querySelector('[data-search-results] [data-field=search-modified] [data-slot=choice-control]')?.getAttribute('aria-checked') ?? null,
          searchEmpty: t(document.querySelector('[data-search-empty] [data-slot=empty-title]')?.textContent) || null,
          searchEmptyDesc: t(document.querySelector('[data-search-empty] [data-slot=empty-description]')?.textContent) || null,
          quickLinks: [...document.querySelectorAll('[data-search-results] [data-quick]')].map(b => t(b.textContent)),
          /* «ещё N» у длинных групп выдачи. */
          searchMore: [...document.querySelectorAll('[data-search-results] [data-slot=search-result][data-type=more] [data-slot=search-result-title]')].map(x => t(x.textContent)),
          /* Режим «найдено»: счётчик в поле, плашка, числа на табах и в навигаторе, подсветка совпадений на табе (CSS Custom Highlight API). */
          find: (() => { if (!M.ui.find.on) return null
            const hl = n => { const h = CSS.highlights?.get(n); return h ? [...h].map(r => r.toString()) : [] }
            return {
              counter: t(document.querySelector('[data-find-counter]')?.textContent), bar: t(document.querySelector('[data-find-bar] [data-slot=callout-text]')?.textContent),
              tabs: Object.fromEntries([...document.querySelectorAll('[data-tab-trigger]')].map(b => [b.dataset.tabTrigger, t(b.querySelector('[data-slot=tabs-counter]')?.textContent) || null])),
              nav: [...document.querySelectorAll('[data-slot=section-nav-item]')].map(b => b.dataset.value + ' ' + t(b.querySelector('[data-slot=section-nav-count]')?.textContent)),
              current: M.ui.find.current, marks: hl('search-match'), mark: hl('search-match-current'),
            } })(),
          recent: M.ui.recent,
          ctrlF: window.__ctrlF.splice(0),
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
              /* Такт 74, карточка Б: счёт — слотом meta; слепок — «заголовок · счёт». */
              title: (() => { const h = el.querySelector('[data-fields-title]'); if (!h) return null; const head = h.matches('[data-slot=heading]') ? h : h.querySelector('[data-slot=heading]')
                return [t(head?.textContent), t(h.querySelector('[data-slot=heading-meta]')?.textContent)].filter(Boolean).join(' · ') || null })(),
              rows: [...el.querySelectorAll('[data-form-row]')].map(r => [t(r.querySelector('[data-row-number]')?.textContent), t(r.querySelector('[data-slot=table-cell-identity]').textContent),
                t(r.querySelector('[data-field-alias]')?.textContent), t(r.querySelector('[data-slot=chip]')?.textContent),
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
                sub: t(c.querySelector('[data-slot=choice-subtitle]')?.textContent),
                /* Такт 74, карточка А: причина — reason под подписью, полным контрастом. */
                why: t(c.querySelector('[data-slot=choice-reason]')?.textContent), whyLit: lit(c.querySelector('[data-slot=choice-reason]')) }])),
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
                t(r.querySelector('[data-row-number]')?.textContent), t(r.querySelector('[data-slot=table-cell-identity] [data-slot=table-cell-text]')?.textContent ?? r.querySelector('[data-slot=table-cell-identity]').textContent),
                t(r.querySelector('[data-step-kind] [data-slot=chip-label]')?.textContent), t(r.querySelector('[data-step-method]')?.textContent),
                [...r.querySelectorAll('[data-step-networks] [data-slot=table-cell-text], [data-step-networks] [data-networks-empty]')].map(x => t(x.textContent)).join(', '),
                t(r.querySelector('[data-hint-status]')?.textContent),
                [...r.querySelectorAll('[data-badge]')].map(b => t(b.textContent)).join(', ')].filter(Boolean).join(' · '))])),
              selected: el.querySelectorAll('[data-step-row][data-state=selected]').length,
              all: Object.fromEntries([...el.querySelectorAll('[data-process]')].filter(c => c.querySelector('[data-steps-all]')).map(c => [c.dataset.process,
                check(c.querySelector('[data-steps-all] [data-slot=choice-control], [data-steps-all][data-slot=choice-control]'))])),
              bar: bar && bar.dataset.state === 'open' && getComputedStyle(bar).display !== 'none' ? t(bar.querySelector('[data-slot=action-bar-count]').textContent) : null,
              flags: bar && getComputedStyle(bar).display !== 'none' ? Object.fromEntries([...bar.querySelectorAll('[data-flag]')].map(x => [x.dataset.flag, check(x.querySelector('[data-slot=choice-control]') ?? x)])) : null,
              upload: el.querySelector('[data-upload-zone]')?.dataset.uploadZone ?? null,
              /* Такт 87: миниатюры фото-подсказок в ячейке — подписи видимых и хвост «+N». */
              thumbs: Object.fromEntries([...el.querySelectorAll('[data-hint-thumbs]')].map(x => [x.dataset.hintThumbs,
                [...x.querySelectorAll('[data-slot=thumb-strip-item]')].map(b => b.getAttribute('aria-label')).concat(x.querySelector('[data-slot=thumb-strip-more]') ? [t(x.querySelector('[data-slot=thumb-strip-more]').textContent)] : [])])),
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
              denied: nets.filter(c => ctl(c).disabled).map(c => c.dataset.network + ' | ' + t(c.querySelector('[data-slot=choice-reason]')?.textContent) + (lit(c.querySelector('[data-slot=choice-reason]')) ? '' : ' | бледно')),
              hint: t(el.querySelector('[data-step-hint-status]')?.textContent),
              /* Такт 87: раздел «Фото-подсказки» — миниатюры черновика сайда по порядку. */
              hints: [...el.querySelectorAll('[data-step-hint-list] [data-hint]')].map(x => x.dataset.hint),
              links: [...el.querySelectorAll('[data-field=sdLinks] [data-slot=select-chip]')].map(c => t(c.textContent)),
              /* Секция «Нейросети» в окне сайда: верх секции виден. */
              networksInView: (() => { const sec = el.querySelector('[data-step-section=networks]'); const body = el.querySelector('[data-slot=modal-card-body]'); if (!sec || !body) return null
                const a = sec.getBoundingClientRect(); const b = body.getBoundingClientRect(); return a.top >= b.top - 1 && a.top < b.bottom })(),
            } })(),
          focusNetwork: document.activeElement?.closest?.('[data-network]')?.dataset.network ?? null,
          /* ---------- такт 87: каталог фото-подсказок, массовая заливка, просмотр крупно ---------- */
          catalog: (() => { const el = document.querySelector('[data-side=catalog]'); if (!el) return null
            const btn = el.querySelector('[data-act=catalog-confirm]')
            return {
              target: el.dataset.target, title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent), sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
              back: !!el.querySelector('[data-modal-back]'),
              query: el.querySelector('[data-field=catalog-search] input, input[data-field=catalog-search]')?.value ?? null,
              category: el.querySelector('[data-catalog-categories] [data-slot=section-nav-item][aria-current=true]')?.dataset.value ?? null,
              counts: Object.fromEntries([...el.querySelectorAll('[data-catalog-categories] [data-slot=section-nav-item]')].map(b => [b.dataset.value, Number(t(b.querySelector('[data-slot=section-nav-count]')?.textContent))])),
              items: [...el.querySelectorAll('[data-catalog-item]')].map(x => x.dataset.catalogItem),
              picked: [...el.querySelectorAll('[data-catalog-item][data-selected]:not([data-disabled])')].map(x => x.dataset.catalogItem),
              attached: [...el.querySelectorAll('[data-catalog-item][data-disabled]')].map(x => x.dataset.catalogItem),
              marks: [...el.querySelectorAll('[data-catalog-item] [data-slot=highlight-text-match]')].map(x => t(x.textContent)),
              note: t(el.querySelector('[data-slot=modal-card-note]')?.textContent),
              confirm: btn ? t(btn.textContent) + (btn.disabled ? ' · выкл' : '') : null,
              empty: t(el.querySelector('[data-catalog-empty] [data-slot=empty-title]')?.textContent) || null,
              emptyDesc: t(el.querySelector('[data-catalog-empty] [data-slot=empty-description]')?.textContent) || null,
            } })(),
          fill: (() => { const el = document.querySelector('[data-side=fill]'); if (!el) return null
            const btn = el.querySelector('[data-act=fill-apply]')
            return {
              sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
              all: el.querySelector('[data-field=fill-all] [data-slot=choice-control], [data-field=fill-all][data-slot=choice] [data-slot=choice-control]')?.getAttribute('aria-checked') ?? null,
              only: t(el.querySelector('[data-fill-only]')?.textContent) || null,
              /* Строка: шаг · оценка · подсказка · причина · заполняется либо нет. */
              groups: [...el.querySelectorAll('[data-fill-group]')].map(g => ({ id: g.dataset.fillGroup, legend: t(g.querySelector('[data-slot=field-set-legend]')?.textContent),
                rows: [...g.querySelectorAll('[data-fill-row]')].map(r => { const ids = [...r.querySelectorAll('[data-slot=table-cell-identity]')]
                  return [r.dataset.fillRow, t(r.querySelector('[data-fill-match]')?.textContent), t(ids[1]?.querySelector('[data-slot=table-cell-text]')?.textContent),
                    t(ids[1]?.querySelector('[data-slot=table-cell-identity-description]')?.textContent), r.hasAttribute('data-included') ? 'заполнить' : 'не заполнять'].join(' · ') }) })),
              empty: t(el.querySelector('[data-fill-empty] [data-slot=empty-title]')?.textContent) || null,
              apply: btn ? t(btn.textContent) + (btn.disabled ? ' · выкл' : '') : null,
            } })(),
          viewer: (() => { const el = document.querySelector('[data-slot=lightbox]'); if (!el) return null
            const pick = el.querySelector('[data-act=viewer-pick]')
            return { counter: t(el.querySelector('[data-slot=lightbox-bar] [data-slot=badge]')?.textContent), caption: t(el.querySelector('[data-slot=lightbox-caption]')?.textContent),
              src: (el.querySelector('[data-slot=frame-stage] img')?.getAttribute('src') ?? '').split('/').pop(), pick: pick ? t(pick.textContent) + (pick.disabled ? ' · выкл' : '') : null } })(),
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
              steps: [...el.querySelectorAll('[data-overlay-step]')].map(r => [t(r.querySelector('[data-row-number]')?.textContent), t(r.querySelector('[data-slot=table-cell-identity] [data-slot=table-cell-text]')?.textContent ?? r.querySelector('[data-slot=table-cell-identity]').textContent)].join(' · ')),
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
          /* ---------- такт 88: вставка из другой схемы, тексты повторяемого процесса ---------- */
          paste: (() => { const el = document.querySelector('[data-side=paste]'); if (!el) return null
            const btn = el.querySelector('[data-act=paste-confirm]')
            const all = el.querySelector('[data-paste-all] [data-slot=choice-control], [data-paste-all][data-slot=choice-control]')
            return {
              kind: el.dataset.kind, level: el.dataset.level,
              title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent), sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
              back: !!el.querySelector('[data-modal-back]'),
              query: el.querySelector('[data-field=paste-search] input, input[data-field=paste-search]')?.value ?? null,
              /* Схемы: группа — «легенда», строка — «id · название вторая строка». */
              groups: [...el.querySelectorAll('[data-paste-group]')].map(g => ({ legend: t(g.querySelector('[data-slot=field-set-legend]')?.textContent),
                rows: [...g.querySelectorAll('[data-paste-scheme]')].map(r => r.dataset.pasteScheme + ' · ' + t(r.innerText)) })),
              marks: [...el.querySelectorAll('[data-paste-scheme] [data-slot=highlight-text-match]')].map(x => t(x.textContent)),
              empty: t(el.querySelector('[data-paste-empty] [data-slot=empty-title]')?.textContent) || null,
              parts: [...el.querySelectorAll('[data-paste-part]')].map(r => r.dataset.pastePart + ' · ' + t(r.innerText) + (r.disabled ? ' · выкл' : '')),
              target: t(el.querySelector('[data-field=paste-target] [data-slot=field-input]')?.textContent) || null,
              /* Строка поля или шага: id · имя · пояснение (конфликт алиаса, подсказки и нейросети) · алиас либо способ · тип · выбрано. */
              rows: [...el.querySelectorAll('[data-paste-row]')].map(r => [r.dataset.pasteRow,
                t(r.querySelector('[data-slot=table-cell-identity] [data-slot=table-cell-text]')?.textContent ?? r.querySelector('[data-slot=table-cell-identity]')?.textContent),
                t(r.querySelector('[data-slot=table-cell-identity-description]')?.textContent),
                t(r.querySelector('[data-paste-alias], [data-paste-method]')?.textContent), t(r.querySelector('[data-slot=chip]')?.textContent),
                r.querySelector('[data-slot=choice-control]')?.getAttribute('aria-checked') === 'true' ? 'выбрано' : ''].filter(Boolean).join(' · ')),
              all: all?.getAttribute('aria-checked') ?? null,
              note: t(el.querySelector('[data-slot=modal-card-note]')?.textContent),
              confirm: btn ? t(btn.textContent) + (btn.disabled ? ' · выкл' : '') : null,
            } })(),
          /* Уведомления не закрывают кнопки подвала открытого окна (такт 88): null — уведомлений нет. */
          toastClear: (() => { const toasts = [...document.querySelectorAll('[data-slot=toast]')].map(x => x.getBoundingClientRect()); if (!toasts.length) return null
            const acts = [...document.querySelectorAll('[data-slot=modal-card-actions]')].map(x => x.getBoundingClientRect()).filter(r => r.width > 0)
            return toasts.every(a => acts.every(b => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)) })(),
          /* Фокус в сайде вставки: строка схемы, группы (процесса), флажок строки поля (шага). */
          focusPaste: (() => { const a = document.activeElement; if (!a?.closest?.('[data-side=paste]')) return null
            if (a.dataset.pasteScheme) return 'scheme ' + a.dataset.pasteScheme
            if (a.dataset.pastePart) return 'part ' + a.dataset.pastePart
            const row = a.closest('[data-paste-row]'); if (row) return 'row ' + row.dataset.pasteRow
            return a.dataset.act ?? a.dataset.slot ?? a.tagName.toLowerCase() })(),
          /* Раздел «Тексты в приложении» оверлея: кнопка заполнения и её подсказка, значения полей, чипы-варианты («*» — выбран). */
          texts: (() => { const el = document.querySelector('[data-overlay-texts]'); if (!el) return null
            const fill = el.querySelector('[data-act=texts-fill]')
            return {
              fill: fill ? (fill.disabled ? 'выкл' : 'вкл') : null,
              fillHint: t(el.querySelector('[data-texts-fill] [data-slot=field-hint]')?.textContent),
              values: Object.fromEntries([...el.querySelectorAll('[data-text]')].map(f => [f.dataset.text, f.querySelector('input[data-slot=field-input]')?.value ?? null])),
              chips: Object.fromEntries([...el.querySelectorAll('[data-text]')].map(f => [f.dataset.text,
                [...f.querySelectorAll('[data-text-chips] [data-slot=chip][data-pressable]')].map(c => t(c.textContent) + (c.getAttribute('aria-pressed') === 'true' ? ' *' : ''))])),
              hints: Object.fromEntries([...el.querySelectorAll('[data-text]')].map(f => [f.dataset.text, t(f.querySelector('[data-slot=field-hint]')?.textContent)])),
            } })(),
          /* Поповер «Все варианты»: поле, запрос, группы по типу объекта («*» — выбран), пустая выдача. */
          variants: (() => { const el = document.querySelector('[data-variants]'); if (!el) return null
            return { key: el.dataset.variants, query: el.querySelector('[data-field=variants-search] input, input[data-field=variants-search]')?.value ?? null,
              groups: [...el.querySelectorAll('[data-variant-group]')].map(g => t(g.querySelector('[data-slot=list-group-header]')?.textContent) + ': '
                + [...g.querySelectorAll('[data-slot=list-item]')].map(i => t(i.textContent) + (i.hasAttribute('data-selected') ? ' *' : '')).join(', ')),
              marks: [...el.querySelectorAll('[data-slot=highlight-text-match]')].map(x => t(x.textContent)),
              empty: t(el.querySelector('[data-variants-empty] [data-slot=empty-title]')?.textContent) || null } })(),
          /* ---------- такт 89: демо-осмотр, превью у «?», фрагмент экрана в разделе текстов ---------- */
          /* Часть телефона: «ключ · текст», «◉» — обведена. */
          /* Текст части — innerText: Vue сжимает пробел между элементами, textContent склеил бы подпись и заполнитель (ловушка такта 64). */
          ...(() => { const parts = root => [...(root?.querySelectorAll('[data-part]') ?? [])].map(p => p.dataset.part + (t(p.innerText) ? ' · ' + t(p.innerText) : '') + (p.dataset.highlighted ? ' ◉' : ''))
            const el = document.querySelector('[data-overlay=demo]')
            const help = document.querySelector('[data-slot=help-preview]')
            const texts = document.querySelector('[data-texts-preview]')
            return {
              demo: el ? {
                title: t(el.querySelector('[data-slot=modal-card-title]')?.textContent), sub: t(el.querySelector('[data-slot=modal-card-subtitle]')?.textContent),
                mode: el.dataset.mode, screen: el.dataset.screen,
                counter: t(el.querySelector('[data-demo-counter]')?.textContent) || null,
                /* Этапы оглавления: «id», «!» — есть экран с пробелом; текущий этап; якоря — «подпись пробелы», «*» — текущий экран. */
                stages: [...el.querySelectorAll('[data-demo-toc] [data-slot=section-nav-item]')].map(b => b.dataset.value + (b.dataset.status === 'attention' ? ' !' : '')),
                stage: el.querySelector('[data-demo-toc] [data-slot=section-nav-item][aria-current=true]')?.dataset.value ?? null,
                anchors: [...el.querySelectorAll('[data-demo-toc] [data-slot=section-nav-anchor]')].map(a => [t(a.querySelector('span')?.textContent),
                  t(a.querySelector('[data-slot=section-nav-anchor-description]')?.textContent)].filter(Boolean).join(' | ') + (a.getAttribute('aria-current') ? ' *' : '')),
                phoneTitle: t(el.querySelector('[data-demo-phone] [data-slot=app-preview-title]')?.textContent) || null,
                phone: el.querySelector('[data-demo-phone]') ? parts(el.querySelector('[data-demo-phone]')) : null,
                /* «Из чего собран экран»: «источник · подпись | значение», «*» — подсвечена. */
                sources: [...el.querySelectorAll('[data-demo-sources] [data-source]')].map(r => r.dataset.source + ' · ' + t(r.querySelector('[data-slot=list-item-title]')?.textContent)
                  + ' | ' + t(r.querySelector('[data-slot=list-item-subtitle]')?.textContent) + (r.hasAttribute('data-selected') ? ' *' : '')),
                map: el.querySelector('[data-demo-map]') ? [...el.querySelectorAll('[data-map-stage]')].map(s => s.dataset.mapStage + ': '
                  + [...s.querySelectorAll('[data-thumb]')].map(x => x.dataset.thumb + (x.dataset.current ? ' *' : '') + (x.querySelector('[data-slot=app-preview-thumb-gap]') ? ' !' : '')).join(', ')) : null,
                prevOff: el.querySelector('[data-act=demo-prev]')?.disabled ?? null, nextOff: el.querySelector('[data-act=demo-next]')?.disabled ?? null,
                /* Подпись перехода у строк: «Изменить», в просмотре версии — «Показать». */
                edit: t(el.querySelector('[data-demo-sources] [data-act=demo-edit]')?.textContent) || null,
              } : null,
              help: help ? {
                title: t(help.querySelector('[data-slot=help-preview-title]')?.textContent), description: t(help.querySelector('[data-slot=help-preview-description]')?.textContent),
                value: t(help.querySelector('[data-slot=help-preview-value]')?.textContent), fragment: !!help.querySelector('[data-slot=app-preview][data-fragment]'),
                marked: [...help.querySelectorAll('[data-part][data-highlighted]')].map(p => p.dataset.part),
                parts: help.querySelector('[data-slot=help-preview-media]') ? parts(help.querySelector('[data-slot=help-preview-media]')) : [],
              } : null,
              textsPreview: texts ? { parts: parts(texts), marked: [...texts.querySelectorAll('[data-part][data-highlighted]')].map(p => p.dataset.part) } : null,
            } })(),
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
              title: val('scTitle'), summary: val('scSummary'),
              /* Такт 90: ручная цена — поле scPriceValue (у «Из тарифа» и «Не показывать» его нет); источник — отмеченная карточка;
                 цена из тарифа — части вилки по листьям (Vue сжимает пробел между элементами); подсказка ручной цены — текст и тон. */
              price: (v => v == null ? null : t(v))(val('scPriceValue')),
              priceSource: el.querySelector('[data-radio=priceSource] [data-slot=choice-control][aria-checked=true]')?.closest('[data-price-source]')?.dataset.priceSource ?? null,
              tariff: (pr => { if (!pr) return null; const leaf = x => x.children.length ? [...x.children].map(leaf).filter(Boolean).join(' ') : t(x.textContent); return leaf(pr) })(el.querySelector('[data-price-tariff] [data-slot=price-range]')),
              tariffLink: (a => a ? a.getAttribute('href') + ' | ' + a.getAttribute('target') : null)(el.querySelector('[data-link=tariffs]')),
              priceHint: (h => h ? t(h.textContent) + ' | ' + (h.dataset.tone ?? 'default') : null)(el.querySelector('[data-field=scPriceValue] [data-slot=field-hint]')),
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
                /* Такт 90: «Предпросмотр страницы» — просмотр, в версии доступен: правкой не считается. */
                actsInert: [...el.querySelectorAll('[data-act]')].filter(x => x.dataset.act !== 'site-preview').every(x => !!x.closest('[inert]')), removable: el.querySelectorAll('[data-slot=chip-remove]').length },
            } })(),
          hint: t(document.querySelector('[data-autosave-hint] [data-slot=callout-text]')?.textContent) || null,
          /* Двухфазность новой схемы: выключенные табы и обёртки с причиной; подсказка — текст открытой подсказки. */
          tabLock: { off: [...document.querySelectorAll('[data-tab-trigger]')].filter(b => b.disabled).map(b => b.dataset.tabTrigger),
            wrap: [...document.querySelectorAll('[data-slot=tabs-trigger-reason]')].map(w => w.querySelector('[data-tab-trigger]')?.dataset.tabTrigger + ' | ' + w.getAttribute('aria-label')) },
          tooltip: t([...document.querySelectorAll('[data-slot=tooltip-content]')].pop()?.innerText.split(String.fromCharCode(10))[0]) || null,
          focusLock: document.activeElement?.closest?.('[data-slot=tabs-trigger-reason]')?.querySelector('[data-tab-trigger]')?.dataset.tabTrigger ?? null,
          /* Кольцо кита у вкладки с причиной в фокусе — слой after обёртки (такт 73): тень кольца не пуста. */
          lockRing: document.activeElement?.dataset?.slot === 'tabs-trigger-reason' ? getComputedStyle(document.activeElement, '::after').boxShadow !== 'none' : null,
          emptyActs: [...document.querySelectorAll('[data-slot=tabs-content][data-state=active] [data-slot=empty] [data-act]')].map(b => b.dataset.act),
          /*
           * Такт 90: превью публичной страницы — заголовок, устройство и вид, статус карточки, адрес, незаполненное над рамкой, рамка
           * (устройство, адрес, ширина тела), разделы страницы, метки «Не заполнено» по местам, первый экран, пары, метрики, шаги,
           * модули, карточка каталога.
           */
          site: (() => { const el = document.querySelector('[data-overlay=site]'); if (!el) return null
            const one = (root, sel) => root?.querySelector(sel) ?? null
            const txt = x => (x ? t(x.textContent) : null)
            const frame = one(el, '[data-slot=app-preview-browser]')
            const hero = one(el, '[data-section=hero]')
            const card = one(el, '[data-slot=scenario-preview-card]')
            const pic = x => (x ? x.getAttribute('src').split('/').pop() : null)
            const price = p => (p ? t(p.firstElementChild?.textContent ?? p.textContent) : null)
            const tags = root => (root ? [...root.querySelectorAll('[data-slot=scenario-preview-tag]')].map(x => t(x.textContent)) : [])
            const grid = hero?.firstElementChild
            return {
              title: txt(one(el, '[data-slot=modal-card-title]')), subtitle: txt(one(el, '[data-slot=modal-card-subtitle]')),
              device: el.dataset.device, view: el.dataset.view,
              status: txt(one(el, '[data-site-status]')), address: txt(one(el, '[data-site-address]')), gapsText: txt(one(el, '[data-site-gaps]')),
              frame: frame?.dataset.device ?? null, url: txt(one(frame, '[data-slot=app-preview-browser-url]')),
              frameWidth: Math.round(one(frame, '[data-slot=app-preview-browser-body]')?.getBoundingClientRect().width ?? 0),
              sections: [...el.querySelectorAll('[data-section]')].map(x => x.dataset.section),
              gaps: [...el.querySelectorAll('[data-gap]')].map(x => x.dataset.gap),
              hero: hero ? {
                tags: tags(one(hero, '[data-part=tags]')), title: txt(one(hero, '[data-part=title]')), summary: txt(one(hero, '[data-part=summary]')),
                price: price(one(hero, '[data-part=price]')), image: pic(one(hero, 'img')), action: txt(one(hero, '[data-part=action]')),
                columns: grid ? (getComputedStyle(grid).gridTemplateColumns === 'none' ? 1 : getComputedStyle(grid).gridTemplateColumns.split(' ').length) : null,
              } : null,
              pairs: [...el.querySelectorAll('[data-slot=scenario-preview-pair]')].map(p => [...p.querySelectorAll('[data-part], [data-gap]')].map(x => (x.dataset.gap ? 'gap:' + x.dataset.gap : t(x.textContent))).join(' | ')),
              metrics: [...el.querySelectorAll('[data-slot=scenario-preview-metric]')].map(m => [...m.querySelectorAll('[data-part], [data-gap]')].map(x => (x.dataset.gap ? 'gap:' + x.dataset.gap : t(x.textContent))).join(' | ')),
              steps: [...el.querySelectorAll('[data-slot=scenario-preview-step] [data-part=step]')].map(x => t(x.textContent)),
              modules: tags(one(el, '[data-section=modules]')),
              card: card ? {
                title: txt(one(card, '[data-part=title]')), summary: txt(one(card, '[data-part=summary]')), price: price(one(card, '[data-part=price]')),
                tags: tags(card), image: pic(one(card, 'img')), width: Math.round(card.getBoundingClientRect().width),
              } : null,
            } })(),
          /*
           * ---------- такт 91: модель готовности ----------
           * Полоса — заголовок, «Далее», этапы «id состояние ! N *» («*» — текущий); чип — подпись и маркер; поповер — заголовок,
           * сводка, группы списка; маркеры вкладок; «Далее» внизу этапа; флажок «Правил»; список первой публикации и проверки над
           * диффом; подвал окна; тон пунктов меню «⋯». rd — модель: готово из пяти, блокирующие, предупреждения, следующий и
           * текущий этап.
           */
          page: 'scheme', url, createWin,
          rd: (r => ({ done: r.done, total: r.total, blocks: r.blocks, warns: r.warns, next: r.next.id, current: M.currentStage.value }))(M.readiness.value),
          rulesChecked: M.draft.rulesChecked,
          strip: (b => b ? { title: t(b.querySelector('[data-slot=readiness-bar-title]')?.textContent), next: t(b.querySelector('[data-readiness-next]')?.textContent) || null,
            stages: [...b.querySelectorAll('[data-slot=readiness-stage]')].map(s => s.dataset.stage + ' ' + s.dataset.state
              + ((p => p ? ' ' + t(p.textContent) : '')(s.querySelector('span[aria-hidden=true]'))) + (s.dataset.current ? ' *' : '')) } : null)(document.querySelector('[data-slot=readiness-bar]')),
          chip: (c => c ? { label: t(c.querySelector('[data-slot=readiness-chip-label]')?.textContent), mark: markOf(c.querySelector('[data-slot=readiness-mark]')), open: c.dataset.state === 'open' } : null)(document.querySelector('[data-slot=readiness-chip]')),
          ready: (p => p ? { title: t(p.querySelector('[data-slot=readiness-popover-title]')?.textContent), summary: t(p.querySelector('[data-slot=readiness-popover-summary]')?.textContent),
            groups: listOf(p), footer: [...p.querySelectorAll('[data-slot=readiness-popover-footer] [data-act]')].map(b => b.dataset.act) } : null)(document.querySelector('[data-readiness-popover]')),
          tabMarks: Object.fromEntries([...document.querySelectorAll('[data-tab-trigger]')].map(b => [b.dataset.tabTrigger, markOf(b.querySelector('[data-slot=readiness-mark]'))])),
          stageNext: [...document.querySelectorAll('[data-stage-next]')].map(x => x.dataset.stageNext + ' · ' + t(x.querySelector('button[data-act]')?.textContent)),
          rulesBox: checked(document.querySelector('[data-field=rules-check]')),
          firstList: listOf(document.querySelector('[data-first-readiness]')),
          gate: listOf(document.querySelector('[data-publish-checks]')),
          note: t([...document.querySelectorAll('[data-slot=modal-card-note]')].pop()?.textContent) || null,
          menuTone: [...document.querySelectorAll('[data-menu=scheme] [data-slot=list-item]')].map(x => t(x.textContent) + (x.dataset.tone ? ' · ' + x.dataset.tone : '')),
          /* Такт 92, поправка 1б: пункты меню действий строки таблицы с тоном. */
          rowMenu: [...document.querySelectorAll('[data-menu=row-actions] [data-slot=list-item]')].map(x => t(x.textContent) + (x.dataset.tone ? ' · ' + x.dataset.tone : '')),
          /*
           * ---------- такт 92: узкий экран ----------
           * Ширина документа; имя схемы — строк и кегль; действия в строке шапки; нижняя полоса — кнопки и у низа ли окна; выбор раздела —
           * значение и верх; навигатор; выбор группы; строки-карточки полей и шагов; таблиц на странице; верхнее окно — край и во всё ли
           * окно; выдача поиска — край, ширина, низ; верх поля поиска; уведомления над полосой; меню «⋯» строки-карточки; вкладка и рамка
           * демо-осмотра.
           */
          frame,
          phone: (() => { if (!root.dataset.phone) return null
            const vis = el => !!el && el.getBoundingClientRect().width > 0
            const dock = document.querySelector('[data-dock]')
            const title = document.querySelector('[data-scheme-title] [data-slot=heading], [data-scheme-title][data-slot=heading]')
            const sel = document.querySelector('[data-section-select]')
            const top = [...document.querySelectorAll('[data-slot=modal-card]')].filter(x => x.dataset.state !== 'closed').pop()
            const res = document.querySelector('[data-search-results]')
            const toasts = [...document.querySelectorAll('[data-slot=toast]')].map(x => x.getBoundingClientRect())
            const demo = document.querySelector('[data-overlay=demo]')
            return {
              docWidth: document.documentElement.scrollWidth,
              titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : null,
              titleSize: title ? getComputedStyle(title).fontSize + '/' + getComputedStyle(title).lineHeight : null,
              headerActs: [...document.querySelectorAll('[data-header-row] [data-act]')].filter(vis).map(b => b.dataset.act),
              dock: dock ? [...dock.querySelectorAll('[data-act]')].map(b => b.dataset.act) : null,
              dockAtBottom: dock ? Math.round(innerHeight - dock.getBoundingClientRect().bottom) === 0 && Math.round(dock.getBoundingClientRect().width) === innerWidth : null,
              section: sel ? t(sel.querySelector('[data-slot=field-input]')?.textContent) : null,
              sectionTop: sel ? Math.round(sel.getBoundingClientRect().top) : null,
              nav: !!document.querySelector('[data-settings-column]') && [...document.querySelectorAll('[data-slot=section-nav]')].some(x => !x.closest('[data-slot=modal-card]')),
              group: t(document.querySelector('[data-group-select] [data-slot=field-input]')?.textContent) || null,
              fieldCards: [...document.querySelectorAll('[data-fields-cards] [data-form-row]')].map(c => t(c.querySelector('[data-slot=table-cell-text]')?.textContent)),
              stepCards: Object.fromEntries([...document.querySelectorAll('[data-steps-cards]')].map(l => [l.dataset.stepsCards, [...l.querySelectorAll('[data-step-row]')].map(c => t(c.querySelector('[data-slot=table-cell-text]')?.textContent))])),
              tables: document.querySelectorAll('[data-fields-table], [data-steps-table], [data-overlay-table]').length,
              surface: top ? (r => ({ x: Math.round(r.left), w: Math.round(r.width), full: Math.round(r.left) === 0 && Math.round(r.top) === 0 && Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight }))(top.getBoundingClientRect()) : null,
              results: res ? (r => ({ x: Math.round(r.left), w: Math.round(r.width), toBottom: Math.round(innerHeight - r.bottom) <= 1 }))(res.getBoundingClientRect()) : null,
              searchTop: Math.round(document.querySelector('[data-search]')?.getBoundingClientRect().top ?? -1),
              toastAboveDock: toasts.length && dock ? toasts.every(r => r.bottom <= dock.getBoundingClientRect().top && r.left >= 0 && r.right <= innerWidth) : null,
              cardMenu: [...document.querySelectorAll('[data-menu=card] [data-slot=list-item]')].map(x => t(x.textContent) + (x.dataset.tone ? ' · ' + x.dataset.tone : '')),
              demoPane: demo ? demo.querySelector('[data-demo-pane][data-state=active]')?.dataset.demoPane ?? null : null,
              demoFrame: demo ? (demo.querySelector('[data-demo-phone] [data-slot=app-preview]')?.dataset.frame ?? (demo.querySelector('[data-demo-phone]') ? 'phone' : null)) : null,
            } })(),
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
/** Такт 92: длинное имя — на узком экране три строки с многоточием. */
const LONG_NAME = 'КАСКО — комплексный осмотр легкового автомобиля перед оформлением полиса добровольного страхования с выездом'
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
  'СС-16': ['«Назад / Далее»: соседний раздел с названием; на первом разделе «Назад» нет, на последнем — «Далее» (r2 §3; такт 100)', [
    ['старт: первый раздел', null, { section: 'general', prevDisabled: null, nextDisabled: false, prevText: null, nextText: 'Мобильное приложение →' }],
    ['«Далее»', K => K.act('section-next'), { section: 'mobile', navActive: ['mobile'], prevDisabled: false, nextDisabled: false, prevText: '← Общие', nextText: 'Веб-приложение →', anchor: 'shooting', navAnchors: ['Параметры съёмки', 'Поведение в мобильном приложении'] }],
    ['«Далее» до последнего', async (K) => { for (let k = 0; k < 5; k++) await K.act('section-next') }, { section: 'pdf', navActive: ['pdf'], prevDisabled: false, nextDisabled: null, prevText: '← Аномалии', nextText: null }],
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
  /* ============================ П5, такт 65; такт 86 — поиск как в IDE ============================ */
  'СС-09': ['поиск: хоткей `/` ставит фокус, Esc очищает и снимает выдачу (r2 §3; аудит, «Клавиатура и фокус»; такт 86 — «Недавние» при пустом запросе)', [
    ['старт: поиск под шапкой, подсказка хоткея внутри поля', null, { query: '', searchFocus: false, searchOpen: false, hotkey: '/', hotkeyInField: true, searchClear: false, headerH: 44 }],
    ['«/» — фокус в поиске, знак не напечатан; пустой запрос — «Недавние»: фильтр изменённого', K => K.slash(), { searchFocus: true, query: '', searchOpen: true, hotkey: '/', searchClear: false,
      results: [{ path: '', items: ['Изменено в черновике | Места, которые черновик меняет против текущей версии'] }], searchFooter: '↑↓ выбрать · Enter перейти · Esc закрыть' }],
    ['набор «согл» — выдача открыта, фокус в поле; на месте подсказки крестик', K => K.type('согл'), { query: 'согл', searchFocus: true, searchOpen: true, hotkey: null, searchClear: true,
      results: [{ path: 'Настройки → Общие', items: ['Отправлять поля на согласование согласующему лицу', 'Обязательное согласование осмотра после экспертизы'] },
        { path: 'Настройки → PDF', items: ['Запрашивать подписание документа после успешной экспертизы | по запросу «согласование с клиентом»'] }],
      resultActive: 'Отправлять поля на согласование согласующему лицу' }],
    ['Esc — запрос очищен, выдача снята, подсказка вернулась', K => K.key('Escape'), { query: '', searchOpen: false, writes: 0, hotkey: '/', searchClear: false }],
    ['«/» при наборе в поле — знак печатается в поле', async (K) => { await K.typeInto('confirmHint', 'Да'); await K.slash(); await K.settled() },
      { 'g.confirm.hint': 'Да/', searchFocus: false, focusField: 'confirmHint' }],
  ]],
  'СС-10': ['поиск: сквозь все табы и разделы, синонимы из словаря; выдача сгруппирована по пути (r2 §3; аудит, «Требования к поиску»; такт 86 — начала слов, ранжирование, «ещё N»)', [
    ['«подпис» — два раздела, группы по пути; у длинной группы — «ещё N»', async (K) => { await K.searchClick(); await K.type('подпис') }, { searchOpen: true, searchEmpty: null, results: [
      { path: 'Настройки → Веб-приложение', items: ['Запретить переход в «Подписание» или «Контракт»'] },
      { path: 'Настройки → PDF', items: ['Запрашивать подписание документа после успешной экспертизы',
        'Кто подписывает документ | Скрыто: выключено «Запрашивать подписание документа после успешной экспертизы»',
        'Показывать подписанный PDF в приложении | Скрыто: выключено «Запрашивать подписание документа после успешной экспертизы»',
        'Отправлять подписанный PDF на почту | Скрыто: выключено «Запрашивать подписание документа после успешной экспертизы»',
        'Формировать PDF без подписи и показывать в приложении после экспертизы', 'ещё 1'] }], searchMore: ['ещё 1'], searchTotal: '7 результатов' }],
    ['синоним «размытые фото» — детектор размытых изображений', K => K.fill('[data-field=search]', 'размытые фото'),
      { results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»'] }] }],
    ['регистр и «ё» не мешают: «СЪЕМК»', K => K.fill('[data-field=search]', 'СЪЕМК'),
      { 'results.0.path': 'Настройки → Аномалии', 'results.0.items': ['Детектор «Аномалии кластеризации (съёмка вне основной точки)»', 'Детектор «Съёмка с экрана»',
        'Детектор «Отсутствие исходных координат» | У кадра нет координат съёмки', 'Детектор «Сниженная цветовая палитра» | В кадре мало цветов: возможна пересъёмка копии'] }],
    ['по описанию: «промежуточного экрана»', K => K.fill('[data-field=search]', 'промежуточного экрана'),
      { results: [{ path: 'Настройки → Мобильное приложение', items: ['Запустить осмотр сразу после создания | Пользователь сразу переходит к выполнению без промежуточного экрана'] }] }],
    ['длинная выдача — «ещё N»: «детектор»', K => K.fill('[data-field=search]', 'детектор'),
      { searchMore: ['ещё 10'], 'results.0.path': 'Настройки → Аномалии', 'results.0.items.0': 'Детектор «Подмена координат»', searchTotal: '15 результатов' }],
    ['поле формы по алиасу (такт 69): «regnum» — путь «Форма → Автомобиль»', K => K.fill('[data-field=search]', 'regnum'),
      { results: [{ path: 'Форма → Автомобиль', items: ['Госномер | алиас regnum'] }] }],
    ['шаг процесса (такт 70): «металле» — путь «Процессы → Осмотр автомобиля»', K => K.fill('[data-field=search]', 'металле'),
      { results: [{ path: 'Процессы → Осмотр автомобиля', items: ['VIN на металле'] }] }],
    ['шаг по описанию: «лобовое стекло»', K => K.fill('[data-field=search]', 'лобовое стекло'),
      { results: [{ path: 'Процессы → Осмотр автомобиля', items: ['VIN под стеклом | Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден'] }] }],
    ['поле витрины (такт 72): «теги» — путь «Витрина → Витринная карточка»', K => K.fill('[data-field=search]', 'теги'),
      { results: [{ path: 'Витрина → Витринная карточка', items: ['Индустрия | по запросу «теги»', 'Сфера применения | по запросу «теги»', 'Объект | по запросу «теги»'] }] }],
    ['поиск работает с любого таба', async (K) => { await K.key('Escape'); await K.tab('showcase'); await K.slash(); await K.type('дедлайн') },
      { tab: 'showcase', searchOpen: true, 'results.0.path': 'Настройки → Общие', 'results.0.items.0': 'Дедлайн проверки' }],
  ]],
  'СС-11': ['поиск: выбор результата ведёт к месту — таб, раздел, прокрутка, подсветка; запрос остаётся — режим «найдено» (r2 §3; аудит, «Требование к поиску при вложенности»; такт 86)', [
    ['с таба «Форма»: «/», «размытые фото», Enter — раздел «Аномалии», строка подсвечена, запрос в поле', async (K) => { await K.tab('form'); await K.slash(); await K.type('размытые фото'); await K.key('Enter') },
      { tab: 'settings', section: 'anomalies', navActive: ['anomalies'], flash: ['det-blur'], foundVisible: true, query: 'размытые фото', searchOpen: false, searchFocus: false, writes: 0, 'find.counter': '1 из 1' }],
    ['клик по результату: «кадастр» — «Общие», якорь «Поведение процесса», прокрутка и подсветка', async (K) => { await K.fill('[data-field=search]', 'кадастр'); await K.result('general.behavior.cadastreMap') },
      { section: 'general', anchor: 'behavior', flash: ['cadastreMap'], foundVisible: true, searchOpen: false, query: 'кадастр' }],
    ['стрелка вниз и Enter — второй результат', async (K) => { await K.fill('[data-field=search]', 'опытным'); await K.key('ArrowDown'); await K.key('Enter') },
      { section: 'mobile', anchor: 'mobile-behavior', flash: ['skipConfirm'], foundVisible: true }],
    ['цель — поле: «наименование» — фокус в поле «Наименование»', async (K) => { await K.fill('[data-field=search]', 'наименование'); await K.key('Enter') },
      { section: 'general', anchor: 'main', focusField: 'name', flash: [], foundVisible: true, writes: 0 }],
    ['настройка, скрытая под выключенным родителем, — подсвечен родитель: «кто подписывает»', async (K) => { await K.fill('[data-field=search]', 'кто подписывает'); await K.key('Enter') },
      { section: 'pdf', flash: ['pdfSign'], foundVisible: true, 'rows.pdfSign.children': false }],
    ['поле формы (такт 69): «госномер», Enter — таб «Форма», группа «Автомобиль», фокус на строке поля', async (K) => { await K.fill('[data-field=search]', 'госномер'); await K.key('Enter') },
      { tab: 'form', 'form.group': 'Автомобиль', focusRow: 'f-plate', searchOpen: false, query: 'госномер', writes: 0 }],
    ['шаг процесса (такт 70): «вид справа», Enter — таб «Процессы и шаги», фокус на флажке строки шага', async (K) => { await K.fill('[data-field=search]', 'вид справа'); await K.key('Enter') },
      { tab: 'processes', focusStep: 's-right', focusHandle: null, searchOpen: false, query: 'вид справа', writes: 0 }],
    ['поле витрины (такт 72): «продающее», Enter — таб «Витрина», фокус в поле', async (K) => { await K.fill('[data-field=search]', 'продающее'); await K.key('Enter') },
      { tab: 'showcase', focusField: 'scTitle', searchOpen: false, query: 'продающее', writes: 0 }],
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
  'СС-12': ['поиск: пустая выдача — «Ничего не найдено по «…»», другая раскладка и «Быстрый переход» (r2 §3; аудит, «Требования к поиску»; такт 86)', [
    ['«фаыфа» — пустая выдача подсказывает: другая раскладка тоже пуста, быстрый переход', async (K) => { await K.searchClick(); await K.type('фаыфа') },
      { searchOpen: true, results: [], searchEmpty: 'Ничего не найдено по «фаыфа»', searchEmptyDesc: 'В другой раскладке — «afsaf» — тоже ничего. Быстрый переход',
        quickLinks: ['Аномалии', 'Права доступа', 'PDF', 'Процессы и шаги'] }],
    ['Enter при пустой выдаче — на месте', K => K.key('Enter'), { searchOpen: true, section: 'general', tab: 'settings', find: null }],
    ['быстрый переход «PDF»', K => K.quickLink(2), { section: 'pdf', tab: 'settings', searchOpen: false, query: '', 'templates.length': 2 }],
    ['быстрый переход «Процессы и шаги»', async (K) => { await K.searchClick(); await K.type('ъъъ'); await K.quickLink(3) }, { tab: 'processes', searchOpen: false, query: '', pending: null, 'proc.cards.length': 3 }],
  ]],
  /* ============================ П4, такт 64 ============================ */
  'СС-02': ['новая схема: индикатор «Ни разу не опубликовано», главная кнопка ведёт в первую публикацию (r2 §2, состояние 1)', [
    /* Такт 91: «История версий» — после первой публикации (ревью С-1); чип «Готовность N из 5» — у «Опубликовать схему». */
    ['старт', null, { publish: 'never', status: { state: 'never', text: 'Ни разу не опубликовано', clickable: false, editing: '' }, versions: 0, current: null, headerActs: ['preview', 'readiness', 'publish', 'menu'] }],
    ['«Опубликовать схему» — первая публикация', K => K.publish(), { surface: 'first-publish', modalTitle: 'Первая публикация схемы', diff: null, versions: 0 }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  /* Такт 102 (владелец 2026-10-09, доска scheme-edit-batch1-v1): индикатор коротко — инициалы, время, число правок; полное — подсказкой. */
  'СС-03': ['правка делает черновик грязным: индикатор «Черновик: {инициалы}, {время} · N изменений», число — счёт диффа публикации; клик по индикатору открывает дифф (r2 §2, состояние 2; аудит, «Индикатор состояния схемы»)', [
    ['старт: черновик с чужими правками', null, { publish: 'draft', status: { state: 'draft', text: 'Черновик: И. П., 11:40 · 4 изменения', clickable: true, editing: '' }, saveText: 'Все изменения сохранены', saveIcon: true }],
    ['своя правка — автор, время и число правок', async (K) => { await K.toggle('skipExpertise'); await K.settled() },
      { 'status.text': 'Черновик: А. С., 09:00 · 5 изменений', 'status.clickable': true, writes: 1 }],
    ['клик по индикатору открывает дифф', K => K.statusOpen(), { surface: 'publish', modalTitle: 'Публикация схемы', 'diff.areas.0': { id: 'settings', count: '2 изменения', tone: 'changed' }, versions: 2 }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-04': ['«Предпросмотр» открывает демо-осмотр — полноэкранный оверлей по черновику (r2 §3; ревью 4.1, такт 89; до такта 89 — уведомление-заглушка)', [
    ['«Предпросмотр» — демо-осмотр на первом экране, «По шагам»', K => K.act('preview'),
      { surface: 'demo', notices: [], 'demo.title': 'Демо-осмотр — КАСКО — осмотр легкового автомобиля', 'demo.sub': 'По черновику · логика не выполняется',
        'demo.mode': 'steps', 'demo.screen': 'start', 'demo.counter': 'Экран 1 из 14', writes: 0, versions: 2 }],
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
  'СС-06': ['первая публикация: модель готовности вместо сводки — этапы с проверками; подтверждение рождает первую версию (r2 §2; аудит, «Первая публикация ≠ дифф»; ревью 5.5, такт 91)', [
    ['«Опубликовать схему» — первая публикация: этапы и проверки, «Опубликовать» доступна', K => K.publish(), { surface: 'first-publish', modalTitle: 'Первая публикация схемы', diff: null, confirmOff: false,
      note: 'После публикации создаётся неизменяемый снимок версии', firstSummary: [], firstList: [
        { head: 'base done · Основа · Осмотр транспорта · Демо Страхование', checks: [], manual: null },
        { head: 'form done · Анкета · 8 полей в 2 группах', checks: [], manual: null },
        { head: 'shooting warning 1 · Съёмка · 9 шагов в 2 процессах', checks: ['step-hint:ts-car-interior · warn · У шага «Салон» нет фото-подсказки · Процессы → Осмотр автомобиля'], manual: null },
        { head: 'rules todo · Правила · Проверьте права доступа и шаблоны PDF', checks: [], manual: 'false' },
        { head: 'publish ready · Проверка и публикация · Готово к публикации', checks: [], manual: null },
        { head: 'showcase locked · Витрина — после публикации · Доступно после публикации схемы', checks: [], manual: null }] }],
    ['«Отмена»', K => K.act('first-cancel'), { surface: '', versions: 0, publish: 'never' }],
    ['«Опубликовать» — первая версия; полоса подготовки ушла, «История версий» в шапке, чип «Проверка: 1»', async (K) => { await K.publish(); await K.act('first-confirm') },
      { surface: '', versions: 1, current: 'v1', publish: 'published', 'status.text': 'Всё опубликовано', notices: ['Схема опубликована: версия от 03.10.2026, 09:00'], strip: null,
        headerActs: ['history', 'preview', 'readiness', 'publish', 'menu'], 'chip.label': 'Проверка:', stageNext: [] }],
    ['повторное нажатие — публиковать нечего', K => K.publish(), { surface: '', versions: 1, notices: ['Публиковать нечего: изменений нет'] }],
  ], { query: 'data=created&from=t-car&now=2026-10-03T09:00:00' }],
  'СС-07': ['меню «⋯»: экспорт, дамп, копия, удаление — пункты с уведомлением-заглушкой, удаление с подтверждением (r2 §3)', [
    ['открыть меню', K => K.menu(), { menuItems: ['Экспортировать схему', 'Скачать дамп', 'Сделать копию', 'Сбросить черновик к текущей версии', 'Удалить схему'],
      menuTone: ['Экспортировать схему', 'Скачать дамп', 'Сделать копию', 'Сбросить черновик к текущей версии', 'Удалить схему · destructive'] }],
    ['«Экспортировать схему»', K => K.act('menu').then(() => K.menu('export')), { notices: ['Экспорт схемы — вне стенда'], menuItems: [] }],
    ['«Скачать дамп»', K => K.menu('dump'), { notices: ['Дамп схемы — вне стенда'] }],
    /* Такт 91: копия — окно «Новая схема осмотра» на шаге «Основа»; до такта 91 — уведомление «вне стенда». */
    ['«Сделать копию» — окно «Новая схема осмотра» на шаге «Основа»', K => K.menu('copy'), { surface: 'copy', 'createWin.mode': 'copy', 'createWin.step': 'base', notices: [] }],
    ['Esc; «Удалить схему» — подтверждение', async (K) => { await K.key('Escape'); await K.menu('delete') }, { surface: 'delete', modalTitle: 'Удалить схему?', notices: [] }],
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
  'СС-45/новая': ['история версий у новой схемы — входа нет до первой публикации (ревью С-1, такт 91; до такта 91 — сайд «Публикаций ещё не было»)', [
    ['старт: в шапке «Истории версий» нет', null, { headerActs: ['preview', 'readiness', 'publish', 'menu'], versions: 0 }],
    ['поиск «история» — действие приглушено с причиной', async (K) => { await K.searchClick(); await K.type('история') },
      { results: [{ path: 'Действия', items: ['История версий | Появится после первой публикации схемы'] }] }],
    ['Enter — отказ с причиной, сайда нет', K => K.key('Enter'), { surface: '', notices: ['Появится после первой публикации схемы'] }],
  ], { query: 'data=new' }],
  'СС-46': ['история: клик по версии — её дифф с предыдущей вторым слоем сайда, «← назад», «Сделать копию» (r2 §2; аудит, «Два режима одного дифф-компонента»)', [
    ['версия от 22.09 — второй слой с диффом', async (K) => { await K.act('history'); await K.version('v2') }, { surface: 'history', headerType: 'back', modalTitle: 'Версия от 22.09.2026, 16:05', modalSub: 'Опубликовал(а) Игорь Петров · 41 осмотр',
      'diff.areas': [{ id: 'settings', count: '1 изменение', tone: 'changed' }, { id: 'form', count: '2 изменения', tone: 'changed' }, { id: 'processes', count: '6 изменений', tone: 'changed' }, { id: 'showcase', count: '4 изменения', tone: 'changed' }],
      'diff.total': 'Итого: 13 изменений в 4 разделах', 'diff.attention': [], sideActs: ['version-copy'], versionFirst: false }],
    ['раскрыть «Процессы и шаги»', K => K.area('processes'), { 'diff.open.0.groups.0': { kind: 'added', title: 'Добавлено · 4', items: ['Шаг «VIN на металле» | процесс «Осмотр автомобиля»', 'Шаг «Вид справа» | процесс «Осмотр автомобиля»', 'Процесс «Осмотр документов» | 2 шага', 'Процесс «Осмотр повреждений» | 0 шагов'] } }],
    ['«←» — назад к списку', K => K.backLayer(), { headerType: 'close', modalTitle: 'История версий', 'historyRows.length': 2 }],
    ['первая версия — сравнивать не с чем; «Открыть версию» есть', K => K.version('v1'), { headerType: 'back', modalTitle: 'Версия от 14.08.2026, 10:20', versionFirst: true, diff: null, sideActs: ['version-copy', 'version-view'] }],
    /* Такт 91: копия версии — окно «Новая схема осмотра» поверх истории, имя — из версии. */
    ['«Сделать копию» — окно на шаге «Основа» с «Копия — …»', K => K.act('version-copy'),
      { surface: 'copy', surfaces: ['history', 'copy'], 'createWin.name': 'Копия — КАСКО — осмотр легкового автомобиля', notices: [], versions: 2, writes: 0 }],
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
    ['«Сделать копию» — окно на шаге «Основа» (такт 91)', K => K.act('view-copy'), { surface: 'copy', 'createWin.step': 'base', notices: [], viewing: 'v1' }],
    ['Esc; «Перейти к текущей версии» — снова черновик, чип «Проверка: 6»', async (K) => { await K.key('Escape'); await K.act('view-leave') },
      { viewing: '', readonly: false, banner7: null, 'status.state': 'draft', headerActs: ['history', 'preview', 'readiness', 'publish', 'menu'], 'chip.label': 'Проверка:' }],
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
      { surface: 'publish', 'diff.warnings': [], 'gate.0': { head: 'settings warning 1 · Настройки',
        checks: ['formula:zipName:Car:colour · warn · Формула имени zip-архива ссылается на переменную {Car:colour}, которой нет в форме · Настройки → Формулы и служебное'], manual: null }, confirmOff: false }],
    ['пустое наименование — критичное: «Опубликовать» выключена', async (K) => { await K.act('publish-cancel'); await K.clear('[data-field=name]'); await K.settled(); await K.publish() },
      { surface: 'publish', name: '', confirmOff: true, note: 'Публикация невозможна: исправьте блокирующие проверки — 1', 'gate.0': { head: 'settings blocked 2 · Настройки',
        checks: ['name-empty · block · Наименование схемы не заполнено · Настройки → Основное', 'formula:zipName:Car:colour · warn · Формула имени zip-архива ссылается на переменную {Car:colour}, которой нет в форме · Настройки → Формулы и служебное'], manual: null } }],
    ['нажатие по выключенной «Опубликовать» — снимка нет', K => K.act('publish-confirm'), { surface: 'publish', versions: 2 }, { blind: true }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-48/первая': ['валидация в первой публикации: согласование без полей — предупреждение у «Анкеты»; форма без полей блокирует (аудит, «Валидационный гейт публикации»; такт 91 — модель готовности)', [
    ['включить согласование и открыть первую публикацию', async (K) => { await K.toggle('approval'); await K.settled(); await K.publish() },
      { surface: 'first-publish', diff: null, 'firstList.1': { head: 'form blocked 2 · Анкета · Полей нет', checks: [
        'form-empty · block · В форме нет полей · Форма', 'approval-none · warn · Согласование включено, поля для согласования не отмечены · Настройки → Поведение процесса'], manual: null }, confirmOff: true }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  'СС-50': ['presence: «Сейчас редактирует {кто}» (r2 §2, состояние 6)', [
    ['старт', null, { status: { state: 'draft', text: 'Черновик: И. П., 11:40 · 4 изменения', clickable: true, editing: 'Сейчас редактирует Игорь Петров' }, save: 'saved' }],
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
    ['«Добавить вариант» — форма с пустыми полями; кнопки справа: «Отмена», затем главная (такт 100)', K => K.act('reason-add'), { reasonForm: true, reasonActs: ['reason-cancel', 'reason-create'], writes: 0 }],
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
        callouts: { feedback: 'Включите блок обратной связи на странице экспертизы', 'feedback-block': 'Включите блок обратной связи на странице экспертизы' }, 'dots.web': 'off' }],
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
    /* Такт 101 (владелец 2026-10-09, S1): сайд немодальный — Tab с последнего элемента уходит из сайда, сайд остаётся открытым. */
    ['Tab уходит из немодального сайда, сайд открыт', K => K.tabs(14), { surface: 'template', focusInSide: false }],
    ['название введено, «Отмена» — шаблон не добавлен', async (K) => { await K.typeInto('tplTitle', 'Черновик шаблона'); await K.act('template-cancel') },
      { surface: '', 's.pdf.templates.length': 2, writes: 0, saveLog: [], focusAct: 'template-add' }],
    ['снова открыть — поля пустые; Esc закрывает, фокус на кнопке', async (K) => { await K.act('template-add'); await K.typeInto('tplTitle', 'Ещё черновик'); await K.key('Escape') },
      { surface: '', 's.pdf.templates.length': 2, writes: 0, focusAct: 'template-add' }],
    ['сайд словаря комментариев: Tab уходит из немодального сайда (такт 101), Esc', async (K) => { await K.section('general'); await K.act('open-comments'); await K.tabs(8) }, { surface: 'comments', focusInSide: false }],
    ['Esc — сайд словаря закрыт, фокус на строке словаря', K => K.key('Escape'), { surface: '', focusAct: 'open-comments', writes: 0 }],
    ['сайд поля (такт 69): «Добавить поле», Tab уходит из немодального сайда (такт 101), сайд открыт', async (K) => { await K.tab('form'); await K.act('field-add'); await K.tabs(30) }, { surface: 'field', focusInSide: false }],
    ['заголовок введён, Esc — поле не добавлено, фокус на «Добавить поле»', async (K) => { await K.typeInto('fdTitle', 'Черновик поля'); await K.key('Escape') },
      { surface: '', 'form.title': 'Заявка · 3 поля', writes: 0, focusAct: 'field-add' }],
    ['сайд группы: карандаш, Esc — фокус на карандаше', async (K) => { await K.act('group-edit'); await K.typeInto('gdTitle', ' плюс'); await K.key('Escape') },
      { surface: '', 'form.groups.0': 'Заявка', writes: 0, focusAct: 'group-edit' }],
    ['сайд процесса (такт 71): «Изменить процесс», Tab уходит из немодального сайда (такт 101), сайд открыт', async (K) => { await K.tab('processes'); await K.processAct('p-auto', 'process-edit'); await K.tabs(30) },
      { surface: 'process', focusIn: null }],
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
    ['«Добавить группу» — сайд новой группы', K => K.act('group-add'), { surface: 'group', sideTitle: 'Добавление группы', writes: 0 }],
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
    ['«Добавить поле» — сайд нового поля, номер — следующий', K => K.act('field-add'), { surface: 'field', sideTitle: 'Добавление поля', 'steppers.fdOrder': 5, 'fieldSide.choices': false, writes: 0 }],
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
        'fieldSide.checks.fdApproval': { checked: false, off: true, sub: '', why: 'Сначала включите согласование в разделе Настройки', whyLit: true }, 'fieldSide.help': ['fdNoConfidential'],
        /* Такт 98: причина выключения — пояснение через 4 под подписью: флажок с причиной выше на 4 (48 → 52). */
        'fieldSide.step': [32, 32, 32, 52, 32] }],
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
    ['карандаш — сайд группы «Автомобиль»', K => K.act('group-edit'), { surface: 'group', sideTitle: 'Редактирование группы — Автомобиль', writes: 0 }],
    ['правки и «Отмена» — настройки прежние', async (K) => { await K.select('gdScreen', '2-й экран'); await K.select('gdMobile', 'Не показывать'); await K.check('gdEditable'); await K.act('group-cancel') },
      { surface: '', 'form.settings': ['Car', '1-й экран', 'Всегда', 'Разрешено'], writes: 0, saveLog: [] }],
    ['правки и «Сохранить» — настройки в панели', async (K) => { await K.act('group-edit'); await K.select('gdScreen', '2-й экран'); await K.select('gdMobile', 'Не показывать'); await K.check('gdEditable'); await K.act('group-save'); await K.settled() },
      { surface: '', 'form.settings': ['Car', '2-й экран', 'Не показывать', 'Запрещено'], 'form.group': 'Автомобиль', saveLog: ['saving', 'saved'], writes: 1 }],
    ['переименовать группу — название в списке и в заголовке панели', async (K) => { await K.act('group-edit'); await K.fill('[data-field=gdTitle]', 'Транспортное средство'); await K.act('group-save'); await K.settled() },
      { 'form.groups': ['Заявка', 'Транспортное средство', 'Кузов и комплектация'], 'form.title': 'Транспортное средство · 4 поля', writes: 2 }],
  ], { query: 'tab=form&group=g-car' }],
  'СС-60': ['«Вставить из другой схемы»: с такта 88 — сайд выбора из справочника на «Форме» и на «Процессах» (ревью 4.5; до такта 88 — уведомление-заглушка, r2 §8; аудит, «„Вставить поле из другой схемы“ → типовой паттерн „выбор из справочника“»)', [
    ['«Вставить из другой схемы» — сайд вставки полей в выбранную группу', K => K.act('field-paste'),
      { notices: [], surface: 'paste', focusIn: 'paste', 'paste.kind': 'fields', 'paste.title': 'Вставить поля из другой схемы', 'paste.sub': 'В группу «Заявка»', 'form.title': 'Заявка · 3 поля', writes: 0 }],
    ['«Отмена» — сайд закрыт, записи нет; «Процессы и шаги»: «Вставить шаг из другой схемы» — сайд вставки шагов', async (K) => { await K.act('paste-cancel'); await K.tab('processes'); await K.act('step-paste') },
      { notices: [], surface: 'paste', 'paste.kind': 'steps', 'paste.title': 'Вставить шаги из другой схемы', 'paste.sub': 'В процесс «Осмотр автомобиля»', 'proc.cards.0': 'Осмотр автомобиля · 4 шага · auto_inspection', writes: 0 }],
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
    ['«Заполнить изображения» — сайд массовой заливки фото-подсказок (такт 87; до него — «вне стенда», r2 §9)', async (K) => { await K.key('Escape'); await K.act('fill-images') },
      { surface: 'fill', notices: [], 'fill.sub': 'Подобрано 3 из 3', writes: 2 }],
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
    ['«Загрузить» у «VIN под стеклом» — ещё одна подсказка (такт 87: «Редактировать» макета — «Загрузить» и «Выбрать из каталога»)', async (K) => { await K.hint('s-vin-glass'); await K.uploadZone('s-vin-glass'); await K.settled() },
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
  'СС-52': ['сайд шага: шесть секций — «Основное», «Поведение», «Съёмка», «Нейросети» с недоступными компании, «Фото-подсказки» (такт 87; до него — «Подсказки»), «Связи»; «Сохранить» одной записью, «Отмена» отбрасывает (r2 §6, §8; аудит, «Принцип: всё редактирование сущности — в сайде»)', [
    ['карандаш «Передней части» — сайд шага, шесть секций, значения шага', K => K.stepEdit('s-front'),
      { surface: 'step', focusIn: 'step', stepSide: { title: 'Редактирование шага — Передняя часть', sub: 'Процесс «Осмотр автомобиля»', host: 'page',
        legends: ['Основное', 'Поведение', 'Съёмка', 'Нейросети · выбрано 2', 'Фото-подсказки · 8', 'Связи'], name: 'Передняя часть', order: 3, flags: ['sd-required'],
        networks: ['Ракурсы авто · Передняя', 'Оценка повреждений'],
        denied: ['Детектор подмены снимка | Недоступна компании «Демо Страхование» — подключается через менеджера', 'Оценка износа шин | Недоступна компании «Демо Страхование» — подключается через менеджера'],
        hint: '8 · Все установлены', hints: ['car-front', 'car-front-left', 'car-front-right', 'up-front-1', 'up-front-2', 'up-front-3', 'up-front-4', 'up-front-5'], links: [], networksInView: false }, writes: 0 }],
    ['правки и «Отмена» — строка прежняя, фокус на карандаше строки', async (K) => { await K.typeInto('sdTitle', ' авто'); await K.check('sd-web'); await K.act('step-cancel') },
      { surface: '', 'proc.rows.p-auto.2': '3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный', focusStep: 's-front', writes: 0 }],
    ['снова: название, «Доступен в web», нейросеть, подсказка, поле формы — «Сохранить» одной записью', async (K) => {
      await K.stepEdit('s-front'); await K.typeInto('sdTitle', ' авто'); await K.check('sd-web'); await K.net('step', 'Распознавание госномера'); await K.act('step-hint-upload')
      await K.pick('sdLinks', 'Автомобиль · Госномер'); await K.act('step-save'); await K.settled() },
      { surface: '', notices: [], 'proc.rows.p-auto.2': '3 · Передняя часть авто · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений, Распознавание госномера · 9 · Все установлены · Обязательный, Доступен в web', saveLog: ['saving', 'saved'], writes: 1 }],
    ['«Настроить нейросети» в строке «Вида справа» — сайд шага, секция «Нейросети» в окне, фокус на первом флажке', K => K.stepAct('s-right', 'step-networks'),
      { surface: 'step', 'stepSide.title': 'Редактирование шага — Вид справа', 'stepSide.networksInView': true, focusNetwork: 'Распознавание VIN', writes: 1 }],
    ['нажатие на недоступную компании нейросеть — не выбирается', K => K.net('step', 'Детектор подмены снимка'), { 'stepSide.networks': ['Ракурсы авто · Правая сторона'], writes: 1 }, { blind: true }],
    ['Esc — сайд закрыт, фокус на «Настроить нейросети» строки', K => K.key('Escape'), { surface: '', focusAct: 'step-networks', focusStep: 's-right', writes: 1 }],
    ['«Добавить шаг» у «Осмотра документов» — «Добавление шага», номер следующий; пустое название — отказ', async (K) => { await K.processAct('p-docs', 'step-add'); await K.act('step-save') },
      { surface: 'step', notices: ['Заполните название шага'], 'stepSide.title': 'Добавление шага', 'stepSide.order': 2, 'stepSide.flags': [], writes: 1 }],
    ['«Свидетельство о регистрации», «2 фото» — «Добавить шаг»: строка в конце процесса', async (K) => { await K.typeInto('sdTitle', 'Свидетельство о регистрации'); await K.select('sdMethod', '2 фото'); await K.act('step-save'); await K.settled() },
      { surface: '', 'proc.cards.1': 'Осмотр документов · 2 шага · docs_inspection', 'proc.rows.p-docs.1': '2 · Свидетельство о регистрации · Основной · 2 фото · Нейросети не выбраны · Не установлена', writes: 2 }],
  ], { query: 'tab=processes' }],
  'СС-53': ['оверлей повторяемого процесса: форма и шаги вместе; стек «оверлей → сайд», Esc закрывает верхний слой, фокус возвращается к триггеру своего слоя; «Сохранить» оверлея — одной записью (r2 §7; аудит, «Клавиатура и фокус»)', [
    ['«Открыть процесс» — оверлей во всё окно: форма процесса и шаги, шагов нет', K => K.processAct('p-damage', 'process-open'),
      { surface: 'process-overlay', focusIn: 'overlay', overlay: { title: 'Осмотр повреждений', sub: 'Повторяемый процесс · форма и шаги вместе', placement: 'full', name: 'Осмотр повреждений', alias: 'damage_inspection',
        steps: [], empty: 'В процессе нет шагов', acts: ['overlay-alias-suggest', 'texts-fill', ...Array(6).fill('text-variants'), 'overlay-step-add', 'overlay-cancel', 'overlay-save'], ro: false, fieldsRo: false, full: true }, writes: 0 }],
    ['Tab по кругу — фокус остаётся в оверлее', K => K.tabs(30), { surface: 'process-overlay', focusIn: 'overlay' }],
    ['«Добавить шаг» — сайд шага поверх оверлея: стек из двух слоёв, фокус в сайде', K => K.act('overlay-step-add'),
      { surface: 'step', surfaces: ['process-overlay', 'step'], focusIn: 'step', 'stepSide.title': 'Добавление шага', 'stepSide.sub': 'Процесс «Осмотр повреждений»', 'stepSide.host': 'overlay', 'overlay.title': 'Осмотр повреждений' }],
    /* Такт 101: сайд шага поверх оверлея — немодальный слой, Tab с последнего элемента уходит из сайда; сайд и оверлей открыты. */
    ['Tab уходит из немодального сайда, сайд и оверлей открыты', K => K.tabs(40), { surface: 'step', surfaces: ['process-overlay', 'step'], focusIn: null }],
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
    /* Такт 91: созданная схема — первое сохранение было («Создать схему»), записей с начала — одна; нажатие новых не добавляет. */
    ['нажатие по выключенной кнопке — карточка прежняя', K => K.act('publish-showcase'), { 'showcase.publish': 'off', 'sc.status': 'needs', notices: [], writes: 1 }, { blind: true }],
    ['продающее название — карточка в черновике', async (K) => { await K.fill('[data-field=scTitle]', 'Осмотр автомобиля онлайн'); await K.settled() },
      { 'showcase.title': 'Осмотр автомобиля онлайн', 'showcase.status': 'Статус витрины: Черновик карточки', 'showcase.tone': 'neutral', 'showcase.publish': 'off', saveLog: ['saving', 'saved'] }],
    ['первая публикация схемы — кнопка доступна', async (K) => { await K.publish(); await K.act('first-confirm') },
      { versions: 1, 'showcase.publish': 'on', 'showcase.text': 'Карточка появится на витрине после публикации', notices: ['Схема опубликована: версия от 03.10.2026, 09:00'], strip: null }],
    ['«Опубликовать на витрину» — карточка на витрине', async (K) => { await K.act('publish-showcase'); await K.settled() },
      { 'sc.status': 'published', 'showcase.status': 'Статус витрины: Опубликована на витрине', 'showcase.tone': 'success', 'showcase.publish': null, notices: ['Карточка опубликована на витрине'] }],
    /* Такт 90 (решение 3): у новой схемы цена «от» — из тарифа по умолчанию; ручная цена — после «Указать вручную». */
    ['правка опубликованной карточки — «Указать вручную», 1990: снова черновик, кнопка вернулась', async (K) => { await K.priceSource('manual'); await K.settled(); await K.fill('[data-field=scPriceValue]', '1990'); await K.settled() },
      { 'showcase.price': '1 990', 'sc.priceFrom': 1990, 'sc.priceSource': 'manual', 'sc.status': 'draft', 'showcase.status': 'Статус витрины: Черновик карточки', 'showcase.publish': 'on' }],
  ], { query: 'data=created&from=t-car&now=2026-10-03T09:00:00' }],
  'СС-43': ['витрина: карточка и «Зачем нужен осмотр» — ввод, теги каскадом, четыре пары, метрики (r2 §7; аудит, «Структура таба», «Стержневой принцип: три типа данных»)', [
    ['старт: карточка, теги, шаблон по типу объекта; цена «от» — из тарифа (такт 90), ручная 2599 помнится', null, { 'showcase.title': 'Дистанционный осмотр автомобиля перед страхованием', 'showcase.price': null, 'showcase.priceSource': 'tariff', 'sc.priceFrom': 2599, 'showcase.industry': 'Страхование',
      'showcase.spheres': ['ПСО — предстраховой осмотр'], 'showcase.object': 'Транспорт', 'showcase.problems.length': 4, 'showcase.metrics.length': 2,
      'showcase.problems.0': 'Дорого и долго | Выезд эксперта занимает дни и стоит денег | Клиент снимает автомобиль сам за 10–15 минут',
      'showcase.template': 'Заполнено шаблоном для типа «Осмотр транспорта» — отредактируйте текст под конкретный кейс или оставьте как есть' }],
    ['краткое описание — запись автосохранением', async (K) => { await K.typeIn("document.querySelector('[data-field=scSummary] textarea')", 'Осмотр по фото за 15 минут'); await K.settled() },
      { 'showcase.summary': 'Осмотр по фото за 15 минут', 'sc.summary': 'Осмотр по фото за 15 минут', saveLog: ['saving', 'saved'] }],
    ['цена «от» — «Указать вручную», только цифры', async (K) => { await K.priceSource('manual'); await K.settled(); await K.fill('[data-field=scPriceValue]', '3 490 ₽'); await K.settled() }, { 'showcase.price': '3 490', 'sc.priceFrom': 3490, 'sc.priceSource': 'manual' }],
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
    ['«Добавить группу» из пустого состояния — сайд новой группы', K => K.act('group-add-empty'), { surface: 'group', sideTitle: 'Добавление группы' }],
    ['группа создана — «В группе нет полей» с «Добавить поле»', async (K) => { await K.typeInto('gdTitle', 'Объект'); await K.act('group-save'); await K.settled() },
      { surface: '', 'form.groups': ['Объект'], pending: 'В группе нет полей', emptyActs: ['field-add-empty'] }],
    ['«Добавить поле» из пустого состояния — сайд нового поля', K => K.act('field-add-empty'), { surface: 'field', sideTitle: 'Добавление поля' }],
    ['таб «Процессы и шаги» — «В схеме нет процессов» с «Добавить процесс»', async (K) => { await K.key('Escape'); await K.tab('processes') },
      { surface: '', tab: 'processes', pending: 'В схеме нет процессов', emptyActs: ['process-add-empty'], 'proc.cards': [] }],
    ['«Добавить процесс» из пустого состояния — сайд процесса', K => K.act('process-add-empty'), { surface: 'process', 'procSide.title': 'Добавление процесса' }],
  ], { query: 'data=new&saved=1' }],
  'СС-55': ['новая схема: «Форма» и «Процессы и шаги» неактивны с пояснением до первого автосохранения (r2 §8; аудит, «Двухфазность и табы»)', [
    ['старт: две вкладки выключены, причину держат сами вкладки (проп reason)', null, { tab: 'settings', 'tabLock.off': ['form', 'processes'],
      'tabLock.wrap': ['form | Форма: Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор', 'processes | Процессы и шаги: Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['клик по «Форме» — таб прежний', K => K.tab('form'), { tab: 'settings', notices: [], writes: 0 }, { blind: true }],
    ['Tab из поиска: «Настройки», затем «Форма» — кольцо кита и подсказка с причиной', async (K) => { await K.searchClick(); await K.tabs(2); await K.wait(900) },
      { focusLock: 'form', lockRing: true, tooltip: 'Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор' }],
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
  /* ============================ такт 86: поиск как в IDE — `docs/scheme-edit-review.md`, 3.2 ============================ */
  'СС-64': ['поиск: слова запроса — начала слов в любом порядке; середина слова от трёх знаков; знаки препинания не важны (3.2, пп. 1–3, 8)', [
    ['«размыт фото» — детектор размытых изображений: «размыт» в подписи, «фото» в синониме', async (K) => { await K.searchClick(); await K.type('размыт фото') },
      { results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»'] }],
        rowsX: ['setting · Детектор «Размытые изображения» ·  · true ·  · Размыт'] }],
    ['«фото размыт» — тот же детектор', K => K.fill('[data-field=search]', 'фото размыт'),
      { results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»'] }] }],
    ['«разм фот» — начала слов', K => K.fill('[data-field=search]', 'разм фот'),
      { results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»'] }] }],
    ['«размыт, фото!» — знаки препинания не важны', K => K.fill('[data-field=search]', 'размыт, фото!'),
      { results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»'] }] }],
    ['«тограф» — середина слова: шаг по описанию «Сфотографируйте…»', K => K.fill('[data-field=search]', 'тограф'),
      { results: [{ path: 'Процессы → Осмотр автомобиля', items: ['VIN под стеклом | Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден'] }],
        rowsX: ['step · VIN под стеклом · Основной ·  ·  · '] }],
    ['«вид спр» — шаг: иконка типа, подсветка двух слов, значение — тип шага', K => K.fill('[data-field=search]', 'вид спр'),
      { rowsX: ['step · Вид справа · Основной ·  ·  · Вид+спр'] }],
  ]],
  'СС-65': ['поиск: пустая выдача повторяется в другой раскладке — «Показано по «…»» (3.2, пп. 4, 13)', [
    ['«hfpvsn» — показано по «размыт»', async (K) => { await K.searchClick(); await K.type('hfpvsn') },
      { searchLayout: 'Показано по «размыт»', results: [{ path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения»'] }],
        rowsX: ['setting · Детектор «Размытые изображения» ·  · true ·  · Размыт'], searchEmpty: null }],
    ['Enter — переход, в поле набранное, режим «найдено» по «размыт»', K => K.key('Enter'),
      { query: 'hfpvsn', section: 'anomalies', flash: ['det-blur'], 'find.counter': '1 из 1', 'find.current': 'anomalies.detectors.blur.on', 'find.mark': ['Размыт'] }],
    ['«фаыфа» — пусто и в другой раскладке: «afsaf»', K => K.fill('[data-field=search]', 'фаыфа'),
      { searchLayout: null, results: [], searchEmpty: 'Ничего не найдено по «фаыфа»', searchEmptyDesc: 'В другой раскладке — «afsaf» — тоже ничего. Быстрый переход',
        quickLinks: ['Аномалии', 'Права доступа', 'PDF', 'Процессы и шаги'], find: null }],
  ]],
  'СС-66': ['поиск: ранжирование — точная подпись, подпись с начала, слова в подписи, синоним, описание, алиас и ключ, середина слова (3.2, п. 5)', [
    ['«фото» — подпись, затем синонимы, середина слова последней', async (K) => { await K.searchClick(); await K.type('фото') }, { results: [
      { path: 'Настройки → Мобильное приложение', items: ['Разрешение фото'] },
      { path: 'Настройки → Аномалии', items: ['Детектор «Размытые изображения» | по запросу «размытые фото»', 'Детектор «Съёмка с экрана» | по запросу «фото с экрана»'] },
      { path: 'Действия', items: ['Заполнить изображения | по запросу «фото-подсказки»'] },
      { path: 'Процессы → Осмотр автомобиля', items: ['VIN под стеклом | Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден'] }],
      rowsX: ['setting · Разрешение фото · Среднее — 2 Мп ·  ·  · фото', 'setting · Детектор «Размытые изображения» ·  · true ·  · ', 'setting · Детектор «Съёмка с экрана» ·  · true ·  · ',
        'action · Заполнить изображения ·  ·  ·  · ', 'step · VIN под стеклом · Основной ·  ·  · '] }],
    ['«блок» — подпись с начала, слова в подписи, середина слова; группы по лучшему совпадению', K => K.fill('[data-field=search]', 'блок'), { results: [
      { path: 'Настройки → Общие', items: ['Блокировать осмотр при проверке', 'Запретить использовать блок дополнительных файлов', 'Разблокировать при неактивности через, минут'] },
      { path: 'Настройки → Веб-приложение', items: ['Блок обратной связи на странице экспертизы'] },
      { path: 'Настройки → Аномалии', items: ['Отображать блок аномалий', 'Детектор «Разблокирован root-доступ»'] }] }],
    ['«наименование» — точная подпись выше подписей со словом', K => K.fill('[data-field=search]', 'наименование'),
      { results: [{ path: 'Настройки → Общие', items: ['Наименование', 'Формула: наименование объекта', 'Формула: наименование схемы'] }],
        'rowsX.0': 'setting · Наименование · КАСКО — осмотр легкового автомобиля ·  ·  · Наименование' }],
    ['«cadastre» — ключ настройки', K => K.fill('[data-field=search]', 'cadastre'),
      { results: [{ path: 'Настройки → Общие', items: ['Показывать координаты на кадастровой карте | ключ general.behavior.cadastreMap'] }] }],
  ]],
  'СС-67': ['поиск: охват над выдачей с числом совпадений, Tab и Shift+Tab, «ещё N», подвал клавиш и счёт (3.2, пп. 6, 7, 12)', [
    ['«кузов» — охват «Все», счёт по областям, подвал', async (K) => { await K.searchClick(); await K.type('кузов') },
      { scopes: ['all 6 *', 'settings 1', 'form 4', 'processes 1', 'showcase 0', 'actions 0'], searchTotal: '6 результатов',
        searchFooter: '↑↓ выбрать · Enter перейти · Alt+Enter переключить · Tab область · Esc закрыть', 'results.0.path': 'Форма → Группы' }],
    ['Tab — «Настройки»', K => K.key('Tab'),
      { 'scopes.1': 'settings 1 *', results: [{ path: 'Настройки → ИИ-анализ', items: ['Распознавание повреждений | по запросу «повреждения кузова»'] }], searchTotal: '1 результат', searchFocus: true }],
    ['Tab — «Форма»: группа и поля', K => K.key('Tab'), { 'scopes.2': 'form 4 *', searchTotal: '4 результата', results: [
      { path: 'Форма → Группы', items: ['Кузов и комплектация'] }, { path: 'Форма → Автомобиль', items: ['Цвет кузова'] },
      { path: 'Форма → Кузов и комплектация', items: ['Тип кузова', 'Повреждения кузова'] }] }],
    ['Shift+Tab дважды — снова «Все»', async (K) => { await K.page.key('Tab', 'Tab', { modifiers: 8 }); await K.page.key('Tab', 'Tab', { modifiers: 8 }) },
      { 'scopes.0': 'all 6 *', searchTotal: '6 результатов', searchFocus: true }],
    ['мышью — «Процессы»; фокус остаётся в поле', K => K.scope('processes'),
      { 'scopes.3': 'processes 1 *', results: [{ path: 'Процессы → Осмотр автомобиля', items: ['VIN на металле | Найдите выбитый VIN на кузове автомобиля: моторный отсек или дверная стойка'] }], searchFocus: true }],
    ['Tab — «Витрина»: в области пусто, найдено в других', K => K.key('Tab'),
      { 'scopes.4': 'showcase 0 *', results: [], searchEmpty: 'В области «Витрина» ничего не найдено', searchEmptyDesc: 'Найдено в других областях: 6. Tab — следующая область', quickLinks: [] }],
    ['«Все», «детектор» — у длинной группы «ещё 10»', async (K) => { await K.scope('all'); await K.fill('[data-field=search]', 'детектор') },
      { searchMore: ['ещё 10'], 'results.0.items.length': 6, 'results.0.items.5': 'ещё 10', searchTotal: '15 результатов' }],
    ['«ещё 10» — группа целиком', K => K.result('more:Настройки → Аномалии'), { searchMore: [], 'results.0.items.length': 15, searchOpen: true }],
  ]],
  'СС-68': ['поиск: булева настройка переключается в выдаче — переключатель и Alt+Enter, уведомление с «Отменить»; погашенная — с причиной (3.2, п. 9; решение 4 оркестратора)', [
    ['«размыт» — строка с переключателем, детектор включён', async (K) => { await K.searchClick(); await K.type('размыт') },
      { rowsX: ['setting · Детектор «Размытые изображения» ·  · true ·  · Размыт'], 's.anomalies.detectors.blur.on': true }],
    ['нажатие по переключателю — выключен, выдача открыта, уведомление с «Отменить»', async (K) => { await K.resultToggle('anomalies.detectors.blur.on'); await K.settled() },
      { 's.anomalies.detectors.blur.on': false, rowsX: ['setting · Детектор «Размытые изображения» ·  · false ·  · Размыт'], searchOpen: true, searchFocus: true,
        notices: ['Настройка «Детектор „Размытые изображения“» выключена'], saveLog: ['saving', 'saved'], writes: 1, find: null }],
    ['«Отменить» — детектор снова включён', async (K) => { await K.undo(); await K.settled() },
      { 's.anomalies.detectors.blur.on': true, writes: 2 }],
    ['Alt+Enter на активной строке — выключен', async (K) => { await K.searchClick(); await K.altEnter(); await K.settled() },
      { 's.anomalies.detectors.blur.on': false, notices: ['Настройка «Детектор „Размытые изображения“» выключена'], searchOpen: true, writes: 3 }],
    ['«повторяем» — погашенная зависимостью: приглушена, причина второй строкой', K => K.fill('[data-field=search]', 'повторяем'),
      { results: [{ path: 'Настройки → Общие', items: ['Разрешить отказываться от повторяемых процессов с той же отметкой | Сначала разрешите отказ с отметкой «Осмотр невозможен»'] }],
        rowsX: ['setting · Разрешить отказываться от повторяемых процессов с той же отметкой ·  · false · приглушена · повторяем'] }],
    ['Alt+Enter на погашенной — отказ с причиной, значение прежнее', K => K.altEnter(),
      { 'g.behavior.refuseRepeatable': false, notices: ['Сначала разрешите отказ с отметкой «Осмотр невозможен»'], writes: 3, saveLog: [] }],
    ['нажатие по выключенному переключателю — значение прежнее', K => K.resultToggle('general.behavior.refuseRepeatable'),
      { 'g.behavior.refuseRepeatable': false, notices: [], writes: 3 }, { blind: true }],
  ]],
  'СС-69': ['поиск: действия страницы в выдаче — Enter выполняет (3.2, п. 10)', [
    ['«опубл» — карточка витрины и действие «Опубликовать схему»', async (K) => { await K.searchClick(); await K.type('опубл') },
      { results: [{ path: 'Витрина → Статус карточки', items: ['Опубликовать на витрину'] }, { path: 'Действия', items: ['Опубликовать схему'] }],
        rowsX: ['showcase · Опубликовать на витрину · Черновик карточки ·  ·  · Опубл', 'action · Опубликовать схему ·  ·  ·  · Опубл'], 'scopes.5': 'actions 1' }],
    ['стрелка вниз и Enter — окно публикации, запрос очищен', async (K) => { await K.key('ArrowDown'); await K.key('Enter') },
      { surface: 'publish', modalTitle: 'Публикация схемы', query: '', find: null, versions: 2 }],
    ['Esc — окно закрыто', K => K.key('Escape'), { surface: '' }],
    ['«добавить поле», Enter — таб «Форма», сайд нового поля', async (K) => { await K.slash(); await K.type('добавить поле'); await K.key('Enter') },
      { tab: 'form', surface: 'field', sideTitle: 'Добавление поля', query: '' }],
    ['Esc — сайд закрыт; «история», Enter — сайд истории версий', async (K) => { await K.key('Escape'); await K.slash(); await K.type('история'); await K.key('Enter') },
      { surface: 'history', sideTitle: 'История версий' }],
  ]],
  'СС-69/новая': ['поиск: недоступное действие приглушено и отказывает с причиной (3.2, п. 10; новая схема — двухфазность)', [
    ['«добавить поле» — приглушено с причиной', async (K) => { await K.searchClick(); await K.type('добавить поле') },
      { results: [{ path: 'Действия', items: ['Добавить поле | Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
        rowsX: ['action · Добавить поле ·  ·  · приглушена · Добавить+поле'] }],
    ['Enter — отказ с причиной, таб прежний', K => K.key('Enter'),
      { tab: 'settings', surface: '', notices: ['Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
  ], { query: 'data=new' }],
  'СС-70': ['поиск: «Недавние» при пустом запросе — запросы и места; недавнее выше при равном совпадении; сессия вкладки (3.2, пп. 5, 11; решение 5 оркестратора)', [
    ['пустой запрос — «Недавних» нет, только фильтр изменённого', K => K.searchClick(),
      { results: [{ path: '', items: ['Изменено в черновике | Места, которые черновик меняет против текущей версии'] }], recent: { queries: [], places: [] } }],
    ['«опытным» — две подписи со словом, первая — по порядку страницы', K => K.type('опытным'),
      { resultActive: 'Разрешать опытным пользователям скрывать подсказки к шагам', 'results.0.items': ['Разрешать опытным пользователям скрывать подсказки к шагам', 'Разрешать опытным пользователям пропускать подтверждение после шага'] }],
    ['вторая — стрелкой и Enter: запрос и место в «Недавних»', async (K) => { await K.key('ArrowDown'); await K.key('Enter') },
      { section: 'mobile', flash: ['skipConfirm'], recent: { queries: ['опытным'], places: ['mobile.skipConfirm'] } }],
    ['снова «опытным» — недавнее место первым', K => K.fill('[data-field=search]', 'опытным'),
      { resultActive: 'Разрешать опытным пользователям пропускать подтверждение после шага', 'results.0.items': ['Разрешать опытным пользователям пропускать подтверждение после шага', 'Разрешать опытным пользователям скрывать подсказки к шагам'] }],
    ['Esc, пустое поле — «Недавние запросы» и «Недавние места»', async (K) => { await K.key('Escape'); await K.blur(); await K.searchClick() }, { results: [
      { path: '', items: ['Изменено в черновике | Места, которые черновик меняет против текущей версии'] },
      { path: 'Недавние запросы', items: ['опытным'] },
      { path: 'Недавние места', items: ['Разрешать опытным пользователям пропускать подтверждение после шага | Настройки → Мобильное приложение'] }],
      searchFooter: '↑↓ выбрать · Enter перейти · Esc закрыть' }],
    ['нажатие по недавнему запросу — запрос в поле, выдача по нему', K => K.result('q:опытным'),
      { query: 'опытным', 'results.0.path': 'Настройки → Мобильное приложение', searchOpen: true }],
    ['перезагрузка страницы — «Недавние» помнит сессия вкладки', async (K) => { await K.start(); await K.searchClick() },
      { recent: { queries: ['опытным'], places: ['mobile.skipConfirm'] }, 'results.1.path': 'Недавние запросы', 'results.2.items.length': 1 }],
  ]],
  'СС-71': ['поиск: режим «найдено» — счётчик в поле, F3 и Shift+F3 через табы и разделы, Enter и Shift+Enter в поле, стрелки, подсветка совпадений (3.2, пп. 14, 15)', [
    ['«кузов», Enter — группа «Кузов и комплектация»: таб «Форма», счётчик 3 из 6', async (K) => { await K.searchClick(); await K.type('кузов'); await K.key('Enter') },
      { tab: 'form', 'form.group': 'Кузов и комплектация', query: 'кузов', searchOpen: false, find: { counter: '3 из 6', bar: '6 совпадений в 3 разделах',
        tabs: { settings: '1', form: '4', processes: '1', showcase: '0' }, nav: [], current: 'group.g-body', marks: ['кузов', 'кузов'], mark: ['Кузов'] } }],
    ['F3 — «Тип кузова», 4 из 6, фокус на строке', K => K.f3(),
      { 'find.counter': '4 из 6', 'find.current': 'form.f-body-type', 'find.mark': ['кузов'], focusRow: 'f-body-type' }],
    ['F3 — «Повреждения кузова», 5 из 6', K => K.f3(), { 'find.counter': '5 из 6', 'find.current': 'form.f-damage' }],
    ['F3 — шаг «VIN на металле» на другом табе, 6 из 6', K => K.f3(),
      { tab: 'processes', 'find.counter': '6 из 6', 'find.current': 'step.s-vin-metal', focusStep: 's-vin-metal', 'find.mark': ['кузов'], 'find.marks': [] }],
    ['F3 — по кругу: «Распознавание повреждений» в «Настройках → ИИ-анализ», 1 из 6', K => K.f3(),
      { tab: 'settings', section: 'ai', 'find.counter': '1 из 6', 'find.current': 'ai.damage', 'find.nav': ['ai 1'], flash: ['damage'], 'find.mark': ['кузов'] }],
    ['Shift+F3 — назад к шагу, 6 из 6', K => K.f3(true), { tab: 'processes', 'find.counter': '6 из 6' }],
    ['Enter в поле — следующее, фокус остаётся в поле', async (K) => { await K.searchClick(); await K.key('Enter') },
      { tab: 'settings', 'find.counter': '1 из 6', searchFocus: true, searchOpen: false }],
    ['Shift+Enter в поле — предыдущее', K => K.shiftEnter(), { tab: 'processes', 'find.counter': '6 из 6', searchFocus: true }],
    ['стрелка вниз в поле — следующее; стрелка ↑ в поле — предыдущее', async (K) => { await K.key('ArrowDown'); await K.findArrow('prev') },
      { tab: 'processes', 'find.counter': '6 из 6' }],
  ]],
  'СС-72': ['поиск: режим «найдено» — навигатор с разделами совпадений, числа на табах, плашка; «Сбросить» и Esc снимают режим (3.2, пп. 16, 18)', [
    ['«фото», Enter — «Разрешение фото»; навигатор: разделы с совпадениями и число', async (K) => { await K.searchClick(); await K.type('фото'); await K.key('Enter') },
      { section: 'mobile', find: { counter: '1 из 4', bar: '4 совпадения в 3 разделах', tabs: { settings: '3', form: '0', processes: '1', showcase: '0' },
        nav: ['mobile 1', 'anomalies 2'], current: 'mobile.photo', marks: [], mark: ['фото'] } }],
    ['раздел «Аномалии» навигатором — навигатор прежний', K => K.section('anomalies'),
      { section: 'anomalies', 'find.nav': ['mobile 1', 'anomalies 2'], 'find.counter': '1 из 4' }],
    ['«Сбросить» — режим снят: запрос пуст, навигатор целиком, чисел на табах нет', K => K.act('find-reset'),
      { find: null, query: '', navAnchors: [], dots: { web: 'on', anomalies: 'on', pdf: 'on' } }],
    ['снова «фото», Enter; Esc в поле — режим снят', async (K) => { await K.slash(); await K.type('фото'); await K.key('Enter'); await K.searchClick(); await K.key('Escape') },
      { find: null, query: '', searchOpen: false, searchFocus: true }],
  ]],
  'СС-73': ['поиск: «Изменено в черновике» — правки черновика против текущей версии, тот же режим «найдено» (3.2, п. 17)', [
    ['пустой запрос — строка «Изменено в черновике» с числом мест', K => K.searchClick(),
      { rowsX: ['filter · Изменено в черновике · 4 места ·  ·  · '] }],
    ['Enter — фильтр включён: правки по областям', K => K.key('Enter'),
      { modifiedSwitch: 'true', scopes: ['all 4 *', 'settings 1', 'form 2', 'processes 1', 'showcase 0', 'actions 0'], results: [
        { path: 'Настройки → Общие', items: ['Описание'] }, { path: 'Форма → Автомобиль', items: ['Пробег', 'Цвет кузова'] }, { path: 'Процессы и шаги', items: ['Осмотр документов'] }] }],
    ['Enter — «Описание»: режим «найдено» по правкам, подпись подсвечена', K => K.key('Enter'),
      { section: 'general', focusField: 'description', find: { counter: '1 из 4', bar: 'Изменено в черновике: 4 правки в 3 разделах',
        tabs: { settings: '1', form: '2', processes: '1', showcase: '0' }, nav: ['general 1'], current: 'general.description', marks: [], mark: ['Описание'] } }],
    ['F3 — «Пробег» на «Форме»: подписи правок группы подсвечены', K => K.f3(),
      { tab: 'form', 'form.group': 'Автомобиль', 'find.counter': '2 из 4', 'find.mark': ['Пробег'], 'find.marks': ['Цвет кузова'] }],
    ['F3 — процесс «Осмотр документов» (удалён шаг), 4 из 4', async (K) => { await K.f3(); await K.f3() },
      { tab: 'processes', 'find.counter': '4 из 4', 'find.current': 'process.p-docs', 'find.mark': ['Осмотр документов'] }],
    ['«Сбросить» — фильтр выключен', K => K.act('find-reset'), { find: null, query: '' }],
    ['«цвет» и фильтр — только изменённое', async (K) => { await K.searchClick(); await K.type('цвет'); await K.modifiedSwitch() },
      { modifiedSwitch: 'true', results: [{ path: 'Форма → Автомобиль', items: ['Цвет кузова'] }], 'scopes.0': 'all 1 *' }],
    ['фильтр выключен — «цвет» по всей схеме', K => K.modifiedSwitch(),
      { modifiedSwitch: 'false', 'scopes.0': 'all 2 *' }],
  ]],
  'СС-74': ['поиск: Ctrl+F — первое нажатие ставит фокус в поле страницы, второе отдаётся браузеру; «/» и Ctrl+F выделяют запрос (решение 3 оркестратора 2026-10-08)', [
    ['Ctrl+F — фокус в поле поиска страницы, нажатие перехвачено', K => K.ctrlF(), { searchFocus: true, ctrlF: [true] }],
    ['второе Ctrl+F в поле — браузеру', K => K.ctrlF(), { searchFocus: true, ctrlF: [false] }],
    ['«фото», Enter; Ctrl+F — фокус в поле, запрос выделен', async (K) => { await K.type('фото'); await K.key('Enter'); await K.ctrlF() },
      { searchFocus: true, ctrlF: [true], selRange: [0, 4], 'find.counter': '1 из 4' }],
    ['набор заменяет запрос — режим «найдено» снят, выдача по новому запросу', K => K.type('блок'),
      { query: 'блок', find: null, searchOpen: true, 'results.0.path': 'Настройки → Общие' }],
  ]],
  /* ============================ такт 87: каталог фото-подсказок, массовая заливка, сайд шага ============================ */
  'СС-75': ['каталог фото-подсказок из ячейки шага: категория шага выбрана заранее, выбор нескольких, «Добавить» — одной записью с «Отменить» (ревью 4.3; решение 4 оркестратора 2026-10-08)', [
    ['«Выбрать из каталога» у «VIN на металле» — сайд каталога: «Транспорт» выбран заранее, 16 подсказок', K => K.catalogFrom('s-vin-metal'),
      { surface: 'catalog', focusIn: 'catalog', catalog: { target: 'cell', title: 'Каталог фото-подсказок', sub: 'Для шага «VIN на металле»', back: false, query: '', category: 'vehicle',
        counts: { all: 30, vehicle: 16, realty: 8, documents: 6 }, items: ['car-front', 'car-front-left', 'car-front-right', 'car-rear', 'car-rear-left', 'car-rear-right', 'car-left', 'car-right',
          'car-vin-glass', 'car-vin-body', 'car-plate', 'car-odometer', 'car-wheel', 'car-interior', 'car-engine', 'car-damage'], picked: [], attached: [], marks: [], note: 'Выбрано: 0',
        confirm: 'Добавить · выкл', empty: null, emptyDesc: null }, writes: 0 }],
    ['нажатие по плиткам «VIN на кузове» и «Табличка изготовителя» — «Выбрано: 2»', async (K) => { await K.tile('car-vin-body'); await K.tile('car-plate') },
      { 'catalog.picked': ['car-vin-body', 'car-plate'], 'catalog.note': 'Выбрано: 2', 'catalog.confirm': 'Добавить', writes: 0 }],
    ['повторное нажатие снимает выбор', K => K.tile('car-plate'), { 'catalog.picked': ['car-vin-body'], 'catalog.note': 'Выбрано: 1' }],
    ['«Добавить» — подсказка у шага сразу, одной записью; статус и миниатюра в ячейке', async (K) => { await K.act('catalog-confirm'); await K.settled() },
      { surface: '', notices: ['К шагу «VIN на металле» добавлена 1 подсказка'], 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · 1 · Все установлены · Обязательный",
        'proc.thumbs.s-vin-metal': ['VIN на кузове · выбитый номер'], saveLog: ['saving', 'saved'], writes: 1, focusAct: 'hint-catalog' }],
    ['«Отменить» — подсказки у шага нет', async (K) => { await K.undo(); await K.settled() }, { 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · Не установлена · Обязательный", 'proc.thumbs.s-vin-metal': undefined, writes: 2 }],
    ['снова «VIN на кузове» и каталог ещё раз — плитка отмечена и выключена: «Уже у шага»', async (K) => {
      await K.catalogFrom('s-vin-metal'); await K.tile('car-vin-body'); await K.act('catalog-confirm'); await K.settled(); await K.wait(3200); await K.catalogFrom('s-vin-metal') },
      { surface: 'catalog', 'catalog.attached': ['car-vin-body'], 'catalog.picked': [], 'catalog.note': 'Выбрано: 0', writes: 3 }],
    ['нажатие по выключенной плитке — выбора нет; «Отмена» — записи нет', async (K) => { await K.tile('car-vin-body'); await K.act('catalog-cancel') },
      { surface: '', 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · 1 · Все установлены · Обязательный", notices: [], saveLog: [], writes: 3 }, { blind: true }],
  ], { query: 'tab=processes' }],
  'СС-76': ['каталог: поиск по части, ракурсу и связанным словам; категории с числом; пусто в категории — «Искать во всех категориях» (ревью 4.3; паттерн «выбор из справочника»)', [
    ['«кузов» — одна подсказка, совпадение подсвечено; число по категориям', async (K) => { await K.catalogFrom('s-vin-metal'); await K.fill('[data-field=catalog-search]', 'кузов') },
      { 'catalog.query': 'кузов', 'catalog.items': ['car-vin-body'], 'catalog.marks': ['кузов'], 'catalog.counts': { all: 1, vehicle: 1, realty: 0, documents: 0 } }],
    ['категория «Документы» — ничего, найдено в других категориях', K => K.category('documents'),
      { 'catalog.category': 'documents', 'catalog.items': [], 'catalog.empty': 'Ничего не найдено по «кузов»', 'catalog.emptyDesc': 'Найдено в других категориях: 1' }],
    ['«Искать во всех категориях» — «Все»', K => K.act('catalog-all'), { 'catalog.category': 'all', 'catalog.items': ['car-vin-body'], 'catalog.empty': null }],
    ['«полис» — по части; «пол» основой «пол$» полис не находит', async (K) => { await K.fill('[data-field=catalog-search]', 'полис') },
      { 'catalog.items': ['doc-policy'], 'catalog.counts': { all: 1, vehicle: 0, realty: 0, documents: 1 } }],
    ['«пол» — пол и полис (начало слова в подписи)', K => K.fill('[data-field=catalog-search]', 'пол'), { 'catalog.items': ['doc-policy', 'realty-floor'] }],
    ['«фара» — по связанному слову, подсветки нет', K => K.fill('[data-field=catalog-search]', 'фара'), { 'catalog.items': ['car-front'], 'catalog.marks': [] }],
    ['пустой запрос, «Недвижимость» — 8 кадров', async (K) => { await K.clear('[data-field=catalog-search]'); await K.category('realty') },
      { 'catalog.query': '', 'catalog.category': 'realty', 'catalog.items': ['realty-facade', 'realty-cladding', 'realty-roof', 'realty-territory', 'realty-room', 'realty-floor', 'realty-ceiling', 'realty-pipes'],
        'catalog.counts': { all: 30, vehicle: 16, realty: 8, documents: 6 } }],
  ], { query: 'tab=processes' }],
  'СС-77': ['сайд шага: раздел «Фото-подсказки» — миниатюры; «Из каталога» — каталог поверх сайда, подсказки в черновик сайда; «Сохранить» — одной записью (ревью Ш-2; решение 6)', [
    ['карандаш «Передней части» — раздел «Фото-подсказки · 8», миниатюры по порядку', K => K.stepEdit('s-front'),
      { surface: 'step', 'stepSide.legends': ['Основное', 'Поведение', 'Съёмка', 'Нейросети · выбрано 2', 'Фото-подсказки · 8', 'Связи'], 'stepSide.hint': '8 · Все установлены',
        'stepSide.hints': ['car-front', 'car-front-left', 'car-front-right', 'up-front-1', 'up-front-2', 'up-front-3', 'up-front-4', 'up-front-5'] }],
    ['«Из каталога» — каталог поверх сайда шага: стек из двух слоёв; ракурсы шага отмечены и выключены', K => K.act('step-hint-catalog'),
      { surface: 'catalog', surfaces: ['step', 'catalog'], focusIn: 'catalog', 'catalog.target': 'side', 'catalog.sub': 'Для шага «Передняя часть»', 'catalog.category': 'vehicle',
        'catalog.attached': ['car-front', 'car-front-left', 'car-front-right'], 'catalog.picked': [] }],
    ['«Правая сторона» и «Колесо» — «Добавить»: в черновик сайда, записи нет; фокус на «Из каталога»', async (K) => { await K.tile('car-right'); await K.tile('car-wheel'); await K.act('catalog-confirm') },
      { surface: 'step', surfaces: ['step'], focusIn: 'step', focusAct: 'step-hint-catalog', 'stepSide.legends.4': 'Фото-подсказки · 10',
        'stepSide.hints': ['car-front', 'car-front-left', 'car-front-right', 'up-front-1', 'up-front-2', 'up-front-3', 'up-front-4', 'up-front-5', 'car-right', 'car-wheel'], writes: 0 }],
    ['«Из каталога», Esc — закрыт только каталог, сайд шага открыт', async (K) => { await K.act('step-hint-catalog'); await K.key('Escape') },
      { surface: 'step', surfaces: ['step'], focusIn: 'step', writes: 0 }],
    ['«Загрузить» — свой файл в черновик сайда', K => K.act('step-hint-upload'), { 'stepSide.legends.4': 'Фото-подсказки · 11', 'stepSide.hints.10': 'up-new-1', writes: 0 }],
    ['«Сохранить» — одна запись: 11 подсказок, в ячейке первые три и «+8»', async (K) => { await K.act('step-save'); await K.settled() },
      { surface: '', 'proc.rows.p-auto.2': "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 11 · Все установлены · Обязательный", 'proc.thumbs.s-front': ['Передняя часть · анфас', 'Передняя часть · три четверти слева', 'Передняя часть · три четверти справа', '+8'],
        saveLog: ['saving', 'saved'], writes: 1 }],
  ], { query: 'tab=processes' }],
  'СС-78': ['сайд шага: убрать подсказку крестиком миниатюры, «глаз» — просмотр крупно; «Отмена» отбрасывает; дифф показывает убранную (ревью Ш-2; решение 6)', [
    ['крестик у «front-5.jpg» — 7 подсказок в черновике, записи нет', async (K) => { await K.stepEdit('s-front'); await K.sideThumb('up-front-5', 'remove') },
      { 'stepSide.legends.4': 'Фото-подсказки · 7', 'stepSide.hints': ['car-front', 'car-front-left', 'car-front-right', 'up-front-1', 'up-front-2', 'up-front-3', 'up-front-4'], writes: 0 }],
    ['«Отмена» — в строке по-прежнему 8', K => K.act('step-cancel'), { surface: '', 'proc.rows.p-auto.2': "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", writes: 0 }],
    ['снова: «глаз» у «три четверти слева» — просмотр крупно поверх сайда', async (K) => { await K.stepEdit('s-front'); await K.sideThumb('car-front-left', 'open') },
      { surface: 'step', viewer: { counter: '2 из 8', caption: 'Передняя часть · три четверти слева', src: 'car-front-left.svg', pick: null } }],
    ['Esc — закрыт только просмотр; крестик у «три четверти слева», «Сохранить»', async (K) => { await K.key('Escape'); await K.sideThumb('car-front-left', 'remove'); await K.act('step-save'); await K.settled() },
      { surface: '', viewer: null, 'proc.rows.p-auto.2': "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 7 · Все установлены · Обязательный", writes: 1 }],
    ['дифф публикации: «подсказок: 8 → 7» и какая убрана', async (K) => { await K.publish(); await K.area('processes') },
      { surface: 'publish', 'diff.open.0.groups.0': { kind: 'changed', title: 'Изменено · 1', items: ['Шаг «Передняя часть» | 2–7 фото, подсказок: 8 → 2–7 фото, подсказок: 7 (− «Передняя часть · три четверти слева»)'] } }],
  ], { query: 'tab=processes' }],
  'СС-79': ['массовая заливка: подбор по названию шага и типу объекта, «Требует внимания» первой группой, «Не заполнять», «Установить» без окна подтверждения, «Отменить»; шаги с подсказками не тронуты (ревью 4.4; решение 5)', [
    ['«Заполнить изображения» — сайд: «Подобрано 3 из 3»; «Вид справа» — «Похоже», первой группой', K => K.act('fill-images'),
      { surface: 'fill', focusIn: 'fill', fill: { sub: 'Подобрано 3 из 3', all: 'false', only: null, groups: [
        { id: 'attention', legend: 'Требует внимания · 1', rows: ['s-right · Похоже · Правая сторона · профиль · по названию шага · похожих ещё 2 · заполнить'] },
        { id: 'matched', legend: 'Подобрано · 2', rows: ['s-vin-metal · Совпадает · VIN на кузове · выбитый номер · по названию шага · заполнить', 's-pts · Совпадает · ПТС · разворот с данными · по названию шага · заполнить'] }],
      empty: null, apply: 'Установить подсказки у 3 шагов' }, writes: 0 }],
    ['«Не заполнять» у ПТС — «Подобрано 2 из 3»', K => K.fillAct('s-pts', 'fill-toggle'),
      { 'fill.sub': 'Подобрано 2 из 3', 'fill.groups.1.rows.1': 's-pts · Совпадает · ПТС · разворот с данными · по названию шага · не заполнять', 'fill.apply': 'Установить подсказки у 2 шагов' }],
    ['«Установить подсказки у 2 шагов» — одна запись без окна подтверждения; «VIN под стеклом» и «Передняя часть» прежние', async (K) => { await K.act('fill-apply'); await K.settled() },
      { surface: '', notices: ['Подсказки установлены у 2 шагов'], 'proc.rows.p-auto': ["1 · VIN под стеклом · Основной · 1 фото · Распознавание VIN, Распознавание шильдиков · 5 · Все установлены · Обязательный", "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · 1 · Все установлены · Обязательный", "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · 1 · Все установлены"],
        'proc.rows.p-docs': ["1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · Не установлена · Из галереи, Скан документов"], 'proc.thumbs.s-right': ['Правая сторона · профиль'], saveLog: ['saving', 'saved'], writes: 1 }],
    ['«Отменить» — подсказок у шагов снова нет', async (K) => { await K.undo(); await K.settled() },
      { 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · Не установлена · Обязательный", 'proc.rows.p-auto.3': "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", writes: 2 }],
  ], { query: 'tab=processes' }],
  'СС-80': ['массовая заливка: «Заменить» — каталог вторым слоем сайда, выбор одной; «←» и Esc — назад к списку; «Показать все шаги» (ревью 4.4; решение 5)', [
    ['«Заменить» у «Вид справа» — второй слой: «←», предложение отмечено, «Заменить»', async (K) => { await K.act('fill-images'); await K.fillAct('s-right', 'fill-replace') },
      { surface: 'fill', fill: null, catalog: { target: 'fill', title: 'Подсказка для шага «Вид справа»', sub: 'Каталог фото-подсказок · выберите одну', back: true, query: '', category: 'vehicle',
        counts: { all: 30, vehicle: 16, realty: 8, documents: 6 }, items: ['car-front', 'car-front-left', 'car-front-right', 'car-rear', 'car-rear-left', 'car-rear-right', 'car-left', 'car-right',
          'car-vin-glass', 'car-vin-body', 'car-plate', 'car-odometer', 'car-wheel', 'car-interior', 'car-engine', 'car-damage'], picked: ['car-right'], attached: [], marks: [],
        note: 'Выбрано: 1', confirm: 'Заменить', empty: null, emptyDesc: null } }],
    ['«Три четверти справа» передней части — выбор одной: прежний снят', K => K.tile('car-front-right'), { 'catalog.picked': ['car-front-right'], 'catalog.note': 'Выбрано: 1' }],
    ['«Заменить» — назад к списку: строка «Выбрано вручную»', K => K.act('catalog-confirm'),
      { surface: 'fill', catalog: null, 'fill.groups.0.rows': ['s-right · Выбрано вручную · Передняя часть · три четверти справа · выбрано в каталоге · заполнить'], 'fill.sub': 'Подобрано 3 из 3' }],
    ['«Заменить» у «VIN на металле», Esc — назад к списку, сайд открыт', async (K) => { await K.fillAct('s-vin-metal', 'fill-replace'); await K.key('Escape') },
      { surface: 'fill', catalog: null, 'fill.sub': 'Подобрано 3 из 3', 'fill.groups.1.rows.0': 's-vin-metal · Совпадает · VIN на кузове · выбитый номер · по названию шага · заполнить' }],
    ['«←» во втором слое — назад к списку', async (K) => { await K.fillAct('s-vin-metal', 'fill-replace'); await K.backLayer() }, { surface: 'fill', catalog: null }],
    ['«Показать все шаги» — шаги с подсказками: не заполняются по умолчанию', K => K.fillAll(),
      { 'fill.all': 'true', 'fill.sub': 'Подобрано 3 из 5', 'fill.groups': [
        { id: 'attention', legend: 'Требует внимания · 3', rows: ['s-vin-glass · Похоже · VIN на кузове · выбитый номер · по части названия шага · не заполнять',
          's-front · Нет предложения · Нет предложения · подходящие подсказки уже у шага · не заполнять',
          's-right · Выбрано вручную · Передняя часть · три четверти справа · выбрано в каталоге · заполнить'] },
        { id: 'matched', legend: 'Подобрано · 2', rows: ['s-vin-metal · Совпадает · VIN на кузове · выбитый номер · по названию шага · заполнить', 's-pts · Совпадает · ПТС · разворот с данными · по названию шага · заполнить'] }] }],
    ['«Заполнить» у «VIN под стеклом», «Установить подсказки у 4 шагов» — подсказка добавлена к пяти прежним', async (K) => { await K.fillAct('s-vin-glass', 'fill-toggle'); await K.act('fill-apply'); await K.settled() },
      { surface: '', notices: ['Подсказки установлены у 4 шагов'], 'proc.rows.p-auto': ["1 · VIN под стеклом · Основной · 1 фото · Распознавание VIN, Распознавание шильдиков · 6 · Все установлены · Обязательный", "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · 1 · Все установлены · Обязательный", "3 · Передняя часть · Основной · 2–7 фото · Ракурсы авто · Передняя, Оценка повреждений · 8 · Все установлены · Обязательный", "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · 1 · Все установлены"],
        'proc.rows.p-docs': ["1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · 1 · Все установлены · Из галереи, Скан документов"], 'proc.thumbs.s-right': ['Передняя часть · три четверти справа'], writes: 1 }],
  ], { query: 'tab=processes' }],
  'СС-81': ['массовая заливка только выбранных шагов — из панели массовых действий (решение 5)', [
    ['выбрать «VIN на металле» и ПТС, «Заполнить изображения» на панели — две строки, «Только выбранные шаги — 2»', async (K) => { await K.stepCheck('s-vin-metal'); await K.stepCheck('s-pts'); await K.act('bulk-fill') },
      { surface: 'fill', fill: { sub: 'Подобрано 2 из 2', all: 'false', only: 'Только выбранные шаги — 2', groups: [
        { id: 'matched', legend: 'Подобрано · 2', rows: ['s-vin-metal · Совпадает · VIN на кузове · выбитый номер · по названию шага · заполнить', 's-pts · Совпадает · ПТС · разворот с данными · по названию шага · заполнить'] }],
      empty: null, apply: 'Установить подсказки у 2 шагов' } }],
    ['«Установить» — только выбранные; «Вид справа» без подсказки', async (K) => { await K.act('fill-apply'); await K.settled() },
      { surface: '', notices: ['Подсказки установлены у 2 шагов'], 'proc.rows.p-auto.1': "2 · VIN на металле · Основной · 1 фото · Распознавание VIN · 1 · Все установлены · Обязательный", 'proc.rows.p-auto.3': "4 · Вид справа · Основной · 2–7 фото · Ракурсы авто · Правая сторона · Не установлена", 'proc.rows.p-docs.0': "1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · 1 · Все установлены · Из галереи, Скан документов", writes: 1 }],
    ['снова на тех же шагах — подсказки у них есть: строк нет, «Показать все шаги»', async (K) => { await K.wait(3200); await K.act('bulk-fill') },
      { 'fill.groups': [], 'fill.empty': 'У всех шагов есть фото-подсказки', 'fill.apply': 'Установить подсказки у 0 шагов · выкл' }],
  ], { query: 'tab=processes' }],
  'СС-82': ['массовая заливка: «Нет предложения» — тип объекта схемы «Недвижимость»; «Выбрать из каталога» — категория типа объекта, выбор вручную (ревью 4.4)', [
    ['«Заполнить изображения» — две строки «Нет предложения» в «Требует внимания», ПТС — «Совпадает»', K => K.act('fill-images'),
      { fill: { sub: 'Подобрано 1 из 3', all: 'false', only: null, groups: [
        { id: 'attention', legend: 'Требует внимания · 2', rows: ['s-vin-metal · Нет предложения · Нет предложения · в каталоге нет подходящей подсказки · не заполнять',
          's-right · Нет предложения · Нет предложения · в каталоге нет подходящей подсказки · не заполнять'] },
        { id: 'matched', legend: 'Подобрано · 1', rows: ['s-pts · Совпадает · ПТС · разворот с данными · по названию шага · заполнить'] }],
      empty: null, apply: 'Установить подсказки у 1 шага' } }],
    ['«Выбрать из каталога» у «VIN на металле» — категория «Недвижимость» выбрана заранее, выбора нет', K => K.fillAct('s-vin-metal', 'fill-replace'),
      { 'catalog.title': 'Подсказка для шага «VIN на металле»', 'catalog.category': 'realty', 'catalog.picked': [], 'catalog.confirm': 'Заменить · выкл' }],
    ['«Транспорт», «VIN на кузове», «Заменить» — строка выбрана вручную', async (K) => { await K.category('vehicle'); await K.tile('car-vin-body'); await K.act('catalog-confirm') },
      { catalog: null, 'fill.sub': 'Подобрано 2 из 3', 'fill.groups.0.rows.0': 's-vin-metal · Выбрано вручную · VIN на кузове · выбитый номер · выбрано в каталоге · заполнить' }],
  ], { query: 'tab=processes&type=house' }],
  'СС-83': ['миниатюры фото-подсказок в ячейке: до трёх и «+N»; нажатие — просмотр крупно со счётчиком и стрелками; из каталога — «Выбрать» в полосе просмотра (ревью Ш-5; решения 4, 6)', [
    ['старт: миниатюры у шагов с подсказками', null, { 'proc.thumbs': {
      's-vin-glass': ['VIN под стеклом · через лобовое стекло', 'Своя загрузка · vin-1.jpg', 'Своя загрузка · vin-2.jpg', '+2'],
      's-front': ['Передняя часть · анфас', 'Передняя часть · три четверти слева', 'Передняя часть · три четверти справа', '+5'] } }],
    ['вторая миниатюра «Передней части» — просмотр крупно: «2 из 8»', K => K.thumb('s-front', 1),
      { viewer: { counter: '2 из 8', caption: 'Передняя часть · три четверти слева', src: 'car-front-left.svg', pick: null } }],
    ['стрелка вперёд — «3 из 8»', K => K.viewerArrow('next'), { 'viewer.counter': '3 из 8', 'viewer.caption': 'Передняя часть · три четверти справа' }],
    ['Esc; «+5» — первая скрытая: своя загрузка', async (K) => { await K.key('Escape'); await K.thumb('s-front', 'more') },
      { viewer: { counter: '4 из 8', caption: 'Своя загрузка · front-1.jpg', src: 'upload.svg', pick: null } }],
    ['Esc; каталог «VIN на металле», «открыть крупно» у «Колеса» — в полосе «Выбрать»', async (K) => { await K.key('Escape'); await K.catalogFrom('s-vin-metal'); await K.tileOpen('car-wheel') },
      { surface: 'catalog', viewer: { counter: '13 из 16', caption: 'Колесо · крупно', src: 'car-wheel.svg', pick: 'Выбрать' } }],
    ['«Выбрать» в полосе — «Выбрано»; Esc — каталог: плитка выбрана', async (K) => { await K.act('viewer-pick'); await K.key('Escape') },
      { surface: 'catalog', viewer: null, 'catalog.picked': ['car-wheel'], 'catalog.note': 'Выбрано: 1' }],
  ], { query: 'tab=processes' }],
  'СС-84': ['поиск по фото-подсказке шага и действие «Заполнить изображения» из выдачи (такт 87: поиск — по новому полю)', [
    ['«анфас» — шаг «Передняя часть» по своей подсказке', async (K) => { await K.searchClick(); await K.type('анфас') },
      { results: [{ path: 'Процессы → Осмотр автомобиля', items: ['Передняя часть | фото-подсказка «Передняя часть · анфас»'] }] }],
    ['«заполнить изоб», Enter — таб «Процессы и шаги», сайд массовой заливки', async (K) => { await K.fill('[data-field=search]', 'заполнить изоб'); await K.key('Enter') },
      { tab: 'processes', surface: 'fill', 'fill.sub': 'Подобрано 3 из 3', query: '' }],
  ]],
  /* ============================ такт 88: вставка из другой схемы, тексты повторяемого процесса ============================ */
  'СС-85': ['вставка полей из другой схемы: схема → группа → поля; конфликт алиаса виден до вставки; «Вставить N полей в группу «…»» — одной записью с «Отменить» (ревью 4.5; решение 3 оркестратора 2026-10-08)', [
    ['«Вставить из другой схемы» — схемы компании «Демо Страхование» и отобранные шаблоны; кнопка выключена', K => K.act('field-paste'),
      { surface: 'paste', focusIn: 'paste', paste: { kind: 'fields', level: 'schemes', title: 'Вставить поля из другой схемы', sub: 'В группу «Заявка»', back: false, query: '',
        groups: [{ legend: 'Схемы компании «Демо Страхование»', rows: ['d-osago · ОСАГО — осмотр легкового автомобиля Осмотр транспорта · 2 группы · 9 полей',
          'd-flat · Осмотр квартиры перед страхованием Осмотр недвижимости · 2 группы · 7 полей'] },
        { legend: 'Отобранные шаблоны', rows: ['t-car · Осмотр легкового автомобиля Осмотр транспорта · 2 группы · 8 полей', 't-moto · Осмотр мототехники Осмотр транспорта · 2 группы · 6 полей',
          't-truck · Осмотр грузового транспорта Осмотр транспорта · 2 группы · 7 полей', 't-house · Осмотр загородного дома Осмотр недвижимости · 2 группы · 6 полей',
          'd-machine · Осмотр спецтехники в лизинге Осмотр оборудования · 2 группы · 6 полей'] }],
        marks: [], empty: null, parts: [], target: null, rows: [], all: null, note: 'Выбрано: 0', confirm: 'Вставить в группу «Заявка» · выкл' }, writes: 0 }],
    ['«ОСАГО…» — второй уровень: группы полей, «←»; фокус на первой группе', K => K.pasteScheme('d-osago'),
      { 'paste.level': 'parts', 'paste.title': 'ОСАГО — осмотр легкового автомобиля', 'paste.sub': 'Группы полей схемы', 'paste.back': true,
        'paste.parts': ['dg-lead · Заявка Lead · 4 поля', 'dg-car · Автомобиль Car · 5 полей'], focusPaste: 'part dg-lead', writes: 0 }],
    ['«Заявка» — поля группы: тип, алиас; «алиас policy_number уже есть — будет policy_number_2»', K => K.pastePart('dg-lead'),
      { 'paste.level': 'items', 'paste.title': 'Заявка', 'paste.sub': 'ОСАГО — осмотр легкового автомобиля', 'paste.rows': [
        'df-number · Номер полиса · алиас policy_number уже есть — будет policy_number_2 · policy_number · Текст', 'df-date · Дата осмотра · inspection_date · Дата',
        'df-phone · Телефон клиента · client_phone · Текст', 'df-email · Email клиента · client_email · Текст'], 'paste.all': 'false', focusPaste: 'row df-number', writes: 0 }],
    ['выбрать три поля — «Вставить 3 поля в группу «Заявка»»', async (K) => { await K.pasteCheck('df-number'); await K.pasteCheck('df-date'); await K.pasteCheck('df-phone') },
      { 'paste.all': 'mixed', 'paste.note': 'Выбрано: 3', 'paste.confirm': 'Вставить 3 поля в группу «Заявка»', 'paste.rows.0': 'df-number · Номер полиса · алиас policy_number уже есть — будет policy_number_2 · policy_number · Текст · выбрано', writes: 0 }],
    ['«Вставить» — поля в конце группы, алиас с суффиксом; одна запись, уведомление с «Отменить»; фокус на «Вставить из другой схемы»', async (K) => { await K.act('paste-confirm'); await K.settled() },
      { surface: '', notices: ['Вставлены 3 поля в группу «Заявка»'], 'form.title': 'Заявка · 6 полей', 'form.rows': ['1 · Номер полиса · policy_number · Текст · Обязательное',
        '2 · Страхователь · insurer · Текст · Обязательное', '3 · Дата начала полиса · policy_start · Дата · Только web', '4 · Номер полиса · policy_number_2 · Текст · Обязательное',
        '5 · Дата осмотра · inspection_date · Дата · Обязательное', '6 · Телефон клиента · client_phone · Текст · Обязательное'], saveLog: ['saving', 'saved'], writes: 1, focusAct: 'field-paste' }],
    ['«Отменить» — группа прежняя', async (K) => { await K.undo(); await K.settled() },
      { 'form.title': 'Заявка · 3 поля', 'form.rows.length': 3, writes: 2 }],
    ['снова: «Номер полиса» — «Вставить 1 поле в группу «Заявка»»', async (K) => {
      await K.wait(3200); await K.act('field-paste'); await K.pasteScheme('d-osago'); await K.pastePart('dg-lead'); await K.pasteCheck('df-number') },
      { 'paste.confirm': 'Вставить 1 поле в группу «Заявка»', 'paste.note': 'Выбрано: 1', writes: 2 }],
    ['«Вставить» и дифф публикации: поле добавлено с алиасом policy_number_2', async (K) => { await K.act('paste-confirm'); await K.settled(); await K.publish(); await K.area('form') },
      { surface: 'publish', 'form.rows.3': '4 · Номер полиса · policy_number_2 · Текст · Обязательное', 'diff.open.0.groups.0': { kind: 'added', title: 'Добавлено · 2',
        items: ['Поле «Номер полиса» | группа «Заявка», алиас policy_number_2', 'Поле «Цвет кузова» | группа «Автомобиль», алиас body_color'] }, writes: 3 }],
  ], { query: 'tab=form' }],
  'СС-86': ['вставка шагов из другой схемы: схема → процесс → шаги; процесс-цель; шаги — в конец процесса с фото-подсказками и нейросетями, одной записью с «Отменить» (ревью 4.5; решение 3)', [
    ['«Вставить шаг из другой схемы» — схемы с числом процессов и шагов; цель — первый обычный процесс', K => K.act('step-paste'),
      { surface: 'paste', paste: { kind: 'steps', level: 'schemes', title: 'Вставить шаги из другой схемы', sub: 'В процесс «Осмотр автомобиля»', back: false, query: '',
        groups: [{ legend: 'Схемы компании «Демо Страхование»', rows: ['d-osago · ОСАГО — осмотр легкового автомобиля Осмотр транспорта · 2 процесса · 7 шагов',
          'd-flat · Осмотр квартиры перед страхованием Осмотр недвижимости · 1 процесс · 5 шагов'] },
        { legend: 'Отобранные шаблоны', rows: ['t-car · Осмотр легкового автомобиля Осмотр транспорта · 2 процесса · 9 шагов', 't-moto · Осмотр мототехники Осмотр транспорта · 2 процесса · 6 шагов',
          't-truck · Осмотр грузового транспорта Осмотр транспорта · 2 процесса · 8 шагов', 't-house · Осмотр загородного дома Осмотр недвижимости · 1 процесс · 5 шагов',
          'd-machine · Осмотр спецтехники в лизинге Осмотр оборудования · 2 процесса · 6 шагов'] }],
        marks: [], empty: null, parts: [], target: null, rows: [], all: null, note: 'Выбрано: 0', confirm: 'Вставить в процесс «Осмотр автомобиля» · выкл' }, writes: 0 }],
    ['«ОСАГО…» — процессы схемы', K => K.pasteScheme('d-osago'),
      { 'paste.sub': 'Процессы схемы', 'paste.parts': ['dp-auto · Осмотр автомобиля auto_inspection · 5 шагов', 'dp-docs · Документы docs · 2 шага'], focusPaste: 'part dp-auto' }],
    ['«Осмотр автомобиля» — шаги: тип, способ, подсказки и нейросети второй строкой; процесс-цель', K => K.pastePart('dp-auto'),
      { 'paste.level': 'items', 'paste.target': 'Осмотр автомобиля', 'paste.rows': [
        'ds-rear · Задняя часть · 3 фото-подсказки · Оценка повреждений · 2–7 фото · Основной', 'ds-left · Вид слева · 1 фото-подсказка · Ракурсы авто · Левая сторона · 2–7 фото · Основной',
        'ds-odometer · Одометр · 1 фото-подсказка · без нейросетей · 1 фото · Основной', 'ds-interior · Салон · 1 фото-подсказка · без нейросетей · 2 фото · Основной',
        'ds-wheels · Колёса · 2 фото-подсказки · Оценка повреждений · 2–7 фото · Основной'] }],
    ['выбрать «Задняя часть» и «Вид слева»; процесс-цель «Осмотр документов»', async (K) => { await K.pasteCheck('ds-rear'); await K.pasteCheck('ds-left'); await K.select('paste-target', 'Осмотр документов') },
      { 'paste.target': 'Осмотр документов', 'paste.confirm': 'Вставить 2 шага в процесс «Осмотр документов»', 'paste.note': 'Выбрано: 2', writes: 0 }],
    ['«Вставить» — шаги в конце процесса с подсказками и нейросетями; одна запись, уведомление с «Отменить»', async (K) => { await K.act('paste-confirm'); await K.settled() },
      { surface: '', notices: ['Вставлены 2 шага в процесс «Осмотр документов»'], 'proc.cards.1': 'Осмотр документов · 3 шага · docs_inspection', 'proc.rows.p-docs': [
        '1 · Паспорт ТС (ПТС) · Техническое фото · 2 фото · Сканер документов · Не установлена · Из галереи, Скан документов',
        '2 · Задняя часть · Основной · 2–7 фото · Оценка повреждений · 3 · Все установлены · Обязательный',
        '3 · Вид слева · Основной · 2–7 фото · Ракурсы авто · Левая сторона · 1 · Все установлены'],
      'proc.thumbs.s-paste-1': ['Задняя часть · анфас', 'Задняя часть · три четверти слева', 'Задняя часть · три четверти справа'], saveLog: ['saving', 'saved'], writes: 1, focusAct: 'step-paste' }],
    ['поиск «задняя» — вставленный шаг в «Процессы → Осмотр документов»', async (K) => { await K.searchClick(); await K.type('задняя') },
      { results: [{ path: 'Процессы → Осмотр документов', items: ['Задняя часть'] }] }],
    ['Esc; «Отменить» — шагов нет', async (K) => { await K.key('Escape'); await K.undo(); await K.settled() },
      { 'proc.cards.1': 'Осмотр документов · 1 шаг · docs_inspection', 'proc.rows.p-docs.length': 1, writes: 2 }],
  ], { query: 'tab=processes' }],
  'СС-86/новая': ['вставка шагов в схеме без процессов — отказ с причиной (ревью 4.5)', [
    ['«Вставить шаг из другой схемы» — сайда нет, уведомление', K => K.act('step-paste'),
      { surface: '', notices: ['В схеме нет процессов для шагов — сначала добавьте процесс'], writes: 1 }],
  ], { query: 'data=new&saved=1&tab=processes' }],
  'СС-87': ['навигация внутри сайда вставки: «←» и Esc — уровень назад, выбор сбрасывается, фокус — на строке, с которой пришли; Esc на первом уровне закрывает сайд (паттерн «выбор из справочника»)', [
    ['группа «Автомобиль»: «Автомобиль» донора — три алиаса уже есть', async (K) => { await K.act('field-paste'); await K.pasteScheme('d-osago'); await K.pastePart('dg-car') },
      { 'paste.sub': 'ОСАГО — осмотр легкового автомобиля', 'paste.rows': ['df-vin · VIN · алиас vin уже есть — будет vin_2 · vin · Текст',
        'df-plate · Госномер · алиас regnum уже есть — будет regnum_2 · regnum · Текст', 'df-brand · Марка · brand · Текст', 'df-model · Модель · model · Текст',
        'df-mileage · Пробег · алиас mileage уже есть — будет mileage_2 · mileage · Число'], 'paste.confirm': 'Вставить в группу «Автомобиль» · выкл' }],
    ['флажок шапки — все пять', K => K.pasteAll(), { 'paste.all': 'true', 'paste.note': 'Выбрано: 5', 'paste.confirm': 'Вставить 5 полей в группу «Автомобиль»' }],
    ['«←» — группы схемы, выбор сброшен, фокус на «Автомобиле»', K => K.backLayer(),
      { 'paste.level': 'parts', 'paste.note': 'Выбрано: 0', 'paste.confirm': 'Вставить в группу «Автомобиль» · выкл', focusPaste: 'part dg-car', surface: 'paste' }],
    ['Esc — схемы, фокус на «ОСАГО…»', K => K.key('Escape'), { 'paste.level': 'schemes', 'paste.back': false, focusPaste: 'scheme d-osago', surface: 'paste' }],
    ['Esc на первом уровне — сайд закрыт без записи, фокус на «Вставить из другой схемы»', K => K.key('Escape'), { surface: '', paste: null, focusAct: 'field-paste', writes: 0 }],
    ['снова — сайд с первого уровня', K => K.act('field-paste'), { 'paste.level': 'schemes', 'paste.query': '', writes: 0 }],
  ], { query: 'tab=form&group=g-car' }],
  'СС-88': ['поиск схемы-донора по названию: слова с начала слова, подсветка; пусто — «Ничего не найдено»; схемы той же компании — по компании-владельцу (ревью 4.5; аудит, «выбор из справочника»)', [
    ['«квартир» — одна схема компании, совпадение подсвечено', async (K) => { await K.act('field-paste'); await K.fill('[data-field=paste-search]', 'квартир') },
      { 'paste.query': 'квартир', 'paste.groups': [{ legend: 'Схемы компании «Демо Страхование»', rows: ['d-flat · Осмотр квартиры перед страхованием Осмотр недвижимости · 2 группы · 7 полей'] }],
        'paste.marks': ['квартир'], 'paste.empty': null }],
    ['«лизинг спец» — шаблон, слова в любом порядке', K => K.fill('[data-field=paste-search]', 'лизинг спец'),
      { 'paste.groups': [{ legend: 'Отобранные шаблоны', rows: ['d-machine · Осмотр спецтехники в лизинге Осмотр оборудования · 2 группы · 6 полей'] }], 'paste.marks': ['спец', 'лизинг'] }],
    ['«трактор» — «Ничего не найдено»', K => K.fill('[data-field=paste-search]', 'трактор'), { 'paste.groups': [], 'paste.empty': 'Ничего не найдено по «трактор»' }],
    ['пустой запрос — снова все три', K => K.clear('[data-field=paste-search]'), { 'paste.query': '', 'paste.groups.length': 2, 'paste.empty': null }],
    ['компания-владелец «Пример Лизинг» — схем компании нет, только шаблоны', async (K) => {
      await K.key('Escape'); await K.tab('settings'); await K.fill('[data-field=owner]', 'Пример Лизинг'); await K.blur(); await K.settled(); await K.tab('form'); await K.act('field-paste') },
      { 'g.owner': 'Пример Лизинг', 'paste.groups': [{ legend: 'Отобранные шаблоны', rows: ['t-car · Осмотр легкового автомобиля Осмотр транспорта · 2 группы · 8 полей', 't-moto · Осмотр мототехники Осмотр транспорта · 2 группы · 6 полей',
          't-truck · Осмотр грузового транспорта Осмотр транспорта · 2 группы · 7 полей', 't-house · Осмотр загородного дома Осмотр недвижимости · 2 группы · 6 полей',
          'd-machine · Осмотр спецтехники в лизинге Осмотр оборудования · 2 группы · 6 полей'] }] }],
  ], { query: 'tab=form' }],
  'СС-89': ['тексты в приложении: вариант чипом — до трёх вариантов по типу объекта процесса; «Сохранить» оверлея — одна запись; дифф и поиск по текстам (ревью 4.6; решения 4, 5 оркестратора)', [
    ['«Открыть процесс» — раздел «Тексты в приложении»: тип объекта не выбран — варианты разных типов', K => K.processAct('p-damage', 'process-open'),
      { surface: 'process-overlay', texts: { fill: 'выкл', fillHint: 'Сначала выберите тип объекта съёмки в разделе «Поведение»',
        values: { item: '', add: '', before: '', more: '', finish: '', empty: '' },
        chips: { item: ['Повреждение', 'Дефект', 'Документ'], add: ['Добавить повреждение', 'Добавить дефект', 'Добавить документ'],
          before: ['Снимите повреждение целиком, затем крупно', 'Снимите дефект целиком, затем крупно', 'Снимите документ целиком, без бликов'],
          more: ['Есть ещё повреждения?', 'Есть ещё дефекты?', 'Есть ещё документы?'], finish: ['Повреждений больше нет', 'Дефектов больше нет', 'Документов больше нет'],
          empty: ['Повреждения ещё не добавлены', 'Дефекты ещё не добавлены', 'Документы ещё не добавлены'] },
        hints: { item: 'Список повторов — с номером: «Повреждение 1», «Повреждение 2»', add: 'Под списком повторов — начинает новый повтор', before: 'Перед первым шагом каждого повтора',
          more: 'После повтора — ответ кнопкой добавления или завершения', finish: 'Рядом с вопросом «Есть ещё?» — завершает процесс', empty: 'Экран списка, пока повторов нет' } }, writes: 0 }],
    ['тип объекта «Легковой автомобиль» — варианты типа, заполнение включено', K => K.select('odObjectType', 'Легковой автомобиль'),
      { 'texts.fill': 'вкл', 'texts.fillHint': 'Только пустые поля — заполненные не меняются', 'texts.chips.item': ['Повреждение', 'Деталь кузова', 'Колесо'],
        'texts.chips.add': ['Добавить повреждение', 'Добавить деталь', 'Добавить колесо'], writes: 0 }],
    ['чип «Деталь кузова» — в поле, чип выбран; чип «Добавить деталь»', async (K) => { await K.textChip('item', 'Деталь кузова'); await K.textChip('add', 'Добавить деталь') },
      { 'texts.values.item': 'Деталь кузова', 'texts.values.add': 'Добавить деталь', 'texts.chips.item': ['Повреждение', 'Деталь кузова *', 'Колесо'],
        'texts.chips.add': ['Добавить повреждение', 'Добавить деталь *', 'Добавить колесо'], writes: 0 }],
    ['свой текст в поле — ни один чип не выбран', K => K.fill('[data-overlay-texts] [data-text=more]', 'Ещё повреждённые детали есть?'),
      { 'texts.values.more': 'Ещё повреждённые детали есть?', 'texts.chips.more': ['Есть ещё повреждения?', 'Есть ещё повреждённые детали?', 'Есть ещё колёса для съёмки?'], writes: 0 }],
    ['«Сохранить» оверлея — одна запись', async (K) => { await K.act('overlay-save'); await K.settled() },
      { surface: '', saveLog: ['saving', 'saved'], writes: 1 }],
    ['поиск «добавить деталь» — процесс по тексту в приложении', async (K) => { await K.searchClick(); await K.type('добавить деталь') },
      { results: [{ path: 'Процессы и шаги', items: ['Осмотр повреждений | текст в приложении «Добавить деталь»'] }] }],
    ['дифф публикации: тип объекта и тексты в приложении', async (K) => { await K.key('Escape'); await K.publish(); await K.area('processes') },
      { surface: 'publish', 'diff.open.0.groups': [{ kind: 'changed', title: 'Изменено · 2', items: [
        'Процесс «Осмотр повреждений»: настройки процесса | тип объекта: пусто → тип объекта: Легковой автомобиль',
        'Процесс «Осмотр повреждений»: тексты в приложении | название повтора: пусто, кнопка добавления: пусто, вопрос «Есть ещё?»: пусто → название повтора: Деталь кузова, кнопка добавления: Добавить деталь, вопрос «Есть ещё?»: Ещё повреждённые детали есть?'] },
        { kind: 'removed', title: 'Удалено · 1', items: ['Шаг «Страховой полис» | процесс «Осмотр документов»'] }] }],
  ], { query: 'tab=processes' }],
  'СС-90': ['тексты в приложении: вариант из поповера «Все варианты» — поиск, группы по типу объекта; Esc закрывает только поповер (ревью 4.6; решение 4)', [
    ['«Все варианты» у названия повтора — группы всех типов объекта', async (K) => { await K.processAct('p-damage', 'process-open'); await K.textVariants('item') },
      { surface: 'process-overlay', variants: { key: 'item', query: '', groups: ['Легковой автомобиль: Повреждение, Деталь кузова, Колесо', 'Грузовой транспорт: Повреждение, Ось, Секция кузова',
        'Мототехника: Повреждение, Деталь', 'Недвижимость: Дефект, Помещение, Комната', 'Документ: Документ, Страница'], marks: [], empty: null } }],
    ['поиск «помещ» — один вариант, подсветка', K => K.fill('[data-variants] [data-field=variants-search]', 'помещ'),
      { 'variants.groups': ['Недвижимость: Помещение'], 'variants.marks': ['Помещ'] }],
    ['«Помещение» — в поле, поповер закрыт, фокус на «Все варианты»', K => K.variantPick('Помещение'),
      { variants: null, 'texts.values.item': 'Помещение', surface: 'process-overlay', focusAct: 'text-variants', writes: 0 }],
    ['тип «Недвижимость» — его группа первой, выбранный вариант отмечен', async (K) => { await K.select('odObjectType', 'Недвижимость'); await K.textVariants('item') },
      { 'variants.groups.0': 'Недвижимость: Дефект, Помещение *, Комната', 'texts.chips.item': ['Дефект', 'Помещение *', 'Комната'] }],
    ['«трактор» — пусто', K => K.fill('[data-variants] [data-field=variants-search]', 'трактор'), { 'variants.groups': [], 'variants.empty': 'Ничего не найдено по «трактор»' }],
    ['Esc — закрыт только поповер, оверлей открыт, значение прежнее', K => K.key('Escape'),
      { variants: null, surface: 'process-overlay', surfaces: ['process-overlay'], 'texts.values.item': 'Помещение', writes: 0 }],
  ], { query: 'tab=processes' }],
  'СС-91': ['тексты в приложении: «Заполнить по типу объекта» — только пустые, набор уже выбранного варианта; «Отменить» в уведомлении; повтор — пустых нет (ревью 4.6; решение 4)', [
    ['тип «Недвижимость», чип «Помещение» у названия повтора', async (K) => { await K.processAct('p-damage', 'process-open'); await K.select('odObjectType', 'Недвижимость'); await K.textChip('item', 'Помещение') },
      { 'texts.values': { item: 'Помещение', add: '', before: '', more: '', finish: '', empty: '' }, 'texts.fill': 'вкл', writes: 0 }],
    ['«Заполнить по типу объекта» — пять пустых из набора «Помещение»; записи нет, уведомление с «Отменить» — над кнопками подвала', K => K.act('texts-fill'),
      { notices: ['Заполнено 5 текстов по типу «Недвижимость»'], toastClear: true, 'texts.values': { item: 'Помещение', add: 'Добавить помещение', before: 'Снимите помещение от входа',
        more: 'Есть ещё помещения?', finish: 'Все помещения сняты', empty: 'Помещения ещё не добавлены' }, surface: 'process-overlay', writes: 0 }],
    ['«Отменить» — пустые снова пусты, выбранное прежнее', K => K.undo(),
      { 'texts.values': { item: 'Помещение', add: '', before: '', more: '', finish: '', empty: '' }, surface: 'process-overlay', writes: 0 }],
    ['свой текст кнопки добавления, «Заполнить» — заданные не меняются', async (K) => { await K.fill('[data-overlay-texts] [data-text=add]', 'Ещё помещение'); await K.act('texts-fill') },
      { notices: ['Заполнены 4 текста по типу «Недвижимость»'], 'texts.values': { item: 'Помещение', add: 'Ещё помещение', before: 'Снимите помещение от входа',
        more: 'Есть ещё помещения?', finish: 'Все помещения сняты', empty: 'Помещения ещё не добавлены' }, surface: 'process-overlay' }],
    ['ещё раз — пустых нет', async (K) => { await K.wait(3200); await K.act('texts-fill') }, { notices: ['Пустых текстов нет: заполненные не меняются'], writes: 0 }],
    ['«Отмена» оверлея — записи нет; снова — тексты процесса пусты', async (K) => { await K.act('overlay-cancel'); await K.processAct('p-damage', 'process-open') },
      { 'texts.values': { item: '', add: '', before: '', more: '', finish: '', empty: '' }, writes: 0 }],
  ], { query: 'tab=processes' }],
  'СС-92': ['тексты в приложении без типа объекта: «Заполнить по типу объекта» выключена, причина подсказкой рядом; варианты всех типов (ревью 4.6; решение 4)', [
    ['оверлей: тип объекта не выбран — кнопка выключена с причиной', K => K.processAct('p-damage', 'process-open'),
      { 'texts.fill': 'выкл', 'texts.fillHint': 'Сначала выберите тип объекта съёмки в разделе «Поведение»', 'texts.chips.item': ['Повреждение', 'Дефект', 'Документ'] }],
    ['нажатие по выключенной — без правки и уведомления', K => K.act('texts-fill'),
      { notices: [], 'texts.values': { item: '', add: '', before: '', more: '', finish: '', empty: '' }, writes: 0 }, { blind: true }],
    ['чип без типа — «Дефект» в поле; тип «Документ» — набор документа, «Дефект» остаётся своим текстом', async (K) => { await K.textChip('item', 'Дефект'); await K.select('odObjectType', 'Документ') },
      { 'texts.values.item': 'Дефект', 'texts.chips.item': ['Документ', 'Страница'], 'texts.fill': 'вкл' }],
    ['«Заполнить» — пустые из основного набора документа: «Дефект» не из словаря типа', K => K.act('texts-fill'),
      { notices: ['Заполнено 5 текстов по типу «Документ»'], 'texts.values': { item: 'Дефект', add: 'Добавить документ', before: 'Снимите документ целиком, без бликов',
        more: 'Есть ещё документы?', finish: 'Документов больше нет', empty: 'Документы ещё не добавлены' } }],
  ], { query: 'tab=processes' }],
  /* ============================ такт 89: демо-осмотр и превью у «?» ============================ */
  'СС-93': ['демо-осмотр «По шагам»: переходы по кнопкам экрана, ← → и кнопки-стрелки, оглавление по этапам; Esc закрывает, фокус — на «Предпросмотр» (ревью 4.1; решения 5, 6 оркестратора 2026-10-08)', [
    ['«Предпросмотр» — «Начало»: название схемы, компания, «Начать»; «Из чего собран экран»', K => K.preview(),
      { surface: 'demo', 'demo.screen': 'start', 'demo.stage': 'start', 'demo.counter': 'Экран 1 из 14', 'demo.prevOff': true,
        'demo.stages': ['start', 'form', 'process:p-auto !', 'process:p-docs !', 'process:p-damage !', 'confirm !', 'done'],
        'demo.phone': ['name · КАСКО — осмотр легкового автомобиля', 'owner · Демо Страхование', 'start · Начать'],
        'demo.sources': ['setting:general.name · Наименование | КАСКО — осмотр легкового автомобиля', 'setting:general.owner · Компания-владелец | Демо Страхование',
          'setting:mobile.startAfterCreate · Запустить осмотр сразу после создания | включено — сразу к выполнению'], writes: 0 }],
    ['«Начать» — «Анкета», экран группы «Заявка»: поля без «только web», обязательность, заполнитель', K => K.demoPart('start'),
      { 'demo.screen': 'form:g-lead', 'demo.stage': 'form', 'demo.counter': 'Экран 2 из 14', 'demo.prevOff': false,
        'demo.anchors': ['Заявка *', 'Автомобиль', 'Кузов и комплектация'],
        'demo.phone': ['progress', 'group · Заявка', 'field-f-number · Номер полиса * Номер полиса', 'field-f-insurer · Страхователь * ФИО или название организации', 'next · Продолжить'] }],
    ['→ с клавиатуры — «Автомобиль»; ← — снова «Заявка»', async (K) => { await K.key('ArrowRight'); await K.key('ArrowRight'); await K.key('ArrowLeft') },
      { 'demo.screen': 'form:g-car', 'demo.counter': 'Экран 3 из 14' }],
    ['этап «Осмотр автомобиля» в оглавлении — экран первого шага; у шагов без подсказки — метка пробела', K => K.demoStage('process:p-auto'),
      { 'demo.screen': 'step:p-auto:s-vin-glass', 'demo.stage': 'process:p-auto', 'demo.counter': 'Экран 5 из 14',
        'demo.anchors': ['Шаг 1: VIN под стеклом *', 'Шаг 2: VIN на металле | нет фото-подсказки', 'Шаг 3: Передняя часть', 'Шаг 4: Вид справа | нет фото-подсказки'],
        'demo.phone': ['progress', 'title · Шаг 1: VIN под стеклом', 'description · Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден',
          'shot · Нажмите для съёмки 1 фото', 'next · Продолжить'] }],
    ['«Продолжить» — следующий шаг; кнопки-стрелки «→» и «←»', async (K) => { await K.demoPart('next'); await K.act('demo-next'); await K.act('demo-prev') },
      { 'demo.screen': 'step:p-auto:s-vin-metal', 'demo.counter': 'Экран 6 из 14' }],
    ['якорь «Шаг 4: Вид справа» — необязательный шаг: «Пропустить шаг»', K => K.demoAnchor('step:p-auto:s-right'),
      { 'demo.screen': 'step:p-auto:s-right', 'demo.counter': 'Экран 8 из 14',
        'demo.phone': ['progress', 'title · Шаг 4: Вид справа', 'description · Боковая съёмка правой стороны автомобиля', 'shot · Нажмите для съёмки от 2 до 7 фото',
          'skip · Пропустить шаг', 'next · Продолжить'] }],
    ['«Пропустить шаг» — первый шаг следующего процесса', K => K.demoPart('skip'),
      { 'demo.screen': 'step:p-docs:s-pts', 'demo.stage': 'process:p-docs', 'demo.counter': 'Экран 9 из 14' }],
    ['Esc — оверлей закрыт, фокус на «Предпросмотр», записи нет', K => K.key('Escape'), { surface: '', demo: null, focusAct: 'preview', writes: 0 }],
  ]],
  'СС-94': ['демо-осмотр «Карта»: ряды миниатюр по этапам, пробелы, текущий экран; миниатюра открывает экран «По шагам» (ревью 4.1; выборка B2; решение 5)', [
    ['«Карта» — этапы рядами, миниатюры экранов, «!» — экран с пробелом', async (K) => { await K.preview(); await K.demoMode('map') },
      { 'demo.mode': 'map', 'demo.counter': null, 'demo.map': ['start: start *', 'form: form:g-lead, form:g-car, form:g-body',
        'process:p-auto: step:p-auto:s-vin-glass, step:p-auto:s-vin-metal !, step:p-auto:s-front, step:p-auto:s-right !', 'process:p-docs: step:p-docs:s-pts !',
        'process:p-damage: repeat-list:p-damage !, repeat-item:p-damage !, repeat-more:p-damage !', 'confirm: confirm !', 'done: done'] }],
    ['миниатюра «Подтверждение» — экран «По шагам»', K => K.demoThumb('confirm'),
      { 'demo.mode': 'steps', 'demo.screen': 'confirm', 'demo.counter': 'Экран 13 из 14',
        'demo.phone': ['confirm · Проверьте и отправьте', 'files · Дополнительные файлы Приложить сверх шагов', 'check · Подтверждаю, что данные верны', 'send · Отправить'] }],
    ['снова «Карта» — текущий экран отмечен', K => K.demoMode('map'), { 'demo.map.5': 'confirm: confirm * !', 'demo.map.0': 'start: start' }],
  ]],
  'СС-95': ['«Изменить» строки «Из чего собран экран»: оверлей закрывается; сущность — свой сайд, настройка — переход поиска с подсветкой (ревью 4.1, выборка B5; решение 5)', [
    ['демо-осмотр, экран «Передняя часть» — источники экрана', async (K) => { await K.preview(); await K.demoStage('process:p-auto'); await K.demoAnchor('step:p-auto:s-front') },
      { 'demo.screen': 'step:p-auto:s-front', 'demo.sources': ['setting:mobile.mode · Режим выполнения | Обычный — экраны шагов по очереди',
        'step:s-front · Шаг «Передняя часть» | Основной · обязательный', 'step-desc:s-front · Описание шага | Снимите переднюю часть автомобиля с расстояния 3–5 метров',
        'step-hints:s-front · Фото-подсказки и способ съёмки | 8 · Передняя часть · анфас · 2–7 фото', 'setting:general.behavior.refuse · Отказ от осмотра | разрешён — кнопка «Осмотр невозможен»'] }],
    ['«Изменить» у фото-подсказок — оверлей закрыт, таб «Процессы и шаги», сайд шага', K => K.demoEdit('step-hints:s-front'),
      { demo: null, surface: 'step', tab: 'processes', 'stepSide.title': 'Редактирование шага — Передняя часть', 'stepSide.hints.length': 8, writes: 0 }],
    ['Esc — сайд закрыт; «Предпросмотр» — тот же экран', async (K) => { await K.key('Escape'); await K.preview() }, { surface: 'demo', 'demo.screen': 'step:p-auto:s-front' }],
    ['«Изменить» у «Отказа от осмотра» — «Настройки → Общие → Поведение процесса», строка вспыхивает', K => K.demoEdit('setting:general.behavior.refuse'),
      { demo: null, surface: '', tab: 'settings', section: 'general', anchor: 'behavior', flash: ['refuse'], writes: 0 }],
  ], { query: 'app=full' }],
  'СС-95/просмотр': ['демо-осмотр по снимку версии: «?» — «Открыть в демо-осмотре», подзаголовок «По версии от …»; «Показать» — только переход, сайдов правки в просмотре нет (ревью 4.1; СС-53/просмотр)', [
    ['«?» у отказа — превью по снимку версии', K => K.helpOpen('refuse'), { 'help.title': 'Отказ от осмотра', 'help.fragment': true, viewing: 'v1' }],
    ['«Открыть в демо-осмотре» — оверлей по снимку, у строк «Показать»', K => K.helpAction(),
      { surface: 'demo', 'demo.sub': 'По версии от 14.08.2026, 10:20 · логика не выполняется', 'demo.edit': 'Показать' }],
    ['этап «Анкета» — экран группы «Заявка»', K => K.demoStage('form'), { 'demo.screen': 'form:g-lead', 'demo.sources.1': 'field:f-number · Поле «Номер полиса» | Текст · обязательное' }],
    ['«Показать» у поля — оверлей закрыт, «Форма», фокус на строке поля; сайда нет, записи нет', K => K.demoEdit('field:f-number'),
      { demo: null, surface: '', tab: 'form', 'form.group': 'Заявка', focusRow: 'f-number', viewing: 'v1', writes: 0 }],
  ], { query: 'view=v1' }],
  'СС-96': ['правка настройки видна в демо-осмотре: выключили отказ — кнопки «Осмотр невозможен» и ветки нет (ревью 4.1: «правка видна сразу после возврата»)', [
    ['экран шага: «Осмотр невозможен» и ветка в оглавлении', async (K) => { await K.preview(); await K.demoStage('process:p-auto'); await K.demoAnchor('step:p-auto:s-front') },
      { 'demo.phone': ['progress', 'title · Шаг 3: Передняя часть', 'description · Снимите переднюю часть автомобиля с расстояния 3–5 метров', 'shot · Нажмите для съёмки от 2 до 7 фото',
        'refuse · Осмотр невозможен', 'next · Продолжить'], 'demo.stages.7': 'refuse', 'demo.counter': 'Экран 8 из 17' }],
    ['«Осмотр невозможен» — ветка; «Вернуться к осмотру» — экран, с которого пришли', async (K) => { await K.demoPart('refuse'); await K.demoPart('back') },
      { 'demo.screen': 'step:p-auto:s-front' }],
    ['«Изменить» у отказа и выключить отказ — запись', async (K) => { await K.demoEdit('setting:general.behavior.refuse'); await K.toggle('refuse'); await K.settled() },
      { 'g.behavior.refuse': false, saveLog: ['saving', 'saved'], writes: 1 }],
    ['«Предпросмотр» — тот же экран без кнопки, ветки нет, источник — «выключен»', K => K.preview(),
      { 'demo.screen': 'step:p-auto:s-front', 'demo.counter': 'Экран 8 из 16', 'demo.stages.7': undefined,
        'demo.phone': ['progress', 'title · Шаг 3: Передняя часть', 'description · Снимите переднюю часть автомобиля с расстояния 3–5 метров', 'shot · Нажмите для съёмки от 2 до 7 фото', 'next · Продолжить'],
        'demo.sources.4': 'setting:general.behavior.refuse · Отказ от осмотра | выключен — кнопки нет' }],
  ], { query: 'app=full' }],
  'СС-97': ['«?» с превью у настройки: фрагмент экрана с обведённым элементом, название, пояснение, значение; «Открыть в демо-осмотре» — этот экран с подсветкой (ревью 4.2; решение 7)', [
    ['«?» у отказа — поповер: фрагмент экрана шага, «Осмотр невозможен» обведён', K => K.helpOpen('refuse'),
      { help: { title: 'Отказ от осмотра', description: 'Исполнитель сможет завершить осмотр с отметкой «Осмотр невозможен», если выполнение осмотра в данный момент недоступно (например, объект повреждён или заблокирован).',
        value: 'Сейчас: разрешён — кнопка на экранах съёмки', fragment: true, marked: ['refuse'],
        parts: ['progress', 'title · Шаг 1: VIN под стеклом', 'description · Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден', 'shot · Нажмите для съёмки 1 фото',
          'refuse · Осмотр невозможен ◉', 'next · Продолжить'] }, surface: '' }],
    ['«Открыть в демо-осмотре» — экран шага, кнопка обведена, строка источника подсвечена', K => K.helpAction(),
      { help: null, surface: 'demo', 'demo.screen': 'step:p-auto:s-vin-glass', 'demo.phone.4': 'refuse · Осмотр невозможен ◉',
        'demo.sources.5': 'setting:general.behavior.refuse · Отказ от осмотра | разрешён — кнопка «Осмотр невозможен» *' }],
    ['«Мобильное приложение»: «?» у «Запустить осмотр сразу после создания» — промежуточный экран', async (K) => { await K.key('Escape'); await K.section('mobile'); await K.helpOpen('startAfterCreate') },
      { 'help.title': 'Промежуточный экран', 'help.value': 'Сейчас: выключено — после «Начать» экран «Осмотр создан»', 'help.marked': ['intro', 'go'] }],
    ['«Открыть в демо-осмотре» — экран «Осмотр создан»', K => K.helpAction(), { 'demo.screen': 'intro', 'demo.counter': 'Экран 2 из 17', 'demo.phone.0': 'intro · Осмотр создан ◉' }],
    ['«?» у телефона — экран «Осмотр отправлен», кнопка звонка обведена', async (K) => { await K.key('Escape'); await K.helpOpen('phone') },
      { 'help.value': 'Сейчас: Служба поддержки · +7 800 000-00-00', 'help.marked': ['call'] }],
  ], { query: 'app=full' }],
  'СС-98': ['демо-осмотр новой схемы: экраны с пробелами и подсказкой, чего не хватает; «Изменить» у пустого таба — причина двухфазности (ревью 4.1, С-1; решение 6)', [
    ['«Предпросмотр» — пять экранов, этапы с пробелами', K => K.preview(),
      { 'demo.title': 'Демо-осмотр — Новая схема осмотра', 'demo.counter': 'Экран 1 из 5', 'demo.phoneTitle': 'Новая схема осмотра',
        'demo.stages': ['start', 'form !', 'shooting !', 'confirm !', 'done'] }],
    ['«Начать» — «Анкета»: полей нет — подсказка, где их добавить', K => K.demoPart('start'),
      { 'demo.screen': 'form:none', 'demo.anchors': ['Анкета | нет полей анкеты *'],
        'demo.phone': ['form · Анкета', 'form-empty · Полей пока нет Добавьте группы и поля на табе «Форма» — с показом в мобильном', 'next · Продолжить'],
        'demo.sources': ['tab:form · Форма | групп и полей нет'] }],
    ['«Продолжить» — «Съёмка»: процессов нет', K => K.demoPart('next'),
      { 'demo.screen': 'shooting:none', 'demo.phone.1': 'shooting-empty · Снимать пока нечего Добавьте процесс и шаги на табе «Процессы и шаги»',
        'demo.sources': ['tab:processes · Процессы и шаги | процессов нет'] }],
    ['«Изменить» — оверлей закрыт; таб недоступен до первого сохранения — причина', K => K.demoEdit('tab:processes'),
      { demo: null, surface: '', tab: 'settings', notices: ['Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
  ], { query: 'data=new' }],
  'СС-99': ['наведение: элемент телефона подсвечивает строку «Из чего собран экран», строка — обводит элемент (ревью 4.1)', [
    ['экран «Передняя часть»; курсор на слот съёмки — строка фото-подсказок подсвечена, слот обведён', async (K) => {
      await K.preview(); await K.demoStage('process:p-auto'); await K.demoAnchor('step:p-auto:s-front'); await K.demoHoverPart('shot') },
      { 'demo.phone.3': 'shot · Нажмите для съёмки от 2 до 7 фото ◉', 'demo.sources.3': 'step-hints:s-front · Фото-подсказки и способ съёмки | 8 · Передняя часть · анфас · 2–7 фото *' }],
    ['курсор на строку «Отказ от осмотра» — кнопка обведена', K => K.demoHoverSource('setting:general.behavior.refuse'),
      { 'demo.phone.4': 'refuse · Осмотр невозможен ◉', 'demo.phone.3': 'shot · Нажмите для съёмки от 2 до 7 фото',
        'demo.sources.4': 'setting:general.behavior.refuse · Отказ от осмотра | разрешён — кнопка «Осмотр невозможен» *' }],
  ], { query: 'app=full' }],
  'СС-100': ['«Где увидит исполнитель» у поля «Формы» — тот же поповер: экран анкеты с обведённым полем; поле только web — места в приложении нет (решение 7)', [
    ['«?» у «VIN» — экран группы «Автомобиль», поле обведено', K => K.helpOpen('field:f-vin'),
      { 'help.title': 'VIN', 'help.value': 'Анкета, экран 2 — «Автомобиль» · обязательное', 'help.fragment': true, 'help.marked': ['field-f-vin'] }],
    ['«Открыть в демо-осмотре» — экран «Автомобиль», поле обведено', K => K.helpAction(),
      { surface: 'demo', 'demo.screen': 'form:g-car', 'demo.phone.2': 'field-f-vin · VIN * VIN ◉' }],
    ['группа «Заявка»: «?» у «Дата начала полиса» — только web, фрагмента нет', async (K) => { await K.key('Escape'); await K.group('g-lead'); await K.helpOpen('field:f-start') },
      { 'help.title': 'Дата начала полиса', 'help.value': 'Только web — в приложении поля нет', 'help.fragment': false, 'help.parts': [] }],
    ['«Открыть в демо-осмотре» — первый экран анкеты', K => K.helpAction(), { 'demo.screen': 'form:g-lead' }],
  ], { query: 'tab=form&group=g-car' }],
  'СС-101': ['действие поиска «Предпросмотр» открывает демо-осмотр (решение 8 оркестратора)', [
    ['«предпросмотр», Enter — демо-осмотр, запрос очищен', async (K) => { await K.searchClick(); await K.type('предпросмотр'); await K.key('Enter') },
      { surface: 'demo', 'demo.screen': 'start', query: '', notices: [] }],
  ]],
  'СС-102': ['фрагмент экрана приложения у раздела «Тексты в приложении»: экран списка повторов; поле в фокусе — его экран и обведённый текст (решение 7)', [
    ['оверлей повторяемого процесса — фрагмент списка повторов на текстах по умолчанию', K => K.processAct('p-damage', 'process-open'),
      { 'textsPreview.parts': ['process · Осмотр повреждений', 'empty · Пока ничего не добавлено', 'add · Добавить'], 'textsPreview.marked': [] }],
    ['чип «Повреждение» у названия повтора — экран повтора, название обведено', K => K.textChip('item', 'Повреждение'),
      { 'textsPreview.parts.0': 'item · Повреждение 1 ◉', 'textsPreview.marked': ['item'] }],
    ['свой текст кнопки добавления — экран списка, кнопка обведена', K => K.fill('[data-overlay-texts] [data-text=add]', 'Добавить деталь'),
      { 'textsPreview.parts': ['process · Осмотр повреждений', 'empty · Пока ничего не добавлено', 'add · Добавить деталь ◉'], writes: 0 }],
  ], { query: 'tab=processes' }],
  /* ============================ такт 90: витрина — цена из тарифа и превью страницы ============================ */
  'СС-103': ['витрина: цена «от» из тарифа по умолчанию — нижняя граница цены для не клиента по текущему периоду «Тарификации» (ревью 4.7; решения 3, 4)', [
    ['старт: «Из тарифа», на витрине от 700 ₽, период и схема тарификации; «Открыть тарификацию» — панель схемы в новой вкладке', null,
      { 'showcase.priceSource': 'tariff', 'showcase.tariff': 'На витрине от 700 ₽ · текущий тариф с января 2026 · «Осмотр легкового автомобиля», КАСКО',
        'showcase.tariffLink': '/tariffs?tab=schemes&open=scheme&scheme=s-car | _blank', 'showcase.price': null, 'showcase.priceHint': null, 'sc.priceSource': 'tariff', writes: 0 }],
    ['поиск «цена из тарифа» — значение строки с источником', async (K) => { await K.searchClick(); await K.type('цена из тарифа') },
      { searchOpen: true, 'results.0.path': 'Витрина → Витринная карточка', 'results.0.items.0': 'Цена «от» | по запросу «цена из тарифа»', 'rowsX.0': 'showcase · Цена «от» · из тарифа — от 700 ₽ ·  ·  · Цена' }],
    ['«Предпросмотр страницы» — первый экран: от 700 ₽', async (K) => { await K.key('Escape'); await K.siteOpen() },
      { surface: 'site', 'site.view': 'page', 'site.device': 'desktop', 'site.hero.price': 'от 700 ₽', 'site.status': 'Черновик карточки',
        'site.address': 'Будущий адрес: https://example.com/scenarios/distantsionnyy-osmotr-avtomobilya-pered-strakhovaniem',
        'site.url': 'example.com/scenarios/distantsionnyy-osmotr-avtomobilya-pered-strakhovaniem' }],
    ['«Карточка в каталоге» — та же цена, адрес каталога', K => K.siteView('card'),
      { 'site.view': 'card', 'site.sections': ['catalog'], 'site.card.price': 'от 700 ₽', 'site.url': 'example.com/scenarios' }],
  ], { query: 'tab=showcase&now=2026-10-03T09:00:00' }],
  'СС-104': ['витрина: ручная цена — прежнее значение помнится; ниже тарифа — предупреждение под полем; на странице — ручная цена (решение 3)', [
    ['«Указать вручную» — поле с ручной ценой 2 599, подсказка — цена по тарифу; карточка в черновике', async (K) => { await K.priceSource('manual'); await K.settled() },
      { 'showcase.priceSource': 'manual', 'showcase.price': '2 599', 'showcase.priceHint': 'По тарифу для не клиента — от 700 ₽ | default', 'showcase.tariff': null,
        'sc.priceSource': 'manual', 'sc.priceFrom': 2599, saveLog: ['saving', 'saved'] }],
    ['500 ₽ — ниже тарифа: предупреждение под полем', async (K) => { await K.fill('[data-field=scPriceValue]', '500'); await K.settled() },
      { 'showcase.price': '500', 'sc.priceFrom': 500, 'showcase.priceHint': 'Ниже тарифа: для не клиента — от 700 ₽ | warning' }],
    ['«Предпросмотр страницы» — на первом экране от 500 ₽', K => K.siteOpen(), { surface: 'site', 'site.hero.price': 'от 500 ₽' }],
    ['дифф публикации — источник и ручная цена в области «Витрина»', async (K) => { await K.key('Escape'); await K.publish(); await K.area('showcase') },
      { surface: 'publish', 'diff.areas.3': { id: 'showcase', count: '2 изменения', tone: 'changed' },
        'diff.open.0.groups.0': { kind: 'changed', title: 'Изменено · 2', items: ['Цена «от»: источник | из тарифа → вручную', 'Цена «от» вручную | 2599 → 500'] } }],
    ['ручная выше тарифа — предупреждения нет', async (K) => { await K.key('Escape'); await K.fill('[data-field=scPriceValue]', '900'); await K.settled() },
      { surface: '', 'showcase.price': '900', 'showcase.priceHint': 'По тарифу для не клиента — от 700 ₽ | default' }],
    ['«Из тарифа» — снова от 700 ₽; ручная 900 помнится', async (K) => { await K.priceSource('tariff'); await K.settled() },
      { 'showcase.priceSource': 'tariff', 'showcase.price': null, 'sc.priceFrom': 900, 'showcase.tariff': 'На витрине от 700 ₽ · текущий тариф с января 2026 · «Осмотр легкового автомобиля», КАСКО' }],
  ], { query: 'tab=showcase&now=2026-10-03T09:00:00' }],
  'СС-105': ['витрина: «Не показывать» убирает цену со страницы сценария и из карточки каталога; метки «Не заполнено» у цены нет (решения 3, 5)', [
    ['«Не показывать» — ни цены из тарифа, ни поля', async (K) => { await K.priceSource('hidden'); await K.settled() },
      { 'showcase.priceSource': 'hidden', 'showcase.tariff': null, 'showcase.price': null, 'sc.priceSource': 'hidden', saveLog: ['saving', 'saved'] }],
    ['превью — на первом экране цены нет; незаполненное — краткое описание и изображение', K => K.siteOpen(),
      { surface: 'site', 'site.hero.price': null, 'site.gaps': ['summary', 'image'], 'site.gapsText': 'Не заполнено: Краткое описание, Изображение' }],
    ['карточка в каталоге — без цены', K => K.siteView('card'), { 'site.card.price': null, 'site.gaps': ['image', 'summary'] }],
    ['поиск «цена» — «не показывается»', async (K) => { await K.key('Escape'); await K.searchClick(); await K.type('цена') },
      { 'rowsX.0': 'showcase · Цена «от» · не показывается ·  ·  · Цена' }],
  ], { query: 'tab=showcase&now=2026-10-03T09:00:00' }],
  'СС-106': ['витрина: превью публичной страницы — «Компьютер / Телефон», «Страница сценария / Карточка в каталоге»; над рамкой статус и будущий адрес; Esc и «Вернуться к витрине» (ревью 4.8; решение 5)', [
    ['«Предпросмотр страницы» — компьютер, страница сценария: разделы по ревью 4.8', K => K.siteOpen(),
      { surface: 'site', 'site.title': 'Предпросмотр страницы сценария', 'site.subtitle': 'По черновику · вид сайта условный: дизайн-системы сайта в репо нет',
        'site.device': 'desktop', 'site.view': 'page', 'site.frame': 'desktop', 'site.status': 'Черновик карточки',
        'site.sections': ['hero', 'why', 'flow', 'modules'], 'site.gaps': ['summary', 'image'],
        'site.hero': { tags: ['Страхование', 'ПСО — предстраховой осмотр', 'Транспорт'], title: 'Дистанционный осмотр автомобиля перед страхованием', summary: null, price: 'от 700 ₽', image: null, action: 'Оставить заявку', columns: 2 },
        'site.pairs.0': 'Дорого и долго | Выезд эксперта занимает дни и стоит денег | Клиент снимает автомобиль сам за 10–15 минут', 'site.pairs.length': 4,
        'site.metrics': ['50–80 % | Снижение выездов', 'до 10 раз | Ускорение получения материалов'],
        'site.steps': ['Создание', 'Выполнение', 'ИИ-анализ', 'Экспертиза', 'Завершение'],
        'site.modules': ['Распознавание повреждений', 'Распознавание VIN', 'Проверка геолокации', 'Контроль качества съёмки'] }],
    ['«Телефон» — экран 375, первый экран столбиком', K => K.siteDevice('phone'),
      { 'site.device': 'phone', 'site.frame': 'phone', 'site.frameWidth': 375, 'site.hero.columns': 1, 'site.sections': ['hero', 'why', 'flow', 'modules'] }],
    ['«Карточка в каталоге» на телефоне — карточка во всю ширину', K => K.siteView('card'),
      { 'site.view': 'card', 'site.sections': ['catalog'], 'site.url': 'example.com/scenarios', 'site.card.width': 335,
        'site.card.title': 'Дистанционный осмотр автомобиля перед страхованием', 'site.card.tags': ['Страхование', 'ПСО — предстраховой осмотр', 'Транспорт'] }],
    ['«Компьютер» — карточка в колонке каталога 336', K => K.siteDevice('desktop'), { 'site.device': 'desktop', 'site.card.width': 336 }],
    ['Esc — оверлей закрыт, фокус на «Предпросмотр страницы»', K => K.key('Escape'), { surface: '', site: null, focusAct: 'site-preview' }],
    ['снова — устройство и вид прежние', K => K.siteOpen(), { surface: 'site', 'site.device': 'desktop', 'site.view': 'card' }],
    ['«Вернуться к витрине» — оверлей закрыт, фокус на «Предпросмотр страницы»; правок нет', K => K.act('site-close'),
      { surface: '', site: null, focusAct: 'site-preview', 'sc.status': 'draft', writes: 0 }],
  ], { query: 'tab=showcase&now=2026-10-03T09:00:00' }],
  'СС-107': ['витрина: «Не заполнено» ведёт к полю таба — оверлей закрывается, фокус в поле; заполненное пропадает из незаполненного (решение 5)', [
    ['превью — метки у краткого описания и изображения', K => K.siteOpen(), { 'site.gaps': ['summary', 'image'] }],
    ['«Не заполнено · Краткое описание» — оверлей закрыт, фокус в поле', K => K.siteGap('summary'), { surface: '', site: null, tab: 'showcase', focusField: 'scSummary' }],
    ['набор описания; превью — описание на первом экране, осталось изображение', async (K) => { await K.type('Осмотр по фото за 15 минут'); await K.settled(); await K.siteOpen() },
      { 'sc.summary': 'Осмотр по фото за 15 минут', 'site.hero.summary': 'Осмотр по фото за 15 минут', 'site.gaps': ['image'], 'site.gapsText': 'Не заполнено: Изображение' }],
    ['«Не заполнено · Изображение» — фокус на зоне загрузки', K => K.siteGap('image'), { surface: '', site: null, focusField: 'scImage' }],
    ['загрузка изображения; превью — картинка, незаполненного нет', async (K) => { await K.act('showcase-image'); await K.settled(); await K.siteOpen() },
      { 'site.hero.image': 'car-front-left.svg', 'site.gaps': [], 'site.gapsText': 'Все поля витрины заполнены' }],
  ], { query: 'tab=showcase&now=2026-10-03T09:00:00' }],
  'СС-108': ['новая схема: схемы нет в тарификации — цены из тарифа нет; превью — первый экран из меток «Не заполнено»; цена ведёт к источнику, ручная — к полю (решения 3, 5)', [
    ['таб «Витрина» — «Из тарифа»: «—», схемы нет в тарификации', K => K.tab('showcase'),
      { 'showcase.priceSource': 'tariff', 'showcase.tariff': 'На витрине — · схемы нет в тарификации', 'showcase.tariffLink': '/tariffs?tab=schemes | _blank' }],
    ['превью — статус, адреса нет, пять меток', K => K.siteOpen(),
      { 'site.status': 'Требует оформления', 'site.address': 'Адрес страницы появится с продающим названием', 'site.url': 'example.com/scenarios/…',
        'site.gaps': ['tags', 'title', 'summary', 'price', 'image'], 'site.gapsText': 'Не заполнено: Индустрия, Продающее название, Краткое описание, Цена «от», Изображение',
        'site.hero.tags': ['Транспорт'] }],
    ['«Не заполнено · Цена «от»» — фокус на источнике цены', K => K.siteGap('price'), { surface: '', site: null, focusField: 'scPrice' }],
    ['«Указать вручную» — сравнить не с чем; превью — метка ведёт к полю цены', async (K) => { await K.priceSource('manual'); await K.settled(); await K.siteOpen(); await K.siteGap('price') },
      { 'showcase.priceHint': 'Схемы нет в тарификации — сравнить не с чем | default', surface: '', focusField: 'scPriceValue' }],
  ], { query: 'data=new&now=2026-10-03T09:00:00' }],
  'СС-109': ['просмотр версии: «Предпросмотр страницы» доступен — страница по снимку; метка ведёт к полю только для чтения (решение 5; правило «Такт 68»)', [
    ['«Предпросмотр страницы» у версии от 14.08.2026 — подзаголовок по версии, метки снимка', K => K.siteOpen(),
      { surface: 'site', 'site.subtitle': 'По версии от 14.08.2026, 10:20 · вид сайта условный: дизайн-системы сайта в репо нет', 'site.status': 'Черновик карточки',
        'site.gaps': ['tags', 'title', 'summary', 'image'], 'site.hero.price': 'от 700 ₽' }],
    ['«Не заполнено · Продающее название» — поле только для чтения в фокусе', K => K.siteGap('title'), { surface: '', site: null, focusField: 'scTitle', focusRo: true, writes: 0 }],
  ], { query: 'view=v1&tab=showcase&now=2026-10-03T09:00:00' }],
  /* ---------- такт 91: создание схемы с мягкой этапностью — ревью 5, решения 3–7 оркестратора 2026-10-08 ---------- */
  'СС-110': ['окно «Новая схема осмотра»: шаблон → «Основа» → «Создать схему» — первое сохранение, страница в режиме создания (ревью 5.3; решение 3)', [
    ['старт: «С чего начать», «Отобранные шаблоны» — пять шаблонов, первый выбран; ИИ-строка выключена с причиной', null,
      { page: 'list', rows: 4, 'createWin.step': 'start', 'createWin.mode': 'create', 'createWin.source': 'templates', 'createWin.sub': 'С чего начать: шаблон, другая схема или пустая схема',
        'createWin.sources': ['templates 5 *', 'other 2 ⚿', 'recent 2'], 'createWin.cards': ['t-car · Легковой автомобиль · 8 полей · 9 шагов *', 't-moto · Мототехника · 6 полей · 6 шагов',
          't-truck · Грузовой транспорт · 7 полей · 8 шагов', 't-house · Загородный дом · 6 полей · 5 шагов', 'd-machine · Спецтехника · 6 полей · 6 шагов'],
        'createWin.ai': { disabled: true, hint: 'Появится вместе с ИИ-агентом', value: '' }, 'createWin.acts': ['create-empty', 'create-dump', 'create-cancel', 'create-next'] }],
    ['карточка «Осмотр мототехники»', K => K.createCard('t-moto'), { 'createWin.cards.0': 't-car · Легковой автомобиль · 8 полей · 9 шагов', 'createWin.cards.1': 't-moto · Мототехника · 6 полей · 6 шагов *' }],
    ['«Далее» — «Основа»: название шаблона, компания пользователя, тип схемы шаблона', K => K.createAct('create-next'),
      { 'createWin.step': 'base', 'createWin.origin': 'Из шаблона «Осмотр мототехники»', 'createWin.name': 'Осмотр мототехники', 'createWin.owner': 'Демо Страхование',
        'createWin.type': 'Осмотр транспорта', 'createWin.inspection': 'Обычный', 'createWin.acts': ['create-change', 'create-back', 'create-confirm'] }],
    ['пустое наименование — «Создать схему» отказывает: ошибка под полем, окно открыто', async (K) => { await K.createName(''); await K.createAct('create-confirm') },
      { page: 'list', 'createWin.step': 'base', 'createWin.name': '', 'createWin.nameError': 'Заполните наименование схемы' }],
    ['наименование — «Создать схему»: страница схемы в режиме создания — «Форма» и «Процессы» открыты, полоса подготовки, чип у «Опубликовать схему»',
      async (K) => { await K.createName('Осмотр скутеров курьерской службы'); await K.createAct('create-confirm'); await K.created() },
      { page: 'scheme', title: 'Осмотр скутеров курьерской службы', publish: 'never', versions: 0, writes: 1, 'tabLock.off': [],
        notices: ['Схема «Осмотр скутеров курьерской службы» создана из шаблона «Осмотр мототехники»'], headerActs: ['preview', 'readiness', 'publish', 'menu'],
        strip: { title: 'Подготовка схемы: 3 из 5', next: 'Далее: Правила →', stages: ['base done *', 'form done', 'shooting done', 'rules todo', 'publish ready'] },
        chip: { label: 'Готовность 3 из 5', mark: null, open: false }, tabMarks: { settings: null, form: 'done', processes: 'done', showcase: null },
        stageNext: ['base · Далее: Анкета →', 'rules · Проверить и опубликовать'] }],
    ['таб «Форма» — группы и поля шаблона; текущий этап — «Анкета»', K => K.tab('form'),
      { tab: 'form', 'form.groups': ['Заявка', 'Мототехника'], 'form.title': 'Заявка · 2 поля', 'strip.stages.1': 'form done *', stageNext: ['form · Далее: Съёмка →'] }],
  ], { path: 'new', query: 'now=2026-10-03T09:00:00' }],
  'СС-111': ['окно «Новая схема осмотра»: «Другие схемы» по роли, «Недавние», «Загрузить из дампа», ИИ выключен, «Пустая схема», Esc и «Добавить схему» (ревью 5.3; решение 3)', [
    ['«Другие схемы» — схемы компании, доступ по роли', K => K.createSource('other'),
      { 'createWin.source': 'other', 'createWin.sources': ['templates 5', 'other 2 ⚿ *', 'recent 2'], 'createWin.access': 'Схемы вашей компании — доступ по роли «Администратор»',
        'createWin.cards': ['d-osago · Легковой автомобиль · 9 полей · 7 шагов *', 'd-flat · Квартира · 7 полей · 5 шагов'] }],
    ['«Далее» — «Основа»: «Копия — …» схемы компании', K => K.createAct('create-next'),
      { 'createWin.step': 'base', 'createWin.origin': 'Из схемы «ОСАГО — осмотр легкового автомобиля»', 'createWin.name': 'Копия — ОСАГО — осмотр легкового автомобиля' }],
    ['«Выбрать другой» — снова «С чего начать», источник прежний', K => K.createAct('create-change'), { 'createWin.step': 'start', 'createWin.source': 'other' }],
    ['«Недавние» — схема компании и шаблон, свежие первыми', K => K.createSource('recent'),
      { 'createWin.source': 'recent', 'createWin.access': null, 'createWin.cards': ['d-osago · Легковой автомобиль · 9 полей · 7 шагов *', 't-car · Легковой автомобиль · 8 полей · 9 шагов'] }],
    ['«Загрузить из дампа» — вне стенда: уведомление, окно прежнее', K => K.createAct('create-dump'), { notices: ['Загрузка из дампа — вне стенда'], 'createWin.step': 'start' }],
    ['ИИ-строка выключена: нажатие не ставит фокус и не вводит текст', async (K) => { await K.clickEl(`document.querySelector('[data-modal=create] [data-field=create-ai] input')`); await K.type('осмотр склада') },
      { 'createWin.ai': { disabled: true, hint: 'Появится вместе с ИИ-агентом', value: '' } }, { blind: true }],
    ['«Пустая схема» — «Основа» без источника, наименование пустое', K => K.createAct('create-empty'),
      { 'createWin.step': 'base', 'createWin.origin': 'Пустая схема', 'createWin.name': '', 'createWin.type': 'Осмотр транспорта' }],
    ['Esc — окно закрыто, фон — список схем', K => K.key('Escape'), { page: 'list', createWin: null, rows: 4 }],
    ['«Добавить схему» — окно снова с начала', K => K.act('scheme-add'), { 'createWin.step': 'start', 'createWin.source': 'templates', 'createWin.cards.0': 't-car · Легковой автомобиль · 8 полей · 9 шагов *' }],
    ['«Пустая схема», «Осмотр склада» — «Создать схему»: 1 из 5, форма без полей блокирует, «Далее: Анкета →»',
      async (K) => { await K.createAct('create-empty'); await K.createName('Осмотр склада'); await K.createAct('create-confirm'); await K.created() },
      { page: 'scheme', title: 'Осмотр склада', versions: 0, writes: 1, 'tabLock.off': [], notices: ['Схема «Осмотр склада» создана'],
        strip: { title: 'Подготовка схемы: 1 из 5', next: 'Далее: Анкета →', stages: ['base done *', 'form blocked 1', 'shooting warning 1', 'rules todo', 'publish blocked 1'] },
        chip: { label: 'Готовность 1 из 5', mark: 'blocked 1', open: false }, tabMarks: { settings: null, form: 'blocked 1', processes: 'warning 1', showcase: null } }],
  ], { path: 'new', query: 'now=2026-10-03T09:00:00' }],
  'СС-112': ['рост готовности: группа, поле, процесс и шаг — этапы готовы, счёт полосы растёт; «Правила» — ручной отметкой (ревью 5.4, 5.5; решения 4, 5)', [
    ['старт: пустая созданная схема — 1 из 5', null, { 'strip.title': 'Подготовка схемы: 1 из 5', rd: { done: 1, total: 5, blocks: 1, warns: 1, next: 'form', current: 'base' } }],
    ['«Далее: Анкета →» в полосе — таб «Форма», фокус на «Добавить группу»', K => K.stripNext(),
      { tab: 'form', 'strip.stages.1': 'form blocked 1 *', focusAct: 'group-add-empty' }],
    ['группа «Объект» — в группе нет полей: предупреждение, «В форме нет полей» блокирует', async (K) => { await K.act('group-add-empty'); await K.typeInto('gdTitle', 'Объект'); await K.act('group-save'); await K.settled() },
      { 'form.groups': ['Объект'], 'strip.stages.1': 'form blocked 2 *', 'tabMarks.form': 'blocked 2' }],
    ['поле «Адрес» с алиасом — «Анкета» готова; блокирующих нет: 2 из 5', async (K) => {
      await K.act('field-add-empty'); await K.typeInto('fdTitle', 'Адрес'); await K.typeInto('fdAlias', 'address'); await K.act('field-save'); await K.settled() },
      { 'form.rows': ['1 · Адрес · address · Текст'], strip: { title: 'Подготовка схемы: 2 из 5', next: 'Далее: Съёмка →', stages: ['base done', 'form done *', 'shooting warning 1', 'rules todo', 'publish ready'] },
        'tabMarks.form': 'done', stageNext: ['form · Далее: Съёмка →'] }],
    ['«Далее: Съёмка →» внизу «Анкеты» — «Процессы и шаги»', K => K.act('stage-next-form'), { tab: 'processes', 'strip.stages.2': 'shooting warning 1 *', focusAct: 'process-add-empty' }],
    ['процесс «Осмотр склада» без шагов — блокирует публикацию: 2 из 5', async (K) => { await K.act('process-add-empty'); await K.typeInto('pdTitle', 'Осмотр склада'); await K.act('process-save'); await K.settled() },
      { 'proc.cards.length': 1, 'strip.title': 'Подготовка схемы: 2 из 5', 'strip.stages.2': 'shooting blocked 1 *', 'strip.stages.4': 'publish blocked 1', 'tabMarks.processes': 'blocked 1' }],
    ['шаг «Стеллажи» — «Съёмка» готова, без описания и фото-подсказки — два предупреждения: 3 из 5', async (K) => {
      await K.clickEl(`document.querySelector('[data-process] [data-act=step-add]')`); await K.typeInto('sdTitle', 'Стеллажи'); await K.act('step-save'); await K.settled() },
      { strip: { title: 'Подготовка схемы: 3 из 5', next: 'Далее: Правила →', stages: ['base done', 'form done', 'shooting warning 2 *', 'rules todo', 'publish ready'] }, 'tabMarks.processes': 'warning 2' }],
    ['«Далее: Правила →» внизу «Съёмки» — «Настройки», «Поведение процесса»', K => K.act('stage-next-shooting'),
      { tab: 'settings', section: 'general', anchor: 'behavior', 'strip.stages.3': 'rules todo *', rulesBox: 'false' }],
    ['отметка «Проверил унаследованное…» внизу «Настроек» — 4 из 5, «Проверить и опубликовать»; запись автосохранением', async (K) => { await K.rulesCheck(); await K.settled() },
      { rulesChecked: true, rulesBox: 'true', strip: { title: 'Подготовка схемы: 4 из 5', next: 'Проверить и опубликовать', stages: ['base done', 'form done', 'shooting warning 2', 'rules done *', 'publish ready'] },
        'chip.label': 'Готовность 4 из 5', 'tabMarks.settings': 'done', saveLog: ['saving', 'saved'] }],
    ['«Проверить и опубликовать» в полосе — первая публикация', K => K.stripNext(), { surface: 'first-publish', confirmOff: false }],
  ], { query: 'data=created&from=empty&now=2026-10-03T09:00:00' }],
  'СС-113': ['чип «Готовность N из 5»: поповер — этапы и проверки; «Исправить» ведёт к месту; ручная отметка «Правил»; «Перейти» (ревью 5.5; решения 4, 5)', [
    ['чип — поповер: этапы, счётчик «1» у «Съёмки», флажок «Правил», «Витрина» после публикации', K => K.chipOpen(),
      { 'chip.open': true, ready: { title: 'Готовность к публикации', summary: '3 из 5 этапов · блокирующих нет · предупреждений: 1', footer: [], groups: [
        { head: 'base done · Основа · Осмотр транспорта · Демо Страхование', checks: [], manual: null },
        { head: 'form done · Анкета · 8 полей в 2 группах', checks: [], manual: null },
        { head: 'shooting warning 1 · Съёмка · 9 шагов в 2 процессах', checks: ['step-hint:ts-car-interior · warn · У шага «Салон» нет фото-подсказки · Процессы → Осмотр автомобиля'], manual: null },
        { head: 'rules todo · Правила · Проверьте права доступа и шаблоны PDF', checks: [], manual: 'false' },
        { head: 'publish ready · Проверка и публикация · Готово к публикации', checks: [], manual: null },
        { head: 'showcase locked · Витрина — после публикации · Доступно после публикации схемы', checks: [], manual: null }] } }],
    ['«Исправить» у «Салон» — поповер закрыт, «Процессы и шаги», фокус на строке шага', K => K.fix('step-hint:ts-car-interior'),
      { ready: null, tab: 'processes', focusStep: 'ts-car-interior', 'strip.stages.2': 'shooting warning 1 *' }],
    ['загрузка фото-подсказки у «Салон» — «Съёмка» без замечаний, маркер вкладки — готово', async (K) => { await K.stepAct('ts-car-interior', 'hint-upload'); await K.uploadZone('ts-car-interior'); await K.settled() },
      { 'strip.stages.2': 'shooting done *', 'tabMarks.processes': 'done', 'chip.mark': null }],
    ['поповер: флажок «Правил» — 4 из 5; запись автосохранением', async (K) => { await K.chipOpen(); await K.manual(); await K.settled() },
      { rulesChecked: true, 'chip.label': 'Готовность 4 из 5', 'ready.groups.3': { head: 'rules done · Правила · Унаследованное проверено', checks: [], manual: 'true' }, saveLog: ['saving', 'saved'] }],
    ['«Перейти» у «Анкеты» — поповер закрыт, таб «Форма»', K => K.groupGo('form'), { ready: null, tab: 'form', 'strip.stages.1': 'form done *' }],
  ], { query: 'data=created&from=t-car&now=2026-10-03T09:00:00' }],
  'СС-114': ['маркеры вкладок и полоса: «Свернуть» — чип остаётся, память сессии; «Показать полосу»; этап полосы ведёт к месту; «Далее» внизу «Правил» (ревью 5.5; решение 5)', [
    ['старт: маркеры — «Форма» готова, «Процессы» счётчик «1» (у шага нет фото-подсказки)', null,
      { tabMarks: { settings: null, form: 'done', processes: 'warning 1', showcase: null }, 'strip.title': 'Подготовка схемы: 3 из 5' }],
    ['«Свернуть» — полосы нет, чип у «Опубликовать схему» остаётся', K => K.stripCollapse(), { strip: null, 'chip.label': 'Готовность 3 из 5' }],
    ['перезагрузка — полоса свёрнута: память сессии вкладки', K => K.start('data=created&from=d-machine&now=2026-10-03T09:00:00'), { strip: null, 'chip.label': 'Готовность 3 из 5' }],
    ['поповер чипа — «Показать полосу подготовки»', async (K) => { await K.chipOpen() }, { 'ready.footer': ['strip-expand'] }],
    ['«Показать полосу подготовки» — полоса снова, поповер закрыт', K => K.act('strip-expand'), { ready: null, 'strip.title': 'Подготовка схемы: 3 из 5' }],
    ['этап «Правила» в полосе — «Настройки», «Поведение процесса»', K => K.stage('rules'),
      { tab: 'settings', section: 'general', anchor: 'behavior', 'strip.stages.3': 'rules todo *' }],
    ['«Проверить и опубликовать» внизу «Правил» — первая публикация', K => K.act('stage-publish'), { surface: 'first-publish', modalTitle: 'Первая публикация схемы', 'firstList.length': 6 }],
  ], { query: 'data=created&from=d-machine&now=2026-10-03T09:00:00' }],
  'СС-115': ['первая публикация с блокирующей проверкой: «Опубликовать» выключена с причиной; «Исправить» — к месту; блокировка снята — первая версия, чип «Проверка» (ревью 5.5; решения 4, 5)', [
    ['«Опубликовать схему» — «В форме нет полей» блокирует: «Опубликовать» выключена, причина в подвале', K => K.publish(),
      { surface: 'first-publish', confirmOff: true, note: 'Публикация невозможна: исправьте блокирующие проверки — 1',
        'firstList.1': { head: 'form blocked 1 · Анкета · Полей нет', checks: ['form-empty · block · В форме нет полей · Форма'], manual: null },
        'firstList.4.head': 'publish blocked 1 · Проверка и публикация · Блокирует публикацию: 1' }],
    ['нажатие по выключенной «Опубликовать» — снимка нет', K => K.act('first-confirm'), { surface: 'first-publish', versions: 0 }, { blind: true }],
    ['«Исправить» у «В форме нет полей» — окно закрыто, «Форма», фокус на «Добавить группу»', K => K.fix('form-empty'), { surface: '', tab: 'form', focusAct: 'group-add-empty' }],
    ['группа и поле с алиасом — блокирующих нет', K => K.groupWithField('Склад', 'Адрес склада', 'address'), { 'rd.blocks': 0, 'strip.title': 'Подготовка схемы: 2 из 5' }],
    ['снова «Опубликовать схему» — «Опубликовать» доступна', K => K.publish(),
      { surface: 'first-publish', confirmOff: false, note: 'После публикации создаётся неизменяемый снимок версии', 'firstList.4.head': 'publish ready · Проверка и публикация · Готово к публикации' }],
    ['«Опубликовать» — первая версия: полосы и «Далее» нет, «История версий» в шапке, чип «Проверка: 1», счётчик «1» у «Процессов»', K => K.act('first-confirm'),
      { surface: '', versions: 1, publish: 'published', strip: null, stageNext: [], headerActs: ['history', 'preview', 'readiness', 'publish', 'menu'],
        chip: { label: 'Проверка:', mark: 'warning 1', open: false }, tabMarks: { settings: null, form: null, processes: 'warning 1', showcase: null },
        notices: ['Схема опубликована: версия от 03.10.2026, 09:00'] }],
  ], { query: 'data=created&from=empty&now=2026-10-03T09:00:00' }],
  'СС-116': ['после публикации: чип «Проверка: [N]» при замечаниях, число на вкладках, проверки над диффом, «Исправить» из окна публикации (ревью 5.5; решения 4, 5)', [
    ['старт: полосы нет, «Проверка: 6», счётчик «1» у «Формы», «5» у «Процессов»', null,
      { strip: null, stageNext: [], chip: { label: 'Проверка:', mark: 'warning 6', open: false }, tabMarks: { settings: null, form: 'warning 1', processes: 'warning 5', showcase: null } }],
    ['поповер — проверки по областям', K => K.chipOpen(), { ready: { title: 'Проверка перед публикацией', summary: 'Блокирующих нет · предупреждений: 6', footer: [], groups: [
      { head: 'form warning 1 · Форма', checks: ['field-hint:f-year · warn · У поля «Год выпуска» нет подсказки · Форма → Кузов и комплектация'], manual: null },
      { head: 'processes warning 5 · Процессы и шаги', checks: [
        'step-hint:s-vin-metal · warn · У шага «VIN на металле» нет фото-подсказки · Процессы → Осмотр автомобиля',
        'step-hint:s-right · warn · У шага «Вид справа» нет фото-подсказки · Процессы → Осмотр автомобиля',
        'step-hint:s-pts · warn · У шага «Паспорт ТС (ПТС)» нет фото-подсказки · Процессы → Осмотр документов',
        'repeat-empty:p-damage · warn · В повторяемом процессе «Осмотр повреждений» нет шагов повтора · Процессы → Осмотр повреждений',
        'repeat-texts:p-damage · warn · У повторяемого процесса «Осмотр повреждений» не заполнены тексты в приложении · Процессы → Осмотр повреждений'], manual: null }] } }],
    ['Esc; «Опубликовать схему» — проверки над диффом, «Опубликовать» доступна', async (K) => { await K.key('Escape'); await K.publish() },
      { surface: 'publish', 'gate.length': 2, 'gate.1.head': 'processes warning 5 · Процессы и шаги', 'diff.warnings': [], confirmOff: false, note: 'После публикации создаётся неизменяемый снимок версии' }],
    ['«Исправить» у «VIN на металле» — окно закрыто, «Процессы и шаги», фокус на строке шага', K => K.fix('step-hint:s-vin-metal'), { surface: '', tab: 'processes', focusStep: 's-vin-metal' }],
    ['«Исправить» из чипа у поля без подсказки — «Форма», группа поля, фокус на строке', async (K) => { await K.chipOpen(); await K.fix('field-hint:f-year') },
      { ready: null, tab: 'form', 'form.group': 'Кузов и комплектация', focusRow: 'f-year' }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-117': ['«⋯ → Сделать копию»: окно «Новая схема осмотра» на шаге «Основа» с «Копия — …»; «Создать схему» — копия в режиме создания (ревью 5.3; решение 3)', [
    ['«Сделать копию» — «Основа»: «Копия — КАСКО…», компания, тип', K => K.menu('copy'),
      { surface: 'copy', 'createWin.mode': 'copy', 'createWin.step': 'base', 'createWin.origin': 'Копия схемы «КАСКО — осмотр легкового автомобиля»',
        'createWin.name': 'Копия — КАСКО — осмотр легкового автомобиля', 'createWin.owner': 'Демо Страхование', 'createWin.type': 'Осмотр транспорта', 'createWin.acts': ['create-cancel', 'create-confirm'] }],
    ['Esc — окно закрыто, схема прежняя', K => K.key('Escape'), { surface: '', createWin: null, versions: 2, title: 'КАСКО — осмотр легкового автомобиля' }],
    ['снова; «Создать схему» — копия: публикаций нет, «Форма» и «Процессы» открыты, полоса подготовки, истории нет', async (K) => { await K.menu('copy'); await K.createAct('create-confirm'); await K.created() },
      { page: 'scheme', title: 'Копия — КАСКО — осмотр легкового автомобиля', versions: 0, publish: 'never', writes: 1, 'tabLock.off': [],
        notices: ['Схема «Копия — КАСКО — осмотр легкового автомобиля» создана копией «КАСКО — осмотр легкового автомобиля»'],
        headerActs: ['preview', 'readiness', 'publish', 'menu'], 'strip.title': 'Подготовка схемы: 2 из 5', 'strip.next': 'Далее: Съёмка →',
        'g.description': 'Комплексный осмотр автомобиля перед оформлением полиса добровольного страхования' }],
  ], { query: 'now=2026-10-03T09:00:00' }],
  'СС-118': ['прямой адрес новой схемы без идентификатора: «Анкета» и «Съёмка» под замком с причиной, замки на вкладках; истории и копии нет (ревью 5, решение 7)', [
    ['старт: полоса — замки у «Анкеты» и «Съёмки», вкладки с замком, истории нет', null,
      { strip: { title: 'Подготовка схемы: 1 из 5', next: 'Далее: Анкета →', stages: ['base done *', 'form locked', 'shooting locked', 'rules todo', 'publish blocked 1'] },
        tabMarks: { settings: null, form: 'locked', processes: 'locked', showcase: null }, headerActs: ['preview', 'readiness', 'publish', 'menu'],
        'tabLock.wrap': ['form | Форма: Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор', 'processes | Процессы и шаги: Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['«Далее: Анкета →» — отказ с причиной, таб прежний', K => K.stripNext(), { tab: 'settings', notices: ['Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['этап «Съёмка» в полосе — тот же отказ', K => K.stage('shooting'), { tab: 'settings', notices: ['Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['«⋯ → Сделать копию» — отказ с причиной, окна нет', K => K.menu('copy'), { surface: '', createWin: null, notices: ['Станет доступно после первого сохранения схемы: полям и шагам нужен её идентификатор'] }],
    ['первая правка — идентификатор есть: замки сняты, «Анкета» блокирует — форма без полей', async (K) => { await K.rename('Осмотр склада'); await K.settled() },
      { 'tabLock.off': [], writes: 1, 'strip.stages': ['base done *', 'form blocked 1', 'shooting warning 1', 'rules todo', 'publish blocked 1'], tabMarks: { settings: null, form: 'blocked 1', processes: 'warning 1', showcase: null } }],
  ], { query: 'data=new' }],
  /*
   * ============================ такт 92: узкий экран 375 × 812 ============================
   * Ревью 4.10, сценарий С6 («найти настройку, переключить, посмотреть изменения, опубликовать; посмотреть демо-осмотр»); решения 4 и 5
   * оркестратора 2026-10-08. Поправки 1а и 1б — СС-127, СС-128 (окно рабочего стола).
   */
  'СС-119': ['каркас на 375: меню не в потоке, полоса компактная; бургер — выезжающая панель меню слева; Esc и переход по пункту закрывают её (решение 4)', [
    ['старт: на полосе — бургер и аватар профиля, меню в потоке нет', null,
      { 'frame.menuInFlow': false, 'frame.bar': ['Открыть меню', 'Профиль'], 'frame.drawer': null, 'phone.docWidth': 375 }],
    ['бургер — панель слева во всю высоту, фокус в ней', K => K.burger(),
      { 'frame.drawer.x': 0, 'frame.drawer.h': 812, 'frame.drawer.focusIn': true, 'frame.drawer.expanded': 'true' }],
    ['Esc — панель закрыта, фокус на бургере', K => K.key('Escape'), { 'frame.drawer': null, 'frame.focus': 'Открыть меню' }],
    ['бургер и «Типы схем осмотра» — страница стенда, панель закрыта', async (K) => { await K.burger(); await K.drawerLink('insure-types') },
      { page: 'list', url: '/insure-types', 'frame.drawer': null, 'frame.menuInFlow': false }],
  ], { width: 375, height: 812 }],
  'СС-120': ['шапка на 375: имя 24/28 до трёх строк, строка статусов переносится; «Опубликовать схему» и «⋯» — в нижней полосе, «Предпросмотр» и «История версий» — в «⋯» (решение 5)', [
    ['старт: в шапке — чип «Проверка: 6», в полосе у низа окна — «Опубликовать схему» и «⋯»', null,
      { 'phone.titleLines': 2, 'phone.titleSize': '24px/28px', 'phone.headerActs': ['readiness'], 'phone.dock': ['publish', 'menu'], 'phone.dockAtBottom': true, 'phone.docWidth': 375 }],
    ['«⋯» полосы: «Предпросмотр» и «История версий» первыми, удаление — тоном опасного действия', K => K.dockMenu(),
      { menuTone: ['Предпросмотр', 'История версий', 'Экспортировать схему', 'Скачать дамп', 'Сделать копию', 'Сбросить черновик к текущей версии', 'Удалить схему · destructive'] }],
    ['«История версий» — сайд во всё окно', K => K.clickEl("document.querySelector('[data-menu=scheme] [data-action=history]')"),
      { surface: 'history', 'phone.surface.full': true }],
    ['Esc — сайд закрыт', K => K.key('Escape'), { surface: '' }],
    ['длинное имя — три строки с многоточием', async (K) => { await K.rename(LONG_NAME); await K.settled() }, { title: LONG_NAME, 'phone.titleLines': 3 }],
  ], { width: 375, height: 812 }],
  'СС-121': ['«Настройки» на 375: навигатор — выбор раздела списком, липкий под табами; колонка во всю ширину (решение 5)', [
    ['старт: «Общие» в списке, навигатора нет', null, { section: 'general', 'phone.section': 'Общие', 'phone.nav': false, 'phone.docWidth': 375 }],
    ['список: «Аномалии» — раздел на экране', K => K.select('section-select', 'Аномалии'), { section: 'anomalies', 'phone.section': 'Аномалии', 'phone.docWidth': 375 }],
    ['прокрутка на 600 — выбор раздела у верха окна', K => K.scrollBy(600), { 'phone.sectionTop': 0 }],
    ['список: «Права доступа» — таблица групп в ширину страницы', K => K.select('section-select', 'Права доступа'), { section: 'access', 'phone.section': 'Права доступа', 'phone.docWidth': 375 }],
  ], { width: 375, height: 812 }],
  'СС-122': ['поиск на 375: поле к верху окна, выдача во всю ширину до края окна; переключатель в строке выдачи, уведомление над нижней полосой (решение 5)', [
    ['фокус в поле — поле у верха окна', K => K.searchClick(), { searchFocus: true, 'phone.searchTop': 8 }],
    ['«размыт» — выдача под полем во всю ширину до края окна', K => K.type('размыт'),
      { searchOpen: true, 'phone.results': { x: 0, w: 375, toBottom: true }, rowsX: ['setting · Детектор «Размытые изображения» ·  · true ·  · Размыт'] }],
    ['переключатель в строке — детектор выключен, уведомление над нижней полосой', async (K) => { await K.resultToggle('anomalies.detectors.blur.on'); await K.settled() },
      { 's.anomalies.detectors.blur.on': false, notices: ['Настройка «Детектор „Размытые изображения“» выключена'], 'phone.toastAboveDock': true, searchOpen: true, writes: 1 }],
  ], { width: 375, height: 812 }],
  'СС-123': ['«Форма» на 375: группа — выбором списком, поля — строками-карточками; «⋯ → Изменить поле» — сайд во всё окно (решение 5)', [
    ['таб «Форма»: «Заявка» в списке, три карточки полей, таблицы нет', K => K.tab('form'),
      { tab: 'form', 'phone.group': 'Заявка', 'phone.fieldCards': ['1. Номер полиса', '2. Страхователь', '3. Дата начала полиса'], 'phone.tables': 0, 'phone.docWidth': 375 }],
    ['список: «Кузов и комплектация» — четыре карточки', K => K.select('group-select', 'Кузов и комплектация'),
      { 'phone.group': 'Кузов и комплектация', 'phone.fieldCards': ['1. Тип кузова', '2. Комплектация', '3. Повреждения кузова', '4. Год выпуска'] }],
    ['«⋯» карточки «Комплектация»: «Изменить поле», «Удалить поле» — тоном опасного действия', K => K.cardMenu('field', 'f-trim'),
      { 'phone.cardMenu': ['Изменить поле', 'Удалить поле · destructive'] }],
    ['«Изменить поле» — сайд поля во всё окно', K => K.clickEl("document.querySelector('[data-menu=card] [data-action=edit]')"),
      { surface: 'field', 'fieldSide.title': 'Комплектация', 'phone.surface.full': true }],
    ['Esc — сайд закрыт', K => K.key('Escape'), { surface: '' }],
  ], { width: 375, height: 812 }],
  'СС-124': ['«Процессы» на 375: шаги — строками-карточками; «⋯ → Изменить шаг» — сайд шага во всё окно, сохранение (решение 5)', [
    ['таб «Процессы и шаги»: карточки шагов, таблиц нет', K => K.tab('processes'),
      { tab: 'processes', 'phone.stepCards': { 'p-auto': ['1. VIN под стеклом', '2. VIN на металле', '3. Передняя часть', '4. Вид справа'], 'p-docs': ['1. Паспорт ТС (ПТС)'] }, 'phone.tables': 0, 'phone.docWidth': 375 }],
    ['«⋯ → Изменить шаг» у «Передней части» — сайд шага во всё окно', K => K.cardMenu('step', 's-front', 'edit'),
      { surface: 'step', 'stepSide.name': 'Передняя часть', 'phone.surface.full': true }],
    ['новое название и «Сохранить» — карточка с новым названием', async (K) => { await K.fill('[data-field=sdTitle]', 'Передняя часть авто'); await K.act('step-save'); await K.settled() },
      { surface: '', 'phone.stepCards.p-auto.2': '3. Передняя часть авто', saveLog: ['saving', 'saved'] }],
  ], { width: 375, height: 812 }],
  'СС-125': ['«Опубликовать схему» из нижней полосы — окно публикации во всё окно (решение 5)', [
    ['«Опубликовать схему» в полосе — окно публикации', K => K.dock('publish'), { surface: 'publish', 'phone.surface.full': true, confirmOff: false }],
    ['«Отмена» — окно закрыто, полоса на месте', K => K.act('publish-cancel'), { surface: '', 'phone.dock': ['publish', 'menu'] }],
  ], { width: 375, height: 812 }],
  'СС-126': ['демо-осмотр на телефоне: экран приложения без рамки, оглавление и «Из чего собран экран» — вкладками (решение 5)', [
    ['«⋯ → Предпросмотр» — демо-осмотр во всё окно, вкладка «Экран», рамки телефона нет', K => K.dockMenu('preview'),
      { surface: 'demo', 'phone.surface.full': true, 'phone.demoPane': 'screen', 'phone.demoFrame': 'none', 'demo.screen': 'start' }],
    ['вкладка «Оглавление»', K => K.demoPane('toc'), { 'phone.demoPane': 'toc', 'demo.stage': 'start' }],
    ['этап «Анкета» — экраны групп в оглавлении, вкладка прежняя', K => K.demoStage('form'), { 'phone.demoPane': 'toc', 'demo.stage': 'form', 'demo.screen': 'form:g-lead' }],
    ['экран «Автомобиль» — вкладка «Экран» с ним', K => K.demoAnchor('form:g-car'), { 'phone.demoPane': 'screen', 'demo.screen': 'form:g-car', 'phone.demoFrame': 'none' }],
    ['вкладка «Из чего собран экран»', K => K.demoPane('sources'), { 'phone.demoPane': 'sources' }],
    ['«Изменить» у поля VIN — оверлей закрыт, «Форма», сайд поля во всё окно', K => K.demoEdit('field:f-vin'),
      { demo: null, tab: 'form', surface: 'field', 'fieldSide.title': 'VIN', 'phone.surface.full': true }],
  ], { width: 375, height: 812 }],
  'СС-127': ['поправка 1а: «Проверка и публикация» засчитывается публикацией — до неё «Готово к публикации» без галочки, счёт по этапам 1–4 (решение 1а оркестратора 2026-10-08)', [
    ['схема из шаблона: «Проверка и публикация» — готово к публикации, 3 из 5', null,
      { strip: { title: 'Подготовка схемы: 3 из 5', next: 'Далее: Правила →', stages: ['base done *', 'form done', 'shooting warning 1', 'rules todo', 'publish ready'] }, 'rd.done': 3, 'rd.total': 5 }],
    ['отметка «Правил» — 4 из 5, «Проверить и опубликовать»; галочки у публикации нет', async (K) => { await K.rulesCheck(); await K.settled() },
      { 'strip.title': 'Подготовка схемы: 4 из 5', 'strip.next': 'Проверить и опубликовать', 'strip.stages.4': 'publish ready', 'chip.label': 'Готовность 4 из 5', 'rd.next': 'publish' }],
    ['поповер чипа: «Проверка и публикация» — «Готово к публикации»', K => K.chipOpen(),
      { 'ready.groups.4': { head: 'publish ready · Проверка и публикация · Готово к публикации', checks: [], manual: null }, 'ready.summary': '4 из 5 этапов · блокирующих нет · предупреждений: 1' }],
    ['Esc, «Проверить и опубликовать» — первая публикация с тем же статусом', async (K) => { await K.key('Escape'); await K.stripNext() },
      { surface: 'first-publish', 'firstList.4.head': 'publish ready · Проверка и публикация · Готово к публикации', confirmOff: false }],
    ['«Опубликовать» — этап засчитан публикацией: полосы нет', async (K) => { await K.act('first-confirm'); await K.settled() },
      { surface: '', strip: null, versions: 1, 'rd.done': 5 }],
  ], { query: 'data=created&from=t-car' }],
  'СС-128': ['поправка 1б: удаление в меню строки таблицы — тоном опасного действия, как «Удалить схему» (решение 1б оркестратора 2026-10-08)', [
    ['таб «Форма», меню строки «Страхователь» — «Удалить» тоном опасного действия', async (K) => { await K.tab('form'); await K.clickEl("document.querySelector('[data-form-row=f-insurer] [data-slot=table-row-actions-secondary] button')") },
      { rowMenu: ['Удалить · destructive'] }],
    ['«Удалить» — строки нет, уведомление с «Отменить»', async (K) => { await K.clickEl("document.querySelector('[data-menu=row-actions] [data-action=delete]')"); await K.settled() },
      { rowMenu: [], 'form.rows.length': 2 }],
  ]],
  /* Такт 101 — решение владельца 2026-10-09 (доска scheme-edit-wide-v4, S1, L2): сайд немодальный, навигатор слева от колонки. */
  'СС-129': ['сайд немодальным слоем: страница под ним работает — навигатор «Настроек» слева нажимается, сайд остаётся открытым; Esc закрывает (такт 101, S1)', [
    ['«Словарь комментариев» — сайд открыт слоем (окно 1440)', K => K.act('open-comments'), { surface: 'comments', section: 'general' }],
    ['навигатор под сайдом: «Мобильное приложение» — раздел сменился, сайд открыт', K => K.section('mobile'), { surface: 'comments', section: 'mobile' }],
    ['Esc — сайд закрыт, раздел прежний', K => K.key('Escape'), { surface: '', section: 'mobile', writes: 0 }],
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
/** Ключ ожидания — поле слепка либо путь через точку (`g.behavior.refuse`): сравнивается значение по пути. */
const at = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const diffExpect = (exp, snap) => Object.keys(exp ?? {}).flatMap(k => diff(exp[k], k in snap ? snap[k] : at(snap, k), k))

const baselineFile = id => join(BASELINE, `${id.replace(/\//g, '--').replace(/\s+/g, '_')}.json`)
const NOTICED = []

async function run(id) {
  const [title, steps, opts = {}] = SCENARIOS[id]
  const kp = await openPage(opts.width, opts.height)
  const K = kit(kp)
  const fails = []
  const snaps = []
  try {
    await K.start(opts.query, opts.path)
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
