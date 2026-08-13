<script setup lang="ts">
import { TabsRoot } from 'reka-ui'

/** Корень вкладок — мастер `Tabs` `1782:13075`. Вид задаётся списком, не корнем. */
const model = defineModel<string>({ default: '' })
</script>

<template>
  <TabsRoot v-model="model" class="flex flex-col">
    <slot />
  </TabsRoot>
</template>
