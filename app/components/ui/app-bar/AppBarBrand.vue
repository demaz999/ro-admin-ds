<script setup lang="ts">
/**
 * Бренд в полосе приложения. С логотипом (`logo`) — картинка 182×32 по `top_menu` `33970:14832`, подпись слота — её
 * текстовая замена; без логотипа — текст-местозаполнитель. Значения — `index.ts`.
 */
const props = withDefaults(defineProps<{ logo?: string }>(), { logo: '' })
</script>

<template>
  <span data-slot="app-bar-brand" class="flex shrink-0 items-center text-xs font-bold tracking-widest whitespace-nowrap text-sidebar-foreground">
    <template v-if="props.logo">
      <img :src="props.logo" alt="" class="h-8 w-45.5">
      <span class="sr-only"><slot /></span>
    </template>
    <slot v-else />
  </span>
</template>
