<script setup lang="ts">
import { ListboxContent, ListboxRoot } from 'reka-ui'
import { TooltipProvider } from '../tooltip'
import { cn } from '@/lib/utils'

/**
 * Список пунктов назначения — поведенческий слой: примитив `Listbox` Reka. Стрелки
 * ходят по пунктам и пропускают выключенные, Enter выбирает, поиск по первым буквам.
 * Вида своего не несёт: в поповере его обрамляет плашка `SelectContent`, в просмотре —
 * тело `StageSection`. Разбор — в `index.ts`.
 *
 * Значение списка не хранится: пункт сообщает выбор событием, привязку делает страница.
 *
 * Провайдер подсказок — внутри корня списка (ловушка безрендерного корня): причину выключенного пункта
 * `AssignOption` показывает подсказкой (такт 55).
 */
const props = defineProps<{ class?: string }>()
</script>

<template>
  <ListboxRoot highlight-on-hover class="outline-none">
    <ListboxContent data-slot="assign-list" :class="cn('group/assign flex flex-col outline-none', props.class)">
      <TooltipProvider>
        <slot />
      </TooltipProvider>
    </ListboxContent>
  </ListboxRoot>
</template>
