<script setup lang="ts">
/**
 * Группа строк — мастер `ListGroup` `542:4969`, спека `542:5910`.
 *
 * Шесть вариантов: `Type` `default|withIcon|checked` × `Subtitle`. Тип задаёт
 * начинку строк, а не саму группу, поэтому в код осью не идёт — им управляют
 * пропы `SelectItem`.
 *
 * Из мастера в группу приходит ровно две вещи: **заголовок высотой 32** и
 * **зазор 8** между заголовком и списком. Заголовок — булев проп `Show header`,
 * кегль 13, цвет тот же, что у значения поля.
 *
 * Отдельного разделителя между группами у Атома нет: группы разводит зазор.
 *
 * ## Такт 21: группы разделяет волосяная линия — отклонение владельца
 *
 * Между соседними группами — линия 1px `--border-neutral` с отступами 4 сверху и
 * снизу вместо зазора 8 мастера. Причина — оптика: при высоте пункта около 40
 * видимый промежуток внутри группы около 20, между группами около 28 — шаг ×1.4, а
 * группировка читается от ×1.5–2. Зазор 8 разделителем не читается.
 *
 * Линию несёт группа, которая идёт следом за другой: первая группа и группа без
 * соседей её не получают. Контейнер с группами зазор между ними не добавляет —
 * `SelectContent` гасит свой зазор, когда в нём лежат группы. Удаление и другие
 * опасные действия — последней группой.
 */
const props = withDefaults(defineProps<{
  /** Текстовый проп мастера `Header`. Пустой — заголовка нет, как при `Show header` = false. */
  header?: string
}>(), { header: '' })
</script>

<template>
  <div
    data-slot="list-group"
    class="flex flex-col gap-2 [[data-slot=list-group]+&]:mt-1 [[data-slot=list-group]+&]:border-t [[data-slot=list-group]+&]:border-stroke-neutral [[data-slot=list-group]+&]:pt-1"
  >
    <div
      v-if="props.header"
      data-slot="list-group-header"
      class="flex h-8 items-center px-4 text-xs font-medium text-field-foreground"
    >
      {{ props.header }}
    </div>
    <div class="flex flex-col">
      <slot />
    </div>
  </div>
</template>
