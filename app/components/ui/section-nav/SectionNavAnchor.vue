<script setup lang="ts">
/**
 * Якорь подраздела в навигаторе: у активного — линия 2 слева цветом `--primary`. Разбор — `index.ts`.
 * Переход — событие `select`; прокрутку к месту делает страница.
 * Такт 89 — проп `description`: вторая строка 12/16 под подписью (пробелы экрана в оглавлении демо-осмотра), тон `warning` —
 * `--warning-strong`.
 */
const props = withDefaults(defineProps<{
  label: string
  active?: boolean
  /** Вторая строка под подписью: «нет фото-подсказки · нет описания». */
  description?: string
  /** Тон второй строки: `warning` — пробел, `--warning-strong`; иначе `--muted-foreground`. */
  tone?: 'default' | 'warning'
}>(), { active: false, description: '', tone: 'default' })

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    data-slot="section-nav-anchor"
    :aria-current="props.active ? 'location' : undefined"
    :class="[
      'flex min-h-9 w-full flex-col justify-center border-l-2 px-4 text-left text-sm font-medium outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
      props.active ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary',
      props.description ? 'py-2' : '',
    ]"
    :style="{ transitionDuration: 'var(--duration-hover)' }"
    @click="emit('select')"
  >
    <span class="w-full min-w-0 truncate">{{ props.label }}</span>
    <span
      v-if="props.description"
      data-slot="section-nav-anchor-description"
      :data-tone="props.tone"
      :class="['w-full text-2xs font-normal', props.tone === 'warning' ? 'text-warning-strong' : 'text-muted-foreground']"
    >{{ props.description }}</span>
  </button>
</template>
