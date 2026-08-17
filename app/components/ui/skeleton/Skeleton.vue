<!--
  @debt Дефолт shadcn-vue: скелетона нет ни в Атоме, ни в ките 1. Спиннер —
  это ожидание без формы, а не скелетон. См. docs/design-debt.md
-->
<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Заглушка загрузки. Разбор и статус долга — в `index.ts`. */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div
    data-slot="skeleton"
    :class="cn('animate-pulse rounded-md bg-muted', props.class)"
  />
</template>
