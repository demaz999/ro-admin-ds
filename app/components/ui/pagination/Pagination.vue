<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'

/**
 * Пагинация — **два источника, и такт 11 выбрал кит 1**.
 *
 * | | Атом `Pagination` `4104:36392` | кит 1 `pagination` `741:4979` |
 * |---|---|---|
 * | номера | инстанс `Tabs` внутри мастера | собственные ячейки `page_number` |
 * | ячейка | по содержимому | **44×44**, радиус 8 |
 * | подпись | 15/20 Medium | 15/20 **Bold** |
 * | стрелки | голый шеврон 6×16 | **плашка** `btn_secondary` 44×44, радиус 8 |
 * | многоточие | нет вовсе | **есть**: вариант `type=large` даёт `1 2 3 … 100` |
 *
 * Расхождение было заведено вопросом 33 `docs/open-questions.md` и закрыто
 * решением владельца от 2026-08-19: подвал собран по ноде кита 1, значит и
 * пагинация в нём идёт по киту 1.
 *
 * ## Форма ячейки — сознательное отклонение
 *
 * Мастер даёт радиус **8** — скруглённый прямоугольник. У нас ячейка круглая
 * (`rounded-full` на квадрате 44). Решение владельца: круг допустим, эллипс —
 * нет. Эллипс и получался раньше: `rounded-full` стоял на ячейке **плавающей
 * ширины** (37×40 у «1», 41×40 у «3»), то есть форма менялась от числа знаков.
 * Фиксированный квадрат 44 с мастера превращает ту же запись в честный круг.
 * Запись — `docs/figma-fixes.md`, «Сознательные отклонения».
 *
 * ## Окно номеров и многоточие
 *
 * Мастер показывает хвостовое многоточие: `1 2 3 … 100`. Головное (`1 … 48 49
 * 50`) он не рисует — оно добавлено **решением сборки по симметрии**: без него
 * со страницы 50 из 100 нельзя вернуться к первой, а такого экрана мастер
 * просто не демонстрирует.
 */
const props = withDefaults(defineProps<{
  page?: number
  pages?: number
  /** Сколько номеров показывать вокруг текущего. В подвале макета их три. */
  window?: number
}>(), {
  page: 1,
  pages: 7,
  window: 3,
})

const emit = defineEmits<{ 'update:page': [value: number] }>()

/**
 * Ряд номеров: окно вокруг текущей страницы плюс края с многоточиями.
 * `null` в списке — ячейка «…», она не кликается.
 */
const items = computed<(number | null)[]>(() => {
  const total = props.pages
  const size = Math.min(props.window, total)
  let start = Math.max(1, props.page - Math.floor(size / 2))
  if (start + size - 1 > total) start = total - size + 1

  const out: (number | null)[] = []
  // Головной край: первая страница и разрыв до окна.
  if (start > 1) {
    out.push(1)
    if (start > 2) out.push(null)
  }
  for (let i = 0; i < size; i++) {
    const n = start + i
    if (n >= 1 && n <= total && !out.includes(n)) out.push(n)
  }
  // Хвостовой край — ровно то, что показывает вариант `type=large` мастера.
  const last = out[out.length - 1]
  if (typeof last === 'number' && last < total) {
    if (last < total - 1) out.push(null)
    out.push(total)
  }
  return out
})

function go(next: number) {
  if (next >= 1 && next <= props.pages) emit('update:page', next)
}
</script>

<template>
  <nav data-slot="pagination" class="flex items-center gap-2" aria-label="Страницы">
    <!--
      Стрелка — плашка `btn_secondary` 44×44 с мастера: включённая на
      `accent/surface_soft`, выключенная на `accent/surface_disabled`.
      Форма круглая по тому же решению, что и у номеров.
    -->
    <button
      data-slot="pagination-prev"
      type="button"
      class="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none transition-colors hover:bg-secondary-hover disabled:pointer-events-none disabled:bg-secondary-disabled disabled:text-foreground-secondary-disabled"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      :disabled="props.page <= 1"
      aria-label="Предыдущая страница"
      @click="go(props.page - 1)"
    >
      <Icon name="chevron-left" :size="16" />
    </button>

    <!-- Зазор между номерами 11 — с мастера, снаружи ряда 8. -->
    <div class="flex items-center gap-2.75">
      <template v-for="(item, i) in items" :key="item === null ? `gap-${i}` : item">
        <!-- Многоточие — такая же ячейка 44×44, но не кнопка: нажимать нечего. -->
        <span
          v-if="item === null"
          data-slot="pagination-ellipsis"
          class="flex size-11 shrink-0 items-center justify-center text-sm font-bold text-foreground"
          aria-hidden="true"
        >…</span>

        <button
          v-else
          data-slot="pagination-page"
          type="button"
          class="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold outline-none transition-colors"
          :class="item === props.page
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-secondary'"
          :aria-current="item === props.page ? 'page' : undefined"
          :style="{ transitionDuration: 'var(--duration-hover)' }"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>
    </div>

    <button
      data-slot="pagination-next"
      type="button"
      class="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none transition-colors hover:bg-secondary-hover disabled:pointer-events-none disabled:bg-secondary-disabled disabled:text-foreground-secondary-disabled"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      :disabled="props.page >= props.pages"
      aria-label="Следующая страница"
      @click="go(props.page + 1)"
    >
      <Icon name="chevron-right" :size="16" />
    </button>
  </nav>
</template>
