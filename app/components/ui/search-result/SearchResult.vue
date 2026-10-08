<script setup lang="ts">
import { computed } from 'vue'
import { HighlightText } from '../highlight-text'
import { Icon, type IconName } from '../icon'
import { Switch } from '../switch'
import { SEARCH_RESULT_GLYPHS, type SearchResultType } from '.'

/**
 * Строка выдачи поиска — разбор и таблица «кит | эталон» в `index.ts`. Нажатие по строке — событие `select`; нажатие по
 * переключателю — событие `toggle`, строку оно не выбирает.
 */
const props = withDefaults(defineProps<{
  /** Тип найденного — иконка слева. */
  type?: SearchResultType
  /** Своя иконка вместо иконки типа — у действий. */
  icon?: IconName
  label: string
  /** Запрос: совпавшие фрагменты подписи и пояснения подсвечены. */
  query?: string
  /** Пояснение второй строкой: чем найдено, место. */
  hint?: string
  /** Текущее значение справа: «60 мин», «Стандартная». */
  value?: string
  /** Булева настройка: справа переключатель. */
  toggle?: boolean
  checked?: boolean
  /** Причина недоступности: строка приглушена, причина второй строкой полным контрастом, переключатель выключен. */
  reason?: string
  /** Активная строка: стрелки поля водят по выдаче. */
  active?: boolean
}>(), {
  type: 'setting',
  icon: undefined,
  query: '',
  hint: '',
  value: '',
  toggle: false,
  checked: false,
  reason: '',
  active: false,
})

const emit = defineEmits<{ select: [], toggle: [] }>()

const glyph = computed<IconName>(() => props.icon ?? SEARCH_RESULT_GLYPHS[props.type])
/** Приглушается всё, кроме причины: прецедент `Checkbox reason` (такт 74). */
const dim = computed(() => (props.reason ? 'opacity-[var(--opacity-disabled)]' : ''))
/** Иконка — спека `ListItem` `457:4033`: «icon 0.72» в покое, 1 под наведением и у активной строки. */
const iconClass = computed(() => (props.reason
  ? 'opacity-[var(--opacity-disabled)]'
  : props.active ? 'opacity-100' : 'opacity-[var(--opacity-icon-muted)] group-hover/result:opacity-100'))
</script>

<template>
  <div
    data-slot="search-result"
    role="option"
    :data-type="props.type"
    :data-active="props.active || undefined"
    :data-muted="props.reason ? '' : undefined"
    :aria-selected="props.active"
    :aria-disabled="props.reason ? 'true' : undefined"
    class="group/result flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-4 py-2 text-left"
    :class="props.active ? 'bg-list-selected' : 'hover:bg-list-hover'"
    @click="emit('select')"
  >
    <span
      data-slot="search-result-icon"
      class="flex h-5 w-4 shrink-0 items-center justify-center"
      :class="iconClass"
    >
      <Icon :name="glyph" :size="16" />
    </span>

    <span class="flex min-w-0 flex-1 flex-col">
      <span
        data-slot="search-result-title"
        class="truncate text-sm font-medium"
        :class="[dim, props.active ? 'text-field-foreground-hover' : 'text-field-foreground group-hover/result:text-field-foreground-hover']"
      ><HighlightText :text="props.label" :query="props.query" /></span>
      <span v-if="props.reason" data-slot="search-result-reason" class="truncate text-xs text-muted-foreground">{{ props.reason }}</span>
      <span v-else-if="props.hint" data-slot="search-result-hint" class="truncate text-xs font-medium text-field-placeholder"><HighlightText :text="props.hint" :query="props.query" /></span>
    </span>

    <span v-if="props.value" data-slot="search-result-value" class="max-w-60 shrink-0 truncate text-xs font-medium text-field-placeholder" :class="dim">{{ props.value }}</span>
    <!--
      Переключатель булевой настройки: нажатие переключает и строку не выбирает. У `Switch` без подписи остаётся пустой блок
      подписи с зазором 8 — здесь зазор снят, правый край переключателя стоит на поле 16, как у значения.
    -->
    <span
      v-else-if="props.toggle"
      data-slot="search-result-toggle"
      class="flex shrink-0 items-center [&>[data-slot=choice]]:gap-0"
      @click.stop
    >
      <Switch
        :model-value="props.checked"
        :disabled="!!props.reason"
        :aria-label="`${props.label}: ${props.checked ? 'выключить' : 'включить'}`"
        @update:model-value="emit('toggle')"
      />
    </span>
  </div>
</template>
