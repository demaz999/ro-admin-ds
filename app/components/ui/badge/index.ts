import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

/**
 * Бейдж — мастер `Badge` `913:8279`, спека `913:8173`, тёмный набор `6976:58811`.
 *
 * **Это текстовая метка, и только.** Иконки у бейджа Атома нет вовсе — в отличие
 * от бейджа кита 1, где она была обязательной частью состава. Наш иконочный
 * бейдж ждёт в архиве до фазы обогащения.
 *
 * ## Матрица целиком: 20 вариантов
 *
 * Ось `Inversion` **не независима**: она намертво связана с белой колонкой —
 * белый вариант существует только при `Inversion=true`, остальные девять только
 * при `false`. Ровно та же связка, что у `Size` и `Rounded` у `Input`. Поэтому
 * отдельного пропа `inversion` нет: инверсия — это роль `inverse`.
 *
 * 10 колонок × 2 размера = 20. В коде **6 ролей × 2 размера = 12 сочетаний**.
 *
 * ## Какие колонки перенеслись и почему именно эти
 *
 * По границе решения 23 (2026-08-13): у индикаторных компонентов цвет — это
 * семантика. Отбор идёт **по сообщаемой роли**, а не по полноте рампы.
 *
 * | колонка мастера | роль | что сообщает |
 * |---|---|---|
 * | брендовая | `default` | ничего сверх принадлежности |
 * | зелёная | `success` | операция завершилась |
 * | оранжевая | `warning` | нужно внимание |
 * | красная | `destructive` | ошибка |
 * | серая | `neutral` | сообщения нет, это фон разговора |
 * | белая | `inverse` | метка поверх тёмного или цветного |
 *
 * **Четыре колонки не перенесены** — розовая, фиолетовая, бирюзовая и жёлтая.
 * Роли за ними не стоит: это различение, а не сообщение. Нужен цветной бейдж
 * ради различения — берётся расширенная палитра `palette-01..06` по её
 * правилам. Разбор «роль против палитры» — в `docs/naming.md`, он написан для
 * дизайнеров.
 *
 * ## Геометрия
 *
 * | размер | высота | паддинг | кегль |
 * |---|---|---|---|
 * | `md` (`psamiaphe`) | 24 | 12 | 13/16 Regular |
 * | `sm` (`arasine`) | 16 | 8 | 10/12 Regular |
 *
 * Радиус 16 у обоих. У малого это пилюля, у крупного — нет: 16 меньше половины
 * от 24. Начертание **Regular**, не Bold: в ките 1 бейдж был жирным, у Атома нет.
 */
export const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center rounded-xl font-normal whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        success: 'bg-success text-primary-foreground',
        warning: 'bg-warning text-primary-foreground',
        destructive: 'bg-destructive text-primary-foreground',
        neutral: 'bg-muted-foreground text-primary-foreground',
        // Единственная роль, где подложка светлая, а текст тёмный.
        inverse: 'bg-background text-foreground',
      },
      size: {
        md: 'h-6 px-3 text-xs',
        sm: 'h-4 px-2 text-3xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

/**
 * ## Вид `appearance="outline"` — метка-контур, такт 80 (решение агента, правило 21; нехватка в ките)
 *
 * Метки режима и признаков на странице тарификации — контуры (Figma `31175:4820`, 10 меток): высота 20, поля 2 / 8,
 * радиус полный, рамка 1 и текст 12/16 одного тона, заливки нет. Мастера контура у `Badge` нет; состав — тот же текстовый
 * бейдж, поэтому контур — ось вида существующего компонента (`docs/tariffs.md`, раздел 5, № 28; раздел 9).
 *
 * | часть | кит | макет |
 * |---|---|---|
 * | высота | 20 (`h-5`) | 20 |
 * | поля | 8 по бокам | 2 / 8 |
 * | радиус | полный | полный |
 * | кегль | 12/16 regular (`text-2xs`) | 12/16 |
 * | рамка | 1, тон роли | 1, тон метки |
 *
 * Тон — те же шесть ролей. Текст тёмной ступенью тона там, где она есть в теме: 12/16 на белом и на `--accent` держит
 * контраст 4.5:1.
 *
 * | роль | рамка | текст |
 * |---|---|---|
 * | `default` | `--primary` | `--primary` |
 * | `success` | `--success` | `--success-strong` |
 * | `warning` | `--warning` | `--warning-strong` |
 * | `destructive` | `--destructive` | `--destructive-strong` |
 * | `neutral` | `--foreground-secondary` | `--foreground-secondary` — `secondary/default` макета у «N схемы» |
 * | `inverse` | `--background` | `--background` |
 *
 * Цвета меток макета из расширенной палитры (`status-01`, `-02`, `-03`, `-06`, `#d461ba`) не берутся: метки стоят на
 * семантических ролях (строка 25 реестра `docs/tariffs.md`, решение оркестратора 3 промпта такта 80).
 */
export const badgeOutlineVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center rounded-full border bg-transparent px-2 text-2xs font-normal whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-primary text-primary',
        success: 'border-success text-success-strong',
        warning: 'border-warning text-warning-strong',
        destructive: 'border-destructive text-destructive-strong',
        neutral: 'border-foreground-secondary text-foreground-secondary',
        inverse: 'border-background text-background',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

/**
 * ## Изменения после передачи
 *
 * Правило 23 `docs/chat-protocol.md`: каждое изменение переданного компонента маркируется здесь, в `CHANGELOG.md` и в
 * «Передано фронтам»; живые примеры — стенд `/kit-changes`. `Badge` передан фронтам 2026-09-30.
 *
 * ### Черновик следующей версии — относительно `handover-2026-10-02`
 *
 * - **Добавлено.** Метка-контур: высота 20, поля 8 по бокам, радиус полный, рамка 1 и текст 12/16 regular тона роли, заливки
 *   нет; у `success`, `warning`, `destructive` текст — тёмная ступень тона (`--*-strong`), у `neutral` — `--foreground-secondary`.
 *   Размер у контура один. Залитая метка прежняя. API: проп `appearance` — `filled` по умолчанию, `outline`. Такт 80.
 */
