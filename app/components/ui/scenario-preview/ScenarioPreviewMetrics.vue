<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { ScenarioGap, ScenarioMetric } from '.'
import ScenarioPreviewGap from './ScenarioPreviewGap.vue'

/**
 * Метрики блока «Зачем нужен осмотр» (ревью 4.8): значение `--site-accent` и подпись; две колонки на телефоне, три — на
 * компьютере. Незаполненная метрика — метка «Не заполнено» на её месте, пустой список — одна метка (`empty`): событие `gap`.
 * Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewMetrics :metrics="[{ label: 'Снижение выездов', value: '50–80 %' }]" />`
 */
const props = withDefaults(defineProps<{
  metrics: ScenarioMetric[]
  /** Незаполненное по номеру метрики. */
  gaps?: Record<number, ScenarioGap>
  /** Метрик нет — метка вместо списка. */
  empty?: ScenarioGap | null
  class?: string
}>(), { gaps: () => ({}), empty: null, class: undefined })

const emit = defineEmits<{ gap: [gap: ScenarioGap] }>()
</script>

<template>
  <ScenarioPreviewGap v-if="!props.metrics.length && props.empty" :label="props.empty.label" data-gap="metrics" @go="emit('gap', props.empty)" />
  <ul v-else data-slot="scenario-preview-metrics" :class="cn('m-0 grid list-none grid-cols-2 gap-4 p-0 @site-wide:grid-cols-3', props.class)">
    <li
      v-for="(x, k) in props.metrics"
      :key="k"
      data-slot="scenario-preview-metric"
      :data-metric="k"
      class="flex min-w-0 flex-col gap-1 rounded-xl border border-site-border bg-site-surface p-5"
    >
      <ScenarioPreviewGap v-if="props.gaps[k]" :label="props.gaps[k]!.label" :data-gap="`metric:${k}`" @go="emit('gap', props.gaps[k]!)" />
      <template v-else>
        <span data-part="value" class="text-2xl font-bold text-site-accent @site-wide:text-3xl">{{ x.value }}</span>
        <span data-part="label" class="text-xs text-site-foreground/[var(--opacity-on-tone)]">{{ x.label }}</span>
      </template>
    </li>
  </ul>
</template>
