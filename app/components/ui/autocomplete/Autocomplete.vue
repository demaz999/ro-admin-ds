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
 * Механика общая с `Select`: оба на примитиве `Combobox` Reka. Различие —
 * поведение, а не вид: здесь пользователь вводит текст сам, и введённое может
 * не совпасть ни с одной строкой списка.
 *
 * ## Геометрия — это `Input`, один в один
 *
 * Мастер даёт 8 вариантов: Type `default|map` × State `default|filled` ×
 * Disabled. Коробка 272×40, паддинги 10/16 в пустом и 2/16 в заполненном,
 * зазор 8 и 12, радиус 8, рамки нет, заливка `#d4d5d9` 32% либо белая с тенью
 * 12%. Всё совпадает с полем ввода, поэтому роли те же `--field-*`.
 *
 * Отличие от `Input` одно: **в заполненном состоянии в мастере нарисован
 * крестик очистки** — у `Input` он есть, но по умолчанию выключен, здесь же
 * присутствует во всех заполненных вариантах.
 *
 * Своего списка у мастера нет: подсказки показываются в той же плашке
 * `PopOverList` `571:4889`. Поиска внутри плашки здесь нет — полем поиска
 * работает само поле.
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

const model = defineModel<string>({ default: '' })

const focused = ref(false)
/** Подпись всплывает при фокусе или при значении — как у поля ввода. */
const isFloating = computed(() => focused.value || model.value.length > 0)

/** Подсказки фильтруются по введённому — это и есть смысл компонента. */
const matches = computed(() => {
  const q = model.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i => i.label.toLowerCase().includes(q))
})
</script>

<template>
  <ComboboxRoot v-model="model" :disabled="props.disabled" ignore-filter class="w-full">
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
            <ComboboxInput as-child>
              <input
                v-model="model"
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
              :value="item.label"
              :disabled="item.disabled"
              as-child
            >
              <SelectItem :subtitle="item.subtitle" :disabled="item.disabled">
                {{ item.label }}
              </SelectItem>
            </ComboboxItem>
          </ComboboxViewport>
        </SelectContent>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
