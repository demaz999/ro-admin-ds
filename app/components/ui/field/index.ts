import type { VariantProps } from 'class-variance-authority'
import type { InjectionKey, Ref } from 'vue'
import { cva } from 'class-variance-authority'
import { computed, inject, provide } from 'vue'

export { default as Field } from './Field.vue'
export { default as FieldSet } from './FieldSet.vue'

/**
 * Полевая обвязка — **первый компонент фазы обогащения**.
 *
 * Источник: мастер `input` `720:11753` **кита 1**, файл `uG3HTIcMwr2jI2d7YEYPs2`.
 * Эталон лежит в архиве: `archive/kit1-components/reference/input_720-11753.png`.
 * Код-предшественник — `archive/kit1-components/ui/input/Input.vue`.
 *
 * ## Почему обвязка, а не правка ядра
 *
 * Разведка этапа 0 показала: у Атома **нет ни подписи, ни подсказки, ни
 * счётчика** — ни в мастере `Input` `249:2768`, ни в спеке. Их вообще нет как
 * сущностей. У кита 1 они есть и формализованы.
 *
 * Правило фазы обогащения: атомовское ядро остаётся ядром, наше надстраивается
 * **над** ним. Поэтому `Field` ничего не знает о том, что внутри: он даёт
 * подпись, строку подсказки и счётчик любому контролу — `Input`, `Select`,
 * `Autocomplete`, `DatePicker`, `TimePicker`. Ядра при этом не тронуты, и
 * наложение волны 1 остаётся в силе.
 *
 * ## Две раскладки подписи
 *
 * Ось `label` мастера имеет два значения, и это **не выравнивание, а другая
 * раскладка**:
 *
 * | | `top` | `left` |
 * |---|---|---|
 * | направление | колонка | строка |
 * | подпись | над полем, во всю ширину | слева, по содержимому |
 * | выравнивание | нет | по центру высоты **поля**, а не всего блока |
 *
 * Выравнивание в раскладке `left` считается по высоте контрола, а не по высоте
 * колонки: строка подсказки не должна утягивать подпись вниз.
 *
 * ## Зазоры и кегли — из мастера
 *
 * | что | значение |
 * |---|---|
 * | подпись → поле | 8 |
 * | поле → строка подсказки | 4 |
 * | подсказка ↔ счётчик | 8 |
 * | высота строки подсказки | 16 |
 * | подпись | 15/20 **Bold** |
 * | подсказка | 13/16 Regular |
 * | счётчик | 13/16 **Bold** |
 *
 * ## Состояния красят части за пределами контрола
 *
 * Ошибка и выключенность у кита 1 меняют цвет **подписи, подсказки и счётчика**
 * — то есть узлов, до которых `:disabled` и `:invalid` самого контрола не
 * дотягиваются. Поэтому состояние вывешивается на корень обвязки атрибутом, а
 * части читают его через `group-data`.
 *
 * Цвета при этом берутся из **текущей темы**, а не из кита 1: обвязка приехала
 * из архива составом, но не палитрой.
 *
 * ## Строка формы — такт 36
 *
 * Решение владельца 2026-09-23 (окно формы повтора VA-9265, `docs/free-shoot.md`, раздел 14):
 * две оси сверх мастера `720:11753` — запрос дизайнерам в `figma-fixes.md`.
 *
 * | ось | значения | провенанс |
 * |---|---|---|
 * | `labelWidth` | `content` (мастер) · `form` — колонка 170 `--container-form-label`, подпись переносится | прототип v17 `.f-row` `170px 1fr` |
 * | `required` | « *» `--destructive` после подписи | прецедент `StepRow`, такт 30; прототип `.req` |
 *
 * Без обоих пропов обвязка та же, что до такта. Замер: 18 подписей форм повтора в 15/20 Bold
 * укладываются в 170 не больше чем в две строки — две строки 40, высота поля.
 *
 * `FieldSet` — группа полей формы: заголовок группы и строки через 8; разбор — в `FieldSet.vue`.
 *
 * > **Про имя слота.** Корень помечен `field-wrapper`, а не `field`: имя `field`
 * > уже занято внутренним контейнером атомовского поля (`Input.vue`), и обе
 * > автопроверки на `/compare` обходят узлы по `[data-slot]`. Одноимённые слоты
 * > у разных сущностей смешали бы выборки — совпадение поймано замером, когда
 * > обвязок насчиталось 48 вместо шести.
 */
export const fieldVariants = cva('group/field flex gap-2', {
  variants: {
    orientation: {
      top: 'flex-col',
      left: 'flex-row items-start',
    },
  },
  defaultVariants: { orientation: 'top' },
})

/**
 * Подпись. В раскладке `left` колонка не тянется и центрируется по высоте
 * контрола — высота задаётся пропом `controlHeight`, потому что обвязка не
 * знает, что внутри.
 */
export const fieldLabelVariants = cva(
  'text-sm font-bold text-foreground group-data-[state=disabled]/field:text-foreground-disabled',
  {
    variants: {
      orientation: {
        top: 'block',
        left: 'flex shrink-0 items-center',
      },
      /**
       * Ширина подписи в раскладке `left`. `content` — по содержимому, как у мастера.
       * `form` — колонка строки формы 170 (`--container-form-label`), подпись переносится;
       * такт 36, решение владельца 2026-09-23, провенанс — прототип v17 `.f-row`.
       */
      labelWidth: {
        content: '',
        form: 'w-form-label',
      },
    },
    defaultVariants: { orientation: 'top', labelWidth: 'content' },
  },
)

/**
 * ## Ось `readonly` — только чтение, такт 68
 *
 * @debt Состояния «только чтение» нет ни у мастера `720:11753`, ни у Атома (`249:2768`, спеки `237:2820`, `486:4305`,
 * `590:5112`, `1072:8677`): дефолт по аналогии с китом — `docs/design-debt.md`, «Ось readonly». Решение оркестратора
 * 2026-10-03 (пункт 3 разбора тактов 62–65); итог и замеры — `docs/scheme-edit.md`, раздел 20.
 *
 * `Field readonly` отдаёт ось вложенным контролам через контекст: `Input`, `Textarea`, `Select` (и `multiple`),
 * `Autocomplete`, `InputNumber`, `FormulaInput`, `Checkbox`, `Switch`, `RadioGroup` с `RadioGroupItem`. У каждого
 * контрола есть свой проп `readonly` — он работает и без обвязки. Выключенность сильнее: при `disabled` ось не действует.
 *
 * | | только чтение | выключено |
 * |---|---|---|
 * | значение | видно полным контрастом `--foreground`, выделяется и копируется | прозрачность `--opacity-disabled` 0.48 |
 * | поверхность поля | без заливки, рамка 1 `--input` — поле кита 1 `input` в покое (`tokens.md`, «Select: роль в мастере») | заливка поля на прозрачности |
 * | контрол выбора | бренд заменён нейтральным `--foreground-secondary`, анатомия та же | бренд на прозрачности |
 * | наведение | нет | нет |
 * | фокус | доступен у контролов со значением; кольцо 2 `--ring` у фокуса с клавиатуры | недоступен |
 * | правка | отказ: ввод, вставка, выбор, переключение, крестики и шевроны не рисуются | события погашены |
 * | доступность | `aria-readonly` либо атрибут `readonly` у поля | `disabled` |
 */
export const FIELD_READONLY: InjectionKey<Ref<boolean>> = Symbol('field-readonly')

/** Ось `readonly` контрола: свой проп или контекст обвязки; выключенный — не «только чтение». */
export function useReadonly(own: () => boolean | undefined, disabled: () => boolean | undefined = () => false) {
  const ctx = inject(FIELD_READONLY, null)
  return computed(() => !disabled() && (!!own() || !!ctx?.value))
}

/** Отдать ось вложенным контролам; обвязка внутри обвязки наследует «только чтение» внешней. */
export function provideReadonly(own: () => boolean | undefined) {
  const ctx = inject(FIELD_READONLY, null)
  const value = computed(() => !!own() || !!ctx?.value)
  provide(FIELD_READONLY, value)
  return value
}

/**
 * Поверхность поля только для чтения: заливки нет, рамка 1 `--input` внутрь коробки — геометрия прежняя; фокус с
 * клавиатуры — кольцо 2 `--ring` (у поля внутри — по `:has`, у фокусируемого корня — по своему `:focus-visible`).
 */
export const READONLY_SURFACE = 'bg-transparent shadow-none ring-1 ring-inset ring-input has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring focus-visible:ring-2 focus-visible:ring-ring'

export type FieldVariants = VariantProps<typeof fieldVariants>
export type FieldLabelVariants = VariantProps<typeof fieldLabelVariants>

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
 * - **Добавлено.** Проп `labelWidth` (`content` · `form` — колонка подписи 170 при `orientation="left"`) и проп `required` — знак « *» цветом `--destructive` у подписи.
 *
 * ### Черновик следующей версии — относительно `handover-2026-10-02`
 *
 * - **Добавлено.** Проп `readonly` — «только чтение»: обвязка отдаёт его вложенному контролу (`Input`, `Textarea`, `Select`,
 *   `Autocomplete`, `InputNumber`, `FormulaInput`, `Checkbox`, `Switch`, `RadioGroup`). Значение видно полным контрастом,
 *   выделяется и копируется, правки нет; вид отличается от выключенного. Подпись и подсказка прежние. Без пропа вид и поведение
 *   прежние. Такт 68.
 */
