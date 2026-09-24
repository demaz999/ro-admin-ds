<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '../icon'
import { TooltipProvider } from '../tooltip'
import { cn } from '@/lib/utils'
import StepThumb from './StepThumb.vue'
import {
  STEP_THUMBS_MAX,
  stepCounterText,
  stepCounterTone,
  stepCounterVariants,
  stepFill,
  stepKeyClass,
  stepKindText,
  stepNeedText,
  stepRowVariants,
  type StepThumbItem,
  type StepVerdict,
} from '.'

/**
 * Строка шага панели структуры — такт 30. Оси и правила — в `index.ts`,
 * разбор с замерами — `docs/free-shoot.md`, раздел 2.
 */
const props = withDefaults(defineProps<{
  name: string
  required?: boolean
  /** «Фото» / «Видео» в требовании (`step.need.*`). */
  kind?: 'photo' | 'video'
  min?: number
  max?: number | null
  /** Кадров в шаге без отклонённых (§4.2). */
  count: number
  /** Сколько из `count` защищено — «· N из них было до вас». */
  wasCount?: number
  instruction?: string
  /** Номер клавиши 1–8; страница передаёт только у текущего объекта (§16.3). */
  hotkey?: number | null
  verdict?: StepVerdict | null
  thumbs?: StepThumbItem[]
  /** Миниатюра, найденная переходом, — обводка (§15.3). */
  locatedThumb?: string | number | null
  /** Кадр этого шага под курсором в ленте (§15.1). */
  highlighted?: boolean
  /** Над строкой тянут выделение (§9.5). У заполненного и замороженного не действует. */
  dropTarget?: boolean
  /** Смена значения запускает вспышку 1.5 с (§15.3, решение владельца 7). */
  flash?: number | null
  /**
   * Оснастка приёмки: вид наведения без курсора. Headless-браузер не наводит
   * курсор, а стенду нужна колонка «наведение». В продукт не идёт.
   */
  demoHover?: boolean
  class?: string
}>(), {
  required: false,
  kind: 'photo',
  min: 0,
  max: null,
  wasCount: 0,
  instruction: '',
  hotkey: null,
  verdict: null,
  thumbs: () => [],
  locatedThumb: null,
  highlighted: false,
  dropTarget: false,
  flash: null,
  demoHover: false,
})

const emit = defineEmits<{
  'thumb-open': [id: string | number]
  'thumb-remove': [id: string | number]
  /** Хвост «+N» — страница решает, что показать (решение владельца 8). */
  more: []
}>()

/** Вспышка идёт — см. ниже, у `watch` на `flash`. */
const flashing = ref(false)

const frozen = computed(() => props.verdict?.kind === 'ok')
const redo = computed(() => props.verdict?.kind === 'redo')
const fill = computed(() => stepFill(props.count, props.min, props.max, props.required))
/** «Заполнен по лимиту»: приём выключен. Переполнение его перебивает (решение 5). */
const full = computed(() => fill.value === 'full' && !frozen.value)
const acceptsDrop = computed(() => !frozen.value && fill.value !== 'full' && fill.value !== 'over')

const tone = computed(() => {
  if (props.dropTarget && acceptsDrop.value) return 'drop'
  if (flashing.value) return 'default'
  if (props.highlighted) return 'highlighted'
  if (fill.value === 'over' && !frozen.value) return 'over'
  if (frozen.value) return 'frozen'
  if (redo.value) return 'redo'
  return 'default'
})

const counterTone = computed(() => stepCounterTone(fill.value, frozen.value))
const counterText = computed(() => stepCounterText(props.count, props.min, props.max))
const kindText = computed(() => stepKindText(props.kind))
const needText = computed(() => stepNeedText(props.min, props.max))

/**
 * Правило такта 33: пилюля на строке своего тона стоит на `--card`. Тон строки
 * «переполнен» — `--destructive-surface`, «Повторить» — `--warning-surface`; пилюля
 * того же тона на них сливается.
 */
const counterSurface = computed(() => {
  const same = (tone.value === 'over' && counterTone.value === 'error')
    || (tone.value === 'redo' && counterTone.value === 'warning')
  return same ? 'card' as const : 'tone' as const
})

const missing = computed(() => (frozen.value ? 0 : Math.max(0, props.min - props.count)))

/** Хвост строки лимитов — `step.left` / `step.more` / `step.enough` (§18). */
const tail = computed(() => {
  if (missing.value) return { text: `не хватает ${missing.value}`, left: true }
  if (!props.count) return null
  if (props.max != null) {
    const more = props.max - props.count
    return more > 0 ? { text: `можно ещё ${more}`, left: false } : null
  }
  return { text: 'минимум набран', left: false }
})

const showWas = computed(() => props.wasCount > 0 && props.wasCount < props.count)
const slots = computed(() => Math.min(missing.value, STEP_THUMBS_MAX))
const visibleThumbs = computed(() => props.thumbs.slice(0, STEP_THUMBS_MAX))
const hiddenThumbs = computed(() => Math.max(0, props.thumbs.length - STEP_THUMBS_MAX))
const showKey = computed(() => props.hotkey != null && !frozen.value)

/**
 * Вспышка. Компонент сам держит 1.5 с и сам её снимает: страница только выдаёт
 * новое число. Повторная вспышка на том же шаге перезапускает анимацию —
 * ключ узла меняется вместе с `flash`.
 */
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => props.flash, (value) => {
  if (value == null) return
  clearTimeout(timer)
  flashing.value = true
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-flash')) * 1000 || 1500
  timer = setTimeout(() => { flashing.value = false }, ms)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
      :key="flashing ? `flash-${props.flash}` : 'rest'"
      data-slot="step-row"
      :data-fill="fill"
      :data-verdict="props.verdict?.kind ?? 'none'"
      :data-accepts-drop="acceptsDrop"
      :class="cn(
        stepRowVariants({ tone, dimmed: full }),
        props.demoHover && tone === 'default' ? 'bg-accent' : '',
        flashing ? 'animate-step-flash motion-reduce:animate-none motion-reduce:bg-secondary-hover' : '',
        props.class,
      )"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    >
      <div class="flex min-h-4 items-center gap-2">
        <!-- Номер клавиши; без номера — пустое место той же ширины, строки не пляшут. -->
        <span
          v-if="showKey"
          data-slot="step-row-key"
          :class="stepKeyClass"
        >{{ props.hotkey }}</span>
        <span v-else class="size-4 shrink-0" aria-hidden="true" />

        <span
          data-slot="step-row-name"
          class="min-w-0 flex-1 text-xs font-medium"
          :class="frozen ? 'text-foreground-secondary' : 'text-foreground'"
        >
          {{ props.name }}<span v-if="props.required" class="text-destructive"> *</span>
          <span v-if="full" class="text-2xs font-medium text-success-strong"> · заполнен</span>
        </span>

        <span data-slot="step-row-counter" :class="stepCounterVariants({ tone: counterTone, surface: counterSurface })">
          {{ counterText }}
        </span>
      </div>

      <div
        v-if="!frozen"
        data-slot="step-row-limits"
        class="mt-1 flex flex-wrap gap-x-1.5 pl-6 text-2xs text-muted-foreground"
      >
        <span class="font-medium text-foreground">{{ kindText }} · {{ needText }}</span>
        <span v-if="tail" :class="tail.left ? 'font-medium text-warning-strong' : ''">{{ tail.text }}</span>
        <span v-if="showWas">· {{ props.wasCount }} из них было до вас</span>
      </div>

      <div
        v-if="frozen"
        data-slot="step-row-verdict"
        class="mt-1 flex items-start gap-1 pl-6 text-2xs font-medium text-muted-foreground"
      >
        <Icon name="lock" :size="12" class="mt-0.5" />
        <span>Проверен и закрыт {{ props.verdict?.at }}<span class="font-normal"> · содержимое изменить нельзя</span></span>
      </div>
      <div
        v-else-if="redo"
        data-slot="step-row-verdict"
        class="mt-1 flex items-start gap-1 pl-6 text-2xs font-medium text-warning-strong"
      >
        <Icon name="refresh" :size="12" class="mt-0.5" />
        <span>«Повторить» от {{ props.verdict?.at }}<span class="font-normal"> · {{ props.verdict?.note || 'нужно переснять' }}</span></span>
      </div>

      <p
        v-if="props.instruction && !frozen"
        data-slot="step-row-instruction"
        class="mt-1 pl-6 text-2xs text-foreground-secondary"
      >
        {{ props.instruction }}
      </p>

      <!-- Провайдер подсказок внутри, а не корнем: безрендерный корень съел бы
           обработчики и атрибуты, которые страница вешает на строку. -->
      <TooltipProvider v-if="visibleThumbs.length">
      <div
        data-slot="step-row-thumbs"
        class="mt-1.5 flex flex-wrap items-center gap-1 pl-6"
      >
        <StepThumb
          v-for="thumb in visibleThumbs"
          :key="thumb.id"
          :src="thumb.src"
          :state="thumb.state"
          :reason="thumb.reason"
          :located="thumb.id === props.locatedThumb"
          @open="emit('thumb-open', thumb.id)"
          @remove="emit('thumb-remove', thumb.id)"
        />
        <button
          v-if="hiddenThumbs"
          type="button"
          data-slot="step-row-more"
          class="px-1 text-2xs text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
          @click="emit('more')"
        >
          +{{ hiddenThumbs }}
        </button>
      </div>
      </TooltipProvider>

      <div
        v-if="slots"
        data-slot="step-row-slots"
        class="mt-1.5 flex flex-wrap gap-1 pl-6"
        aria-hidden="true"
      >
        <span
          v-for="n in slots"
          :key="n"
          class="w-9 rounded-xs border border-dashed aspect-4/3"
          :class="props.required ? 'border-destructive-disabled bg-destructive-surface' : 'border-stroke-secondary bg-accent'"
        />
      </div>
  </div>
</template>
