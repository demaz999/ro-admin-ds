<script setup lang="ts">
import type { SectionNavStatus } from '.'
import { computed, inject, ref } from 'vue'
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
}>(), { status: 'none' })

const ctx = inject(SECTION_NAV_KEY, { model: ref(''), select: () => {} })
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
      class="flex h-9 w-full items-center gap-1.5 rounded-xl px-4 text-left text-sm font-medium outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      :class="active ? 'text-foreground' : 'text-foreground-secondary'"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      @click="ctx.select(props.value)"
    >
      <span class="min-w-0 truncate">{{ props.label }}</span>
      <span v-if="props.status !== 'none'" data-slot="section-nav-status" class="size-1.5 shrink-0 rounded-full" :class="STATUS_CLASS[props.status]">
        <span class="sr-only">{{ STATUS_TEXT[props.status] }}</span>
      </span>
    </button>
    <div v-if="active && $slots.default" data-slot="section-nav-anchors" class="flex flex-col pl-4">
      <slot />
    </div>
  </div>
</template>
