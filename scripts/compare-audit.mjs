#!/usr/bin/env node
/**
 * Автопроверки `/compare` в headless Chrome — числа приёмки такта. Оснастка приёмки, не продукт. Такт 62.
 *
 * Зачем скрипт: в панели браузера приложения вкладка бывает скрыта — в скрытой вкладке `ResizeObserver` молчит и
 * раскладка экрана не подстраивается (ловушка такта 55 `CLAUDE.md`), счёт покрытия выходит другим. Здесь страница
 * открыта в headless Chrome 1440×900 и выведена вперёд: счёт сопоставим между тактами.
 *
 * Печатает: шрифты и иконки (счёт и провалы), разметку трёх экранов (`/free-shoot`, `/scheme-edit`, с такта 77 —
 * `/tariffs`), покрытие по DOM — по состояниям. С такта 92 у страницы схемы два прохода покрытия: окно 1440 × 900 и узкий экран
 * 375 × 812 (`@375x812` в строке итога).
 *
 * Запуск (dev-сервер на 3000 уже поднят):
 *   node scripts/compare-audit.mjs                 — всё
 *   node scripts/compare-audit.mjs --no-coverage   — без покрытия (секунды)
 *   node scripts/compare-audit.mjs --only=/scheme-edit — покрытие одного экрана
 *   node scripts/compare-audit.mjs --states        — покрытие с таблицей по состояниям
 *   node scripts/compare-audit.mjs --only=/scheme-edit --viewport=375x812 — покрытие узкого экрана страницы схемы (такт 92)
 *
 * Счёт шрифтов и иконок берётся, когда два замера подряд дали одно и то же ненулевое число (такт 67): ноль до обхода
 * итогом не считается; не устоялся за 120 с — выход с кодом 2 и строкой «СЧЁТ НЕ УСТОЯЛСЯ».
 *
 * Chrome ищется на CDP-порту `CDP_PORT` (по умолчанию 9335); если его нет — запускается headless.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ = process.env.COMPARE_URL ?? 'http://localhost:3000/compare/'
const PORT = Number(process.env.CDP_PORT ?? 9335)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const args = process.argv.slice(2)
const only = args.find(a => a.startsWith('--only='))?.slice(7)
/* Такт 92: `--viewport=375x812` — только проходы покрытия в этом окне. */
const viewportOnly = args.find(a => a.startsWith('--viewport='))?.slice(11)

async function ensureChrome() {
  try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); return } catch {}
  const bin = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(b => existsSync(b))
  if (!bin) throw new Error('Chrome не найден: задайте CHROME или поднимите его с --remote-debugging-port')
  spawn(bin, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cmp-audit-'))}`, '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'],
  { detached: true, stdio: 'ignore' }).unref()
  for (let k = 0; k < 60; k++) { await sleep(250); try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); return } catch {} }
  throw new Error(`Chrome не поднялся на порту ${PORT}`)
}

await ensureChrome()
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => { ws.onopen = r })
let id = 0
const pend = new Map()
const errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text)
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) errors.push(`${m.params.type}: ${m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`)
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? JSON.stringify(r.result.exceptionDetails))
  return r.result?.result?.value
}
await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: URL_ })
await send('Page.bringToFront')

const T = `(s => (s ?? '').replace(/\\s+/g, ' ').trim())`
/*
 * Автопроверки шрифтов и иконок считают после правила снимка — ждём их итог. До обхода счётчики стоят на нуле: ожидание
 * текста «Проверено иконок: N» принимало этот ноль, и холодный старт печатал «иконки: 0» (такт 67, решение оркестратора
 * 2026-10-03). Ноль итогом не считается: ждём двух одинаковых ненулевых счётов подряд с интервалом 1 с; потолок — 120 с,
 * по нему — ошибка, а не печать нуля.
 */
const COUNTS = `JSON.stringify([Number(document.querySelector('[data-icon-audit-count]')?.textContent), Number(document.querySelector('[data-font-audit-count]')?.textContent)])`
let prev = null
let counts = null
for (const t0 = Date.now(); Date.now() - t0 < 120_000;) {
  await sleep(1000)
  const c = await evaluate(COUNTS).catch(() => null)
  if (c && JSON.parse(c).every(n => n > 0) && c === prev) { counts = JSON.parse(c); break }
  prev = c
}
if (!counts) {
  console.log(`СЧЁТ НЕ УСТОЯЛСЯ за 120 с: иконки и текстовые узлы — ${prev}`)
  ws.close()
  await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`)
  process.exit(2)
}
const head = await evaluate(`(() => { const t = ${T}; const text = document.body.innerText
  const ps = [...document.querySelectorAll('p')].map(p => t(p.textContent))
  return JSON.stringify({
    icons: Number(text.match(/Проверено иконок: (\\d+)/)?.[1]), iconsOk: ps.some(p => p.startsWith('Провалов нет: у каждой иконки')),
    fonts: Number(text.match(/Проверено текстовых узлов внутри компонентов: (\\d+)/)?.[1]), fontsOk: ps.some(p => p.startsWith('Провалов нет: у каждой текстовой роли')),
    markup: [...document.querySelectorAll('[data-markup-audit]')].map(a => ({ screen: a.dataset.screen, total: t(a.querySelector('[data-markup-total]').textContent), control: t(a.querySelector('[data-markup-control]').textContent) })),
  }) })()`)
const H = JSON.parse(head)
/* Напечатанный счёт обязан совпасть с устоявшимся счётом страницы. */
const drift = H.icons !== counts[0] || H.fonts !== counts[1]
if (drift) console.log(`СЧЁТ ИЗМЕНИЛСЯ после ожидания: ${counts} → ${[H.icons, H.fonts]}`)
console.log(`иконки: ${H.icons}, ${H.iconsOk ? 'провалов нет' : 'ЕСТЬ ПРОВАЛЫ'}`)
console.log(`текстовые узлы: ${H.fonts}, ${H.fontsOk ? 'провалов нет' : 'ЕСТЬ ПРОВАЛЫ'}`)
for (const m of H.markup) console.log(`разметка /${m.screen}: ${m.total} ${m.control}`)
let bad = drift || !H.iconsOk || !H.fontsOk || H.markup.some(m => !/Нарушений: 0\./.test(m.total) || !/не слепая/.test(m.control))

if (!args.includes('--no-coverage')) {
  /* Проходы покрытия — по порядку на странице: путь и окно (такт 92 — второй проход страницы схемы в окне 375 × 812). */
  const audits = JSON.parse(await evaluate(`JSON.stringify([...document.querySelectorAll('[data-coverage-audit]')].map((a, k) => ({ k, path: a.dataset.path, viewport: a.dataset.viewport })))`)).filter(a => (!only || a.path === only) && (!viewportOnly || a.viewport === viewportOnly))
  for (const { k, path, viewport } of audits) {
    const root = `document.querySelectorAll('[data-coverage-audit]')[${k}]`
    await send('Page.bringToFront')
    await evaluate(`(${root}.querySelector('[data-coverage-run]').click(), 1)`)
    for (let k = 0; k < 900; k++) {
      await sleep(1000)
      if (await evaluate(`!${root}.querySelector('[data-coverage-run]').disabled`)) break
    }
    const r = JSON.parse(await evaluate(`(() => { const t = ${T}; const a = ${root}
      return JSON.stringify({ total: t(a.querySelector('[data-coverage-total]')?.textContent), rows: [...a.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => t(c.textContent))),
        offenders: [...a.querySelectorAll('ul li')].map(li => t(li.textContent)) }) })()`))
    console.log(`покрытие ${path}${viewport && viewport !== '1440x900' ? ` @${viewport}` : ''}: ${r.total}`)
    if (args.includes('--states')) for (const row of r.rows) console.log(`   ${row[0]}: ${row[1]} / ${row[2]}`)
    for (const o of r.offenders) console.log(`   ✗ ${o}`)
    if (!/Непомеченных: 0\./.test(r.total)) bad = true
  }
}
if (errors.length) { console.log(`консоль /compare — ${errors.length}:`); for (const e of [...new Set(errors)].slice(0, 10)) console.log(`   ${e}`) }
ws.close()
await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`)
process.exit(bad ? 1 : 0)
