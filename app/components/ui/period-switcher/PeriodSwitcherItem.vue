<script setup lang="ts">
import { computed } from 'vue'
import { Indicator } from '../indicator'
import { SelectItem } from '../select'
import { PERIOD_STATUS_LABEL, PERIOD_TONE, periodTerm, type PeriodSwitcherPeriod } from '.'

/**
 * Пункт списка периодов — часть `PeriodSwitcher`, Figma `31089:12090` (пункты 272 × 44). Разбор — `index.ts`.
 *
 * Строка — `SelectItem` кита: точка тона статуса, статус, слот `badge` за статусом, срок справа. Пункт сам не нажимается:
 * в списке переключателя его оборачивает кнопка; вне списка (окно очереди) — строка без действия.
 */
const props = withDefaults(defineProps<{
  period: PeriodSwitcherPeriod
  /** Выбранный период — заливка `--list-selected` (Figma `31089:12143`). */
  selected?: boolean
}>(), { selected: false })

const term = computed(() => periodTerm(props.period))
</script>

<template>
  <SelectItem
    :selected="props.selected"
    data-slot="period-switcher-item"
    :data-period-status="props.period.status"
  >
    <span class="inline-flex items-center gap-2 align-middle">
      <Indicator :variant="PERIOD_TONE[props.period.status]" size="sm" />
      <span data-slot="period-switcher-item-status">{{ PERIOD_STATUS_LABEL[props.period.status] }}</span>
      <slot name="badge" />
    </span>
    <template #trailing>
      <span data-slot="period-switcher-item-term" class="text-2xs text-muted-foreground">{{ term }}</span>
    </template>
  </SelectItem>
</template>
