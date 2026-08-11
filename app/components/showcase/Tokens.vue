<script setup lang="ts">
import { computed } from 'vue'
import { tokenKind, useDesignTokens } from '~/composables/useDesignTokens'

const props = defineProps<{
  /** Показывать только токены, чьё имя начинается с этого префикса. */
  prefix?: string
  /** Ограничить показ одним видом значений. */
  kind?: 'color' | 'length' | 'font' | 'other'
}>()

const { tokens } = useDesignTokens()

const shown = computed(() =>
  tokens.value.filter((t) => {
    if (props.prefix && !t.name.startsWith(props.prefix)) return false
    if (props.kind && tokenKind(t) !== props.kind) return false
    return true
  }),
)
</script>

<template>
  <p v-if="!shown.length" class="text-sm text-muted-foreground">
    Токенов по этому фильтру нет.
  </p>

  <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <li
      v-for="token in shown"
      :key="token.name"
      class="flex items-center gap-3 rounded-md border border-border p-3"
    >
      <span
        v-if="tokenKind(token) === 'color'"
        class="size-10 shrink-0 rounded-md border border-border"
        :style="{ background: `var(${token.name})` }"
      />
      <span
        v-else-if="tokenKind(token) === 'length'"
        class="flex size-10 shrink-0 items-center justify-center"
      >
        <span
          class="block h-6 bg-foreground/70"
          :style="{ width: `var(${token.name})`, maxWidth: '2.5rem' }"
        />
      </span>
      <span
        v-else
        class="flex size-10 shrink-0 items-center justify-center text-lg"
        :style="{ fontFamily: `var(${token.name})` }"
      >
        Aa
      </span>

      <span class="flex min-w-0 flex-col">
        <code class="truncate text-xs font-medium">{{ token.name }}</code>
        <span class="truncate font-mono text-xs text-muted-foreground">{{ token.resolved }}</span>
      </span>
    </li>
  </ul>
</template>
