<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'

/**
 * Строка настройки: контрол с названием и пояснением, «?», причина недоступности, счётчик с переходом, вложенные
 * параметры. Разбор — `index.ts`. Такт 89 — слот `help`: «?» с превью в приложении вместо текстового.
 *
 * Пример:
 * `<SettingRow v-slot="{ disabled }" help="…" :reason="причина"><Checkbox v-model="x" :disabled="disabled" subtitle="…">Название</Checkbox></SettingRow>`
 */
const props = withDefaults(defineProps<{
  /** Текст подсказки «?». Пусто — кнопки нет. */
  help?: string
  /** Причина недоступности: контрол получает `disabled`, причина стоит под ним. */
  reason?: string
  /** Счётчик связи с другим табом: «Отмечено N полей на согласование». */
  meta?: string
  /** `warning` — предупреждение при нуле: связь включена, работа в другом табе не сделана. */
  metaTone?: 'default' | 'warning'
  /** Вложенные параметры скрыты — родитель выключен. */
  collapsed?: boolean
  /**
   * Подсветка найденного — такт 65: новое число запускает вспышку строки. Длительность держит компонент
   * (`--duration-flash`), страница только выдаёт число — прецедент `flash` у `StepRow`.
   */
  highlighted?: number | null
  class?: string
}>(), { help: '', reason: '', meta: '', metaTone: 'default', collapsed: false, highlighted: null })

/**
 * Вспышка. Повторная подсветка той же строки перезапускает анимацию: класс снимается и ставится следующим тактом —
 * узел строки при этом прежний, контрол в слоте не пересоздаётся.
 */
const flashing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => props.highlighted, async (value) => {
  if (value == null) return
  clearTimeout(timer)
  flashing.value = false
  await nextTick()
  flashing.value = true
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-flash')) * 1000 || 1500
  timer = setTimeout(() => { flashing.value = false }, ms)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <!-- Поля 8 по бокам с обратным отступом: заливка вспышки шире текста, строка стоит на прежнем месте. -->
  <div
    data-slot="setting-row"
    :data-disabled="props.reason ? '' : undefined"
    :data-flash="flashing || undefined"
    :class="cn(
      '-mx-2 flex min-w-0 flex-col rounded-md px-2',
      flashing ? 'animate-step-flash motion-reduce:animate-none motion-reduce:bg-secondary-hover' : '',
      props.class,
    )"
  >
    <!-- Провайдер подсказок — внутри корня: безрендерный корень съел бы атрибуты страницы (`CLAUDE.md`). -->
    <TooltipProvider>
      <div data-slot="setting-row-main" class="flex min-w-0 items-start gap-2 py-2">
        <div class="flex min-w-0 flex-col">
          <slot :disabled="!!props.reason" />
        </div>
        <!--
          Слот `help` — такт 89: «?» с превью в приложении (`HelpPreview`, поповер по нажатию) на месте текстового «?» — тот
          же зазор 8 и подъём на 2. Со слотом проп `help` не рисуется.
        -->
        <slot v-if="$slots.help" name="help" />
        <Tooltip v-else-if="props.help">
          <TooltipTrigger as-child>
            <!-- Кнопка 24 в строке заголовка 20: поднята на 2, чтобы глиф встал по центру первой строки. -->
            <IconButton data-setting-help variant="ghost" size="sm" rounded label="Пояснение" class="-my-0.5 shrink-0">
              <Icon name="help" :size="16" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent class="max-w-80 whitespace-normal">
            {{ props.help }}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>

    <!--
      Причина и строка счётчика — пояснение кита (такт 98, решение владельца 2026-10-09): через 4 под контролом (поле строки 8
      минус 4), 13/16 regular `--foreground-secondary`. Действие в строке счётчика — на её базовой линии; строка высотой 16
      (кнопка-ссылка 20 выступает на 2 вверх и вниз; поле в строке — выбор роли — стоит от её края, через 4 под контролом), до следующей строки — поле 10 и поле её контрола 8: 18, как прежде.
    -->
    <p v-if="props.reason" data-slot="setting-row-reason" class="-mt-1 pb-2 pl-6 text-xs font-normal text-foreground-secondary">
      {{ props.reason }}
    </p>

    <div v-if="props.meta || $slots.action" data-slot="setting-row-meta" class="-mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2.5 pl-6">
      <span
        v-if="props.meta"
        data-slot="setting-row-meta-text"
        :data-tone="props.metaTone"
        :class="cn('text-xs font-normal', props.metaTone === 'warning' ? 'text-warning-strong' : 'text-foreground-secondary')"
      >{{ props.meta }}</span>
      <span v-if="$slots.action" data-slot="setting-row-action" class="-my-0.5 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 has-[[data-slot=field]]:my-0">
        <slot name="action" />
      </span>
    </div>

    <div v-if="$slots.children && !props.collapsed" data-slot="setting-row-children" class="flex flex-col pl-6">
      <slot name="children" />
    </div>
  </div>
</template>
