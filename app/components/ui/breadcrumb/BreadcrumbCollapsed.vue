<script setup lang="ts">
/**
 * Свёрнутая середина цепочки — фрейм `Collapsed` мастера `3880:31214`.
 *
 * Кнопка 29×20 с текстом `…`. Управляющий элемент, а не декоративное
 * многоточие: раскрывает спрятанные уровни, поэтому это `button`.
 */
</script>

<template>
  <button
    data-slot="breadcrumb-collapsed"
    type="button"
    class="inline-flex h-5 items-center px-1 text-xs font-medium text-muted-foreground outline-none"
    aria-label="Показать скрытые уровни"
  >
    …
  </button>
</template>
