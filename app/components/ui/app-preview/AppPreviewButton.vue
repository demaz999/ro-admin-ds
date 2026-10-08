<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { APP_HIGHLIGHT, APP_PRESSABLE } from '.'

/**
 * Кнопка экрана приложения — макет `next-btn` `33694:3923` и `impossible-inspection-btn` `33694:3918`: высота 32, радиус 6,
 * поля 8, подпись 12/16 bold. Разбор — `index.ts`.
 *
 * | вариант | вид | источник |
 * |---|---|---|
 * | `primary` | заливка `--app-accent`, текст `--app-accent-foreground` | «Продолжить» `33694:3923` |
 * | `refuse` | контур 1 `--app-danger`, текст и глиф `--app-danger` через 8, поверхность `--app-surface`; глиф — треугольник `warning` 11 в боксе 12 (такт 90, решение 1 оркестратора; до такта 90 — `error` 12) | «Осмотр невозможен» `33694:3918`, `alert-triangle` `33694:3920` — 11 × 10 в боксе 12; решение 3 оркестратора такта 89: «контурная, тон ошибки, с иконкой» |
 * | `outline` | контур 1 `--app-accent`, текст `--app-accent` | второстепенное действие экрана — по аналогии с `refuse` |
 * | `link` | текст `--app-accent` без поверхности | «Пропустить шаг» — по аналогии |
 *
 * Обведённая — у контурных рамка 2 `--app-highlight` вместо своей и свечение (макет `33694:3918`), у прочих — кольцо снаружи.
 * `pressable` — кнопка нажимается (переход демо-осмотра): фокус с клавиатуры — кольцо `--ring`; иначе это изображение кнопки.
 */
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'refuse' | 'outline' | 'link'
  highlighted?: boolean
  pressable?: boolean
}>(), { variant: 'primary', highlighted: false, pressable: false })

const emit = defineEmits<{ press: [] }>()

const outlined = computed(() => props.variant === 'refuse' || props.variant === 'outline')
/* Ширина рамки обведённой — слиянием через `cn`: `border` и `border-2` рядом решал бы порядок в CSS. */
const look = computed(() => cn(
  'flex h-8 w-full shrink-0 items-center justify-center gap-2 rounded-sm px-2 text-2xs font-bold',
  props.variant === 'primary' ? 'bg-app-accent text-app-accent-foreground'
  : props.variant === 'refuse' ? 'border bg-app-surface text-app-danger'
    : props.variant === 'outline' ? 'border bg-app-surface text-app-accent'
      : 'text-app-accent',
  outlined.value
    ? (props.highlighted ? 'border-2 border-app-highlight shadow-app-highlight' : props.variant === 'refuse' ? 'border-app-danger' : 'border-app-accent')
    : (props.highlighted ? APP_HIGHLIGHT : ''),
  props.pressable ? APP_PRESSABLE : '',
))
</script>

<template>
  <button
    v-if="props.pressable"
    type="button"
    data-slot="app-preview-button"
    :data-variant="props.variant"
    :data-highlighted="props.highlighted || undefined"
    :class="look"
    @click="emit('press')"
  >
    <!-- Глиф «Осмотр невозможен» — треугольник 11 × 9.5 в боксе 12, как вектор 11 × 10 в боксе 12 макета (такт 90). -->
    <span v-if="props.variant === 'refuse'" data-slot="app-preview-button-icon" class="flex size-3 shrink-0 items-center justify-center">
      <Icon name="warning" :size="11" />
    </span>
    <slot />
  </button>
  <div
    v-else
    data-slot="app-preview-button"
    :data-variant="props.variant"
    :data-highlighted="props.highlighted || undefined"
    :class="look"
  >
    <!-- Глиф «Осмотр невозможен» — треугольник 11 × 9.5 в боксе 12, как вектор 11 × 10 в боксе 12 макета (такт 90). -->
    <span v-if="props.variant === 'refuse'" data-slot="app-preview-button-icon" class="flex size-3 shrink-0 items-center justify-center">
      <Icon name="warning" :size="11" />
    </span>
    <slot />
  </div>
</template>
