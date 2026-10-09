<script setup lang="ts">
import type { PopoverContentEmits, PopoverContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

/**
 * Тело плашки — такт 28, разбор целиком в `index.ts`.
 *
 * В мастере это **пустой контейнер**: 320×192, радиус 12, фон белый, тень
 * `0 / 8 / 32` при 12%, паддинга нет, рамки нет. Ни одного потомка внутри —
 * начинку кладёт тот, кто применяет. Высота 192 из мастера — это размер
 * демонстрационного узла, а не ограничение: оси размера в мастере нет.
 *
 * Правило порталов сайдбара действует и здесь: плашка светлая даже когда
 * вылетает из тёмного меню.
 *
 * `side`/`align`/`sideOffset` подобраны под каждого потребителя так, чтобы
 * положение плашки не изменилось при переходе с ручного `absolute` на Reka —
 * замеры до/после в `docs/page-*.md`, разбор — `docs/naming.md`. Коллизии с
 * краями окна Reka снимает сама (`avoidCollisions` включён по умолчанию:
 * `flip` переворачивает сторону у нижнего/верхнего края, `shift` сдвигает
 * плашку у бокового).
 */
/**
 * Обязательно: корень шаблона — развилка `v-if`/`v-else` (статичный блок либо
 * `PopoverPortal`, рисующий `Teleport`), Vue не умеет молча докладывать в такой
 * корень «лишние» атрибуты потребителя (`data-menu`, `data-slot` из вызова) и
 * предупреждает об этом в консоль. Разбор — `DialogContent.vue`, та же ловушка.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<PopoverContentProps & {
  /** Ширина из мастера. */
  width?: number
  /** Класс снаружи — слиянием, для паддинга и служебных data-атрибутов начинки. */
  class?: string
  /**
   * Без портала и без плавающего позиционирования — статичный блок в потоке.
   * Нужно витрине: показать пустой мастер-контейнер без триггера и без анкора,
   * которым не от чего вычислять положение. В продукте не используется.
   */
  inline?: boolean
  /**
   * Узкий экран (уже 768) — такт 92: `keep` (по умолчанию) — ширина `width`; `full` — плашка во всю ширину окна и во всю
   * доступную высоту от поля до края окна, без скругления (выдача поиска страницы схемы на телефоне); рабочий стол прежний.
   */
  narrow?: 'keep' | 'full'
}>(), {
  width: 320,
  side: 'bottom',
  sideOffset: 8,
  align: 'start',
  alignOffset: 0,
  class: undefined,
  inline: false,
  narrow: 'keep',
})
const emits = defineEmits<PopoverContentEmits>()

/** `width`/`class`/`inline`/`narrow` — наши, Reka о них не знает: исключаются из пробрасываемого. */
const delegated = reactiveOmit(props, 'width', 'class', 'inline', 'narrow')
const forwarded = useForwardPropsEmits(delegated, emits)

/**
 * `narrow="full"` ниже 768: ширина окна поверх ширины `width` (встроенный стиль — поэтому `!`), высота — доступная Reka до края
 * окна (`--reka-popper-available-height`), без скругления. Сдвиг к краю окна делает Reka (`shift`).
 */
const NARROW_FULL = 'max-md:w-screen! max-md:h-(--reka-popper-available-height) max-md:rounded-none'
</script>

<template>
  <div
    v-if="props.inline"
    data-slot="popover"
    v-bind="$attrs"
    :class="cn('rounded-lg bg-popover shadow-dropdown', props.class)"
    :style="{ width: `${props.width}px` }"
  >
    <slot />
  </div>
  <PopoverPortal v-else>
    <PopoverContent
      data-slot="popover"
      v-bind="{ ...forwarded, ...$attrs }"
      :data-narrow="props.narrow === 'full' ? 'full' : undefined"
      :class="cn('z-50 rounded-lg bg-popover shadow-dropdown', props.narrow === 'full' ? NARROW_FULL : '', props.class)"
      :style="{ width: `${props.width}px` }"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
