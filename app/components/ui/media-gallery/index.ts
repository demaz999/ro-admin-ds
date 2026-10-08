import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as MediaGallery } from './MediaGallery.vue'
export { default as MediaGalleryItem } from './MediaGalleryItem.vue'
export { default as Slideshow } from './Slideshow.vue'

/**
 * Галерея — мастера `MediaGallery` `6734:62674` и `_MediaGalleryItem`
 * `6734:62222`, спека `6333:55360`.
 *
 * ## Плитка: три размера, одна пропорция
 *
 * | размер | плитка | радиус | зазор |
 * |---|---|---|---|
 * | `lg` | 320×200 | 24 | 24 |
 * | `md` | 176×110 | 16 | 16 |
 * | `sm` | 112×70 | 8 | 8 |
 *
 * Пропорция у всех трёх **одна и та же — 16:10**: 320/200, 176/110 и 112/70
 * дают 1.6 бит в бит. Радиус и зазор растут вместе с плиткой, пропорция нет.
 *
 * Поэтому в код переносятся **радиус, зазор и пропорция**, а ширину задаёт
 * раскладка: ось `Brakepoint` — снимки, как у `NavigationTile` и `Banner`.
 *
 * ## Две находки в оси `Brakepoint`
 *
 * 1. **`middle` шире, чем `wide`**: у крупного размера 1064 против 976.
 *    Средний брейкпоинт шире широкого — противоречие в самих числах.
 * 2. **У мелкого размера брейкпоинт не влияет вовсе**: все три значения дают
 *    472×70. Ось есть, а различия нет.
 *
 * Обе отданы дизайнерам. На перенос не влияют — габариты и так не переносятся.
 *
 * ## Тип `more` — это плитка «показать все»
 *
 * Ось `Type` у плитки имеет значения `default` и `more`. Отдельный мастер
 * `ButtonGallery` `842:13505` — та же роль: 150×96, радиус 16, заливка
 * `#eaecf0`, подпись «Показать все» кеглем 13 Medium.
 *
 * В коде это **не отдельный компонент**, а проп плитки: `more` меняет
 * содержимое, а не сущность.
 */
export const galleryItemVariants = cva('relative overflow-hidden bg-muted', {
  variants: {
    size: {
      lg: 'rounded-3xl',
      md: 'rounded-xl',
      sm: 'rounded-md',
    },
  },
  defaultVariants: { size: 'md' },
})

/**
 * ## Такт 87: выбор, подпись, просмотр крупно — оси плитки (решение агента, правило 21; строка реестра `docs/scheme-edit.md`)
 *
 * Каталог фото-подсказок страницы схемы (`docs/scheme-edit-review.md`, 4.3; решение 4 оркестратора 2026-10-08: сетка — на
 * `MediaGallery`) выбирает несколько подсказок и смотрит каждую крупно. В мастере `_MediaGalleryItem` и на спеке `6333:55360`
 * выбора нет — только наведение (приближение 105 % за 0.3 с и затемнение 16 %); прецедент выбора плитки в ките — `FrameTile`
 * (такты 30, 52). Лестница правила 20: существующий компонент с новой осью.
 *
 * | ось | вид | источник |
 * |---|---|---|
 * | `selectable` | плитка — флажок (`role="checkbox"`, Tab, пробел и Enter); `Checkbox on-image` в левом верхнем углу: зона 32, отступ 6 | `FrameTile`, такт 52 |
 * | `selected` | рамка 1 `--border-accent` слоем поверх картинки и кольцо 2 `--secondary-hover` | `FrameTile selected` |
 * | наведение плитки выбора | тень `--shadow-elevated`; картинка приближается в 1.04 за `--duration-zoom` | `FrameTile`; `Image zoom` (решение владельца 2026-08-18 вместо 105 % / 0.3 с спеки) |
 * | `disabled` | вся плитка на `--opacity-disabled`, выбор не переключается | ступень выключенного кита |
 * | `openLabel` | кнопка в правом верхнем углу: плашка 28 `--scrim-dark`, глиф `fullscreen` 16 белым; на наведении и в фокусе; событие `open` | `FrameTile`, «во весь экран» |
 * | слоты `title`, `subtitle` | подпись под картинкой через 8: 13/16 medium `--foreground` и 13/16 `--muted-foreground`, в строку с многоточием | ступени текста кита; подписи у плитки в мастере нет |
 *
 * Фокус с клавиатуры — кольцо 2 `--ring` у картинки. Затемнение 16 % спеки не перенесено: углы плитки несут свои плашки.
 * Без новых осей и слотов разметка прежняя — корень и есть картинка.
 */
export const galleryMediaSelected = 'ring-2 ring-secondary-hover after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-stroke-accent'

export const galleryVariants = cva('flex w-full flex-wrap', {
  variants: {
    size: {
      lg: 'gap-6',
      md: 'gap-4',
      sm: 'gap-2',
    },
  },
  defaultVariants: { size: 'md' },
})

export type GalleryItemVariants = VariantProps<typeof galleryItemVariants>
