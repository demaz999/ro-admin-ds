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
 * **Глиф заполняет бокс по доминирующей стороне.** viewBox строится по плотным
 * границам контура, а не по исходному квадрату 960 Material: иначе видимый глиф
 * оказывается на четверть мельче эталона при одинаковом боксе. Вторая сторона
 * идёт по натуральной пропорции глифа — квадратная пикта заполняет квадрат, а
 * шеврон остаётся широким и низким, как у Атома. Разбор — в `icons.ts`.
 */
const props = withDefaults(defineProps<{
  name: IconName
  /** Доминирующая сторона глифа в px. Лесенка наша, размер 24 остаётся дефолтом. */
  size?: number
}>(), { size: 24 })

const glyph = computed(() => {
  const [x, y, w, h] = icons[props.name].box
  const long = Math.max(w, h)
  return {
    viewBox: `${x} ${y} ${w} ${h}`,
    width: (w / long) * props.size,
    height: (h / long) * props.size,
  }
})
</script>

<template>
  <svg
    data-slot="icon"
    :width="glyph.width"
    :height="glyph.height"
    :viewBox="glyph.viewBox"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path :d="icons[name].d" />
  </svg>
</template>
