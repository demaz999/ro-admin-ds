<script setup lang="ts">
import { cn } from '@/lib/utils'
import KbdText from './KbdText.vue'

/**
 * Список сочетаний — окно «Горячие клавиши» экрана VA-9265 (§16), такт 35. Прототип `#btnHelp`:
 * сетка `auto 1fr`, зазор 9/16, 13.5. Кит: та же сетка, зазор 8/16 (шкала 4), 15/20 —
 * текст тела окна-карточки кита 1 («Настройка таблицы», описание Regular 15/20).
 */
const props = defineProps<{
  /** `keys` и `action` — текст с клавишами в квадратных скобках: `[Shift] + клик`. */
  items: { keys: string, action: string }[]
  class?: string
}>()
</script>

<template>
  <dl data-slot="shortcut-list" :class="cn('m-0 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm text-foreground', props.class)">
    <template v-for="item in props.items" :key="item.keys">
      <dt class="whitespace-nowrap">
        <KbdText :text="item.keys" />
      </dt>
      <dd class="m-0 text-foreground-secondary">
        <KbdText :text="item.action" />
      </dd>
    </template>
  </dl>
</template>
