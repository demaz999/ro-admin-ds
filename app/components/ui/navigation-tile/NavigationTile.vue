<script setup lang="ts">
import type { NavigationTileVariants } from '.'
import { navigationTileVariants } from '.'

/**
 * Навигационная плитка — мастер `NavigationTile` `638:5476`.
 *
 * ## Что не переехало в первом заходе
 *
 * Плитка была собрана как белая карточка с тёмной подписью — и выглядела пустым
 * прямоугольником. Замер мастера показывает три слоя, из которых переехал один:
 *
 * | слой | что это |
 * |---|---|
 * | `Image` | **фотография во всю плитку** — не переехала |
 * | `Fader` | **шторка-градиент** снизу: чёрный от прозрачного на 51% до 72% на 100% — не переехала |
 * | подпись | лежит **поверх фото**, белая, отступ 20 слева и снизу |
 *
 * Белая заливка мастера — это подложка под фото, а не фон карточки. Без фото и
 * шторки от плитки оставался только белый прямоугольник с тёмным текстом,
 * который читался как сломанная вёрстка.
 *
 * Разбор — в `index.ts`; габариты по-прежнему не переносятся.
 */
const props = withDefaults(defineProps<{
  size?: NavigationTileVariants['size']
  src?: string
  alt?: string
}>(), {
  size: 'md',
  src: '',
  alt: '',
})
</script>

<template>
  <a :class="navigationTileVariants({ size: props.size })" data-slot="navigation-tile">
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt"
      class="absolute inset-0 size-full object-cover"
    >
    <!-- Шторка снизу: без неё белая подпись не читается на светлом кадре. -->
    <span
      class="absolute inset-0 bg-linear-to-b from-51% from-transparent to-scrim-dark"
      aria-hidden="true"
    />
    <span class="relative p-5">
      <slot />
    </span>
  </a>
</template>
