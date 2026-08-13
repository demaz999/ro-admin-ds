<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, inject } from 'vue'
import { Icon } from '../icon'
import { Indicator } from '../indicator'
import { menuItemVariants } from '.'

/**
 * Пункт меню — мастер `_MenuItemMaster` `3465:22566`.
 * Состояния сняты с таблицы состояний спеки `832:20679`; разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /**
   * Ось `Compact` мастера: только иконка, без подписи. По умолчанию берётся
   * у меню — у Атома это свойство всего меню, а не отдельной строки.
   */
  compact?: boolean
  /** Ось `Selected`. Выключенного выбранного в мастере нет. */
  selected?: boolean
  disabled?: boolean
  /** Булев проп `Show Icon`. */
  showIcon?: boolean
  /** Булев проп `Show Bulb`: счётчик в обычном режиме, точка в компактном. */
  showBulb?: boolean
  /**
   * Ось `Collapse`: пункт раскрывает подменю, поэтому у него есть шеврон.
   * Имя оси в мастере не переносим — в коде это `hasSubmenu`.
   */
  hasSubmenu?: boolean
}>(), {
  compact: undefined,
  selected: false,
  disabled: false,
  showIcon: true,
  showBulb: false,
  hasSubmenu: false,
})

/** Режим приходит от меню; проп на строке — точечное переопределение. */
const menuCompact = inject<Ref<boolean> | undefined>('menuCompact', undefined)
const compact = computed(() => props.compact ?? menuCompact?.value ?? false)
</script>

<template>
  <button
    data-slot="menu-item"
    type="button"
    :disabled="props.disabled"
    :aria-current="props.selected ? 'page' : undefined"
    :class="menuItemVariants({ compact, selected: props.selected })"
  >
    <slot v-if="props.showIcon" name="icon">
      <Icon name="check" :size="16" />
    </slot>

    <!-- Компактный режим подписи не несёт: там только иконка и точка. -->
    <template v-if="!compact">
      <span class="flex min-w-0 flex-1 items-start gap-2">
        <span class="min-w-0 flex-1 truncate text-left">
          <slot />
        </span>
        <!-- Счётчик — тот же Indicator, что в волне 4. -->
        <Indicator v-if="props.showBulb" type="text">
          <slot name="bulb">99+</slot>
        </Indicator>
      </span>
      <!-- Шеврон 16×6: у Атома он «тонкий», низкий и широкий. -->
      <Icon v-if="props.hasSubmenu" name="chevron-down" :size="16" />
    </template>

    <!-- В компактном режиме счётчику негде поместиться — он вырождается в точку. -->
    <Indicator
      v-else-if="props.showBulb"
      size="sm"
      class="absolute top-2 right-2"
    />
  </button>
</template>
