<script setup lang="ts">
import type { FileVariants } from '.'
import { computed } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { fileVariants } from '.'

/**
 * Файл — мастер `File` `1931:12249`.
 * `simple` не размер, а другой состав: без плашки и превью. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера. */
  variant?: FileVariants['variant']
  /** Ось `Size`. У `simple` игнорируется: в мастере размер один на все. */
  size?: FileVariants['size']
  /** Булев проп `Show subtitle` мастера. */
  showSubtitle?: boolean
  /** Превью. Без него держатель показывает пикту типа файла — как в мастере. */
  src?: string
}>(), {
  variant: 'default',
  size: 'md',
  showSubtitle: true,
  src: '',
})

/** Превью есть только у плашечного вида. */
const withPreview = computed(() => props.variant === 'default')
</script>

<template>
  <div
    data-slot="file"
    :class="fileVariants({ variant: props.variant, size: props.size })"
  >
    <!--
      Держатель 90×56 у крупного и 76×48 у мелкого — во всю высоту строки.
      В мастере внутри него ДВА взаимоисключающих узла: `Image` с превью и
      `Icon` с пиктой типа файла 20×20. Иконка — запасной вариант, когда
      превью нет; в первом переносе она не переехала вовсе.
    -->
    <span
      v-if="withPreview"
      class="flex h-full shrink-0 items-center justify-center overflow-hidden rounded-md"
      :class="props.size === 'sm' ? 'w-19' : 'w-22'"
    >
      <slot name="preview">
        <img
          v-if="props.src"
          :src="props.src"
          alt=""
          class="size-full object-cover"
        >
        <Icon v-else name="draft" :size="20" class="text-muted-foreground" />
      </slot>
    </span>

    <span class="flex min-w-0 flex-1 flex-col justify-center">
      <span class="truncate text-base font-medium">
        <slot />
      </span>
      <span v-if="props.showSubtitle" class="truncate text-xs text-muted-foreground">
        <slot name="subtitle" />
      </span>
    </span>

    <!-- В мастере справа стоит инстанс `ButtonSimple` 24×24 — наш `IconButton`. -->
    <slot name="action">
      <!-- В мастере это `ButtonSimple` 32×32 у плашки и 24×24 у простой строки. -->
      <IconButton
        variant="ghost"
        :size="props.variant === 'simple' ? 'sm' : 'md'"
        label="Удалить файл"
      >
        <Icon name="close" :size="8" :scale="0.75" />
      </IconButton>
    </slot>
  </div>
</template>
