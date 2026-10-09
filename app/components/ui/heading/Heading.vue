<script setup lang="ts">
import type { HeadingLevel } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { headingMetaShift, headingVariants } from '.'

/**
 * Заголовок страницы (`page`, h1), раздела страницы (`title`, h2), группы в карточке (`group`, h3) или блока
 * (`section`, h2) — разбор в `index.ts`.
 * Слот `meta` — текст в строке с заголовком, выровненный по середине строчных (такт 50).
 * Проп `description` — подпись под заголовком (такт 62).
 */
const props = withDefaults(defineProps<{
  level?: HeadingLevel
  /** Тег вместо уровня по умолчанию: `legend`, `h3`… Вид не меняется. */
  as?: string
  /** Подпись под заголовком: 13/16 `--foreground-secondary`, зазор 4 — макет `32876:4136` (такт 62). */
  description?: string
  /**
   * Не больше строк — такт 92: длинный заголовок обрывается многоточием на последней строке (имя схемы на узком экране — до
   * трёх строк). Без пропа заголовок переносится целиком.
   */
  lines?: 2 | 3
  class?: string
}>(), {
  level: 'section',
  as: undefined,
  description: '',
  lines: undefined,
})

const tag = computed(() => props.as ?? ({ page: 'h1', title: 'h2', group: 'h3', section: 'h2' } as const)[props.level])
/** Обрыв по числу строк — такт 92; длинное слово переносится внутри, чтобы не раздвигать узкую колонку. */
const clamp = computed(() => (props.lines === 2 ? 'line-clamp-2 break-words' : props.lines === 3 ? 'line-clamp-3 break-words' : ''))
</script>

<template>
  <!--
    Строка «заголовок + текст» при контрасте кеглей — по середине строчных. Оба стоят на базовой линии; внешний узел
    с кеглем заголовка поднимает текст на половину высоты строчных заголовка, внутренний с кеглем текста опускает на
    половину своей: середины строчных совпадают.
  -->
  <div v-if="$slots.meta" data-slot="heading-row" class="flex min-w-0 items-baseline gap-2">
    <component :is="tag" data-slot="heading" :data-level="props.level" :class="cn(headingVariants({ level: props.level }), 'shrink-0', props.class)">
      <slot />
    </component>
    <!-- Текст рядом с заголовком уступает место: в тесной строке обрезается многоточием, заголовок цел. -->
    <span data-slot="heading-meta" :class="cn(headingVariants({ level: props.level }), 'relative bottom-[0.5ex] min-w-0 truncate font-normal leading-none')">
      <span :class="cn('relative text-xs text-muted-foreground', headingMetaShift[props.level])"><slot name="meta" /></span>
    </span>
  </div>
  <!-- Заголовок с подписью — один блок: класс снаружи ложится на блок, заголовок и подпись держат зазор 4. -->
  <div v-else-if="props.description" data-slot="heading-block" :class="cn('flex min-w-0 flex-col gap-1', props.class)">
    <component :is="tag" data-slot="heading" :data-level="props.level" :class="headingVariants({ level: props.level })">
      <slot />
    </component>
    <p data-slot="heading-description" class="text-xs text-foreground-secondary">
      {{ props.description }}
    </p>
  </div>
  <component :is="tag" v-else data-slot="heading" :data-level="props.level" :data-lines="props.lines" :class="cn(headingVariants({ level: props.level }), clamp, props.class)">
    <slot />
  </component>
</template>
