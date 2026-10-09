<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle, injectDialogRootContext, useForwardPropsEmits, VisuallyHidden } from 'reka-ui'
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { MODAL_CARD_DOCK_KEY, MODAL_CARD_KEY, type ModalCardPlacement, publishDock } from '.'

/**
 * Подложка и карточка окна. Разбор и геометрия — в `index.ts`.
 *
 * Корень шаблона — портал с подложкой и карточкой; «лишние» атрибуты потребителя уходят на
 * карточку — та же ловушка, что у `DialogContent` и `PopoverContent`.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<DialogContentProps & {
  placement?: ModalCardPlacement
  /**
   * Ширина центрального окна: `md` 600, `sm` 440, `lg` 960 — такт 91: окно выбора с колонкой источников и сеткой карточек
   * («Новая схема осмотра» страницы схемы). У `edge` ширина одна — 642; `full` — во всё окно.
   */
  size?: 'md' | 'sm' | 'lg'
  /**
   * Край окна у `edge` — такт 92: `right` (по умолчанию) — сайд справа, скругление 48 слева сверху; `left` — слева, скругление
   * 48 справа сверху (выезжающее меню каркаса на узком экране).
   */
  side?: 'right' | 'left'
  /**
   * Поверхность — такт 92: `card` (по умолчанию) — карточка кита с полями 32 / 16 и зазором блоков 24; `sidebar` — поверхность
   * меню `--sidebar` без полей и зазоров, ширина — по содержимому: выезжающее меню каркаса (правило порталов сайдбара `CLAUDE.md`:
   * внутри — `sidebar`-токены).
   */
  surface?: 'card' | 'sidebar'
  /**
   * Узкий экран (уже 768) — такт 92: `keep` (по умолчанию) — размещение прежнее; `full` — окно и сайд во всё окно без
   * скругления, действия шапки — строкой под заголовком, текст подвала — строкой над кнопками. Рабочий стол не меняется.
   */
  narrow?: 'keep' | 'full'
  /** Имя окна без шапки `ModalCardHeader` — для чтения с экрана (выезжающее меню). Такт 92. */
  label?: string
  /** `false` — закрыть можно только кнопками окна: без крестика, Esc и клика мимо (§12.5). */
  closable?: boolean
  /**
   * Без портала, подложка и карточка — внутри родителя. Стенду и `/compare`: показать окно в рамке.
   * В продукте не используется.
   */
  inline?: boolean
  /**
   * Ручка ширины на левом краю сайда справа (`placement="edge"`) — такт 101, довесок 1: ширина — `v-model:width`, пределы —
   * `--container-modal-edge-min` и половина окна, двойной щелчок — `--container-modal-edge`. Разбор — `index.ts`.
   */
  resizable?: boolean
  class?: string
}>(), {
  placement: 'center',
  size: 'md',
  side: 'right',
  surface: 'card',
  narrow: 'keep',
  label: '',
  closable: true,
  inline: false,
  resizable: false,
})
const emits = defineEmits<DialogContentEmits>()
/** Ширина сайда с ручкой, px; не задана — 642. */
const width = defineModel<number | undefined>('width', { default: undefined })

const delegated = reactiveOmit(props, 'placement', 'size', 'side', 'surface', 'narrow', 'label', 'closable', 'inline', 'resizable', 'class')
const forwarded = useForwardPropsEmits(delegated, emits)

provide(MODAL_CARD_KEY, { closable: computed(() => props.closable), narrow: computed(() => props.narrow === 'full') })

/** Сайд слотом или немодальным слоем (такт 101): корень `ModalCard` с `dock`. В рамке стенда (`inline`) — как прежде. */
const dockRef = inject(MODAL_CARD_DOCK_KEY, computed(() => undefined))
const dock = computed(() => (props.inline || props.placement !== 'edge' ? undefined : dockRef.value))
const root = injectDialogRootContext()

/* ------------------------------ ширина сайда — такт 101, довесок 1 ------------------------------ */
const viewport = ref(0)
const onViewport = () => { viewport.value = window.innerWidth }
/** Значения токенов — с корня документа: числа ширины живут в `tailwind.css`. */
function token(name: string, fallback: number) {
  const v = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(v) && v > 0 ? v : fallback
}
const edgeWidth = ref(642)
const edgeMin = ref(480)
onMounted(() => {
  onViewport()
  edgeWidth.value = token('--container-modal-edge', 642)
  edgeMin.value = token('--container-modal-edge-min', 480)
  window.addEventListener('resize', onViewport)
})
/** Ручка — только у сайда справа на рабочем столе: на узком экране сайд во всё окно (`narrow="full"`). */
const sizing = computed(() => props.resizable && props.placement === 'edge' && props.side === 'right' && !props.inline
  && !(props.narrow === 'full' && viewport.value > 0 && viewport.value < 768))
const maxWidth = computed(() => Math.max(edgeMin.value, Math.floor(viewport.value / 2)))
const clamp = (v: number) => Math.round(Math.min(maxWidth.value, Math.max(edgeMin.value, v)))
/** Ширина на экране: с ручкой — заданная в пределах; без ручки — 642. */
const shown = computed(() => (sizing.value && width.value !== undefined && viewport.value ? clamp(width.value) : edgeWidth.value))

const dockKey = Symbol('modal-card')
watch([() => root.open.value, dock, shown], ([open, d, w]) => {
  publishDock(dockKey, open && d ? { slot: d === 'slot', width: w } : null)
}, { immediate: true })
onBeforeUnmount(() => {
  publishDock(dockKey, null)
  window.removeEventListener('resize', onViewport)
})

/** Перетаскивание: ширина — от левого края, захват указателя; системный drag картинки под точкой нажатия гасится (такт 42). */
const dragging = ref(false)
let start = { x: 0, w: 0 }
function onHandleDown(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  start = { x: event.clientX, w: shown.value }
  dragging.value = true
}
function onHandleMove(event: PointerEvent) {
  if (!dragging.value) return
  width.value = clamp(start.w + start.x - event.clientX)
}
function onHandleUp(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}
/** Клавиатура: стрелка влево — шире, вправо — уже, шаг 16. */
function onHandleKey(event: KeyboardEvent) {
  const step = event.key === 'ArrowLeft' ? 16 : event.key === 'ArrowRight' ? -16 : 0
  if (!step) return
  event.preventDefault()
  width.value = clamp(shown.value + step)
}
function resetWidth() { width.value = edgeWidth.value }

/** Заблокированное окно не закрывается ни Esc, ни кликом мимо — только своими кнопками. */
function guard(event: Event) {
  if (!props.closable) event.preventDefault()
}
/** Клик и фокус мимо: прикреплённый сайд (такт 101) ими не закрывается — страница под ним работает. */
function guardOutside(event: Event) {
  if (!props.closable || dock.value) event.preventDefault()
}

/**
 * Tab с последнего элемента сайда (Shift+Tab — с первого) у прикреплённого сайда уходит на страницу: ловушка фокуса Reka у
 * немодального окна не заперта, но по кругу водит (`loop`). Обработчик в фазе перехвата останавливает событие до неё.
 * Такт 104: фокус встаёт на элемент страницы, открывший сайд (`opener` — элемент в фокусе в момент открытия); сайд стоит порталом в
 * конце документа, и переход браузером уводил Tab за конец документа. Открывший элемент пропал или скрыт — первый доступный
 * элемент `main`.
 */
let opener: HTMLElement | null = null
function returnFocus() {
  const ok = (x: HTMLElement | null): x is HTMLElement => !!x && x.isConnected && x.getClientRects().length > 0 && !x.closest('[inert]')
  const target = ok(opener)
    ? opener
    : [...document.querySelectorAll<HTMLElement>(`main :is(${TABBABLE})`)].find(x => x.tabIndex >= 0 && ok(x))
  target?.focus()
  return !!target
}
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
function onTabCapture(event: KeyboardEvent) {
  if (!dock.value || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return
  const card = event.currentTarget as HTMLElement
  const list = [...card.querySelectorAll<HTMLElement>(TABBABLE)].filter(x => x.tabIndex >= 0 && !x.closest('[inert]') && x.getClientRects().length > 0)
  const edge = event.shiftKey ? list[0] : list[list.length - 1]
  if (!edge || document.activeElement !== edge) return
  event.stopPropagation()
  if (returnFocus()) event.preventDefault()
}

/**
 * Фокус при открытии — на карточку окна (решение чата 2026-09-30, такт 39; реестр расхождений
 * `free-shoot.md`, раздел 15): прототип фокус в окне не ставит, ловушка фокуса Reka требует, чтобы
 * он был внутри, — ближе всего карточка. Где прототип фокус ставит сам (форма повтора на группе,
 * §14.3), его переносит содержимое окна — `FieldSet autofocus` уводит фокус с карточки после
 * монтирования. Потребитель, отменивший событие сам, решает за окно.
 */
function focusCard(event: Event) {
  /* Такт 104: элемент страницы, открывший сайд, — сюда возвращает Tab с краевого элемента прикреплённого сайда. */
  const prev = document.activeElement
  const card = event.currentTarget as HTMLElement | null
  opener = prev instanceof HTMLElement && prev !== document.body && !card?.contains(prev) ? prev : null
  if (event.defaultPrevented) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true })
}

const position = computed(() => (props.inline ? 'absolute' : 'fixed'))
const sidebar = computed(() => props.surface === 'sidebar')

/**
 * Узкий экран, `narrow="full"` — такт 92: сайд и окно по центру — во всё окно, без скругления; полноэкранный слой и так во всё
 * окно. Классы с вариантом `max-md:` — рабочий стол (768 и шире) прежний.
 */
const NARROW_FULL: Record<ModalCardPlacement, string> = {
  edge: 'max-md:inset-x-0 max-md:w-auto max-md:rounded-none',
  center: 'max-md:inset-0 max-md:w-auto max-md:max-h-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none',
  full: '',
}

/** Край `edge`: справа — прежний сайд 642; слева — зеркально; у поверхности меню ширина по содержимому. */
const edgeClass = computed(() => (props.side === 'left'
  ? cn('inset-y-0 left-0 rounded-tr-4xl', sidebar.value ? '' : 'w-modal-edge')
  : 'inset-y-0 right-0 w-modal-edge rounded-tl-4xl'))
</script>

<template>
  <DialogPortal :disabled="props.inline">
    <DialogOverlay
      v-if="!props.inline && !dock"
      data-slot="modal-card-overlay"
      class="fixed inset-0 z-50 bg-overlay-modal"
    />
    <div v-else-if="props.inline" data-slot="modal-card-overlay" class="absolute inset-0 bg-overlay-modal" />
    <DialogContent
      data-slot="modal-card"
      :data-placement="props.placement"
      :data-side="props.placement === 'edge' && props.side === 'left' ? 'left' : undefined"
      :data-surface="sidebar ? 'sidebar' : undefined"
      :data-narrow="props.narrow === 'full' ? 'full' : undefined"
      :data-closable="props.closable || undefined"
      :data-dock="dock"
      :data-resizable="sizing || undefined"
      v-bind="{ ...forwarded, ...$attrs }"
      :style="sizing ? { width: `${shown}px` } : undefined"
      :class="cn(
        'z-50 flex flex-col shadow-modal outline-none',
        sidebar ? 'overflow-hidden bg-sidebar text-sidebar-foreground' : 'gap-6 bg-card px-4 py-8 text-foreground',
        position,
        props.placement === 'edge'
          ? edgeClass
          : props.placement === 'full'
            /* Полноэкранный слой (такт 71): во всё окно, без скругления; паддинги и зазоры — прежние. */
            ? 'inset-0'
            : cn('top-1/2 left-1/2 max-h-[88vh] rounded-md -translate-x-1/2 -translate-y-1/2', props.size === 'sm' ? 'w-modal-narrow' : props.size === 'lg' ? 'w-modal-wide' : 'w-modal'),
        props.narrow === 'full' ? NARROW_FULL[props.placement] : '',
        props.class,
      )"
      tabindex="-1"
      @escape-key-down="guard"
      @pointer-down-outside="guardOutside"
      @interact-outside="guardOutside"
      @keydown.capture="onTabCapture"
      @open-auto-focus="focusCard"
    >
      <!-- Окно без шапки (выезжающее меню) — имя и описание для чтения с экрана, иначе Reka предупреждает (такт 28). -->
      <VisuallyHidden v-if="props.label" as-child>
        <div>
          <DialogTitle>{{ props.label }}</DialogTitle>
          <DialogDescription>{{ props.label }}</DialogDescription>
        </div>
      </VisuallyHidden>
      <slot />
      <!--
        Ручка ширины — такт 101, довесок 1: колонка 10 по левому краю сайда, как ручка `Resizable` (такт 42); линия и захват — на
        наведении, фокусе и перетаскивании. Последней в разметке: Tab по сайду доходит до неё после подвала.
      -->
      <div
        v-if="sizing"
        data-slot="modal-card-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Ширина панели"
        :aria-valuenow="shown"
        :aria-valuemin="edgeMin"
        :aria-valuemax="maxWidth"
        tabindex="0"
        :data-state="dragging ? 'drag' : undefined"
        class="group/handle absolute top-12 bottom-0 left-0 flex w-2.5 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center outline-none select-none"
        @pointerdown="onHandleDown"
        @pointermove="onHandleMove"
        @pointerup="onHandleUp"
        @pointercancel="onHandleUp"
        @dblclick="resetWidth"
        @keydown="onHandleKey"
      >
        <span
          aria-hidden="true"
          class="absolute inset-y-0 left-1 w-0.5 bg-transparent transition-colors group-hover/handle:bg-primary group-focus-visible/handle:bg-primary group-data-[state=drag]/handle:bg-primary"
          :style="{ transitionDuration: 'var(--duration-hover)' }"
        />
        <span
          aria-hidden="true"
          class="relative h-8 w-1.5 rounded-xs bg-muted-foreground opacity-0 transition-opacity group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100 group-data-[state=drag]/handle:opacity-100"
          :style="{ transitionDuration: 'var(--duration-hover)' }"
        />
      </div>
    </DialogContent>
  </DialogPortal>
</template>
