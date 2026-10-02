<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import PlayerButton from './PlayerButton.vue'

/**
 * Аудиоплеер — мастер `PlayerAudio` `6921:57397`, спека `6921:57170`.
 *
 * Плашка 60 высотой, радиус 16, заливка — **мягкая ступень**: десятая её
 * встреча в мастерах Атома. Паддинги 20/24, зазор 24.
 *
 * ## Ось называет глиф, а не состояние
 *
 * `State=play` — это состояние, где показана кнопка «играть», то есть звук
 * **остановлен**. `State=pause` — где показана пауза, то есть звук **играет**.
 * Тот же класс ловушки, что `Collapsed` у аккордеона: ось названа по картинке,
 * а не по смыслу. В коде проп зовётся `playing`.
 *
 * ## Состав меняется вместе с состоянием
 *
 * | состояние | что внутри |
 * |---|---|
 * | остановлен | подпись и длительность |
 * | играет | **плюс дорожка перемотки** 160 шириной |
 *
 * То есть дорожка появляется только во время воспроизведения — это состав
 * мастера, а не наше упрощение.
 *
 * ## `variant="wave"` — голосовое, как в мессенджере (такт 58, решение владельца 2026-10-02)
 *
 * Наше расширение матрицы: у мастера волны нет. Строка без подложки: кнопка воспроизведение / пауза 28, волновая
 * дорожка, время «прошло / всего». По мере воспроизведения заливка `--primary` идёт по дорожке; клик по дорожке
 * перематывает, стрелки ← → двигают на 5 %. Столбик — 2 в ширину, зазор 2, высота 2–24 шагом 2 — целые пиксели.
 *
 * Волна — из данных (`peaks`, доли 0–1); без них — детерминированно из `seed`: одна и та же при каждой загрузке.
 * Плеер ведёт время сам по таймеру длительности: звука у компонента нет, источник звука подключает потребитель
 * по событиям `toggle` и `seek`. В конце дорожки воспроизведение останавливается и возвращается в начало.
 */
const props = withDefaults(defineProps<{
  /** `card` — плашка мастера; `wave` — голосовое с волновой дорожкой (такт 58). */
  variant?: 'card' | 'wave'
  /** Играет ли звук. Ось `State` мастера, переименована по смыслу. У `wave` — начальное состояние. */
  playing?: boolean
  /** `card`: длительность или текущее время строкой. */
  time?: string
  /** `wave`: длительность в секундах. */
  duration?: number
  /** `wave`: высоты столбиков волны, доли 0–1. */
  peaks?: number[]
  /** `wave`: зерно волны, когда `peaks` нет, — id записи. */
  seed?: string | number
  class?: string
}>(), {
  variant: 'card',
  playing: false,
  time: '6:48',
  duration: 0,
  peaks: undefined,
  seed: 0,
})

/**
 * `toggle` — нажатие кнопки плеера (такт 43); у `wave` — с новым состоянием. `seek` — перемотка, секунды (такт 58).
 */
const emit = defineEmits<{ toggle: [playing?: boolean]; seek: [seconds: number] }>()

/* ------------------------------ wave ------------------------------ */
const BARS = 48
/** Волна из зерна: линейный конгруэнтный генератор и сглаживание соседями — одна и та же при каждой загрузке. */
function seeded(seed: string | number) {
  let x = 0
  for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0
  x = (x ^ 0x9E3779B9) >>> 0
  const raw = Array.from({ length: BARS }, () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 0xFFFFFFFF })
  return raw.map((v, k) => 0.2 + 0.8 * ((raw[k - 1] ?? v) + 2 * v + (raw[k + 1] ?? v)) / 4)
}
/** Высота столбика в шагах по 2: от 1 до 12 — 2–24. */
const bars = computed(() => {
  const src = props.peaks?.length ? Array.from({ length: BARS }, (_, k) => props.peaks![Math.floor(k * props.peaks!.length / BARS)] ?? 0) : seeded(props.seed)
  return src.map(v => Math.max(1, Math.min(12, Math.round(v * 12))))
})

const on = ref(props.playing)
const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
let mark = 0
function stop() { clearInterval(timer); timer = undefined }
function tick() {
  const now = Date.now()
  elapsed.value = Math.min(props.duration, elapsed.value + (now - mark) / 1000)
  mark = now
  if (elapsed.value >= props.duration) { stop(); on.value = false; elapsed.value = 0; emit('toggle', false) }
}
function start() {
  if (!props.duration) return
  mark = Date.now()
  stop()
  /* Не `requestAnimationFrame`: в неотрисовываемой вкладке он стоит. */
  timer = setInterval(tick, 100)
}
function toggle() {
  if (props.variant !== 'wave') { emit('toggle'); return }
  on.value = !on.value
  if (on.value) start()
  else stop()
  emit('toggle', on.value)
}
function seekTo(seconds: number) {
  elapsed.value = Math.max(0, Math.min(props.duration, seconds))
  mark = Date.now()
  emit('seek', elapsed.value)
}
function onWaveClick(e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  seekTo((e.clientX - r.left) / r.width * props.duration)
}
function onWaveKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  seekTo(elapsed.value + (e.key === 'ArrowRight' ? 1 : -1) * props.duration * 0.05)
}
watch(() => props.playing, (v) => { if (props.variant === 'wave' && v !== on.value) toggle() })
if (props.variant === 'wave' && props.playing) start()
onBeforeUnmount(stop)

const played = computed(() => (props.duration ? Math.round(elapsed.value / props.duration * BARS) : 0))
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
</script>

<template>
  <div
    v-if="props.variant === 'wave'"
    data-slot="player-audio"
    data-variant="wave"
    :data-state="on ? 'playing' : 'paused'"
    :class="cn('flex items-center gap-2', props.class)"
  >
    <span class="flex size-8 shrink-0 items-center justify-center">
      <PlayerButton :type="on ? 'pause' : 'play'" size="xs" @click="toggle" />
    </span>
    <div
      data-slot="player-audio-wave"
      role="slider"
      tabindex="0"
      aria-label="Перемотка"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(props.duration)"
      :aria-valuenow="Math.round(elapsed)"
      :aria-valuetext="`${clock(elapsed)} из ${clock(props.duration)}`"
      class="flex h-6 shrink-0 cursor-pointer items-center gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="onWaveClick"
      @keydown="onWaveKey"
    >
      <span
        v-for="(h, k) in bars"
        :key="k"
        data-slot="player-audio-bar"
        :data-played="k < played || undefined"
        class="w-0.5 shrink-0 rounded-full"
        :class="k < played ? 'bg-primary' : 'bg-foreground/[var(--opacity-soft)]'"
        :style="{ height: `calc(var(--spacing) * ${h / 2})` }"
      />
    </div>
    <span data-slot="player-audio-time" class="shrink-0 text-xs text-foreground/[var(--opacity-on-tone)] tabular-nums">{{ clock(elapsed) }} / {{ clock(props.duration) }}</span>
  </div>

  <div
    v-else
    data-slot="player-audio"
    :class="cn('flex h-15 w-full items-center gap-6 rounded-xl bg-muted-foreground/[var(--opacity-soft)] px-6 py-5', props.class)"
  >
    <PlayerButton :type="props.playing ? 'pause' : 'play'" size="sm" @click="emit('toggle')" />

    <span class="min-w-0 flex-1 truncate text-base">
      <slot />
    </span>

    <!-- Дорожка перемотки появляется только во время воспроизведения. -->
    <span
      v-if="props.playing"
      class="h-1 w-40 shrink-0 overflow-hidden rounded-full bg-muted-foreground/[var(--opacity-soft)]"
      role="progressbar"
    >
      <span class="block h-full w-1/3 rounded-full bg-primary" />
    </span>

    <span class="shrink-0 text-xs text-muted-foreground">{{ props.time }}</span>
  </div>
</template>
