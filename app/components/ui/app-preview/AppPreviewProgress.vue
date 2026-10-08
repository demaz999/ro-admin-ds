<script setup lang="ts">
import { APP_HIGHLIGHT } from '.'

/**
 * Полоски прогресса экрана шага — макет `step-progress` `33694:3904`: высота 4, радиус 2, зазор 4; пройдено — `--app-accent`,
 * впереди — `--app-track`. Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  total: number
  done: number
  /** Обведённый элемент — поповер «?» и наведение демо-осмотра. */
  highlighted?: boolean
}>(), { highlighted: false })
</script>

<template>
  <div
    data-slot="app-preview-progress"
    :data-highlighted="props.highlighted || undefined"
    role="img"
    :aria-label="`Пройдено ${props.done} из ${props.total}`"
    :class="['flex shrink-0 items-center gap-1 rounded-2xs', props.highlighted ? APP_HIGHLIGHT : '']"
  >
    <span
      v-for="k in Math.max(1, props.total)"
      :key="k"
      data-slot="app-preview-progress-bar"
      :data-done="k <= props.done || undefined"
      :class="['h-1 min-w-px flex-1 rounded-2xs', k <= props.done ? 'bg-app-accent' : 'bg-app-track']"
    />
  </div>
</template>
