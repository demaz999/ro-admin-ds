<script setup lang="ts">
import type { DiffKind } from '.'

/**
 * Строка изменения: что изменилось, «было → стало» и следствие — что изменится в поведении. Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  label: string
  before?: string
  after?: string
  effect?: string
  kind?: DiffKind
}>(), { before: '', after: '', effect: '', kind: 'changed' })
</script>

<template>
  <div data-slot="diff-change" :data-kind="props.kind" class="flex min-w-0 flex-col gap-0.5 text-xs">
    <span data-slot="diff-change-label" class="font-medium text-foreground" :class="props.kind === 'removed' ? 'line-through' : ''">{{ props.label }}</span>
    <span v-if="props.before || props.after" data-slot="diff-change-values" class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-foreground-secondary">
      <span v-if="props.before" data-slot="diff-change-before" class="min-w-0 break-words line-through">{{ props.before }}</span>
      <span v-if="props.before && props.after" aria-hidden="true">→</span>
      <span v-if="props.after" data-slot="diff-change-after" class="min-w-0 break-words text-foreground">{{ props.after }}</span>
    </span>
    <span v-if="props.effect" data-slot="diff-change-effect" class="text-warning-strong">{{ props.effect }}</span>
  </div>
</template>
