import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as FeedNote } from './FeedNote.vue'

/**
 * Заметка в ленте — голосовой комментарий или текстовая заметка (§8.4, № 25). Такт 43, порция П6; карточка 5
 * плана такта 37 (`docs/free-shoot.md`, 16.3), ворота 2026-09-30: «да», строка воспроизведения — `PlayerAudio` кита.
 * Мастера в ките 1 нет: состав — прототип v17 (`voiceHTML`), вид — роли кита.
 *
 * | Часть | Кит | Прототип v17 |
 * |---|---|---|
 * | полоса | во всю ширину ленты (`col-span-full`), радиус `--radius-lg`, поля 12 / 10 | `.card.voice` `grid-column: 1/-1`, радиус 10, поля 13 / 10 |
 * | тон голосовой | заливка `--secondary`, подпись типа `--primary` — брендовые роли | `#F6F3FC`, рамка `#E1D8F3`, полоса слева 3 `#6949A8` |
 * | тон текстовой | заливка `--warning-surface`, подпись `--warning-strong` | `#FDF7EA`, рамка `#EFE1BE`, полоса слева `--warn`, подпись `#8A5A0B` |
 * | подпись типа | 12/16 полужирная прописными | `.vt` 10.5 bold uppercase, разрядка .05em |
 * | время | 12/16 `--muted-foreground` | `.vm` 11.5 `--muted` |
 * | воспроизведение голосовой | `PlayerAudio` (решение ворот 5): кнопка, имя файла, длительность | круглая кнопка 30 `#6949A8` слева, длительность в строке типа, волна 80 столбиков под текстом |
 * | кнопка текстовой | `IconButton` ghost sm, глиф `article` | та же круглая кнопка 30 на `--warn`, глиф листа |
 * | расшифровка | 15/20 `--foreground`, выделяется мышью; длинная — две строки с многоточием | `.vx` 13.5 / 1.45, `-webkit-line-clamp: 2` |
 * | действия | `ButtonAction` sm без глифа: «Показать полностью» / «Свернуть» — от 110 знаков, «Копировать» | `.copy` 12, белая с рамкой |
 *
 * Волна прототипа не переносится: строку воспроизведения несёт `PlayerAudio`, у мастера волны нет (строка реестра
 * расхождений, «вид по системе»).
 *
 * Выделение текста в расшифровке (§8.5) — событие `select-text`: выделенное от 2 до 120 знаков и его прямоугольник в окне;
 * полосу «Новый объект» ставит страница (`ActionBar`, второе размещение).
 */
export const feedNoteVariants = cva('col-span-full flex flex-col gap-2 rounded-lg px-3 py-2.5', {
  variants: {
    kind: {
      voice: 'bg-secondary',
      note: 'bg-warning-surface',
    },
  },
  defaultVariants: { kind: 'voice' },
})

export type FeedNoteVariants = VariantProps<typeof feedNoteVariants>
export type FeedNoteKind = NonNullable<FeedNoteVariants['kind']>
/** Выделенный фрагмент расшифровки: текст и прямоугольник выделения в координатах окна. */
export interface FeedNoteSelection { text: string, rect: { left: number, top: number, width: number, height: number } }
