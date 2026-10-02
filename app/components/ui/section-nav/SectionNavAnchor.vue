<script setup lang="ts">
/**
 * Якорь подраздела в навигаторе: у активного — линия 2 слева цветом `--primary`. Разбор — `index.ts`.
 * Переход — событие `select`; прокрутку к месту делает страница.
 */
const props = withDefaults(defineProps<{
  label: string
  active?: boolean
}>(), { active: false })

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    data-slot="section-nav-anchor"
    :aria-current="props.active ? 'location' : undefined"
    class="flex h-9 w-full items-center border-l-2 px-4 text-left text-sm font-medium outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    :class="props.active ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary'"
    :style="{ transitionDuration: 'var(--duration-hover)' }"
    @click="emit('select')"
  >
    <span class="min-w-0 truncate">{{ props.label }}</span>
  </button>
</template>
