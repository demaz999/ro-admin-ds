<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { cn } from '@/lib/utils'

/**
 * Поверхность окна во весь экран плюс шапка с возвратом и крестиком.
 *
 * Подложки нет намеренно: в композиции Атома окно занимает экран целиком и
 * лежит на непрозрачной поверхности. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<DialogContentProps & {
  class?: string
  /** Подпись кнопки возврата. Пусто — кнопки нет: в спеке «её можно отключить». */
  back?: string
  /** Крестик. В спеке: «на втором уровне его можно не выводить». */
  showClose?: boolean
  /** Колонка контента: 8 колонок из 12 по центру либо все 12. */
  layout?: 'center' | 'full'
  /**
   * Без портала и во весь **родитель**, а не во весь экран.
   *
   * Нужно наложению: `/compare` кладёт окно в кадр размером с эталон, и
   * `fixed` вместе с порталом унесли бы его из кадра на страницу целиком.
   * В продукте не используется.
   */
  inline?: boolean
}>(), {
  back: '',
  showClose: true,
  layout: 'center',
  inline: false,
})

/** `back` — наш эмит поверх примитива: возврат на уровень выше, а не закрытие. */
const emits = defineEmits<DialogContentEmits & { back: [] }>()

const delegated = reactiveOmit(props, 'class', 'back', 'showClose', 'layout', 'inline')
const forwarded = useForwardPropsEmits(delegated, emits)
</script>

<template>
  <DialogPortal :disabled="props.inline">
    <DialogContent
      data-slot="dialog-content"
      v-bind="forwarded"
      :class="cn(
        '@container z-50 flex flex-col bg-dialog text-foreground outline-none',
        props.inline ? 'absolute inset-0' : 'fixed inset-0',
        props.class,
      )"
    >
      <!--
        Шапка: 44 на узком и среднем, 60 на широком. Возврат прижат к боковому
        паддингу, крестик центрирован в шапке — отступ у него (44−40)/2 = 2 и
        (60−40)/2 = 10, а не паддинг колонки.
      -->
      <div
        data-slot="dialog-bar"
        class="@middle:px-8 @wide:h-15 @wide:px-10 relative flex h-11 shrink-0 items-center px-6"
      >
        <!-- Иконка возврата у ButtonAction дефолтная — тот же шеврон влево, что в композиции. -->
        <ButtonAction v-if="props.back" @click="emits('back')">
          {{ props.back }}
        </ButtonAction>

        <DialogClose v-if="props.showClose" as-child>
          <IconButton
            variant="ghost"
            size="lg"
            label="Закрыть"
            class="@wide:right-2.5 absolute top-1/2 right-0.5 -translate-y-1/2"
          >
            <Icon name="close" :size="20" />
          </IconButton>
        </DialogClose>
      </div>

      <!--
        Тело прокручивается, сетка двенадцатиколоночная с гуттером 32.
        Колонка контента — 8 из 12 по центру, то есть со второй колонки.
      -->
      <div
        data-slot="dialog-body"
        class="@middle:px-8 @wide:px-10 min-h-0 flex-1 overflow-y-auto px-6"
      >
        <div class="grid grid-cols-12 gap-8">
          <div :class="props.layout === 'center' ? '@wide:col-span-8 @wide:col-start-3 col-span-12' : 'col-span-12'">
            <slot />
          </div>
        </div>
      </div>

      <slot name="footer" />
    </DialogContent>
  </DialogPortal>
</template>
