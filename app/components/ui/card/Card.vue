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
  /** Размер: `md` — блок (радиус 24, поля 24), `sm` — плитка внутри блока (радиус 8, поля 16). Такт 78. */
  size?: NonNullable<CardVariants['size']>
  /** Тег корня: `section` — когда у блока есть заголовок раздела. */
  as?: string
  /** Класс снаружи — слиянием: раскладка содержимого. */
  class?: string
}>(), { tone: 'default', size: 'md', as: 'div' })
</script>

<template>
  <component :is="props.as" data-slot="card" :data-tone="props.tone" :data-size="props.size === 'md' ? undefined : props.size" :class="cn(cardVariants({ tone: props.tone, size: props.size }), props.class)">
    <slot />
  </component>
</template>
