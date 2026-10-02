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
 * ## Наведение: две половины — такт 58, решение владельца 2026-10-02
 *
 * На наведении миниатюра делится пополам: левая половина — «глаз», открывает кадр в просмотре; правая — крестик,
 * открепляет. У кадра, который открепить нельзя (`locked`, `from-step`, `rejected`), крестика нет — вся миниатюра
 * «глаз». Подложка — `--scrim-dark`; половина под курсором показывает глиф в полную силу, соседняя — на ступени
 * `--opacity-icon-muted`. Открепление обратимо (§10.6) — красного нет.
 *
 * Геометрия на целых пикселях: миниатюра 80 × 60, рамка — слой поверх картинки (в раскладке не участвует), половины
 * по 40 × 60. Глифы — официальная выгрузка Material в родной сетке 24: «глаз» `visibility` (контур 880 × 600 из 960) —
 * 22 × 15, крестик `close` (контур 560) — 14 × 14. «Глаз» нечётной высоты стоит в половине с полем 1 снизу — на целом
 * пикселе.
 *
 * До такта 58 (такт 30): крестик 16 по центру открепляет, остальная площадь открывает кадр.
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
   * Оснастка приёмки: вид наведения без курсора — `true` или `'open'` — курсор на «глазе», `'remove'` — на крестике.
   * Headless-браузер не наводит курсор, а стенду нужна колонка «наведение». В продукт не идёт.
   */
  demoHover?: boolean | 'open' | 'remove'
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
/** Глиф половины: под курсором — в полную силу, у соседней — приглушён. */
const glyph = (half: 'open' | 'remove') => {
  if (!props.demoHover) return 'opacity-[var(--opacity-icon-muted)] group-hover/half:opacity-100 group-focus-visible/half:opacity-100'
  const on = props.demoHover === true ? 'open' : props.demoHover
  return on === half ? 'opacity-100' : 'opacity-[var(--opacity-icon-muted)]'
}
</script>

<template>
  <div
    data-slot="step-thumb"
    :data-state="props.state"
    :data-located="props.located || undefined"
    :class="cn(stepThumbVariants({ state: props.state, located: props.located }), props.class)"
  >
    <img
      :src="props.src"
      :alt="props.alt"
      class="size-full bg-muted object-cover"
      :class="props.state === 'rejected' ? 'grayscale opacity-[var(--opacity-disabled)]' : ''"
    >

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
      class="pointer-events-none absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-xs bg-field-elevated shadow-on-image transition-opacity group-hover/thumb:opacity-0"
      :class="[props.state === 'locked' ? 'text-muted-foreground' : 'text-primary', props.demoHover ? 'opacity-0' : '']"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    >
      <Icon :name="props.state === 'locked' ? 'lock' : 'photo-camera'" :size="12" />
    </span>

    <!-- Слой наведения: половины-кнопки на подложке `--scrim-dark`; виден на наведении и при фокусе с клавиатуры. -->
    <div
      data-slot="step-thumb-actions"
      class="absolute inset-0 flex bg-scrim-dark text-primary-foreground transition-opacity group-hover/thumb:opacity-100 focus-within:opacity-100"
      :class="props.demoHover ? 'opacity-100' : 'opacity-0'"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    >
      <Tooltip>
        <TooltipTrigger as-child>
          <button
            type="button"
            data-slot="step-thumb-open"
            :aria-label="`Открыть кадр. ${hint}`"
            class="group/half flex h-full min-w-0 flex-1 items-center justify-center pb-px outline-none"
            @click="emit('open')"
          >
            <Icon name="visibility" :size="22" :class="glyph('open')" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{{ hint }}</TooltipContent>
      </Tooltip>
      <button
        v-if="removable"
        type="button"
        data-slot="step-thumb-remove"
        aria-label="Открепить"
        class="group/half flex h-full min-w-0 flex-1 items-center justify-center outline-none"
        @click.stop="emit('remove')"
      >
        <Icon name="close" :size="14" :class="glyph('remove')" />
      </button>
    </div>
  </div>
</template>
