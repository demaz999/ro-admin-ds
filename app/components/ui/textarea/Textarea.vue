<script setup lang="ts">
import { computed, ref } from 'vue'
import { textareaVariants } from '.'

const props = withDefaults(defineProps<{
  /** Текстовый проп мастера `Placeholder`. При фокусе или значении уезжает наверх подписью. */
  placeholder?: string
  /** Состояние `Error` по образцу поля ввода: в спеке Textarea своей ошибки нет. */
  invalid?: boolean
  errorText?: string
  disabled?: boolean
}>(), {
  placeholder: 'Placeholder',
  invalid: false,
  errorText: '',
  disabled: false,
})

const model = defineModel<string>({ default: '' })

const focused = ref(false)
/** Подпись всплывает при фокусе ИЛИ при наличии значения — как у Input. */
const isFloating = computed(() => focused.value || model.value.length > 0)
</script>

<template>
  <div class="w-full">
    <!--
      Высота коробки фиксированная — 140 из мастера. Внутри колонка: подпись
      сверху, поле ввода занимает остаток. Структура не переключается ветками,
      иначе при фокусе узел пересоздаётся и фокус теряется.
    -->
    <div
      data-slot="field"
      class="h-35"
      :class="textareaVariants({ invalid, floating: isFloating, disabled })"
    >
      <span
        v-show="isFloating"
        data-slot="field-label"
        class="h-4 w-full shrink-0 truncate text-xs font-medium text-field-placeholder group-hover/field:text-field-placeholder-hover group-focus-within/field:text-field-placeholder-hover"
      >
        {{ props.placeholder }}
      </span>

      <textarea
        v-model="model"
        data-slot="field-input"
        :placeholder="isFloating ? undefined : props.placeholder"
        :disabled="props.disabled"
        :aria-invalid="props.invalid || undefined"
        class="field-scroll min-h-0 w-full flex-1 resize-none bg-transparent text-sm font-medium outline-none text-field-foreground placeholder:text-field-placeholder group-hover/field:text-field-foreground-hover group-hover/field:placeholder:text-field-placeholder-hover group-focus-within/field:text-field-foreground-hover"
        @focus="focused = true"
        @blur="focused = false"
      />
    </div>

    <p
      v-if="props.invalid && props.errorText"
      data-slot="field-error"
      class="mt-1 text-xs font-medium text-field-error-foreground"
    >
      {{ props.errorText }}
    </p>
  </div>
</template>

<style scoped>
/*
  Скроллбар из спеки 344:2796: дорожка 4px, бегунок радиусом 2. Стоковый
  скроллбар браузера шире и рисуется иначе, поэтому переносится свой.
  Значения — токенами: ширина из лесенки, цвет ролью поля.
*/
/* Ширину задаёт webkit-правило: стандартное `scrollbar-width: thin` перебивает
   его и даёт около 10px вместо мастерских 4. Поэтому оно объявляется только
   там, где webkit-псевдоэлемента нет, — то есть в Firefox. */
@supports not selector(::-webkit-scrollbar) {
  .field-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--field-scroll-thumb) transparent;
  }
}

.field-scroll::-webkit-scrollbar {
  width: calc(var(--spacing) * 1); /* 4px — дорожка из спеки */
}

.field-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.field-scroll::-webkit-scrollbar-thumb {
  background: var(--field-scroll-thumb);
  border-radius: var(--radius-xs);
}
</style>
