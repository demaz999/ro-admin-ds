<script setup lang="ts">
/**
 * Выпадающая плашка — мастер `PopOverList` `571:4889`, спека `571:6147`.
 *
 * Геометрия снята с мастера: ширина 320, радиус 12, фон белый, тень
 * `0 / 8 / 32` при 12% — она совпадает с нашим `--shadow-dropdown` до значения.
 * **Рамки нет.**
 *
 * Паддинг асимметричный и это не опечатка: `4 / 0 / 4 / 4`. Справа ноль, потому
 * что там проходит скроллбар — он не отступает от края плашки. Зазор между
 * блоками 4.
 *
 * Состав по мастеру: встроенный поиск, слот и сам список. Поиск у Атома —
 * булев проп, включённый по умолчанию; в ките 1 на его месте был пустой слот.
 *
 * > Узел помечен авторами Атома как «Not DS» — см. вопрос 25. Переносится, потому
 * > что без него не собирается `Select`.
 */
withDefaults(defineProps<{
  /** Ширина плашки из мастера. Оси размера в мастере нет. */
  width?: number
  /**
   * Высота плашки из мастера — все шесть вариантов нарисованы 320×304, а список
   * внутри длиннее и скроллится. Отсюда и нулевой правый паддинг: скроллбар
   * стоит вплотную к краю.
   *
   * Число — пиксели, строка — любая длина CSS: плашке назначения (`AssignList`, такт 33)
   * высоту задаёт окно — `62vh`, как у прототипа VA-9265 (`.pop`).
   */
  maxHeight?: number | string
}>(), { width: 320, maxHeight: 304 })
</script>

<template>
  <!--
    z-50 — как у PopoverContent: обёртка popper Reka берёт z-index у содержимого. Без него
    список выбора внутри ModalCard открывался под слоем окна, и клик по пункту попадал в
    кнопку подвала (такт 36).
  -->
  <div
    data-slot="popover"
    class="z-50 flex flex-col gap-1 rounded-lg bg-popover py-1 pl-1 shadow-dropdown"
    :style="{ width: `${width}px`, maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }"
  >
    <!--
      shrink-0 обязателен: плашка ограничена по высоте, и без него флекс ужимает
      поиск и слоты, отнимая у поиска три пикселя от мастерских сорока.
    -->
    <div v-if="$slots.search" class="shrink-0">
      <slot name="search" />
    </div>
    <div v-if="$slots.top" class="shrink-0">
      <slot name="top" />
    </div>
    <!--
      Такт 21: когда в плашке группы, зазор между ними гасится — группы разделяет
      линия с отступами 4, которую несёт сама группа (SelectGroup).
    -->
    <div data-slot="popover-viewport" class="popover-scroll flex min-h-0 flex-col gap-2 overflow-y-auto has-[>[data-slot=list-group]]:gap-0">
      <slot />
    </div>
    <div v-if="$slots.bottom" class="shrink-0">
      <slot name="bottom" />
    </div>
  </div>
</template>

<style scoped>
/*
  Скроллбар списка — мастер ScrollBar 1159:10439, малый размер: дорожка 4px,
  бегунок радиусом 2. Правый паддинг плашки нулевой именно под него.
*/
/*
  Ширину задаёт webkit-правило: стандартное `scrollbar-width: thin` перебивает
  его и даёт около 10px вместо мастерских 4, из-за чего строка списка теряет
  шесть пикселей ширины. Поэтому `scrollbar-width` объявляется только там, где
  webkit-псевдоэлемента нет, — то есть в Firefox.
*/
@supports not selector(::-webkit-scrollbar) {
  .popover-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--popover-scroll-thumb) transparent;
  }
}

.popover-scroll::-webkit-scrollbar {
  width: calc(var(--spacing) * 1); /* 4px */
}

.popover-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.popover-scroll::-webkit-scrollbar-thumb {
  background: var(--popover-scroll-thumb);
  border-radius: var(--radius-2xs);
}
</style>
