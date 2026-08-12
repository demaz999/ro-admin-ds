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
 */
const props = withDefaults(defineProps<{
  /** Текстовый проп мастера `Header`. Пустой — заголовка нет, как при `Show header` = false. */
  header?: string
}>(), { header: '' })
</script>

<template>
  <div data-slot="list-group" class="flex flex-col gap-2">
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
