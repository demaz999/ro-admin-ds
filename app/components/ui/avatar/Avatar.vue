<script setup lang="ts">
import type { AvatarVariants } from '.'
import { computed, onMounted, ref, watch } from 'vue'
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

/**
 * Оптическая центровка буквы.
 *
 * Флексбокс центрирует **адванс** глифа, а не его чернила. У PT Root UI левый
 * полуапрош почти нулевой, а правый заметный: замер через `measureText` даёт у
 * «К» адванс 10.16 при ширине чернил 11 — то есть чернила выходят за адванс
 * справа, и буква смотрится сдвинутой вправо. У «Ш» смещения нет вовсе
 * (−0.02), у «М» оно максимальное (0.52).
 *
 * Поэтому сдвиг считается по факту для конкретной буквы и кегля, а не берётся
 * константой: константа чинила бы «К» и ломала «Ш».
 */
const opticalShift = ref(0)

function measureShift() {
  if (!showsLetter.value || !props.letter || typeof document === 'undefined') {
    opticalShift.value = 0
    return
  }
  const el = root.value
  if (!el) return
  const cs = getComputedStyle(el)
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const m = ctx.measureText(props.letter)
  if (!m.actualBoundingBoxLeft && !m.actualBoundingBoxRight) return
  const inkCenter = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2
  opticalShift.value = Math.round((m.width / 2 - inkCenter) * 100) / 100
}

const root = ref<HTMLElement | null>(null)

onMounted(measureShift)
watch(() => [props.letter, props.size, showsLetter.value], measureShift)
</script>

<template>
  <span
    ref="root"
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
    <!-- Сдвиг компенсирует правый полуапрош: центрируем чернила, а не адванс. -->
    <span
      v-else-if="showsLetter"
      data-slot="avatar-letter"
      :style="opticalShift ? { transform: `translateX(${opticalShift}px)` } : undefined"
    >{{ props.letter }}</span>
    <!-- Глиф заполняет свой бокс целиком, как пикта Атома. -->
    <slot v-else name="icon">
      <Icon name="person" :size="iconSize" />
    </slot>
  </span>
</template>
