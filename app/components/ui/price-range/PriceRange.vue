<script setup lang="ts">
import { computed } from 'vue'
import { groupDigits } from '../regress-scale/rules'
import { cn } from '@/lib/utils'
import { formatPrice, rangeBounds, rangeKind } from '.'

/**
 * Вилка цен — такт 80 (`docs/tariffs.md`, раздел 8, карточка 4). Формат и провенанс — `index.ts`.
 *
 * Пример: `<PriceRange label="Вилка цен" :min="3500" :max="4500" />` — «Вилка цен от 3 500 ₽ до 4 500 ₽»;
 * `<PriceRange layout="dash" label="Стоимость осмотров группы по умолчанию:" :min="3500" :max="4500" note="наследуется схемами без индивидуальной цены" />`.
 */
const props = withDefaults(defineProps<{
  /** Нижняя граница, ₽; `null` — не задана. */
  min?: number | null
  /** Верхняя граница, ₽; равна `min` — одна сумма; `null` при заданном `min` — «от X ₽». */
  max?: number | null
  /** Подпись перед значением: «Вилка цен», «Стоимость осмотров группы по умолчанию:». */
  label?: string
  /** Пояснение после значения через «·», 12/16. */
  note?: string
  /** `prefixed` — «от X ₽ до Y ₽», строка схемы; `dash` — «X–Y ₽», строка группы и описание режима. */
  layout?: 'prefixed' | 'dash'
  /** `md` — 15/20; `sm` — 13/16, строки списков. */
  size?: 'md' | 'sm'
  unit?: string
  class?: string
}>(), {
  min: null,
  max: null,
  label: '',
  note: '',
  layout: 'prefixed',
  size: 'md',
  unit: '₽',
  class: undefined,
})

const kind = computed(() => rangeKind(props.min, props.max))
const bounds = computed(() => rangeBounds(props.min, props.max))
const price = (n: number) => formatPrice(n, props.unit)

/** Второстепенный текст — `--foreground` на ступени `--opacity-on-tone` (правило такта 50). */
const QUIET = 'text-foreground/[var(--opacity-on-tone)]'
const text = computed(() => (props.size === 'sm' ? 'text-xs' : 'text-sm'))
/** Зазоры: подпись → значение и сумма → предлог — 20 у `prefixed`, 8 у `dash` (Figma `30875:127825`, `30875:127816`). */
const gap = computed(() => (props.layout === 'dash' ? 'gap-x-2' : 'gap-x-5'))
</script>

<template>
  <span
    data-slot="price-range"
    :data-layout="props.layout"
    :data-size="props.size"
    :data-kind="kind"
    :class="cn('inline-flex min-w-0 flex-wrap items-baseline', gap, text, props.class)"
  >
    <span v-if="props.label" data-slot="price-range-label" :class="QUIET">{{ props.label }}</span>

    <!-- Значение: одна сумма, граница или диапазон. -->
    <span v-if="kind === 'none'" data-slot="price-range-value" class="text-foreground">—</span>
    <span v-else-if="kind === 'single'" data-slot="price-range-value" class="whitespace-nowrap text-foreground" :class="props.layout === 'prefixed' && 'font-medium'">
      {{ price(bounds.min!) }}
    </span>
    <span v-else-if="kind === 'from' || kind === 'to'" data-slot="price-range-value" class="inline-flex items-baseline gap-x-1 whitespace-nowrap">
      <span data-slot="price-range-preposition" :class="cn('font-medium', QUIET)">{{ kind === 'from' ? 'от' : 'до' }}</span>
      <span class="font-medium text-foreground">{{ price(kind === 'from' ? bounds.min! : bounds.max!) }}</span>
    </span>
    <span v-else-if="props.layout === 'dash'" data-slot="price-range-value" class="whitespace-nowrap text-foreground">
      {{ groupDigits(bounds.min!) }}–{{ price(bounds.max!) }}
    </span>
    <template v-else>
      <span data-slot="price-range-value" class="inline-flex items-baseline gap-x-1 whitespace-nowrap">
        <span data-slot="price-range-preposition" :class="cn('font-medium', QUIET)">от</span>
        <span class="font-medium text-foreground">{{ price(bounds.min!) }}</span>
      </span>
      <span data-slot="price-range-value" class="inline-flex items-baseline gap-x-1 whitespace-nowrap">
        <span data-slot="price-range-preposition" :class="cn('font-medium', QUIET)">до</span>
        <span class="font-medium text-foreground">{{ price(bounds.max!) }}</span>
      </span>
    </template>

    <span v-if="props.note" data-slot="price-range-note" :class="cn('text-2xs', QUIET)">· {{ props.note }}</span>
  </span>
</template>
