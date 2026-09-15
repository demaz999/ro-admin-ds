<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { collectThemeDeclarations } from '~/composables/useDesignTokens'
import { listedTokenNames, paletteGroups, paletteStates, type PaletteToken } from './palette-groups'

/**
 * Палитра по ролям. Значение каждого свотча читается в ТЕКУЩЕЙ теме: пробный узел лежит
 * внутри витрины и наследует её `data-theme`, а не корня документа. Иначе переключатель
 * менял бы свотчи (они залиты через var()), но подписи hex оставались бы от rososmotr.
 */
const props = defineProps<{
  /** Текущая тема витрины — только как сигнал перечитать значения. */
  theme: string
}>()

interface Reading {
  hex: string
  alpha: number
  /** Относительная яркость после наложения на белый — выбирает подложку свотча. */
  luminance: number
  /** Значение объявлено самой темой, а не унаследовано от rososmotr. */
  own: boolean
}

const root = ref<HTMLElement>()
const probe = ref<HTMLElement>()
const readings = ref<Record<string, Reading | null>>({})
const shadows = ref<Record<string, string>>({})
const unlisted = ref<PaletteToken[]>([])

function parseColor(value: string): [number, number, number, number] | null {
  const srgb = value.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/)
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])]
  const rgb = value.match(/^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)$/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])]
  return null
}

function luminanceOver(r: number, g: number, b: number, a: number) {
  const channel = (c: number) => {
    const v = (a * c + (1 - a) * 255) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function read(name: string, declarations: Map<string, Record<string, string>>): Reading | null {
  const el = probe.value
  if (!el) return null
  el.style.backgroundColor = ''
  el.style.backgroundColor = `var(${name})`
  const parsed = parseColor(getComputedStyle(el).backgroundColor)
  // Незаданная переменная даёт прозрачный фон. Полностью прозрачных цветов в теме нет.
  if (!parsed || parsed[3] === 0) return null
  const [r, g, b, a] = parsed
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  const declared = declarations.get(name) ?? {}
  return {
    hex: `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a * 255) : ''}`,
    alpha: a,
    luminance: luminanceOver(r, g, b, a),
    own: props.theme === 'rososmotr' || `[data-theme="${props.theme}"]` in declared,
  }
}

function measure() {
  const declarations = collectThemeDeclarations()
  const next: Record<string, Reading | null> = {}
  const listed = listedTokenNames()

  for (const name of listed) next[name] = read(name, declarations)

  // Всё цветовое, что объявлено в теме, но ни в одну группу не попало. Зеркала
  // Tailwind (`--color-*`) и его служебные `--tw-*` — не токены темы.
  const extra: PaletteToken[] = []
  for (const name of declarations.keys()) {
    if (listed.has(name) || name.startsWith('--color-') || name.startsWith('--tw-')) continue
    const reading = read(name, declarations)
    if (!reading) continue
    next[name] = reading
    extra.push({ name, role: 'роль не записана — разложить в palette-groups.ts по naming.md' })
  }

  readings.value = next
  unlisted.value = extra.sort((a, b) => a.name.localeCompare(b.name))

  const shadowValues: Record<string, string> = {}
  root.value?.querySelectorAll<HTMLElement>('[data-shadow]').forEach((el) => {
    // Последний слой — сама тень; до него Tailwind ставит пустые кольца.
    const layers = getComputedStyle(el).boxShadow.split(/,(?![^(]*\))/)
    shadowValues[el.dataset.shadow!] = layers[layers.length - 1]!.trim()
  })
  shadows.value = shadowValues
}

onMounted(async () => {
  await nextTick()
  measure()
})

watch(() => props.theme, measure, { flush: 'post' })

const groups = computed(() => unlisted.value.length
  ? [...paletteGroups, { id: 'unlisted', title: 'Не разложено', note: 'Цветовые токены темы, которых нет ни в одной группе. Появились здесь сами — значит, в palette-groups.ts их пора разложить.', tokens: unlisted.value }]
  : paletteGroups)

/** Тёмный цвет — на светлой подложке, светлый — на тёмной, полупрозрачный — на обеих. */
function plate(reading: Reading | null | undefined) {
  if (!reading) return 'none'
  if (reading.alpha < 1) return 'split'
  return reading.luminance > 0.7 ? 'dark' : 'light'
}
</script>

<template>
  <div ref="root" class="space-y-10">
    <span ref="probe" aria-hidden="true" class="hidden" />

    <div v-for="group in groups" :key="group.id" class="space-y-4">
      <header class="space-y-1">
        <h3 class="text-sm font-bold">
          {{ group.title }}
        </h3>
        <p class="max-w-3xl text-sm text-muted-foreground">
          {{ group.note }}
        </p>
      </header>

      <div v-if="group.ramps" class="overflow-x-auto">
        <table class="w-full min-w-3xl table-fixed border-collapse text-left">
          <thead>
            <tr class="text-xs text-muted-foreground">
              <th class="w-40 py-2 pr-3 font-normal" />
              <th v-for="s in paletteStates" :key="s.key" class="py-2 pr-3 font-mono font-normal">
                {{ s.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in group.ramps" :key="r.label" class="border-t border-border align-top">
              <th class="py-3 pr-3 font-normal">
                <code class="block text-xs font-bold">{{ r.label }}</code>
                <span class="block text-xs text-muted-foreground">{{ r.note }}</span>
              </th>
              <td v-for="s in paletteStates" :key="s.key" class="py-3 pr-3">
                <template v-if="r.steps[s.key]">
                  <ShowcasePaletteSwatch
                    :token="r.steps[s.key]!"
                    :reading="readings[r.steps[s.key]!.name]"
                    :plate="plate(readings[r.steps[s.key]!.name])"
                    :theme="theme"
                    stacked
                  />
                </template>
                <span v-else class="flex size-12 items-center justify-center rounded-md border border-dashed border-border text-2xs text-muted-foreground">
                  —
                </span>
                <span v-if="!r.steps[s.key]" class="mt-2 block text-xs text-muted-foreground">{{ r.gap }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul v-if="group.tokens" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="token in group.tokens" :key="token.name" class="rounded-md border border-border p-3">
          <ShowcasePaletteSwatch
            :token="token"
            :reading="readings[token.name]"
            :plate="plate(readings[token.name])"
            :theme="theme"
          />
        </li>
      </ul>

      <ul v-if="group.shadows" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="s in group.shadows" :key="s.name" class="flex gap-3 rounded-md border border-border p-3">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-md bg-background">
            <span
              :data-shadow="s.name"
              class="block"
              :class="[s.utility, s.tone ?? 'size-8 rounded-md bg-background']"
            />
          </span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <code class="truncate text-xs font-medium">{{ s.name }}</code>
            <span class="font-mono text-xs break-words text-muted-foreground">{{ shadows[s.name] }}</span>
            <span class="text-xs">{{ s.role }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
