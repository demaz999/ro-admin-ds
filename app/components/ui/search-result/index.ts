import type { IconName } from '../icon'

export { default as SearchResult } from './SearchResult.vue'

/**
 * Строка выдачи поиска — такт 86, ворота оркестратора 2026-10-08 (`docs/scheme-edit.md`, раздел 8, карточка 8). Мастера в
 * ките 1 нет: геометрия и цвет строки — мастер строки списка `ListItem` `2400:14661` и его спека `457:4033` (как у
 * `SelectItem`); состав — поиск JetBrains (`docs/scheme-edit-review.md`, 3.1, 3.2, п. 8): иконка типа, подпись с подсвеченным
 * совпадением, пояснение, справа — текущее значение либо переключатель булевой настройки.
 *
 * | часть | кит | источник |
 * |---|---|---|
 * | строка | от 44, поля 8 / 16, радиус 8, зазор 12; заливки в покое нет, наведение `--list-hover`, активная `--list-selected` | `ListItem` `2400:14661`, спека `457:4033` |
 * | иконка типа | `Icon` 16 в держателе 16×20, прозрачность 0.72, у наведения и активной — 1 | `_IconListItem` `6475:86591`, «icon 0.72» спеки |
 * | подпись | 15/20 medium `--field-foreground`, в одну строку с многоточием; совпадение — `HighlightText` | заголовок `ListItem` |
 * | пояснение | 13/16 medium `--field-placeholder`, в одну строку; совпадение подсвечено | подпись `ListItem` |
 * | значение | 13/16 medium `--field-placeholder`, до 240, многоточием | JetBrains: значение справа серым |
 * | переключатель | `Switch` 32×20 у правого поля 16; нажатие переключает и строку не выбирает | JetBrains Find Action: ON/OFF в строке |
 * | недоступная | иконка, подпись, значение и переключатель — 0.48 (`--opacity-disabled`); причина второй строкой 13/16 `--muted-foreground` полным контрастом; нажатие доходит — потребитель отказывает с причиной | прецеденты `Checkbox reason` (такт 74), ось `muted` у `SelectItem` (такт 41) |
 *
 * Тип — иконка: настройка `settings`, поле `article`, группа `layers`, шаг `photo-camera`, процесс `list`, поле витрины
 * `star` (звезда таба «Витрина»), действие — своя иконка (`icon`), недавний запрос `schedule`, «ещё N» `more`, фильтр
 * «Изменено в черновике» `edit`.
 *
 * Клавиатура: строка фокус не берёт — фокус держит поле поиска, стрелки водят активную строку (`active`), Enter выбирает;
 * это режим командной палитры (`naming.md`, «Такт 65»). Роль строки — `option`, активная — `aria-selected`.
 */
export type SearchResultType = 'setting' | 'field' | 'group' | 'step' | 'process' | 'showcase' | 'action' | 'query' | 'more' | 'filter'

export const SEARCH_RESULT_GLYPHS: Record<SearchResultType, IconName> = {
  setting: 'settings',
  field: 'article',
  group: 'layers',
  step: 'photo-camera',
  process: 'list',
  showcase: 'star',
  action: 'arrow-forward',
  query: 'schedule',
  more: 'more',
  filter: 'edit',
}
