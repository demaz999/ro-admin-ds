<script setup lang="ts">
import type { DiffTone } from '.'
import { ref, useId } from 'vue'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { DIFF_TONE_CLASS } from '.'

/**
 * Область диффа: строка-заголовок со счётчиком, раскрывает детали. Область без изменений не раскрывается.
 * Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  title: string
  /** Счётчик готовой строкой. */
  count?: string
  tone?: DiffTone
  /** Раскрыта при появлении. По умолчанию всё свёрнуто. */
  open?: boolean
}>(), { count: '', tone: 'changed', open: false })

const expanded = ref(props.open)
const id = useId()
</script>

<template>
  <div data-slot="diff-area" :data-tone="props.tone" :data-open="expanded || undefined" class="flex flex-col border-b border-border-soft last:border-b-0">
    <button
      v-if="props.tone !== 'none'"
      type="button"
      data-slot="diff-area-trigger"
      class="flex min-h-11 w-full items-center gap-2.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-expanded="expanded"
      :aria-controls="id"
      @click="expanded = !expanded"
    >
      <span class="flex size-4.5 shrink-0 items-center justify-center text-foreground-secondary transition-transform" :class="expanded ? 'rotate-90' : ''">
        <Icon name="chevron-right" :size="12" />
      </span>
      <span data-slot="diff-area-title" class="min-w-0 flex-1 text-sm font-bold text-foreground">{{ props.title }}</span>
      <span data-slot="diff-area-count" :class="cn('shrink-0 text-xs font-medium', DIFF_TONE_CLASS[props.tone])">{{ props.count }}</span>
    </button>
    <!-- Без изменений: шеврона нет, строка — текст. -->
    <div v-else class="flex min-h-11 w-full items-center gap-2.5 py-3">
      <span class="size-4.5 shrink-0" />
      <span data-slot="diff-area-title" class="min-w-0 flex-1 text-sm font-bold text-foreground-disabled">{{ props.title }}</span>
      <span data-slot="diff-area-count" class="shrink-0 text-xs text-foreground-disabled">{{ props.count }}</span>
    </div>
    <div v-if="expanded && props.tone !== 'none'" :id="id" data-slot="diff-area-body" class="flex flex-col gap-3 pb-3 pl-7">
      <slot />
    </div>
  </div>
</template>
