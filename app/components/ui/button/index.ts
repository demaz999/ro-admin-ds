import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/**
 * Текстовая кнопка. Источник двухчастный:
 *
 * - **мастер** `Button` `57:340` — 118 вариантов;
 * - **спецификация** `45:175`, тёмный набор `3661:25740`.
 *
 * ## Почему 118 вариантов дали 24
 *
 * Оси мастера: Type `primary|secondary` × Width `content|wide` × Size (3) ×
 * **Color (9)** × Rounded × Disabled. Цветовая ось решением от 2026-08-12 не
 * переносится: источником берётся **брендовая синяя колонка** `rocky`
 * (`#4480f3`), остальные восемь колонок вариантов не дают.
 *
 * Отсюда матрица в коде: type (2) × size (3) × width (2) × disabled (2) = 24.
 * Расхождение с мастером — ровно цветовая ось, и оно осознанное.
 *
 * `Rounded` отдельной осью тоже не идёт: в мастере она связана с размером —
 * `laripha` встречается только с `Rounded=true` (радиус 32), `helike` и `polyxo`
 * только с `false`. Ровно как `Size`/`Rounded` у `Input`.
 *
 * ## Размеры
 *
 * | размер | высота | радиус | паддинги | зазор | кегль | иконка |
 * |---|---|---|---|---|---|---|
 * | `lg` (`laripha`) | 64 | 32 | 20/32 | 6 | 16 | есть |
 * | `md` (`helike`) | 40 | 8 | 10/16 | 6 | 16 | есть |
 * | `sm` (`polyxo`) | 24 | **6** | 4/8 | 0 | 13 | **нет** |
 *
 * Радиус 6 у малой кнопки — ступень, которой в лесенке кита 1 не существовало;
 * она добавлена в волне 2, из-за чего имена ступеней сдвинулись.
 *
 * У малого размера **иконки нет вовсе**: в мастере её слот отсутствует, а не
 * выключен. Поэтому `sm` не принимает иконку и зазор у него нулевой.
 *
 * `Width` — это hug против fill: `content` тянется по содержимому, `wide`
 * занимает всю ширину контейнера. Паддинги мастера у `wide` (10/66, 4/85) —
 * артефакт фиксированной ширины 272 с центрированным содержимым, а не значения.
 *
 * ## Состояния из спеки
 *
 * | | залитая | тональная |
 * |---|---|---|
 * | покой | `#4480f3` | 12% |
 * | наведение | светлее | **8% — светлее** |
 * | нажатие | темнее | 16% |
 * | выключено | прозрачность **0.32** | прозрачность **0.48** |
 *
 * Две вещи, которые легко прочитать наоборот. Первая: у тональной кнопки
 * наведение **осветляет** заливку, а не затемняет. Вторая: выключенное
 * состояние гасится по-разному — у залитой сильнее, чем у тональной, и обе
 * не совпадают с полями, где 0.48 общее.
 *
 * Спека впервые задаёт **время**: наведение 0.1 сек, нажатие 0 сек. У полей
 * времени не указано нигде, поэтому там переходов нет — здесь есть.
 *
 * ## `destructive` — исключение из решения 23
 *
 * Оси `Type` со значением «удалить» в мастере нет: удаление у Атома несёт
 * **красная колонка `fargo`** той же цветовой оси. Решением от 2026-08-13 она
 * взята как исключение: исключали ось выбора цвета, а не семантику — красная
 * кнопка удаления это роль, а не оттенок на выбор.
 *
 * Состав и геометрия у неё общие с залитой, отличаются только значения.
 * Покой снят с мастера (`2583:14964`). Наведение и нажатие в файле не
 * нарисованы ни для одной колонки, кроме брендовой, поэтому **выведены** по
 * механике, снятой с неё: светлота ±10/255 при неизменных тоне и насыщенности.
 * На брендовой колонке механика воспроизводит эталон бит в бит.
 *
 * `ghost` **не заводится**: кнопок без мастера не выдумываем. Его нишу у Атома
 * занимает `ButtonAction` — соответствие фиксируется в `docs/naming.md` после
 * его переноса.
 */
/*
 * Кольцо фокуса с клавиатуры — такт 35, решение владельца 2026-09-23. У мастеров Атома и у кнопок
 * кита 1 (`btn_accent` `709:6413`: Default / Hover / Pressed / Dissabled / not_active — по инвентарю)
 * состояния фокуса нет; кит 1 не сверен — Figma MCP в сессии не авторизован. Взят прецедент составных
 * компонентов тактов 30–33: `focus-visible:ring-2` `--ring`. Только по `focus-visible` — в покое и
 * под мышью кнопка не меняется. Расширение матрицы — `waves.md`, запрос дизайнерам — `figma-fixes.md`.
 *
 * Такт 45, решение владельца 2026-10-01 (вопрос 7 входа приёмки): у залитых вариантов кольцо отступает от кнопки на 2
 * цветом фона (`ring-offset-2`, `--background`) — у `default` заливка `--primary` совпадает с `--ring`, и кольцо без
 * отступа не видно: кнопка лишь растёт на 2. У вариантов без заливки кольцо прежнее. Отклонение — `figma-fixes.md`.
 */
export const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium outline-none select-none disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-pressed focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        /**
         * Подсветка фичи — такт 58, решение владельца 2026-10-02: действие автоматизации или новой возможности выделено
         * цветом роли `feature`, по весу — как `secondary`: подложка `--feature-surface`, текст и иконка `--feature`,
         * наведение и нажатие `--feature-hover`. В мастере `Button` `57:340` роли нет — наше расширение матрицы.
         */
        feature: 'bg-feature-surface text-feature hover:bg-feature-hover active:bg-feature-hover focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        /**
         * Текстовая кнопка на тёмной полосе приложения — такт 42, нехватка в ките (дыра с такта 8). Прецедент —
         * `IconButton variant="sidebar"`: фона нет, наведение — ступень `--sidebar-accent`.
         * Такт 48, `top_menu` `33970:14832`: подписи полосы — regular белым (`--sidebar-active-foreground`, `menu/fg/activ`),
         * иконка перед подписью — слот `icon`; поля 8 — зазор 24 между подписями соседних пунктов.
         */
        sidebar: 'bg-transparent text-sidebar-active-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        /**
         * Контурная кнопка — такт 63: мастер кита 1 `btn_outline` `1990:226` (страница «Buttons» `1:153`, файл
         * `uG3HTIcMwr2jI2d7YEYPs2`), строка мапинга `tokens.md`: `btn_outline` → `variant="outline"`.
         *
         * Матрица мастера — 8 вариантов: `state` (`Default`, `Hover`, `Pressed`, `Dissabled`) × `size` (44, 32).
         *
         * | состояние | рамка 1, текст, иконка | мастер | роль кита |
         * |---|---|---|---|
         * | покой | `#0059cf` | `1990:227` | `--primary` |
         * | наведение | `#337ad9` | `1990:232` | `--primary-hover` |
         * | нажатие | `#004eb5` | `1990:237` | `--primary-pressed` |
         * | выключено | `#80ace7` | `1990:242` | `--primary-disabled` |
         *
         * Фона нет во всех состояниях; радиус 8. Выключенное — цветом, без прозрачности: так в мастере.
         *
         * Расхождения с мастером (`waves.md`): размеры 44 и 32 мастера ложатся на размеры кита (`md` 40, `sm` 24) —
         * решение 4 `modal-family.md`, строка 24 реестра `scheme-edit.md`; подпись — `font-medium`, как у остальных
         * вариантов кнопки кита (у мастера Bold); поля и зазор — размера кита (у мастера поля 10, иконки в коробках 24).
         */
        outline: 'border border-primary bg-transparent text-primary hover:border-primary-hover hover:text-primary-hover active:border-primary-pressed active:text-primary-pressed disabled:border-primary-disabled disabled:text-primary-disabled',
      },
      size: {
        lg: 'h-16 gap-1.5 rounded-3xl px-8 text-sm',
        md: 'h-10 gap-1.5 rounded-md px-4 text-sm',
        // У малой кнопки слота иконки в мастере нет, поэтому и зазора нет.
        sm: 'h-6 gap-0 rounded-sm px-2 text-xs',
      },
      /** Ось `Width` мастера: по содержимому либо во всю ширину. */
      wide: {
        true: 'w-full',
        false: 'w-fit',
      },
    },
    compoundVariants: [
      // Выключенное состояние гасится по-разному у залитой и тональной — так в спеке.
      // Удаление залитое, поэтому идёт с залитой.
      { variant: 'default', class: 'disabled:opacity-[var(--opacity-disabled-strong)]' },
      { variant: 'destructive', class: 'disabled:opacity-[var(--opacity-disabled-strong)]' },
      { variant: 'secondary', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'feature', class: 'disabled:opacity-[var(--opacity-disabled)]' },
      { variant: 'sidebar', class: 'px-2 font-normal disabled:opacity-[var(--opacity-disabled)]' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      wide: false,
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

/**
 * Загрузка — такт 77, нехватка в ките (строка 33 реестра `docs/tariffs.md`). Макет страницы «Тарификация»: `btn_accent`
 * `30957:18341` 206 × 44 — вместо иконки и подписи `Loader24` `30957:18364` 24 по центру, заливка полная.
 *
 * | Что | Как | Провенанс |
 * |---|---|---|
 * | спиннер | `Spinner` `sm` 20 по центру (у `sm` кнопки — `xs` 16): у залитых `default`, `destructive` — `inverse`, у прочих — `default` | `Loader24` 24 в кнопке 44 → ступень `Spinner` 20 в кнопке 40 |
 * | ширина | подпись и иконка остаются в потоке и прозрачны (`text-transparent`) — ширина прежняя | макет: 206 у обеих кнопок |
 * | доступность | кнопка `disabled` и `aria-busy`; прозрачность выключенной не включается — заливка полная | макет: заливка `30957:18341` = покой |
 *
 * Класс подмешивается через `cn` после классов варианта: `text-transparent` и `disabled:opacity-100` побеждают цвет и
 * прозрачность варианта; `disabled:text-transparent` и `disabled:border-primary` — у контурного варианта, где выключенная
 * красит текст и рамку. У вариантов без рамки цвет рамки ничего не рисует.
 */
export const buttonLoadingClass = 'relative text-transparent disabled:text-transparent disabled:opacity-100 disabled:border-primary'

/**
 * ## Изменения после передачи
 *
 * Компонент передан фронтам 2026-09-30. Правило 23 `docs/chat-protocol.md`: каждое изменение переданного компонента
 * маркируется здесь, в `CHANGELOG.md` и в «Передано фронтам»; живые примеры — стенд `/kit-changes`.
 *
 * ### Черновик следующей версии — относительно `handover-2026-10-02`
 *
 * - **Добавлено.** Загрузка: спиннер 20 по центру вместо иконки и подписи (у малой кнопки — 16), белый у залитых
 *   `default` и `destructive`, `--primary` у прочих; ширина кнопки прежняя, заливка полная — кнопка не гаснет; нажатия не
 *   принимает, `aria-busy`. Без пропа кнопка прежняя. API: проп `loading`. Такт 77.
 * - **Добавлено.** Вариант `variant="outline"` — контурная кнопка по мастеру кита 1 `btn_outline` `1990:226`: рамка 1 и
 *   текст `--primary`, наведение `--primary-hover`, нажатие `--primary-pressed`, выключено `--primary-disabled`; фона
 *   нет. Прочие варианты прежние. Такт 63.
 *
 * ### Версия `handover-2026-10-02` — относительно `handover-2026-10-01`
 *
 * Версия выпущена тактом 59 после круга правок по общей сдаче: git-метка `handover-2026-10-02`.
 *
 * - **Добавлено.** Вариант `variant="feature"` — подсветка фичи (автоматизация, новая возможность): подложка `--feature-surface`, текст и иконка `--feature`, наведение и нажатие `--feature-hover`; по весу как `secondary`. Токены роли — `--feature`, `--feature-surface`, `--feature-hover` (такт 58).
 *
 * ### Версия `handover-2026-10-01` — относительно передачи 2026-09-30
 *
 * Версия выпущена тактом 57 по закрытию экрана «Свободная съёмка»: git-метка `handover-2026-10-01`.
 *
 * - **Добавлено.** Вариант `variant="sidebar"` — текстовая кнопка на тёмной поверхности: без фона, подпись regular цветом `--sidebar-active-foreground`, поля 8, наведение `--sidebar-accent`. Иконка перед подписью — слот `icon` с `show-icon`.
 * - **Исправлено.** Классы варианта и размера сливаются через `cn`: поля варианта перекрывают поля размера. У вариантов `default`, `secondary`, `destructive` вид прежний.
 * - **Меняет существующее.** У залитых вариантов `default`, `secondary`, `destructive` кольцо фокуса с клавиатуры отступает от кнопки на 2 цветом фона (`ring-offset-2`). В покое и под мышью вид прежний.
 */
