<script setup lang="ts">
import { computed } from 'vue'
import MenuItem from './MenuItem.vue'

/**
 * Пункт с подменю — мастер `_MenuItem` `3497:23069`, спека `832:20679`.
 *
 * Не дубль `MenuItem`, а обёртка над ним: внутри лежит инстанс той же строки
 * плюс вложенный список `LevelTwo`. Почему `Sub`, а не `Group` — в `docs/naming.md`.
 *
 * ## Ловушка оси, уточнённая замером
 *
 * Ось мастера зовётся `Collapse`, и запись «`Collapse=true` — раскрытое
 * состояние» верна лишь наполовину. Обход всех восьми вариантов: `LevelTwo`
 * рисуется **только** при `Collapse=true` вместе с `Selected=true` — у этой
 * комбинации высота 228, у остальных семи ровно 44.
 *
 * Значит `Collapse` означает «у пункта есть подменю», а раскрытым его нарисовали
 * лишь на выбранной строке. В код имя оси не идёт: здесь это `open`.
 *
 * ## Вложенный список
 *
 * | часть | значение |
 * |---|---|
 * | отступ строк слева | 29 |
 * | направляющая | 2×174, отступ слева 23, сверху 4 |
 * | цвет направляющей | нейтраль на мягкой ступени |
 * | зазор между строками | 2 |
 * | отступ списка от триггера | 2 |
 *
 * Направляющая — **шестая встреча мягкой ступени** в мастерах Атома, теперь как
 * вертикальная линия. Уровень тот же, что у выбранного пункта и подложки таймера.
 *
 * > В мастере во вложенном списке нарисованы 24 строки, а сам `LevelTwo` обрезан
 * > по высоте 182 — видно четыре. Это демонстрационная начинка, а не ограничение:
 * > высоту в код не переносим, её задаёт содержимое.
 */
const props = withDefaults(defineProps<{
  /** Раскрыт ли вложенный список. Ось `Collapse` мастера, переименована. */
  open?: boolean
  selected?: boolean
  compact?: boolean
  disabled?: boolean
  showIcon?: boolean
  showBulb?: boolean
}>(), {
  open: false,
  selected: false,
  compact: false,
  disabled: false,
  showIcon: true,
  showBulb: false,
})

/** В компактном режиме подменю не разворачивается внутри — оно уезжает поповером. */
const showsList = computed(() => props.open && !props.compact)
</script>

<template>
  <div data-slot="menu-sub" class="w-full">
    <MenuItem
      :compact="props.compact"
      :selected="props.selected"
      :disabled="props.disabled"
      :show-icon="props.showIcon"
      :show-bulb="props.showBulb"
      has-submenu
      :aria-expanded="props.open"
    >
      <slot />
      <template #icon>
        <slot name="icon" />
      </template>
    </MenuItem>

    <!-- Список отходит от триггера на 2. -->
    <div v-if="showsList" data-slot="menu-sub-content" class="relative mt-0.5 flex">
      <!-- Направляющая 2×174: не разделитель, а связь с родительской строкой.
           Она короче списка на 8 — по 4 сверху и снизу. -->
      <span class="relative w-menu-sub-indent shrink-0" aria-hidden="true">
        <span class="absolute top-1 bottom-1 left-menu-sub-rail w-0.5 rounded-full bg-muted-foreground/[var(--opacity-soft)]" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <slot name="items" />
      </div>
    </div>
  </div>
</template>
