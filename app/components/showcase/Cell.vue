<script setup lang="ts">
defineProps<{
  /** Подпись состояния: default, hover, focus, disabled, error. */
  label: string
  /** Пояснение, если состояние показано условно, а не по-настоящему. */
  hint?: string
}>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <div class="flex items-baseline gap-2">
      <span class="font-mono text-xs text-muted-foreground">{{ label }}</span>
      <span v-if="hint" class="text-xs text-muted-foreground/70">{{ hint }}</span>
    </div>
    <div class="flex min-h-12 flex-wrap items-center gap-3 rounded-md border border-dashed border-border p-3">
      <slot />
    </div>
  </div>
</template>
