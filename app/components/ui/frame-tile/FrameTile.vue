<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { Image } from '../image'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip'
import { cn } from '@/lib/utils'
import { frameTilePlateVariants, frameTileVariants, type FrameTileState } from '.'

/**
 * Плитка кадра ленты материалов — такт 30. Разбор — в `index.ts` и
 * `docs/free-shoot.md`, раздел 1.
 */
const props = withDefaults(defineProps<{
  src: string
  alt?: string
  kind?: 'photo' | 'video'
  /** Длительность видео, «0:36». Выводится в подписи свободного кадра. */
  duration?: string
  /** Время съёмки, «09:57». Подпись свободного кадра (§4). */
  time: string
  state?: FrameTileState
  /** Название шага в плашке; обязательно при `state` ≠ `free`. */
  stepName?: string
  /** Вторая строка подсказки названия: «объект · шаг». */
  locateHint?: string
  /** Причина запрета у `locked` и `rejected` — тексты `frame.*` спеки §18. */
  lockReason?: string
  selected?: boolean
  /** В выделении хоть один кадр — флажок виден без наведения. */
  selectionMode?: boolean
  dimmed?: boolean
  linked?: boolean
  dragging?: boolean
  /**
   * Оснастка приёмки: подсказка открыта сразу. Headless-браузер не наводит
   * курсор, а состояние нужно снять. В продукт не идёт.
   */
  tooltipOpen?: boolean
  /**
   * Оснастка приёмки: вид наведения без курсора. Headless-браузер не наводит
   * курсор, а стенду нужна колонка «наведение». В продукт не идёт.
   */
  demoHover?: boolean
  class?: string
}>(), {
  alt: '',
  kind: 'photo',
  duration: '',
  state: 'free',
  stepName: '',
  locateHint: '',
  lockReason: '',
  selected: false,
  selectionMode: false,
  dimmed: false,
  linked: false,
  dragging: false,
  tooltipOpen: undefined,
  demoHover: false,
})

const emit = defineEmits<{
  /** Клик по плитке. Shift и Ctrl страница читает из события (§10.1). */
  'toggle-select': [event: MouseEvent | KeyboardEvent]
  /** Иконка в углу — открыть на весь экран (§8.3). */
  open: []
  /** Название шага или лупа в плашке — «Показать в структуре» (§15.3). */
  locate: []
  /** Крестик в плашке — открепить. */
  unassign: []
}>()

const placed = computed(() => props.state !== 'free')
/** Замок вместо крестика: привязка защищена (§6). */
const protectedFrame = computed(() => props.state === 'locked' || props.state === 'rejected')
const plateText = computed(() =>
  props.state === 'rejected' ? `отклонён · ${props.stepName}` : props.stepName,
)

/**
 * Изображение с привязкой обесцвечено и приглушено (`.card.placed img`). На
 * наведении и в выделении оживает целиком: прототип держит на наведении
 * `grayscale(.3) opacity(.85)`, но промежуточных ступеней фильтра у кита нет —
 * наведение берёт уровень контрола поверх медиа 0.88 и полный цвет.
 */
const imageClass = computed(() => {
  if (!placed.value || props.selected || props.linked) return 'bg-muted'
  if (props.demoHover) return 'bg-muted opacity-[var(--opacity-media-control)]'
  return 'bg-muted grayscale opacity-[var(--opacity-disabled)] transition-[filter,opacity] group-hover/tile:grayscale-0 group-hover/tile:opacity-[var(--opacity-media-control)]'
})

/*
 * Только клавиша на самой плитке. Enter и пробел из вложенных кнопок («Открыть во весь экран»,
 * лупа, крестик) всплывают сюда же — до такта 34 плитка их гасила и переключала выделение, и
 * кнопки не нажимались с клавиатуры. Найдено приёмкой ловушки фокуса просмотра.
 */
function onKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    emit('toggle-select', event)
  }
}
</script>

<template>
  <div
    data-slot="frame-tile"
    :data-state="props.state"
    :data-linked="props.linked || undefined"
    :data-dimmed="props.dimmed || undefined"
    role="checkbox"
    tabindex="0"
    :aria-checked="props.selected"
    :aria-label="props.alt || props.time"
    :class="cn(frameTileVariants({
      selected: props.selected,
      placed,
      suggested: props.state === 'suggested',
      linked: props.linked,
      dimmed: props.dimmed,
      dragging: props.dragging,
    }), props.demoHover && !props.selected ? 'shadow-elevated' : '', props.class)"
    :style="{ transitionProperty: 'box-shadow, border-color, opacity', transitionDuration: 'var(--duration-hover)' }"
    @click="emit('toggle-select', $event)"
    @keydown="onKeydown"
  >
    <!--
      Картинка и её углы — такт 47, приёмка владельца 2026-10-01 (п. 5). Такт 52: углы плитки — только действия, места
      закреплены и не сдвигаются: слева вверху — флажок, справа вверху — «во весь экран», справа внизу — лупа «показать
      в структуре», слева внизу — крестик «открепить». Маркер видео — глиф в полосе подписи перед текстом. Одна геометрия на все углы: зона нажатия 32, видимая плашка 28 `--scrim-dark`
      с белым глифом 16, отступ плашки 8 от края
      (зона — 6); центрирование флексом, координаты целые.
    -->
    <div data-slot="frame-tile-media" class="@container relative">
      <!-- Высота картинки — 3/4 ширины, вниз до кратного 4 (целые пиксели устройства при масштабах 1–2, такт 51). -->
      <Image ratio="4:3" :src="props.src" :alt="props.alt" :class="cn(imageClass, 'h-[round(down,75cqw,--spacing(1))]')" />

      <!--
        Флажок — `Checkbox on-image` по правилу «Контрол поверх изображения», как в карточке осмотра «Моих осмотров»: без тёмной
        подложки (такт 51, решение владельца 2026-10-01), по центру той же зоны 32 — на одной линии со значком «во весь экран».
        Он только показывает
        выделение: цель клика — вся плитка, поэтому флажок выведен из фокуса и из дерева доступности (`inert`).
      -->
      <span
        data-slot="frame-tile-check"
        inert
        class="pointer-events-none absolute top-1.5 left-1.5 z-20 flex size-8 items-center justify-center outline-none transition-opacity"
        :class="props.selected || props.selectionMode || props.demoHover ? 'opacity-100' : 'opacity-0 group-hover/tile:opacity-100'"
        :style="{ transitionDuration: 'var(--duration-hover)' }"
      >
        <Checkbox :model-value="props.selected" on-image />
      </span>

      <!-- Открыть на весь экран — всегда правый верхний угол, появляется на наведении (§8.3). -->
      <button
        type="button"
        data-slot="frame-tile-open"
        aria-label="Открыть во весь экран"
        class="absolute top-1.5 right-1.5 z-20 flex size-8 items-center justify-center outline-none group-hover/tile:opacity-100 focus-visible:opacity-100"
        :class="props.demoHover ? 'opacity-100' : 'opacity-0'"
        @click.stop="emit('open')"
      >
        <span class="flex size-7 items-center justify-center rounded-sm bg-scrim-dark text-primary-foreground"><Icon name="fullscreen" :size="16" /></span>
      </button>

      <!-- «Открепить» — левый нижний угол картинки (такт 52). -->
      <button
        v-if="placed && !protectedFrame"
        type="button"
        data-slot="frame-tile-unassign"
        aria-label="Открепить"
        class="absolute bottom-1.5 left-1.5 z-20 flex size-8 items-center justify-center outline-none"
        @click.stop="emit('unassign')"
      >
        <span class="flex size-7 items-center justify-center rounded-sm bg-scrim-dark text-primary-foreground"><Icon name="close" :size="16" /></span>
      </button>

      <!-- «Показать в структуре» — правый нижний угол картинки, над полосой статуса. -->
      <button
        v-if="placed"
        type="button"
        data-slot="frame-tile-locate"
        aria-label="Показать в структуре справа"
        class="absolute right-1.5 bottom-1.5 z-20 flex size-8 items-center justify-center outline-none"
        @click.stop="emit('locate')"
      >
        <span class="flex size-7 items-center justify-center rounded-sm bg-scrim-dark text-primary-foreground"><Icon name="search" :size="16" /></span>
      </button>
    </div>

    <!--
      Полоса под картинкой есть всегда: высота плитки не зависит от состояния. Такт 51, решение владельца 2026-10-01:
      подпись живёт в полосе, а не поверх картинки; градиента и тени нет. У свободного кадра — время и длительность (§4),
      у кадра с привязкой полоса залита цветом статуса сплошняком, текст 13/16 medium; подчёркивание — на наведении:
      название шага — действие «Показать в структуре» (§15.4). Замок защищённого кадра — справа в той же полосе.
    -->
    <span
      v-if="!placed"
      data-slot="frame-tile-caption"
      class="flex h-6 items-center gap-1 border-t border-border-soft px-2 text-xs text-foreground-secondary"
    >
      <span>{{ props.time }}</span>
      <!-- Видео: глиф перед длительностью, как у прототипа («▶ 0:36»). -->
      <span
        v-if="props.kind === 'video'"
        data-slot="frame-tile-video"
        class="ml-auto flex items-center gap-1 font-medium"
      ><Icon name="play" :size="8" />{{ props.duration }}</span>
    </span>

    <TooltipProvider v-else>
      <div
        data-slot="frame-tile-plate"
        :class="frameTilePlateVariants({ state: props.state === 'free' ? 'assigned' : props.state })"
      >
        <!-- Видео: глиф перед названием шага — маркер ушёл из угла картинки (такт 52). -->
        <span v-if="props.kind === 'video'" data-slot="frame-tile-video" aria-hidden="true" class="flex shrink-0 items-center">
          <Icon name="play" :size="8" />
        </span>
        <Tooltip :open="props.tooltipOpen">
          <TooltipTrigger as-child>
            <button
              type="button"
              data-slot="frame-tile-step"
              class="min-w-0 truncate text-left outline-none hover:underline focus-visible:underline"
              @click.stop="emit('locate')"
            >
              {{ plateText }}
            </button>
          </TooltipTrigger>
          <TooltipContent class="max-w-80 whitespace-normal">
            Показать в структуре справа
            <template v-if="props.locateHint">
              <br>{{ props.locateHint }}<template v-if="props.lockReason"> · {{ props.lockReason }}</template>
            </template>
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="protectedFrame">
          <TooltipTrigger as-child>
            <span
              data-slot="frame-tile-lock"
              tabindex="0"
              :aria-label="`${props.lockReason} — открепить нельзя`"
              class="ml-auto flex size-4 shrink-0 items-center justify-center opacity-[var(--opacity-icon-muted)] outline-none"
              @click.stop
            >
              <Icon name="lock" :size="12" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ props.lockReason }} — открепить нельзя</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  </div>
</template>
