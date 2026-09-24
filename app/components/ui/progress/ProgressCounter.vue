<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Строка счётчика окна прогресса автораспределения (спека VA-9265 §12.5): «Кадров обработано
 * 31 / 132» — подпись слева, значение справа табличными цифрами. Такт 35. Прототип `.wrow`:
 * 13/18.9, подпись `#55677A`, значение `#20303F`, паддинг 3/0. Кит: `text-xs`, подпись
 * `--foreground-secondary`, значение medium `--foreground`, паддинг 4/0 (шкала 4) — прецедент
 * `FrameMeta` такта 34.
 */
const props = defineProps<{
  label: string
  value: string
  class?: string
}>()
</script>

<template>
  <div data-slot="progress-counter" :class="cn('flex items-baseline justify-between gap-3 py-1 text-xs', props.class)">
    <span class="text-foreground-secondary">{{ props.label }}</span>
    <span class="font-medium text-foreground tabular-nums">{{ props.value }}</span>
  </div>
</template>
