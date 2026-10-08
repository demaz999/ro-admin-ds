<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'

/**
 * Рамка браузера — такт 90, часть семейства превью такта 89 (карточка 13 `docs/scheme-edit.md`, раздел 8; ворота открыты
 * заранее решением 6 оркестратора 2026-10-08). Страница сайта в рамке: окно браузера компьютера либо телефон с мобильным
 * браузером, в адресной строке — адрес страницы. Тело прокручивается и несёт `@container`: страница внутри раскладывается по
 * ширине рамки. Разбор — `index.ts`, «Рамка браузера».
 *
 * Пример: `<AppPreviewBrowser device="phone" url="example.com/scenarios/osmotr" class="h-160"><ScenarioPreview :page /></AppPreviewBrowser>`
 */
const props = withDefaults(defineProps<{
  /** Адрес в адресной строке — без протокола. */
  url?: string
  /** `desktop` — окно браузера компьютера до 1280; `phone` — телефон с экраном 375. */
  device?: 'desktop' | 'phone'
  /** Подпись тела для чтения с экрана. */
  label?: string
  class?: string
}>(), { url: '', device: 'desktop', label: 'Страница в браузере', class: undefined })
</script>

<template>
  <!-- Телефон: корпус `--app-device` с полем 6 и радиусом 32, экран 375 — радиус 26, концентрический (32 − 6). -->
  <div
    v-if="props.device === 'phone'"
    data-slot="app-preview-browser"
    data-device="phone"
    :class="cn('flex w-fit shrink-0 flex-col rounded-3xl bg-app-device p-1.5', props.class)"
  >
    <div data-slot="app-preview-browser-screen" class="flex min-h-0 w-browser-phone flex-1 flex-col overflow-hidden rounded-[calc(var(--radius-3xl)-var(--spacing)*1.5)] bg-app-surface">
      <div data-slot="app-preview-status" class="flex h-6 shrink-0 items-center bg-app-screen px-5 text-3xs font-bold text-app-foreground">
        9:41
      </div>
      <div data-slot="app-preview-browser-bar" class="flex shrink-0 items-center bg-app-screen px-3 pb-2">
        <span class="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-app-surface px-3 text-2xs text-app-foreground-secondary">
          <Icon name="lock" :size="12" />
          <span data-slot="app-preview-browser-url" class="min-w-0 truncate">{{ props.url }}</span>
        </span>
      </div>
      <div
        data-slot="app-preview-browser-body"
        role="region"
        :aria-label="props.label"
        tabindex="0"
        class="@container min-h-0 flex-1 overflow-y-auto outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <slot />
      </div>
    </div>
  </div>
  <!-- Компьютер: окно до 1280 с рамкой 1 `--app-track`, радиус 12; полоса 40 — три точки и адресная строка. -->
  <div
    v-else
    data-slot="app-preview-browser"
    data-device="desktop"
    :class="cn('flex w-full max-w-browser-desktop min-w-0 flex-col overflow-hidden rounded-lg border border-app-track bg-app-surface', props.class)"
  >
    <div data-slot="app-preview-browser-bar" class="flex h-10 shrink-0 items-center gap-4 border-b border-app-track bg-app-screen px-4">
      <span class="flex shrink-0 gap-1.5" aria-hidden="true">
        <span class="size-2.5 rounded-full bg-app-track" />
        <span class="size-2.5 rounded-full bg-app-track" />
        <span class="size-2.5 rounded-full bg-app-track" />
      </span>
      <span class="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-app-surface px-3 text-2xs text-app-foreground-secondary">
        <Icon name="lock" :size="12" />
        <span data-slot="app-preview-browser-url" class="min-w-0 truncate">{{ props.url }}</span>
      </span>
    </div>
    <div
      data-slot="app-preview-browser-body"
      role="region"
      :aria-label="props.label"
      tabindex="0"
      class="@container min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <slot />
    </div>
  </div>
</template>
