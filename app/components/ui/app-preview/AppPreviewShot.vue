<script setup lang="ts">
import { Icon } from '../icon'
import { APP_HIGHLIGHT } from '.'

/**
 * Слот съёмки — макет `camera-placeholder` `33694:3912`: высота 100, радиус 8, заливка `--app-slot`; глиф фотоаппарата 24
 * и подпись «Нажмите для съёмки» 12/16 `--app-foreground-secondary` через 12. Разбор — `index.ts`.
 *
 * Фото-подсказка шага (такт 87) — пример слева: картинка 72 × 54 на `--app-surface`, радиус 6, поле 4; глиф и подпись — справа
 * от неё через 12. Без подсказки — как в макете: глиф и подпись по центру. Способ съёмки («1 фото», «от 2 до 7 фото») — второй
 * строкой подписи.
 */
const props = withDefaults(defineProps<{
  label?: string
  /** Способ съёмки второй строкой. */
  caption?: string
  /** Фото-подсказка — картинка каталога либо своей загрузки. */
  src?: string
  highlighted?: boolean
}>(), { label: 'Нажмите для съёмки', caption: '', src: '', highlighted: false })
</script>

<template>
  <div
    data-slot="app-preview-shot"
    :data-hint="props.src ? '' : undefined"
    :data-highlighted="props.highlighted || undefined"
    :class="['flex h-25 shrink-0 items-center justify-center gap-3 rounded-md bg-app-slot px-3', props.src ? 'flex-row' : 'flex-col', props.highlighted ? APP_HIGHLIGHT : '']"
  >
    <img v-if="props.src" data-slot="app-preview-shot-hint" :src="props.src" alt="Пример" class="h-13.5 w-18 shrink-0 rounded-sm bg-app-surface object-contain p-1">
    <span :class="['flex min-w-0 flex-col items-center text-app-foreground-secondary', props.src ? 'gap-1.5' : 'gap-3']">
      <Icon name="photo-camera" :size="24" />
      <span class="flex flex-col items-center text-center text-2xs">
        <span data-slot="app-preview-shot-label">{{ props.label }}</span>
        <span v-if="props.caption" data-slot="app-preview-shot-caption">{{ props.caption }}</span>
      </span>
    </span>
  </div>
</template>
