<script setup lang="ts">
import { Icon } from '../icon'

/**
 * Строка списка — мастер `ListItem` `2400:14661`, спека `457:4033`.
 *
 * Геометрия: радиус 8, паддинги 8 сверху и снизу, 16 справа. Слева в мастере
 * стоит 14 плюс распорка шириной 2 — в сумме те же 16, поэтому в коде это просто
 * паддинг 16, без распорки-призрака.
 *
 * Высота идёт за содержимым: 44 у однострочной, 52 у строки с подписью — так
 * и в мастере (`Frame 240×36` под две строки).
 *
 * ## Состояния из спеки
 *
 * | | заливка | заголовок |
 * |---|---|---|
 * | покой | нет | `field-foreground` |
 * | наведение | `list-hover` (8%) | `field-foreground-hover` |
 * | выбрана | `list-selected` (12%) | `field-foreground-hover` |
 * | выключена | как у выбранной | + прозрачность 48% |
 *
 * Заливки в покое **нет вовсе** — строка появляется из воздуха под курсором.
 * Наведение и выбор отличаются только плотностью одной и той же заливки.
 *
 * Иконка в спеке подписана `icon 0.72` в покое и `icon 1` под наведением: у
 * Атома гаснет не цвет, а прозрачность глифа.
 */
const props = withDefaults(defineProps<{
  /** Подпись второй строкой. В мастере это булев проп `Show subtitle`. */
  subtitle?: string
  /** Ось `Active` мастера. */
  selected?: boolean
  /** Булев проп мастера `Show Icon`. */
  showIcon?: boolean
  /** Булев проп мастера `Checkbox` — режим множественного выбора. */
  checkbox?: boolean
  disabled?: boolean
}>(), {
  subtitle: '',
  selected: false,
  showIcon: false,
  checkbox: false,
  disabled: false,
})
</script>

<template>
  <div
    data-slot="list-item"
    :data-selected="selected || undefined"
    :class="[
      'group/item flex min-h-11 w-full items-center gap-3 rounded-md px-4 py-2 text-left',
      selected ? 'bg-list-selected' : 'hover:bg-list-hover',
      disabled ? 'pointer-events-none opacity-[var(--opacity-disabled)]' : '',
    ]"
  >
    <slot v-if="props.showIcon" name="icon">
      <Icon
        name="link"
        :size="16"
        class="opacity-[var(--opacity-icon-muted)] group-hover/item:opacity-100"
      />
    </slot>

    <span class="flex min-w-0 flex-1 flex-col">
      <span
        data-slot="list-item-title"
        class="truncate text-sm font-medium"
        :class="selected ? 'text-field-foreground-hover' : 'text-field-foreground group-hover/item:text-field-foreground-hover'"
      >
        <slot />
      </span>
      <span
        v-if="props.subtitle"
        data-slot="list-item-subtitle"
        class="truncate text-xs font-medium text-field-placeholder"
      >
        {{ props.subtitle }}
      </span>
    </span>
  </div>
</template>
