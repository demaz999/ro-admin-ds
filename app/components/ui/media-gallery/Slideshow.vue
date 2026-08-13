<script setup lang="ts">
import { ref } from 'vue'

/**
 * Слайдшоу — мастера `Slideshow` `5946:53926` и `_PreviewItem` `5946:53594`,
 * спека `5136:37035`.
 *
 * Главный кадр плюс лента превью под ним, зазор 8.
 *
 * | брейкпоинт | кадр | лента |
 * |---|---|---|
 * | широкий | 640×400 | 640×73 |
 * | средний и узкий | 288×180 | 288×58 |
 *
 * Главный кадр идёт в **16:10** (640/400 и 288/180 дают 1.6) — как плитка
 * галереи и в отличие от видеоплеера, который в 16:9.
 *
 * ## Активное превью выделено высотой, а не рамкой
 *
 * `_PreviewItem` `5946:53594`: неактивное 104×**65**, активное 104×**73**.
 * Ни заливки, ни обводки — проверено, у обоих `fills` и `strokes` пустые.
 * Активное просто выше и дотягивается до полной высоты ленты.
 *
 * Механизм необычный, но однозначный: превью не подсвечивается, а **вырастает**.
 * Поэтому в коде это высота, а не рамка — иначе выделение читалось бы иначе.
 */
const props = withDefaults(defineProps<{
  /** Число превью в ленте. */
  count?: number
}>(), { count: 5 })

const active = ref(0)
</script>

<template>
  <div data-slot="slideshow" class="flex w-full flex-col gap-2">
    <!-- Главный кадр: 16:10, как плитка галереи. -->
    <div class="aspect-16/10 w-full overflow-hidden rounded-xl bg-muted">
      <slot />
    </div>

    <!-- Лента превью. Активное выше остальных — так в мастере. -->
    <div class="flex items-end gap-2">
      <button
        v-for="i in props.count"
        :key="i"
        type="button"
        class="w-26 shrink-0 overflow-hidden rounded-md bg-muted outline-none"
        :class="active === i - 1 ? 'h-preview-active' : 'h-preview'"
        :aria-current="active === i - 1 ? 'true' : undefined"
        @click="active = i - 1"
      />
    </div>
  </div>
</template>
