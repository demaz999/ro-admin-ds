<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, inject } from 'vue'
import { Icon } from '../icon'
import { Indicator } from '../indicator'
import type { MenuItemVariants } from '.'
import { menuItemContent, menuItemVariants } from '.'

/**
 * Пункт меню — два мастера: `_MenuItemMaster` `3465:22566` Атома и `menu_item`
 * внутри `left_menu` `643:3053` кита 1. Разбор различий — в `index.ts`.
 *
 * ## Подача кита 1 устроена двумя узлами, а не одним
 *
 * Снаружи коробка 48 с паддингом 8 и радиусом 12, внутри — `it_content` с тем
 * же радиусом, паддингом 4 и **заливкой**. То есть выбранная строка не доходит
 * до краёв полосы: между заливкой и краем остаётся 8. У Атома внутреннего узла
 * нет вовсе, заливка лежит на самой кнопке.
 *
 * ## Компактный режим у кита 1 несёт подпись
 *
 * У Атома компактный пункт — только иконка в боксе 56. У кита 1 бокс 84, и в
 * него уложены иконка 20 и подпись **13/16** под ней с зазором 4, обрезанная
 * многоточием. Пункт с подменю показывает шеврон **рядом с иконкой**, а не
 * справа от подписи.
 */
const props = withDefaults(defineProps<{
  /**
   * Ось `Compact` мастера: у Атома только иконка, у кита 1 иконка с подписью.
   * По умолчанию берётся у меню — это свойство всего меню, а не строки.
   */
  compact?: boolean
  /** Источник подачи. По умолчанию берётся у меню. */
  variant?: NonNullable<MenuItemVariants['variant']>
  /** Ось `Selected`. Выключенного выбранного в мастере нет. */
  selected?: boolean
  disabled?: boolean
  /** Булев проп `Show Icon`. У подпунктов кита 1 он выключен. */
  showIcon?: boolean
  /** Булев проп `Show Bulb`: счётчик в обычном режиме, точка в компактном. */
  showBulb?: boolean
  /**
   * Ось `Collapse`: пункт раскрывает подменю, поэтому у него есть шеврон.
   * Имя оси в мастере не переносим — в коде это `hasSubmenu`.
   */
  hasSubmenu?: boolean
  /** Подменю раскрыто: шеврон разворачивается. Ставится `MenuSub`, не вручную. */
  expanded?: boolean
}>(), {
  compact: undefined,
  variant: undefined,
  selected: false,
  disabled: false,
  showIcon: true,
  showBulb: false,
  hasSubmenu: false,
  expanded: false,
})

/** Режим и подача приходят от меню; пропы на строке — точечное переопределение. */
const menuCompact = inject<Ref<boolean> | undefined>('menuCompact', undefined)
const menuVariant = inject<Ref<NonNullable<MenuItemVariants['variant']>> | undefined>('menuVariant', undefined)

const compact = computed(() => props.compact ?? menuCompact?.value ?? false)
const variant = computed(() => props.variant ?? menuVariant?.value ?? 'atom')

/** Шеврон `more_less` мастера кита 1: видимый контур 9.31×5.49, доминирует ширина. */
const CHEVRON_KIT1 = 9.31
</script>

<template>
  <button
    data-slot="menu-item"
    type="button"
    :disabled="props.disabled"
    :aria-current="props.selected ? 'page' : undefined"
    :class="menuItemVariants({ variant, compact, selected: props.selected })"
  >
    <!-- Подача кита 1: заливка на внутреннем узле `it_content`. -->
    <span
      v-if="variant === 'kit1'"
      data-slot="menu-item-content"
      :class="menuItemContent({ compact, selected: props.selected })"
    >
      <template v-if="!compact">
        <slot v-if="props.showIcon" name="icon">
          <Icon name="check" :size="20" />
        </slot>

        <span class="min-w-0 flex-1 truncate text-left text-sm">
          <slot />
        </span>

        <Indicator v-if="props.showBulb" type="text">
          <slot name="bulb">99+</slot>
        </Indicator>

        <Icon
          v-if="props.hasSubmenu"
          name="chevron-down"
          :size="CHEVRON_KIT1"
          class="shrink-0 transition-transform"
          :class="props.expanded ? 'rotate-180' : ''"
        />
      </template>

      <!-- Компактный: иконка и подпись под ней, зазор 4. -->
      <span v-else class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
        <span class="flex items-center justify-center">
          <slot v-if="props.showIcon" name="icon">
            <Icon name="check" :size="20" />
          </slot>
          <Icon
            v-if="props.hasSubmenu"
            name="chevron-down"
            :size="CHEVRON_KIT1"
            class="shrink-0 transition-transform"
            :class="props.expanded ? 'rotate-180' : ''"
          />
        </span>
        <span class="w-full truncate text-center text-xs">
          <slot />
        </span>
      </span>
    </span>

    <!-- Подача Атома: всё лежит прямо на кнопке. -->
    <template v-else>
      <slot v-if="props.showIcon" name="icon">
        <Icon name="check" :size="16" />
      </slot>

      <!-- Компактный режим Атома подписи не несёт: там только иконка и точка. -->
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
        <!--
          Шеврон 16×6: у Атома он «тонкий», низкий и широкий. Поворот наш —
          в мастере стрелка одна на оба состояния, как у аккордеона; признак
          раскрытия приходит от `MenuSub`.
        -->
        <Icon
          v-if="props.hasSubmenu"
          name="chevron-down"
          :size="16"
          class="shrink-0 transition-transform"
          :class="props.expanded ? 'rotate-180' : ''"
        />
      </template>

      <!-- В компактном режиме счётчику негде поместиться — он вырождается в точку. -->
      <Indicator
        v-else-if="props.showBulb"
        size="sm"
        class="absolute top-2 right-2"
      />
    </template>
  </button>
</template>
