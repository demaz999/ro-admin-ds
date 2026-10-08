<script setup lang="ts">
import { ButtonAction } from '../button-action'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

/**
 * «?» с превью — поповер по нажатию: фрагмент экрана приложения с обведённым элементом, название, пояснение, текущее
 * значение и переход «Открыть в демо-осмотре». Разбор и замеры — `index.ts`.
 *
 * Пример:
 * `<HelpPreview title="Отказ от осмотра" description="…" value="Сейчас: разрешён" @action="openDemo"><AppPreviewScreen fragment … /></HelpPreview>`
 */
const props = withDefaults(defineProps<{
  title: string
  description?: string
  /** Текущее значение настройки — строкой под пояснением. */
  value?: string
  /** Подпись перехода; пусто — перехода нет. */
  actionLabel?: string
  /** Имя кнопки «?» для чтения с экрана. */
  label?: string
}>(), { description: '', value: '', actionLabel: 'Открыть в демо-осмотре', label: 'Где это в приложении' })

const emit = defineEmits<{ action: [] }>()
const open = defineModel<boolean>('open', { default: false })

function act() {
  open.value = false
  emit('action')
}
</script>

<template>
  <!-- Корень — элемент: корень-провайдер (`Popover`) увёл бы атрибуты страницы мимо узла (`CLAUDE.md`, безрендерный корень). -->
  <span data-slot="help-preview-anchor" class="flex shrink-0">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <!-- Кнопка 24 в строке 20: поднята на 2 — глиф по центру первой строки (как «?» `SettingRow`). -->
        <IconButton data-help-preview variant="secondary" size="sm" rounded :label="props.label" class="-my-0.5 shrink-0">
          <Icon name="help" :size="16" />
        </IconButton>
      </PopoverTrigger>
      <!--
        Плашка 310, поля 16, зазор 24 — макет `tooltip-card` `33694:3882`. Справа от «?»: плашка выше половины окна — сбоку её
        сдвиг идёт по вертикали и она помещается в окно целиком; снизу или сверху от «?» в середине окна она не помещалась бы.
      -->
      <PopoverContent :width="310" side="right" align="start" :side-offset="8" class="p-4">
        <div data-slot="help-preview" class="flex flex-col gap-6">
          <div v-if="$slots.default" data-slot="help-preview-media" class="flex">
            <slot />
          </div>
          <div class="flex flex-col gap-3">
            <!-- Название и пояснение — `33694:3925`: 15/20 bold и 12/16 regular через 6. -->
            <div class="flex flex-col gap-1.5">
              <p data-slot="help-preview-title" class="m-0 text-sm font-bold text-foreground">
                {{ props.title }}
              </p>
              <p v-if="props.description" data-slot="help-preview-description" class="m-0 text-2xs text-foreground-secondary">
                {{ props.description }}
              </p>
              <p v-if="props.value" data-slot="help-preview-value" class="m-0 text-2xs font-medium text-foreground">
                {{ props.value }}
              </p>
            </div>
            <div v-if="props.actionLabel" class="flex">
              <!-- `ButtonAction` несёт `data-slot="button"`: метка части — своим атрибутом (ловушка такта 62). -->
              <ButtonAction size="sm" :show-icon="false" data-help-action @click="act()">
                {{ props.actionLabel }}
              </ButtonAction>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </span>
</template>
