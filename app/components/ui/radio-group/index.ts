import { cva } from 'class-variance-authority'

export { default as RadioGroup } from './RadioGroup.vue'
export { default as RadioGroupItem } from './RadioGroupItem.vue'

/**
 * Радиокнопка — мастер `RadioButton` `590:5372`, спека `590:5112`,
 * тёмный набор `593:5560`.
 *
 * Оси: `Checked` × `Disabled` = 4 варианта, перенесены все.
 *
 * Контрол 16×16, **эллипс**, а не скруглённый квадрат — проверено по типу узла.
 * В покое обводка 2px брендовым и пустая середина; отмеченный — брендовый круг
 * с белой точкой 8×8 по центру.
 *
 * Раскладка общая с `Checkbox`: контрол в строке 20, зазор 12, заголовок с
 * подписью. См. `../checkbox/index.ts`.
 *
 * В коде компонентов два: одиночной радиокнопки не бывает, выбор всегда из
 * группы — это каноническое разбиение shadcn, и оно же честнее по смыслу.
 *
 * ## Вариант `card` — такт 39 (решение агента, правило 21; нехватка в ките)
 *
 * Карточка режима окна запуска автораспределения VA-9265 (§12.1–12.2, прототип `.wmode`): название,
 * описание, прогноз; выключенная — с причиной в прогнозе. Состав и поведение — радиокнопка, поэтому
 * это ось подачи `variant="card"` и слоты `description` и `meta`, нового компонента нет (16.1, № 49).
 * Мастера карточки выбора у кита 1 и Атома нет — запрос дизайнерам в `figma-fixes.md`.
 *
 * | часть | кит | прототип |
 * |---|---|---|
 * | карточка | рамка 1 `--border-neutral` (утилита `border-stroke-neutral`), радиус 8 `--radius-md`, паддинг 12, фон `--card`, во всю ширину | `.wmode` рамка `#E1E7EF`, радиус 6, паддинг 10 / 12 |
 * | контрол → текст | 12 — раскладка строки мастера | 10 |
 * | отмеченная | рамка `--primary` и кольцо 1 `--primary` (2 в сумме), фон `--surface-selected` | рамка и тень 1 `#337AB7`, фон `#EDF3FA` |
 * | наведение | фон `--accent` у неотмеченной — правило владельца 2026-08-17 | — |
 * | выключенная | прозрачность `--opacity-disabled` 0.48 всего узла, как у строки | 0.5 |
 * | заголовок | 15/20 medium — заголовок строки мастера | `.wt` 13.5 bold |
 * | описание (`description`) | 13/16 `--foreground-secondary` | `.wd` 12.5 / 1.4 `#55677A` |
 * | прогноз (`meta`) | 13/16 medium `--primary` | `.wn` 12 600 `#2A6496` |
 * | строки текста | через 2 | 2 |
 */
export const choiceCardVariants = cva(
  'flex w-full items-start gap-3 rounded-md border border-stroke-neutral bg-card p-3 outline-none has-data-[state=checked]:border-primary has-data-[state=checked]:bg-surface-selected has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary',
  {
    variants: {
      disabled: {
        true: 'pointer-events-none opacity-[var(--opacity-disabled)]',
        false: 'cursor-pointer hover:not-has-data-[state=checked]:bg-accent',
      },
    },
    defaultVariants: { disabled: false },
  },
)
