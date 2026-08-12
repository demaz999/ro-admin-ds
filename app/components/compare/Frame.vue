<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /** Подпись сравнения. */
  title: string
  /** Файл эталона в public/compare/kit. */
  master: string
  /** Ширина и высота вырезаемой области эталона, px — размер варианта в мастере. */
  width: number
  height: number
  /** Смещение варианта внутри мастера, px. Берётся из get_metadata мастера. */
  x?: number
  y?: number
  /** node-id мастера — чтобы было видно, с чем сверяемся. */
  node?: string
  /** Комментарий: что именно расходится. */
  note?: string
}>()

type Mode = 'side' | 'overlay' | 'diff'

const mode = ref<Mode>('overlay')
const opacity = ref(50)

const modes: { value: Mode, label: string }[] = [
  { value: 'side', label: 'рядом' },
  { value: 'overlay', label: 'наложение' },
  { value: 'diff', label: 'разница' },
]

function masterStyle() {
  return {
    width: `${props.width}px`,
    height: `${props.height}px`,
    backgroundImage: `url(/compare/kit/${props.master})`,
    backgroundPosition: `-${props.x ?? 0}px -${props.y ?? 0}px`,
    backgroundRepeat: 'no-repeat',
  }
}
</script>

<template>
  <div class="space-y-3 border-t border-border pt-6">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h3 class="text-sm font-bold">
        {{ title }}
      </h3>
      <code v-if="node" class="text-xs text-muted-foreground">{{ node }}</code>
      <div class="ml-auto flex items-center gap-3">
        <div class="flex gap-1">
          <button
            v-for="m in modes"
            :key="m.value"
            type="button"
            class="rounded-sm px-2 py-1 text-xs"
            :class="mode === m.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            @click="mode = m.value"
          >
            {{ m.label }}
          </button>
        </div>
        <label v-if="mode !== 'side'" class="flex items-center gap-2 text-xs text-muted-foreground">
          {{ opacity }}%
          <input v-model.number="opacity" type="range" min="0" max="100" class="w-24">
        </label>
      </div>
    </div>

    <p v-if="note" class="text-xs text-muted-foreground">
      {{ note }}
    </p>

    <!-- рядом -->
    <div v-if="mode === 'side'" class="flex flex-wrap items-start gap-6">
      <div class="space-y-1">
        <span class="text-xs text-muted-foreground">эталон</span>
        <div :style="masterStyle()" class="outline outline-dashed outline-border" />
      </div>
      <div class="space-y-1">
        <span class="text-xs text-muted-foreground">код</span>
        <div
          class="relative outline outline-dashed outline-border"
          :style="{ width: `${width}px`, height: `${height}px` }"
        >
          <slot />
        </div>
      </div>
    </div>

    <!-- наложение и разница -->
    <div
      v-else
      class="relative outline outline-dashed outline-border"
      :style="{ width: `${width}px`, height: `${height}px` }"
    >
      <div class="absolute inset-0" :style="masterStyle()" />
      <div
        class="absolute inset-0"
        :style="{
          opacity: opacity / 100,
          mixBlendMode: mode === 'diff' ? 'difference' : 'normal',
          filter: mode === 'diff' ? 'invert(1)' : 'none',
        }"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
