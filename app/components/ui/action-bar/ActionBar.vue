<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Плавающая полоса действий над лентой — разбор и таблица «кит | прототип» в `index.ts`.
 * Что делают действия — страница; полоса только держит счёт, подпись и слот.
 */
const props = withDefaults(defineProps<{
  /** Строка счёта: «5 кадров выбрано». */
  count: string
  /** Подпись под счётом: «1 видео · 2 уже распределено». */
  sub?: string
  /** Закрытая полоса уезжает за нижний край и не принимает фокус. */
  open?: boolean
  /** Центр полосы по горизонтали — CSS-значение `left`, по умолчанию центр окна. */
  x?: string
  /**
   * Второе размещение (такт 43, §8.5): полоса у выделенного текста — нижний край на `y` (CSS-значение `top`), центр — `x`.
   * Закрытая в этом размещении скрыта целиком. Без `y` — прибита к низу окна.
   */
  y?: string
  class?: string
}>(), {
  sub: '',
  open: true,
  x: '50%',
  y: undefined,
})
</script>

<template>
  <div
    data-slot="action-bar"
    :data-state="props.open ? 'open' : 'closed'"
    role="toolbar"
    :aria-label="props.count"
    :aria-hidden="props.open ? undefined : 'true'"
    :inert="props.open ? undefined : true"
    :class="cn(
      'fixed z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-popover py-2 pr-2 pl-4 text-popover-foreground shadow-dropdown transition-transform',
      props.y === undefined ? 'bottom-5' : '-translate-y-full',
      props.y === undefined ? (props.open ? 'translate-y-0' : 'translate-y-[150%]') : (props.open ? '' : 'hidden'),
      props.class,
    )"
    :style="{ left: props.x, top: props.y, transitionDuration: 'var(--duration-zoom)' }"
  >
    <div class="mr-1.5 flex flex-col whitespace-nowrap">
      <span data-slot="action-bar-count" class="text-sm font-medium">{{ props.count }}</span>
      <span v-if="props.sub" data-slot="action-bar-sub" class="max-w-52 truncate text-2xs text-muted-foreground">{{ props.sub }}</span>
    </div>
    <slot />
  </div>
</template>
