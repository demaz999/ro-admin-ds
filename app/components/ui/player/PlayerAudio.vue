<script setup lang="ts">
import PlayerButton from './PlayerButton.vue'

/**
 * Аудиоплеер — мастер `PlayerAudio` `6921:57397`, спека `6921:57170`.
 *
 * Плашка 60 высотой, радиус 16, заливка — **мягкая ступень**: десятая её
 * встреча в мастерах Атома. Паддинги 20/24, зазор 24.
 *
 * ## Ось называет глиф, а не состояние
 *
 * `State=play` — это состояние, где показана кнопка «играть», то есть звук
 * **остановлен**. `State=pause` — где показана пауза, то есть звук **играет**.
 * Тот же класс ловушки, что `Collapsed` у аккордеона: ось названа по картинке,
 * а не по смыслу. В коде проп зовётся `playing`.
 *
 * ## Состав меняется вместе с состоянием
 *
 * | состояние | что внутри |
 * |---|---|
 * | остановлен | подпись и длительность |
 * | играет | **плюс дорожка перемотки** 160 шириной |
 *
 * То есть дорожка появляется только во время воспроизведения — это состав
 * мастера, а не наше упрощение.
 */
const props = withDefaults(defineProps<{
  /** Играет ли звук. Ось `State` мастера, переименована по смыслу. */
  playing?: boolean
  /** Длительность или текущее время. */
  time?: string
  /**
   * `card` — плашка мастера 60 во всю ширину с мягкой подложкой; `none` — без подложки и полей, по содержимому: кнопка,
   * подпись, время в одну строку. Такт 46, решение агента по приёмке владельца 2026-10-01 (п. 10): заметка ленты — одна
   * поверхность, плеер внутри неё подложки не несёт.
   */
  surface?: 'card' | 'none'
}>(), {
  playing: false,
  time: '6:48',
  surface: 'card',
})

/** Нажатие кнопки плеера. Такт 43: заметка ленты (`FeedNote`) отвечает на него уведомлением — звук плеер сам не ведёт. */
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <div
    data-slot="player-audio"
    :data-surface="props.surface"
    :class="props.surface === 'card'
      ? 'flex h-15 w-full items-center gap-6 rounded-xl bg-muted-foreground/[var(--opacity-soft)] px-6 py-5'
      : 'inline-flex w-fit max-w-full items-center gap-3'"
  >
    <PlayerButton :type="props.playing ? 'pause' : 'play'" size="sm" @click="emit('toggle')" />

    <span class="min-w-0 truncate text-base" :class="props.surface === 'card' ? 'flex-1' : ''">
      <slot />
    </span>

    <!-- Дорожка перемотки появляется только во время воспроизведения. -->
    <span
      v-if="props.playing"
      class="h-1 w-40 shrink-0 overflow-hidden rounded-full bg-muted-foreground/[var(--opacity-soft)]"
      role="progressbar"
    >
      <span class="block h-full w-1/3 rounded-full bg-primary" />
    </span>

    <span class="shrink-0 text-xs text-muted-foreground">{{ props.time }}</span>
  </div>
</template>
