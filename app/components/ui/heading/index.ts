import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Heading } from './Heading.vue'

/**
 * Заголовок страницы и заголовок блока — такт 47, ворота владельца 2026-10-01 («Heading — да»). Мастера в ките 1 нет:
 * роль и ступени — по шкале кита.
 *
 * | `level` | тег | текст | провенанс |
 * |---|---|---|---|
 * | `page` | `h1` | 24/28 bold `--foreground` — ступень `text-2xl` | заголовок модального окна кита 24/28 bold (`modal_cards_header` `864:2747`); предложение владельца 24/32 — такой ступени нет |
 * | `section` | `h2` | 17/24 bold `--foreground` — ступень `text-lg` | ступень шкалы над подписью поля 15/20 bold (мастер `Field` `720:11753`); предварительно 18/24 — такой ступени нет, ближайшая 17/24 (16/20 почти не отличается от подписи поля) |
 *
 * `as` меняет тег без смены вида (например, `legend` у группы полей). Отступы задаёт потребитель — у заголовка их нет.
 *
 * Места экрана VA-9265: заголовок страницы «Свободная съёмка»; заголовки групп формы осмотра и формы повтора (через
 * `FieldSet`); «О кадре» и «Шаги осмотра» в правой панели просмотра. h1 страниц админки — после цели экрана.
 *
 * Правило базовой линии (такт 47, `naming.md`): в строке «заголовок + текст» элементы выравниваются по базовой линии
 * заголовка — `items-baseline` у строки.
 */
export const headingVariants = cva('m-0 font-bold text-foreground', {
  variants: {
    level: {
      page: 'text-2xl',
      section: 'text-lg',
    },
  },
  defaultVariants: { level: 'section' },
})

export type HeadingVariants = VariantProps<typeof headingVariants>
export type HeadingLevel = NonNullable<HeadingVariants['level']>
