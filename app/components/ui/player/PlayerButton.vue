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
    <!-- Глиф масштабируется вместе с кругом: 16 / 32 / 48 при 40 / 80 / 128. -->
    <slot>
      <Icon
        :name="props.type"
        :size="props.size === 'sm' ? 16 : props.size === 'md' ? 32 : 48"
      />
    </slot>
  </button>
</template>
