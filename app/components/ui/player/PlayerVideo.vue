<script setup lang="ts">
import type { PlayerVideoVariants } from '.'
import { computed } from 'vue'
import PlayerButton from './PlayerButton.vue'
import { playerVideoVariants } from '.'

/**
 * Видеоплеер — мастер `PlayerVideo` `6922:58170`.
 * Пропорция 16:9 — не 16:10, как у галереи. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  size?: PlayerVideoVariants['size']
  poster?: string
  playing?: boolean
}>(), {
  size: 'lg',
  poster: '',
  playing: false,
})

/** Кнопка 128 у крупного, 80 у мелкого — как в мастере. */
const buttonSize = computed(() => (props.size === 'lg' ? 'lg' : 'md'))
</script>

<template>
  <div
    data-slot="player-video"
    class="aspect-video"
    :class="playerVideoVariants({ size: props.size })"
  >
    <img
      v-if="props.poster"
      :src="props.poster"
      alt=""
      class="size-full object-cover"
    >
    <span class="absolute inset-0 flex items-center justify-center">
      <PlayerButton :type="props.playing ? 'pause' : 'play'" :size="buttonSize" />
    </span>
  </div>
</template>
