<!--
  @debt Цвета иллюстративные — те же шесть рамп расширенной палитры, что у
  StatusBadge. В продукте цвет статуса приходит с сервера вместе с данными: при
  интеграции здесь будет мапинг из справочника, а не выбор цвета руками.
  См. docs/design-debt.md.
-->
<script setup lang="ts">
import type { StatusLetterVariants } from '.'
import { computed } from 'vue'
import { statusLetterVariants } from '.'

/**
 * Буквенная метка статуса в ячейке таблицы — мастер `_BulbStatus` `5862:53423`.
 * Цвет пропом по той же причине, что у `StatusBadge`. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Буква метки. Свойство `Letter#5862:33` мастера. */
  letter: string
  /** Цвет метки. Явный проп: в продукте значение придёт с данными. */
  color?: StatusLetterVariants['color']
}>(), { color: 'green' })

/**
 * Метка вмещает один знак: в мастере это одна буква в круге 20×20, и вторая
 * туда не поместилась бы, а сжимать кегль значило бы уйти от эталона.
 */
const glyph = computed(() => props.letter.trim().charAt(0).toUpperCase())
</script>

<template>
  <span
    data-slot="status-letter"
    :data-color="props.color"
    :class="statusLetterVariants({ color: props.color })"
    :title="props.letter"
  >
    {{ glyph }}
  </span>
</template>
