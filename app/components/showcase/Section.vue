<script setup lang="ts">
defineProps<{
  title: string
  /** Короткое пояснение под заголовком: что именно показывает секция. */
  note?: string
  /** Ссылка на компонент в ките 1, чтобы сверять глазами. */
  figma?: string
}>()
</script>

<template>
  <section class="scroll-mt-8 border-t border-border pt-8">
    <header class="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 class="text-xl font-bold">
        {{ title }}
      </h2>
      <a
        v-if="figma"
        :href="figma"
        target="_blank"
        rel="noreferrer"
        class="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        кит 1 ↗
      </a>
      <p v-if="note" class="w-full text-sm text-muted-foreground">
        {{ note }}
      </p>
    </header>

    <slot />
  </section>
</template>
