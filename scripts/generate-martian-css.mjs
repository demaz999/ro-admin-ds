/**
 * Раскладывает поставку Martian Grotesk по проекту и генерирует @font-face.
 *
 *   node scripts/generate-martian-css.mjs <папка-webfonts>
 *
 * Гарнитура даёт 9 весов × 7 ширин = 63 файла. Регистрируем их ОДНИМ семейством
 * через дескрипторы font-weight и font-stretch — тогда в CSS работают ключевые
 * слова (`font-stretch: condensed`), а браузер грузит только то начертание,
 * которое реально применилось.
 *
 * Раскладка весов взята из Changelog поставки: «Add Ultra masters (Black and
 * Ultra Black font styles)» — то есть Ult это Ultra Black, самый жирный, а НЕ
 * UltraLight. Перепутать легко, ошибка тихая.
 *
 * Там же: «weight coordinates now correspond to the 100—1000 range, width
 * coordinates to the 75—200%. New coordinates comply with the font-width and
 * font-stretch property specifications».
 */
import { readdir, mkdir, copyFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2]

if (!src) {
  console.error('Укажите папку webfonts: node scripts/generate-martian-css.mjs <папка>')
  process.exit(1)
}

const outDir = join(root, 'public', 'fonts', 'martian-grotesk')
const cssPath = join(root, 'app', 'assets', 'css', 'martian-grotesk.css')

/** Суффикс имени файла → числовой вес. 600 в гарнитуре отсутствует. */
const WEIGHTS = {
  Th: 100,
  xLt: 200,
  Lt: 300,
  Rg: 400,
  Md: 500,
  Bd: 700,
  xBd: 800,
  Bl: 900,
  Ult: 1000,
}

/** Префикс ширины → процент по спецификации font-stretch. */
const WIDTHS = {
  Cn: 75, // condensed
  Nr: 87.5, // semi-condensed
  Std: 100, // normal
  sWd: 112.5, // semi-expanded
  Wd: 125, // expanded
  xWd: 150, // extra-expanded
  uWd: 200, // ultra-expanded
}

// Длинные префиксы первыми: Wd — хвост у sWd, uWd и xWd.
const widthKeys = Object.keys(WIDTHS).sort((a, b) => b.length - a.length)

const files = (await readdir(src)).filter(f => f.endsWith('.woff2'))
await mkdir(outDir, { recursive: true })

const faces = []
const skipped = []

for (const file of files) {
  const stem = file.replace(/^MartianGrotesk-/, '').replace(/\.woff2$/, '')
  const width = widthKeys.find(w => stem.startsWith(w))
  const weight = width ? WEIGHTS[stem.slice(width.length)] : undefined

  if (!width || !weight) {
    skipped.push(file)
    continue
  }

  await copyFile(join(src, file), join(outDir, file))
  faces.push({ file, weight, stretch: WIDTHS[width], width, name: stem.slice(width.length) })
}

faces.sort((a, b) => a.stretch - b.stretch || a.weight - b.weight)

const css = `/* Сгенерировано scripts/generate-martian-css.mjs — руками не править.

   Martian Grotesk — ДОПОЛНИТЕЛЬНАЯ гарнитура. Шрифт кита 1 — PT Root UI,
   и компоненты кита используют только его. Martian Grotesk берётся точечно и
   только по явному указанию: см. docs/tokens.md, раздел 10.

   ${faces.length} начертаний: 9 весов × 7 ширин. Одно семейство с дескрипторами
   font-weight и font-stretch — браузер грузит только применённое начертание. */

${faces.map(f => `@font-face {
    font-family: 'Martian Grotesk';
    src: url('/fonts/martian-grotesk/${f.file}') format('woff2');
    font-weight: ${f.weight};
    font-stretch: ${f.stretch}%;
    font-style: normal;
    font-display: swap;
}`).join('\n\n')}
`

await writeFile(cssPath, css)

const byWidth = {}
for (const f of faces) byWidth[f.width] = (byWidth[f.width] || 0) + 1

console.log(`начертаний: ${faces.length}`)
console.log(`по ширинам: ${Object.entries(byWidth).map(([w, n]) => `${w}=${n}`).join(' ')}`)
if (skipped.length) console.log(`не разобрано: ${skipped.join(', ')}`)
console.log(`css: ${cssPath}`)
