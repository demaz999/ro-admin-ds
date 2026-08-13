<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { Icon } from '../icon'
import { SelectContent, SelectItem } from '../select'
import { autocompleteVariants, type AutocompleteVariants } from '.'

/**
 * Поле со свободным вводом и подсказками — мастер `Autocomplete` `3874:36379`,
 * спека `3874:30988`, тёмный набор `3961:46520`.
 *
 * ## Чем отличается от `Select` на уровне триггера
 *
 * Механика общая — оба на `Combobox` Reka. Но **поле ввода здесь и есть
 * триггер**: пользователь печатает прямо в него, текст виден в поле, а список
 * фильтруется по набранному. У `Select` наоборот: триггер презентационный, а
 * поиск живёт отдельным полем внутри плашки.
 *
 * Отсюда три обязательные настройки корня, без которых поведение ломается:
 *
 * - `resetSearchTermOnBlur = false` — иначе набранное **стирается при потере
 *   фокуса**, и поле выглядит пустым;
 * - `resetSearchTermOnSelect = false` — иначе выбранная строка не остаётся
 *   в поле;
 * - `ignoreFilter` — список фильтруем сами, чтобы Reka не фильтровала повторно.
 *
 * Отдельная ловушка: `v-model` вешается на сам `ComboboxInput`, а не на
 * вложенный `input`. `ComboboxInput` держит набранный текст своим `modelValue`
 * и прокидывает его в потомка через `as-child`; своё `v-model` на потомке
 * перебивает это и уводит ввод мимо поля.
 *
 * ## Геометрия — это `Input`, один в один
 *
 * 8 вариантов: Type `default|map` × State `default|filled` × Disabled. Коробка
 * 272×40, паддинги 10/16 в пустом и 2/16 в заполненном, зазоры 8 и 12, радиус 8,
 * рамки нет. Отличие от `Input` одно: **крестик очистки нарисован во всех
 * заполненных вариантах**, тогда как у поля ввода он по умолчанию выключен.
 */
const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: `filled` — залитое поле, `elevated` — белое с тенью поверх карты. */
  variant?: NonNullable<AutocompleteVariants['variant']>
  placeholder?: string
  items?: { value: string, label: string, subtitle?: string, disabled?: boolean }[]
  /** Булев проп мастера `Show Icon left`. */
  showIcon?: boolean
  /** Булев проп мастера `Show ClearButton`. В мастере нарисован во всех заполненных. */
  clearable?: boolean
  disabled?: boolean
}>(), {
  variant: 'filled',
  placeholder: 'Placeholder',
  items: () => [],
  showIcon: true,
  clearable: true,
  disabled: false,
})

/** Модель компонента — введённый ТЕКСТ: значение может не совпасть ни с одной строкой. */
const model = defineModel<string>({ default: '' })

/** Выбранная строка корня Combobox — отдельно от текста, её задаёт клик по подсказке. */
const picked = ref<string>('')

const focused = ref(false)
/** Подпись всплывает при фокусе или при значении — как у поля ввода. */
const isFloating = computed(() => focused.value || model.value.length > 0)

/** Подсказки фильтруются по набранному — это и есть смысл компонента. */
const matches = computed(() => {
  const q = model.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i => i.label.toLowerCase().includes(q))
})

function pick(label: string) {
  model.value = label
}
</script>

<template>
  <ComboboxRoot
    v-model="picked"
    :disabled="props.disabled"
    ignore-filter
    open-on-focus
    open-on-click
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="false"
    class="w-full"
  >
    <ComboboxAnchor as-child>
      <div
        data-slot="field"
        :class="autocompleteVariants({ variant, floating: isFloating, disabled })"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2" :class="isFloating ? 'h-9' : 'h-5'">
          <slot v-if="props.showIcon" name="icon">
            <Icon name="search" :size="16" />
          </slot>

          <div class="flex min-w-0 flex-1 flex-col items-start" :class="isFloating ? 'h-9' : 'h-5'">
            <span
              v-show="isFloating"
              data-slot="field-label"
              class="h-4 w-full truncate text-xs font-medium text-field-placeholder group-hover/field:text-field-placeholder-hover group-focus-within/field:text-field-placeholder-hover"
            >
              {{ props.placeholder }}
            </span>

            <!-- v-model на самом ComboboxInput: он держит набранный текст. -->
            <ComboboxInput v-model="model" as-child>
              <input
                data-slot="field-input"
                :placeholder="isFloating ? undefined : props.placeholder"
                :disabled="props.disabled"
                class="h-5 w-full min-w-0 bg-transparent text-sm font-medium outline-none text-field-foreground placeholder:text-field-placeholder group-hover/field:text-field-foreground-hover group-focus-within/field:text-field-foreground-hover"
                @focus="focused = true"
                @blur="focused = false"
              >
            </ComboboxInput>
          </div>
        </div>

        <button
          v-if="props.clearable && isFloating"
          data-slot="field-clear"
          type="button"
          :disabled="props.disabled"
          class="flex size-5 shrink-0 items-center justify-center rounded-full p-1.5 text-field-clear-foreground"
          :class="variant === 'elevated' ? 'bg-field-clear-elevated' : 'bg-field-clear'"
          aria-label="Очистить"
          @mousedown.prevent
          @click="model = ''"
        >
          <Icon name="close" :size="8" />
        </button>
      </div>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4" as-child>
        <!-- Поиска внутри плашки нет: полем поиска работает само поле. -->
        <SelectContent>
          <ComboboxViewport>
            <ComboboxItem
              v-for="item in matches"
              :key="item.value"
              :value="item.value"
              :disabled="item.disabled"
              as-child
              @select="pick(item.label)"
            >
              <SelectItem
                :subtitle="item.subtitle"
                :show-icon="Boolean($slots['item-icon'])"
                :disabled="item.disabled"
              >
                <template v-if="$slots['item-icon']" #icon>
                  <slot name="item-icon" />
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
