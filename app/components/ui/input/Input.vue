<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { READONLY_SURFACE, useReadonly } from '../field'
import { Icon } from '../icon'
import { inputVariants, type InputVariants } from '.'

const props = withDefaults(defineProps<{
  /** Ось `Type` мастера: `filled` — залитое поле, `elevated` — белое с тенью поверх карты. */
  variant?: NonNullable<InputVariants['variant']>
  /** Ось `Size` мастера вместе со связанной с ней `Rounded`: 40px r8 либо 64px r32. */
  size?: NonNullable<InputVariants['size']>
  /** Текстовый проп мастера `Placeholder`. При фокусе или значении уезжает наверх подписью. */
  placeholder?: string
  /** Булев проп мастера `Show Icon left`. В мастере включён по умолчанию. */
  showIcon?: boolean
  /** Булев проп мастера `Show ClearButton`. В мастере выключен по умолчанию. */
  clearable?: boolean
  /** Состояние `Error` из спеки 237:2820. В мастере его нет. */
  invalid?: boolean
  /** Строка сообщения об ошибке — в спеке подписана «text about error here». */
  errorText?: string
  disabled?: boolean
  /** Только чтение — своё либо от `Field readonly`. Такт 68; разбор — `ui/field/index.ts`, «Ось readonly». */
  readonly?: boolean
}>(), {
  variant: 'filled',
  size: 'md',
  placeholder: 'Placeholder',
  showIcon: true,
  clearable: false,
  invalid: false,
  errorText: '',
  disabled: false,
  readonly: false,
})

/** Только чтение: значение выделяется и копируется, правки нет; крестика и слота `end` нет, наведения нет. */
const ro = useReadonly(() => props.readonly, () => props.disabled)

const model = defineModel<string>({ default: '' })

/**
 * Фокус отслеживается вручную, потому что от него зависит не только цвет, но и
 * РАЗМЕТКА: в ячейке `Pressed/Active` спеки подпись уже наверху, хотя значения
 * ещё нет. Одним CSS это не выражается.
 */
const focused = ref(false)

/** Поле активно — в фокусе или со значением: так в спеке. От этого зависит кнопка очистки. */
const isActive = computed(() => focused.value || model.value.length > 0)

/**
 * Подпись всплывает у активного поля — так в спеке. Исключение — пустой плейсхолдер: всплывать
 * нечему, и строка подписи не резервируется ни при фокусе, ни при значении — значение и каретка
 * по центру поля, как в покое. Так поле стоит под внешней подписью `Field`. Провенанс: прототип
 * VA-9265 v17 (значение по центру поля), мастер кита 1 `input` `720:11753` («Text» по центру);
 * отклонение от матрицы Атома `249:2768` — решение чата 2026-09-30 в режиме владельца от
 * 2026-09-30 (довесок 2 к такту 36). С непустым плейсхолдером поведение прежнее.
 */
const isFloating = computed(() => isActive.value && props.placeholder !== '')

/**
 * Слот `end` — содержимое справа внутри поля, по центру по вертикали (подсказка хоткея, единица). Рисуется только у
 * пустого поля: при непустом значении его место занимает крестик очистки. У пустого поля в фокусе крестик при слоте
 * не рисуется — место держит слот. Без слота разметка и поведение прежние. Такт 67, `docs/scheme-edit.md`, строка 98.
 */
const slots = useSlots()
const hasEnd = computed(() => !!slots.end)
const showEnd = computed(() => hasEnd.value && model.value === '' && !ro.value)
const showClear = computed(() => props.clearable && isActive.value && !showEnd.value && !ro.value)
</script>

<template>
  <div class="w-full">
    <!--
      Структура НЕ переключается между состояниями: узел `input` один и тот же
      всегда. Если разводить пустое и заполненное состояние на две ветки `v-if`,
      поле пересоздаётся в момент фокуса и фокус тут же теряется — подпись
      всплывает и сразу опадает.

      Поэтому меняются только высоты и видимость подписи, а вложенный фрейм с
      иконкой стоит на месте всегда: в мастере он и есть носитель зазора 8, тогда
      как внешний зазор 12 отделяет его от кнопки очистки.
    -->
    <div
      data-slot="field"
      :data-readonly="ro ? '' : undefined"
      :class="[inputVariants({ variant, size, invalid: invalid && !ro, floating: isFloating, disabled, readonly: ro }), ro ? READONLY_SURFACE : '']"
    >
      <div
        class="flex min-w-0 flex-1 items-center gap-2"
        :class="isFloating ? 'h-9' : 'h-5'"
      >
        <slot v-if="props.showIcon" name="icon">
          <Icon name="search" :size="16" />
        </slot>

        <div
          class="flex min-w-0 flex-1 flex-col items-start"
          :class="isFloating ? 'h-9' : 'h-5'"
        >
          <span
            v-show="isFloating"
            data-slot="field-label"
            class="h-4 w-full truncate text-xs font-medium text-field-placeholder"
            :class="ro ? '' : 'group-hover/field:text-field-placeholder-hover group-focus-within/field:text-field-placeholder-hover'"
          >
            {{ props.placeholder }}
          </span>
          <input
            v-model="model"
            data-slot="field-input"
            type="text"
            :placeholder="isFloating ? undefined : props.placeholder"
            :disabled="props.disabled"
            :readonly="ro"
            :aria-invalid="props.invalid || undefined"
            class="h-5 w-full min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-field-placeholder"
            :class="ro ? 'text-foreground' : 'text-field-foreground group-hover/field:text-field-foreground-hover group-hover/field:placeholder:text-field-placeholder-hover group-focus-within/field:text-field-foreground-hover'"
            @focus="focused = true"
            @blur="focused = false"
          >
        </div>
      </div>

      <span v-if="showEnd" data-slot="field-end" class="flex shrink-0 items-center">
        <slot name="end" />
      </span>

      <button
        v-else-if="showClear"
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

    <!--
      Строка сообщения об ошибке. В спеке она стоит под полем и подписана
      «text about error here»; внешней подписи и подсказки в спеке нет.
    -->
    <p
      v-if="props.invalid && props.errorText"
      data-slot="field-error"
      class="mt-1 text-xs font-medium text-field-error-foreground"
    >
      {{ props.errorText }}
    </p>
  </div>
</template>
