<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { scenarioPrice, type ScenarioGap } from '.'
import ScenarioPreviewGap from './ScenarioPreviewGap.vue'
import ScenarioPreviewTags from './ScenarioPreviewTags.vue'

/**
 * Карточка сценария в каталоге сайта (ревью 4.8, «Страница сценария / Карточка в каталоге»): изображение 16:10, метки,
 * продающее название, краткое описание до трёх строк, цена «от» и «Подробнее». Незаполненное — метка «Не заполнено» на месте
 * поля: событие `gap`. Ширину задаёт сетка каталога. Разбор — `index.ts`.
 *
 * Пример: `<ScenarioPreviewCard title="Дистанционный осмотр автомобиля" summary="Осмотр по фото за 15 минут" :price="700" :tags="['Страхование']" />`
 */
const props = withDefaults(defineProps<{
  title?: string
  summary?: string
  image?: string
  imageAlt?: string
  price?: number | null
  tags?: string[]
  gaps?: Partial<Record<'title' | 'summary' | 'image' | 'price', ScenarioGap>>
  class?: string
}>(), { title: '', summary: '', image: '', imageAlt: '', price: null, tags: () => [], gaps: () => ({}), class: undefined })

const emit = defineEmits<{ gap: [gap: ScenarioGap] }>()
</script>

<template>
  <article data-slot="scenario-preview-card" :class="cn('flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-site-border bg-site-surface', props.class)">
    <img v-if="props.image" data-slot="scenario-preview-image" data-part="image" :src="props.image" :alt="props.imageAlt" class="aspect-16/10 w-full bg-site-band object-cover">
    <div v-else data-part="image" class="flex aspect-16/10 w-full items-center justify-center bg-site-band p-4">
      <ScenarioPreviewGap v-if="props.gaps.image" :label="props.gaps.image.label" data-gap="image" @go="emit('gap', props.gaps.image)" />
    </div>
    <div class="flex flex-1 flex-col gap-3 p-5">
      <ScenarioPreviewTags v-if="props.tags.length" :items="props.tags" data-part="tags" />
      <h3 v-if="props.title" data-slot="scenario-preview-title" data-part="title" class="m-0 text-lg font-bold text-site-foreground">
        {{ props.title }}
      </h3>
      <ScenarioPreviewGap v-else-if="props.gaps.title" :label="props.gaps.title.label" data-gap="title" @go="emit('gap', props.gaps.title)" />
      <p v-if="props.summary" data-slot="scenario-preview-summary" data-part="summary" class="m-0 line-clamp-3 text-sm text-site-foreground/[var(--opacity-on-tone)]">
        {{ props.summary }}
      </p>
      <ScenarioPreviewGap v-else-if="props.gaps.summary" :label="props.gaps.summary.label" data-gap="summary" @go="emit('gap', props.gaps.summary)" />
      <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
        <span v-if="props.price != null" data-slot="scenario-preview-price" data-part="price" class="text-lg font-bold text-site-foreground">{{ scenarioPrice(props.price) }}</span>
        <ScenarioPreviewGap v-else-if="props.gaps.price" :label="props.gaps.price.label" data-gap="price" @go="emit('gap', props.gaps.price)" />
        <!-- Ссылка сайта — изображение: в превью не нажимается. -->
        <span data-part="more" class="ml-auto inline-flex items-center gap-1 text-sm font-bold text-site-accent">
          Подробнее
          <Icon name="arrow-forward" :size="16" />
        </span>
      </div>
    </div>
  </article>
</template>
