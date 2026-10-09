import { cva, type VariantProps } from 'class-variance-authority'

export { default as Callout } from './Callout.vue'

/**
 * Плашка-сообщение в потоке страницы или окна — карточка 4 такта 37 (`docs/free-shoot.md`, 16.3),
 * ворота 2026-09-30: «да». Собрана тактом 39 (порция П2). Мастера в ките нет; структура — прототип
 * VA-9265 v17, вид — роли кита. Имя `Alert` занято уведомлением `Notification` Атома.
 *
 * Состав: заголовок (проп `title`), текст и список (слот по умолчанию), действия (слот `actions`) —
 * справа от текста, в одну строку с переносом. Без действий плашка — блок текста во всю ширину.
 *
 * | часть | кит | прототип |
 * |---|---|---|
 * | тон `success` | фон `--success-surface`, текст `--success-strong` — роли такта 30 | `.sum.ok` `#E9F6EE` / `#1D7444` |
 * | тон `warning` | фон `--warning-surface`, текст `--warning-strong` | `.sum.warn`, `.review` `#FDF4E3` / `#8A5A0B` |
 * | тон `destructive` | фон `--destructive-surface`, текст `--destructive-strong` | `.sum.err` `#FBEBEA` / `#96322E` |
 * | тон `neutral` | фон `--muted`, текст `--foreground-secondary` — пара свободной плашки `FrameBindBar` | — |
 * | радиус | 8 `--radius-md` | `.sum` 6 (`--r`) |
 * | паддинг | 12 / 16 | `.sum` 11 / 13, `.review` 10 / 14 |
 * | заголовок | 15/20 bold, цвет тона | `.sum b` 13.5 bold, блоком; `.review .t` 13.5 bold |
 * | заголовок → текст | 4 | `.sum b` отступ 3; `.review small` 1 |
 * | текст | 15/20 regular, цвет тона | `.sum` 13.5; `.review small` 12 `#9A7A45` |
 * | список | маркеры, отступ 20, сверху 4 | `.sum ul` отступ 18, сверху 5 |
 * | текст → действия | 12, по центру по вертикали | `.review` зазор 12, `align-items: center` |
 * | рамка | нет | `.review` рамка `#F0DDB4` и левая полоса 3 `--warn`; у `.sum` рамки нет |
 *
 * Текст прототипа 12–13.5 на шкале кита ложится на 15/20 — текст тела окна (`ModalCardText`), как у
 * `FrameBindBar`. Действия — `Button` sm, `Checkbox` — ставит потребитель.
 */
export const calloutVariants = cva(
  'flex items-center gap-3 rounded-md px-4 py-3 text-sm',
  {
    variants: {
      tone: {
        success: 'bg-success-surface text-success-strong',
        warning: 'bg-warning-surface text-warning-strong',
        destructive: 'bg-destructive-surface text-destructive-strong',
        // Такт 50: второстепенный текст на тонированной поверхности — `--foreground` на ступени `--opacity-on-tone`.
        neutral: 'bg-muted text-foreground/[var(--opacity-on-tone)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

/**
 * ## Закрываемая плашка — проп `closable`, такт 72
 *
 * Одноразовая плашка страницы схемы «Сохранение теперь автоматическое» (аудит, «Смена парадигмы — одноразовая
 * ориентация»; № 67 `docs/scheme-edit.md`). Лестница правила 20: `Alert` — всплывающее уведомление с тенью шириной 360,
 * `Banner` — промо с картинкой; закрытия у `Callout` не было — ось, ступень 2 (раздел 5 документа экрана).
 *
 * | часть | кит |
 * |---|---|
 * | крестик | глиф `close` 16 в зоне 32 — прецедент крестика `Alert` (такт 50) |
 * | место | справа, после действий, у первой строки (`self-start`); поля зоны уходят в поля плашки: −6 по вертикали, −8 справа — высота плашки прежняя |
 * | цвет | тон плашки на ступени `--opacity-on-tone`, наведение — полный тон; фокус — кольцо 2 `--ring` |
 * | поведение | нажатие отдаёт `close`; плашку убирает потребитель (`v-if`) и сам помнит закрытие |
 *
 * Матрица — `/free-shoot/states`, раздел Callout (`data-subsection="callout-closable"`); пример — `/kit-changes`.
 *
 * ## Изменения после передачи
 *
 * Компонент передан фронтам версией `handover-2026-10-01` (составные компоненты экрана). Правило 23 `docs/chat-protocol.md`:
 * каждое изменение маркируется здесь, в `CHANGELOG.md` и в «Передано фронтам».
 *
 * ### Следующая версия (черновик) — относительно `handover-2026-10-02`
 *
 * - **Добавлено.** Проп `closable` — крестик «Закрыть» справа (глиф 16 в зоне 32, тон плашки), событие `close`; плашку
 *   убирает потребитель. Без пропа разметка и вид прежние. Такт 72.
 * - **Добавлено.** Узкий экран — проп `narrow="stack"`: ниже 768 действия (слот `actions`) — строкой под текстом во всю ширину,
 *   от левого края, с переносом. Рабочий стол прежний — действия справа от текста; без пропа (`keep`) прежний и на узком экране.
 *   Пример — статус витрины страницы схемы на телефоне: «Предпросмотр страницы» и «Опубликовать на витрину» (ревью 4.10). Такт 92.
 */
export type CalloutVariants = VariantProps<typeof calloutVariants>
export type CalloutTone = NonNullable<CalloutVariants['tone']>
