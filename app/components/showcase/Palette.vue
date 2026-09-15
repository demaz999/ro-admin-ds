<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { collectThemeDeclarations } from '~/composables/useDesignTokens'
import {
  listedTokenNames,
  paletteGroups,
  paletteStates,
  type PaletteGroup,
  type PaletteRamp,
  type PaletteState,
  type PaletteToken,
} from './palette-groups'

/**
 * Палитра по ролям. Единица — строка таблицы, карточек нет (решение владельца,
 * 2026-09-15). Таблицы собраны из компонентов кита; контейнер без скругления и рамки,
 * между строками — волосяная нейтральная линия: это документ, а не страница-таблица.
 *
 * Значение каждого свотча читается в ТЕКУЩЕЙ теме: пробный узел лежит внутри витрины и
 * наследует её `data-theme`, а не корня документа.
 */
const props = defineProps<{
  /** Текущая тема витрины — только как сигнал перечитать значения. */
  theme: string
}>()

interface Reading {
  hex: string
  /** Значение объявлено самой темой, а не унаследовано от rososmotr. */
  own: boolean
}

const root = ref<HTMLElement>()
const probe = ref<HTMLElement>()
const readings = ref<Record<string, Reading | null>>({})
const shadowHex = ref<Record<string, string>>({})
const unlisted = ref<PaletteToken[]>([])

function toHex(value: string): { hex: string, alpha: number } | null {
  const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/)
  const rgb = value.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/)
  let c: number[]
  if (srgb) c = [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])]
  else if (rgb) c = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])]
  else return null
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return { hex: `#${h(c[0]!)}${h(c[1]!)}${h(c[2]!)}${c[3]! < 1 ? h(c[3]! * 255) : ''}`, alpha: c[3]! }
}

function read(name: string, declarations: Map<string, Record<string, string>>): Reading | null {
  const el = probe.value
  if (!el) return null
  el.style.backgroundColor = ''
  el.style.backgroundColor = `var(${name})`
  const parsed = toHex(getComputedStyle(el).backgroundColor)
  // Незаданная переменная даёт прозрачный фон. Полностью прозрачных цветов в теме нет.
  if (!parsed || parsed.alpha === 0) return null
  return {
    hex: parsed.hex,
    own: props.theme === 'rososmotr' || `[data-theme="${props.theme}"]` in (declarations.get(name) ?? {}),
  }
}

function measure() {
  const declarations = collectThemeDeclarations()
  const listed = listedTokenNames()
  const next: Record<string, Reading | null> = {}
  for (const name of listed) next[name] = read(name, declarations)

  // Всё цветовое, что объявлено в теме, но ни в одну группу не попало. Зеркала
  // Tailwind (`--color-*`) и его служебные `--tw-*` — не токены темы.
  const extra: PaletteToken[] = []
  for (const name of declarations.keys()) {
    if (listed.has(name) || name.startsWith('--color-') || name.startsWith('--tw-')) continue
    const reading = read(name, declarations)
    if (!reading) continue
    next[name] = reading
    extra.push({ name, role: 'Не разложено', where: 'роль не записана' })
  }
  readings.value = next
  unlisted.value = extra.sort((a, b) => a.name.localeCompare(b.name))

  const shadows: Record<string, string> = {}
  root.value?.querySelectorAll<HTMLElement>('[data-shadow]').forEach((el) => {
    // Последний слой — сама тень; до него Tailwind ставит пустые кольца.
    const layers = getComputedStyle(el).boxShadow.split(/,(?![^(]*\))/)
    shadows[el.dataset.shadow!] = toHex(layers[layers.length - 1] ?? '')?.hex ?? ''
  })
  shadowHex.value = shadows
}

onMounted(async () => {
  await nextTick()
  measure()
})

watch(() => props.theme, measure, { flush: 'post' })

const groups = computed<PaletteGroup[]>(() => unlisted.value.length
  ? [...paletteGroups, { id: 'unlisted', title: 'Не разложено', note: 'Цветовые токены темы, которых нет ни в одной группе.', tokens: unlisted.value }]
  : paletteGroups)

/** Оси матрицы — только те состояния, что в группе есть на самом деле. */
function axesOf(group: PaletteGroup) {
  return paletteStates.filter(s => group.ramps?.some(r => r.steps[s.key]))
}

/** Ширина полосы: клетки 64 впритык. Классы статичны — собранную строку Tailwind не увидит. */
const stripWidth: Record<number, string> = { 1: 'w-16 grid-cols-1', 2: 'w-32 grid-cols-2', 3: 'w-48 grid-cols-3', 4: 'w-64 grid-cols-4', 5: 'w-80 grid-cols-5' }

/**
 * Клетка полосы. Соседние клетки без зазора; внешний край отрезка скруглён и обведён
 * полупрозрачной нейтральной линией, как одиночный свотч; между соседями — 1px
 * нейтральной рамки, чтобы белое отличалось от белого. Пустое состояние разрывает
 * отрезок и не рисует ничего.
 */
function stripCell(r: PaletteRamp, axes: { key: PaletteState }[], i: number) {
  const has = (j: number) => j >= 0 && j < axes.length && !!r.steps[axes[j]!.key]
  if (!has(i)) return ''
  return [
    'border-y border-y-stroke-neutral/50',
    has(i - 1) ? 'border-l border-l-stroke-neutral' : 'rounded-l-md border-l border-l-stroke-neutral/50',
    has(i + 1) ? '' : 'rounded-r-md border-r border-r-stroke-neutral/50',
  ].join(' ')
}

/** Под клеткой — хвост токена: база стоит в колонке «Роль», целиком токен в 64 не помещается. */
function suffix(r: PaletteRamp, name: string) {
  const base = r.steps.base
  return base && name !== base && name.startsWith(base) ? name.slice(base.length) : ''
}
</script>

<template>
  <div ref="root" class="space-y-12">
    <span ref="probe" aria-hidden="true" class="hidden" />

    <section v-for="group in groups" :key="group.id" :data-palette-group="group.id">
      <header>
        <h3 class="text-lg font-medium text-foreground">
          {{ group.title }}
        </h3>
        <p class="text-sm text-foreground-secondary">
          {{ group.note }}
        </p>
      </header>

      <!-- Матрица состояний -->
      <Table v-if="group.ramps" class="mt-4 rounded-none border-0 bg-transparent">
        <TableRow class="border-stroke-neutral bg-transparent">
          <TableHead class="w-60 px-4">
            Роль
          </TableHead>
          <TableHead class="px-4">
            <span class="grid" :class="stripWidth[axesOf(group).length]">
              <span v-for="a in axesOf(group)" :key="a.key">{{ a.label }}</span>
            </span>
          </TableHead>
          <TableHead class="min-w-0 flex-1 px-4">
            Где применяется
          </TableHead>
        </TableRow>

        <TableRow v-for="r in group.ramps" :key="r.role" data-palette-row="ramp" class="border-stroke-neutral bg-transparent">
          <TableCell variant="slot" class="h-auto w-60 items-start px-4 py-4">
            <span class="flex min-w-0 flex-col">
              <span class="text-sm font-medium text-foreground">{{ r.role }}</span>
              <span class="truncate font-mono text-xs text-muted-foreground">{{ r.steps.base }}</span>
            </span>
          </TableCell>

          <TableCell variant="slot" class="h-auto items-start px-4 py-4">
            <div class="grid" :class="stripWidth[axesOf(group).length]">
              <div v-for="(a, i) in axesOf(group)" :key="a.key" class="min-w-0">
                <span
                  v-if="r.steps[a.key]"
                  data-palette-strip-cell
                  class="block h-10"
                  :class="stripCell(r, axesOf(group), i)"
                  :style="{ background: `var(${r.steps[a.key]})` }"
                />
                <span v-else class="block h-10" />
                <span v-if="r.steps[a.key]" class="mt-1 block font-mono text-xs">
                  <span class="block h-4 whitespace-nowrap text-foreground">{{ suffix(r, r.steps[a.key]!) }}</span>
                  <span class="block text-muted-foreground">{{ readings[r.steps[a.key]!]?.hex ?? 'нет' }}</span>
                  <span v-if="readings[r.steps[a.key]!] && !readings[r.steps[a.key]!]!.own" data-inherited class="block text-muted-foreground">из rososmotr</span>
                </span>
              </div>
            </div>
          </TableCell>

          <TableCell variant="slot" class="h-auto min-w-0 flex-1 shrink items-start px-4 py-4 [contain:inline-size]">
            <TableCellText :copy="false" class="text-xs text-foreground-secondary">
              {{ r.where }}
            </TableCellText>
          </TableCell>
        </TableRow>
      </Table>

      <!-- Таблица ролей: одиночные токены и тени -->
      <Table v-if="group.tokens || group.shadows" class="mt-4 rounded-none border-0 bg-transparent">
        <TableRow class="border-stroke-neutral bg-transparent">
          <TableHead class="w-60 px-4">
            Роль
          </TableHead>
          <TableHead class="w-24 px-4">
            Свотч
          </TableHead>
          <TableHead class="w-50 px-4">
            Токен
          </TableHead>
          <TableHead class="w-24 px-4">
            Hex
          </TableHead>
          <TableHead class="min-w-0 flex-1 px-4">
            Где применяется
          </TableHead>
        </TableRow>

        <TableRow v-for="t in group.tokens" :key="t.name" data-palette-row="token" class="border-stroke-neutral bg-transparent">
          <TableCell variant="slot" class="w-60 px-4">
            <span class="flex min-w-0 flex-col">
              <span class="truncate text-sm font-medium text-foreground">{{ t.role }}</span>
              <span v-if="t.note" class="truncate text-xs text-foreground-secondary">{{ t.note }}</span>
            </span>
          </TableCell>
          <TableCell variant="slot" class="w-24 px-4">
            <ShowcasePaletteSwatch :name="t.name" />
          </TableCell>
          <TableCell variant="slot" class="w-50 px-4">
            <span class="flex min-w-0 flex-col">
              <TableCellText class="font-mono text-xs text-foreground">{{ t.name }}</TableCellText>
              <span v-if="readings[t.name] && !readings[t.name]!.own" data-inherited class="font-mono text-xs text-muted-foreground">из rososmotr</span>
            </span>
          </TableCell>
          <TableCell variant="slot" class="w-24 px-4">
            <span v-if="readings[t.name]" class="font-mono text-xs whitespace-nowrap text-muted-foreground">{{ readings[t.name]!.hex }}</span>
            <span v-else class="text-xs text-destructive">нет в теме</span>
          </TableCell>
          <TableCell variant="slot" class="min-w-0 flex-1 shrink px-4 [contain:inline-size]">
            <TableCellText :copy="false" class="text-xs text-foreground-secondary">
              {{ t.where }}
            </TableCellText>
          </TableCell>
        </TableRow>

        <TableRow v-for="s in group.shadows" :key="s.name" data-palette-row="shadow" class="border-stroke-neutral bg-transparent">
          <TableCell variant="slot" class="w-60 px-4">
            <span class="truncate text-sm font-medium text-foreground">{{ s.role }}</span>
          </TableCell>
          <TableCell variant="slot" class="w-24 px-4">
            <ShowcasePaletteSwatch :name="s.name" :shadow="s.utility" :tone="s.tone" />
          </TableCell>
          <TableCell variant="slot" class="w-50 px-4">
            <TableCellText class="font-mono text-xs text-foreground">
              {{ s.name }}
            </TableCellText>
          </TableCell>
          <TableCell variant="slot" class="w-24 px-4">
            <span class="font-mono text-xs whitespace-nowrap text-muted-foreground">{{ shadowHex[s.name] }}</span>
          </TableCell>
          <TableCell variant="slot" class="min-w-0 flex-1 shrink px-4 [contain:inline-size]">
            <TableCellText :copy="false" class="text-xs text-foreground-secondary">
              {{ s.where }}
            </TableCellText>
          </TableCell>
        </TableRow>
      </Table>
    </section>
  </div>
</template>
