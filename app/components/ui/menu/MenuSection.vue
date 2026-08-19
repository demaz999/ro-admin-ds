<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, inject } from 'vue'
import type { MenuItemVariants } from '.'

/**
 * Раздел сайдбара — мастер `menu_devider` `637:2654` кита 1 плюс блоки
 * `block1`…`block4` внутри `left_menu` `643:3053`.
 *
 * ## Долг закрыт мастером
 *
 * Тактом 8 раздел собирался вслепую — у Атома заголовка раздела нет вовсе, и
 * компонент нёс метку `@debt`. Мастер кита 1 его рисует, причём **одной осью**:
 *
 * | ось `type` | что рисуется | где |
 * |---|---|---|
 * | `txt` | подпись 15/20 Regular `menu/devider/default` `#a2a9b2`, отступ 14 | развёрнутое меню |
 * | `line` | линия **54×1** того же цвета в боксе 84×20, по центру | свёрнутое меню |
 *
 * То есть разделитель у кита 1 — **один компонент с двумя подачами**, а не
 * линия с подписью: в развёрнутом состоянии линии нет, в свёрнутом нет подписи.
 * Сборка такта 8 рисовала обе разом — это и было расхождение.
 *
 * Первый раздел разделителя не несёт: у `list1` в мастере его нет.
 *
 * ## Почему компонент шире мастера
 *
 * `menu_devider` — только разделитель; блок с зазором 4 в мастере отдельным
 * компонентом не оформлен. Здесь они собраны вместе, потому что ритм «8 между
 * разделами, 4 внутри» — часть структуры, а не оформление страницы. Тот же
 * случай, что `Breadcrumb`: композиция получает своё имя. Соответствие имён —
 * в `docs/naming.md`.
 */
const props = withDefaults(defineProps<{
  /** Подпись раздела. В свёрнутом меню не рисуется — там линия. */
  title?: string
  /** Первый раздел в меню — разделителя над ним нет. */
  first?: boolean
  compact?: boolean
  variant?: NonNullable<MenuItemVariants['variant']>
}>(), {
  title: undefined,
  first: false,
  compact: undefined,
  variant: undefined,
})

const menuCompact = inject<Ref<boolean> | undefined>('menuCompact', undefined)
const menuVariant = inject<Ref<NonNullable<MenuItemVariants['variant']>> | undefined>('menuVariant', undefined)

const compact = computed(() => props.compact ?? menuCompact?.value ?? false)
const variant = computed(() => props.variant ?? menuVariant?.value ?? 'atom')
</script>

<template>
  <div
    data-slot="menu-section"
    class="flex flex-col"
    :class="variant === 'kit1' ? 'gap-1' : 'gap-0.5'"
  >
    <template v-if="!props.first">
      <!-- Свёрнутое меню: линия 54×1 по центру полосы, бокс высотой 20. -->
      <span
        v-if="compact"
        data-slot="menu-divider"
        class="flex h-5 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span class="h-px w-13.5 bg-sidebar-border" />
      </span>

      <!-- Развёрнутое: подпись раздела, отступ 14, линии нет. -->
      <span
        v-else-if="props.title"
        data-slot="menu-divider"
        class="flex shrink-0 items-center px-3.5 text-sm text-sidebar-border"
      >
        {{ props.title }}
      </span>
    </template>

    <slot />
  </div>
</template>
