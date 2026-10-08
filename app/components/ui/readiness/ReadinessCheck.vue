<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { READINESS_LEVEL, type ReadinessLevel } from '.'

/**
 * Строка проверки — важность глифом, текст, место, переход «Исправить»; семейство «Модель готовности», такт 91. Разбор — `index.ts`.
 *
 * Пример: `<ReadinessCheck level="block" text="В процессе «Документы» нет шагов" area="Процессы и шаги" action="Исправить" @fix="fix(key)" />`
 */
const props = withDefaults(defineProps<{
  level: ReadinessLevel
  text: string
  /** Место исправления: «Форма → Автомобиль». */
  area?: string
  /** Подпись перехода; пусто — перехода нет. */
  action?: string
  class?: string
}>(), { area: '', action: '' })

const emit = defineEmits<{ fix: [] }>()

const meta = computed(() => READINESS_LEVEL[props.level])
</script>

<template>
  <li data-slot="readiness-check" :data-level="props.level" :class="cn('flex items-start gap-2 py-1', props.class)">
    <span class="flex h-5 w-4 shrink-0 items-center justify-center" :class="meta.tone">
      <Icon v-if="meta.icon" :name="meta.icon" :size="16" />
      <span v-else class="size-3.5 rounded-full border-2 border-border-secondary" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span data-slot="readiness-check-text" class="text-sm text-foreground">
        <span class="sr-only">{{ meta.label }}: </span>{{ props.text }}
      </span>
      <span v-if="props.area" data-slot="readiness-check-area" class="text-xs text-foreground-secondary">
        {{ props.area }}
      </span>
    </span>
    <ButtonAction v-if="props.action" size="sm" :show-icon="false" data-readiness-fix @click="emit('fix')">
      {{ props.action }}
    </ButtonAction>
  </li>
</template>
