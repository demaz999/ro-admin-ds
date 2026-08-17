<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { buttonArrowVariants, type ButtonArrowVariants } from '.'

/**
 * Круглая кнопка-стрелка — мастер `1938:12858`.
 * Направление в мастере это ось, а не иконка на выбор: слот под глиф там один.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<ButtonArrowVariants['variant']>
  size?: NonNullable<ButtonArrowVariants['size']>
  /** Ось `Direction` мастера. */
  direction?: 'left' | 'right'
  disabled?: boolean
  label: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'elevated',
  size: 'md',
  direction: 'left',
  disabled: false,
  type: 'button',
})

/**
 * Размер глифа — **высота** шеврона: у него это доминирующая сторона, и именно
 * её `Icon` приравнивает к `size`.
 *
 * Замерено по всем шести вариантам мастера `1938:12858`: 12×**32** у круга 48,
 * 6×**16** у круга 32, 6×**12** у круга 24.
 *
 * Волна 5 сняла с мастера **ширину** (12 против 6) и подставила её как `size` —
 * то есть как высоту. Крупный круг получил глиф 24 вместо 32, малый 16 вместо
 * 12. Поймано в очереди 3: лайтбокс инстанцирует именно крупную стрелку, и
 * наложение показало нехватку 8px. Ширина при этом остаётся шире эталона —
 * пропорция шеврона Material против шеврона Атома, расхождение известное и
 * записано в `CLAUDE.md`.
 */
const glyphSize = computed(() => ({ lg: 32, md: 16, sm: 12 }[props.size]))

/**
 * Оптическая поправка центровки — **сознательное отклонение**.
 *
 * Мастер `1938:12858` центрирован **геометрически**: замер всех шести вариантов
 * дал смещение центра глифа относительно центра круга ровно `0.00` по обеим
 * осям. То есть перенос верен, а глаз всё равно видит шеврон не по центру.
 *
 * Причина в форме глифа: у шеврона одна сторона — остриё, другая — два тупых
 * конца. Поле у острия читается крупнее равного ему поля у концов, и связка
 * выглядит сдвинутой назад. Компенсируется сдвигом **в сторону острия**.
 *
 * Величина — 1px: при поле 9 у малого круга (24 против глифа 6) это заметный,
 * но не переигрывающий сдвиг; 2px на этом размере уже читается как смещение.
 * У крупного круга поле вдвое больше, но и глиф вдвое крупнее, поэтому
 * пропорция сохраняется и правка та же.
 *
 * Тот же приём, что у крестика в строке списка: коробка не меняется, двигается
 * только содержимое. Запись в `docs/figma-fixes.md`.
 */
const opticalShift = computed(() => (props.direction === 'left' ? '-1px' : '1px'))
</script>

<template>
  <button
    data-slot="button"
    :type="props.type"
    :disabled="props.disabled"
    :aria-label="props.label"
    :class="buttonArrowVariants({ variant, size })"
  >
    <Icon
      :name="props.direction === 'left' ? 'chevron-left' : 'chevron-right'"
      :size="glyphSize"
      :style="{ transform: `translateX(${opticalShift})` }"
    />
  </button>
</template>
