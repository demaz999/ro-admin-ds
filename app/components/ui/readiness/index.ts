export { default as ReadinessBar } from './ReadinessBar.vue'
export { default as ReadinessCheck } from './ReadinessCheck.vue'
export { default as ReadinessChip } from './ReadinessChip.vue'
export { default as ReadinessList } from './ReadinessList.vue'
export { default as ReadinessMark } from './ReadinessMark.vue'
export { default as ReadinessStage } from './ReadinessStage.vue'

/**
 * Модель готовности — такт 91, семейство одной папкой. Карточки 15 и 16 `docs/scheme-edit.md`, раздел 8: ворота открыты заранее
 * решением 8 оркестратора 2026-10-08 для двух ролей — полоса этапов со статусом и чип готовности с поповером проверок, — если
 * лестница правила 20 их не закрывает. Лестница — раздел 5 того же документа: `Stepper` (долг), `SectionNav`, `Toolbar`, `Callout`,
 * `Chip`, `Tabs segmented`, `Button` с `Badge` роли не закрыли. Мастера в ките 1 нет: источник — ревью
 * `docs/scheme-edit-review.md`, 5.4–5.5, выборки Mobbin C2–C4.
 *
 * ## Роль
 *
 * Этапность создания схемы мягкая: этапы готовности считаются из данных схемы, порядок подсказан, ничто, кроме критичных проверок,
 * не запрещено. Семейство показывает одну модель в трёх местах — полоса под шапкой страницы, чип у главного действия с поповером,
 * окно публикации — и на вкладках (маркер этапа).
 *
 * | часть | роль |
 * |---|---|
 * | `ReadinessMark` | маркер состояния: готово, готово к публикации (такт 92), число замечаний в пилюле (предупреждает либо блокирует; такт 97 — без «!»), замок, не готово |
 * | `ReadinessStage` | этап полосы — кнопка-пилюля с маркером; текущий этап — рамка и текст `--primary` |
 * | `ReadinessBar` | полоса «Подготовка схемы: N из 5 · Далее: … →», этапы кнопками, «Свернуть» |
 * | `ReadinessChip` | чип «Готовность N из 5» либо «Проверка: [N]» (такт 97: подпись «Проверка:», справа пилюля `ReadinessMark` с числом — проп `markAfter`; маркера перед подписью нет) с поповером: заголовок, сводка, содержимое — слотом |
 * | `ReadinessList` | этапы либо области с проверками: маркер, название, пояснение, переход; ручная отметка этапа |
 * | `ReadinessCheck` | строка проверки: важность глифом, текст, место, «Исправить» |
 *
 * ## Вид — роли кита
 *
 * | часть | кит | провенанс |
 * |---|---|---|
 * | готово | глиф `check` 16 `--success-strong` (8.2:1 к белому) | роль успеха кита; `--success` на белом — 2.7:1, ниже 3:1 для графики |
 * | готово к публикации (`ready`, такт 92) | глиф `arrow-forward` 16 `--primary` (6.3:1 к белому) — этап засчитывается публикацией: «Проверка и публикация» до первой публикации без блокирующих | решение 1а оркестратора 2026-10-08: «без галочки выполненного»; стрелка — следующее действие, как «Далее: … →» полосы |
 * | число предупреждает | пилюля 20, поля 6, 12/16 bold, только число: `--warning-surface`, текст `--warning-strong` (5.2:1) | тон предупреждения кита; метка «Не заполнено» (такт 90) |
 * | число блокирует | та же пилюля: `--destructive-surface`, текст `--destructive-strong` (6.8:1) | тон ошибки кита (`Callout destructive`) |
 * | замок | глиф `lock` 14 `--foreground-secondary` | причина — у вкладки и у этапа подсказкой |
 * | не готово | кольцо 14, рамка 2 `--border-secondary` | пункт чек-листа (выборка C3) |
 * | этап полосы | 32, радиус полный, поля 12, зазор 6, 15/20 medium; покой — `--card`, рамка 1 `--border`, текст `--foreground`; наведение — `--accent`; текущий — рамка и текст `--primary`; с замком — текст `--foreground-secondary` | пилюля чипа кита (32, радиус полный); рамка поля `--border` |
 * | полоса | `--secondary`, радиус 16, поля 12 / 16, строки через 12, части через 16; заголовок 15/20 bold; «Далее» — `ButtonAction strong`; «Свернуть» — `IconButton service sm` | тон бренда — подсказка пути; радиус и поля — навигатор `SectionNav` |
 * | чип | 40, радиус полный, поля 16, зазор 8, 15/20 medium, `--card`, рамка 1 `--border`, наведение `--accent`, шеврон 12 | высота кнопок шапки 40 |
 * | поповер | 400 — проп `width` у `PopoverContent` (прецеденты `HelpPreview` 310, `FilterChip` 348), поля 16, заголовок 17/24 bold, сводка 13/16 `--foreground-secondary`, тело до 70 % окна с прокруткой | `PopoverContent` кита |
 * | группа списка | заголовок 15/20 bold с маркером через 8, пояснение 13/16 `--foreground-secondary`, переход `ButtonAction sm`; группы через 12, линия 1 `--border-soft` | — |
 * | строка проверки | глиф 16 (`error` `--destructive`, `warning` `--warning-strong`, кольцо — не готово), текст 15/20, место 13/16 `--foreground-secondary`, «Исправить» `ButtonAction sm`; поля 4 по вертикали | `Diff`: предупреждения валидации (такт 64) |
 *
 * Фокус — кольцо кита 2 `--ring` у всех кнопок. Этап с замком нажимается (`aria-disabled`): нажатие сообщает выбор, причину
 * показывает подсказка и потребитель. Маркер с числом несёт текст для чтения с экрана: «2 замечания», «блокирует публикацию».
 *
 * ## Данные
 *
 * Семейство не считает готовность: этапы, проверки и переходы отдаёт потребитель (страница схемы — `app/stands/scheme-edit/readiness.ts`).
 */
export type ReadinessMarkState = 'done' | 'ready' | 'todo' | 'warning' | 'blocked' | 'locked'
export type ReadinessLevel = 'block' | 'warn' | 'todo'

/** Этап полосы. */
export interface ReadinessStageItem {
  id: string
  label: string
  state: ReadinessMarkState
  /** Число замечаний в пилюле. */
  count?: number
  /** Причина замка — подсказка этапа. */
  reason?: string
}

/** Строка проверки. */
export interface ReadinessCheckItem {
  key: string
  level: ReadinessLevel
  text: string
  /** Место исправления: «Форма → Автомобиль». */
  area?: string
  /** Подпись перехода; у предупреждающих и блокирующих — «Исправить», у задач — «Перейти». */
  action?: string
}

/** Группа списка — этап либо область. */
export interface ReadinessGroupItem {
  id: string
  title: string
  state: ReadinessMarkState
  count?: number
  /** Пояснение под названием: что готово, что осталось, причина замка. */
  meta?: string
  /** Подпись перехода к месту группы; пусто — перехода нет. */
  action?: string
  checks: ReadinessCheckItem[]
  /** Ручная отметка этапа — флажок под заголовком. */
  manual?: { label: string, checked: boolean }
}

/** Подпись маркера для чтения с экрана. */
export function readinessMarkLabel(state: ReadinessMarkState, count = 0): string {
  const n = count % 10
  const h = count % 100
  const word = n === 1 && h !== 11 ? 'замечание' : n >= 2 && n <= 4 && (h < 12 || h > 14) ? 'замечания' : 'замечаний'
  switch (state) {
    case 'done': return 'готово'
    case 'ready': return 'готово к публикации'
    case 'todo': return 'не готово'
    case 'locked': return 'закрыто'
    case 'blocked': return `${count} ${word}, блокирует публикацию`
    default: return `${count} ${word}`
  }
}

/** Глиф и цвет строки проверки по важности. */
export const READINESS_LEVEL: Record<ReadinessLevel, { icon: 'error' | 'warning' | '', tone: string, label: string }> = {
  block: { icon: 'error', tone: 'text-destructive', label: 'Блокирует публикацию' },
  warn: { icon: 'warning', tone: 'text-warning-strong', label: 'Предупреждение' },
  todo: { icon: '', tone: 'text-foreground-secondary', label: 'Не готово' },
}
