<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { calloutVariants, type CalloutTone } from '.'

/**
 * Плашка-сообщение в потоке — разбор и таблица «кит | прототип» в `index.ts`.
 * Текст и список — слот по умолчанию: абзац или `<ul>` без классов, оформление даёт компонент.
 * `closable` (такт 72) — крестик справа, событие `close`; скрывает плашку потребитель.
 */
const props = withDefaults(defineProps<{
  tone?: CalloutTone
  /** Заголовок плашки — первой строкой, полужирным. */
  title?: string
  /** Крестик «Закрыть» справа — одноразовая плашка; нажатие отдаёт `close`, плашку убирает потребитель. */
  closable?: boolean
  /**
   * Узкий экран (уже 768) — такт 92: `keep` (по умолчанию) — действия справа от текста; `stack` — действия строкой под текстом,
   * от левого края, с переносом (статус витрины страницы схемы на телефоне). Рабочий стол прежний.
   */
  narrow?: 'keep' | 'stack'
  class?: string
}>(), {
  tone: 'neutral',
  title: '',
  closable: false,
  narrow: 'keep',
})
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div data-slot="callout" :data-tone="props.tone" :data-narrow="props.narrow === 'stack' ? 'stack' : undefined" :class="cn(calloutVariants({ tone: props.tone }), props.narrow === 'stack' ? 'max-md:flex-wrap' : '', props.class)">
    <div :class="cn('flex min-w-0 flex-1 flex-col gap-1', props.narrow === 'stack' ? 'max-md:basis-full' : '')">
      <p v-if="props.title" data-slot="callout-title" class="m-0 font-bold">
        {{ props.title }}
      </p>
      <div
        v-if="$slots.default"
        data-slot="callout-text"
        class="[&_li]:list-item [&_p]:m-0 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-5"
      >
        <slot />
      </div>
    </div>
    <div v-if="$slots.actions" data-slot="callout-actions" :class="cn('flex shrink-0 flex-wrap items-center justify-end gap-4', props.narrow === 'stack' ? 'max-md:max-w-full max-md:shrink max-md:justify-start' : '')">
      <slot name="actions" />
    </div>
    <!--
      Крестик — зона 32 с глифом 16, как у `Alert` (такт 50); поля зоны уходят в поля плашки (−6 по вертикали, −8 справа):
      высота плашки и правый край текста прежние. Цвет — тон плашки на ступени `--opacity-on-tone`, наведение — полный тон.
    -->
    <button
      v-if="props.closable"
      type="button"
      data-slot="callout-close"
      aria-label="Закрыть"
      class="group/close -my-1.5 -mr-2 flex size-8 shrink-0 items-center justify-center self-start rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="emit('close')"
    >
      <Icon name="close" :size="16" class="opacity-[var(--opacity-on-tone)] group-hover/close:opacity-100" />
    </button>
  </div>
</template>
