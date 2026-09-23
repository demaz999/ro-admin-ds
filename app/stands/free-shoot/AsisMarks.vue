<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Оснастка приёмки `?asis=mark` — не продукт. Подписывает перенесённые «как есть» блоки
 * экрана `/free-shoot` именем из `data-asis`; пунктир рисует `asis.css` (`.asis-mark`).
 *
 * Подпись выносится **над** верхним краем блока, над пунктиром, — содержимое блока она не
 * перекрывает. У блока, прижатого к верху окна, над краем места нет: подпись встаёт внутрь,
 * в правый верхний угол. Довесок к такту 31, решение владельца.
 *
 * Подписи лежат отдельным слоем `position: fixed` поверх экрана и считаются по
 * `getBoundingClientRect`: вставка подписи внутрь блока сдвинула бы раскладку, а часть
 * блоков прототипа сама позиционирована (`fixed`, `sticky`), и `::before` уехал бы.
 * Видны только подписи блоков в пределах окна. Старт — тактом позже монтирования, как у
 * автопроверок `/compare`: окна оснастки появляются после `onMounted`.
 */
interface Mark { name: string; key: string; style: Record<string, string> }
/** Высота подписи: `text-3xs` 10/12. */
const LABEL_H = 12
const marks = ref<Mark[]>([])

function measure() {
  const seen = new Set<string>()
  const out: Mark[] = []
  for (const el of document.querySelectorAll<HTMLElement>('[data-asis]')) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue
    const x = Math.max(0, Math.round(r.left))
    const y = Math.max(0, Math.round(r.top))
    const key = `${x}:${y}`
    if (seen.has(key)) continue
    seen.add(key)
    const name = el.dataset.asis ?? ''
    const style = y >= LABEL_H
      ? { left: `${x}px`, top: `${y}px`, transform: 'translateY(-100%)' }
      : { right: `${Math.max(0, Math.round(innerWidth - r.right))}px`, top: `${y}px` }
    out.push({ name, key: `${key}:${name}`, style })
  }
  marks.value = out
}

let timer: ReturnType<typeof setTimeout> | undefined
function schedule() {
  clearTimeout(timer)
  timer = setTimeout(measure, 120)
}

onMounted(async () => {
  await nextTick()
  schedule()
  addEventListener('scroll', schedule, true)
  addEventListener('resize', schedule)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  removeEventListener('scroll', schedule, true)
  removeEventListener('resize', schedule)
})
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[200]" aria-hidden="true">
    <span
      v-for="m in marks"
      :key="m.key"
      class="absolute rounded-t-xs bg-destructive px-1 font-sans text-3xs text-primary-foreground"
      :style="m.style"
    >{{ m.name }}</span>
  </div>
</template>
