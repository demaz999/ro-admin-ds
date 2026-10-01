<script setup lang="ts">
import { useId } from 'vue'

/** Группа контролов полосы с подписью — прототип `.ctlgrp`; значения — `index.ts`. */
const props = withDefaults(defineProps<{ label?: string }>(), { label: '' })
const id = useId()
</script>

<template>
  <div data-slot="toolbar-group" role="group" :aria-labelledby="props.label ? id : undefined" class="flex shrink-0 items-center gap-2">
    <span v-if="props.label" :id="id" data-slot="toolbar-group-label" class="text-xs text-muted-foreground">{{ props.label }}</span>
    <slot />
  </div>
</template>
