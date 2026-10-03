<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
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
import { useReadonly } from '../field'
import SelectContent from './SelectContent.vue'
import SelectItem from './SelectItem.vue'
import SelectMultiple from './SelectMultiple.vue'
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
 *
 * ## Ось `multiple` — такт 62
 *
 * Набор значений чипами «текст ×» — мастер кита 1 `multiselect` `251:16816`. Значение — массив строк через
 * `v-model:values`; одиночный `v-model` при этом не используется. Состав тела другой, поэтому рисует его
 * `SelectMultiple.vue`; поиск в плашке у оси по умолчанию выключен — у мастера на его месте пустой слот.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<SelectTriggerVariants['variant']>
  /** `md` — мастер 434:3074 (40). `lg` — «Другие селекты» спеки 444:3849 (64, радиус 32). */
  size?: NonNullable<SelectTriggerVariants['size']>
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
  /** Набор значений чипами — мастер `multiselect` `251:16816`; значение — `v-model:values`. Такт 62. */
  multiple?: boolean
  /**
   * Только чтение — своё либо от `Field readonly` (такт 68): список не открывается, значение выделяется и копируется.
   * Корня `Combobox` нет — стоит один триггер. Разбор — `ui/field/index.ts`, «Ось readonly».
   */
  readonly?: boolean
}>(), {
  variant: 'filled',
  size: 'md',
  placeholder: 'Select option',
  items: () => [],
  searchable: undefined,
  showIcon: true,
  disabled: false,
  multiple: false,
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)

const model = defineModel<string>({ default: '' })
/** Значение оси `multiple`. */
const values = defineModel<string[]>('values', { default: () => [] })
/** Поиск в плашке: у одиночного выбора включён по умолчанию (мастер `PopOverList`), у набора — выключен. */
const searchable = computed(() => props.searchable ?? !props.multiple)

const selected = computed(() => props.items.find(i => i.value === model.value))
</script>

<template>
  <SelectMultiple
    v-if="props.multiple"
    v-model="values"
    :variant="props.variant"
    :placeholder="props.placeholder"
    :items="props.items"
    :searchable="searchable"
    :disabled="props.disabled"
    :readonly="ro"
  />
  <!-- Только чтение: список не нужен — триггер без корня Combobox, клик и клавиши его не открывают. -->
  <SelectTrigger
    v-else-if="ro"
    :variant="props.variant"
    :size="props.size"
    :placeholder="props.placeholder"
    :label="selected?.label ?? ''"
    :show-icon="props.showIcon"
    readonly
  >
    <template #icon>
      <slot name="icon" />
    </template>
  </SelectTrigger>
  <ComboboxRoot v-else v-model="model" :disabled="props.disabled" class="w-full">
    <ComboboxAnchor as-child>
      <!--
        Такт 36: ComboboxTrigger Reka ставит кнопке tabindex="-1" — фокус у комбобокса несёт поле
        ввода, а у Select его нет. Без явного tabindex выбор не достижим с клавиатуры: Tab по
        строкам формы его пропускал. Внешний атрибут ложится поверх внутреннего.
      -->
      <ComboboxTrigger as-child tabindex="0">
        <SelectTrigger
          :variant="props.variant"
          :size="props.size"
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
          <template v-if="searchable" #search>
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
