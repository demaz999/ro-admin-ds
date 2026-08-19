import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Menu } from './Menu.vue'
export { default as MenuItem } from './MenuItem.vue'
export { default as MenuPopover } from './MenuPopover.vue'
export { default as MenuSection } from './MenuSection.vue'
export { default as MenuSub } from './MenuSub.vue'

/**
 * Пункт меню — мастер `_MenuItemMaster` `3465:22566`, спека `832:20679`,
 * тёмный набор `1810:18826`.
 *
 * Подчёркивание в имени — конвенция Атома для внутренних частей. В коде это
 * полноценный компонент: именно он несёт иконку, подпись, счётчик и состояния.
 * Пункт **с подменю** — отдельная сущность `MenuSub`, см. `docs/naming.md`.
 *
 * ## Меню Атома светлое — и это ничего не меняет
 *
 * Мастер нарисован на белом: подпись `#525760`, выбранная `#1d222a`. Правило
 * тёмного сайдбара это **не отменяет**: с мастера берутся состав и геометрия,
 * цвет приходит из темы, а в rososmotr меню тёмное. Сверочные значения Атома
 * лежат в теме `atom`, чтобы наложение шло на родных цветах эталона.
 *
 * Правило порталов действует как обычно: всё, что вылетает из меню наружу —
 * подсказка, поповер подменю — живёт на светлых токенах, а не на `sidebar-*`.
 *
 * ## Матрица целиком: 6 вариантов
 *
 * `Compact` × `Selected` × `Disabled` дают формально восемь сочетаний,
 * нарисовано шесть: **выключенного выбранного не бывает** ни в компактном
 * режиме, ни в обычном.
 *
 * ## Подложка ходит плотностью, а не цветом
 *
 * Снято с таблицы состояний спеки, а не выведено по аналогии:
 *
 * | состояние | подложка | подпись |
 * |---|---|---|
 * | покой | **нет вовсе** | `#525760` |
 * | наведение | нейтраль **8%** | `#1d222a` |
 * | выбран | нейтраль **12%** — мягкая ступень | `#1d222a` |
 * | выключен | нет | прозрачность всего узла **0.32** |
 *
 * Наведение и выбор различаются **только плотностью подложки**: подпись у них
 * одна и та же. Те же две ступени уже перенесены для строки списка в волне 1 —
 * совпадение не случайное, а системное.
 *
 * ## Геометрия
 *
 * | | обычный | компактный |
 * |---|---|---|
 * | ширина | по контейнеру: 296 отдельно, **267** внутри подменю | **56** |
 * | высота | 44 | 44 |
 * | паддинги | 16 / 12 | 8 |
 * | зазор | 12 | — |
 *
 * Радиус 8 у обоих. Иконка 16. Подпись 16/20 Medium, обрезается многоточием.
 *
 * ## Счётчик меняет вид вместе с режимом
 *
 * Это не два разных пропа, а один `Show Bulb` с двумя отрисовками: в обычном
 * режиме — числовой счётчик 13/16 в брендовом цвете, в компактном — точка 8×8,
 * потому что числу там негде поместиться. Оба — `Indicator` из волны 4.
 *
 * > **Что не сверено наложением.** В мастере точка компактного режима лежит
 * > внутри сетки `Bulb+Arrow` с отступом 4 справа; в коде она позиционирована
 * > абсолютно. Совпадение по коробке проверено, точное положение точки — нет:
 * > в наложение вошли варианты без счётчика, потому что в мастере он выключен
 * > во всех шести. Строка в `docs/waves.md`.
 */
/**
 * ## Второй мастер: `left_menu` кита 1
 *
 * Такт 9. У сайдбара **два источника**, и они расходятся не в мелочах:
 *
 * | | Атом `_MenuItemMaster` `3465:22566` | кит 1 `menu_item` в `left_menu` `643:3053` |
 * |---|---|---|
 * | ширина полосы | 296 · компакт **56** | 256 · компакт **84** |
 * | высота пункта | 44 | **48** |
 * | радиус | 8 | **12** |
 * | паддинги | 16 / 12 | 8 снаружи + 4 внутри |
 * | зазор «иконка — подпись» | 12 | **8** |
 * | иконка | 16 | **20** |
 * | подпись | 16/20 Medium | **15/20**, Regular; выбранный — **Bold** |
 * | компактный режим | только иконка | иконка **и подпись 13/16** под ней |
 * | заливка выбранного | на самой кнопке | на **внутреннем узле** `it_content`, то есть с отступом 8 по бокам |
 *
 * Это не уточнение и не дубль: два кита рисуют меню по-разному. Поэтому в
 * коде **обе подачи живые**, ось `variant` — тот же приём, что у `TableHead`
 * с вариантом `column` кита 1 рядом с атомовскими и у `Hyperlink` с `accent`.
 *
 * Дефолт остаётся атомовским: на него сходится наложение волны 5. Каркас
 * админки собран на `kit1` — решение владельца, такт 9.
 *
 * Вопрос «схлопнуть ли две подачи в одну» — в `docs/open-questions.md`.
 */
export const menuItemVariants = cva(
  'group/menu-item relative flex w-full items-center outline-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled-strong)]',
  {
    variants: {
      /** Источник подачи: перенос Атома либо мастер кита 1. */
      variant: {
        atom: 'rounded-md text-base font-medium',
        // Заливка у кита 1 живёт на внутреннем узле, поэтому здесь только
        // коробка: высота 48, паддинг 8, радиус 12.
        kit1: 'h-12 rounded-lg px-2',
      },
      compact: { true: '', false: '' },
      selected: { true: '', false: '' },
    },
    compoundVariants: [
      // Атом: заливка и размеры на самой кнопке.
      { variant: 'atom', compact: true, class: 'h-11 w-14 justify-center p-2' },
      { variant: 'atom', compact: false, class: 'h-11 w-full gap-3 px-4 py-3' },
      { variant: 'atom', selected: true, class: 'bg-sidebar-active text-sidebar-active-foreground' },
      { variant: 'atom', selected: false, class: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground' },
    ],
    defaultVariants: {
      variant: 'atom',
      compact: false,
      selected: false,
    },
  },
)

/**
 * Внутренняя часть пункта у кита 1 — узел `it_content`. Именно она несёт
 * заливку, поэтому выбранная строка не доходит до краёв полосы на 8px с
 * каждой стороны. У Атома такого узла нет вовсе.
 */
export const menuItemContent = cva(
  'flex h-full min-w-0 flex-1 items-center justify-center rounded-lg px-1 transition-colors',
  {
    variants: {
      compact: { true: '', false: 'gap-2' },
      selected: {
        true: 'bg-sidebar-active font-bold text-sidebar-active-foreground',
        false: 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      },
    },
    defaultVariants: { compact: false, selected: false },
  },
)
export type MenuItemVariants = VariantProps<typeof menuItemVariants>
export type MenuItemContentVariants = VariantProps<typeof menuItemContent>
