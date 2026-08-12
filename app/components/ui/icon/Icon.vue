<script setup lang="ts">
import { computed } from 'vue'
import { icons, type IconName } from './icons'

/**
 * Единый компонент иконки: имя без размера, размер — проп.
 * Правило нейминга из CLAUDE.md — `delete`, `search`, `copy`, а не `24_ic_search`.
 *
 * Цвет не задаётся: глиф всегда красится `currentColor`, то есть наследует цвет
 * текста родителя. У Атома цвет иконки в поле совпадает с цветом текста
 * состояния — в покое плейсхолдерный, под наведением и фокусом цвет значения.
 *
 * **Глиф заполняет бокс.** viewBox строится по плотным границам контура, а не по
 * исходному квадрату 960 Material: иначе видимый глиф оказывается на четверть
 * мельче эталона при одинаковом боксе. Разбор — в `icons.ts`.
 */
const props = withDefaults(defineProps<{
  name: IconName
  /** Сторона квадрата в px. Лесенка наша, размер 24 остаётся дефолтом. */
  size?: number
}>(), { size: 24 })

/**
 * Квадратный viewBox по границам контура. Для неквадратных глифов сторона
 * берётся по большему измерению, а меньшее центрируется — иначе глиф растянется.
 */
const viewBox = computed(() => {
  const [x, y, w, h] = icons[props.name].box
  const side = Math.max(w, h)
  return `${x - (side - w) / 2} ${y - (side - h) / 2} ${side} ${side}`
})
</script>

<template>
  <svg
    data-slot="icon"
    :width="size"
    :height="size"
    :viewBox="viewBox"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path :d="icons[name].d" />
  </svg>
</template>
