<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Блок панели фильтров — карточка с обводкой.
 *
 * Замер снят с мастера `saved_filter` `23952:86296` (инстанс на кадре —
 * `20304:54611`):
 *
 * | Что | С мастера | В коде |
 * |---|---|---|
 * | заливка | `bg/page` белая | `bg-card` |
 * | обводка | `border/default` `#ccdef5`, толщина 1 | `border border-border` |
 * | скругление | 16 | `rounded-xl` |
 * | паддинг | 16 | `p-4` |
 * | зазор | 24 | `gap-6` |
 *
 * Обводка есть у **обоих** блоков колонки — и у сохранённых отборов, и у самих
 * фильтров: проверено экспортом кадра `20304:54610`, а не только по узлу
 * мастера. В сборке она была потеряна: блоки стояли на голой заливке.
 *
 * Поэтому блок — компонент, а не класс на странице: иначе обводка чинится в
 * одном месте и остаётся забытой в другом.
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <section
    data-slot="filter-panel-section"
    :class="cn('flex flex-col gap-6 rounded-xl border border-border bg-card p-4', props.class)"
  >
    <slot />
  </section>
</template>
