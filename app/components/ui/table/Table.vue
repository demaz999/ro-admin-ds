<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Контейнер таблицы — узлы `table_content` и `table` кадра `19601:29029`.
 *
 * ## Что он несёт
 *
 * | Что | С макета |
 * |---|---|
 * | рамка | `#d9e8fc` толщиной 1 по контуру, роль `--border-soft` |
 * | заливка | белая |
 * | скругление | **16**: у контейнера `table` `19601:29061` скруглены оба края |
 * | прокрутка | горизонтальная: содержимое шире видимой области (1776 против 1372) |
 *
 * ## Про скругление: первый разбор был неверен
 *
 * Волна 7 смотрела на `table_content` `19601:29063` — у него радиус нулевой, и
 * отсюда вышел вывод «скругления нет». Но `table_content` в макете лежит
 * **в середине** контейнера `table` `19601:29061`: сверху над ним панель поиска
 * `table_header` `19601:29062` с явными `rounded-tl/tr 16`, снизу подвал
 * `table_footer` `19601:29081`. Скругляются края контейнера, а не его середина.
 *
 * У нас панель поиска вынесена наружу решением владельца (консистентность с
 * карточным видом), поэтому верхние 16 несёт сама таблица, а нижние — подвал,
 * который к ней примыкает. Отсюда проп `attached`.
 */
const props = withDefaults(defineProps<{
  /**
   * Снизу примыкает подвал: нижние углы и нижнюю рамку тогда несёт он, иначе
   * между таблицей и подвалом видны две рамки и разрыв скругления.
   */
  attached?: boolean
  /**
   * Сверху примыкает панель действий: верхние углы и верхнюю рамку тогда
   * несёт она. В макете дашборда так и есть — панель входит в контейнер
   * таблицы, а не стоит над ним.
   */
  attachedTop?: boolean
  /**
   * Строк на странице у таблицы с пагинацией — такт 99, решение владельца 2026-10-09. Таблица держит высоту полной
   * страницы: тело не ниже «строк на страницу × высота строки», на неполной (последней) странице пустое место — под
   * последней строкой, подвал стоит там же, где на полной; смена числа строк меняет высоту вместе с выбором. Высота строки —
   * самая низкая строка тела (строка в одну строку текста), разделитель — с шапки; строки выше обычной занимают часть пустого места,
   * подвал остаётся на месте. Без пропа таблица по содержимому, как прежде.
   */
  pageRows?: number
  class?: string
}>(), { attached: false, attachedTop: false, pageRows: undefined, class: undefined })

const body = ref<HTMLElement | null>(null)
const minHeight = ref<string | undefined>(undefined)

/**
 * Высота полной страницы: шапка и прочее не-тело плюс «строк на страницу × высота строки». Строки — прямые дети
 * `[data-slot=table-row]`; шапка — строка с `[data-slot=table-head]`. Пустое тело (сброс поиска) не дополняется: подвала у него нет.
 */
function measure() {
  const el = body.value
  if (!el) return
  const n = props.pageRows ?? 0
  const kids = [...el.children] as HTMLElement[]
  const rows = kids.filter(k => k.dataset.slot === 'table-row' && !k.querySelector('[data-slot=table-head]'))
  if (!n || !rows.length || rows.length >= n) { minHeight.value = undefined; return }
  const head = kids.find(k => k.dataset.slot === 'table-row' && k.querySelector('[data-slot=table-head]'))
  const bw = (x: HTMLElement) => Number.parseFloat(getComputedStyle(x).borderBottomWidth) || 0
  /* Строка с разделителем: у последней строки разделителя нет (`last:border-b-0`), его толщина — у шапки. */
  const sep = head ? bw(head) : 0
  const unit = Math.min(...rows.map(r => r.offsetHeight - bw(r))) + sep
  const rest = kids.filter(k => !rows.includes(k)).reduce((sum, k) => sum + k.offsetHeight, 0)
  minHeight.value = `${rest + n * unit - sep}px`
}

let mo: MutationObserver | null = null
let ro: ResizeObserver | null = null
onMounted(() => {
  measure()
  if (!body.value) return
  mo = new MutationObserver(() => measure())
  mo.observe(body.value, { childList: true })
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => measure())
    ro.observe(body.value.parentElement ?? body.value)
  }
})
onUpdated(() => measure())
watch(() => props.pageRows, () => nextTick(measure))
onBeforeUnmount(() => { mo?.disconnect(); ro?.disconnect() })
</script>

<template>
  <div
    data-slot="table"
    role="table"
    :class="cn(
      'w-full overflow-x-auto border border-border-soft bg-card',
      props.attachedTop ? 'border-t-0' : 'rounded-t-xl',
      props.attached ? '' : 'rounded-b-xl',
      props.class,
    )"
  >
    <div ref="body" class="min-w-max" :style="minHeight ? { minHeight } : undefined">
      <slot />
    </div>
  </div>
</template>
