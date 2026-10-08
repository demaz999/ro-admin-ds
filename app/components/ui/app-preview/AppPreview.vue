<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Icon } from '../icon'

/**
 * Рамка телефона с экраном приложения: корпус, строка состояния, шапка приложения, тело. Разбор и замеры — `index.ts`.
 *
 * Пример:
 * `<AppPreview title="Осмотр КАСКО" size="lg" :scale="1.4"><AppPreviewText variant="heading">Шаг 1</AppPreviewText><template #footer><AppPreviewButton>Продолжить</AppPreviewButton></template></AppPreview>`
 */
const props = withDefaults(defineProps<{
  /** Заголовок шапки приложения. */
  title?: string
  /** Высота корпуса: `md` — 360 (макет `33694:3884`), `lg` — 476 (пропорция 375 × 812, ревью 4.1). */
  size?: 'md' | 'lg'
  /** Масштаб телефона целиком: обёртка занимает корпус × масштаб, разметка внутри — в размерах макета. */
  scale?: number
  /**
   * Фрагмент — тело экрана без строки состояния и шапки в окне 288 во всю ширину контейнера: поповер «?» (макет
   * `33694:3883`: окно 289, телефон `md` с `y = −71` при шапке 31; у кита шапка 32). Масштаб у фрагмента — 1.
   */
  fragment?: boolean
  class?: string
}>(), { title: '', size: 'lg', scale: 1, fragment: false })
</script>

<template>
  <div
    data-slot="app-preview"
    :data-size="props.size"
    :data-fragment="props.fragment || undefined"
    :class="cn(
      'relative shrink-0',
      props.fragment
        ? 'h-[calc(var(--spacing-app-phone-md)-var(--spacing-app-crop))] w-full overflow-hidden'
        : props.size === 'md'
          ? 'h-[calc(var(--spacing-app-phone-md)*var(--app-scale))] w-[calc(var(--container-app-phone)*var(--app-scale))]'
          : 'h-[calc(var(--spacing-app-phone-lg)*var(--app-scale))] w-[calc(var(--container-app-phone)*var(--app-scale))]',
      props.class,
    )"
    :style="{ '--app-scale': String(props.fragment ? 1 : props.scale) }"
  >
    <!-- Корпус: поле 6 вокруг экрана, радиус 24; внутри — разметка в размерах макета, масштаб — от левого верхнего угла. -->
    <div
      data-slot="app-preview-device"
      :class="[
        'absolute flex w-app-phone flex-col rounded-2xl bg-app-device p-1.5',
        props.size === 'md' || props.fragment ? 'h-app-phone-md' : 'h-app-phone-lg',
        props.fragment ? 'top-[calc(var(--spacing-app-crop)*-1)] left-1/2 -translate-x-1/2' : 'top-0 left-0 origin-top-left scale-(--app-scale)',
      ]"
    >
      <!-- Экран: радиус 18 — концентрический к корпусу (24 − 6). -->
      <div data-slot="app-preview-screen" class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(var(--radius-2xl)-var(--spacing)*1.5)] bg-app-screen">
        <div data-slot="app-preview-status" class="flex h-6 shrink-0 items-center bg-app-surface px-3 text-3xs font-bold text-app-foreground">
          9:41
        </div>
        <div data-slot="app-preview-bar" class="flex shrink-0 items-center gap-2 bg-app-surface px-3 py-2 text-app-foreground">
          <Icon name="chevron-left" :size="14" />
          <span data-slot="app-preview-title" class="min-w-0 flex-1 truncate text-center text-2xs font-bold">{{ props.title }}</span>
          <Icon name="more" :size="14" />
        </div>
        <!-- Тело: поля 10, зазор 10; длинный экран прокручивается без полосы — у приложения своя. -->
        <div data-slot="app-preview-body" class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 [scrollbar-width:none]">
          <slot />
          <div v-if="$slots.footer" data-slot="app-preview-footer" class="mt-auto flex shrink-0 flex-col gap-1.5">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
