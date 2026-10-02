#!/usr/bin/env node
/**
 * Автопроверки `/compare` в headless Chrome — числа приёмки такта. Оснастка приёмки, не продукт. Такт 62.
 *
 * Зачем скрипт: в панели браузера приложения вкладка бывает скрыта — в скрытой вкладке `ResizeObserver` молчит и
 * раскладка экрана не подстраивается (ловушка такта 55 `CLAUDE.md`), счёт покрытия выходит другим. Здесь страница
 * открыта в headless Chrome 1440×900 и выведена вперёд: счёт сопоставим между тактами.
 *
 * Печатает: шрифты и иконки (счёт и провалы), разметку обоих экранов, покрытие по DOM — по состояниям.
 *
 * Запуск (dev-сервер на 3000 уже поднят):
 *   node scripts/compare-audit.mjs                 — всё
 *   node scripts/compare-audit.mjs --no-coverage   — без покрытия (секунды)
 *   node scripts/compare-audit.mjs --only=/scheme-edit — покрытие одного экрана
 *   node scripts/compare-audit.mjs --states        — покрытие с таблицей по состояниям
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
/* Автопроверки шрифтов и иконок считают после правила снимка — ждём их итог. */
for (let k = 0; k < 120; k++) {
  await sleep(500)
  if (await evaluate(`/Проверено текстовых узлов внутри компонентов: \\d+/.test(document.body?.innerText ?? '') && /Проверено иконок: \\d+/.test(document.body.innerText)`).catch(() => false)) break
}
await sleep(1500)
const head = await evaluate(`(() => { const t = ${T}; const text = document.body.innerText
  const ps = [...document.querySelectorAll('p')].map(p => t(p.textContent))
  return JSON.stringify({
    icons: Number(text.match(/Проверено иконок: (\\d+)/)?.[1]), iconsOk: ps.some(p => p.startsWith('Провалов нет: у каждой иконки')),
    fonts: Number(text.match(/Проверено текстовых узлов внутри компонентов: (\\d+)/)?.[1]), fontsOk: ps.some(p => p.startsWith('Провалов нет: у каждой текстовой роли')),
    markup: [...document.querySelectorAll('[data-markup-audit]')].map(a => ({ screen: a.dataset.screen, total: t(a.querySelector('[data-markup-total]').textContent), control: t(a.querySelector('[data-markup-control]').textContent) })),
  }) })()`)
const H = JSON.parse(head)
console.log(`иконки: ${H.icons}, ${H.iconsOk ? 'провалов нет' : 'ЕСТЬ ПРОВАЛЫ'}`)
console.log(`текстовые узлы: ${H.fonts}, ${H.fontsOk ? 'провалов нет' : 'ЕСТЬ ПРОВАЛЫ'}`)
for (const m of H.markup) console.log(`разметка /${m.screen}: ${m.total} ${m.control}`)
let bad = !H.iconsOk || !H.fontsOk || H.markup.some(m => !/Нарушений: 0\./.test(m.total) || !/не слепая/.test(m.control))

if (!args.includes('--no-coverage')) {
  const paths = JSON.parse(await evaluate(`JSON.stringify([...document.querySelectorAll('[data-coverage-audit]')].map(a => a.dataset.path))`)).filter(p => !only || p === only)
  for (const path of paths) {
    const root = `document.querySelector('[data-coverage-audit][data-path="${path}"]')`
    await send('Page.bringToFront')
    await evaluate(`(${root}.querySelector('[data-coverage-run]').click(), 1)`)
    for (let k = 0; k < 900; k++) {
      await sleep(1000)
      if (await evaluate(`!${root}.querySelector('[data-coverage-run]').disabled`)) break
    }
    const r = JSON.parse(await evaluate(`(() => { const t = ${T}; const a = ${root}
      return JSON.stringify({ total: t(a.querySelector('[data-coverage-total]')?.textContent), rows: [...a.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => t(c.textContent))),
        offenders: [...a.querySelectorAll('ul li')].map(li => t(li.textContent)) }) })()`))
    console.log(`покрытие ${path}: ${r.total}`)
    if (args.includes('--states')) for (const row of r.rows) console.log(`   ${row[0]}: ${row[1]} / ${row[2]}`)
    for (const o of r.offenders) console.log(`   ✗ ${o}`)
    if (!/Непомеченных: 0\./.test(r.total)) bad = true
  }
}
if (errors.length) { console.log(`консоль /compare — ${errors.length}:`); for (const e of [...new Set(errors)].slice(0, 10)) console.log(`   ${e}`) }
ws.close()
await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`)
process.exit(bad ? 1 : 0)
