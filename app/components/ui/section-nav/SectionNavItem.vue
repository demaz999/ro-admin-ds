<script setup lang="ts">
import type { SectionNavStatus } from '.'
import type { IconName } from '../icon/icons'
import { computed, inject, ref } from 'vue'
import { Icon } from '../icon'
import { SECTION_NAV_KEY } from '.'

/**
 * Раздел навигатора: строка-кнопка со статус-точкой; у активного раздела раскрыт слот с якорями.
 * Разбор — `index.ts`.
 */
const props = withDefaults(defineProps<{
  value: string
  label: string
  /** Статус раздела — единая система индикаторов: `none` — точки нет. */
  status?: SectionNavStatus
  /** Счётчик раздела — такт 86: число совпадений поиска в режиме «найдено»; 0 показывается. Не задан — счётчика нет. */
  count?: number
  /**
   * Значок после подписи — такт 91: признак раздела глифом 14 `--foreground-secondary` (источник «Другие схемы» окна «Новая
   * схема осмотра» — доступ по роли). Смысл — `badgeLabel` для чтения с экрана. Не задан — значка нет.
   */
  badge?: IconName
  badgeLabel?: string
}>(), { status: 'none', count: undefined, badge: undefined, badgeLabel: '' })

const ctx = inject(SECTION_NAV_KEY, { model: ref(''), select: () => {}, fluid: ref(false) })
const active = computed(() => ctx.model.value === props.value)

const STATUS_TEXT: Record<SectionNavStatus, string> = { none: '', on: 'включено', off: 'выключено', attention: 'требует внимания' }
const STATUS_CLASS: Record<SectionNavStatus, string> = { none: '', on: 'bg-success', off: 'bg-foreground-disabled', attention: 'bg-warning' }
</script>

<template>
  <!-- Разделитель — у каждого раздела, кроме первого: линия 1 с полями 18. -->
  <div data-slot="section-nav-section" class="flex flex-col [[data-slot=section-nav-section]+&]:before:mx-4.5 [[data-slot=section-nav-section]+&]:before:mb-1 [[data-slot=section-nav-section]+&]:before:h-px [[data-slot=section-nav-section]+&]:before:bg-stroke-neutral [[data-slot=section-nav-section]+&]:before:content-['']">
    <button
      type="button"
      data-slot="section-nav-item"
      :data-value="props.value"
      :data-status="props.status"
      :aria-current="active ? 'true' : undefined"
      class="flex w-full items-center gap-1.5 rounded-xl px-4 text-left text-sm font-medium outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      :class="[active ? 'text-foreground' : 'text-foreground-secondary', ctx.fluid.value ? 'min-h-9 py-2 @max-section-nav:px-3' : 'h-9']"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      @click="ctx.select(props.value)"
    >
      <span class="min-w-0" :class="ctx.fluid.value ? '' : 'truncate'">{{ props.label }}</span>
      <span v-if="props.badge" data-slot="section-nav-badge" class="inline-flex shrink-0 items-center text-foreground-secondary">
        <Icon :name="props.badge" :size="14" />
        <span v-if="props.badgeLabel" class="sr-only">{{ props.badgeLabel }}</span>
      </span>
      <span v-if="props.status !== 'none'" data-slot="section-nav-status" class="size-1.5 shrink-0 rounded-full" :class="STATUS_CLASS[props.status]">
        <span class="sr-only">{{ STATUS_TEXT[props.status] }}</span>
      </span>
      <!-- Счётчик — у правого края строки; пилюля счётчика вкладки (`TabsTrigger count`) на подложке `--card`: навигатор сам стоит на `--accent`. -->
      <span
        v-if="props.count !== undefined"
        data-slot="section-nav-count"
        class="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-card px-1.5 text-xs font-bold text-foreground-secondary"
      >{{ props.count }}</span>
    </button>
    <div v-if="active && $slots.default" data-slot="section-nav-anchors" class="flex flex-col pl-4" :class="ctx.fluid.value ? '@max-section-nav:pl-3' : ''">
      <slot />
    </div>
  </div>
</template>
