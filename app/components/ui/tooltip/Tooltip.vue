<script setup lang="ts">
import type { TooltipRootEmits, TooltipRootProps } from 'reka-ui'
import { TooltipRoot, useForwardPropsEmits } from 'reka-ui'

/**
 * Корень подсказки — мастер `Tooltip` `834:10127`. Поведение из Reka, вид с мастера.
 *
 * ## Ловушка: булев проп без `undefined` запирает подсказку навсегда
 *
 * Vue приводит булевы пропы к `false`, когда их не передали. Для обёртки это
 * значит, что `open` уезжает в примитив **явным `false`**, а не отсутствием —
 * и Reka переходит в управляемый режим (`passive: props.open === undefined`).
 * Управляемая подсказка со значением `false` не открывается ничем: ни
 * наведением, ни `defaultOpen`.
 *
 * Диагноз выглядел как «подсказка не работает у ячейки», но не работала она
 * **везде**, включая знак «?» в шапке страницы, — просто это никто не проверял
 * кликом: наложение сверяет вид, а не поведение.
 *
 * Поэтому все булевы пропы объявлены со значением `undefined` по умолчанию:
 * тогда в примитив приходит отсутствие, и работают его собственные дефолты.
 */
const props = withDefaults(defineProps<TooltipRootProps>(), {
  open: undefined,
  defaultOpen: undefined,
  delayDuration: undefined,
  disabled: undefined,
  disableHoverableContent: undefined,
  disableClosingTrigger: undefined,
  ignoreNonKeyboardFocus: undefined,
})
const emits = defineEmits<TooltipRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <TooltipRoot v-bind="forwarded">
    <slot />
  </TooltipRoot>
</template>
