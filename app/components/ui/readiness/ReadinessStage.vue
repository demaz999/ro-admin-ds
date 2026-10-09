<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import ReadinessMark from './ReadinessMark.vue'
import type { ReadinessMarkState } from '.'

/**
 * Этап полосы подготовки — кнопка-пилюля с маркером; семейство «Модель готовности», такт 91. Разбор — `index.ts`.
 *
 * Этап с замком (`locked`) нажимается: `aria-disabled`, нажатие сообщает выбор — потребитель отвечает причиной; причина видна
 * подсказкой по наведению и фокусу. Текущий этап — `aria-current="step"`.
 *
 * Пример: `<ReadinessStage label="Съёмка" state="warning" :count="2" current @click="go('shooting')" />`
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  label: string
  state: ReadinessMarkState
  count?: number
  /** Текущий этап — место, где пользователь сейчас. */
  current?: boolean
  /** Причина замка — подсказка. */
  reason?: string
  class?: string
}>(), { count: 0, current: false, reason: '' })

const emit = defineEmits<{ click: [] }>()

const locked = computed(() => props.state === 'locked')
/** Готово, готово к публикации (такт 92) и замок — маркер перед подписью, «! N» — после: так читается строка чек-листа. */
const before = computed(() => props.state === 'done' || props.state === 'ready' || locked.value)
const after = computed(() => props.state === 'warning' || props.state === 'blocked')
</script>

<template>
  <TooltipProvider>
    <Tooltip :disabled="!props.reason">
      <TooltipTrigger as-child>
        <button
          v-bind="$attrs"
          type="button"
          data-slot="readiness-stage"
          :data-state="props.state"
          :data-current="props.current || undefined"
          :aria-current="props.current ? 'step' : undefined"
          :aria-disabled="locked ? 'true' : undefined"
          :class="cn(
            'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            props.current ? 'border-primary text-primary' : 'border-border',
            !props.current && (locked ? 'text-foreground-secondary' : 'text-foreground'),
            props.class,
          )"
          :style="{ transitionDuration: 'var(--duration-hover)' }"
          @click="emit('click')"
        >
          <ReadinessMark v-if="before" :state="props.state" :label="locked ? '' : undefined" />
          <span>{{ props.label }}</span>
          <ReadinessMark v-if="after" :state="props.state" :count="props.count" />
          <span v-if="locked && props.reason" class="sr-only">: {{ props.reason }}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent v-if="props.reason" class="max-w-80 whitespace-normal">
        {{ props.reason }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
