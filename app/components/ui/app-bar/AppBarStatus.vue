<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '../button'
import { ButtonAction } from '../button-action'
import { Indicator } from '../indicator'
import type { AppBarSaveState, AppBarStatusSurface } from '.'

/**
 * Индикатор автосохранения в полосе приложения — спека §17.2, прототип `.saved`. Тексты выводит сам; значения — `index.ts`.
 * Когда сохранять, решает страница: состояние приходит пропом.
 *
 * Такт 61 (страница схемы, `docs/scheme-edit.md`, раздел 9): ось `surface` — статус на светлой поверхности шапки
 * страницы; `retryable` — у ошибки кнопка «Повторить» и событие `retry`. Без новых пропов разметка прежняя.
 */
const props = withDefaults(defineProps<{
  state?: AppBarSaveState
  /** Поверхность: тёмная полоса приложения (по умолчанию) или светлая шапка страницы. */
  surface?: AppBarStatusSurface
  /** У ошибки показать «Повторить»; нажатие — событие `retry`. */
  retryable?: boolean
}>(), { state: 'saved', surface: 'dark', retryable: false })

const emit = defineEmits<{ retry: [] }>()

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
    :data-surface="props.surface === 'light' ? 'light' : undefined"
    role="status"
    class="flex items-center gap-2 px-2 text-xs whitespace-nowrap"
    :class="props.surface === 'light' ? 'text-muted-foreground' : 'text-sidebar-foreground'"
  >
    <Indicator :variant="view.tone" type="dot" size="sm" :class="props.state === 'saving' ? 'motion-safe:animate-pulse' : ''" />
    {{ view.text }}
    <template v-if="props.retryable && props.state === 'error'">
      <ButtonAction v-if="props.surface === 'light'" size="sm" data-slot="app-bar-status-retry" @click="emit('retry')">
        Повторить
      </ButtonAction>
      <Button v-else variant="sidebar" size="sm" data-slot="app-bar-status-retry" @click="emit('retry')">
        Повторить
      </Button>
    </template>
  </span>
</template>
