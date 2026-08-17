import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as StatusBadge } from './StatusBadge.vue'

/**
 * Статусная плашка — **фаза обогащения**, вернулась из архива без изменений
 * состава: `archive/kit1-components/ui/status-badge/`.
 *
 * Источник — компонент `status` кита 1: точка 8×8 радиуса 2, контейнер высотой
 * 20, зазор 8, подпись 15/20 Medium.
 *
 * **В Атоме такой сущности нет.** Ближайшее — `_TextStatus` `5868:53919` и
 * `_BulbStatus` `5862:53423`, но у обоих единственная ось цветовая, и волна 7
 * решила не заводить их компонентами: без цветовой оси от них остаётся текст.
 * Здесь ось цвета как раз и есть смысл, поэтому компонент нужен.
 *
 * ## Почему цвет отдельным пропом, а не значением `variant`
 *
 * Раскладка цветов **иллюстративная**: она повторяет текущие макеты, чтобы
 * прототипы рендерились цветными. В продукте статусные цвета приходят **с
 * сервера вместе с данными** — при интеграции здесь будет мапинг из данных, а
 * не выбор цвета руками.
 *
 * Отсюда два следствия, оба сознательные:
 *
 * 1. цвет живёт **отдельным пропом**, а не в общем `variant`: `variant`
 *    означал бы, что вид выбирает автор страницы, а он придёт из данных;
 * 2. значения сидят на **расширенной палитре** `palette-01..06`, а не на
 *    семантических ролях. Это тот самый случай «различение, а не сообщение»,
 *    описанный в `docs/naming.md`: статусов в продукте больше шести, они
 *    заводятся в справочнике, и семантики `success`/`warning` за ними нет.
 *
 * Имя `cyan` вместо китового `grey` — в ките 1 ошибка: вариант с именем `grey`
 * красится в бирюзовый. Разбор — `docs/open-questions.md`, вопрос 12.
 */
export const statusBadgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap text-foreground',
)

export const statusDotVariants = cva('size-2 shrink-0 rounded-2xs', {
  variants: {
    color: {
      green: 'bg-palette-01',
      cyan: 'bg-palette-02',
      violet: 'bg-palette-03',
      magenta: 'bg-palette-04',
      orange: 'bg-palette-05',
      red: 'bg-palette-06',
    },
  },
  defaultVariants: { color: 'green' },
})

export type StatusDotVariants = VariantProps<typeof statusDotVariants>
