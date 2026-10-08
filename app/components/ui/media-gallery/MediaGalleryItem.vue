<script setup lang="ts">
import type { GalleryItemVariants } from '.'
import { computed, useSlots } from 'vue'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { cn } from '@/lib/utils'
import { galleryItemVariants, galleryMediaSelected } from '.'

/**
 * Плитка галереи — мастер `_MediaGalleryItem` `6734:62222`.
 * Пропорция 16:10 у всех трёх размеров; разбор — в `index.ts`.
 *
 * Такт 87 — оси выбора, подписи и просмотра крупно (разбор — `index.ts`, «Такт 87»): `selectable` и `selected` — плитка
 * выбора с флажком в левом верхнем углу; `disabled` — выбор недоступен; слоты `title` и `subtitle` — подпись под картинкой;
 * `openLabel` — кнопка «открыть крупно» в правом верхнем углу. Без них плитка прежняя: корень — сама картинка.
 */
const props = withDefaults(defineProps<{
  size?: GalleryItemVariants['size']
  /** Ось `Type` мастера: последняя плитка ведёт в полную галерею. */
  more?: boolean
  src?: string
  alt?: string
  /** Плитка выбора: нажатие и пробел переключают выбор, флажок в левом верхнем углу. Такт 87. */
  selectable?: boolean
  selected?: boolean
  /** Выбор недоступен: плитка на ступени выключенного, нажатие не переключает. Такт 87. */
  disabled?: boolean
  /** Подпись кнопки «открыть крупно» в правом верхнем углу; пусто — кнопки нет. Такт 87. */
  openLabel?: string
  /**
   * Оснастка приёмки: вид наведения без курсора — приближение картинки и кнопка в углу. Headless-браузер не наводит курсор,
   * а стенду нужна колонка «наведение». В продукт не идёт.
   */
  demoHover?: boolean
  /** Класс снаружи — слиянием: ширину плитки задаёт раскладка. */
  class?: string
}>(), {
  size: 'md',
  more: false,
  src: '',
  alt: '',
  selectable: false,
  selected: false,
  disabled: false,
  openLabel: '',
  demoHover: false,
  class: undefined,
})

const emit = defineEmits<{
  /** Нажатие, пробел или Enter по плитке выбора. */
  toggle: []
  /** Кнопка «открыть крупно». */
  open: []
}>()

const slots = useSlots()
/** Плитка с подписью, выбором или кнопкой — корень раскладывает картинку и подпись; иначе разметка прежняя. */
const rich = computed(() => props.selectable || !!props.openLabel || !!slots.title || !!slots.subtitle)
const live = computed(() => props.selectable && !props.disabled)

function toggle() {
  if (live.value) emit('toggle')
}
/* Клавиша — только на самой плитке: Enter и пробел из кнопки «открыть крупно» сюда не доходят (ловушка `FrameTile`, такт 34). */
function onKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget || !live.value) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    emit('toggle')
  }
}
</script>

<template>
  <div
    v-if="!rich"
    data-slot="media-gallery-item"
    :class="cn('aspect-16/10', galleryItemVariants({ size: props.size }), props.class)"
  >
    <img
      v-if="props.src && !props.more"
      :src="props.src"
      :alt="props.alt"
      class="size-full object-cover"
    >
    <!-- Плитка «показать все»: та же роль, что у отдельного мастера
         ButtonGallery 842:13505 — подпись 13 Medium по центру. -->
    <span
      v-if="props.more"
      class="absolute inset-0 flex items-center justify-center text-xs font-medium"
    >
      <slot>Показать все</slot>
    </span>
  </div>

  <!--
    Такт 87: плитка выбора и подписи. Корень — цель нажатия и фокуса (`role="checkbox"` у плитки выбора); картинка — в своей
    коробке 16:10 с радиусом размера; подпись — под картинкой через 8, две строки 13/16: часть — medium `--foreground`, ракурс —
    `--muted-foreground`.
  -->
  <div
    v-else
    data-slot="media-gallery-item"
    :data-selected="props.selected || undefined"
    :data-disabled="props.disabled || undefined"
    :role="props.selectable ? 'checkbox' : undefined"
    :tabindex="live ? 0 : undefined"
    :aria-checked="props.selectable ? props.selected : undefined"
    :aria-disabled="props.selectable && props.disabled ? 'true' : undefined"
    :aria-label="props.selectable ? props.alt || undefined : undefined"
    :class="cn('group/tile flex min-w-0 flex-col gap-2 outline-none', live ? 'cursor-pointer' : '', props.disabled ? 'opacity-[var(--opacity-disabled)]' : '', props.class)"
    @click="toggle()"
    @keydown="onKeydown"
  >
    <div
      data-slot="media-gallery-item-media"
      :class="cn(
        'relative aspect-16/10 group-focus-visible/tile:ring-2 group-focus-visible/tile:ring-ring',
        galleryItemVariants({ size: props.size }),
        props.selected ? galleryMediaSelected : live ? 'group-hover/tile:shadow-elevated' : '',
        props.demoHover && !props.selected ? 'shadow-elevated' : '',
      )"
      :style="{ transitionProperty: 'box-shadow', transitionDuration: 'var(--duration-hover)' }"
    >
      <!-- Приближение на наведении — прецедент `Image zoom` (решение владельца 2026-08-18): 1.04, `--duration-zoom`. -->
      <img
        v-if="props.src"
        :src="props.src"
        :alt="props.selectable ? '' : props.alt"
        class="size-full object-cover transition-transform"
        :class="props.demoHover ? 'scale-[1.04]' : live || props.openLabel ? 'group-hover/tile:scale-[1.04]' : ''"
        :style="{ transitionDuration: 'var(--duration-zoom)' }"
      >

      <!--
        Флажок — `Checkbox on-image` в зоне 32 с отступом 6, как у `FrameTile` (такт 52): виден всегда — плитка выбора стоит в
        списке выбора. Цель нажатия — вся плитка, поэтому флажок выведен из фокуса и из дерева доступности (`inert`).
      -->
      <span
        v-if="props.selectable"
        data-slot="media-gallery-item-check"
        inert
        class="pointer-events-none absolute top-1.5 left-1.5 z-10 flex size-8 items-center justify-center"
      >
        <Checkbox :model-value="props.selected" on-image />
      </span>

      <!-- «Открыть крупно» — правый верхний угол, плашка 28 `--scrim-dark` с белым глифом 16; на наведении и в фокусе, как у `FrameTile`. -->
      <button
        v-if="props.openLabel"
        type="button"
        data-slot="media-gallery-item-open"
        :aria-label="props.openLabel"
        class="absolute top-1.5 right-1.5 z-10 flex size-8 items-center justify-center outline-none group-hover/tile:opacity-100 focus-visible:opacity-100 [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-ring"
        :class="props.demoHover ? 'opacity-100' : 'opacity-0'"
        @click.stop="emit('open')"
      >
        <span class="flex size-7 items-center justify-center rounded-sm bg-scrim-dark text-primary-foreground"><Icon name="fullscreen" :size="16" /></span>
      </button>
    </div>

    <span v-if="$slots.title || $slots.subtitle" data-slot="media-gallery-item-caption" class="flex min-w-0 flex-col text-xs">
      <span v-if="$slots.title" data-slot="media-gallery-item-title" class="truncate font-medium text-foreground">
        <slot name="title" />
      </span>
      <span v-if="$slots.subtitle" data-slot="media-gallery-item-subtitle" class="truncate text-muted-foreground">
        <slot name="subtitle" />
      </span>
    </span>
  </div>
</template>
