export { default as Diff } from './Diff.vue'
export { default as DiffArea } from './DiffArea.vue'
export { default as DiffChange } from './DiffChange.vue'
export { default as DiffGroup } from './DiffGroup.vue'

/**
 * Дифф двух конфигураций — такт 64, ворота владельца 2026-10-02: да (`docs/scheme-edit.md`, раздел 8, карточка 6).
 * Мастера в ките 1 нет: источник вида — модалка диффа макета страницы схемы `32765:12829` (файл
 * `U829JoK7KMZV8do3KNkWBh`); устройство — `spec-audit.md`, «Как устроен дифф», «Масштабируемость диффа».
 *
 * Один компонент в двух режимах (`spec-audit.md`, «Два режима одного дифф-компонента»): черновик против текущей
 * версии — в модалке-гейте публикации; версия N против N−1 — вторым слоем сайда истории. Что с чем сравнивать,
 * решает потребитель: компонент получает готовый результат сравнения.
 *
 * ## Состав
 *
 * | часть | что это | макет |
 * |---|---|---|
 * | «Требует внимания · N» | опасное сверху, всегда раскрыто: `Callout tone="warning"` со списком | `32765:12845` — блок с рамкой `#f4c1b2`, заголовок Bold 13 `#e98326` |
 * | предупреждения валидации | «Предупреждения: N»: `Callout` — `destructive`, когда есть критичное, иначе `warning` | макета нет — `spec-audit.md`, «Валидационный гейт публикации» |
 * | `DiffArea` | строка области: шеврон, название, счётчик с тоном; раскрывает детали | `32765:12860` — строка 44, название Bold 15, счётчик Medium 13 |
 * | `DiffGroup` | «Добавлено · Изменено · Удалено» со счётчиком; длинный список — «Показать ещё N» | макета нет — `spec-audit.md`, «Масштабируемость диффа», п. 3 |
 * | `DiffChange` | строка «было → стало» и следствие | макета нет — `spec-audit.md`, «Как устроен дифф», п. 4 |
 * | итог | «Итого: N изменений в M разделах» | `32765:12895` — плашка `#f4f6f9`, Regular 13 |
 *
 * | что | кит | макет |
 * |---|---|---|
 * | строка области 44, линия между областями | `min-h-11`, `border-b border-border-soft` | `32765:12861` — поля 13 сверху и снизу при строке 17; линия `#eef1f5` |
 * | название области 15/20 bold | `text-sm font-bold` | `32765:12866` — Bold 15 |
 * | счётчик 13/16 medium | `text-xs font-medium` | `32765:12868` — Medium 13 |
 * | тон счётчика: изменено | `--primary` | `32765:12868` — `#0059cf` |
 * | тон счётчика: удалено | `--destructive` | `32765:12886` — `#fa3948` |
 * | тон счётчика: добавлено | `--success-strong` | в макете нет — роль успеха кита |
 * | без изменений | `--foreground-disabled`, шеврона нет, область не раскрывается | `32765:12891`, `32765:12893` — `#8b939e`, шеврона нет |
 * | шеврон | `Icon chevron-right` 12, у раскрытой повёрнут на 90° | `32765:12863` — 15×15 |
 *
 * Раскрытие области — собственная кнопка-заголовок: `Accordion` кита держит шеврон справа и не несёт счётчика с
 * тоном; ставить его внутрь значило бы переопределять весь его вид.
 *
 * ## Данные
 *
 * `areas` — всегда все области, по порядку; сводка не растёт с числом правок. Всё свёрнуто, пока не раскрыли.
 */
export type DiffTone = 'changed' | 'added' | 'removed' | 'none'
export type DiffKind = 'added' | 'changed' | 'removed'

export interface DiffChangeItem {
  label: string
  before?: string
  after?: string
  /** Следствие правки — что изменится в поведении. */
  effect?: string
}
export interface DiffGroupItem { kind: DiffKind, items: DiffChangeItem[] }
export interface DiffAreaItem {
  id: string
  title: string
  /** Счётчик готовой строкой: «2 изменения», «+1 поле», «−1 шаг», «без изменений». */
  count: string
  tone: DiffTone
  groups: DiffGroupItem[]
}
export interface DiffWarning { text: string, critical: boolean }

export const DIFF_KIND_LABEL: Record<DiffKind, string> = { added: 'Добавлено', changed: 'Изменено', removed: 'Удалено' }
export const DIFF_TONE_CLASS: Record<DiffTone, string> = {
  changed: 'text-primary',
  added: 'text-success-strong',
  removed: 'text-destructive',
  none: 'text-foreground-disabled',
}
