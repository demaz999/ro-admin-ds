<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера `1072:10873` и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { CAPTION, choiceReadonlyGuard, choiceRowVariants, choiceTitleVariants } from '../checkbox'
import { useReadonly } from '../field'

/**
 * Переключатель — мастер `Switcher` `1072:10873`, спека `1072:8677`,
 * тёмный набор `6137:49693`.
 *
 * Оси: `Switched` × `Disabled` = 4 варианта, перенесены все.
 *
 * Дорожка 32×20, радиус 10 — пилюля. Бегунок 16×16, белый круг. Выключенная
 * дорожка нейтральная `#d4d5d9`, включённая брендовая; бегунок не меняется.
 *
 * Имя `Switch` каноническое: `Switcher` из Атома — то же самое, но в словаре
 * shadcn компонент зовётся `Switch`.
 *
 * Раскладка общая с `Checkbox`: контрол в строке 20, зазор 12, заголовок с
 * подписью. См. `../checkbox/index.ts`.
 */
const props = withDefaults(defineProps<{
  subtitle?: string
  disabled?: boolean
  /** Только чтение — своё либо от `Field readonly` (такт 68): переключение отказано, фокус остаётся (`aria-readonly`). */
  readonly?: boolean
}>(), {
  subtitle: '',
  disabled: false,
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)
const guard = choiceReadonlyGuard(ro)

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label
    data-slot="choice"
    :data-readonly="ro ? '' : undefined"
    :class="choiceRowVariants({ disabled, readonly: ro })"
    @click.capture="guard.onClickCapture"
    @keydown.capture="guard.onKeydownCapture"
  >
    <span class="flex h-5 shrink-0 items-center">
      <SwitchRoot
        v-model="model"
        :disabled="props.disabled"
        data-slot="choice-control"
        :aria-readonly="ro ? 'true' : undefined"
        class="flex h-5 w-8 items-center rounded-full bg-muted p-0.5 outline-none transition-colors"
        :class="ro ? 'data-[state=checked]:bg-foreground-secondary' : 'data-[state=checked]:bg-primary'"
      >
        <SwitchThumb
          class="block size-4 rounded-full bg-primary-foreground transition-transform data-[state=checked]:translate-x-3"
        />
      </SwitchRoot>
    </span>

    <span class="flex min-w-0 flex-col">
      <span data-slot="choice-title" :class="choiceTitleVariants({ checked: model })">
        <slot />
      </span>
      <!-- Пояснение — такт 98, решение владельца 2026-10-09: через 4 под подписью, 13/16 regular `--foreground-secondary` — один вид у всего кита (`ui/checkbox/index.ts`, «Пояснение»). -->
      <span
        v-if="props.subtitle"
        data-slot="choice-subtitle"
        :class="CAPTION"
      >
        {{ props.subtitle }}
      </span>
    </span>
  </label>
</template>
