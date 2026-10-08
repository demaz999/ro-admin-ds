<script setup lang="ts">
import type { AppPreviewFieldType } from '.'
import { Icon } from '../icon'
import { APP_HIGHLIGHT } from '.'

/**
 * Поле анкеты и галочка экрана приложения. В макете `33694:3879` полей нет — по аналогии с нарисованными частями: подпись
 * 12/16 bold `--app-foreground` (ступень заголовка шага), поле — высота и радиус кнопки (32, радиус 6, поля 8), поверхность
 * `--app-surface` с линией 1 `--app-track` (`border/default` полосок прогресса), заполнитель 12/16 `--app-foreground-secondary`.
 * Обязательное — « *» `--app-danger`. Конфигурация подсказок поля: «?» (`standard`) либо глиф картинки (`photo`) у подписи.
 * Галочка (`checkbox`) — квадрат 16 с линией `--app-track` и подписью 12/16 справа через 8. Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  label: string
  type?: AppPreviewFieldType
  required?: boolean
  placeholder?: string
  hint?: 'none' | 'standard' | 'photo'
  highlighted?: boolean
}>(), { type: 'text', required: false, placeholder: '', hint: 'none', highlighted: false })
</script>

<template>
  <div
    v-if="props.type === 'checkbox'"
    data-slot="app-preview-field"
    data-type="checkbox"
    :data-highlighted="props.highlighted || undefined"
    :class="['flex shrink-0 items-start gap-2 rounded-xs', props.highlighted ? APP_HIGHLIGHT : '']"
  >
    <span data-slot="app-preview-check" class="mt-px size-4 shrink-0 rounded-xs border border-app-track bg-app-surface" />
    <span class="text-2xs text-app-foreground">
      {{ props.label }}<span v-if="props.required" class="text-app-danger"> *</span>
    </span>
  </div>
  <div
    v-else
    data-slot="app-preview-field"
    :data-type="props.type"
    :data-highlighted="props.highlighted || undefined"
    :class="['flex shrink-0 flex-col gap-1 rounded-xs', props.highlighted ? APP_HIGHLIGHT : '']"
  >
    <span data-slot="app-preview-field-label" class="flex items-center gap-1 text-2xs font-bold text-app-foreground">
      <span>{{ props.label }}<span v-if="props.required" class="text-app-danger"> *</span></span>
      <span v-if="props.hint !== 'none'" data-slot="app-preview-field-hint" class="flex text-app-foreground-secondary">
        <Icon :name="props.hint === 'photo' ? 'image' : 'help'" :size="12" />
      </span>
    </span>
    <span data-slot="app-preview-field-box" class="flex h-8 items-center gap-2 rounded-sm border border-app-track bg-app-surface px-2 text-2xs text-app-foreground-secondary">
      <span class="min-w-0 flex-1 truncate">{{ props.placeholder }}</span>
      <Icon v-if="props.type === 'date'" name="calendar-month" :size="12" />
      <Icon v-else-if="props.type === 'choice'" name="chevron-down" :size="12" />
    </span>
  </div>
</template>
