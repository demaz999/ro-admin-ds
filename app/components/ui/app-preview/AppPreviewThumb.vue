<script setup lang="ts">
import type { AppScreen } from '.'
import AppPreviewScreen from './AppPreviewScreen.vue'

/**
 * Миниатюра экрана на карте демо-осмотра (ревью 4.1: «ряды миниатюр по этапам»; выборка B2): телефон `lg` в масштабе 0.5 —
 * 110 × 238, под ним подпись экрана 12/16 medium `--foreground` и пробелы 12/16 `--warning-strong` через 4. Миниатюра целиком —
 * кнопка: наведение — кольцо 2 `--stroke-accent` вокруг телефона, текущий экран — кольцо 2 `--ring`, фокус с клавиатуры —
 * кольцо 2 `--ring` с отступом. Части телефона не нажимаются и не принимают фокус. Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  screen: AppScreen
  /** Подпись экрана под миниатюрой. */
  label: string
  /** Пробелы экрана: «нет фото-подсказки», «нет описания». */
  gaps?: readonly string[]
  current?: boolean
}>(), { gaps: () => [], current: false })
</script>

<template>
  <button
    type="button"
    data-slot="app-preview-thumb"
    :data-current="props.current || undefined"
    :aria-current="props.current ? 'true' : undefined"
    class="group/thumb flex w-[calc(var(--container-app-phone)/2)] shrink-0 flex-col gap-2 text-left outline-none"
  >
    <span
      :class="[
        /* Радиус кольца — корпус 24 в масштабе 0.5. */
        'flex rounded-lg ring-offset-2 ring-offset-card transition-shadow',
        props.current ? 'ring-2 ring-ring' : 'group-hover/thumb:ring-2 group-hover/thumb:ring-stroke-accent',
        'group-focus-visible/thumb:ring-2 group-focus-visible/thumb:ring-ring',
      ]"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      inert
    >
      <AppPreviewScreen :screen="props.screen" size="lg" :scale="0.5" />
    </span>
    <span class="flex flex-col gap-1">
      <span data-slot="app-preview-thumb-label" class="text-2xs font-medium text-foreground">{{ props.label }}</span>
      <span v-for="g in props.gaps" :key="g" data-slot="app-preview-thumb-gap" class="text-2xs text-warning-strong">{{ g }}</span>
    </span>
  </button>
</template>
