<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import ReadinessMark from './ReadinessMark.vue'
import type { ReadinessMarkState } from '.'

/**
 * Чип готовности у главного действия — «Готовность N из 5» либо «Проверка: N», по нажатию — поповер: заголовок, сводка,
 * содержимое слотом (`ReadinessList`), подвал слотом; семейство «Модель готовности», такт 91. Разбор — `index.ts`.
 *
 * Пример: `<ReadinessChip v-model:open="open" label="Готовность 2 из 5" state="blocked" :count="1" title="Готовность к публикации"
 * summary="2 из 5 этапов · блокирует публикацию: 1"><ReadinessList … /></ReadinessChip>`
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label: string
  /** Маркер чипа перед подписью; пусто — маркера нет. */
  state?: ReadinessMarkState | ''
  count?: number
  /** Заголовок поповера. */
  title: string
  /** Сводка под заголовком. */
  summary?: string
  open?: boolean
  class?: string
}>(), { state: '', count: 0, summary: '', open: undefined })

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <Popover :open="props.open" @update:open="emit('update:open', $event)">
    <PopoverTrigger as-child>
      <button
        v-bind="$attrs"
        type="button"
        data-slot="readiness-chip"
        :data-state-mark="props.state || undefined"
        :class="cn(
          'group/chip inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium whitespace-nowrap text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
          props.class,
        )"
        :style="{ transitionDuration: 'var(--duration-hover)' }"
      >
        <ReadinessMark v-if="props.state" :state="props.state" :count="props.count" />
        <span data-slot="readiness-chip-label">{{ props.label }}</span>
        <Icon name="chevron-down" :size="12" class="text-foreground-secondary transition-transform group-data-[state=open]/chip:rotate-180" />
      </button>
    </PopoverTrigger>
    <!-- Узкий экран (такт 92): поповер во всю ширину окна — `narrow="full"` у `PopoverContent`. -->
    <PopoverContent data-readiness-popover align="end" :side-offset="8" :width="400" narrow="full" class="flex max-h-[70vh] flex-col">
      <div class="flex flex-col gap-1 px-4 pt-4 pb-3">
        <p data-slot="readiness-popover-title" class="m-0 text-lg font-bold text-foreground">
          {{ props.title }}
        </p>
        <p v-if="props.summary" data-slot="readiness-popover-summary" class="m-0 text-xs text-foreground-secondary">
          {{ props.summary }}
        </p>
      </div>
      <div class="min-h-0 overflow-y-auto px-4 pb-4">
        <slot />
      </div>
      <div v-if="$slots.footer" data-slot="readiness-popover-footer" class="flex items-center gap-4 border-t border-border-soft px-4 py-3">
        <slot name="footer" />
      </div>
    </PopoverContent>
  </Popover>
</template>
