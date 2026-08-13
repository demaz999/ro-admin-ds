<script setup lang="ts">
import type { AlertVariants } from '.'
import { computed } from 'vue'
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { Timer } from '../timer'
import { alertVariants } from '.'

/**
 * Уведомление — мастер `Notification` `5883:58974`.
 * Три варианта мастера воспроизведены целиком; разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера. У `timer` варианта без иконки не существует. */
  type?: NonNullable<AlertVariants['type']>
  /** Булев проп `Show icon`. У `timer` включён всегда: таймер и есть иконка. */
  showIcon?: boolean
  /** Булев проп `Show ButtonAction`. */
  showAction?: boolean
  /** Доля отсчёта таймера, 0…1. Значима только при `type="timer"`. */
  value?: number
}>(), {
  type: 'default',
  showIcon: false,
  showAction: true,
  value: 0.25,
})

const emit = defineEmits<{ close: [] }>()

/** Таймер занимает место иконки, поэтому отдельная иконка при нём не рисуется. */
const withIcon = computed(() => props.type === 'timer' || props.showIcon)
</script>

<template>
  <div
    data-slot="alert"
    role="status"
    :class="alertVariants({ type: props.type, showIcon: withIcon })"
  >
    <!-- Слева либо таймер 20×20, либо иконка 16×16 в рамке 2. -->
    <Timer v-if="props.type === 'timer'" size="sm" :value="props.value" />
    <span v-else-if="props.showIcon" class="flex shrink-0 items-center justify-center p-0.5">
      <slot name="icon">
        <Icon name="check" :size="16" />
      </slot>
    </span>

    <div class="flex min-w-0 flex-1 flex-col items-start gap-1">
      <p class="w-full">
        <slot />
      </p>
      <!-- Размер `md` — это `suluguni` 16/20, ровно то, что инстанцировано в
           мастере уведомления. Оба узла `ButtonAction` сведены в один компонент
           решением от 2026-08-13. -->
      <ButtonAction v-if="props.showAction" :show-icon="false">
        <slot name="action">
          Button text
        </slot>
      </ButtonAction>
    </div>

    <!-- Крестик 8×8 прибит в 12 от верха и правого края. У таймера его нет:
         плашка закрывается сама, и в мастере крестик там не нарисован. -->
    <button
      v-if="props.type !== 'timer'"
      type="button"
      class="absolute top-3 right-3 text-primary"
      aria-label="Закрыть"
      @click="emit('close')"
    >
      <Icon name="close" :size="8" />
    </button>
  </div>
</template>
