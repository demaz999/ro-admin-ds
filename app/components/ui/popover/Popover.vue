<script setup lang="ts">
import type { PopoverRootEmits, PopoverRootProps } from 'reka-ui'
import { PopoverRoot, useForwardPropsEmits } from 'reka-ui'

/**
 * Всплывающая плашка — мастер `Popover` `405:3786`, спека `1925:12127`.
 *
 * Корень. Состав — тот же пустой контейнер, что был всегда (см. `PopoverContent.vue`),
 * поведение и доступность — примитив `Popover` Reka UI, такт 28. Разбор целиком —
 * в `index.ts`.
 *
 * Булев проп объявлен со значением `undefined`: без этого Vue подставляет `false`,
 * плашка уезжает в управляемый режим и не открывается вовсе. Та же ловушка, что у
 * `Dialog` и `Tooltip` — см. `CLAUDE.md`.
 */
const props = withDefaults(defineProps<PopoverRootProps>(), {
  open: undefined,
  defaultOpen: undefined,
  modal: undefined,
})
const emits = defineEmits<PopoverRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <PopoverRoot data-slot="popover-root" v-bind="forwarded">
    <slot />
  </PopoverRoot>
</template>
