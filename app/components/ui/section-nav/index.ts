import type { InjectionKey, Ref } from 'vue'

export { default as SectionNav } from './SectionNav.vue'
export { default as SectionNavAnchor } from './SectionNavAnchor.vue'
export { default as SectionNavItem } from './SectionNavItem.vue'

/**
 * Навигатор разделов страницы — такт 62, ворота владельца 2026-10-02 (`docs/scheme-edit.md`, раздел 8, карточка 3).
 * Мастера в ките 1 нет: источник вида — фрейм `SegmentedControl` макета страницы схемы `33516:5411`, `33545:5004`
 * (файл `U829JoK7KMZV8do3KNkWBh`).
 *
 * | что | значение | кит | макет |
 * |---|---|---|---|
 * | ширина | 266 | `--container-section-nav` | `33516:5411` — 266 |
 * | подложка | светлая | `--accent` | `33516:5411` — `#f7f9fc` |
 * | радиус, поля, зазор | 16, 2, 4 | `--radius-xl`, шаг 0.5, шаг 1 | `33516:5411` — 16, 2, 4 |
 * | заголовок | 17/24 bold, поля 8 / 16 / 2 / 16 | `text-lg` | `33649:9208`, `33649:9211` |
 * | строка раздела | 36, поля 8 / 16, 15/20 medium | `text-sm` | `33516:5413`, `33516:5447` |
 * | цвет строки | активная `--foreground`, остальные `--foreground-secondary` | роли | `33516:5414` — `#0e1e33`, `33516:5448` — `#567499` |
 * | якоря | отступ 16, строка 36, 15/20 medium | — | `33516:5415` — левое поле 16 |
 * | активный якорь | линия 2 слева `--primary`, текст `--foreground` | роль | `33516:5416` — обводка слева 2 `#0059cf` |
 * | разделитель разделов | линия 1 `--border-neutral`, поля 18 | роль | `33516:5429` — `#d0d4d8`, `33516:5428` — 18 |
 * | статус-точка | 6×6, круг | роли `success`, `warning`, `--foreground-disabled` | `33516:5440` — 6×6 `#8b939e` |
 *
 * Карточка ворот называла подложку `--muted` и цвет строк `--muted-foreground`: замер макета даёт `#f7f9fc` и
 * `#567499` — это значения ролей `--accent` и `--foreground-secondary`; взяты они.
 *
 * ## Статус-точка — единая система индикаторов
 *
 * `spec-audit.md`, «Единая система статус-индикаторов»: статус на разделе лаконичный — точка. `none` — точки нет;
 * `on` — раздел включён (`--success`); `off` — выключен (`--foreground-disabled`, как в макете); `attention` — раздел
 * требует внимания (`--warning`). Смысл точки дублируется подписью для чтения с экрана.
 *
 * ## Состояния
 *
 * В макете состояний строки нет. Наведение — `--foreground` у текста (правило «у всего интерактивного системное
 * наведение»); фокус — кольцо кита. Клавиатура: стрелки вверх и вниз переводят фокус между строками разделов,
 * Enter и пробел — переход (кнопка).
 */
export interface SectionNavContext {
  model: Ref<string>
  select: (value: string) => void
}
export const SECTION_NAV_KEY: InjectionKey<SectionNavContext> = Symbol('section-nav')
export type SectionNavStatus = 'none' | 'on' | 'off' | 'attention'
