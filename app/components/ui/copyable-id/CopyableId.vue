<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '../icon'
import { IconButton } from '../icon-button'
import { cn } from '@/lib/utils'

/**
 * Значение-идентификатор со службой копирования.
 *
 * Системное правило владельца, такт 11: **любой идентификатор** — ID осмотра,
 * номер оферты, номер договора — всегда идёт со сервисной кнопкой копирования.
 * Не «где вспомнили», а всегда: идентификатор существует затем, чтобы его
 * передали дальше, и переписывание его глазами — это дефект интерфейса.
 *
 * Мастера у связки нет. Обе части уже приняты по отдельности: сервисная
 * кнопка — `IconButton variant="service"` (такт 7, `btn_service` кита 1),
 * глиф `copy` 16 — тот же, что стоял у ID в карточке осмотра с волны 8.
 * Здесь они сведены в одну сущность, чтобы кнопка не рассыпалась по страницам
 * копипастом: разбор — `docs/naming.md`, «Идентификатор со службой копирования».
 *
 * ## Что копируется
 *
 * По умолчанию — **отрисованный текст**, а не подпись. У ID в карточке это
 * «ID 186 243», но копировать осмысленно только число: подпись `label`
 * отделяется от значения `value`, и в буфер уходит значение.
 */
const props = withDefaults(defineProps<{
  /** Подпись перед значением: «ID», «Номер оферты». Необязательна. */
  label?: string
  /** Само значение. Именно оно уходит в буфер. */
  value: string | number
  /** Класс снаружи — слиянием: кегль и цвет задаёт ячейка или карточка. */
  class?: string
}>(), {
  label: undefined,
  class: undefined,
})

const copied = ref(false)

const text = computed(() => String(props.value))

async function copy() {
  try {
    await navigator.clipboard?.writeText(text.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  }
  catch {
    // Буфер недоступен (нет разрешения, небезопасный контекст) — молча.
  }
}
</script>

<template>
  <span
    data-slot="copyable-id"
    :class="cn('inline-flex items-center gap-1 whitespace-nowrap', props.class)"
  >
    <!--
      Подпись и значение — два узла, а не одна строка с пробелом: пробел в конце
      `{{ }}` компилятор Vue схлопывает, и «ID 186 243» слипается в «ID186 243».
      Зазор берётся раскладкой, как и до кнопки.
    -->
    <span v-if="props.label" data-slot="copyable-id-label">{{ props.label }}</span>
    <span data-slot="copyable-id-value">{{ text }}</span>

    <IconButton
      variant="service"
      size="sm"
      :label="copied ? 'Скопировано' : `Скопировать ${text}`"
      @click="copy"
    >
      <!-- Отметка о копировании — тем же глифом-галочкой, что у контролов выбора. -->
      <Icon :name="copied ? 'check' : 'copy'" :size="16" />
    </IconButton>
  </span>
</template>
