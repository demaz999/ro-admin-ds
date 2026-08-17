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
 */
withDefaults(defineProps<{
  /** Сколько плашка живёт, мс. Дефолт: у Атома времени жизни нет вовсе. */
  duration?: number
}>(), { duration: 5000 })
</script>

<template>
  <ToastProvider :duration="duration" swipe-direction="right">
    <slot />
    <ToastPortal>
      <ToastViewport
        data-slot="toaster"
        class="fixed right-6 bottom-6 z-100 flex w-90 flex-col gap-3 outline-none"
      />
    </ToastPortal>
  </ToastProvider>
</template>
