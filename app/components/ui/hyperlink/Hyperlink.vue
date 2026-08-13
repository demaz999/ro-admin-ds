<script setup lang="ts">
import { hyperlinkVariants, type HyperlinkVariants } from '.'

/**
 * Ссылка — мастер `ButtonLink` `5792:97292`.
 * Подчёркивание — отдельный слой 2px, поэтому оно граница, а не `text-decoration`.
 */
const props = withDefaults(defineProps<{
  size?: NonNullable<HyperlinkVariants['size']>
  href?: string
}>(), {
  size: 'md',
  href: undefined,
})
</script>

<template>
  <component
    :is="props.href ? 'a' : 'span'"
    data-slot="link"
    :href="props.href"
    :class="hyperlinkVariants({ size })"
  >
    <slot />
  </component>
</template>
