<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { cn } from '@/lib/utils'
import { Icon, type IconName } from '../icon'
import { calloutVariants, type CalloutTone } from '.'

/**
 * Плашка-сообщение в потоке — разбор и таблица «кит | прототип» в `index.ts`.
 * Текст и список — слот по умолчанию: абзац или `<ul>` без классов, оформление даёт компонент.
 * `closable` (такт 72) — крестик справа, событие `close`; скрывает плашку потребитель.
 * `icon` (такт 99) — устройство плашки с иконкой по макету `33351:8881`: иконка 24 слева, поля 12 / 12 / 12 / 20, радиус 16,
 * заголовок 15/20 bold и текст 12/16 под ним вплотную; разбор — в `index.ts`, раздел «Плашка с иконкой».
 */
const props = withDefaults(defineProps<{
  tone?: CalloutTone
  /** Заголовок плашки — первой строкой, полужирным. */
  title?: string
  /**
   * Иконка слева — устройство плашки с иконкой (такт 99, макет `33351:8881`). Имя глифа `Icon`: глиф 20 в боксе 24.
   * Без пропа плашка прежняя.
   */
  icon?: IconName
  /** Крестик «Закрыть» справа — одноразовая плашка; нажатие отдаёт `close`, плашку убирает потребитель. */
  closable?: boolean
  /**
   * Узкий экран (уже 768) — такт 92: `keep` (по умолчанию) — действия справа от текста; `stack` — действия строкой под текстом,
   * от левого края, с переносом (статус витрины страницы схемы на телефоне). Рабочий стол прежний.
   */
  narrow?: 'keep' | 'stack'
  class?: string
}>(), {
  tone: 'neutral',
  title: '',
  icon: undefined,
  closable: false,
  narrow: 'keep',
})
const emit = defineEmits<{ close: [] }>()
const slots = useSlots()

/* Плашка с иконкой: у заголовка и иконки свой цвет на плашке без заливки и на нейтральной; на тонах — цвет тона целиком. */
const withIcon = computed(() => !!props.icon)
const iconTone = computed(() => (props.tone === 'plain' ? 'text-primary' : ''))
const titleTone = computed(() => (props.tone === 'plain' || props.tone === 'neutral' ? 'text-foreground' : ''))
/* Текст под заголовком — второй строкой макета 12/16; текст без заголовка — единственная строка, 15/20 (строка 336 реестра `scheme-edit.md`). */
const textSize = computed(() => (withIcon.value && props.title && slots.default ? 'text-2xs' : ''))
</script>

<template>
  <div
    data-slot="callout"
    :data-tone="props.tone"
    :data-icon="withIcon ? props.icon : undefined"
    :data-narrow="props.narrow === 'stack' ? 'stack' : undefined"
    :class="cn(calloutVariants({ tone: props.tone, layout: withIcon ? 'icon' : 'text' }), props.narrow === 'stack' ? 'max-md:flex-wrap' : '', props.class)"
  >
    <span v-if="props.icon" data-slot="callout-icon" :class="cn('flex size-6 shrink-0 items-center justify-center', iconTone)">
      <Icon :name="props.icon" :size="20" />
    </span>
    <div :class="cn('flex min-w-0 flex-1 flex-col', withIcon ? '' : 'gap-1', props.narrow === 'stack' ? 'max-md:basis-full' : '')">
      <p v-if="props.title" data-slot="callout-title" :class="cn('m-0 font-bold', withIcon ? titleTone : '')">
        {{ props.title }}
      </p>
      <div
        v-if="$slots.default"
        data-slot="callout-text"
        :class="cn('[&_li]:list-item [&_p]:m-0 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-5', textSize)"
      >
        <slot />
      </div>
    </div>
    <div v-if="$slots.actions" data-slot="callout-actions" :class="cn('flex shrink-0 flex-wrap items-center justify-end gap-4', props.narrow === 'stack' ? 'max-md:max-w-full max-md:shrink max-md:justify-start' : '')">
      <slot name="actions" />
    </div>
    <!--
      Крестик — зона 32 с глифом 16, как у `Alert` (такт 50); поля зоны уходят в поля плашки (−6 по вертикали, −8 справа):
      высота плашки и правый край текста прежние. Цвет — тон плашки на ступени `--opacity-on-tone`, наведение — полный тон.
    -->
    <button
      v-if="props.closable"
      type="button"
      data-slot="callout-close"
      aria-label="Закрыть"
      class="group/close -my-1.5 -mr-2 flex size-8 shrink-0 items-center justify-center self-start rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="emit('close')"
    >
      <Icon name="close" :size="16" class="opacity-[var(--opacity-on-tone)] group-hover/close:opacity-100" />
    </button>
  </div>
</template>
