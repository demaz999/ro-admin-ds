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
 * Пример: `<PublishStatus state="draft" author="Игорь Петров" date="1 октября, 11:40" @open="openDiff" />`
 */
const props = withDefaults(defineProps<{
  state: PublishState
  /** Автор последних неопубликованных правок — у `draft`. */
  author?: string
  /** Дата последних правок, готовой строкой — у `draft`. */
  date?: string
  /** Кто ещё редактирует схему сейчас (presence). Пусто — части нет. */
  editing?: string
  /**
   * Подсказка обрезанного текста открыта сразу. **Оснастка приёмки:** headless-браузер снимает страницу без курсора,
   * а плашку надо показать на матрице. В продукт не идёт.
   */
  tooltipOpen?: boolean
  class?: string
}>(), { author: '', date: '', editing: '', tooltipOpen: undefined })

const emit = defineEmits<{ open: [] }>()

const text = computed(() => {
  if (props.state === 'never') return 'Ни разу не опубликовано'
  if (props.state === 'published') return 'Всё опубликовано'
  const by = [props.author ? `правки ${props.author}` : 'есть неопубликованные изменения', props.date ? `от ${props.date}` : ''].filter(Boolean).join(' ')
  return `Черновик: ${by}`
})
const editingText = computed(() => `Сейчас редактирует ${props.editing}`)

/**
 * Строка шапки держится одной (такт 67): текст обеих частей ужимается многоточием, полный текст — в подсказке. Признак
 * обрезания — замер `scrollWidth > clientWidth`, как у `TableCellText`: текст поместился — подсказка выключена.
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
</script>

<template>
  <div data-slot="publish-status" :data-state="props.state" :class="cn('flex min-w-0 items-center gap-x-4', props.class)">
    <!-- Провайдер подсказок — внутри корня: безрендерный корень съел бы атрибуты страницы (`CLAUDE.md`). -->
    <TooltipProvider>
      <!-- Черновик — кнопка: открывает дифф с текущей версией. -->
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
        <Tooltip :disabled="!mainClipped" :default-open="props.tooltipOpen">
          <TooltipTrigger as-child>
            <span ref="mainText" class="min-w-0 truncate" :data-clipped="mainClipped ? '' : undefined">{{ text }}</span>
          </TooltipTrigger>
          <TooltipContent class="max-w-100 whitespace-normal">
            {{ text }}
          </TooltipContent>
        </Tooltip>
      </component>

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
