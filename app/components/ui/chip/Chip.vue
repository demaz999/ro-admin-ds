<!--
  @debt Состояний в мастере нет: `747:2464` — одиночный компонент кита 1 без
  вариантов, спек-страниц кит 1 не ведёт. Наведение, нажатие и выключенное
  состояние здесь не заведены; инверсия счётчика на включённом чипе выведена по
  механике маркера `Tag`, а не нарисована. См. docs/design-debt.md.
-->
<script setup lang="ts">
import { Icon } from '../icon'
import { chipCounterVariants, chipVariants } from '.'

/**
 * Фильтр-чип — мастер `badge` `747:2464` кита 1 плюс ось `active` и маркер
 * из `ButtonTag` `256:3601` Атома. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Active` из `ButtonTag` Атома: чип включён в фильтр. */
  active?: boolean
  /** Гейт `Show bulb` мастера. Пусто — счётчика нет. */
  count?: string | number
  /** Маркер-точка 8×8 слева, из `ButtonTag`. У чипа кита 1 её нет — по умолчанию выключен. */
  marker?: boolean
  /**
   * Хвостовой контрол. У мастера он один — крестик, и его глиф подменяемый
   * (`icon#748:0`, INSTANCE_SWAP). Ось **наша**: чип применённого фильтра со
   * счётчиком не снимается крестиком, а раскрывает список значений, и подмена
   * одного глифа этого не описывает — у кнопки другое действие и другая
   * подпись. `none` — чип без действия вовсе.
   */
  trailing?: 'remove' | 'expand' | 'none'
  /** Список раскрыт: шеврон повёрнут. Значимо при `trailing="expand"`. */
  expanded?: boolean
}>(), {
  active: false,
  count: '',
  marker: false,
  trailing: 'remove',
  expanded: false,
})

const emit = defineEmits<{ remove: [], toggle: [] }>()

/** Ноль — значащее значение счётчика, поэтому проверяем на пустую строку, а не на falsy. */
const hasCount = () => props.count !== '' && props.count !== undefined && props.count !== null
</script>

<template>
  <span
    data-slot="chip"
    :data-active="props.active ? '' : undefined"
    :class="chipVariants({ active: props.active })"
  >
    <!-- Внутренняя группа `txt_bulb` мастера: зазор 4, а не 8. -->
    <span class="flex items-center gap-1">
      <span
        v-if="props.marker"
        data-slot="chip-marker"
        class="size-2 shrink-0 rounded-full"
        :class="props.active ? 'bg-primary-foreground' : 'bg-accent-soft'"
      />

      <span data-slot="chip-label">
        <slot />
      </span>

      <span
        v-if="hasCount()"
        data-slot="chip-counter"
        :class="chipCounterVariants({ active: props.active })"
      >
        {{ props.count }}
      </span>
    </span>

    <!--
      Коробка крестика 16×16 с мастера, глиф внутри 9.4 — тоже с мастера:
      пикта `20_ic_close` кита 1 свой бокс не заполняет.
      Свойство `icon#748:0` мастера — INSTANCE_SWAP, поэтому глиф слотом.
    -->
    <button
      v-if="props.trailing !== 'none'"
      :data-slot="props.trailing === 'expand' ? 'chip-expand' : 'chip-remove'"
      type="button"
      class="flex size-4 shrink-0 items-center justify-center outline-none transition-transform"
      :class="[
        props.active ? 'text-primary-foreground' : 'text-foreground-secondary',
        props.trailing === 'expand' && props.expanded ? 'rotate-180' : '',
      ]"
      :aria-label="props.trailing === 'expand' ? 'Показать значения' : 'Убрать'"
      :aria-expanded="props.trailing === 'expand' ? props.expanded : undefined"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      @click="props.trailing === 'expand' ? emit('toggle') : emit('remove')"
    >
      <slot name="icon">
        <!-- Крестик 9.4 — с мастера; шеврон 11 — тот же, что у массовых действий. -->
        <Icon v-if="props.trailing === 'expand'" name="chevron-down" :size="11" />
        <Icon v-else name="close" :size="9.4" />
      </slot>
    </button>
  </span>
</template>
