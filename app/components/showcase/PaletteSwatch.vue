<script setup lang="ts">
/**
 * Свотч палитры: 64×40, радиус 8, заливка через var().
 *
 * Обводка одна на все свотчи — 1px внутрь, нейтральная рамка на половине прозрачности:
 * нужна светлым, чтобы белое отличалось от фона, и стоит у всех ради единообразия. Своей
 * подложки у свотча нет — он лежит на фоне страницы.
 *
 * Тень показывается карточкой того же размера с этой тенью, без обводки.
 */
const props = defineProps<{
  /** Имя переменной с двумя дефисами. */
  name: string
  /** Утилита тени — тогда свотч показывает тень, а не цвет. */
  shadow?: string
  /** Цвет образца для тени на `currentColor`. */
  tone?: string
}>()
</script>

<template>
  <span
    v-if="props.shadow"
    :data-shadow="props.name"
    class="block h-10 w-16 shrink-0 rounded-md bg-card"
    :class="[props.shadow, props.tone]"
  />
  <span
    v-else
    class="block h-10 w-16 shrink-0 rounded-md ring-1 ring-stroke-neutral/50 ring-inset"
    :style="{ background: `var(${props.name})` }"
  />
</template>
