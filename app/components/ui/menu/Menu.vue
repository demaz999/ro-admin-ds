<script setup lang="ts">
/**
 * Меню — два мастера, обе подачи живые.
 *
 * - **Атом**: `Menu` `3499:24661`, спека `832:20679`, тёмный набор `1810:18826`.
 * - **кит 1**: `left_menu` `643:3053` (`type=Default`) и `644:6545` (`type=iconed`),
 *   страница мастера `281:62442`.
 *
 * Корень: вертикальный стек и ничего больше. Паддингов у контейнера нет ни у
 * одного из двух.
 *
 * ## Что различается
 *
 * | | Атом | кит 1 |
 * |---|---|---|
 * | ширина обычная | 296 | **256** |
 * | ширина компактная | 56 | **84** |
 * | зазор | 2 между пунктами | **8** между секциями, 4 внутри секции |
 * | компактный режим | только иконка | иконка **и подпись** под ней |
 *
 * Зазор 8 у кита 1 стоит на уровне меню, потому что его прямые дети — секции
 * (`block1`…`block4` мастера), а не пункты. Внутренний зазор 4 приходит из
 * `MenuSection`.
 *
 * ## Меню тёмное — но не потому, что тёмное у мастера
 *
 * Мастер Атома нарисован на белом, мастер кита 1 — на `menu/bg/default`
 * `#0e1e33`. Тёмным меню делает **тема**: с мастеров берутся состав и
 * геометрия, цвет приходит из `sidebar-*`.
 */
import { provide, toRef } from 'vue'
import type { MenuItemVariants } from '.'

const props = withDefaults(defineProps<{
  /** Ось `Compact` Атома, она же `type=iconed` кита 1. Пробрасывается всем пунктам. */
  compact?: boolean
  /** Источник подачи. Дефолт атомовский: на него сходится наложение волны 5. */
  variant?: NonNullable<MenuItemVariants['variant']>
}>(), { compact: false, variant: 'atom' })

/** Режим и подачу читают вложенные пункты, чтобы их не выставляли на каждом. */
provide('menuCompact', toRef(props, 'compact'))
provide('menuVariant', toRef(props, 'variant'))
</script>

<template>
  <nav
    data-slot="menu"
    class="flex flex-col bg-sidebar text-sidebar-foreground"
    :class="[
      props.variant === 'kit1' ? 'gap-2' : 'gap-0.5',
      props.compact
        ? (props.variant === 'kit1' ? 'w-21' : 'w-14')
        : (props.variant === 'kit1' ? 'w-64' : 'w-74'),
    ]"
  >
    <slot />
  </nav>
</template>
