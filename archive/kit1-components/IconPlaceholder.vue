<script setup lang="ts">
/**
 * Временная заглушка иконочного слота.
 *
 * Иконки кита нормализуются в единый компонент `Icon` (вопрос 8): в ките четыре
 * несовместимые конвенции имён, и до нормализации переносить их поштучно нельзя.
 * Пока слоты держат геометрию — размер и позицию, — а глиф остаётся условным.
 */
defineProps<{ size?: number }>()
</script>

<!--
  @debt Заглушка вместо иконок кита. Ждёт компонент Icon и нормализацию имён.
  См. docs/design-debt.md и open-questions.md, вопрос 8.
-->
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    class="size-full"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
  </svg>
</template>
