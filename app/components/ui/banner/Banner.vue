<script setup lang="ts">
import type { BannerVariants } from '.'
import { computed } from 'vue'
import { bannerText, bannerVariants } from '.'

/**
 * Промо-плашка — мастер `Announcement` `149:1663`.
 * Две оси мастера дают три ступени текста; разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  size?: BannerVariants['size']
}>(), { size: 'md' })

const t = computed(() => bannerText[props.size ?? 'md'])
</script>

<template>
  <div data-slot="banner" :class="bannerVariants({ size: props.size })">
    <slot name="media" />
    <span class="font-bold" :class="t.title">
      <slot name="title" />
    </span>
    <span class="text-muted-foreground" :class="t.hint">
      <slot />
    </span>
  </div>
</template>
