<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { DialogRoot, useForwardPropsEmits } from 'reka-ui'

/**
 * Корень окна-карточки — Reka `DialogRoot`. Булевы пропы объявлены через `undefined`: без этого
 * Vue подставит `false`, и окно уедет в управляемый режим (ловушка `CLAUDE.md`, как у `Dialog`).
 */
const props = withDefaults(defineProps<DialogRootProps>(), {
  open: undefined,
  defaultOpen: undefined,
  modal: undefined,
})
const emits = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DialogRoot data-slot="modal-card-root" v-bind="forwarded">
    <slot />
  </DialogRoot>
</template>
