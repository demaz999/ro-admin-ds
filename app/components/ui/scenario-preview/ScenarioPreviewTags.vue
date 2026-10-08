<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Метки страницы сценария — пилюли на `--site-surface` с рамкой 1 `--site-border`: теги первого экрана и карточки каталога
 * (`sm`), ИИ-модули и проверки (`md`). Слот по умолчанию — после меток (метка «Не заполнено»). Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewTags :items="['Страхование', 'ПСО — предстраховой осмотр', 'Транспорт']" />`
 */
const props = withDefaults(defineProps<{
  items: string[]
  /** `sm` — 28, поля 12, 13/16; `md` — 36, поля 16, 15/20. */
  size?: 'sm' | 'md'
  class?: string
}>(), { size: 'sm', class: undefined })
</script>

<template>
  <ul data-slot="scenario-preview-tags" :data-size="props.size" :class="cn('m-0 flex list-none flex-wrap items-center gap-2 p-0', props.class)">
    <li
      v-for="x in props.items"
      :key="x"
      data-slot="scenario-preview-tag"
      :class="cn(
        'inline-flex items-center rounded-full border border-site-border bg-site-surface text-site-foreground',
        props.size === 'md' ? 'h-9 px-4 text-sm' : 'h-7 px-3 text-xs',
      )"
    >
      {{ x }}
    </li>
    <li v-if="$slots.default" class="flex">
      <slot />
    </li>
  </ul>
</template>
