<script setup lang="ts">
import { computed } from 'vue'
import Kbd from './Kbd.vue'

/**
 * Текст с клавишами: `[Shift] + клик` → «Shift» клавишей, остальное — текстом.
 * Разметка квадратными скобками — та же, что в строках окна «Горячие клавиши» прототипа
 * (`<span class="kbd">`), без HTML.
 */
const props = defineProps<{ text: string }>()

const parts = computed(() => props.text.split(/\[([^\]]+)\]/).map((value, i) => ({ value, key: i % 2 === 1 })))
</script>

<template>
  <span data-slot="kbd-text"><template v-for="(p, i) in parts" :key="i"><Kbd v-if="p.key">{{ p.value }}</Kbd><template v-else>{{ p.value }}</template></template></span>
</template>
