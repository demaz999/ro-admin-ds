<!--
  @debt Плашка внутри — перенесённый `Alert` (мастер `Notification` 5883:58974).
  Дефолт здесь только оболочка: появление, уход и время жизни.
  См. docs/design-debt.md
-->
<script setup lang="ts">
import type { ToastRootEmits, ToastRootProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { ToastRoot, useForwardPropsEmits } from 'reka-ui'
import { Alert } from '../alert'

/**
 * Одно уведомление в стеке. Визуал не свой: внутри лежит `Alert`, то есть
 * атомовская плашка целиком. Разбор — в `index.ts`.
 */
const props = defineProps<ToastRootProps & {
  /** Прокидывается в `Alert`: обычная плашка либо с таймером. */
  type?: 'default' | 'timer'
  showIcon?: boolean
  showAction?: boolean
  value?: number
}>()

const emits = defineEmits<ToastRootEmits>()

const delegated = reactiveOmit(props, 'type', 'showIcon', 'showAction', 'value')
const forwarded = useForwardPropsEmits(delegated, emits)
</script>

<template>
  <ToastRoot
    data-slot="toast"
    v-bind="forwarded"
    class="data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:slide-in-from-right-4 data-[swipe=end]:animate-out outline-none"
  >
    <Alert
      :type="props.type ?? 'default'"
      :show-icon="props.showIcon ?? false"
      :show-action="props.showAction ?? true"
      :value="props.value ?? 0.25"
      @close="emits('update:open', false)"
    >
      <slot />
      <!-- Слот прокидывается только когда он реально заполнен: иначе он затёр бы
           дефолтную иконку `Alert` пустотой. -->
      <template v-if="$slots.icon" #icon>
        <slot name="icon" />
      </template>
    </Alert>
  </ToastRoot>
</template>
