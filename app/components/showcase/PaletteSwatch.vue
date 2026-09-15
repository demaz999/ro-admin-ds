<script setup lang="ts">
import type { PaletteToken } from './palette-groups'

/**
 * Один свотч палитры: заливка через var(), имя, hex текущей темы, роль.
 *
 * Подложка выбирается по яркости, чтобы читалась граница: тёмный цвет — на светлой,
 * светлый — на тёмной, полупрозрачный — на обеих сразу (у него вид зависит от фона).
 */
defineProps<{
  token: PaletteToken
  reading: { hex: string, alpha: number, own: boolean } | null | undefined
  plate: 'light' | 'dark' | 'split' | 'none'
  theme: string
  /** Подписи под свотчем — для узкой ячейки строки «база → состояния». */
  stacked?: boolean
}>()
</script>

<template>
  <div class="flex min-w-0 gap-3" :class="stacked ? 'flex-col gap-2' : 'items-start'">
    <span
      class="relative size-12 shrink-0 overflow-hidden rounded-md border border-border"
      :class="{ 'bg-background': plate === 'light', 'bg-foreground': plate === 'dark', 'border-dashed': plate === 'none' }"
    >
      <template v-if="plate === 'split'">
        <span class="absolute inset-x-0 top-0 h-1/2 bg-background" />
        <span class="absolute inset-x-0 bottom-0 h-1/2 bg-foreground" />
      </template>
      <span
        v-if="plate !== 'none'"
        class="absolute inset-1.5 rounded-xs"
        :style="{ background: `var(${token.name})` }"
      />
    </span>

    <span class="flex min-w-0 flex-col gap-0.5">
      <code class="text-xs font-medium break-all">{{ token.name }}</code>
      <span v-if="reading" class="font-mono text-xs text-muted-foreground">
        {{ reading.hex }}<template v-if="reading.alpha < 1"> · α {{ Math.round(reading.alpha * 100) }}%</template>
        <template v-if="!reading.own"> · из rososmotr</template>
      </span>
      <span v-else class="text-xs text-destructive">нет в теме {{ theme }}</span>
      <span class="text-xs">{{ token.role }}</span>
    </span>
  </div>
</template>
