<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle, useForwardPropsEmits, VisuallyHidden } from 'reka-ui'
import { computed, provide } from 'vue'
import { cn } from '@/lib/utils'
import { MODAL_CARD_KEY, type ModalCardPlacement } from '.'

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
})
const emits = defineEmits<DialogContentEmits>()

const delegated = reactiveOmit(props, 'placement', 'size', 'side', 'surface', 'narrow', 'label', 'closable', 'inline', 'class')
const forwarded = useForwardPropsEmits(delegated, emits)

provide(MODAL_CARD_KEY, { closable: computed(() => props.closable), narrow: computed(() => props.narrow === 'full') })

/** Заблокированное окно не закрывается ни Esc, ни кликом мимо — только своими кнопками. */
function guard(event: Event) {
  if (!props.closable) event.preventDefault()
}

/**
 * Фокус при открытии — на карточку окна (решение чата 2026-09-30, такт 39; реестр расхождений
 * `free-shoot.md`, раздел 15): прототип фокус в окне не ставит, ловушка фокуса Reka требует, чтобы
 * он был внутри, — ближе всего карточка. Где прототип фокус ставит сам (форма повтора на группе,
 * §14.3), его переносит содержимое окна — `FieldSet autofocus` уводит фокус с карточки после
 * монтирования. Потребитель, отменивший событие сам, решает за окно.
 */
function focusCard(event: Event) {
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
      v-if="!props.inline"
      data-slot="modal-card-overlay"
      class="fixed inset-0 z-50 bg-overlay-modal"
    />
    <div v-else data-slot="modal-card-overlay" class="absolute inset-0 bg-overlay-modal" />
    <DialogContent
      data-slot="modal-card"
      :data-placement="props.placement"
      :data-side="props.placement === 'edge' && props.side === 'left' ? 'left' : undefined"
      :data-surface="sidebar ? 'sidebar' : undefined"
      :data-narrow="props.narrow === 'full' ? 'full' : undefined"
      :data-closable="props.closable || undefined"
      v-bind="{ ...forwarded, ...$attrs }"
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
      @pointer-down-outside="guard"
      @interact-outside="guard"
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
    </DialogContent>
  </DialogPortal>
</template>
