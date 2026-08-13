<script setup lang="ts">
import type { IndicatorVariants } from '.'
import { computed } from 'vue'
import { indicatorVariants } from '.'

/**
 * Индикатор — мастер `Bulb` `790:10402`.
 * Неинтерактивен по объявлению спеки `1858:11709`: состояний нет.
 */
const props = withDefaults(defineProps<{
  /** Роль цвета. Цветовая ось мастера сведена к семантике — см. `index.ts`. */
  variant?: IndicatorVariants['variant']
  /** `dot` — метка, `text` — голая цифра, `counter` — цифра в плашке. */
  type?: IndicatorVariants['type']
  /** У `counter` игнорируется: малого размера в мастере нет. */
  size?: IndicatorVariants['size']
}>(), {
  variant: 'default',
  type: 'dot',
  size: 'md',
})

/**
 * Счётчик нарисован только крупным, поэтому размер к нему не применяется —
 * иначе в коде появился бы вариант, которого в мастере нет.
 */
const size = computed(() => (props.type === 'counter' ? 'md' : props.size))
</script>

<template>
  <span
    data-slot="indicator"
    :data-type="props.type"
    :class="indicatorVariants({ variant, type, size })"
  >
    <!-- Точка содержимого не несёт: она сама и есть отметка. -->
    <template v-if="props.type !== 'dot'">
      <!-- Подпись счётчика лежит на заливке роли, поэтому она белая. У голой
           цифры заливки нет и цвет остаётся ролевым. -->
      <span v-if="props.type === 'counter'" class="text-primary-foreground">
        <slot />
      </span>
      <slot v-else />
    </template>
  </span>
</template>
