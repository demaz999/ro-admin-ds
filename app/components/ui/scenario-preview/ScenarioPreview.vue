<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { ScenarioGap, ScenarioPage } from '.'
import ScenarioPreviewCard from './ScenarioPreviewCard.vue'
import ScenarioPreviewGap from './ScenarioPreviewGap.vue'
import ScenarioPreviewHero from './ScenarioPreviewHero.vue'
import ScenarioPreviewMetrics from './ScenarioPreviewMetrics.vue'
import ScenarioPreviewPairs from './ScenarioPreviewPairs.vue'
import ScenarioPreviewSection from './ScenarioPreviewSection.vue'
import ScenarioPreviewSteps from './ScenarioPreviewSteps.vue'
import ScenarioPreviewTags from './ScenarioPreviewTags.vue'

/**
 * Страница сценария из данных (`ScenarioPage`): `page` — первый экран, «Зачем нужен осмотр» (описание, пары, метрики), «Как
 * устроена схема», «ИИ-модули и проверки» (ревью 4.8); `card` — карточка в каталоге сценариев. Незаполненное — метки «Не
 * заполнено»: событие `gap` с полем таба. Ставится в тело `AppPreviewBrowser`. Разбор — `index.ts`.
 *
 * Пример: `<AppPreviewBrowser url="example.com/scenarios/osmotr"><ScenarioPreview :page view="page" @gap="toField" /></AppPreviewBrowser>`
 */
const props = withDefaults(defineProps<{
  page: ScenarioPage
  /** `page` — страница сценария; `card` — карточка в каталоге. */
  view?: 'page' | 'card'
  class?: string
}>(), { view: 'page', class: undefined })

const emit = defineEmits<{ gap: [gap: ScenarioGap] }>()

/** Незаполненное пар и метрик — по номеру. */
const numbered = (prefix: 'pair' | 'metric') => computed(() => Object.fromEntries(
  Object.entries(props.page.gaps).filter(([key]) => key.startsWith(`${prefix}:`)).map(([key, gap]) => [Number(key.slice(prefix.length + 1)), gap!]),
))
const pairGaps = numbered('pair')
const metricGaps = numbered('metric')
const heroGaps = computed(() => {
  const g = props.page.gaps
  return { title: g.title, summary: g.summary, image: g.image, price: g.price, tags: g.tags }
})
</script>

<template>
  <div data-slot="scenario-preview" :data-view="props.view" :class="cn('min-h-full bg-site-page text-site-foreground', props.class)">
    <template v-if="props.view === 'page'">
      <ScenarioPreviewHero
        :title="props.page.title"
        :summary="props.page.summary"
        :image="props.page.image"
        :image-alt="props.page.title"
        :price="props.page.price"
        :tags="props.page.tags"
        :action="props.page.action"
        :gaps="heroGaps"
        data-section="hero"
        @gap="emit('gap', $event)"
      />
      <ScenarioPreviewSection title="Зачем нужен осмотр" :description="props.page.description" data-section="why">
        <template v-if="!props.page.description && props.page.gaps.description" #description>
          <ScenarioPreviewGap :label="props.page.gaps.description.label" data-gap="description" @go="emit('gap', props.page.gaps.description)" />
        </template>
        <ScenarioPreviewPairs v-if="props.page.pairs.length" :pairs="props.page.pairs" :gaps="pairGaps" @gap="emit('gap', $event)" />
        <ScenarioPreviewMetrics :metrics="props.page.metrics" :gaps="metricGaps" :empty="props.page.gaps.metrics ?? null" @gap="emit('gap', $event)" />
      </ScenarioPreviewSection>
      <ScenarioPreviewSection title="Как устроена схема" tone="band" data-section="flow">
        <ScenarioPreviewSteps :steps="props.page.steps" />
      </ScenarioPreviewSection>
      <ScenarioPreviewSection v-if="props.page.modules.length || props.page.gaps.modules" title="ИИ-модули и проверки" data-section="modules">
        <ScenarioPreviewTags v-if="props.page.modules.length" size="md" :items="props.page.modules" />
        <ScenarioPreviewGap v-else-if="props.page.gaps.modules" :label="props.page.gaps.modules.label" data-gap="modules" @go="emit('gap', props.page.gaps.modules)" />
      </ScenarioPreviewSection>
    </template>
    <ScenarioPreviewSection v-else title="Сценарии осмотра" data-section="catalog">
      <div class="grid gap-4 @site-wide:grid-cols-3">
        <ScenarioPreviewCard
          :title="props.page.title"
          :summary="props.page.summary"
          :image="props.page.image"
          :image-alt="props.page.title"
          :price="props.page.price"
          :tags="props.page.tags"
          :gaps="heroGaps"
          @gap="emit('gap', $event)"
        />
      </div>
    </ScenarioPreviewSection>
  </div>
</template>
