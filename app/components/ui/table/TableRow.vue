<script setup lang="ts">
import { cn } from '@/lib/utils'
import { tableRowVariants, type TableRowVariants } from '.'

/**
 * Строка таблицы — мастер `_Row` `9062:64690` Атома.
 *
 * ## Подсветка живёт на двух уровнях, и это две разные системы
 *
 * У **Атома** заливки у строки нет вовсе: ось `Active` есть у ячейки, и чтобы
 * подсветить строку, её выставляют каждой ячейке. Это записано волной 7 и
 * отдано дизайнерам как непоследовательность.
 *
 * У **кита 1** наоборот: мастер `table_line` `19524:9679` несёт четыре
 * состояния целиком на строке — `Default`, `hover`, `new`, `selected`.
 *
 * В коде есть оба механизма: ось `active` у ячейки (Атом) и проп `state`
 * здесь (кит 1). Заливки взяты с мастера кита 1 и легли на существующие роли,
 * новых токенов не потребовалось:
 *
 * | Состояние | В макете | Роль |
 * |---|---|---|
 * | `default` | `#ffffff` | `--card` |
 * | `hover` | `#f7f9fc` | `--accent` (bg/surface_hover) |
 * | `new` | `#fff3ee` | `--surface-new` |
 * | `selected` | `#edf3fc` | `--secondary` (accent/surface_soft) |
 */
const props = withDefaults(defineProps<{
  /** Состояние строки с мастера кита 1. `hover` отдельным значением не нужен — он живёт наведением. */
  state?: NonNullable<TableRowVariants['state']>
  /** Строка кликабельна: тогда у неё есть наведение и курсор. */
  interactive?: boolean
  /**
   * Класс снаружи — слиянием, как у `Table`, `TableHead` и `TableCell`. Без слияния
   * внешний цвет разделителя приклеивался бы рядом с вариантным и побеждал бы по
   * порядку в таблице стилей, а не по намерению.
   */
  class?: string
}>(), {
  state: 'default',
  interactive: false,
  class: undefined,
})
</script>

<template>
  <div
    data-slot="table-row"
    role="row"
    :data-state="props.state"
    :class="cn(tableRowVariants({ state: props.state, interactive: props.interactive }), props.class)"
    :style="{ transitionDuration: 'var(--duration-hover)' }"
  >
    <slot />
  </div>
</template>
