<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import type { ModalCardDock } from '.'
import { reactiveOmit } from '@vueuse/core'
import { DialogRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, provide } from 'vue'
import { MODAL_CARD_DOCK_KEY } from '.'

/**
 * Корень окна-карточки — Reka `DialogRoot`. Булевы пропы объявлены через `undefined`: без этого
 * Vue подставит `false`, и окно уедет в управляемый режим (ловушка `CLAUDE.md`, как у `Dialog`).
 *
 * `dock` — такт 101: сайд слотом (`slot`) или немодальным слоем (`layer`); корень тогда немодальный. Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<DialogRootProps & { dock?: ModalCardDock }>(), {
  open: undefined,
  defaultOpen: undefined,
  modal: undefined,
  dock: undefined,
})
const emits = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'dock'), emits)

provide(MODAL_CARD_DOCK_KEY, computed(() => props.dock))
</script>

<template>
  <DialogRoot data-slot="modal-card-root" v-bind="forwarded" :modal="props.dock ? false : forwarded.modal">
    <slot />
  </DialogRoot>
</template>
