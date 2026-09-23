<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Служебная строка панели структуры — прототип v17 `.hintbox`, спека §9.2, §13.3.
 * Такт 32. Текст — со страницы: «Скрыто проверенных шагов: N» (внутри повтора),
 * «Принято и скрыто: N объектов», «Повторов пока нет — …» (в этапе).
 *
 * `.hintbox`: 12.5/18 `#8A9AAB`, паддинг 12/14 → `text-xs` 13/16 `--muted-foreground`,
 * паддинг 12 (`p-3`).
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <p data-slot="stage-note" :class="cn('p-3 text-xs text-muted-foreground', props.class)">
    <slot />
  </p>
</template>
