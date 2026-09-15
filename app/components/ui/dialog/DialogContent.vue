<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogClose, DialogContent, DialogDescription, DialogPortal, DialogTitle, useForwardPropsEmits, VisuallyHidden } from 'reka-ui'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { cn } from '@/lib/utils'

/**
 * Обязательно: приведёт `inheritAttrs` компонента к ручному режиму — корень
 * шаблона это `DialogPortal`, а он рисует `Teleport`. Vue не умеет молча
 * докладывать «лишние» атрибуты в портальный корень и предупреждает об этом
 * в консоли; здесь разбор — под `trapFocus` ниже.
 */
defineOptions({ inheritAttrs: false })

/**
 * Поверхность окна во весь экран плюс шапка с возвратом и крестиком.
 *
 * Подложки нет намеренно: в композиции Атома окно занимает экран целиком и
 * лежит на непрозрачной поверхности. Разбор — в `index.ts`.
 *
 * ## `trapFocus` — явный проп, не проезжий атрибут (такт 28)
 *
 * До такта 28 `:trap-focus="…"` не был объявленным пропом ни у нас, ни у
 * `DialogContentProps` Reka (там `Omit<DialogContentImplProps, 'trapFocus'>` —
 * он живёт только у `DialogContentModal`/`DialogContentNonModal`, на уровень
 * глубже публичного `DialogContent`). Значение падало в `$attrs` и пыталось
 * само доехать до корня — Vue ловил это и ругался в консоль: «Extraneous
 * non-props attributes (trap-focus)… component renders… teleport root nodes».
 * Функционально атрибут всё равно доезжал (Reka сама прокидывает `$attrs`
 * вниз своей `<DialogContent>`), но предупреждение оставалось.
 *
 * Теперь `trapFocus` — обычный проп: `inheritAttrs: false` останавливает
 * автопроброс на корень, а значение явно уходит во внутренний `<DialogContent>`
 * вместе с остальными. По умолчанию `true` — настоящее модальное окно обязано
 * держать фокус внутри себя; `/compare` кладёт `false` явно, чтобы автоснимок
 * не боролся за фокус со скриптом захвата.
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
  /** Фокус не покидает окно, пока оно открыто. Такт 28, разбор выше. */
  trapFocus?: boolean
  /**
   * Заголовок для программ чтения с экрана, если видимого `DialogTitle` в
   * содержимом нет. Рендерится скрыто (`VisuallyHidden`) — такт 28. Есть свой
   * видимый `DialogTitle` в слоте — проп не передаётся, чтобы не задвоить id.
   */
  title?: string
  /** То же для описания — `aria-describedby`. Разбор — там же. */
  description?: string
}>(), {
  back: '',
  showClose: true,
  layout: 'center',
  inline: false,
  trapFocus: true,
  title: undefined,
  description: undefined,
})

/** `back` — наш эмит поверх примитива: возврат на уровень выше, а не закрытие. */
const emits = defineEmits<DialogContentEmits & { back: [] }>()

const delegated = reactiveOmit(props, 'class', 'back', 'showClose', 'layout', 'inline', 'title', 'description')
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
      <VisuallyHidden v-if="props.title" as-child>
        <DialogTitle>{{ props.title }}</DialogTitle>
      </VisuallyHidden>
      <VisuallyHidden v-if="props.description" as-child>
        <DialogDescription>{{ props.description }}</DialogDescription>
      </VisuallyHidden>

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
