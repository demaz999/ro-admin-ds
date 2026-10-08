export { default as ThumbStrip } from './ThumbStrip.vue'

/** Миниатюра полосы: картинка и подпись для подсказки и чтения с экрана. */
export interface ThumbStripItem {
  src: string
  label: string
}

/**
 * Полоса миниатюр — такт 87. Карточка 10 `docs/scheme-edit.md`, раздел 8: ворота открыты заранее решением 7 оркестратора
 * 2026-10-08 для одной роли — миниатюры фото-подсказок в ячейке шага, — если `MediaGallery` и `Image` её не закрывают.
 * Лестница правила 20 — раздел 5 того же документа.
 *
 * ## Роль
 *
 * Ряд миниатюр изображений с хвостом «+N» в ячейке таблицы: фото-подсказки шага (ревью `docs/scheme-edit-review.md`, Ш-5 —
 * «статус числом без превью: непонятно, что увидит исполнитель»). Нажатие по миниатюре — просмотр крупно (`open` с номером),
 * по хвосту — первая скрытая миниатюра.
 *
 * ## Состав — макет `32765:6716`…`32765:6721` (файл `U829JoK7KMZV8do3KNkWBh`)
 *
 * | часть | кит | макет |
 * |---|---|---|
 * | миниатюра | 28 × 20 (`w-7 h-5`), картинка — `object-fit: cover` | `Container` 27.99 × 20 |
 * | радиус | 4 (`--radius-xs`) | 4 |
 * | подложка | `--muted` | `#e8e9ec` — `neutral/soft` |
 * | рамка | 1 `--border` слоем поверх картинки (в раскладке не участвует — прецедент `StepThumb`, такт 58) | 0.65 `#ccdef5` — `border/default` в масштабе кадра |
 * | зазор | 4 | 4 (`itemSpacing`) |
 * | хвост «+N» | 12/16 regular `--foreground-secondary`, поле сверху 3 | «+2» 12/16 PT Root UI Regular `#567499`, поле сверху 3 |
 *
 * Состояния — кнопки кита: наведение — рамка `--border-accent`, у хвоста — текст `--foreground`; фокус с клавиатуры —
 * кольцо 2 `--ring`. Подсказка миниатюры — её подпись (`Tooltip` кита).
 *
 * ## Почему не существующие
 *
 * `Image` — только пропорция из шести (7:5 среди них нет), радиуса и рамки нет по замыслу мастера: скругление задаёт тот,
 * кто ставит картинку, а страница классов вида не несёт. `MediaGalleryItem` — пропорция 16:10 у всех размеров (28 × 17.5 —
 * дробный пиксель), радиусы 24 / 16 / 8, «показать все» — плитка, хвост макета — текст «+N». `StepThumb` — 80 × 60 с половинами наведения
 * «глаз» и крестик. `Avatar` — круг.
 */
export const thumbStripItem = 'relative h-5 w-7 shrink-0 overflow-hidden rounded-xs bg-muted outline-none transition-colors after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-border hover:after:border-stroke-accent focus-visible:ring-2 focus-visible:ring-ring'
