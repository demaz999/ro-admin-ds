/**
 * Версия передачи фронтам `handover-2026-10-01` — изменения простых компонентов («кирпичиков») относительно передачи 2026-09-30.
 * Метка поставлена тактом 57 по закрытию экрана «Свободная съёмка». Правило 23 `docs/chat-protocol.md`: каждая строка —
 * на языке компонента (API, вид, поведение), без экранного контекста. Этот список — источник стенда `/kit-changes`; тот же
 * текст — в `CHANGELOG.md` и в разделах «Изменения после передачи» в `index.ts` компонентов. Выпущенная версия задним
 * числом не меняется: следующие изменения — новым файлом следующей версии.
 */
export type ChangeClass = 'added' | 'fixed' | 'changes'

export const CHANGE_CLASS: Record<ChangeClass, string> = {
  added: 'Добавлено',
  fixed: 'Исправлено',
  changes: 'Меняет существующее',
}

export interface KitChange {
  /** Ключ живого примера на стенде. */
  id: string
  component: string
  cls: ChangeClass
  text: string
}

export const HANDOVER = 'handover-2026-10-01'

export const CHANGES: KitChange[] = [
  { id: 'button-sidebar', component: 'Button', cls: 'added', text: 'Вариант `variant="sidebar"` — текстовая кнопка на тёмной поверхности: без фона, подпись regular цветом `--sidebar-active-foreground`, поля 8, наведение `--sidebar-accent`. Иконка перед подписью — слот `icon` с `show-icon`.' },
  { id: 'button-cn', component: 'Button', cls: 'fixed', text: 'Классы варианта и размера сливаются через `cn`: поля варианта перекрывают поля размера. У вариантов `default`, `secondary`, `destructive` вид прежний.' },
  { id: 'button-ring', component: 'Button', cls: 'changes', text: 'У залитых вариантов `default`, `secondary`, `destructive` кольцо фокуса с клавиатуры отступает от кнопки на 2 цветом фона (`ring-offset-2`). В покое и под мышью вид прежний.' },
  { id: 'icon-button-ring', component: 'IconButton', cls: 'changes', text: 'У варианта `default` кольцо фокуса с клавиатуры отступает от кнопки на 2 цветом фона. Остальные варианты и покой — прежние.' },
  { id: 'button-action-pair', component: 'ButtonAction', cls: 'added', text: 'Проп `strong` — главное действие пары: полужирный, цвет варианта. Вариант `variant="muted"` — второстепенное действие пары: обычный вес, `--foreground` на ступени `--opacity-on-tone` (64 %), наведение и нажатие — `--foreground`. Без осей кнопка прежняя.' },
  { id: 'tabs-segmented', component: 'Tabs', cls: 'added', text: 'Вид `variant="segmented"` у `TabsList` и `TabsTrigger` — сегмент-контрол: дорожка 32 `--muted` с полем 2, сегмент 28, выбранный — `--background` с тенью, 13/16 medium.' },
  { id: 'tabs-count', component: 'Tabs', cls: 'added', text: 'У вида `line`: проп `count` у `TabsTrigger` — счётчик вкладки (0 показывается); слот `end` у `TabsList` — правый слот высотой 44.' },
  { id: 'tabs-stretch', component: 'Tabs', cls: 'added', text: 'Проп `stretch` у `TabsList` вида `line` — список во всю ширину контейнера, линия 1 `--border` идёт под всем списком вместе с его полями. `TabsList` принимает `class`.' },
  { id: 'tabs-line', component: 'Tabs', cls: 'changes', text: 'Вид `line` выглядит как VaTabs (va-ui 0.2.0): вкладка 44, поля 0 16, 15/20 bold `--foreground-secondary`, нижняя граница 1 `--border` у каждой вкладки; активная — `--foreground` над подложкой `--background` с радиусом 8 8 0 0 и полосой 2 `--primary`, переезд 0.16 с. Было: линия 4 под текстом активной вкладки.' },
  { id: 'input-placeholder', component: 'Input', cls: 'changes', text: 'При `placeholder=""` значение стоит по центру поля по вертикали: строка плавающей подписи не резервируется, каретка пустого поля при фокусе не прыгает. С непустым `placeholder` — прежнее.' },
  { id: 'select-keyboard', component: 'Select', cls: 'fixed', text: 'Триггер получает фокус с клавиатуры (`tabindex="0"`): выбор открывается по Tab и Enter.' },
  { id: 'select-z', component: 'Select', cls: 'fixed', text: '`SelectContent` несёт `z-50`: список внутри модального окна ложится поверх окна.' },
  { id: 'select-item-muted', component: 'Select', cls: 'added', text: 'Проп `muted` у `SelectItem` — вид выключенного пункта (прозрачность `--opacity-disabled`, без наведения), при этом клик доходит до потребителя.' },
  { id: 'select-placeholder', component: 'Select', cls: 'changes', text: 'При `placeholder=""` выбранное значение стоит по центру поля по вертикали, как у `Input`. С непустым `placeholder` — прежнее.' },
  { id: 'select-group', component: 'Select', cls: 'changes', text: 'Заголовок `SelectGroup` — по высоте текста с полем 8 сверху, зазор до списка 2 (было: высота 32 и зазор 8): от текста заголовка до текста первого двухстрочного пункта — 12. Отделение групп линией — прежнее.' },
  { id: 'field-label', component: 'Field', cls: 'added', text: 'Проп `labelWidth` (`content` · `form` — колонка подписи 170 при `orientation="left"`) и проп `required` — знак « *» цветом `--destructive` у подписи.' },
  { id: 'checkbox-indeterminate', component: 'Checkbox', cls: 'fixed', text: 'Состояние `indeterminate` доходит до контрола: `aria-checked="mixed"`, клик из него отмечает флажок (`update:modelValue` — `true`). Вид прежний.' },
  { id: 'checkbox-gap', component: 'Checkbox', cls: 'changes', text: 'Зазор от флажка до подписи — 8 (было 12): флажок с подписью уже на 4. Тот же зазор — у всего семейства выбора: `RadioGroupItem` и `Switch` (в передачу 2026-09-30 не входили).' },
  { id: 'checkbox-bare', component: 'Checkbox', cls: 'changes', text: 'Без подписи (нет слота и `subtitle`) выводится только контрол: компонент занимает 16 вместо 28 по ширине и встаёт по центру отведённого места. С подписью — прежний.' },
  { id: 'icon-glyphs', component: 'Icon', cls: 'added', text: 'Глифы `keyboard`, `bar-chart`, `auto-awesome` — Material Symbols, официальная выгрузка `default/24px`.' },
]

export const COMPONENTS = [...new Set(CHANGES.map(c => c.component))]
