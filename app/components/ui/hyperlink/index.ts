import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Hyperlink } from './Hyperlink.vue'

/**
 * Ссылка — мастер `ButtonLink` `5792:97292`, спека `1521:9814`,
 * тёмный набор `5792:97479`.
 *
 * ## Почему не `Link`
 *
 * Имя `Link` совпадает с нативным тегом `<link>` — пустым элементом, который не
 * может иметь потомков. Компонент под этим именем не резолвится, браузер
 * схлопывает его в void-элемент и **молча выбрасывает содержимое**: ни ошибки,
 * ни предупреждения, просто пусто. Поймано наложением.
 *
 * `Hyperlink` — не выдумка ради обхода: внутренний слой мастера так и называется,
 * `Hypertext link`.
 *
 * Оси: Size `salamis|xanthe` × **Color (8)**.
 *
 * ## Цветовая ось красит подчёркивание, а не текст
 *
 * Это единственный компонент семейства, где так. Текст во **всех восьми**
 * колонках один и тот же — `#1d222a`; меняется только цвет линии под ним.
 * Проверено по всем восьми вариантам, а не по одному.
 *
 * Сама ось — **другая рампа**, не та, что у кнопок: `alien`, `drive`, `snatch`,
 * `indiana`, `pulpfiction`, `seven`, `shershaah`, `mummy`. Значения пастельные;
 * та же рампа несёт маркер тега. По решению 23 ось не переносится, берётся
 * брендовая колонка — здесь это `alien`, пастельный синий.
 *
 * ## Геометрия
 *
 * | размер | кегль | высота |
 * |---|---|---|
 * | `md` (`salamis`) | 16 | 20 |
 * | `sm` (`xanthe`) | 13 | 16 |
 *
 * Подчёркивание — **отдельный слой 2px** во всю ширину, а не `text-decoration`.
 * Поэтому в коде это граница снизу: браузерное подчёркивание тоньше и сидит
 * ближе к тексту.
 */
/**
 * ## Два вида ссылки, и оба из файлов
 *
 * `underline` — мастер `ButtonLink` `5792:97292` Атома: подчёркивание отдельным
 * слоем 2px, поэтому в коде это граница, а не `text-decoration`.
 *
 * `accent` — `text_link` **кита 1**, замер с карточки осмотра
 * `20304:54626`: 15/20 **Bold**, цвет `accent/default`, `textDecoration: NONE` —
 * подчёркивания нет вовсе. Это заголовок карточки списка и вообще любая ссылка,
 * которая работает заголовком строки, а не врезкой в текст.
 *
 * Подчёркивание снимается **видом**, а не переопределением на странице: иначе
 * каждая сборка гасит границу по-своему.
 *
 * ## Наведение
 *
 * Своё наведение есть у обоих видов. Плюс вид `accent` реагирует на наведение
 * **карточки целиком** — через именованную группу `card`: правило «карточка →
 * ховер заголовка», решение владельца от 2026-08-18, см. `docs/naming.md`.
 */
export const hyperlinkVariants = cva(
  'inline-flex w-fit items-center outline-none transition-colors',
  {
    variants: {
      variant: {
        underline: 'border-b-2 border-accent-soft text-foreground-hover hover:border-primary hover:text-primary',
        accent: 'font-bold text-primary hover:text-primary-hover group-hover/card:text-primary-hover',
      },
      size: {
        md: 'text-sm',
        sm: 'text-xs',
      },
    },
    defaultVariants: {
      variant: 'underline',
      size: 'md',
    },
  },
)

export type HyperlinkVariants = VariantProps<typeof hyperlinkVariants>
