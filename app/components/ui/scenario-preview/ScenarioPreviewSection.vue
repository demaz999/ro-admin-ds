<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Раздел страницы сценария: заголовок, описание, содержимое — «Зачем нужен осмотр», «Как устроена схема», «ИИ-модули и
 * проверки», каталог сценариев. `band` — раздел на полосе `--site-band`. Слот `description` — вместо описания (метка «Не
 * заполнено»). Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewSection title="Как устроена схема" tone="band"><ScenarioPreviewSteps :steps /></ScenarioPreviewSection>`
 */
const props = withDefaults(defineProps<{
  title: string
  description?: string
  /** `page` — на фоне страницы; `band` — на полосе. */
  tone?: 'page' | 'band'
  class?: string
}>(), { description: '', tone: 'page', class: undefined })
</script>

<template>
  <section
    data-slot="scenario-preview-section"
    :data-tone="props.tone"
    :class="cn('px-5 py-8 @site-wide:px-10 @site-wide:py-12', props.tone === 'band' ? 'bg-site-band' : 'bg-site-page', props.class)"
  >
    <div class="mx-auto flex w-full max-w-site flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h2 data-slot="scenario-preview-section-title" class="m-0 text-xl font-bold text-site-foreground @site-wide:text-2xl">
          {{ props.title }}
        </h2>
        <p v-if="props.description" data-slot="scenario-preview-section-description" class="m-0 max-w-measure text-sm text-site-foreground/[var(--opacity-on-tone)] @site-wide:text-lg">
          {{ props.description }}
        </p>
        <slot name="description" />
      </div>
      <slot />
    </div>
  </section>
</template>
