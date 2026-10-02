<script setup lang="ts">
import type { DiffAreaItem, DiffWarning } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { Callout } from '../callout'
import DiffArea from './DiffArea.vue'
import DiffGroup from './DiffGroup.vue'

/**
 * Дифф конфигураций: «Требует внимания», предупреждения, сводка по областям с деталями, итог. Разбор — `index.ts`.
 *
 * Пример: `<Diff :areas="d.areas" :attention="d.attention" :warnings="warnings" :total="d.total" />`
 */
const props = withDefaults(defineProps<{
  /** Области сводки — все, по порядку. */
  areas?: DiffAreaItem[]
  /** Опасные изменения: удаления, смена типа объекта, отключение согласования. */
  attention?: string[]
  /** Предупреждения валидации; критичные блокируют публикацию — решает потребитель. */
  warnings?: DiffWarning[]
  /** Итоговая строка: «Итого: 30 изменений в 3 разделах». */
  total?: string
  class?: string
}>(), { areas: () => [], attention: () => [], warnings: () => [], total: '' })

const critical = computed(() => props.warnings.some(w => w.critical))
</script>

<template>
  <div data-slot="diff" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <!-- Опасное — сверху и всегда раскрыто: в рутине не тонет. -->
    <slot name="attention">
      <Callout v-if="props.attention.length" tone="warning" :title="`Требует внимания · ${props.attention.length}`" data-diff-attention>
        <ul>
          <li v-for="a in props.attention" :key="a">
            {{ a }}
          </li>
        </ul>
      </Callout>
    </slot>

    <Callout v-if="props.warnings.length" :tone="critical ? 'destructive' : 'warning'" :title="`Предупреждения: ${props.warnings.length}`" data-diff-warnings>
      <ul>
        <li v-for="w in props.warnings" :key="w.text" :data-critical="w.critical || undefined">
          {{ w.text }}{{ w.critical ? ' — публикация невозможна' : '' }}
        </li>
      </ul>
    </Callout>

    <div v-if="props.areas.length || $slots.default" data-slot="diff-areas" class="flex flex-col">
      <slot>
        <DiffArea v-for="a in props.areas" :key="a.id" :title="a.title" :count="a.count" :tone="a.tone" :data-area="a.id">
          <DiffGroup v-for="g in a.groups" :key="g.kind" :kind="g.kind" :items="g.items" />
        </DiffArea>
      </slot>
    </div>

    <p v-if="props.total" data-slot="diff-total" class="m-0 w-fit rounded-md bg-accent px-3 py-2 text-xs text-foreground">
      {{ props.total }}
    </p>
  </div>
</template>
