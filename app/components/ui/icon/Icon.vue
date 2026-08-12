<script setup lang="ts">
import { icons, type IconName } from './icons'

/**
 * Единый компонент иконки: имя без размера, размер — проп.
 * Правило нейминга из CLAUDE.md — `delete`, `search`, `copy`, а не `24_ic_search`.
 *
 * Цвет не задаётся: глиф всегда красится `currentColor`, то есть наследует цвет
 * текста родителя. У Атома цвет иконки в поле совпадает с цветом текста
 * состояния — в `default` плейсхолдерный, в `filled` цвет значения.
 */
withDefaults(defineProps<{
  name: IconName
  /** Сторона квадрата в px. Лесенка наша, размер 24 остаётся дефолтом. */
  size?: number
}>(), { size: 24 })
</script>

<template>
  <svg
    data-slot="icon"
    :width="size"
    :height="size"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path :d="icons[name]" />
  </svg>
</template>
