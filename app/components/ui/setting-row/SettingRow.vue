<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'

/**
 * Строка настройки: контрол с названием и пояснением, «?», причина недоступности, счётчик с переходом, вложенные
 * параметры. Разбор — `index.ts`.
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
  class?: string
}>(), { help: '', reason: '', meta: '', metaTone: 'default', collapsed: false })
</script>

<template>
  <div data-slot="setting-row" :data-disabled="props.reason ? '' : undefined" :class="cn('flex min-w-0 flex-col', props.class)">
    <!-- Провайдер подсказок — внутри корня: безрендерный корень съел бы атрибуты страницы (`CLAUDE.md`). -->
    <TooltipProvider>
      <div data-slot="setting-row-main" class="flex min-w-0 items-start gap-2 py-2">
        <div class="min-w-0">
          <slot :disabled="!!props.reason" />
        </div>
        <Tooltip v-if="props.help">
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

    <p v-if="props.reason" data-slot="setting-row-reason" class="-mt-1 pb-2 pl-6 text-xs text-muted-foreground">
      {{ props.reason }}
    </p>

    <div v-if="props.meta || $slots.action" data-slot="setting-row-meta" class="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 pl-6">
      <span
        v-if="props.meta"
        data-slot="setting-row-meta-text"
        :data-tone="props.metaTone"
        :class="cn('text-xs', props.metaTone === 'warning' ? 'text-warning-strong' : 'text-muted-foreground')"
      >{{ props.meta }}</span>
      <slot name="action" />
    </div>

    <div v-if="$slots.children && !props.collapsed" data-slot="setting-row-children" class="flex flex-col pl-6">
      <slot name="children" />
    </div>
  </div>
</template>
