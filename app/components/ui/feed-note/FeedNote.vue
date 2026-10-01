<script setup lang="ts">
import type { FeedNoteKind, FeedNoteSelection } from '.'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { ButtonAction } from '@/components/ui/button-action'
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
  text: string
  /** Длинная расшифровка развёрнута. Состояние держит страница. */
  expanded?: boolean
  class?: string
}>(), {
  kind: 'voice',
  duration: '',
  name: '',
  expanded: false,
})

const emit = defineEmits<{
  toggle: []
  copy: []
  play: []
  'select-text': [selection: FeedNoteSelection]
}>()

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
    <div data-slot="feed-note-head" class="flex items-center gap-2">
      <span
        data-slot="feed-note-type"
        :class="cn('text-2xs font-bold uppercase', props.kind === 'note' ? 'text-warning-strong' : 'text-primary')"
      >{{ props.kind === 'note' ? 'Текстовая заметка' : 'Голосовой комментарий' }}</span>
      <span data-slot="feed-note-time" class="text-2xs text-muted-foreground">{{ props.time }}</span>
    </div>
    <PlayerAudio v-if="props.kind === 'voice'" surface="none" :time="props.duration" @toggle="emit('play')">
      {{ props.name }}
    </PlayerAudio>
    <p
      ref="textEl"
      data-slot="feed-note-text"
      :class="cn('max-w-measure cursor-text text-sm text-foreground select-text', long && !props.expanded && 'line-clamp-3')"
      @mouseup="onMouseup"
    >
      {{ props.text }}
    </p>
    <div data-slot="feed-note-actions" class="flex items-center gap-3">
      <ButtonAction v-if="toggleable" size="sm" :show-icon="false" @click="emit('toggle')">
        {{ props.expanded ? 'Свернуть' : 'Показать полностью' }}
      </ButtonAction>
      <ButtonAction size="sm" :show-icon="false" @click="emit('copy')">
        Копировать
      </ButtonAction>
    </div>
  </div>
</template>
