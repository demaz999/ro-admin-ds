<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { cn } from '@/lib/utils'
import { stepThumbVariants, type StepThumbState } from '.'

/**
 * Миниатюра кадра внутри шага — спека VA-9265 §9.6, §9.7, прототип v17 `.th`.
 * Такт 30, разбор — `docs/free-shoot.md`, раздел 2.1.
 *
 * | `state` | рамка | значок в углу | открепить |
 * |---|---|---|---|
 * | `free` | `--border-soft` | — | да |
 * | `suggested` | `--warning` | — | да |
 * | `locked` | `--border-secondary` | замок на `--muted-foreground` | нет |
 * | `from-step` | `--primary` | камера на `--primary` | нет |
 * | `rejected` | `--destructive`, перечёркнута | — | нет |
 *
 * `rejected` — **допущение прототипа** (спека §20.5, вопрос к Core): отклонённый
 * кадр остаётся в истории шага перечёркнутым. Если Core выберет возврат в ленту,
 * состояние просто перестанет приходить.
 *
 * ## Наведение: крестик по центру, остальное открывает
 *
 * В прототипе заливка с крестиком накрывает миниатюру целиком, и клик по
 * свободной миниатюре всегда открепляет — открыть её кликом (§9.7) нельзя.
 * Здесь заливка `--scrim-dark` только рисуется, а целей две: крестик 16 по
 * центру открепляет, остальная площадь открывает кадр. Отклонение записано в
 * «Итоге сборки» разбора. Красная заливка прототипа заменена тёмной по правилу
 * «цвет по роли»: открепление обратимо (§10.6), это не удаление.
 */
const props = withDefaults(defineProps<{
  src: string
  alt?: string
  state?: StepThumbState
  /** Подсказка; без неё — текст прототипа по состоянию. */
  reason?: string
  /** Найдена переходом «Показать в структуре» (§15.3). */
  located?: boolean
  /**
   * Оснастка приёмки: вид наведения без курсора. Headless-браузер не наводит
   * курсор, а стенду нужна колонка «наведение». В продукт не идёт.
   */
  demoHover?: boolean
  class?: string
}>(), {
  alt: '',
  state: 'free',
  reason: '',
  located: false,
  demoHover: false,
})

const emit = defineEmits<{ open: []; remove: [] }>()

/** Тексты подсказок — прототип v17, `stepHTML`. */
const REASON: Record<StepThumbState, string> = {
  'free': 'Из свободной съёмки',
  'suggested': 'Из свободной съёмки',
  'locked': 'Привязано до вас и проверено — изменить нельзя',
  'from-step': 'Снято в шаге при обычном осмотре — изменить нельзя',
  'rejected': 'Отклонён проверяющим — остаётся в истории шага',
}

const hint = computed(() => props.reason || REASON[props.state])
const removable = computed(() => props.state === 'free' || props.state === 'suggested')
</script>

<template>
  <div
    data-slot="step-thumb"
    :data-state="props.state"
    :class="cn(stepThumbVariants({ state: props.state, located: props.located }), props.class)"
  >
    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          data-slot="step-thumb-open"
          :aria-label="`Открыть кадр. ${hint}`"
          class="block size-full outline-none"
          @click="emit('open')"
        >
          <img
            :src="props.src"
            :alt="props.alt"
            class="size-full bg-muted object-cover"
            :class="props.state === 'rejected' ? 'grayscale opacity-[var(--opacity-disabled)]' : ''"
          >
        </button>
      </TooltipTrigger>
      <TooltipContent>{{ hint }}</TooltipContent>
    </Tooltip>

    <!-- Перечёркивание отклонённого — диагональ самой миниатюры, из угла в угол. -->
    <svg
      v-if="props.state === 'rejected'"
      class="pointer-events-none absolute inset-0 size-full text-destructive"
      viewBox="0 0 36 27"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" y1="27" x2="36" y2="0" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>

    <span
      v-if="props.state === 'locked' || props.state === 'from-step'"
      data-slot="step-thumb-badge"
      class="pointer-events-none absolute right-0 bottom-0 flex items-center justify-center rounded-tl-2xs px-0.5 py-px text-primary-foreground"
      :class="props.state === 'locked' ? 'bg-muted-foreground' : 'bg-primary'"
    >
      <Icon :name="props.state === 'locked' ? 'lock' : 'photo-camera'" :size="8" />
    </span>

    <template v-if="removable">
      <span class="pointer-events-none absolute inset-0 bg-scrim-dark transition-opacity group-hover/thumb:opacity-100" :class="props.demoHover ? 'opacity-100' : 'opacity-0'" :style="{ transitionDuration: 'var(--duration-hover)' }" />
      <button
        type="button"
        data-slot="step-thumb-remove"
        aria-label="Открепить"
        class="absolute top-1/2 left-1/2 flex size-4 -translate-1/2 items-center justify-center text-primary-foreground outline-none group-hover/thumb:opacity-100 focus-visible:opacity-100"
        :class="props.demoHover ? 'opacity-100' : 'opacity-0'"
        @click.stop="emit('remove')"
      >
        <Icon name="close" :size="12" />
      </button>
    </template>
  </div>
</template>
