import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as FileUpload } from './FileUpload.vue'

/**
 * Область загрузки — мастер `Uploader` `1572:10113`, спек-фреймов **пять**:
 * `1413:9683`, `6861:57302`, `6861:57612`, `6861:57814`, `1919:12600`.
 *
 * ## Снаружи все четыре состояния одинаковы
 *
 * Замер контейнера дал одно и то же во всех вариантах: 320×88, радиус 8,
 * заливки нет, рамка **пунктирная 1px** с штрихом 2/4, прозрачность узла 1.
 *
 * Состояние живёт **целиком внутри**, в двух надписях. Это важно знать заранее:
 * искать различие в контейнере бесполезно, его там нет.
 *
 * ## Гашение подменой цвета — третий механизм у Атома
 *
 * | состояние | заголовок | подпись |
 * |---|---|---|
 * | `default` | основной текст | приглушённая — «до 5 файлов…» |
 * | `error` | основной текст | **красная** — «Ошибка загрузки…» |
 * | `uploaded` | **приглушённый** | **зелёная** — «Вы уже загрузили максимум…» |
 * | `disabled` | приглушённый | приглушённая |
 *
 * Ни контейнер, ни текстовые узлы прозрачности не меняют — она равна 1 везде.
 * То есть выключенное состояние здесь сделано **подменой цвета**, тогда как у
 * кнопок это прозрачность 0.32, а у полей 0.48. Третий способ для одного и того
 * же состояния; строка в `docs/atom-inconsistencies.md`.
 *
 * ## `uploaded` — не ошибка и не успех, а исчерпанный лимит
 *
 * Имя варианта в мастере — `uploaded/disabled`, подпись зелёная, заголовок
 * приглушён. То есть контрол выключен, но сообщение **положительное**: загружать
 * больше нельзя, потому что всё уже загружено. Поэтому подпись идёт по роли
 * `success`, а заголовок — по приглушённой, и это не противоречие.
 *
 * ## Геометрия
 *
 * Внешняя коробка 320×88, внутренний блок 288×56 по центру, то есть отступ 16
 * со всех сторон. Объявленные в мастере паддинги 40 сверху и снизу к раскладке
 * **не применяются** — дочерний фрейм занимает всю коробку целиком.
 */
export const fileUploadVariants = cva(
  'flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-muted-foreground p-4 text-center',
  {
    variants: {
      state: {
        default: '',
        error: '',
        uploaded: '',
        disabled: 'pointer-events-none',
      },
    },
    defaultVariants: { state: 'default' },
  },
)

/** Цвет заголовка и подписи по состоянию. Гашение здесь — подмена цвета. */
export const fileUploadTitle: Record<string, string> = {
  default: 'text-foreground',
  error: 'text-foreground',
  uploaded: 'text-muted',
  disabled: 'text-muted',
}

export const fileUploadHint: Record<string, string> = {
  default: 'text-muted-foreground',
  error: 'text-destructive',
  uploaded: 'text-success',
  disabled: 'text-muted',
}

export type FileUploadVariants = VariantProps<typeof fileUploadVariants>
