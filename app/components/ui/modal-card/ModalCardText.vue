<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Описательный текст тела окна-карточки — абзац под содержимым или между блоками тела.
 * «Настройка таблицы» `19942:192435`: описание Regular 15/20 `fg/secondary` (`modal-family.md`, раздел 2).
 * Довесок 1 к такту 35: примечание окна «Горячие клавиши» (прототип `#btnHelp`) — компонентом,
 * страница текст не оформляет.
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <p data-slot="modal-card-text" :class="cn('m-0 text-sm text-foreground-secondary', props.class)">
    <slot />
  </p>
</template>
