<script setup lang="ts">
import type { PopoverAnchorProps } from 'reka-ui'
import { PopoverAnchor } from 'reka-ui'

/**
 * Точка привязки плашки, когда она шире самого триггера — такт 28.
 *
 * У кебаба, «Ещё» и переключателя размера страницы якорь совпадает с триггером,
 * `PopoverAnchor` им не нужен: `PopoverTrigger` сам служит точкой привязки, пока
 * анкор не задан явно (устройство Reka — `PopoverTrigger.js`).
 *
 * У массовых действий «Моих осмотров» плашка привязана не к кнопке-шеврону, а к
 * связке чекбокс + кнопка целиком (мастер `select_container`): анкор шире
 * триггера на 16px слева. Без этого компонента плашка сдвинулась бы под саму
 * кнопку и разошлась с положением до такта.
 *
 * Своего `data-slot` здесь нет намеренно — та же причина, что у `PopoverTrigger.vue`:
 * `as-child` сливает атрибуты на уже помеченный элемент, свой маркер перебил бы его.
 */
const props = defineProps<PopoverAnchorProps>()
</script>

<template>
  <PopoverAnchor v-bind="props">
    <slot />
  </PopoverAnchor>
</template>
