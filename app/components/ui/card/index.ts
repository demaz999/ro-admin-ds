import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Card } from './Card.vue'

/**
 * Поверхность блока на странице настроек — такт 62, ворота владельца 2026-10-02 (`docs/scheme-edit.md`, раздел 8,
 * карточка 1). Мастера в ките 1 нет: источник вида — фрейм `CardBody` макета страницы схемы.
 *
 * | что | значение | кит | макет (файл `U829JoK7KMZV8do3KNkWBh`) |
 * |---|---|---|---|
 * | радиус | 24 | `--radius-2xl` | `33004:2902`, `32875:1966` — 24 |
 * | поля | 24 | шаг 6 | `33004:2902` — 24 со всех сторон |
 * | фон `default` | белый | `--card` | `33004:2902` — `#ffffff` |
 * | рамка `default` | 1 | `--border` | в макете рамки нет: карточка белая на серой странице `#eef1f5` (`32774:1876`) |
 * | фон `muted` | светлая подложка | `--accent` | вложенная форма `33470:14028`, `32765:11599` — `#f7f9fc` |
 *
 * **Рамка — решение агента, ночной режим (такт 62).** Рабочая зона каркаса `layouts/admin.vue` белая (такт 48):
 * белая карточка макета на ней не видна. Поверхность отделена рамкой `--border` — прецедент `RepeatCard`
 * (`rounded-md border border-border bg-card`). Строка реестра расхождений — `scheme-edit.md`, раздел 11.
 *
 * Зазоры содержимого задаёт потребитель классами раскладки (`flex flex-col gap-*`): в макете между группами внутри
 * карточки стоит 32 (`33004:2902`), между строками группы — 8 и 16. Заголовок группы — `Heading level="group"`.
 *
 * Состояний у поверхности нет: наведения, нажатия и фокуса блок настроек не несёт.
 */
export const cardVariants = cva('rounded-2xl p-6', {
  variants: {
    tone: {
      default: 'border border-border bg-card text-card-foreground',
      muted: 'bg-accent text-accent-foreground',
    },
  },
  defaultVariants: { tone: 'default' },
})

export type CardVariants = VariantProps<typeof cardVariants>
