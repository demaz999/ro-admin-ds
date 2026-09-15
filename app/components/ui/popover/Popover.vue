<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Всплывающая плашка — мастер `Popover` `405:3786`, спека `1925:12127`.
 *
 * В мастере это **пустой контейнер**: 320×192, радиус 12, фон белый, тень
 * `0 / 8 / 32` при 12%, паддинга нет, рамки нет. Ни одного потомка внутри —
 * начинку кладёт тот, кто применяет.
 *
 * Та же плашка лежит в основе выпадающего списка (`PopOverList` `571:4889`),
 * но там она обрастает паддингом 4, поиском и списком. Поэтому `SelectContent`
 * — не частный случай этого компонента, а отдельный узел мастера со своей
 * геометрией; общего у них только фон, радиус и тень.
 *
 * Высота 192 из мастера — это размер демонстрационного узла, а не ограничение:
 * оси размера в мастере нет, начинка задаёт высоту сама.
 *
 * Правило порталов сайдбара действует и здесь: плашка светлая даже когда
 * вылетает из тёмного меню.
 *
 * ## Закрывается кликом снаружи и по Esc — такт 21
 *
 * Решение владельца. До такта 21 закрытия не было ни у одного потребителя: «ещё» и
 * режимы выбора на «Моих осмотрах», кебаб строки, размер страницы в подвале, значения
 * фильтр-чипа оставались открытыми. Это **не** ловушка булевых пропов Reka: компонент
 * на Reka не собран, логики закрытия в нём не было вовсе.
 *
 * Управление — `v-model:open`. Плашка не решает сама, открыта ли она: снаружи и по
 * Esc она просит закрыться событием `update:open`, видимость держит потребитель. Без
 * `open` плашка статична и видна всегда — так её показывает витрина.
 *
 * **Клик по триггеру снаружи не считается.** Кнопка-триггер живёт в родителе плашки
 * (якорь с `relative`). Если бы нажатие на неё закрывало плашку, тот же клик тут же
 * открывал бы её заново — триггер переключает сам.
 *
 * Слушатели висят на документе только пока плашка открыта: у статичной и у закрытой
 * их нет.
 */
const props = withDefaults(defineProps<{
  /** Ширина из мастера. */
  width?: number
  /** Открыта ли плашка. Не задан — плашка статична и видна всегда. */
  open?: boolean
}>(), { width: 320, open: undefined })

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const el = ref<HTMLElement | null>(null)

function onPointerDown(event: PointerEvent) {
  const root = el.value
  if (!root) return
  const path = event.composedPath()
  const anchor = root.parentElement
  if (path.includes(root) || (anchor && path.includes(anchor))) return
  emit('update:open', false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('update:open', false)
}

function listen(on: boolean) {
  if (typeof document === 'undefined') return
  if (on) {
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeydown)
  }
  else {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeydown)
  }
}

watch(() => props.open === true, (on, _prev, onCleanup) => {
  listen(on)
  onCleanup(() => listen(false))
}, { immediate: true })

onBeforeUnmount(() => listen(false))
</script>

<template>
  <div
    v-if="props.open !== false"
    ref="el"
    data-slot="popover"
    class="rounded-lg bg-popover shadow-dropdown"
    :style="{ width: `${width}px` }"
  >
    <slot />
  </div>
</template>
