<script setup lang="ts">
import type { PublishState } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Avatar } from '../avatar'
import { Icon } from '../icon'

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
  class?: string
}>(), { author: '', date: '', editing: '' })

const emit = defineEmits<{ open: [] }>()

const text = computed(() => {
  if (props.state === 'never') return 'Ни разу не опубликовано'
  if (props.state === 'published') return 'Всё опубликовано'
  const by = [props.author ? `правки ${props.author}` : 'есть неопубликованные изменения', props.date ? `от ${props.date}` : ''].filter(Boolean).join(' ')
  return `Черновик: ${by}`
})
</script>

<template>
  <div data-slot="publish-status" :data-state="props.state" :class="cn('flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1', props.class)">
    <!-- Черновик — кнопка: открывает дифф с текущей версией. -->
    <button
      v-if="props.state === 'draft'"
      type="button"
      data-slot="publish-status-main"
      class="inline-flex min-w-0 items-center gap-1.5 text-left text-sm text-warning-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      @click="emit('open')"
    >
      <Icon name="info" :size="14" class="shrink-0" />
      <span class="min-w-0">{{ text }}</span>
    </button>
    <span v-else data-slot="publish-status-main" class="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Icon :name="props.state === 'published' ? 'check' : 'info'" :size="14" class="shrink-0" />
      <span class="min-w-0">{{ text }}</span>
    </span>

    <span v-if="props.editing" data-slot="publish-status-editing" class="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Avatar type="letter" variant="soft" :size="24" :letter="props.editing.trim().charAt(0).toUpperCase()" />
      <span class="min-w-0">Сейчас редактирует {{ props.editing }}</span>
    </span>
  </div>
</template>
