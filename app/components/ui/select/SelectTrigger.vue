<!--
  @debt Ось `readonly` — дефолт по аналогии с китом: состояния «только чтение» у мастера и спеки нет.
  См. docs/design-debt.md, «Ось readonly», и `ui/field/index.ts`, «Ось readonly».
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useReadonly } from '../field'
import { Icon } from '../icon'
import { selectTriggerVariants, type SelectTriggerVariants } from '.'

/**
 * Триггер селекта — перенос мастера `434:3074` целиком, все 16 вариантов.
 * Это ровно то, что нарисовано в мастере: выпадающая часть там отдельный узел.
 *
 * Компонент презентационный, поведения не несёт: его надевает `Select` через
 * `ComboboxTrigger` с `as-child`. Тогда `data-state` приходит от Reka и шеврон
 * идёт за реальным состоянием списка. В одиночку — например на странице
 * наложения — состояние задаётся пропом `open`.
 */
const props = withDefaults(defineProps<{
  variant?: NonNullable<SelectTriggerVariants['variant']>
  /** `md` — мастер 434:3074 (40). `lg` — «Другие селекты» спеки 444:3849 (64, радиус 32). */
  size?: NonNullable<SelectTriggerVariants['size']>
  /** Ось `Active` мастера: меняет только направление шеврона. */
  open?: boolean
  /** Текстовый проп мастера `Select option`. */
  placeholder?: string
  /** Текстовый проп мастера `Option` — выбранное значение. */
  label?: string
  /** Булев проп мастера `Show icon`. */
  showIcon?: boolean
  disabled?: boolean
  /**
   * Только чтение — такт 68: корень — фокусируемый блок с `aria-readonly` вместо кнопки: текст значения выделяется
   * мышью (текст внутри кнопки браузер не выделяет), шеврона нет. Разбор — `ui/field/index.ts`, «Ось readonly».
   */
  readonly?: boolean
}>(), {
  variant: 'filled',
  size: 'md',
  open: false,
  placeholder: 'Select option',
  label: '',
  showIcon: true,
  disabled: false,
  readonly: false,
})

const ro = useReadonly(() => props.readonly, () => props.disabled)

/** Состояние `filled` мастера — наличие выбранного значения. */
const isFilled = computed(() => props.label.length > 0)

/**
 * Заполненное поле поднимает плейсхолдер подписью — так в мастере. При пустом плейсхолдере
 * подписи нет, и строка под неё не резервируется: значение по центру поля. Так выбор стоит под
 * внешней подписью `Field`. Провенанс: прототип VA-9265 v17 (значение по центру), мастер кита 1
 * `input` `720:11753`; отклонение от матрицы Атома — решение чата 2026-09-30 в режиме владельца
 * от 2026-09-30 (довесок 2 к такту 36). С непустым плейсхолдером поведение прежнее.
 */
const isFloating = computed(() => isFilled.value && props.placeholder !== '')
</script>

<template>
  <component
    :is="ro ? 'div' : 'button'"
    data-slot="field"
    :type="ro ? undefined : 'button'"
    :disabled="ro ? undefined : props.disabled"
    :tabindex="ro ? 0 : undefined"
    :role="ro ? 'combobox' : undefined"
    :aria-readonly="ro ? 'true' : undefined"
    :aria-expanded="ro ? 'false' : undefined"
    :data-readonly="ro ? '' : undefined"
    :data-state="props.open && !ro ? 'open' : 'closed'"
    :class="selectTriggerVariants({ variant, size, floating: isFloating, disabled, readonly: ro })"
  >
    <slot v-if="props.showIcon" name="icon">
      <Icon name="link" :size="16" />
    </slot>

    <span class="flex min-w-0 flex-1 flex-col items-start text-left" :class="isFloating ? 'h-9' : 'h-5'">
      <span
        v-if="isFloating"
        data-slot="field-label"
        class="h-4 w-full truncate text-xs font-medium text-field-placeholder"
        :class="ro ? '' : 'group-hover/field:text-field-placeholder-hover'"
      >
        {{ props.placeholder }}
      </span>
      <span
        data-slot="field-input"
        class="h-5 w-full truncate text-sm font-medium"
        :class="ro
          ? (isFilled ? 'text-foreground' : 'text-field-placeholder')
          : isFilled
            ? 'text-field-foreground group-hover/field:text-field-foreground-hover'
            : 'text-field-placeholder group-hover/field:text-field-placeholder-hover'"
      >
        {{ isFilled ? props.label : props.placeholder }}
      </span>
    </span>

    <!--
      Шеврон — обязательная часть мастера, слота под него нет. Направление идёт
      за `data-state`: в одиночку его ставит проп, под `ComboboxTrigger` — Reka.
    -->
    <template v-if="!ro">
      <Icon name="chevron-down" :size="16" class="group-data-[state=open]/field:hidden" />
      <Icon name="chevron-up" :size="16" class="hidden group-data-[state=open]/field:block" />
    </template>
  </component>
</template>
