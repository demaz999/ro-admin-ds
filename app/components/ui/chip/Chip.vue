<!--
  @debt Состояний в мастере нет: `747:2464` — одиночный компонент кита 1 без
  вариантов, спек-страниц кит 1 не ведёт. Нажатие и выключенное состояние здесь
  не заведены; инверсия счётчика на включённом чипе выведена по механике маркера
  `Tag`, а не нарисована. См. docs/design-debt.md.

  Наведение заведено тактом 11 — по общему правилу «у всего интерактивного
  системное наведение», а не по мастеру. У чипа **две независимые цели**:
  сама пилюля и хвостовой контрол. Их наведения поэтому не совпадают —
  разбор в `index.ts` и `docs/naming.md`.

  Такт 26: вариант `neutral` — неинтерактивная метка значения, решение владельца.
  Подложка `muted`, текст `foreground`, наведения, роли и `tabindex` нет; `active`,
  `count`, `marker` и `trailing` у него погашены, хвост всегда `none`. Собственного
  курсора метка не задаёт и наследует его у контейнера: в кликабельной строке таблицы
  курсор над меткой тот же, что над строкой. Ведущее изображение — проп `image`.
  Разбор — `index.ts`, `docs/page-statuses.md`.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../icon'
import { chipCounterVariants, chipVariants } from '.'

/**
 * Фильтр-чип — мастер `badge` `747:2464` кита 1 плюс ось `active` и маркер
 * из `ButtonTag` `256:3601` Атома. Разбор — в `index.ts`.
 */
const props = withDefaults(defineProps<{
  /**
   * `default` — фильтр-чип; `neutral` — неинтерактивная метка значения (такт 26,
   * решение владельца). Разбор — в `index.ts`.
   */
  variant?: 'default' | 'neutral'
  /** Ось `Active` из `ButtonTag` Атома: чип включён в фильтр. */
  active?: boolean
  /** Гейт `Show bulb` мастера. Пусто — счётчика нет. */
  count?: string | number
  /** Маркер-точка 8×8 слева, из `ButtonTag`. У чипа кита 1 её нет — по умолчанию выключен. */
  marker?: boolean
  /**
   * Хвостовой контрол. У мастера он один — крестик, и его глиф подменяемый
   * (`icon#748:0`, INSTANCE_SWAP). Ось **наша**: чип применённого фильтра со
   * счётчиком не снимается крестиком, а раскрывает список значений, и подмена
   * одного глифа этого не описывает — у кнопки другое действие и другая
   * подпись. `none` — чип без действия вовсе.
   */
  trailing?: 'remove' | 'expand' | 'none'
  /** Список раскрыт: шеврон повёрнут. Значимо при `trailing="expand"`. */
  expanded?: boolean
  /**
   * Ведущее изображение 16×16, `object-fit: contain` — логотип, загруженный
   * компанией (такт 26, решение владельца). Декоративное: имя стоит рядом текстом,
   * поэтому `alt` пустой. От подписи — корневой зазор мастера 8. Задано — занимает
   * место слота `leading`.
   */
  image?: string
}>(), {
  variant: 'default',
  active: false,
  count: '',
  marker: false,
  trailing: 'remove',
  expanded: false,
  image: undefined,
})

const emit = defineEmits<{ remove: [], toggle: [] }>()

/** Нейтральная метка гасит всё интерактивное и всё фильтровое. */
const neutral = computed(() => props.variant === 'neutral')
const trailing = computed(() => (neutral.value ? 'none' : props.trailing))
const active = computed(() => !neutral.value && props.active)

/** Ноль — значащее значение счётчика, поэтому проверяем на пустую строку, а не на falsy. */
const hasCount = () => !neutral.value && props.count !== '' && props.count !== undefined && props.count !== null

/**
 * Такт «Области клика чипа», решение владельца: у счётчикового чипа кликается
 * **вся пилюля**, а не только шеврон в её углу — целиться в 11×11 было
 * неверно. Раскрытие поэтому переехало на корень, а бывший шеврон-кнопка стал
 * декоративной иконкой внутри уже кликабельной поверхности.
 *
 * У чипа с крестиком (`remove`) раскрывать нечего — снятие остаётся личным
 * действием крестика, корень его не перехватывает.
 */
function onRootClick() {
  if (trailing.value === 'expand') emit('toggle')
}

/**
 * Такт 28: клавиатура зовёт `click()` на себе, а не эмитит `toggle` напрямую.
 * `FilterChip` вешает счётчиковый чип триггером `Popover` — Reka сама слушает
 * клик и переключает состояние; отдельный путь для клавиатуры удвоил бы тоггл
 * на мыши и разошёлся бы с ней на Enter/Space. `<span role="button">` в отличие
 * от `<button>` не рождает клик по Enter/Space сам, поэтому его нужно вызвать.
 */
function onRootKeydown(event: KeyboardEvent) {
  if (trailing.value !== 'expand') return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).click()
  }
}
</script>

<template>
  <span
    data-slot="chip"
    :data-variant="props.variant"
    :data-active="active ? '' : undefined"
    :class="[chipVariants({ variant: props.variant, active, interactive: trailing !== 'none' }), trailing === 'expand' ? 'cursor-pointer' : '']"
    :role="trailing === 'expand' ? 'button' : undefined"
    :tabindex="trailing === 'expand' ? 0 : undefined"
    :aria-expanded="trailing === 'expand' ? props.expanded : undefined"
    :aria-label="trailing === 'expand' ? 'Показать значения' : undefined"
    @click="onRootClick"
    @keydown="onRootKeydown"
  >
    <!--
      Ведущее изображение — такт 26: логотип компании в метке значения. Бокс 16×16,
      картинка вписывается целиком (`object-contain`), пропорции сохраняются.
    -->
    <img
      v-if="props.image"
      data-slot="chip-image"
      :src="props.image"
      alt=""
      class="size-4 shrink-0 object-contain"
    >

    <!--
      Ведущая иконка — такт 24, слот нашего конвейера: у мастера `747:2464` его нет.
      Стоит на корне пилюли, поэтому от подписи отходит на корневой зазор мастера 8 —
      тот же, что между текстом и хвостовым контролом. Иконка идёт за цветом, который
      ей задали.
    -->
    <span v-else-if="$slots.leading" data-slot="chip-leading" class="flex size-4 shrink-0 items-center justify-center">
      <slot name="leading" />
    </span>

    <!-- Внутренняя группа `txt_bulb` мастера: зазор 4, а не 8. -->
    <span class="flex items-center gap-1">
      <span
        v-if="props.marker && !neutral"
        data-slot="chip-marker"
        class="size-2 shrink-0 rounded-full"
        :class="active ? 'bg-primary-foreground' : 'bg-accent-soft'"
      />

      <span data-slot="chip-label">
        <slot />
      </span>

      <span
        v-if="hasCount()"
        data-slot="chip-counter"
        :class="chipCounterVariants({ active })"
      >
        {{ props.count }}
      </span>
    </span>

    <!--
      Шеврон раскрытия — декоративная иконка, не отдельная кнопка: он лежит
      внутри уже кликабельной пилюли, второй хит-зоны ему не требуется.
      Коробка 16×16 и глиф 11 — с прежнего замера, только без интерактивности.
    -->
    <span
      v-if="trailing === 'expand'"
      data-slot="chip-expand"
      aria-hidden="true"
      class="flex size-4 shrink-0 items-center justify-center transition-transform"
      :class="[
        active ? 'text-primary-foreground' : 'text-foreground-secondary',
        props.expanded ? 'rotate-180' : '',
      ]"
    >
      <slot name="icon">
        <Icon name="chevron-down" :size="11" />
      </slot>
    </span>

    <!--
      Крестик снятия — самостоятельная цель, отдельная от пилюли: клик по нему
      снимает чип и не раскрывает ничего (а раскрывать здесь и нечего — этот
      вид у трейлинга не бывает вместе с expand).

      Коробка визуально та же 16×16 с мастера (глиф 9.4), но хит-зона и ховер
      расширены **невидимо** до 24×24 псевдоэлементом `after`: сама кнопка не
      растёт и раскладку пилюли не сдвигает, а лишний `4px` на сторону только
      расширяет то, что реагирует на курсор и клик. Промах на несколько
      пикселей рядом с 16px-глифом — обычное дело, отдельная точная цель уже
      требуется по правилу «хит-зона служебной иконки ≥24×24» (`naming.md`).
    -->
    <button
      v-if="trailing === 'remove'"
      data-slot="chip-remove"
      type="button"
      class="relative flex size-4 shrink-0 items-center justify-center outline-none transition-colors after:absolute after:-inset-1 after:-z-10 after:rounded-full after:transition-colors after:content-['']"
      :class="[
        active
          ? 'text-primary-foreground hover:after:bg-primary'
          : 'text-foreground-secondary hover:text-foreground hover:after:bg-chip',
      ]"
      aria-label="Убрать"
      :style="{ transitionDuration: 'var(--duration-hover)' }"
      @click.stop="emit('remove')"
    >
      <slot name="icon">
        <!-- Крестик 9.4 — с мастера. -->
        <Icon name="close" :size="9.4" />
      </slot>
    </button>
  </span>
</template>
