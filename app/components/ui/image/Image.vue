<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { cn } from '@/lib/utils'

/**
 * Изображение — мастер `Image` `174:3128`.
 * Ось `Ratio` — чистые пропорции; габариты мастера это один снимок в шести
 * пропорциях, а не шесть размеров. Разбор — в `index.ts`.
 *
 * @debt Пустого состояния у мастера Атома нет вовсе — там только пропорция.
 * Без заглушки картинка без `src` даёт белую пустоту, и карточка списка
 * разваливается. Заглушка собрана дефолтом на нейтральных ролях (`--muted`
 * плюс `--muted-disabled`); у кита 1 она брендово-голубая, `#d9e8fc` с глифом
 * `#bcd4f5`. Расхождение цвета — строкой в `docs/page-my-inspections.md`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Ratio` мастера. */
  ratio?: '10:16' | '3:4' | '1:1' | '4:3' | '16:10' | '2:1'
  src?: string
  alt?: string
  /**
   * Приближение на наведении карточки. Работает от **именованной группы**
   * `card`: изображение само по себе не интерактивно, реагирует оно на
   * наведение всей карточки. Решение владельца от 2026-08-18, правило — в
   * `docs/naming.md`. Обрезка уже есть у контейнера, поэтому кадр не растёт.
   */
  zoom?: boolean
  /**
   * Класс снаружи. Нужен слиянием, а не приклейкой: у корня стоит `w-full`, и
   * без `cn` заданная снаружи ширина с ним конфликтует — в ячейке таблицы
   * превью 56 расползалось на всю колонку.
   */
  class?: string
}>(), {
  ratio: '1:1',
  src: '',
  alt: '',
  zoom: false,
})

const aspect = computed(() => props.ratio.replace(':', ' / '))
</script>

<template>
  <div
    data-slot="image"
    :class="cn('w-full overflow-hidden', props.class)"
    :style="{ aspectRatio: aspect }"
  >
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt"
      class="size-full object-cover"
      :class="props.zoom ? 'transition-transform group-hover/card:scale-[1.04]' : ''"
      :style="props.zoom ? { transitionDuration: 'var(--duration-zoom)' } : undefined"
    >
    <!--
      Заглушка по умолчанию. Слот остаётся: своё содержимое пустого состояния
      подставляется им и заглушку вытесняет.
    -->
    <slot v-else>
      <span
        data-slot="image-placeholder"
        class="flex size-full items-center justify-center bg-muted text-muted-disabled"
      >
        <Icon name="image" :size="48" />
      </span>
    </slot>
  </div>
</template>
