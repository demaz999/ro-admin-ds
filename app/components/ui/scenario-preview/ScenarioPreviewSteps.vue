<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'

/**
 * Шаги «Как устроена схема» — статусная модель осмотра по порядку (аудит, «Стержневой принцип»: «слайдер-флоу = статусная
 * модель»; ревью 4.8): номер в круге 32 — рамка 1 `--site-border` на `--site-surface`: читается и на полосе `--site-band`;
 * подпись 15/20 medium; на компьютере строкой со стрелками, на телефоне столбиком. Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewSteps :steps="['Создание', 'Выполнение', 'ИИ-анализ', 'Экспертиза', 'Завершение']" />`
 */
const props = withDefaults(defineProps<{
  steps: string[]
  class?: string
}>(), { class: undefined })
</script>

<template>
  <ol data-slot="scenario-preview-steps" :class="cn('m-0 flex list-none flex-col gap-3 p-0 @site-wide:flex-row @site-wide:flex-wrap @site-wide:items-center', props.class)">
    <li v-for="(s, k) in props.steps" :key="s" data-slot="scenario-preview-step" class="flex items-center gap-3">
      <span v-if="k" class="hidden text-site-foreground/[var(--opacity-on-tone)] @site-wide:flex" aria-hidden="true">
        <Icon name="arrow-forward" :size="16" />
      </span>
      <span class="flex size-8 shrink-0 items-center justify-center rounded-full border border-site-border bg-site-surface text-sm font-bold text-site-accent">{{ k + 1 }}</span>
      <span data-part="step" class="text-sm font-medium text-site-foreground">{{ s }}</span>
    </li>
  </ol>
</template>
