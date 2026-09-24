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
  /**
   * Тон выбранной строки — **наше расширение матрицы**, такт 34, решение владельца
   * 2026-09-23. У мастера `ListItem` `2400:14661` выбранное одно — нейтральная заливка 12%.
   * `success` — выбранное значение, которое означает «распределено»: пункт «кадр привязан
   * сюда» (`AssignOption`, экран VA-9265) одного цвета с плиткой `FrameTile` и нижней плашкой
   * просмотра. Роли такта 30: заливка `--success-surface`, текст `--success-strong`, рамка
   * 1px `--success` (прототип `.it.bound`: `#E9F6EE`, `#1D7444`, рамка `#BFE3CD`). Запрос
   * дизайнерам — `figma-fixes.md`. Действует только на выбранную строку.
   */
  tone?: 'default' | 'success'
  /** Булев проп мастера `Show Icon`. */
  showIcon?: boolean
  /** Булев проп мастера `Checkbox` — режим множественного выбора. */
  checkbox?: boolean
  disabled?: boolean
}>(), {
  subtitle: '',
  selected: false,
  tone: 'default',
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
      selected
        ? (props.tone === 'success' ? 'bg-success-surface ring-1 ring-success ring-inset' : 'bg-list-selected')
        : 'hover:bg-list-hover',
      disabled ? 'pointer-events-none opacity-[var(--opacity-disabled)]' : '',
    ]"
  >
    <!--
      Держатель иконки — мастер `_IconListItem` `6475:86591`: бокс 16×20, то есть
      глиф 16 по центру строки высотой 20. Единственная ось того мастера —
      цветовая, а она не переносится (решение 23), поэтому самостоятельным
      компонентом он не заводится и живёт здесь слотом.
    -->
    <span
      v-if="props.showIcon"
      data-slot="list-item-icon"
      class="flex h-5 w-4 shrink-0 items-center justify-center opacity-[var(--opacity-icon-muted)] group-hover/item:opacity-100"
    >
      <slot name="icon">
        <Icon name="link" :size="16" />
      </slot>
    </span>

    <span class="flex min-w-0 flex-1 flex-col">
      <span
        data-slot="list-item-title"
        class="truncate text-sm font-medium"
        :class="selected
          ? (props.tone === 'success' ? 'text-success-strong' : 'text-field-foreground-hover')
          : 'text-field-foreground group-hover/item:text-field-foreground-hover'"
      >
        <slot />
      </span>
      <span
        v-if="props.subtitle"
        data-slot="list-item-subtitle"
        class="truncate text-xs font-medium"
        :class="selected && props.tone === 'success' ? 'text-success-strong' : 'text-field-placeholder'"
      >
        {{ props.subtitle }}
      </span>
    </span>

    <!--
      Хвостовой слот — **наше расширение**: у мастера `ListItem` `2400:14661`
      правой части нет вовсе, там только чекбокс, левый держатель и текст.
      Понадобился строке снятого значения в чипе применённого фильтра: у неё
      справа крестик. Строка в `docs/page-my-inspections.md`.
    -->
    <span v-if="$slots.trailing" data-slot="list-item-trailing" class="flex shrink-0 items-center">
      <slot name="trailing" />
    </span>
  </div>
</template>
