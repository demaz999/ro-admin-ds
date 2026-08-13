<script setup lang="ts">
import type { PlayerButtonVariants } from '.'
import { Icon } from '../icon'
import { playerButtonVariants } from '.'

/**
 * Кнопка плеера — мастер `ButtonPlayer` `6143:49984`.
 * Белый круг на 88%: под ним просвечивает кадр. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: какой глиф показан. */
  type?: 'play' | 'pause'
  size?: PlayerButtonVariants['size']
  disabled?: boolean
}>(), {
  type: 'play',
  size: 'md',
  disabled: false,
})
</script>

<template>
  <button
    data-slot="player-button"
    type="button"
    :disabled="props.disabled"
    :aria-label="props.type === 'play' ? 'Воспроизвести' : 'Пауза'"
    :class="playerButtonVariants({ size: props.size })"
  >
    <!-- Глифов play и pause в self-hosted наборе нет: коробка держит место.
         Строка в docs/design-debt.md вместе с календарём и часами. -->
    <slot>
      <Icon name="chevron-right" :size="props.size === 'sm' ? 16 : 24" />
    </slot>
  </button>
</template>
