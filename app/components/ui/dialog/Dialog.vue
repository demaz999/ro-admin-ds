<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
import { DialogRoot, useForwardPropsEmits } from 'reka-ui'

/**
 * Корень модального окна. Состав — композиция `ModalWindow` Атома,
 * поведение и доступность — примитив `Dialog` Reka UI. Разбор — в `index.ts`.
 */
/**
 * Булевы пропы объявлены со значением `undefined`: без этого Vue подставляет
 * `false`, окно уезжает в управляемый режим и не открывается вовсе, а `modal`
 * молча теряет модальность. Та же ловушка, что была у `Tooltip`.
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
  <DialogRoot data-slot="dialog" v-bind="forwarded">
    <slot />
  </DialogRoot>
</template>
