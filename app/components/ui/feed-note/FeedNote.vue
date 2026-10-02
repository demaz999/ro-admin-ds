<script setup lang="ts">
import type { FeedNoteKind, FeedNoteSelection } from '.'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { ButtonAction } from '@/components/ui/button-action'
import { Icon } from '@/components/ui/icon'
import { PlayerAudio } from '@/components/ui/player'
import { feedNoteVariants } from '.'

/** Заметка в ленте (§8.4) — разбор и провенанс в `index.ts`. */
const props = withDefaults(defineProps<{
  kind?: FeedNoteKind
  /** Время записи: «09:52». */
  time: string
  /** Длительность голосовой: «0:26». */
  duration?: string
  /** Имя файла голосовой — подпись строки воспроизведения. */
  name?: string
  /** Волна голосовой — высоты столбиков, доли 0–1; без неё волна строится из `seed` (такт 58). */
  wave?: number[]
  /** Зерно волны — id заметки: волна одна и та же при каждой загрузке. */
  seed?: string | number
  text: string
  /** Длинная расшифровка развёрнута. Состояние держит страница. */
  expanded?: boolean
  class?: string
}>(), {
  kind: 'voice',
  duration: '',
  name: '',
  wave: undefined,
  seed: 0,
  expanded: false,
})

const emit = defineEmits<{
  toggle: []
  copy: []
  play: []
  'select-text': [selection: FeedNoteSelection]
}>()

/** Мета строкой: время · имя файла; длительность голосовой — в строке воспроизведения (такт 58). */
const meta = computed(() => [props.time, props.kind === 'voice' ? props.name : ''].filter(Boolean).join(' · '))
/** Длительность «м:сс» — в секунды для плеера. */
const seconds = computed(() => { const [m, s] = props.duration.split(':').map(Number); return Number.isFinite(m) && Number.isFinite(s) ? m! * 60 + s! : 0 })

/** Длинная — от 110 знаков, как у прототипа (`clamp = text.length > 110`). */
const long = computed(() => props.text.length > 110)
const textEl = ref<HTMLElement>()
/**
 * Свёрнутая расшифровка — три строки (такт 46, п. 16). «Показать полностью» — только когда три строки её правда режут:
 * при мере около 90 знаков текст до 270 знаков встаёт целиком, и кнопка ничего бы не раскрывала.
 */
const overflowing = ref(false)
function measure() {
  const el = textEl.value
  if (el && !props.expanded) overflowing.value = el.scrollHeight > el.clientHeight + 1
}
let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (textEl.value) { ro = new ResizeObserver(measure); ro.observe(textEl.value) }
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => [props.text, props.expanded], () => requestAnimationFrame(measure))
const toggleable = computed(() => long.value && (props.expanded || overflowing.value))

/** Выделение мышью внутри расшифровки: 2–120 знаков — прототип, обработчик `mouseup` документа. */
function onMouseup() {
  setTimeout(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.anchorNode || !textEl.value?.contains(sel.anchorNode)) return
    const text = sel.toString().trim()
    if (text.length < 2 || text.length > 120) return
    const r = sel.getRangeAt(0).getBoundingClientRect()
    emit('select-text', { text, rect: { left: r.left, top: r.top, width: r.width, height: r.height } })
  }, 10)
}
</script>

<template>
  <div
    data-slot="feed-note"
    :data-kind="props.kind"
    :data-state="toggleable ? (props.expanded ? 'expanded' : 'clamped') : undefined"
    :class="cn(feedNoteVariants({ kind: props.kind }), props.class)"
  >
    <!--
      Голосовая — как голосовое в мессенджере (такт 58, решение владельца 2026-10-02): кнопка, волновая дорожка с заливкой
      по мере воспроизведения, время «прошло / всего» — `PlayerAudio variant="wave"`. Довесок к такту 58: дорожка — первой строкой заметки, строка мета — под ней,
      расшифровка — ниже.
    -->
    <PlayerAudio
      v-if="props.kind === 'voice'"
      variant="wave"
      :duration="seconds"
      :peaks="props.wave"
      :seed="props.seed"
      @toggle="$event && emit('play')"
    />
    <!--
      Строка мета — такт 50, решение владельца 2026-10-01: главное в заметке — текст расшифровки. В одной строке: кнопка
      воспроизведения — с такта 58 в строке плеера ниже, тип 15/20 bold в тоне заметки обычным регистром (такт 51: «тип > мета»), время · имя файла ·
      длительность — приглушённо (`--opacity-on-tone`), справа «Копировать».
    -->
    <!-- Третий довесок к такту 58: тип, серая мета и «Копировать» — на базовой линии типа (правило такта 47); глиф — по центру строки типа. -->
    <div data-slot="feed-note-head" class="flex h-8 items-baseline gap-2 pt-1.5">
      <!-- У текстовой заметки — глиф в тоне заметки, без круга и подложки: он не интерактивен (такт 51). -->
      <Icon v-if="props.kind === 'note'" name="article" :size="16" class="mt-0.5 self-start text-warning-strong" />
      <span
        data-slot="feed-note-type"
        :class="cn('shrink-0 text-sm font-bold', props.kind === 'note' ? 'text-warning-strong' : 'text-primary')"
      >{{ props.kind === 'note' ? 'Текстовая заметка' : 'Голосовой комментарий' }}</span>
      <span data-slot="feed-note-time" class="min-w-0 truncate text-xs text-foreground/[var(--opacity-on-tone)]">{{ meta }}</span>
      <span data-slot="feed-note-copy" class="ml-auto flex shrink-0">
        <ButtonAction size="sm" :show-icon="false" @click="emit('copy')">
          Копировать
        </ButtonAction>
      </span>
    </div>
    <p
      ref="textEl"
      data-slot="feed-note-text"
      :class="cn('max-w-measure cursor-text text-sm text-foreground select-text', long && !props.expanded && 'line-clamp-3')"
      @mouseup="onMouseup"
    >
      {{ props.text }}
    </p>
    <div v-if="toggleable" data-slot="feed-note-actions" class="flex items-center gap-3">
      <ButtonAction size="sm" :show-icon="false" @click="emit('toggle')">
        {{ props.expanded ? 'Свернуть' : 'Показать полностью' }}
      </ButtonAction>
    </div>
  </div>
</template>
