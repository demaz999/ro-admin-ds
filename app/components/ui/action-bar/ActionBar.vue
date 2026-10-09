<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Полоса действий над выделением — разбор и таблица «кит | прототип» в `index.ts`.
 * Что делают действия — страница; полоса только держит счёт, подпись и слот.
 */
const props = withDefaults(defineProps<{
  /** Строка счёта: «5 кадров выбрано». */
  count: string
  /** Подпись под счётом: «1 видео · 2 уже распределено». */
  sub?: string
  /** Закрытая полоса уезжает за нижний край и не принимает фокус; у панели — не рисуется. */
  open?: boolean
  /** Центр полосы по горизонтали — CSS-значение `left`, по умолчанию центр окна. */
  x?: string
  /**
   * Второе размещение (такт 43, §8.5): полоса у выделенного текста — нижний край на `y` (CSS-значение `top`), центр — `x`.
   * Закрытая в этом размещении скрыта целиком. Без `y` — прибита к низу окна.
   */
  y?: string
  /**
   * Раскладка (такт 69): `float` — плавающая полоса в одну строку (прежняя, по умолчанию); `panel` — панель в потоке
   * страницы во всю ширину контейнера: строка счёта сверху, действия ниже с переносом строк (Figma `32765:6576`).
   * У панели `x` и `y` не действуют.
   *
   * Такт 92: `dock` — полоса главного действия, прибитая к низу окна во всю ширину (узкий экран страницы схемы: «Опубликовать
   * схему» и «⋯»): действия слотом в строку, `count` — имя полосы для чтения с экрана, на полосе не рисуется; `x` и `y` не
   * действуют.
   */
  layout?: 'float' | 'panel' | 'dock'
  class?: string
}>(), {
  sub: '',
  open: true,
  x: '50%',
  y: undefined,
  layout: 'float',
})
</script>

<template>
  <div
    v-if="props.layout === 'panel'"
    v-show="props.open"
    data-slot="action-bar"
    data-layout="panel"
    :data-state="props.open ? 'open' : 'closed'"
    role="toolbar"
    :aria-label="props.count"
    :class="cn('flex w-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground', props.class)"
  >
    <div class="flex min-w-0 items-baseline gap-3">
      <span data-slot="action-bar-count" class="text-sm font-bold">{{ props.count }}</span>
      <span v-if="props.sub" data-slot="action-bar-sub" class="min-w-0 truncate text-2xs text-muted-foreground">{{ props.sub }}</span>
    </div>
    <div data-slot="action-bar-actions" class="flex min-w-0 flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
  <!--
    Полоса у низа окна — такт 92: во всю ширину, поверхность `--card`, линия 1 `--border` сверху, поля 12 / 16 (снизу — ещё
    отступ безопасной зоны экрана), действия через 8. Закрытая не рисуется.
  -->
  <div
    v-else-if="props.layout === 'dock'"
    v-show="props.open"
    data-slot="action-bar"
    data-layout="dock"
    :data-state="props.open ? 'open' : 'closed'"
    role="toolbar"
    :aria-label="props.count"
    :class="cn('fixed inset-x-0 bottom-0 z-40 flex min-w-0 items-center gap-2 border-t border-border bg-card px-4 pt-3 pb-[calc(var(--spacing)*3+env(safe-area-inset-bottom))] text-card-foreground', props.class)"
  >
    <slot />
  </div>
  <div
    v-else
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
