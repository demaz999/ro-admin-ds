import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as PlayerAudio } from './PlayerAudio.vue'
export { default as PlayerButton } from './PlayerButton.vue'
export { default as PlayerVideo } from './PlayerVideo.vue'

/**
 * Кнопка плеера — мастер `ButtonPlayer` `6143:49984`, спека `6056:56215`.
 *
 * Пришла сюда из волны 2 решением от 2026-08-13: она медийная по природе и
 * уместнее рядом со своими компонентами, чем среди админских кнопок.
 *
 * ## Матрица целиком: 12 вариантов
 *
 * `Type` (`play` | `pause`) × `Size` (3) × `Disabled` — полный крест.
 *
 * | размер | сторона | радиус |
 * |---|---|---|
 * | `lg` | 128 | 64 |
 * | `md` | 80 | 40 |
 * | `sm` | 40 | 20 |
 *
 * Радиус во всех трёх — ровно половина стороны, то есть круг.
 *
 * ## Белая, но не сплошная
 *
 * Заливка белая при **прозрачности узла 0.88** — одинаково у всех размеров и
 * обоих состояний. Это не небрежность: кнопка лежит поверх кадра, и под ней
 * должно просвечивать изображение. Значение вынесено ступенью
 * `--opacity-media-control`.
 *
 * Выключенная гаснет до **0.32** — по тому же уровню, что залитая кнопка и
 * вкладка. Здесь два уровня Атома совпадают с ожиданием: плотная заливка
 * гасится сильно.
 */
export const playerButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full bg-card opacity-[var(--opacity-media-control)] outline-none disabled:opacity-[var(--opacity-disabled-strong)]',
  {
    variants: {
      size: {
        lg: 'size-32',
        md: 'size-20',
        sm: 'size-10',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

/**
 * Видеоплеер — мастер `PlayerVideo` `6922:58170`, спека `6403:56890`.
 *
 * Два размера: 640×360 с радиусом 24 и 400×225 с радиусом 16.
 *
 * > **Видео идёт в 16:9, а галерея и слайдшоу — в 16:10.** Проверено делением:
 * > 640/360 = 1.778, тогда как плитка галереи 320/200 = 1.6 и главный кадр
 * > слайдшоу 640/400 = 1.6. Две пропорции в одном разделе; отдано дизайнерам.
 *
 * Габариты в код не переносятся — переносится **пропорция и радиус**: внутри
 * мастера лежит служебный узел `Aspect ratio k` нулевой высоты, то есть
 * пропорция и там задана распоркой, а не размером.
 *
 * Кнопка по центру: 128 у крупного, 80 у мелкого.
 */
export const playerVideoVariants = cva('relative w-full overflow-hidden bg-muted', {
  variants: {
    size: {
      lg: 'rounded-3xl',
      md: 'rounded-xl',
    },
  },
  defaultVariants: { size: 'lg' },
})

export type PlayerButtonVariants = VariantProps<typeof playerButtonVariants>
export type PlayerVideoVariants = VariantProps<typeof playerVideoVariants>
