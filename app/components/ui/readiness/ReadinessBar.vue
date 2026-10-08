<script setup lang="ts">
import { cn } from '@/lib/utils'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import ReadinessStage from './ReadinessStage.vue'
import type { ReadinessStageItem } from '.'

/**
 * Полоса подготовки — «Подготовка схемы: N из 5 · Далее: … →», этапы кнопками со статусом, «Свернуть»; семейство «Модель
 * готовности», такт 91. Разбор — `index.ts`.
 *
 * Пример: `<ReadinessBar title="Подготовка схемы: 2 из 5" :stages next-label="Далее: Съёмка →" current="form" @select @next @collapse />`
 */
const props = withDefaults(defineProps<{
  /** Заголовок со счётом: «Подготовка схемы: 2 из 5». */
  title: string
  stages: ReadinessStageItem[]
  /** Текущий этап — место на странице. */
  current?: string
  /** Подпись перехода к следующему этапу; пусто — перехода нет. */
  nextLabel?: string
  /** Подпись кнопки «Свернуть» для чтения с экрана. */
  collapseLabel?: string
  class?: string
}>(), { current: '', nextLabel: '', collapseLabel: 'Свернуть полосу подготовки' })

const emit = defineEmits<{ select: [id: string], next: [], collapse: [] }>()
</script>

<template>
  <nav data-slot="readiness-bar" :aria-label="props.title" :class="cn('flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-secondary px-4 py-3', props.class)">
    <p data-slot="readiness-bar-title" class="m-0 text-sm font-bold text-foreground">
      {{ props.title }}
    </p>
    <ButtonAction v-if="props.nextLabel" strong :show-icon="false" data-readiness-next @click="emit('next')">
      {{ props.nextLabel }}
    </ButtonAction>
    <div data-slot="readiness-bar-stages" class="flex flex-wrap items-center gap-2 xl:ml-auto">
      <ReadinessStage
        v-for="s in props.stages"
        :key="s.id"
        :label="s.label"
        :state="s.state"
        :count="s.count"
        :reason="s.reason"
        :current="s.id === props.current"
        :data-stage="s.id"
        @click="emit('select', s.id)"
      />
    </div>
    <IconButton variant="service" size="sm" :label="props.collapseLabel" data-readiness-collapse @click="emit('collapse')">
      <Icon name="chevron-up" :size="16" />
    </IconButton>
  </nav>
</template>
