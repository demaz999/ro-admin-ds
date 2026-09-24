<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogContent, DialogOverlay, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { computed, provide } from 'vue'
import { cn } from '@/lib/utils'
import { MODAL_CARD_KEY, type ModalCardPlacement } from '.'

/**
 * Подложка и карточка окна. Разбор и геометрия — в `index.ts`.
 *
 * Корень шаблона — портал с подложкой и карточкой; «лишние» атрибуты потребителя уходят на
 * карточку — та же ловушка, что у `DialogContent` и `PopoverContent`.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<DialogContentProps & {
  placement?: ModalCardPlacement
  /** Ширина центрального окна: `md` 600, `sm` 440. У `edge` ширина одна — 642. */
  size?: 'md' | 'sm'
  /** `false` — закрыть можно только кнопками окна: без крестика, Esc и клика мимо (§12.5). */
  closable?: boolean
  /**
   * Без портала, подложка и карточка — внутри родителя. Стенду и `/compare`: показать окно в рамке.
   * В продукте не используется.
   */
  inline?: boolean
  class?: string
}>(), {
  placement: 'center',
  size: 'md',
  closable: true,
  inline: false,
})
const emits = defineEmits<DialogContentEmits>()

const delegated = reactiveOmit(props, 'placement', 'size', 'closable', 'inline', 'class')
const forwarded = useForwardPropsEmits(delegated, emits)

provide(MODAL_CARD_KEY, { closable: computed(() => props.closable) })

/** Заблокированное окно не закрывается ни Esc, ни кликом мимо — только своими кнопками. */
function guard(event: Event) {
  if (!props.closable) event.preventDefault()
}

const position = computed(() => (props.inline ? 'absolute' : 'fixed'))
</script>

<template>
  <DialogPortal :disabled="props.inline">
    <DialogOverlay
      v-if="!props.inline"
      data-slot="modal-card-overlay"
      class="fixed inset-0 z-50 bg-overlay-modal"
    />
    <div v-else data-slot="modal-card-overlay" class="absolute inset-0 bg-overlay-modal" />
    <DialogContent
      data-slot="modal-card"
      :data-placement="props.placement"
      :data-closable="props.closable || undefined"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="cn(
        'z-50 flex flex-col gap-6 rounded-tl-4xl bg-card px-4 py-8 text-foreground shadow-modal outline-none',
        position,
        props.placement === 'edge'
          ? 'inset-y-0 right-0 w-modal-edge'
          : cn('top-1/2 left-1/2 max-h-[88vh] -translate-x-1/2 -translate-y-1/2', props.size === 'sm' ? 'w-modal-narrow' : 'w-modal'),
        props.class,
      )"
      @escape-key-down="guard"
      @pointer-down-outside="guard"
      @interact-outside="guard"
    >
      <slot />
    </DialogContent>
  </DialogPortal>
</template>
