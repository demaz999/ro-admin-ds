<script setup lang="ts">
import { Icon } from '../icon'

/**
 * Действие строки — колонка «Действия» типовой страницы-таблицы админки.
 * Решение владельца, такт 10. Мастера нет: композиция из двух уже принятых
 * идентичностей кита, а не перенос.
 *
 * ## Две идентичности одного контрола
 *
 * | Состояние | Вид | Источник |
 * |---|---|---|
 * | в покое | только серый глиф | цвет и покой — `IconButton variant="service"` (такт 7): без фона, `fg/secondary` |
 * | при наведении на строку | глиф плюс подпись, без заливки и рамки | геометрия — нишевый «ghost»-компонент кита, `ButtonAction`: зазор 6 между иконкой и текстом, высота строки. Цвет **не** берётся оттуда — там брендовый, здесь служебный |
 *
 * То есть это не два разных элемента, а один контрол, который меняет только
 * видимость подписи. Заливки не появляется ни в одном состоянии — оба явно
 * оговорены как «без фона и заливки».
 *
 * ## Подпись не сдвигает раскладку
 *
 * Ширина колонки — решение страницы, но она обязана быть фиксированной и
 * рассчитанной на **развёрнутое** состояние: подпись всегда занимает своё
 * место в потоке, у неё меняется только `opacity`, а не ширина. Строка не
 * укладывается в `w-0`/`max-w-0`, как это делают анимированные раскрывашки —
 * здесь она есть всегда, просто не видна.
 *
 * Побочный эффект честный и полезный: невидимая подпись остаётся в дереве
 * доступности — читалка озвучивает «Редактировать» независимо от того,
 * наведена строка или нет. Отдельный `aria-label` поэтому не нужен: имя
 * кнопки для вспомогательных технологий уже есть текстом.
 *
 * ## Триггер — строка, а не сама кнопка
 *
 * Наведение читается с `group/table-row`, который несёт `TableRow` всегда
 * (см. `index.ts`). Тот же приём, что у `group/card` в карточке осмотра:
 * состояние-раскрытие живёт на контейнере, который его показывает, а не на
 * листовом элементе.
 *
 * ## Тач-устройства: развёрнуто по умолчанию
 *
 * Признак — `(hover: none)`, а не «толстый палец» (`pointer: coarse`): вторая
 * метрика врёт на части стилус-экранов, где палец не толстый, а ховера просто
 * нет физически. Скрытая подпись без способа её открыть — дефект, а не режим.
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
    class="inline-flex h-5 w-fit shrink-0 items-center gap-1.5 bg-transparent text-foreground-secondary outline-none transition-colors select-none hover:text-foreground disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled)]"
    :style="{ transitionDuration: 'var(--duration-hover)' }"
  >
    <slot name="icon">
      <Icon name="edit" :size="16" />
    </slot>
    <span
      data-slot="table-row-action-label"
      class="overflow-hidden text-sm whitespace-nowrap opacity-0 transition-opacity group-hover/table-row:opacity-100 [@media(hover:none)]:opacity-100"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
    >
      <slot />
    </span>
  </button>
</template>
