<script setup lang="ts">
import { cn } from '@/lib/utils'
import { APP_HIGHLIGHT } from '.'

/**
 * Текст экрана приложения. Разбор — `index.ts`.
 *
 * | вариант | вид | источник |
 * |---|---|---|
 * | `heading` | 12/16 bold `--app-foreground` — «Шаг 3: Фото переднего бампера» | `33694:3910`, `Txt/bold12-16` |
 * | `secondary` | 12/16 regular `--app-foreground-secondary` — описание шага | `33694:3911`, `Txt/regular12-16` |
 * | `body` | 12/16 regular `--app-foreground` — основной текст экрана | по аналогии с `secondary` |
 * | `title` | 15/20 bold `--app-foreground` — заголовок экрана без шагов («Осмотр отправлен») | ступень `Txt/bold15-20` макета (`33694:3926`) |
 * | `note` | 12/16 regular `--app-foreground` на `--app-note`, поля 8, радиус 6 — подсказка на экране | по аналогии с кнопкой: поля 8, радиус 6 |
 * | `empty` | пустой экран: заголовок 15/20 bold и пояснение 12/16 `--app-foreground-secondary` по центру | по аналогии с `title`, `secondary` |
 */
const props = withDefaults(defineProps<{
  variant?: 'heading' | 'secondary' | 'body' | 'title' | 'note' | 'empty'
  /** Заголовок пустого экрана — у `empty`; пояснение — слотом. */
  title?: string
  highlighted?: boolean
  class?: string
}>(), { variant: 'body', title: '', highlighted: false })
</script>

<template>
  <div
    v-if="props.variant === 'empty'"
    data-slot="app-preview-text"
    data-variant="empty"
    :data-highlighted="props.highlighted || undefined"
    :class="cn('flex shrink-0 flex-col items-center gap-1 rounded-xs px-2 py-6 text-center', props.highlighted ? APP_HIGHLIGHT : '', props.class)"
  >
    <span data-slot="app-preview-text-title" class="text-sm font-bold text-app-foreground">{{ props.title }}</span>
    <span class="text-2xs text-app-foreground-secondary"><slot /></span>
  </div>
  <p
    v-else
    data-slot="app-preview-text"
    :data-variant="props.variant"
    :data-highlighted="props.highlighted || undefined"
    :class="cn(
      'm-0 shrink-0',
      props.variant === 'title' ? 'text-sm font-bold text-app-foreground'
      : props.variant === 'heading' ? 'text-2xs font-bold text-app-foreground'
        : props.variant === 'secondary' ? 'text-2xs text-app-foreground-secondary'
          : props.variant === 'note' ? 'rounded-sm bg-app-note p-2 text-2xs text-app-foreground'
            : 'text-2xs text-app-foreground',
      props.variant === 'note' ? '' : 'rounded-xs',
      props.highlighted ? APP_HIGHLIGHT : '',
      props.class,
    )"
  >
    <slot />
  </p>
</template>
