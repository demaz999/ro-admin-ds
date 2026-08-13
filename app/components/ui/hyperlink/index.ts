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
export const hyperlinkVariants = cva(
  'inline-flex w-fit items-center border-b-2 border-accent-soft text-foreground-hover outline-none',
  {
    variants: {
      size: {
        md: 'text-sm',
        sm: 'text-xs',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

export type HyperlinkVariants = VariantProps<typeof hyperlinkVariants>
