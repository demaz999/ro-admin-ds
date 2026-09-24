<script setup lang="ts">
import { DialogClose, DialogDescription, DialogTitle, VisuallyHidden } from 'reka-ui'
import { computed, inject } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { cn } from '@/lib/utils'
import { MODAL_CARD_KEY } from '.'

/**
 * Шапка окна-карточки — мастер `modal_cards_header` `864:2747`, вариант `close`: строка 28,
 * заголовок 24/28 bold, крестик справа. Подзаголовок 15/20 — из «Экспорта в Excel»: у мастера
 * шапки его нет. У заблокированного окна крестика нет. Разбор — в `index.ts`.
 */
const props = defineProps<{
  title: string
  subtitle?: string
  class?: string
}>()

const ctx = inject(MODAL_CARD_KEY, { closable: computed(() => true) })
</script>

<template>
  <div data-slot="modal-card-header" :class="cn('flex shrink-0 items-start gap-4 pr-3 pl-4', props.class)">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
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
    <DialogClose v-if="ctx.closable.value" as-child>
      <IconButton variant="ghost" size="sm" label="Закрыть" class="mt-0.5">
        <Icon name="close" :size="13" class="text-foreground" />
      </IconButton>
    </DialogClose>
  </div>
</template>
