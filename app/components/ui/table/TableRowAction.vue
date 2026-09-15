<script setup lang="ts">
import { Icon } from '../icon'

/**
 * Действие строки с подписью — колонка «Действия» типовой страницы-таблицы, когда
 * действие у строки одно. Решения владельца: такт 10 (раскрытие по строке), такт 20
 * (раскладка). Мастера нет: композиция уже принятых идентичностей кита.
 *
 * ## Раскладка такта 20: подпись слева, иконка у правого края
 *
 * Карандаш прижат к правому краю и не двигается; подпись «Редактировать» проявляется
 * СЛЕВА от него по наведению на строку. Порядок в разметке — подпись, потом иконка:
 * при `justify-end` в ячейке иконка всегда у края, подпись занимает место слева.
 *
 * Иконка стоит в **слоте 24×24** — той же хит-зоне, что у `IconButton size="sm"` в
 * `TableRowActions`. Поэтому глиф карандаша у строки с одним действием и у строки с
 * несколькими лежит на одной координате X: у колонки одна вертикаль.
 *
 * **Зазор подпись↔карандаш — 12 до глифа.** Слот 24 даёт глифу 16 поле по 4 с каждой
 * стороны, поэтому в разметке `gap-2`: 8 до слота плюс 4 поля = 12 до видимого
 * карандаша. Было 8 до глифа — владелец: слишком близко (такт 20, D4).
 *
 * ## Подпись не сдвигает раскладку
 *
 * Подпись занимает своё место в потоке всегда, у неё меняется только `opacity`, не
 * ширина: колонка рассчитана на развёрнутое состояние, соседние колонки не едут.
 * Невидимая подпись остаётся в дереве доступности — имя кнопки для читалки есть
 * текстом, отдельный `aria-label` не нужен.
 *
 * ## Триггер — строка, а не кнопка
 *
 * Наведение читается с `group/table-row`, который `TableRow` несёт всегда.
 *
 * ## Тач: развёрнуто по умолчанию
 *
 * Признак — `(hover: none)`, а не `(pointer: coarse)`: вторая метрика врёт на части
 * стилус-экранов. Скрытая подпись без способа её открыть — дефект, а не режим.
 */
withDefaults(defineProps<{
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), { disabled: false, type: 'button' })
</script>

<template>
  <button
    data-slot="table-row-action"
    :type="type"
    :disabled="disabled"
    class="inline-flex h-6 w-fit shrink-0 items-center gap-2 bg-transparent text-foreground-secondary outline-none transition-colors select-none hover:text-foreground disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]"
    :style="{ transitionDuration: 'var(--duration-hover)' }"
  >
    <span
      data-slot="table-row-action-label"
      class="overflow-hidden text-sm whitespace-nowrap opacity-0 transition-opacity group-hover/table-row:opacity-100 [@media(hover:none)]:opacity-100"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    >
      <slot />
    </span>
    <span data-slot="table-row-action-icon" class="inline-flex size-6 shrink-0 items-center justify-center">
      <slot name="icon">
        <Icon name="edit" :size="16" />
      </slot>
    </span>
  </button>
</template>
