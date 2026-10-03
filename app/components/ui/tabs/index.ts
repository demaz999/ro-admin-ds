import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Tabs } from './Tabs.vue'
export { default as TabsContent } from './TabsContent.vue'
export { default as TabsList } from './TabsList.vue'
export { default as TabsTrigger } from './TabsTrigger.vue'

/**
 * Вкладки — мастера `Tabs` `1782:13075` и `_Tab` `1772:11731`, спека `1092:8943`.
 *
 * ## Два несводимых вида, как и в ките 1
 *
 * Ось `Rounded` разводит их полностью — это не скругление, а другой компонент:
 *
 * | | `line` (`Rounded=false`) | `pill` (`Rounded=true`) |
 * |---|---|---|
 * | таб | 85×32, без фона и паддингов | 117×40, паддинги 10/16, радиус 20 |
 * | активный | линия 4px под текстом, радиус 2 | сплошная брендовая заливка, белый текст |
 * | зазор списка | **20** | **0** |
 *
 * Линия идёт **по ширине текста**, а не таба: внутренний фрейм 63, а сам таб 85 —
 * разницу занимают счётчик 18 и зазор 4.
 *
 * ## Состояния — и как выяснилось, где индикатор
 *
 * Ось `State`: `default` / `active` / `hover` / `disabled`. У кита 1 первых двух
 * не было вовсе — это то, ради чего этап 0 предлагал забрать у Атома оси.
 *
 * | состояние | текст |
 * |---|---|
 * | `default` | `#525760` |
 * | `hover` | `#1d222a` |
 * | `active` | `#1d222a`, плюс индикатор |
 * | `disabled` | `#525760`, весь узел на прозрачности **0.32** |
 *
 * > Индикатор помечен `visible: true` во **всех четырёх** состояниях, заливка
 * > тоже, координаты одинаковые — но `absoluteRenderBounds` у трёх неактивных
 * > равен `null`, то есть они не рисуют ничего. Подтверждено подсчётом пикселей
 * > в экспорте: брендовый цвет встречается ровно дважды — таблетка и одна линия.
 * > Правило «индикатор только у активного» измерено, а не выведено по аналогии.
 *
 * ## Вид `line` — по VaTabs фронтов, такт 47
 *
 * Приёмка владельца 2026-10-01: `line` собран по вкладкам фронтов (va-ui 0.2.0, `docs/sources/va-ui-tabs.md`). Вкладка 44,
 * поля 0 16, 15/20 bold `--foreground-secondary`, снизу 1 `--border` у каждой — линия равна ширине списка; активная —
 * `--foreground` над подложкой `TabsIndicator` Reka: `--background`, радиус 8 8 0 0, полоса снизу 2 `--primary`,
 * переезд 0.16 s. Счётчик — проп `count`: 20, поля 0 6, `--accent`, 13/16 bold `--foreground-secondary`, 0 показывается.
 * Слот `end` списка — правый слот 44. Отклонение от мастера `_Tab` (линия 4 по ширине текста) — `figma-fixes.md`.
 * Ось `stretch` списка (такт 48): линия на всю ширину контейнера, поля списка задаёт потребитель через `class`.
 *
 * ## Сегмент-контрол — ось `segmented`, такт 46
 *
 * Приёмка владельца 2026-10-01: переключатели «оставлять / убирать» и «M / L» экрана VA-9265 — сегмент-контрол. У
 * мастера `Tabs` такого вида нет — канон shadcn-vue: дорожка `--muted` высотой 32 с полем 2, радиус 8; сегмент 28,
 * радиус 6, 13/16 medium; выбранный — `--background` с тенью `--shadow-button` и текстом `--foreground`. Отклонение
 * от мастера — `figma-fixes.md`.
 */
export const tabsListVariants = cva('inline-flex items-center', {
  variants: {
    variant: {
      /** Такт 47, VaTabs: вкладки встык, список — опора подложки (`relative`), длинный — прокрутка по горизонтали. */
      line: 'relative max-w-full gap-0 overflow-x-auto',
      pill: 'gap-0',
      /** Сегмент-контрол — дорожка 32 `--muted` с полем 2 (такт 46). */
      segmented: 'h-8 gap-0.5 rounded-md bg-muted p-0.5',
    },
    /**
     * Такт 48, решение владельца 2026-10-01: линия вкладок панели идёт на всю ширину панели — поверх VaTabs «линия = ширина
     * списка». Список во всю ширину, линия 1 `--border` — внутренняя тень `--shadow-tabs-line` по нижнему краю списка вместе с его полями.
     */
    stretch: {
      true: 'flex w-full shadow-tabs-line',
      false: '',
    },
  },
  defaultVariants: { variant: 'line', stretch: false },
})

export const tabsTriggerVariants = cva(
  'group/tab relative inline-flex items-center gap-1 text-sm font-medium outline-none disabled:pointer-events-none disabled:opacity-[var(--opacity-disabled-strong)]',
  {
    variants: {
      variant: {
        // Такт 47, VaTabs (`docs/sources/va-ui-tabs.md`): 44, поля 0 16, зазор 8, 15/20 bold `--foreground-secondary`, нижняя
        // граница 1 `--border` у каждой вкладки; активная — `--foreground`, граница прозрачная; над подложкой; наведение без вида;
        // выключенная — `--opacity-disabled` 0.48 (у VaTabs 0.5); фокус — кольцо кита 2 `--ring` (у VaTabs 3 accent 22 %).
        line: 'z-10 h-11 shrink-0 justify-center gap-2 border-b border-border px-4 font-bold text-foreground-secondary disabled:opacity-[var(--opacity-disabled)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=active]:border-transparent data-[state=active]:text-foreground',
        // Радиус 20 при высоте 40 — ровно половина, то есть пилюля.
        // Наведение у невыбранной таблетки — поверхность, а не только текст:
        // правило владельца «у всего интерактивного системное наведение»
        // (2026-08-18). У выбранной наведения нет: она уже брендовая.
        pill: 'h-10 justify-center rounded-full px-4 text-field-foreground transition-colors hover:text-field-foreground-hover data-[state=inactive]:hover:bg-secondary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
        // Сегмент 28 в дорожке 32: выбранный — `--background` с тенью `--shadow-button`, текст `--foreground`; 13/16 medium.
        segmented: 'h-7 justify-center rounded-sm px-3 text-xs text-field-foreground transition-colors hover:text-field-foreground-hover data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-button',
      },
    },
    defaultVariants: { variant: 'line' },
  },
)

/**
 * Обёртка выключенной вкладки с причиной — проп `reason` у `TabsTrigger` (такт 73, решение оркестратора 2026-10-03).
 * Выключенная вкладка событий не получает (`disabled:pointer-events-none`): подсказку причины и фокус с клавиатуры
 * держит обёртка — прецедент `FrameBindBar` (такт 52). Кольцо фокуса — кольцо кита 2 `--ring` внутрь, как у
 * включённой вкладки `line` (такт 47). Рисует его слой `after` над вкладкой: вкладка стоит на прозрачности
 * `--opacity-disabled`, и кольцо на ней самой вышло бы бледным; у списка `line` прокрутка по горизонтали, внешнее
 * кольцо он бы обрезал. Скругление слоя — по форме вкладки вида.
 */
export const tabsTriggerReasonVariants = cva(
  'relative inline-flex shrink-0 outline-none after:pointer-events-none after:absolute after:inset-0 after:z-20 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset',
  {
    variants: {
      variant: {
        line: '',
        pill: 'after:rounded-full',
        segmented: 'after:rounded-sm',
      },
    },
    defaultVariants: { variant: 'line' },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>
export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>

/**
 * ## Изменения после передачи
 *
 * Компонент передан фронтам 2026-09-30. Правило 23 `docs/chat-protocol.md`: каждое изменение переданного компонента
 * маркируется здесь, в `CHANGELOG.md` и в «Передано фронтам»; живые примеры — стенд `/kit-changes`.
 *
 * ### Версия `handover-2026-10-01` — относительно передачи 2026-09-30
 *
 * Версия выпущена тактом 57 по закрытию экрана «Свободная съёмка»: git-метка `handover-2026-10-01`.
 *
 * - **Добавлено.** Вид `variant="segmented"` у `TabsList` и `TabsTrigger` — сегмент-контрол: дорожка 32 `--muted` с полем 2, сегмент 28, выбранный — `--background` с тенью, 13/16 medium.
 * - **Добавлено.** У вида `line`: проп `count` у `TabsTrigger` — счётчик вкладки (0 показывается); слот `end` у `TabsList` — правый слот высотой 44.
 * - **Добавлено.** Проп `stretch` у `TabsList` вида `line` — список во всю ширину контейнера, линия 1 `--border` идёт под всем списком вместе с его полями. `TabsList` принимает `class`.
 * - **Меняет существующее.** Вид `line` выглядит как VaTabs (va-ui 0.2.0): вкладка 44, поля 0 16, 15/20 bold `--foreground-secondary`, нижняя граница 1 `--border` у каждой вкладки; активная — `--foreground` над подложкой `--background` с радиусом 8 8 0 0 и полосой 2 `--primary`, переезд 0.16 с. Было: линия 4 под текстом активной вкладки.
 *
 * ### Черновик следующей версии — относительно `handover-2026-10-02`
 *
 * - **Добавлено.** Причина выключения у вкладки (`reason` вместе с `disabled`), такт 73: выключенная вкладка остаётся на
 *   прозрачности 0.48 и не нажимается; наведение на неё и фокус с клавиатуры (Tab) показывают подсказку с причиной; в
 *   фокусе — кольцо кита 2 `--ring` внутрь вкладки полным цветом, как у включённой. Стрелки списка выключенную вкладку
 *   пропускают, Tab на неё встаёт. Имя для чтения с экрана — «подпись вкладки: причина». Без причины выключенная
 *   вкладка прежняя: фокуса и подсказки нет.
 */
