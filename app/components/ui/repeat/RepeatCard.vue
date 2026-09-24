<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '../badge'
import { Button } from '../button'
import { Icon } from '../icon'
import { StageNote } from '../stage'
import { stepCounterVariants } from '../step-row'
import { cn } from '@/lib/utils'
import { repeatHeaderVariants } from '.'

/**
 * Карточка повтора: заголовок и раскрываемое тело. Разбор — в `index.ts`.
 *
 * Клик по заголовку — событие `header`: сделать повтор текущим или свернуть — логика
 * страницы (§9.3). Принять и отклонить — события `accept` и `reject` (§13.3–13.4).
 */
const props = withDefaults(defineProps<{
  /** Имя повтора: марка оборудования или номер здания. */
  name: string
  /** Реквизиты строкой под именем; пусто — «реквизиты не заполнены». */
  details?: string
  /** Число кадров в повторе — справа. */
  frames?: number
  open?: boolean
  current?: boolean
  /** Создан автоматом и не принят (§13.1). */
  suggested?: boolean
  /** Сколько шагов заморожено проверкой (§6.2). */
  checkedSteps?: number
  /** Сколько обязательных шагов пусты или переполнены. */
  errors?: number
  /** Кадр этого повтора под курсором в ленте (§15.1). */
  highlighted?: boolean
  /** Скрыто проверенных шагов фильтром «Только открытые» (§9.2). */
  hiddenSteps?: number
  /** Оснастка приёмки: вид наведения без курсора. В продукт не идёт. */
  demoHover?: boolean
  class?: string
}>(), {
  details: '',
  frames: 0,
  open: false,
  current: false,
  suggested: false,
  checkedSteps: 0,
  errors: 0,
  highlighted: false,
  hiddenSteps: 0,
  demoHover: false,
})

const emit = defineEmits<{ header: []; accept: []; reject: [] }>()

/*
 * Порядок побед — как в CSS прототипа, где правила одной специфичности и побеждает нижнее:
 * `.obj.auto>.obj-h` (фон предложенного) < `.obj.cur>.obj-h` (фон и полоса текущего) <
 * `.obj.hl>.obj-h` (полоса подсветки). Такт 32 записал обратное — исправлено тактом 33.
 */
const tone = computed(() => (props.current ? 'current' : props.suggested ? 'suggested' : 'default'))
const rail = computed(() => (props.highlighted ? 'highlighted' : props.current ? 'current' : 'none'))
</script>

<template>
  <div
    data-slot="repeat-card"
    :data-state="props.open ? 'open' : 'closed'"
    :class="cn('border-b border-border-soft', props.class)"
  >
    <button
      type="button"
      data-slot="repeat-header"
      :aria-expanded="props.open"
      :class="cn(repeatHeaderVariants({ tone, rail }), props.demoHover && tone === 'default' ? 'bg-accent' : '')"
      :style="{ transitionProperty: 'background-color', transitionDuration: 'var(--duration-hover)' }"
      @click="emit('header')"
    >
      <span class="flex min-w-0 flex-1 flex-col">
        <span
          data-slot="repeat-name"
          class="truncate text-xs font-medium"
          :class="props.checkedSteps ? 'text-foreground-secondary' : 'text-foreground'"
        >{{ props.name }}</span>
        <span data-slot="repeat-details" class="truncate text-2xs text-muted-foreground">{{ props.details || 'реквизиты не заполнены' }}</span>
      </span>
      <!-- Правило такта 33: на заголовке предложенного (та же мягкая ступень) пилюля — на --card; у текущего фон свой, пилюля в своей заливке. -->
      <span v-if="props.suggested" :class="stepCounterVariants({ tone: 'warning', surface: tone === 'suggested' ? 'card' : 'tone' })">предложено</span>
      <span v-if="props.checkedSteps" :class="cn(stepCounterVariants({ tone: 'frozen' }), 'gap-1')">
        <Icon name="lock" :size="10" />{{ props.checkedSteps }} проверено
      </span>
      <Badge v-if="props.current" size="sm">текущий</Badge>
      <span v-if="props.errors" :class="stepCounterVariants({ tone: 'error' })">{{ props.errors }}</span>
      <span data-slot="repeat-frames" class="shrink-0 text-2xs text-muted-foreground tabular-nums">{{ props.frames }}</span>
    </button>

    <div v-if="props.open" data-slot="repeat-body" class="flex flex-col gap-2 bg-card px-1.5 pt-1 pb-2">
      <div
        v-if="props.suggested"
        data-slot="repeat-review"
        class="flex flex-wrap items-center gap-2 border-b border-border-soft px-0.5 pb-2"
      >
        <Button size="sm" @click="emit('accept')">Принять объект</Button>
        <Button variant="secondary" size="sm" @click="emit('reject')">Отклонить</Button>
        <span class="text-2xs text-muted-foreground">кадры примутся вместе с объектом</span>
      </div>
      <slot name="form" />
      <div data-slot="repeat-steps" class="flex flex-col gap-0.5">
        <slot />
      </div>
      <StageNote v-if="props.hiddenSteps">Скрыто проверенных шагов: {{ props.hiddenSteps }}</StageNote>
    </div>
  </div>
</template>
