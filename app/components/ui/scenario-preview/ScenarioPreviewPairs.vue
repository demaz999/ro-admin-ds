<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import type { ScenarioGap, ScenarioPair } from '.'
import ScenarioPreviewGap from './ScenarioPreviewGap.vue'

/**
 * Пары «проблема — последствия — решение» блока «Зачем нужен осмотр» (ревью 4.8): карточка на пару, две колонки на компьютере.
 * Незаполненная часть пары — метка «Не заполнено» внизу карточки: событие `gap`. Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewPairs :pairs="[{ problem: 'Дорого и долго', effect: 'Выезд эксперта занимает дни', solution: 'Клиент снимает сам' }]" />`
 */
const props = withDefaults(defineProps<{
  pairs: ScenarioPair[]
  /** Незаполненное по номеру пары. */
  gaps?: Record<number, ScenarioGap>
  class?: string
}>(), { gaps: () => ({}), class: undefined })

const emit = defineEmits<{ gap: [gap: ScenarioGap] }>()
</script>

<template>
  <ul data-slot="scenario-preview-pairs" :class="cn('m-0 grid list-none gap-4 p-0 @site-wide:grid-cols-2', props.class)">
    <li
      v-for="(p, k) in props.pairs"
      :key="k"
      data-slot="scenario-preview-pair"
      :data-pair="k"
      class="flex flex-col gap-3 rounded-xl border border-site-border bg-site-surface p-5"
    >
      <p v-if="p.problem" data-part="problem" class="m-0 text-lg font-bold text-site-foreground">
        {{ p.problem }}
      </p>
      <p v-if="p.effect" data-part="effect" class="m-0 text-sm text-site-foreground/[var(--opacity-on-tone)]">
        {{ p.effect }}
      </p>
      <p v-if="p.solution" data-part="solution" class="m-0 flex items-start gap-2 rounded-md bg-site-band p-3 text-sm text-site-foreground">
        <span class="flex h-5 shrink-0 items-center text-site-accent">
          <Icon name="check" :size="16" />
        </span>
        <span>{{ p.solution }}</span>
      </p>
      <ScenarioPreviewGap v-if="props.gaps[k]" :label="props.gaps[k]!.label" :data-gap="`pair:${k}`" @go="emit('gap', props.gaps[k]!)" />
    </li>
  </ul>
</template>
