<script setup lang="ts">
import { hyperlinkVariants, type HyperlinkVariants } from '.'

/**
 * Ссылка. Два вида: подчёркнутая с мастера `ButtonLink` `5792:97292` Атома и
 * акцентная с `text_link` кита 1. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Вид: подчёркнутая ссылка Атома либо акцентный заголовок кита 1. */
  variant?: NonNullable<HyperlinkVariants['variant']>
  size?: NonNullable<HyperlinkVariants['size']>
  href?: string
}>(), {
  variant: 'underline',
  size: 'md',
  href: undefined,
})
</script>

<template>
  <component
    :is="props.href ? 'a' : 'span'"
    data-slot="link"
    :href="props.href"
    :class="hyperlinkVariants({ variant: props.variant, size })"
  >
    <slot />
  </component>
</template>
