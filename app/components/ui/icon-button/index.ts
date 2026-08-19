import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as IconButton } from './IconButton.vue'

/**
 * Иконочная кнопка. Источник двухчастный:
 *
 * - **мастер** `ButtonSimple` `110:1566` — 186 вариантов, самый крупный в файле;
 * - **спецификация** `106:397`, тёмный набор `348:2700`.
 *
 * Это **отдельный компонент**, а не режим `Button` без текста: у Атома два
 * разных мастера, и текстового пропа здесь нет вовсе.
 *
 * ## Оси и почему 186 стали 42
 *
 * Type `primary|secondary|light|transparent` × Size (3) × Rounded × **Color (9)**
 * × Disabled. Цветовая ось не переносится — берётся брендовая колонка `rocky`.
 *
 * Мастер неполон по осям, и это видно по покрытию: `secondary` и `light`
 * цветовой оси **не имеют** (по 2 варианта на сочетание вместо 18), а
 * `transparent` существует только с `Rounded=false`. Итог в коде: 42 сочетания.
 *
 * ## Размеры
 *
 * | размер | бокс | глиф | радиус |
 * |---|---|---|---|
 * | `lg` (`larishae`) | 40 | **20** | 8 |
 * | `md` (`monithei`) | 32 | 16 | 6 |
 * | `sm` (`spelino`) | 24 | 16 | 4 |
 *
 * Глиф у большого размера 20, у остальных 16 — то есть у малой кнопки он
 * занимает две трети бокса, а не половину.
 *
 * `Rounded=true` даёт радиус в половину бокса, то есть круг.
 *
 * ## Типы
 *
 * Заливка в мастере лежит не на корне, а на вложенном прямоугольнике; у типа
 * `transparent` этого прямоугольника **нет вовсе**, а не задан прозрачным.
 *
 * | Атом | в коде | заливка | глиф |
 * |---|---|---|---|
 * | `primary` | `default` | брендовая | белый |
 * | `secondary` | `secondary` | брендовая 12% | брендовый |
 * | `light` | `elevated` | белая | брендовый |
 * | `transparent` | `ghost` | нет | брендовый |
 *
 * `ghost` здесь законен, в отличие от текстовой кнопки: у иконочной он **есть
 * в мастере** отдельным типом. Решение «ghost не заводить» касалось `Button`,
 * где такого типа нет и выдумывать его было бы нечем.
 *
 * ## Пятый тип пришёл из кита 1: `service`
 *
 * У Атома все четыре типа красят глиф **брендовым**. Сервисная кнопка кита 1 —
 * `btn_service` — не такая: фона нет, глиф на `fg/secondary` `#567499`. Это не
 * акцент, а служебное действие рядом с содержимым.
 *
 * Замер по трём инстансам одного и того же `btn_service` в дашборде
 * (`U829JoK7KMZV8do3KNkWBh`): бокс везде **24**, меняется только глиф.
 *
 * | Где | node id | глиф | видимый контур |
 * |---|---|---|---|
 * | подсказка у «Автообновление списка» | `20304:54644` | `24_ic_help` | 20×20 |
 * | обновление списка у поиска | `I19601:29062;814:28510` | `24_ic_refresh` | 16×16 |
 * | настройка колонок в шапке таблицы | `I19849:48088;957:5257;325:7207` | `24_settings` | 17.997×**19** |
 *
 * Цвет снят не с подписи, а из самих выгруженных глифов: `fill="#567499"` во
 * всех трёх. Описание держателя в файле — «для сервисных кнопок».
 *
 * Наведения макет не рисует. Взята ступень эталонной кнопки «?» со страницы:
 * глиф уходит на `--foreground`. Решение владельца от 2026-08-18, такт 7 — то
 * же правило «у всего интерактивного системное наведение».
 *
 * ## Шестой тип — для тёмного сайдбара
 *
 * `sidebar` заведён тактом 8 под кнопку-бургер у логотипа. Отдельный тип нужен
 * не ради вида, а ради **правила порталов сайдбара**: внутри тёмной полосы
 * легальны только `sidebar-*`-токены, а все пять типов выше стоят на светлых.
 * Заливка и цвет наведения взяты у соседнего пункта меню, чтобы кнопка не
 * заводила собственную ступень.
 */
export const iconButtonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center outline-none select-none disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed',
        // Наведение у этих двух в мастере не нарисовано — добавлено решением
        // владельца от 2026-08-17 «у всего интерактивного системное наведение».
        // Ступень взята у тональной кнопки: та же поверхность, что у secondary.
        elevated: 'bg-field-elevated text-secondary-foreground hover:bg-secondary-hover',
        ghost: 'bg-transparent text-secondary-foreground hover:bg-secondary',
        /**
         * `btn_service` кита 1: фона нет, глиф служебный, а не брендовый.
         * Наведение — ступень основного текста, эталон кнопки «?».
         */
        service: 'bg-transparent text-foreground-secondary hover:text-foreground',
        /**
         * Иконочная кнопка **внутри тёмного сайдбара**: там легальны только
         * `sidebar-*`-токены. Ступень наведения не выдумана — она снята с
         * состояний `_MenuItemMaster` `3465:22566`, то есть кнопка ведёт себя
         * ровно как соседний пункт меню.
         */
        sidebar: 'bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      },
      size: {
        lg: 'size-10',
        md: 'size-8',
        sm: 'size-6',
      },
      /** Ось `Rounded` мастера: радиус в половину бокса, то есть круг. */
      rounded: {
        true: 'rounded-full',
        false: '',
      },
    },
    compoundVariants: [
      // Радиус зависит от размера и есть только у неокруглённых.
      { size: 'lg', rounded: false, class: 'rounded-md' },
      { size: 'md', rounded: false, class: 'rounded-sm' },
      { size: 'sm', rounded: false, class: 'rounded-xs' },
      // Гашение как у текстовой кнопки: залитая сильнее, остальные мягче.
      { variant: 'default', class: 'disabled:opacity-[var(--opacity-disabled-strong)]' },
      { variant: 'secondary', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'elevated', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'ghost', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'service', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'sidebar', class: 'disabled:opacity-[var(--opacity-disabled)]' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: false,
    },
  },
)

export type IconButtonVariants = VariantProps<typeof iconButtonVariants>
