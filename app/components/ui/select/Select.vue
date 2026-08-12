<script setup lang="ts">
import { computed } from 'vue'
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
import SelectContent from './SelectContent.vue'
import SelectItem from './SelectItem.vue'
import SelectTrigger from './SelectTrigger.vue'
import type { SelectTriggerVariants } from '.'

/**
 * Селект — выбор **строго из списка**, без свободного ввода.
 *
 * Источники: триггер — мастер `434:3074` и спека `444:3849`; выпадающая часть —
 * мастер `PopOverList` `571:4889` и спека `571:6147`.
 *
 * ## Почему `Combobox` Reka, а не `Select`
 *
 * У Атома **в плашке встроенный поиск, включённый по умолчанию** — это настоящий
 * инстанс `Input` шириной 312, а не пустой слот. Примитив `Select` поиска внутри
 * не поддерживает: то, что нарисовано у Атома, в словаре Reka называется
 * `Combobox`. На нём же собран `Autocomplete` — механика общая, различается
 * поведение.
 *
 * | | `Select` | `Autocomplete` |
 * |---|---|---|
 * | что вводит пользователь | ничего: выбор из списка | свободный текст |
 * | где поиск | **внутри плашки**, отдельным полем | само поле и есть поиск |
 * | можно ли значение вне списка | нет | да |
 *
 * Разбор для дизайнеров — `docs/naming.md`, раздел 5.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<SelectTriggerVariants['variant']>
  /** Текстовый проп мастера `Select option` — подпись поля. */
  placeholder?: string
  items?: { value: string, label: string, subtitle?: string, disabled?: boolean }[]
  /**
   * Булев проп мастера `Search field`. **По умолчанию включён** — так в мастере
   * `PopOverList`, где поиск нарисован внутри плашки.
   */
  searchable?: boolean
  showIcon?: boolean
  disabled?: boolean
}>(), {
  variant: 'filled',
  placeholder: 'Select option',
  items: () => [],
  searchable: true,
  showIcon: true,
  disabled: false,
})

const model = defineModel<string>({ default: '' })

const selected = computed(() => props.items.find(i => i.value === model.value))
</script>

<template>
  <ComboboxRoot v-model="model" :disabled="props.disabled" class="w-full">
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <SelectTrigger
          :variant="props.variant"
          :placeholder="props.placeholder"
          :label="selected?.label ?? ''"
          :show-icon="props.showIcon"
          :disabled="props.disabled"
        >
          <template #icon>
            <slot name="icon" />
          </template>
        </SelectTrigger>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4" as-child>
        <SelectContent>
          <!--
            Поиск внутри плашки — то самое, из-за чего взят Combobox.
            Геометрия поля берётся у Input: 40 высотой, 312 шириной.
          -->
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
              <SelectItem
                :subtitle="item.subtitle"
                :selected="item.value === model"
                :disabled="item.disabled"
              >
                {{ item.label }}
              </SelectItem>
            </ComboboxItem>
          </ComboboxViewport>
        </SelectContent>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
