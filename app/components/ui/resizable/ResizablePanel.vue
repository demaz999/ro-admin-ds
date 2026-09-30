<script setup lang="ts">
import type { SplitterPanelEmits, SplitterPanelProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { SplitterPanel, useForwardPropsEmits } from 'reka-ui'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Панель — Reka `SplitterPanel`; разбор — `index.ts`. Булевы пропы через `undefined` — ловушка `CLAUDE.md`.
 *
 * Панель в пикселях (`sizeUnit="px"`) ставит себе ширину точно: Reka переводит размер в доли группы и пишет
 * `flex-grow` с тремя значащими цифрами, не вычитая ручку, — панель 440 выходила 436.9 (такт 42). Поведение,
 * пределы и клавиатура остаются у Reka: размер приходит событием `resize`, панель рисует его в пикселях, соседняя
 * панель без размера занимает остаток.
 */
const props = withDefaults(defineProps<SplitterPanelProps & { class?: string }>(), { collapsible: undefined })
const emits = defineEmits<SplitterPanelEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)

const px = ref<number | undefined>(props.defaultSize)
function onResize(size: number) {
  if (props.sizeUnit === 'px') px.value = size
}
const exact = computed(() => (props.sizeUnit === 'px' && px.value != null ? { flex: `0 0 ${Math.round(px.value)}px` } : undefined))
</script>

<template>
  <SplitterPanel
    data-slot="resizable-panel"
    v-bind="forwarded"
    :class="cn('min-w-0 min-h-0', props.class)"
    :style="exact"
    @resize="onResize"
  >
    <slot />
  </SplitterPanel>
</template>
