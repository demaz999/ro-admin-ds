<script setup lang="ts">
import { DialogClose, DialogDescription, DialogTitle, VisuallyHidden } from 'reka-ui'
import { computed, inject } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { cn } from '@/lib/utils'
import { MODAL_CARD_KEY } from '.'

/**
 * Шапка окна-карточки — мастер `modal_cards_header` `864:2747`: строка 28, заголовок 24/28 bold. Оба варианта
 * мастера: `close` `864:2745` — крестик справа; `back` `864:2746` — стрелка «назад» слева от заголовка (такт 64).
 * Подзаголовок 15/20 — из «Экспорта в Excel»: у мастера шапки его нет. У заблокированного окна крестика нет.
 * Слот `icon` — такт 83: значок окна в круге 28 тона ошибки над заголовком, через 16 (Figma `31246:7448`, `31246:7517`).
 * Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  /**
   * Вариант `type=back` мастера: стрелка «назад» слева от заголовка, крестика нет — второй слой окна (история
   * версий: список → дифф версии). Нажатие — событие `back`; закрытие окна остаётся за Esc и кликом мимо.
   */
  back?: boolean
  class?: string
}>(), { back: false })

const emit = defineEmits<{ back: [] }>()

const ctx = inject(MODAL_CARD_KEY, { closable: computed(() => true) })
</script>

<template>
  <!-- Паддинги мастера: `close` — 0 / 12 / 0 / 16, `back` — 0 / 12 / 0 / 12; зазор стрелки и заголовка 16. -->
  <div data-slot="modal-card-header" :data-type="props.back ? 'back' : 'close'" :class="cn('flex shrink-0 items-start gap-4 pr-3', props.back ? 'pl-3' : 'pl-4', props.class)">
    <!-- Стрелка — бокс 24 по центру строки 28, видимый глиф 17.58 по ширине: `ic_keyboard_backspace24` `1944:1184`. -->
    <IconButton v-if="props.back" data-modal-back variant="ghost" size="sm" label="Назад" class="mt-0.5" @click="emit('back')">
      <Icon name="arrow-back" :size="17.6" class="text-foreground" />
    </IconButton>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <!--
        Значок окна — такт 83: круг 28 `--destructive`, поля 4, глиф 20 `--destructive-foreground` (Figma `31246:7448` —
        `service/error-default`, `24_ic_calendar_month` 20; `31246:7517` — `ic_error`); до заголовка 16 (`31246:7447`, зазор 16).
        Строка значка — 28: крестик (бокс 24, `mt-0.5`) стоит по её центру, как по центру строки заголовка без значка.
      -->
      <span v-if="$slots.icon" data-slot="modal-card-icon" class="mb-3 flex size-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <slot name="icon" />
      </span>
      <DialogTitle data-slot="modal-card-title" class="m-0 text-2xl font-bold text-foreground">
        {{ props.title }}
      </DialogTitle>
      <DialogDescription v-if="props.subtitle" data-slot="modal-card-subtitle" class="m-0 text-sm text-foreground-secondary">
        {{ props.subtitle }}
      </DialogDescription>
      <!-- Без подзаголовка — описание для чтения с экрана, иначе Reka предупреждает (такт 28). -->
      <VisuallyHidden v-else as-child>
        <DialogDescription>{{ props.title }}</DialogDescription>
      </VisuallyHidden>
    </div>
    <!-- Строка 28, бокс крестика 24 — по центру строки. Глиф 13: видимый размер `24_close`. -->
    <DialogClose v-if="ctx.closable.value && !props.back" as-child>
      <IconButton variant="ghost" size="sm" label="Закрыть" class="mt-0.5">
        <Icon name="close" :size="13" class="text-foreground" />
      </IconButton>
    </DialogClose>
  </div>
</template>
