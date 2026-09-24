<script setup lang="ts">
import { nextTick, onMounted, ref, useId, watch } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Группа полей формы — окно формы повтора VA-9265 (§14.3), такт 36. Имя — каноническое у
 * shadcn-vue (семейство `Field`). Разбор — `docs/free-shoot.md`, раздел 14.3.
 *
 * | часть | кит | прототип |
 * |---|---|---|
 * | заголовок группы | 12/16 medium `--muted-foreground`, строчными — роль заголовка группы `RepeatForm`, такт 32 | `.fgrp` 11 700 прописными `#8A9AAB`; прописных в ките нет |
 * | заголовок → первая строка | 8 | 8 |
 * | между строками | 8 — кит 1 «внутри блока» `19942:192432` | 10 |
 * | между группами | 24 — «зазор блоков» карточки `817:34525`: 12, линия 1px `--border-soft`, 12 | 14 + линия `#EEF2F7` + 12 |
 *
 * Группа — `role="group"` с подписью `aria-labelledby`. Элемент `<fieldset>` не взят: его рамка
 * рисуется сквозь `<legend>`, а линия между группами здесь — верхняя граница.
 *
 * `autofocus` — открытие окна сразу на группе (§14.3): при монтировании и при включении
 * прокручивает прокручиваемого предка (тело окна) к группе и ставит фокус на первый контрол.
 * Какую группу открыть, решает страница. Ловушка фокуса Reka этот фокус не перебивает: она
 * ставит свой, только если фокус ещё не внутри окна (`FocusScope`).
 */
const props = withDefaults(defineProps<{
  /** Заголовок группы. Без него — группа без подписи (этап «Здание / цех»). */
  legend?: string
  /** Прокрутить к группе и поставить фокус на её первый контрол. */
  autofocus?: boolean
  class?: string
}>(), {
  legend: '',
  autofocus: false,
})

const id = useId()
const root = ref<HTMLElement | null>(null)

const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function focusFirst() {
  await nextTick()
  const el = root.value
  if (!el) return
  el.scrollIntoView({ block: 'start' })
  el.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
}

onMounted(() => {
  if (props.autofocus) focusFirst()
})
watch(() => props.autofocus, (on) => {
  if (on) focusFirst()
})
</script>

<template>
  <div
    ref="root"
    data-slot="field-set"
    role="group"
    :aria-labelledby="props.legend ? id : undefined"
    :class="cn('flex flex-col gap-2 not-first:mt-3 not-first:border-t not-first:border-border-soft not-first:pt-3', props.class)"
  >
    <div v-if="props.legend" :id="id" data-slot="field-set-legend" class="text-2xs font-medium text-muted-foreground">
      {{ props.legend }}
    </div>
    <slot />
  </div>
</template>
