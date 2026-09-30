<script setup lang="ts">
import { cn } from '@/lib/utils'

/** Светлая полоса во всю ширину области — разбор и таблица «кит | прототип» в `index.ts`. */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div
    data-slot="toolbar"
    :class="cn('flex flex-wrap items-center gap-2 border-b border-border-soft bg-card px-4 py-2', props.class)"
  >
    <slot />
  </div>
</template>
