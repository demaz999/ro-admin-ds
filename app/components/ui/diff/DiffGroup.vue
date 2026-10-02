<script setup lang="ts">
import type { DiffChangeItem, DiffKind } from '.'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import { ButtonAction } from '../button-action'
import DiffChange from './DiffChange.vue'
import { DIFF_KIND_LABEL, DIFF_TONE_CLASS } from '.'

/**
 * Группа изменений одного вида внутри области: «Добавлено · Изменено · Удалено» со счётчиком. Длинный список
 * показывает первые `limit` строк и «Показать ещё N». Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  kind: DiffKind
  items?: DiffChangeItem[]
  /** Сколько строк видно до «Показать ещё». */
  limit?: number
}>(), { items: () => [], limit: 5 })

const all = ref(false)
const shown = computed(() => (all.value ? props.items : props.items.slice(0, props.limit)))
const rest = computed(() => props.items.length - shown.value.length)
</script>

<template>
  <div data-slot="diff-group" :data-kind="props.kind" class="flex flex-col gap-1.5">
    <p data-slot="diff-group-title" :class="cn('m-0 text-xs font-bold', DIFF_TONE_CLASS[props.kind])">
      {{ DIFF_KIND_LABEL[props.kind] }} · {{ props.items.length }}
    </p>
    <slot>
      <DiffChange v-for="(c, k) in shown" :key="k" :kind="props.kind" :label="c.label" :before="c.before" :after="c.after" :effect="c.effect" />
    </slot>
    <ButtonAction v-if="rest > 0" size="sm" :show-icon="false" data-slot-more @click="all = true">
      Показать ещё {{ rest }}
    </ButtonAction>
  </div>
</template>
