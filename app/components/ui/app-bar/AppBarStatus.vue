<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '../button'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { Indicator } from '../indicator'
import { Spinner } from '../spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import type { AppBarSaveState, AppBarStatusSize, AppBarStatusSurface } from '.'

/**
 * Индикатор автосохранения в полосе приложения — спека §17.2, прототип `.saved`. Тексты выводит сам; значения — `index.ts`.
 * Когда сохранять, решает страница: состояние приходит пропом.
 *
 * Такт 61 (страница схемы, `docs/scheme-edit.md`, раздел 9): ось `surface` — статус на светлой поверхности шапки
 * страницы; `retryable` — у ошибки кнопка «Повторить» и событие `retry`. Без новых пропов разметка прежняя.
 *
 * Такт 102 (решение владельца 2026-10-09, доска scheme-edit-batch1-v1): ступень `size="15"` — подпись 15/20 вровень со
 * строкой текста; проп `compact` — спокойное «сохранено» значком с подсказкой, сохранение — спиннером с подписью; ошибка
 * прежняя. Без новых пропов разметка прежняя.
 */
const props = withDefaults(defineProps<{
  state?: AppBarSaveState
  /** Поверхность: тёмная полоса приложения (по умолчанию) или светлая шапка страницы. */
  surface?: AppBarStatusSurface
  /** У ошибки показать «Повторить»; нажатие — событие `retry`. */
  retryable?: boolean
  /** Кегль подписи: 13/16 (по умолчанию) или 15/20 — вровень со строкой текста. */
  size?: AppBarStatusSize
  /** «Сохранено» — значок с подсказкой, «Сохранение…» — спиннер с подписью; ошибка — как без пропа. */
  compact?: boolean
}>(), { state: 'saved', surface: 'dark', retryable: false, size: '13', compact: false })

const emit = defineEmits<{ retry: [] }>()

const view = computed(() => ({
  saving: { text: 'Сохранение…', tone: 'warning' as const },
  saved: { text: 'Все изменения сохранены', tone: 'success' as const },
  error: { text: 'Ошибка сохранения', tone: 'destructive' as const },
})[props.state])

/** Сжатый вид затрагивает только «сохранено» и «сохранение»: ошибка остаётся текстом с точкой. */
const iconSaved = computed(() => props.compact && props.state === 'saved')
const spinning = computed(() => props.compact && props.state === 'saving')
const large = computed(() => props.size === '15')
</script>

<template>
  <span
    data-slot="app-bar-status"
    :data-state="props.state"
    :data-surface="props.surface === 'light' ? 'light' : undefined"
    :data-compact="props.compact ? '' : undefined"
    role="status"
    class="flex items-center gap-2 px-2 whitespace-nowrap"
    :class="[
      large ? 'text-sm' : 'text-xs',
      props.surface === 'light' ? 'text-muted-foreground' : 'text-sidebar-foreground',
    ]"
  >
    <!-- Провайдер подсказок — внутри корня: безрендерный корень съел бы атрибуты страницы (`CLAUDE.md`). -->
    <TooltipProvider v-if="iconSaved">
      <Tooltip>
        <TooltipTrigger as-child>
          <span data-slot="app-bar-status-icon" class="inline-flex size-5 items-center justify-center text-success">
            <Icon name="check" :size="16" />
            <span class="sr-only">{{ view.text }}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {{ view.text }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <template v-else>
      <Spinner v-if="spinning" size="xs" />
      <Indicator v-else :variant="view.tone" type="dot" size="sm" :class="props.state === 'saving' ? 'motion-safe:animate-pulse' : ''" />
      {{ view.text }}
    </template>
    <template v-if="props.retryable && props.state === 'error'">
      <ButtonAction v-if="props.surface === 'light'" :size="large ? '15' : 'sm'" data-slot="app-bar-status-retry" @click="emit('retry')">
        Повторить
      </ButtonAction>
      <Button v-else variant="sidebar" size="sm" data-slot="app-bar-status-retry" @click="emit('retry')">
        Повторить
      </Button>
    </template>
  </span>
</template>
