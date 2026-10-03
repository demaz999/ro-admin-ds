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
  /**
   * Приглушённая поверхность — такт 80: содержимое на ступени `--opacity-disabled`, поверхность прежняя. Устаревшая схема
   * в списке (§11 сводки тарификации); нажатия и фокус содержимого остаются.
   */
  dimmed?: boolean
  /** Тег корня: `section` — когда у блока есть заголовок раздела. */
  as?: string
  /** Класс снаружи — слиянием: раскладка содержимого. */
  class?: string
}>(), { tone: 'default', size: 'md', dimmed: false, as: 'div' })
</script>

<template>
  <component :is="props.as" data-slot="card" :data-tone="props.tone" :data-size="props.size === 'md' ? undefined : props.size" :data-dimmed="props.dimmed ? '' : undefined" :class="cn(cardVariants({ tone: props.tone, size: props.size, dimmed: props.dimmed }), props.class)">
    <slot />
  </component>
</template>
