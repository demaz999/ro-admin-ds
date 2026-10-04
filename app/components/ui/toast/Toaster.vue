<!--
  @debt Стека, области показа и анимации входа у Атома нет: нарисована
  одиночная плашка `Notification` 5883:58974. Угол, зазор и порядок — дефолт.
  См. docs/design-debt.md
-->
<script setup lang="ts">
import { ToastPortal, ToastProvider, ToastViewport } from 'reka-ui'

/**
 * Область показа уведомлений. Кладётся один раз в раскладку.
 *
 * Правый нижний угол, зазор 12, новые снизу — всё три дефолт, у Атома этого
 * нет. Разбор — в `index.ts`.
 *
 * Такт 55, решение владельца 2026-10-01: угол — ось `side`; отступы от края окна — `x` и `bottom` (CSS-значения,
 * как `x` и `y` у `ActionBar`): экран ставит стопку у левого края своей ленты и поднимает её над панелью выделения.
 *
 * Такт 81: `pointer-events-auto` у области — уведомление нажимается поверх модального окна (модальный слой Reka ставит
 * `body { pointer-events: none }`). Без уведомлений Reka сама гасит нажатия области встроенным стилем; нажатие по
 * уведомлению окно не закрывает: область — `DismissableLayerBranch`. Изменение после передачи — `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Сколько плашка живёт, мс. Дефолт: у Атома времени жизни нет вовсе. */
  duration?: number
  /** Угол окна: правый нижний (дефолт) или левый нижний. */
  side?: 'right' | 'left'
  /** Отступ стопки от боковой стороны окна — CSS-значение; без него — 24. */
  x?: string
  /** Отступ стопки от низа окна — CSS-значение; без него — 24. */
  bottom?: string
}>(), { duration: 5000, side: 'right', x: undefined, bottom: undefined })
</script>

<template>
  <ToastProvider :duration="props.duration" :swipe-direction="props.side">
    <slot />
    <ToastPortal>
      <ToastViewport
        data-slot="toaster"
        :data-side="props.side"
        class="pointer-events-auto fixed bottom-6 z-100 flex w-90 flex-col gap-3 outline-none transition-[bottom]"
        :class="props.side === 'left' ? 'left-6' : 'right-6'"
        :style="{ [props.side]: props.x, bottom: props.bottom, transitionDuration: 'var(--duration-zoom)' }"
      />
    </ToastPortal>
  </ToastProvider>
</template>
