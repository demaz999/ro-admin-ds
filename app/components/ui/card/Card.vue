<script setup lang="ts">
import type { CardVariants } from '.'
import { cn } from '@/lib/utils'
import { cardVariants } from '.'

/**
 * Поверхность блока настроек — карточка раздела, панель таба, карточка процесса. Разбор — `index.ts`.
 *
 * Пример: `<Card class="flex flex-col gap-8"> … </Card>`; вложенная форма — `<Card tone="muted">`.
 */
const props = withDefaults(defineProps<{
  /** `default` — белая поверхность с рамкой; `muted` — приглушённая подложка вложенной формы. */
  tone?: NonNullable<CardVariants['tone']>
  /** Тег корня: `section` — когда у блока есть заголовок раздела. */
  as?: string
  /** Класс снаружи — слиянием: раскладка содержимого. */
  class?: string
}>(), { tone: 'default', as: 'div' })
</script>

<template>
  <component :is="props.as" data-slot="card" :data-tone="props.tone" :class="cn(cardVariants({ tone: props.tone }), props.class)">
    <slot />
  </component>
</template>
