<script setup lang="ts">
import { TabsContent } from 'reka-ui'

/** Панель вкладки. В мастере её нет: он рисует только сами вкладки. */
defineProps<{ value: string }>()
</script>

<template>
  <TabsContent :value="value" data-slot="tabs-content" class="outline-none">
    <slot />
  </TabsContent>
</template>
