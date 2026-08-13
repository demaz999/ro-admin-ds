<script setup lang="ts">
import { Icon } from '../icon'
import { listRowVariants } from '.'

/**
 * Строка-плашка — мастер `Plank` `1910:12739`.
 * Заливка устроена наоборот привычного: активная белая. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: содержимое левого слота. Коробка слота одна и та же. */
  type?: 'arrow' | 'icon' | 'number'
  /**
   * Ось `Active`. Активной выключенной в мастере не бывает.
   *
   * Тип объявлен обычным `boolean`, а не выведен из `cva`: Vue приводит
   * булев атрибут (`<ListRow active>`) к `true` только когда в типе пропа
   * есть `Boolean`. С выведенным из `cva` union атрибут молча приходит
   * пустой строкой, и строка остаётся неактивной без единой ошибки.
   */
  active?: boolean
  disabled?: boolean
  /** Число для `type="number"`. */
  number?: string | number
  /** Вторая строка подписи. Булев проп `Show secondary text` мастера. */
  showSecondary?: boolean
}>(), {
  type: 'arrow',
  active: false,
  disabled: false,
  number: '',
  showSecondary: true,
})
</script>

<template>
  <button
    data-slot="list-row"
    type="button"
    :disabled="props.disabled"
    :aria-current="props.active ? 'true' : undefined"
    :class="listRowVariants({ active: props.active })"
  >
    <!-- Левый слот 44×32 — коробка одна во всех трёх типах, меняется начинка. -->
    <span class="flex h-8 w-11 shrink-0 items-center justify-center">
      <slot name="leading">
        <Icon v-if="props.type === 'arrow'" name="chevron-right" :size="16" />
        <Icon v-else-if="props.type === 'icon'" name="check" :size="16" />
        <span v-else class="text-base font-medium">{{ props.number }}</span>
      </slot>
    </span>

    <span class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
      <span class="truncate text-base font-medium">
        <slot />
      </span>
      <span v-if="props.showSecondary" class="truncate text-xs text-muted-foreground">
        <slot name="secondary" />
      </span>
    </span>

    <slot name="trailing" />
  </button>
</template>
