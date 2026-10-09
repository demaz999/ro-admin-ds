<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера и спеки нет.
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
  ComboboxViewport,
} from 'reka-ui'
import { useFieldLabeled, useReadonly } from '../field'
import { Icon } from '../icon'
import { SelectContent, SelectItem } from '../select'
import { LIST_ITEM_RING, useListKeyboard } from '../select/keyboard'
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
  /** Только чтение — своё либо от `Field readonly` (такт 68): подсказки не открываются, ввода нет, крестика нет. */
  readonly?: boolean
}>(), {
  variant: 'filled',
  placeholder: 'Placeholder',
  items: () => [],
  showIcon: true,
  clearable: true,
  disabled: false,
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)

/**
 * Раскрытие списка держит компонент: в «только чтении» запрос на раскрытие (фокус, клик, стрелка) отклоняется. Корень
 * всегда управляемый — смена оси на лету не запирает его (ловушка булева пропа `CLAUDE.md`).
 */
const open = ref(false)
function setOpen(value: boolean) { open.value = ro.value ? false : value }

/** Модель компонента — введённый ТЕКСТ: значение может не совпасть ни с одной строкой. */
const model = defineModel<string>({ default: '' })

/** Выбранная строка корня Combobox — отдельно от текста, её задаёт клик по подсказке. */
const picked = ref<string>('')

const focused = ref(false)
const labeled = useFieldLabeled()
/**
 * Подпись всплывает при фокусе или при значении — как у поля ввода. Такт 98: у поля с подписью снаружи (`Field label`)
 * подсказка в подпись не переносится — при вводе исчезает, высота поля прежняя (`ui/field/index.ts`, «Подпись снаружи»).
 */
const isFloating = computed(() => (focused.value || model.value.length > 0) && !labeled.value)
/** Крестик очистки — у активного поля, как прежде: в фокусе или со значением. */
const isActive = computed(() => focused.value || model.value.length > 0)

/** Подсказки фильтруются по набранному — это и есть смысл компонента. */
const matches = computed(() => {
  const q = model.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i => i.label.toLowerCase().includes(q))
})

function pick(label: string) {
  model.value = label
}

/** Фокус пункта под клавиатурой — кольцо кита (такт 98, `select/keyboard.ts`): фокус в поле, пункт выделен стрелками. */
const { keyboard, onKeydown, onPointer } = useListKeyboard()
</script>

<template>
  <ComboboxRoot
    v-model="picked"
    :open="open"
    :disabled="props.disabled"
    ignore-filter
    open-on-focus
    open-on-click
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="false"
    class="w-full"
    @update:open="setOpen"
    @keydown="onKeydown"
    @pointerdown="onPointer"
  >
    <ComboboxAnchor as-child>
      <div
        data-slot="field"
        :data-readonly="ro ? '' : undefined"
        :class="autocompleteVariants({ variant, floating: isFloating, disabled, readonly: ro })"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2" :class="isFloating ? 'h-9' : 'h-5'">
          <slot v-if="props.showIcon" name="icon">
            <Icon name="search" :size="16" />
          </slot>

          <div class="flex min-w-0 flex-1 flex-col items-start" :class="isFloating ? 'h-9' : 'h-5'">
            <span
              v-show="isFloating"
              data-slot="field-label"
              class="h-4 w-full truncate text-xs font-medium text-field-placeholder"
              :class="ro ? '' : 'group-hover/field:text-field-placeholder-hover group-focus-within/field:text-field-placeholder-hover'"
            >
              {{ props.placeholder }}
            </span>

            <!-- v-model на самом ComboboxInput: он держит набранный текст. -->
            <ComboboxInput v-model="model" as-child>
              <input
                data-slot="field-input"
                :placeholder="isFloating ? undefined : props.placeholder"
                :disabled="props.disabled"
                :readonly="ro"
                class="h-5 w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-field-placeholder"
                :class="ro ? 'text-foreground' : 'text-field-foreground group-hover/field:text-field-foreground-hover group-focus-within/field:text-field-foreground-hover'"
                @focus="focused = true"
                @blur="focused = false"
              >
            </ComboboxInput>
          </div>
        </div>

        <!--
          Такт 88: крестик — не остановка Tab. У пустого поля он есть, пока поле в фокусе (`isFloating`): Tab переводил фокус
          на крестик, поле теряло фокус, крестик пропадал вместе с фокусом — фокус уходил со страницы (в окне — на `body`).
          Очистка — нажатием, с клавиатуры — стиранием текста; вид прежний. Строка 225 реестра расхождений `docs/scheme-edit.md`.
        -->
        <button
          v-if="props.clearable && isActive && !ro"
          data-slot="field-clear"
          type="button"
          tabindex="-1"
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
      <!-- Такт 98: плашка шириной поля (не уже 320) от его левого края — решение владельца 2026-10-09. -->
      <ComboboxContent position="popper" align="start" :side-offset="4" as-child>
        <!-- Поиска внутри плашки нет: полем поиска работает само поле. -->
        <SelectContent fit-anchor @pointermove="onPointer">
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
                :class="['outline-none', keyboard ? LIST_ITEM_RING : '']"
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
