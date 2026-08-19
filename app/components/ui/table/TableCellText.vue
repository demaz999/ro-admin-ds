<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import { cn } from '@/lib/utils'

/**
 * Обрезанный текст ячейки с подсказкой полного содержимого.
 *
 * Стикер на кадре `19601:29029` просит подсказку у обрезанного текста, но
 * мастера у неё нет: в макете это пометка дизайнера, а не нарисованный узел.
 * Решение владельца от 2026-08-18, такт 7 — подсказка живёт **в механике
 * таблицы**, а не в данных страницы: любая ячейка, где текст не поместился,
 * получает её сама.
 *
 * ## Подсказка появляется только при настоящем обрезании
 *
 * Признак — не длина строки и не догадка автора страницы, а замер:
 * `scrollWidth > clientWidth` при обрезке в строку и `scrollHeight >
 * clientHeight` при обрезке по строкам. Текст поместился — подсказки нет
 * вовсе, `Tooltip` стоит выключенным (`disabled`), а не пустым.
 *
 * Замер повторяется при изменении размеров (`ResizeObserver`) и после каждой
 * перерисовки содержимого: ширина колонки в таблице меняется от окна, и то,
 * что помещалось на 2560, обрезается на 1440.
 *
 * ## Подсказка с действием
 *
 * Внутри плашки — тот же сервисный `IconButton variant="ghost" size="sm"` с
 * глифом `copy` 16, что стоит у ID в карточном виде. Плашка поэтому обязана
 * оставаться открытой при наведении на неё: у Reka это поведение по умолчанию
 * (`disableHoverableContent` выключено), и его здесь нельзя гасить.
 *
 * Разбор решения — `docs/naming.md`, «Подсказка обрезанного текста».
 */
const props = withDefaults(defineProps<{
  /** Сколько строк показывать. 1 — обрезка многоточием в строку, больше — по строкам. */
  lines?: 1 | 2 | 3 | 4
  /**
   * Полный текст для подсказки. Если не задан, берётся из отрисованного
   * содержимого — тогда страница ничего про подсказку не знает.
   */
  text?: string
  /** Кнопка копирования в подсказке. */
  copy?: boolean
  /** Класс снаружи — слиянием: кегль и ширину задаёт колонка. */
  class?: string
  /**
   * Подсказка открыта сразу. **Оснастка приёмки:** headless-браузер снимает
   * страницу без курсора, а показать плашку надо. В продукт не идёт.
   */
  defaultOpen?: boolean
}>(), {
  lines: 1,
  text: undefined,
  copy: true,
  class: undefined,
  defaultOpen: false,
})

const el = ref<HTMLElement | null>(null)
const clipped = ref(false)
const full = ref('')

/**
 * Классы обрезки перечислены статически: `line-clamp-${n}` собранной строкой
 * Tailwind не увидит и утилиту не сгенерирует.
 */
const clampClass = computed(() => {
  if (props.lines <= 1) return 'block truncate'
  return ({ 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' } as const)[props.lines]
})

function measure() {
  const node = el.value
  if (!node) return
  full.value = props.text ?? node.textContent?.trim() ?? ''
  // Запас в пиксель: субпиксельная раскладка иначе даёт ложное обрезание.
  clipped.value = node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1
}

let observer: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  measure()
  if (typeof ResizeObserver !== 'undefined' && el.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(el.value)
  }
})

onUpdated(() => measure())

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

function copyText() {
  navigator.clipboard?.writeText(full.value)
}
</script>

<template>
  <TooltipProvider>
    <Tooltip :disabled="!clipped" :default-open="props.defaultOpen">
      <TooltipTrigger as-child>
        <span
          ref="el"
          data-slot="table-cell-text"
          :data-clipped="clipped ? '' : undefined"
          :class="cn('min-w-0', clampClass, props.class)"
        >
          <slot />
        </span>
      </TooltipTrigger>

      <!-- Плашка переносит текст и держит ширину: в ячейке он не поместился. -->
      <TooltipContent class="flex max-w-100 items-start gap-2 whitespace-normal">
        <span class="min-w-0 flex-1">{{ full }}</span>

        <IconButton
          v-if="props.copy"
          variant="ghost"
          size="sm"
          label="Скопировать"
          @click="copyText"
        >
          <Icon name="copy" :size="16" />
        </IconButton>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
