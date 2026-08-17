<script setup lang="ts">
import type { AvatarVariants } from '.'
import { computed } from 'vue'
import { Icon } from '../icon'
import { avatarIcon, avatarLetterSizes, avatarVariants } from '.'

/**
 * Аватар — мастер `Avatar` `3488:24229`. Три типа содержимого, шесть размеров,
 * две плотности заливки. Разбор матрицы — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: иконка, буква или фотография. */
  type?: 'icon' | 'letter' | 'photo'
  /** Плотность заливки: брендовая сплошная или она же на 12%. */
  variant?: AvatarVariants['variant']
  size?: AvatarVariants['size']
  /** Текстовый проп `Letter` мастера. Значим при `type="letter"`. */
  letter?: string
  src?: string
  alt?: string
}>(), {
  type: 'icon',
  variant: 'solid',
  size: 40,
  letter: '',
  alt: '',
})

const iconSize = computed(() => avatarIcon[Number(props.size)] ?? 16)

/**
 * Буква нарисована только у трёх младших размеров: её ступени у крупных —
 * display-кегли, под которые админская шкала не расширяется (решение 30).
 * Вместо молчаливой подмены ближайшим кеглем показываем иконку.
 */
const showsLetter = computed(
  () => props.type === 'letter' && avatarLetterSizes.includes(Number(props.size) as 24 | 32 | 40),
)
</script>

<template>
  <span
    data-slot="avatar"
    :data-type="props.type"
    :class="avatarVariants({ variant: props.variant, size: props.size })"
  >
    <img
      v-if="props.type === 'photo' && props.src"
      :src="props.src"
      :alt="props.alt"
      class="size-full object-cover"
    >
    <template v-else-if="showsLetter">{{ props.letter }}</template>
    <!-- Глиф заполняет свой бокс целиком, как пикта Атома. -->
    <slot v-else name="icon">
      <Icon name="person" :size="iconSize" />
    </slot>
  </span>
</template>
