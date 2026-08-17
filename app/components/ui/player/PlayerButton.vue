<script setup lang="ts">
import type { PlayerButtonVariants } from '.'
import { computed } from 'vue'
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

/**
 * Оптическая поправка треугольника — **сознательное отклонение**.
 *
 * Механика та же, что у шеврона `ButtonArrow`: коробка центрирована
 * геометрически, а глаз видит глиф сдвинутым. У треугольника причина считается
 * прямо — центр тяжести лежит на трети от основания, то есть **левее** центра
 * описывающего прямоугольника. При геометрическом центрировании чернил слева
 * больше, и глиф выглядит подпёртым к основанию.
 *
 * Компенсируется сдвигом вправо, в сторону острия. Величина взята по равновесию
 * видимых полей, а не по полной компенсации центра тяжести: полная дала бы
 * 2 / 4 / 6px и увела бы треугольник к правому краю круга.
 *
 * Паузы это не касается: две одинаковые полосы симметричны и оптически, и
 * геометрически.
 */
const opticalShift = computed(() => {
  if (props.type !== 'play') return '0px'
  return props.size === 'sm' ? '1px' : '2px'
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
        :style="{ transform: `translateX(${opticalShift})` }"
      />
    </slot>
  </button>
</template>
