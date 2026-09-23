<script setup lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { cn } from '@/lib/utils'

/**
 * Этап панели структуры: заголовок-переключатель и тело. Разбор — в `index.ts`.
 * Сворачивание — логика страницы (§9.1: состояние хранится в рамках сессии): компонент
 * получает `open` и сообщает `toggle`.
 */
const props = withDefaults(defineProps<{
  title: string
  /** Этап повторяемый — метка «повторяемый» (§2: повторяемость — свойство этапа). */
  repeatable?: boolean
  /** Счёт справа: «4 шага» у обычного этапа, число повторов у повторяемого. */
  count?: string
  open?: boolean
  /**
   * Строка добавления повтора под заголовком повторяемого этапа: «Новое здание»,
   * «Новая единица». Пусто — строки нет.
   */
  addLabel?: string
  /** Оснастка приёмки: вид наведения без курсора. В продукт не идёт. */
  demoHover?: boolean
  class?: string
}>(), {
  repeatable: false,
  count: '',
  open: true,
  addLabel: '',
  demoHover: false,
})

const emit = defineEmits<{ toggle: []; add: [] }>()
</script>

<template>
  <section data-slot="stage-section" :data-state="props.open ? 'open' : 'closed'" :class="cn('border-b border-border-soft', props.class)">
    <button
      type="button"
      data-slot="stage-header"
      :aria-expanded="props.open"
      class="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-border-soft bg-accent px-3 py-2.5 text-left outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      :class="props.demoHover ? 'bg-secondary' : ''"
      :style="{ transitionProperty: 'background-color', transitionDuration: 'var(--duration-hover)' }"
      @click="emit('toggle')"
    >
      <Icon
        name="chevron-down-kit1"
        :size="12"
        class="text-muted-foreground transition-transform"
        :class="props.open ? '' : '-rotate-90'"
      />
      <span data-slot="stage-title" class="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{{ props.title }}</span>
      <span
        v-if="props.repeatable"
        data-slot="stage-repeatable"
        class="inline-flex h-4 shrink-0 items-center rounded-full bg-tag px-2 text-2xs font-bold text-secondary-foreground"
      >повторяемый</span>
      <span v-if="props.count" data-slot="stage-count" class="shrink-0 text-2xs text-muted-foreground">{{ props.count }}</span>
    </button>
    <div v-if="props.open" data-slot="stage-body">
      <div v-if="props.addLabel" data-slot="stage-add" class="border-b border-border-soft bg-card px-2.5 py-2">
        <Button variant="secondary" size="sm" @click="emit('add')">+ {{ props.addLabel }}</Button>
      </div>
      <slot />
    </div>
  </section>
</template>
