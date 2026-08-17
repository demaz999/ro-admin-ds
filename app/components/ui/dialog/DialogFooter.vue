<script setup lang="ts">
import { cn } from '@/lib/utils'

/**
 * Блок кнопок — группа `Button-block` схем со скроллом (`1156:10272` и ещё три).
 *
 * Высота 96, во всю ширину, заливка непрозрачная и та же, что у поверхности:
 * блок лежит **поверх** прокручиваемого тела, а не под ним. Кнопки 40 высотой,
 * отступ сверху 24.
 *
 * Сетка та же, что у тела: 12 колонок с гуттером 32, содержимое в тех же 8
 * колонках по центру.
 */
const props = withDefaults(defineProps<{
  class?: string
  /** Колонка кнопок: как у тела — 8 из 12 по центру либо все 12. */
  layout?: 'center' | 'full'
}>(), { layout: 'center' })
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="cn('@middle:px-8 @wide:px-10 h-24 shrink-0 bg-dialog px-6 pt-6', props.class)"
  >
    <div class="grid grid-cols-12 gap-8">
      <div
        class="flex h-10 items-center gap-8"
        :class="props.layout === 'center' ? '@wide:col-span-8 @wide:col-start-3 col-span-12' : 'col-span-12'"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
