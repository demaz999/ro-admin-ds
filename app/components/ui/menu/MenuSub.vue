<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, inject } from 'vue'
import type { MenuItemVariants } from '.'
import MenuItem from './MenuItem.vue'

/**
 * Пункт с подменю — два источника: `_MenuItem` `3497:23069` Атома (спека
 * `832:20679`) и `menu_item` с иконкой `more_less` плюс `dropdown_menu`
 * `956:4737` кита 1. Разбор различий — в `index.ts`, почему `Sub`, а не
 * `Group` — в `docs/naming.md`.
 *
 * ## Атом: ловушка оси, уточнённая замером
 *
 * Ось мастера зовётся `Collapse`, и запись «`Collapse=true` — раскрытое
 * состояние» верна лишь наполовину. Обход всех восьми вариантов: `LevelTwo`
 * рисуется **только** при `Collapse=true` вместе с `Selected=true` — у этой
 * комбинации высота 228, у остальных семи ровно 44.
 *
 * Значит `Collapse` означает «у пункта есть подменю», а раскрытым его нарисовали
 * лишь на выбранной строке. В код имя оси не идёт: здесь это `open`.
 *
 * ## Вложенный список Атома
 *
 * | часть | значение |
 * |---|---|
 * | отступ строк слева | 29 |
 * | направляющая | 2×174, отступ слева 23, сверху 4 |
 * | цвет направляющей | нейтраль на мягкой ступени |
 * | зазор между строками | 2 |
 * | отступ списка от триггера | 2 |
 *
 * > В мастере во вложенном списке нарисованы 24 строки, а сам `LevelTwo` обрезан
 * > по высоте 182 — видно четыре. Демонстрационная начинка, высоту не переносим.
 *
 * ## кит 1, компактный режим: флаут, а не сворачивание внутрь полосы
 *
 * У Атома в компакте список некуда развернуть — он уезжает `MenuPopover`
 * (светлым, по правилу порталов: реальный мастер `MenuPopOver` `3499:27440`
 * даёт белую заливку и тень `--shadow-dropdown`).
 *
 * У кита 1 источник другой: узел `dropdown_menu` `956:4737` — направляющая
 * 2px плюс список, **оба на `menu/fg/default`**, то есть на светлом-по-тёмному
 * тексте. Светлый текст на белой плашке был бы нечитаем — значит этот узел не
 * задуман светлым поповером. У самого узла нет собственной заливки (в отличие
 * от `MenuPopOver`, где заливка — часть мастера), и он лежит **внутри** дерева
 * `left_menu`, а не отдельным компонентом уровня страницы.
 *
 * Вывод: это не портал, а **локальное раскрытие в потоке** — тот же приём,
 * что разворачивающийся `dropdown` доступен без Teleport, просто выходит за
 * пределы узкой полосы через `absolute`. Правило порталов сайдбара говорит про
 * то, что **покидает** сайдбар порталом; здесь ничего не покидает — поэтому
 * `sidebar-*`-токены здесь законны, а `MenuPopover` не подходит.
 *
 * Узел скрыт в файле (`hidden`), экспортом не проверяется — сняты только
 * структура и цвета из кода мастера. Радиус и тень — решение сборки по
 * прецеденту `MenuPopover`, не из источника. Разбор — `docs/open-questions.md`
 * не потребовался: это дыра (нет данных), а не противоречие принятому.
 *
 * ## кит 1, развёрнутый режим: геометрии инлайн-списка в мастере нет
 *
 * Кадры показывают только свёрнутые (`Collapse`-закрытые) строки — открытого
 * инлайн-состояния кит 1 не рисует вовсе. Структура компактного флаута
 * (направляющая плюс список) перенесена и на инлайн-раскрытие: дыра системы,
 * строка в `docs/design-debt.md`.
 */
const props = withDefaults(defineProps<{
  /** Раскрыт ли вложенный список. Ось `Collapse` мастера Атома, переименована. */
  open?: boolean
  selected?: boolean
  compact?: boolean
  /** Источник подачи. По умолчанию берётся у меню. */
  variant?: NonNullable<MenuItemVariants['variant']>
  disabled?: boolean
  showIcon?: boolean
  showBulb?: boolean
}>(), {
  open: false,
  selected: false,
  compact: false,
  variant: undefined,
  disabled: false,
  showIcon: true,
  showBulb: false,
})

/**
 * Раскрытие — ось мастера, а не внутренняя память компонента: состояние держит
 * тот, кто собирает меню. Наружу уходит только факт нажатия на триггер —
 * клики по вложенным строкам сюда не попадают.
 */
const emit = defineEmits<{ toggle: [] }>()

const menuVariant = inject<Ref<NonNullable<MenuItemVariants['variant']>> | undefined>('menuVariant', undefined)
const variant = computed(() => props.variant ?? menuVariant?.value ?? 'atom')

/** Атом: список некуда развернуть в компакте — используется MenuPopover снаружи. */
const showsInlineAtom = computed(() => props.open && !props.compact && variant.value === 'atom')
/** кит 1: и развёрнутый, и компактный режим раскрывают список — по-разному расположенный. */
const showsInlineKit1 = computed(() => props.open && !props.compact && variant.value === 'kit1')
const showsFlyoutKit1 = computed(() => props.open && props.compact && variant.value === 'kit1')
</script>

<template>
  <div data-slot="menu-sub" class="relative w-full">
    <MenuItem
      :variant="variant"
      :compact="props.compact"
      :selected="props.selected"
      :disabled="props.disabled"
      :show-icon="props.showIcon"
      :show-bulb="props.showBulb"
      has-submenu
      :expanded="props.open"
      :aria-expanded="props.open"
      @click="emit('toggle')"
    >
      <slot />
      <template #icon>
        <slot name="icon" />
      </template>
    </MenuItem>

    <!-- Атом: список отходит от триггера на 2, направляющая мягкой ступени. -->
    <div v-if="showsInlineAtom" data-slot="menu-sub-content" class="relative mt-0.5 flex">
      <!-- Направляющая 2×174: не разделитель, а связь с родительской строкой.
           Она короче списка на 8 — по 4 сверху и снизу. -->
      <span class="relative w-menu-sub-indent shrink-0" aria-hidden="true">
        <span class="absolute top-1 bottom-1 left-menu-sub-rail w-0.5 rounded-full bg-muted-foreground/[var(--opacity-soft)]" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <slot name="items" />
      </div>
    </div>

    <!--
      кит 1, развёрнутый: та же структура, что у компактного флаута ниже
      (направляющая 2px плюс список), только в потоке, а не absolute. Мастера
      на это состояние нет — перенос геометрии компактного флаута, дыра
      системы записана в шапке файла.
    -->
    <div v-else-if="showsInlineKit1" data-slot="menu-sub-content" class="mt-0.5 flex items-start pr-2">
      <span class="flex shrink-0 items-start self-stretch py-1 pr-1 pl-5.5" aria-hidden="true">
        <span class="h-full w-0.5 rounded-full bg-sidebar-foreground" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <slot name="items" />
      </div>
    </div>

    <!--
      кит 1, компактный: флаут вправо шириной развёрнутого меню — узел
      dropdown_menu 956:4737. Не портал (см. шапку файла): остаётся в потоке
      сайдбара через absolute, поэтому легален на sidebar-токенах. Радиус,
      заливка и тень — решение сборки по прецеденту MenuPopover.
    -->
    <div
      v-else-if="showsFlyoutKit1"
      data-slot="menu-sub-flyout"
      class="absolute top-0 left-full z-50 flex w-64 items-start rounded-lg bg-sidebar py-1 pr-2 shadow-dropdown"
    >
      <span class="flex shrink-0 items-start self-stretch py-1 pr-1 pl-5.5" aria-hidden="true">
        <span class="h-full w-0.5 rounded-full bg-sidebar-foreground" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <slot name="items" />
      </div>
    </div>
  </div>
</template>
