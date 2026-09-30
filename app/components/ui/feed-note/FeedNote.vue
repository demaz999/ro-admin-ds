<script setup lang="ts">
import type { FeedNoteKind, FeedNoteSelection } from '.'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import { ButtonAction } from '@/components/ui/button-action'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
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

/** «Показать полностью» — от 110 знаков, как у прототипа (`clamp = text.length > 110`). */
const long = computed(() => props.text.length > 110)
const textEl = ref<HTMLElement>()

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
    :data-state="long ? (props.expanded ? 'expanded' : 'clamped') : undefined"
    :class="cn(feedNoteVariants({ kind: props.kind }), props.class)"
  >
    <div data-slot="feed-note-head" class="flex items-center gap-2">
      <IconButton v-if="props.kind === 'note'" variant="ghost" size="sm" label="Текстовая заметка" @click="emit('play')">
        <Icon name="article" :size="16" />
      </IconButton>
      <span
        data-slot="feed-note-type"
        :class="cn('text-2xs font-bold uppercase', props.kind === 'note' ? 'text-warning-strong' : 'text-primary')"
      >{{ props.kind === 'note' ? 'Текстовая заметка' : 'Голосовой комментарий' }}</span>
      <span data-slot="feed-note-time" class="text-2xs text-muted-foreground">{{ props.time }}</span>
      <div class="ml-auto flex shrink-0 items-center gap-3">
        <ButtonAction v-if="long" size="sm" :show-icon="false" @click="emit('toggle')">
          {{ props.expanded ? 'Свернуть' : 'Показать полностью' }}
        </ButtonAction>
        <ButtonAction size="sm" :show-icon="false" @click="emit('copy')">
          Копировать
        </ButtonAction>
      </div>
    </div>
    <PlayerAudio v-if="props.kind === 'voice'" :time="props.duration" @toggle="emit('play')">
      {{ props.name }}
    </PlayerAudio>
    <p
      ref="textEl"
      data-slot="feed-note-text"
      :class="cn('cursor-text text-sm text-foreground select-text', long && !props.expanded && 'line-clamp-2')"
      @mouseup="onMouseup"
    >
      {{ props.text }}
    </p>
  </div>
</template>
