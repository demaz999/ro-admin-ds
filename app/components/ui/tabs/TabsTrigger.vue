<script setup lang="ts">
import { TabsTrigger } from 'reka-ui'
import { computed, onMounted, onUpdated, ref } from 'vue'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { tabsTriggerReasonVariants, tabsTriggerVariants, type TabsTriggerVariants } from '.'

/**
 * Вкладка — мастер `_Tab` `1772:11731`.
 *
 * У вида `line` индикатор — полоса 4px под текстом, радиусом 2, **по ширине
 * текста**, а не всей вкладки: во вкладке 85 из них 63 занимает внутренний
 * столбец, остальное счётчик и зазор.
 *
 * Индикатор виден только у активной. Это измерено, а не выведено: у трёх
 * неактивных состояний узел линии помечен видимым, но не отрисовывает ничего.
 *
 * С такта 47 вид `line` — по VaTabs фронтов: подложка и полоса активной — у списка (`TabsIndicator`), разбор — `index.ts`.
 *
 * Такт 73 — причина выключения (`reason`): выключенная вкладка событий не получает, поэтому причину держит обёртка
 * самой вкладки — фокус с клавиатуры, кольцо кита, подсказка. Атрибуты потребителя (`data-*`, `class`) ложатся на
 * вкладку и в этом случае: корень шаблона — безрендерный провайдер подсказки.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  value: string
  variant?: NonNullable<TabsTriggerVariants['variant']>
  disabled?: boolean
  /** Счётчик вкладки (VaTabs, такт 47): число показывается и при 0. Не задан — счётчика нет. */
  count?: number | string
  /** Причина выключения (такт 73): у выключенной вкладки — подсказка, фокус с клавиатуры и кольцо кита. Без `disabled` не действует. */
  reason?: string
}>(), {
  variant: 'line',
  disabled: false,
  count: undefined,
  reason: undefined,
})

const locked = computed(() => props.disabled && !!props.reason)

/* Имя обёртки для чтения с экрана — «подпись вкладки: причина»; подпись читается из отрисованной вкладки. */
const inner = ref<{ $el?: HTMLElement } | null>(null)
const label = ref('')
function readLabel() {
  const text = inner.value?.$el?.textContent?.trim() ?? ''
  if (text !== label.value) label.value = text
}
onMounted(readLabel)
onUpdated(readLabel)
const reasonLabel = computed(() => (label.value ? `${label.value}: ${props.reason}` : props.reason))
</script>

<template>
  <TooltipProvider v-if="locked">
    <Tooltip>
      <TooltipTrigger as-child>
        <span
          data-slot="tabs-trigger-reason"
          tabindex="0"
          :aria-label="reasonLabel"
          :class="tabsTriggerReasonVariants({ variant })"
        >
          <TabsTrigger
            ref="inner"
            v-bind="$attrs"
            :value="props.value"
            disabled
            data-slot="tabs-trigger"
            :class="cn(tabsTriggerVariants({ variant }))"
          >
            <slot />
            <span
              v-if="props.count !== undefined"
              data-slot="tabs-counter"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-foreground-secondary"
            >{{ props.count }}</span>
            <slot name="counter" />
          </TabsTrigger>
        </span>
      </TooltipTrigger>
      <TooltipContent class="max-w-80 whitespace-normal">
        {{ props.reason }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <TabsTrigger
    v-else
    v-bind="$attrs"
    :value="props.value"
    :disabled="props.disabled"
    data-slot="tabs-trigger"
    :class="cn(tabsTriggerVariants({ variant }))"
  >
    <slot />
    <span
      v-if="props.count !== undefined"
      data-slot="tabs-counter"
      class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-foreground-secondary"
    >{{ props.count }}</span>

    <!-- Счётчик стоит вне столбца с линией — так в мастере. -->
    <slot name="counter" />
  </TabsTrigger>
</template>
