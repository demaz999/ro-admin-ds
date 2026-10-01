<script setup lang="ts">
import { cn } from '@/lib/utils'
import { calloutVariants, type CalloutTone } from '.'

/**
 * Плашка-сообщение в потоке — разбор и таблица «кит | прототип» в `index.ts`.
 * Текст и список — слот по умолчанию: абзац или `<ul>` без классов, оформление даёт компонент.
 */
const props = withDefaults(defineProps<{
  tone?: CalloutTone
  /** Заголовок плашки — первой строкой, полужирным. */
  title?: string
  class?: string
}>(), {
  tone: 'neutral',
  title: '',
})
</script>

<template>
  <div data-slot="callout" :data-tone="props.tone" :class="cn(calloutVariants({ tone: props.tone }), props.class)">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
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
    <div v-if="$slots.actions" data-slot="callout-actions" class="flex shrink-0 flex-wrap items-center justify-end gap-4">
      <slot name="actions" />
    </div>
  </div>
</template>
