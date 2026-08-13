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
}>(), {
  page: 1,
  pages: 7,
})

const emit = defineEmits<{ 'update:page': [value: number] }>()

const items = computed(() => Array.from({ length: props.pages }, (_, i) => i + 1))

function go(next: number) {
  if (next >= 1 && next <= props.pages) emit('update:page', next)
}
</script>

<template>
  <nav data-slot="pagination" class="flex items-center gap-4" aria-label="Страницы">
    <button
      type="button"
      class="inline-flex items-center outline-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]"
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
      class="inline-flex items-center outline-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]"
      :disabled="props.page >= props.pages"
      aria-label="Следующая страница"
      @click="go(props.page + 1)"
    >
      <Icon name="chevron-right" :size="16" />
    </button>
  </nav>
</template>
