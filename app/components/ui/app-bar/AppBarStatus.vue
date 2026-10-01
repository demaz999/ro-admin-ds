<script setup lang="ts">
import { computed } from 'vue'
import { Indicator } from '../indicator'
import type { AppBarSaveState } from '.'

/**
 * Индикатор автосохранения в полосе приложения — спека §17.2, прототип `.saved`. Тексты выводит сам; значения — `index.ts`.
 * Когда сохранять, решает страница: состояние приходит пропом.
 */
const props = withDefaults(defineProps<{ state?: AppBarSaveState }>(), { state: 'saved' })

const view = computed(() => ({
  saving: { text: 'Сохранение…', tone: 'warning' as const },
  saved: { text: 'Все изменения сохранены', tone: 'success' as const },
  error: { text: 'Ошибка сохранения', tone: 'destructive' as const },
})[props.state])
</script>

<template>
  <span
    data-slot="app-bar-status"
    :data-state="props.state"
    role="status"
    class="flex items-center gap-2 px-2 text-xs whitespace-nowrap text-sidebar-foreground"
  >
    <Indicator :variant="view.tone" type="dot" size="sm" :class="props.state === 'saving' ? 'motion-safe:animate-pulse' : ''" />
    {{ view.text }}
  </span>
</template>
