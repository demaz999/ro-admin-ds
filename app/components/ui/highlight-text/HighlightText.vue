<script setup lang="ts">
import { computed } from 'vue'
import { matchRanges, queryWords, splitMatches } from '.'

/**
 * Фрагмент текста с подсветкой совпадения — разбор в `index.ts`. Кегль и начертание — от строки, в которой стоит компонент;
 * совпавшие фрагменты — подложка `--search-match` и текст `--foreground`.
 */
const props = withDefaults(defineProps<{
  text: string
  /** Запрос: каждое слово подсвечивается началом слова в тексте, иначе — с середины слова от трёх знаков. */
  query?: string
}>(), { query: '' })

const parts = computed(() => splitMatches(props.text, matchRanges(props.text, queryWords(props.query))))
</script>

<template>
  <span data-slot="highlight-text"><template v-for="(p, i) in parts" :key="i"><mark v-if="p.hit" data-slot="highlight-text-match" class="rounded-2xs bg-search-match text-foreground">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template></span>
</template>
