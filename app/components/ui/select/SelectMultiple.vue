<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера `251:16816` нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui'
import { useReadonly } from '../field'
import { Icon } from '../icon'
import SelectContent from './SelectContent.vue'
import SelectItem from './SelectItem.vue'
import { selectChipVariants, selectMultiBodyVariants, type SelectTriggerVariants } from '.'

/**
 * Селект с набором значений — ось `multiple` у `Select`: мастер кита 1 `multiselect` `251:16816`
 * (файл `uG3HTIcMwr2jI2d7YEYPs2`). Разбор и матрица — `index.ts`, раздел «Ось `multiple`».
 *
 * Отдельный файл, потому что состав тела другой: внутри поля стоят чипы с собственными кнопками снятия, и телом
 * поэтому служит контейнер, а кнопка раскрытия — шеврон. `Select` при `multiple` рисует этот компонент.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<SelectTriggerVariants['variant']>
  placeholder?: string
  items?: { value: string, label: string, subtitle?: string, disabled?: boolean }[]
  searchable?: boolean
  disabled?: boolean
  /** Только чтение — такт 68: чипы без крестиков, кнопки раскрытия нет, список не открывается; тело фокусируемо. */
  readonly?: boolean
}>(), {
  variant: 'filled',
  placeholder: 'Placeholder',
  items: () => [],
  searchable: false,
  disabled: false,
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)

const model = defineModel<string[]>({ default: () => [] })
const open = ref(false)

/** Чипы — в порядке выбора; значение вне списка показывается своим ключом. */
const chips = computed(() => model.value.map(v => props.items.find(i => i.value === v) ?? { value: v, label: v }))

function remove(value: string) {
  if (ro.value) return
  model.value = model.value.filter(v => v !== value)
}
/** Клик по свободному месту тела раскрывает список — как клик по полю; чипы и шеврон обрабатывают клик сами. */
function onBodyClick(event: MouseEvent) {
  if (props.disabled || ro.value || event.target !== event.currentTarget) return
  open.value = !open.value
}
</script>

<template>
  <ComboboxRoot v-model="model" :open="ro ? false : open" multiple :disabled="props.disabled" class="w-full" @update:open="open = ro ? false : $event">
    <ComboboxAnchor as-child>
      <div
        data-slot="field"
        data-multiple
        :data-state="open ? 'open' : 'closed'"
        :data-disabled="props.disabled ? '' : undefined"
        :data-readonly="ro ? '' : undefined"
        :tabindex="ro ? 0 : undefined"
        :role="ro ? 'listbox' : undefined"
        :aria-readonly="ro ? 'true' : undefined"
        :aria-label="ro ? props.placeholder : undefined"
        :class="selectMultiBodyVariants({ variant: props.variant, disabled: props.disabled, readonly: ro })"
        @click="onBodyClick"
      >
        <!-- `badge_list` мастера: чипы с переносом, зазор 8 в обе стороны. -->
        <!-- Только чтение: чипы принимают указатель — текст значений выделяется мышью. -->
        <div v-if="chips.length" data-slot="select-chips" class="flex min-w-0 flex-1 flex-wrap gap-2" :class="ro ? '' : 'pointer-events-none'">
          <span v-for="c in chips" :key="c.value" data-slot="select-chip" :data-value="c.value" :role="ro ? 'option' : undefined" :aria-selected="ro ? 'true' : undefined" :class="selectChipVariants({ disabled: props.disabled })">
            <span class="min-w-0 truncate">{{ c.label }}</span>
            <!-- Крестик — коробка 16, глиф 9.2: мастер `Badge` `250:15548`. -->
            <button
              v-if="!ro"
              type="button"
              data-slot="select-chip-remove"
              class="pointer-events-auto flex size-4 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
              :aria-label="`Убрать: ${c.label}`"
              :disabled="props.disabled"
              @click.stop="remove(c.value)"
            >
              <Icon name="close" :size="9.2" />
            </button>
          </span>
        </div>
        <span v-else data-slot="field-input" class="pointer-events-none min-w-0 flex-1 truncate text-sm font-medium text-field-placeholder" :class="ro ? '' : 'group-hover/field:text-field-placeholder-hover'">
          {{ props.placeholder }}
        </span>

        <!-- Кнопка раскрытия — шеврон: фокус с клавиатуры несёт она (`tabindex="0"` — ловушка такта 36). -->
        <ComboboxTrigger v-if="!ro" as-child tabindex="0">
          <button
            type="button"
            data-slot="select-toggle"
            class="flex size-6 shrink-0 items-center justify-center rounded-xs text-field-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="open ? 'Свернуть список' : 'Раскрыть список'"
          >
            <Icon :name="open ? 'chevron-up' : 'chevron-down'" :size="16" />
          </button>
        </ComboboxTrigger>
      </div>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4" as-child>
        <SelectContent>
          <template v-if="props.searchable" #search>
            <ComboboxInput as-child>
              <input
                data-slot="field-input"
                class="h-10 w-78 rounded-md bg-field px-4 text-sm font-medium outline-none text-field-foreground placeholder:text-field-placeholder"
                placeholder="Search"
              >
            </ComboboxInput>
          </template>

          <ComboboxViewport>
            <ComboboxItem
              v-for="item in props.items"
              :key="item.value"
              :value="item.value"
              :disabled="item.disabled"
              as-child
            >
              <!-- Строка мастера `items3`, `multiselect=on`: слева место галочки 16, у выбранной она видна. -->
              <SelectItem :subtitle="item.subtitle" :selected="model.includes(item.value)" :disabled="item.disabled" show-icon>
                <template #icon>
                  <Icon v-if="model.includes(item.value)" name="check" :size="16" />
                </template>
                {{ item.label }}
              </SelectItem>
            </ComboboxItem>
          </ComboboxViewport>
        </SelectContent>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
