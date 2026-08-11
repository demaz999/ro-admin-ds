/**
 * Конвертация шрифта кита в woff2.
 *
 * Дизайнеры отдают PT Root UI в otf — в вебе нужен woff2 (вдвое-втрое легче).
 * Скрипт нужен редко, только когда приходит обновление шрифта.
 *
 *   node scripts/convert-fonts.mjs <папка-с-otf>
 *
 * Результат кладётся в public/fonts. Исходные otf в репозиторий не коммитим.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import wawoff from 'wawoff2'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = process.argv[2]

if (!src) {
  console.error('Укажите папку с otf: node scripts/convert-fonts.mjs <папка>')
  process.exit(1)
}

const out = join(root, 'public', 'fonts')

/** Начертания, которые использует кит 1. light добавлен про запас — см. tailwind.css. */
const faces = [
  ['pt-root-ui_light.otf', 300],
  ['pt-root-ui_regular.otf', 400],
  ['pt-root-ui_medium.otf', 500],
  ['pt-root-ui_bold.otf', 700],
]

await mkdir(out, { recursive: true })

for (const [file, weight] of faces) {
  const target = file.replace(/\.otf$/, '.woff2')
  const input = await readFile(join(src, file))
  const compressed = await wawoff.compress(input)
  await writeFile(join(out, target), compressed)

  const saved = ((1 - compressed.length / input.length) * 100).toFixed(0)
  console.log(`${weight}\t${target}\t${(input.length / 1024).toFixed(0)}K -> ${(compressed.length / 1024).toFixed(0)}K (-${saved}%)`)
}
