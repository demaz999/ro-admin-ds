<script setup lang="ts">
import { cn } from '@/lib/utils'
import { scenarioPrice, type ScenarioGap } from '.'
import ScenarioPreviewGap from './ScenarioPreviewGap.vue'
import ScenarioPreviewTags from './ScenarioPreviewTags.vue'

/**
 * Первый экран страницы сценария: метки, продающее название, краткое описание, цена «от», «Оставить заявку», изображение
 * (ревью 4.8). Незаполненное поле — метка «Не заполнено» на его месте: событие `gap` с полем таба. Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewHero title="Дистанционный осмотр автомобиля" summary="Осмотр по фото за 15 минут" :price="700"
 * :tags="['Страхование']" image="/scheme-edit/hints/car-front-left.svg" :gaps="{}" @gap="toField" />`
 */
const props = withDefaults(defineProps<{
  title?: string
  summary?: string
  /** Адрес изображения; пусто — не загружено. */
  image?: string
  imageAlt?: string
  /** Цена «от», ₽; `null` — цены нет: метка «Не заполнено», если она в `gaps.price`, иначе места цены нет. */
  price?: number | null
  tags?: string[]
  action?: string
  gaps?: Partial<Record<'title' | 'summary' | 'image' | 'price' | 'tags', ScenarioGap>>
  class?: string
}>(), { title: '', summary: '', image: '', imageAlt: '', price: null, tags: () => [], action: 'Оставить заявку', gaps: () => ({}), class: undefined })

const emit = defineEmits<{ gap: [gap: ScenarioGap] }>()
</script>

<template>
  <section data-slot="scenario-preview-hero" :class="cn('bg-site-band px-5 py-8 @site-wide:px-10 @site-wide:py-12', props.class)">
    <div class="mx-auto grid w-full max-w-site gap-6 @site-wide:grid-cols-2 @site-wide:items-center @site-wide:gap-10">
      <div class="flex min-w-0 flex-col items-start gap-4">
        <ScenarioPreviewTags v-if="props.tags.length || props.gaps.tags" :items="props.tags" data-part="tags">
          <template v-if="props.gaps.tags" #default>
            <ScenarioPreviewGap :label="props.gaps.tags.label" data-gap="tags" @go="emit('gap', props.gaps.tags)" />
          </template>
        </ScenarioPreviewTags>
        <h1 v-if="props.title" data-slot="scenario-preview-title" data-part="title" class="m-0 text-2xl font-bold text-site-foreground @site-wide:text-3xl">
          {{ props.title }}
        </h1>
        <ScenarioPreviewGap v-else-if="props.gaps.title" :label="props.gaps.title.label" data-gap="title" @go="emit('gap', props.gaps.title)" />
        <p v-if="props.summary" data-slot="scenario-preview-summary" data-part="summary" class="m-0 text-sm text-site-foreground/[var(--opacity-on-tone)] @site-wide:text-lg">
          {{ props.summary }}
        </p>
        <ScenarioPreviewGap v-else-if="props.gaps.summary" :label="props.gaps.summary.label" data-gap="summary" @go="emit('gap', props.gaps.summary)" />
        <div v-if="props.price != null" data-slot="scenario-preview-price" data-part="price" class="flex flex-col gap-1">
          <span class="text-2xl font-bold text-site-foreground">{{ scenarioPrice(props.price) }}</span>
          <span class="text-xs text-site-foreground/[var(--opacity-on-tone)]">стоимость осмотра</span>
        </div>
        <ScenarioPreviewGap v-else-if="props.gaps.price" :label="props.gaps.price.label" data-gap="price" @go="emit('gap', props.gaps.price)" />
        <!-- Кнопка сайта — изображение: в превью не нажимается. -->
        <span data-slot="scenario-preview-action" data-part="action" class="inline-flex h-12 items-center rounded-md bg-site-accent px-6 text-sm font-bold text-site-accent-foreground">
          {{ props.action }}
        </span>
      </div>
      <div data-part="image" class="flex min-w-0">
        <img
          v-if="props.image"
          data-slot="scenario-preview-image"
          :src="props.image"
          :alt="props.imageAlt"
          class="aspect-16/10 w-full rounded-xl border border-site-border bg-site-surface object-cover"
        >
        <div v-else class="flex aspect-16/10 w-full items-center justify-center rounded-xl border border-dashed border-site-border bg-site-surface p-4">
          <ScenarioPreviewGap v-if="props.gaps.image" :label="props.gaps.image.label" data-gap="image" @go="emit('gap', props.gaps.image)" />
        </div>
      </div>
    </div>
  </section>
</template>
