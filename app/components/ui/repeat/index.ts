import { cva } from 'class-variance-authority'

export { default as RepeatCard } from './RepeatCard.vue'
export { default as RepeatForm } from './RepeatForm.vue'

/**
 * Карточка повтора и его компактная форма — экран «Распределение свободной съёмки»
 * (VA-9265), такт 32. **Мастера в Figma нет**: источник — прототип v17 (`.obj`, `.obj-h`,
 * `.obj-acts`, `.fp`) и спека §6.2, §9.3–9.4, §13.1–13.4, §14.1–14.3. Разбор с замерами —
 * `docs/free-shoot.md`, раздел 10. «Повтор» — термин спеки §2: экземпляр повторяемого
 * этапа, в текстах интерфейса — «объект».
 *
 * ## Заголовок: состояния
 *
 * | проп | вид | провенанс |
 * |---|---|---|
 * | покой | `--card`, наведение `--accent` | `.obj-h` белый, `#F7FAFD` |
 * | `current` | `--surface-selected` + полоса 3 слева `--primary`, метка `Badge sm` «текущий» | `.obj.cur>.obj-h` `#EDF3FA` + inset 3 `#337AB7`, `.curtag` |
 * | `suggested` | `--warning-surface`, пилюля «предложено» тоном `warning` на `--card` (правило пилюли, такт 33) | `.obj.auto>.obj-h` `#FDF4E3`, `.pillx.warn` `#FDF4E3`; §13.1 |
 * | `checkedSteps` > 0 | пилюля «🔒 N проверено» тоном `frozen`, имя `--foreground-secondary`, удаления нет | `.pillx.lock`, `.obj.lock .n`; §6.2 |
 * | `errors` > 0 | пилюля с числом тоном `error` | `.pillx.err` |
 * | `highlighted` | полоса 3 слева `--accent-soft` | `.obj.hl>.obj-h` inset 3 `#638EBF`; §15.1 |
 *
 * Сочетания решает порядок правил прототипа (специфичность одна, побеждает нижнее): фон
 * текущего побеждает фон предложенного, полоса подсветки — полосу текущего. Такт 32 записал
 * обратное, такт 33 исправил по позициям правил в `<style>` прототипа: `.obj.auto>.obj-h`
 * 9447, `.obj.cur>.obj-h` 17319, `.obj.hl>.obj-h` 19598.
 *
 * Пилюли — геометрия и тона счётчика `StepRow` (`stepCounterVariants`, решение владельца 4
 * такта 30: «при следующем потребителе стоит вынести»). Здесь второй потребитель, импорт —
 * из `../step-row`, без копии классов.
 *
 * «Принят» (§13.3) отдельного вида не имеет: принятый повтор теряет пометку «предложено»,
 * сворачивается и при фильтре «только непроверенные» уходит из списка — всё это данные.
 *
 * ## Тело: порядок фиксирован (§9.4)
 *
 * действия приёмки (только у предложенного) → компактная форма (слот `form`) → шаги
 * (слот по умолчанию, `StepRow`) → служебная строка (`hiddenSteps`, «Скрыто проверенных
 * шагов: N»). Порядок держит компонент: страница не может поставить форму под шаги.
 */
/**
 * ## Карточка-контейнер — такт 50, решение владельца 2026-10-01
 *
 * Три уровня панели читаются вмещением: этап → единица → шаги. Единица — карточка: рамка 1 `--border`, радиус 8,
 * внутри шапка, сводка формы и шаги. Имя — 15/20 bold `--foreground`, реквизиты — 13/16 приглушённо (`--opacity-on-tone`:
 * шапка бывает на тоне). Полоса 3 слева идёт по всей высоте карточки: `--primary` у текущей, `--accent-soft` у подсвеченной
 * связью. Свёрнутая единица — карточка с одной шапкой. Поля 12 от края этапа и 12 между карточками ставит
 * `StageSection cards`.
 */
export const repeatHeaderVariants = cva(
  'flex w-full items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
  {
    variants: {
      tone: {
        default: 'bg-card hover:bg-accent',
        current: 'bg-surface-selected',
        suggested: 'bg-warning-surface',
      },
    },
    defaultVariants: { tone: 'default' },
  },
)

export interface RepeatFormField {
  key: string
  label: string
  value?: string
  required?: boolean
  /** Источник автозаполнения (§3.1, §14.2): с кадра или значение по умолчанию. Метку несёт только `recognized` (такт 55). */
  source?: 'recognized' | 'default'
  /** Группа полей — заголовок в развёрнутой форме (§14.3). */
  group?: string
}

/** Сколько полей в компактной форме — §14.1. */
export const REPEAT_FORM_COMPACT = 6
