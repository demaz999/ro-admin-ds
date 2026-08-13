<script setup lang="ts">
import { computed } from 'vue'
import { fileUploadHint, fileUploadTitle, fileUploadVariants } from '.'

/**
 * Область загрузки — мастер `Uploader` `1572:10113`.
 * Снаружи все состояния одинаковы, различие целиком внутри. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `State` мастера. `uploaded` — исчерпанный лимит, а не ошибка. */
  state?: 'default' | 'error' | 'uploaded' | 'disabled'
}>(), { state: 'default' })

const titleClass = computed(() => fileUploadTitle[props.state])
const hintClass = computed(() => fileUploadHint[props.state])
</script>

<template>
  <div
    data-slot="file-upload"
    :class="fileUploadVariants({ state: props.state })"
    :aria-disabled="props.state === 'disabled' || undefined"
  >
    <span class="text-base font-medium" :class="titleClass">
      <slot>Загрузить файлы</slot>
    </span>
    <span class="text-xs" :class="hintClass">
      <slot name="hint">до 5 файлов, общим объёмом не более 50 МБ</slot>
    </span>
  </div>
</template>
