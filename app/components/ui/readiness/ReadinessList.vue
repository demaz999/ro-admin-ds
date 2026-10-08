<script setup lang="ts">
import { cn } from '@/lib/utils'
import { ButtonAction } from '../button-action'
import { Checkbox } from '../checkbox'
import ReadinessCheck from './ReadinessCheck.vue'
import ReadinessMark from './ReadinessMark.vue'
import type { ReadinessGroupItem } from '.'

/**
 * Список готовности — этапы либо области с проверками; семейство «Модель готовности», такт 91. Разбор — `index.ts`.
 *
 * Группа — маркер, название, пояснение и переход к месту группы; ниже — проверки строками с «Исправить» и ручная отметка
 * этапа флажком. Один список — в поповере чипа, в окне первой публикации и над диффом публикации.
 *
 * Пример: `<ReadinessList :groups="stages" @go="goStage" @fix="fixCheck" @manual="(id, v) => setRulesChecked(v)" />`
 */
const props = withDefaults(defineProps<{
  groups: ReadinessGroupItem[]
  class?: string
}>(), {})

const emit = defineEmits<{ go: [id: string], fix: [key: string], manual: [id: string, value: boolean] }>()
</script>

<template>
  <div data-slot="readiness-list" :class="cn('flex flex-col', props.class)">
    <section
      v-for="g in props.groups"
      :key="g.id"
      data-slot="readiness-group"
      :data-readiness-group="g.id"
      :data-state="g.state"
      class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 [[data-slot=readiness-group]+&]:border-t [[data-slot=readiness-group]+&]:border-border-soft"
    >
      <div class="flex items-start gap-2">
        <span class="flex h-5 w-4 shrink-0 items-center justify-center">
          <ReadinessMark :state="g.state" :count="g.count" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span data-slot="readiness-group-title" class="text-sm font-bold text-foreground">{{ g.title }}</span>
          <span v-if="g.meta" data-slot="readiness-group-meta" class="text-xs text-foreground-secondary">{{ g.meta }}</span>
        </span>
        <ButtonAction v-if="g.action" size="sm" :show-icon="false" data-readiness-go @click="emit('go', g.id)">
          {{ g.action }}
        </ButtonAction>
      </div>
      <div v-if="g.manual" class="pl-6">
        <Checkbox :model-value="g.manual.checked" data-readiness-manual @update:model-value="emit('manual', g.id, !!$event)">
          {{ g.manual.label }}
        </Checkbox>
      </div>
      <ul v-if="g.checks.length" class="m-0 flex list-none flex-col p-0 pl-6">
        <ReadinessCheck
          v-for="c in g.checks"
          :key="c.key"
          :level="c.level"
          :text="c.text"
          :area="c.area"
          :action="c.action"
          :data-check="c.key"
          @fix="emit('fix', c.key)"
        />
      </ul>
    </section>
  </div>
</template>
