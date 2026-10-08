<script setup lang="ts">
import { computed } from 'vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import { cn } from '@/lib/utils'
import { thumbStripItem, type ThumbStripItem } from '.'

/**
 * Полоса миниатюр — такт 87, карточка 10 `docs/scheme-edit.md`, раздел 8 (ворота открыты заранее решением 7 оркестратора
 * 2026-10-08). Разбор и замеры — `index.ts`.
 *
 * Пример: `<ThumbStrip :items="[{ src, label }]" :max="3" @open="k => view(k)" />`.
 */
const props = withDefaults(defineProps<{
  items: ThumbStripItem[]
  /** Сколько миниатюр видно; остаток — хвостом «+N». */
  max?: number
  /** Подпись полосы для чтения с экрана: «Фото-подсказки шага «…»». */
  label?: string
  class?: string
}>(), { max: 3, label: '', class: undefined })

const emit = defineEmits<{
  /** Нажатие по миниатюре — её номер с нуля; по хвосту «+N» — номер первой скрытой. */
  open: [index: number]
}>()

const shown = computed(() => props.items.slice(0, Math.max(0, props.max)))
const more = computed(() => Math.max(0, props.items.length - shown.value.length))
</script>

<template>
  <div
    data-slot="thumb-strip"
    role="group"
    :aria-label="props.label || undefined"
    :class="cn('flex items-center gap-1', props.class)"
  >
    <TooltipProvider>
      <Tooltip v-for="(item, k) in shown" :key="k">
        <TooltipTrigger as-child>
          <button
            type="button"
            data-slot="thumb-strip-item"
            :aria-label="item.label"
            :class="thumbStripItem"
            @click="emit('open', k)"
          >
            <img :src="item.src" alt="" class="size-full object-cover">
          </button>
        </TooltipTrigger>
        <TooltipContent>{{ item.label }}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <!-- Хвост «+N» — 12/16 `--foreground-secondary`, как в макете `32765:6721`; нажатие — первая скрытая миниатюра. -->
    <button
      v-if="more"
      type="button"
      data-slot="thumb-strip-more"
      :aria-label="`Ещё ${more}`"
      class="flex h-5 items-start rounded-xs pt-0.75 text-2xs text-foreground-secondary outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      @click="emit('open', shown.length)"
    >
      +{{ more }}
    </button>
  </div>
</template>
