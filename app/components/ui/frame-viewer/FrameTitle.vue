<script setup lang="ts">
import { cn } from '@/lib/utils'
import FrameStatus from './FrameStatus.vue'

/**
 * Заголовок кадра в верхней полосе просмотра — имя файла и метка `FrameStatus`, такт 34;
 * компонентом с довеска 1 к такту 35 (правило «страница собирается только из компонентов»).
 * Прототип `#lbFile` 13 600 белый (§11.1) → `text-sm` medium `--foreground`: шкала, 600 запрещён
 * (`free-shoot.md`, 12.5). Имя обрезается многоточием, метка не сжимается; зазор 12.
 * Встаёт в слот действий `Lightbox` — по центру полосы (решение владельца 1, такт 34).
 */
const props = withDefaults(defineProps<{
  /** Имя файла кадра. */
  name: string
  assigned?: boolean
  class?: string
}>(), { assigned: false })
</script>

<template>
  <span data-slot="frame-title" :class="cn('flex min-w-0 items-center gap-3', props.class)">
    <span class="truncate text-sm font-medium text-foreground">{{ props.name }}</span>
    <FrameStatus :assigned="props.assigned" />
  </span>
</template>
