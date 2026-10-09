<script setup lang="ts">
import { computed, provide } from 'vue'
import { cn } from '@/lib/utils'
import { SECTION_NAV_KEY } from '.'

/**
 * Навигатор разделов: заголовок и список разделов; у активного раскрыты якоря. Разбор — `index.ts`.
 *
 * Пример:
 * `<SectionNav v-model="section" title="Настройки"><SectionNavItem value="general" label="Общие"><SectionNavAnchor label="Основное" active /></SectionNavItem></SectionNav>`
 */
const props = defineProps<{
  title?: string
  /**
   * Ширина от раскладки — такт 104: навигатор тянется от `--container-section-nav-min` до 266 (основа 266, сжимается вместе с
   * колонкой), подписи переносятся по словам, уже 266 — поля строк 12 вместо 16. Без пропа — прежние 266 и многоточие.
   */
  fluid?: boolean
  class?: string
}>()

const model = defineModel<string>({ default: '' })
provide(SECTION_NAV_KEY, { model, select: (value: string) => { model.value = value }, fluid: computed(() => props.fluid) })

/** Стрелки переводят фокус между строками разделов; якоря — обычным Tab. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const root = event.currentTarget as HTMLElement
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-slot=section-nav-item]'))
  const k = items.indexOf(document.activeElement as HTMLElement)
  if (k < 0) return
  event.preventDefault()
  items[(k + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
}
</script>

<template>
  <nav
    data-slot="section-nav"
    :aria-label="props.title"
    :data-fluid="props.fluid || undefined"
    :class="cn('flex flex-col gap-1 rounded-xl bg-accent p-0.5', props.fluid ? '@container min-w-section-nav-min shrink grow-0 basis-section-nav' : 'w-section-nav shrink-0', props.class)"
    @keydown="onKeydown"
  >
    <p v-if="props.title" data-slot="section-nav-title" class="px-4 pt-2 pb-0.5 text-lg font-bold text-foreground" :class="props.fluid ? '@max-section-nav:px-3' : ''">
      {{ props.title }}
    </p>
    <slot />
  </nav>
</template>
