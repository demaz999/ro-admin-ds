<script setup lang="ts">
import type { PublishState } from '.'
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import { cn } from '@/lib/utils'
import { Avatar } from '../avatar'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'

/**
 * Индикатор состояния публикации в шапке страницы. Разбор — `index.ts`.
 *
 * Пример: `<PublishStatus state="draft" author="Игорь Петров" author-genitive="Игоря Петрова" date="01.10.2026, 11:40" time="11:40"
 * :changes="4" @open="openDiff" />` — «Черновик: И. П., 11:40 · 4 изменения», подсказка «Правки Игоря Петрова от 01.10.2026, 11:40 ·
 * 4 изменения».
 */
const props = withDefaults(defineProps<{
  state: PublishState
  /** Автор последних неопубликованных правок — у `draft`; в строке — инициалами («И. П.»), полностью — в подсказке. */
  author?: string
  /** Автор в родительном падеже для подсказки («Правки Игоря Петрова»); пусто — `author` как есть. */
  authorGenitive?: string
  /** Дата последних правок, готовой строкой — у `draft`, в подсказке. */
  date?: string
  /** Время последних правок для строки («11:40»); пусто — `date`. */
  time?: string
  /** Число правок черновика против опубликованной версии — счёт диффа публикации; не задано — части нет. */
  changes?: number
  /** Кто ещё редактирует схему сейчас (presence). Пусто — части нет. */
  editing?: string
  /**
   * Подсказка обрезанного текста открыта сразу. **Оснастка приёмки:** headless-браузер снимает страницу без курсора,
   * а плашку надо показать на матрице. В продукт не идёт.
   */
  tooltipOpen?: boolean
  class?: string
}>(), { author: '', authorGenitive: '', date: '', time: '', changes: undefined, editing: '', tooltipOpen: undefined })

const emit = defineEmits<{ open: [] }>()

/** «1 изменение · 2 изменения · 5 изменений». */
function plural(n: number) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return 'изменений'
  if (b === 1) return 'изменение'
  if (b >= 2 && b <= 4) return 'изменения'
  return 'изменений'
}
/** «Игорь Петров» → «И. П.». */
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map(w => `${w.charAt(0).toUpperCase()}.`).join(' ')
const count = computed(() => (props.changes === undefined ? '' : ` · ${props.changes} ${plural(props.changes)}`))

/**
 * Такт 102, решение владельца 2026-10-09 (доска scheme-edit-batch1-v1): строка черновика коротко — инициалы, время и число
 * правок; полное — подсказкой на наведении и фокусе.
 */
const text = computed(() => {
  if (props.state === 'never') return 'Ни разу не опубликовано'
  if (props.state === 'published') return 'Всё опубликовано'
  const by = [props.author ? initials(props.author) : '', props.time || props.date].filter(Boolean).join(', ')
  if (by) return `Черновик: ${by}${count.value}`
  return count.value ? `Черновик${count.value}` : 'Черновик: есть неопубликованные изменения'
})
const fullText = computed(() => {
  if (props.state !== 'draft') return text.value
  const who = props.authorGenitive || props.author
  const by = [who ? `Правки ${who}` : 'Есть неопубликованные изменения', props.date ? `от ${props.date}` : ''].filter(Boolean).join(' ')
  return `${by}${count.value}`
})
const editingText = computed(() => `Сейчас редактирует ${props.editing}`)

/**
 * Строка шапки держится одной (такт 67): текст обеих частей ужимается многоточием, полный текст — в подсказке. Признак
 * обрезания — замер `scrollWidth > clientWidth`, как у `TableCellText`: текст поместился — подсказка выключена. У черновика
 * подсказка есть всегда (такт 102): в ней полный текст.
 */
const mainText = ref<HTMLElement | null>(null)
const editText = ref<HTMLElement | null>(null)
const mainClipped = ref(false)
const editClipped = ref(false)
const clipped = (el: HTMLElement | null) => !!el && el.scrollWidth > el.clientWidth + 1
function measure() {
  mainClipped.value = clipped(mainText.value)
  editClipped.value = clipped(editText.value)
}
let observer: ResizeObserver | null = null
onMounted(async () => {
  await nextTick()
  measure()
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(() => measure())
  for (const el of [mainText.value, editText.value]) if (el) observer.observe(el)
})
onUpdated(() => {
  measure()
  if (observer && editText.value) observer.observe(editText.value)
})
onBeforeUnmount(() => { observer?.disconnect(); observer = null })
/** Подсказка: у черновика — всегда (полный текст), у прочих — только при обрезанном тексте. */
const tip = computed(() => props.state === 'draft' || mainClipped.value)
</script>

<template>
  <div data-slot="publish-status" :data-state="props.state" :class="cn('flex min-w-0 items-center gap-x-4', props.class)">
    <!-- Провайдер подсказок — внутри корня: безрендерный корень съел бы атрибуты страницы (`CLAUDE.md`). -->
    <TooltipProvider>
      <!--
        Черновик — кнопка: открывает дифф с текущей версией. Подсказка — на всём индикаторе (иконка и текст), у черновика
        открывается и фокусом кнопки. Свой `data-slot` элемента побеждает атрибуты триггера: `as-child` Reka сливает
        атрибуты ребёнка последними.
      -->
      <Tooltip :disabled="!tip" :default-open="props.tooltipOpen">
        <TooltipTrigger as-child>
          <component
            :is="props.state === 'draft' ? 'button' : 'span'"
            :type="props.state === 'draft' ? 'button' : undefined"
            data-slot="publish-status-main"
            :class="props.state === 'draft'
              ? 'inline-flex min-w-0 items-center gap-1.5 text-left text-sm text-warning-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
              : 'inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground'"
            @click="props.state === 'draft' && emit('open')"
          >
            <Icon :name="props.state === 'published' ? 'check' : 'info'" :size="14" class="shrink-0" />
            <span ref="mainText" class="min-w-0 truncate" :data-clipped="mainClipped ? '' : undefined">{{ text }}</span>
          </component>
        </TooltipTrigger>
        <TooltipContent class="max-w-100 whitespace-normal">
          {{ fullText }}
        </TooltipContent>
      </Tooltip>

      <span v-if="props.editing" data-slot="publish-status-editing" class="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Avatar type="letter" variant="soft" :size="24" :letter="props.editing.trim().charAt(0).toUpperCase()" class="shrink-0" />
        <Tooltip :disabled="!editClipped">
          <TooltipTrigger as-child>
            <span ref="editText" class="min-w-0 truncate" :data-clipped="editClipped ? '' : undefined">{{ editingText }}</span>
          </TooltipTrigger>
          <TooltipContent class="max-w-100 whitespace-normal">
            {{ editingText }}
          </TooltipContent>
        </Tooltip>
      </span>
    </TooltipProvider>
  </div>
</template>
