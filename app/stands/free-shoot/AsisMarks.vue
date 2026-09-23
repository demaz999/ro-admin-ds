<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Оснастка приёмки `?asis=mark` — не продукт. Подписывает перенесённые «как есть» блоки
 * экрана `/free-shoot` именем из `data-asis`; пунктир рисует `asis.css` (`.asis-mark`).
 *
 * Подписи лежат отдельным слоем `position: fixed` поверх экрана и считаются по
 * `getBoundingClientRect`: вставка подписи внутрь блока сдвинула бы раскладку, а часть
 * блоков прототипа сама позиционирована (`fixed`, `sticky`), и `::before` уехал бы.
 * Видны только подписи блоков в пределах окна. Старт — тактом позже монтирования, как у
 * автопроверок `/compare`: окна оснастки появляются после `onMounted`.
 */
interface Mark { name: string; x: number; y: number }
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
    out.push({ name: el.dataset.asis ?? '', x, y })
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
      :key="`${m.x}:${m.y}:${m.name}`"
      class="absolute rounded-br-xs bg-destructive px-1 font-sans text-3xs text-primary-foreground"
      :style="{ left: `${m.x}px`, top: `${m.y}px` }"
    >{{ m.name }}</span>
  </div>
</template>
