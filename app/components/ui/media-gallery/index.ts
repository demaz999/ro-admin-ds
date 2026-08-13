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
