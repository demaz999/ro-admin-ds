<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { Tabs, TabsList, TabsTrigger } from '../tabs'

/**
 * Пагинация — мастер `Pagination` `4104:36392`.
 * Номера страниц у Атома это вкладки: внутри мастера лежит инстанс `Tabs`.
 */
const props = withDefaults(defineProps<{
  page?: number
  pages?: number
  /** Сколько номеров показывать. В подвале макета их три. */
  window?: number
}>(), {
  page: 1,
  pages: 7,
  window: 3,
})

const emit = defineEmits<{ 'update:page': [value: number] }>()

/**
 * Окно номеров, а не весь список. У мастера в подвале дашборда видно три
 * номера при 4319 страницах — весь набор туда физически не влезает.
 * Окно: текущая страница с соседями, но не больше `window` номеров.
 */
const items = computed(() => {
  const total = props.pages
  const size = Math.min(props.window, total)
  let start = Math.max(1, props.page - Math.floor(size / 2))
  if (start + size - 1 > total) start = total - size + 1
  return Array.from({ length: size }, (_, i) => start + i)
})

function go(next: number) {
  if (next >= 1 && next <= props.pages) emit('update:page', next)
}
</script>

<template>
  <nav data-slot="pagination" class="flex items-center gap-4" aria-label="Страницы">
    <button
      type="button"
      class="inline-flex items-center rounded-xs text-foreground-secondary outline-none transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      :disabled="props.page <= 1"
      aria-label="Предыдущая страница"
      @click="go(props.page - 1)"
    >
      <Icon name="chevron-left" :size="16" />
    </button>

    <!-- Номера — это вкладки, а не свой набор кнопок. -->
    <Tabs
      :model-value="String(props.page)"
      @update:model-value="v => go(Number(v))"
    >
      <TabsList variant="pill">
        <TabsTrigger
          v-for="n in items"
          :key="n"
          variant="pill"
          :value="String(n)"
        >
          {{ n }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <button
      type="button"
      class="inline-flex items-center rounded-xs text-foreground-secondary outline-none transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      :disabled="props.page >= props.pages"
      aria-label="Следующая страница"
      @click="go(props.page + 1)"
    >
      <Icon name="chevron-right" :size="16" />
    </button>
  </nav>
</template>
