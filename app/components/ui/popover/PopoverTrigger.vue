<script setup lang="ts">
import type { PopoverTriggerProps } from 'reka-ui'
import { PopoverTrigger } from 'reka-ui'

/**
 * Триггер плашки — такт 28. Оборачивает конкретную кнопку страницы (`as-child`):
 * Reka сама ставит `aria-haspopup`, `aria-expanded`, `aria-controls`, `data-state`
 * и обработчик клика, который открывает и закрывает плашку. Ручной `@click` и
 * `:aria-expanded` на кнопке-потребителе после этого не нужны — оба дублировали
 * бы то, что теперь делает примитив, и `@click` увёл бы состояние в двойной тоггл.
 *
 * Своего `data-slot` здесь нет намеренно: у нас `as-child` всегда оборачивает
 * уже помеченный элемент (`IconButton`, `Chip`…), а `as-child` сливает атрибуты
 * этого тега на него же. Отдельный `data-slot="popover-trigger"` перебил бы его
 * собственный — так `Chip` в `FilterChip` терял `data-slot="chip"`.
 */
const props = defineProps<PopoverTriggerProps>()
</script>

<template>
  <PopoverTrigger v-bind="props">
    <slot />
  </PopoverTrigger>
</template>
