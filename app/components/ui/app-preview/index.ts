import type { IconName } from '../icon'

export { default as AppPreview } from './AppPreview.vue'
export { default as AppPreviewBrowser } from './AppPreviewBrowser.vue'
export { default as AppPreviewButton } from './AppPreviewButton.vue'
export { default as AppPreviewField } from './AppPreviewField.vue'
export { default as AppPreviewProgress } from './AppPreviewProgress.vue'
export { default as AppPreviewRow } from './AppPreviewRow.vue'
export { default as AppPreviewScreen } from './AppPreviewScreen.vue'
export { default as AppPreviewShot } from './AppPreviewShot.vue'
export { default as AppPreviewText } from './AppPreviewText.vue'
export { default as AppPreviewThumb } from './AppPreviewThumb.vue'

/**
 * Превью приложения — такт 89. Карточка 11 `docs/scheme-edit.md`, раздел 8: ворота открыты заранее решением 4 оркестратора
 * 2026-10-08 для роли «превью приложения — рамка телефона и части экрана приложения одним семейством», если лестница правила
 * 20 её не закрывает. Лестница — раздел 5 того же документа.
 *
 * ## Роль
 *
 * Экран мобильного приложения исполнителя в рамке телефона: демо-осмотр страницы схемы (ревью `docs/scheme-edit-review.md`,
 * 4.1), фрагмент экрана в поповере «?» (4.2), фрагмент экрана списка повторов в оверлее процесса (решение 7 такта 89). Экраны
 * собираются из черновика схемы данными: `AppPreviewScreen` рисует список частей (`AppScreenPart`) в рамке `AppPreview`.
 * Логики приложения нет — только вид и переходы по кнопкам.
 *
 * ## Состав — макет `33694:3879` (файл `U829JoK7KMZV8do3KNkWBh`, поповер «?» с превью экрана)
 *
 * | часть | кит | макет |
 * |---|---|---|
 * | корпус | 220 в ширину (`--container-app-phone`), поле 6, радиус 24, заливка `--app-device`; рамки нет — на светлом фоне корпус читается заливкой (строка 231 реестра) | `mobile-phone-mockup` `33694:3884`: 220 × 360, поле 6, радиус 24, рамка 3 `rgba(31,34,51,.24)`, `#0e1e33` |
 * | высота | `md` — 360 (`--spacing-app-phone-md`, макет); `lg` — 476 (`--spacing-app-phone-lg`): пропорция 375 × 812, ревью 4.1 | 360 |
 * | экран | заливка `--app-screen`, радиус 18 — концентрический: 24 − 6 | `inner-screen` `33694:3885`: `accent/surface_disabled`, радиус 18 |
 * | строка состояния | 24, поля 0 12, `--app-surface`; время 10/12 bold `--app-foreground` | `ios-status-bar` `33694:3886`: 24, «9:41» Inter Bold 10 |
 * | шапка приложения | поля 8 12, `--app-surface`: шеврон 14, заголовок 12/16 bold, «⋯» 14; высота 32 — по строке 16 | `app-header` `33694:3895`: поля 8 12, глифы 14, заголовок Inter Bold 12; высота 31 |
 * | тело | поля 10, зазор 10; кнопки — внизу тела, зазор 6 | `app-body` `33694:3903`: поля 10, зазор 10; `33694:3917`: зазор 6, прижато к низу |
 * | полоски прогресса | высота 4, радиус 2, зазор 4; пройдено — `--app-accent`, впереди — `--app-track` | `step-progress` `33694:3904`: 4, радиус 2, зазор 4; `accent/default`, `border/default` |
 * | заголовок шага и описание | 12/16 bold `--app-foreground`; 12/16 regular `--app-foreground-secondary`, зазор 2 | `33694:3910`, `33694:3911`: `Txt/bold12-16`, `Txt/regular12-16`; зазор 2 |
 * | слот съёмки | 100 в высоту, радиус 8, `--app-slot`; глиф 24 и подпись 12/16 `--app-foreground-secondary` через 12 | `camera-placeholder` `33694:3912`: 100, радиус 8, `neutral/soft`, зазор 12 |
 * | кнопка | 32, радиус 6, поля 8, подпись 12/16 bold; главная — `--app-accent`, текст `--app-accent-foreground`; «Осмотр невозможен» — контур тона ошибки `--app-danger` с глифом через 8: треугольник `warning` 11 × 9.5 в боксе 12 (такт 90; до него — `error` 12) | `next-btn` `33694:3923`, `impossible-inspection-btn` `33694:3918`: 32, радиус 6, поля 8, `Txt/bold12-16`, бокс глифа 12, зазор 8; `alert-triangle` `33694:3920` — вектор со штрихом 1, 11.0 × 10.0 |
 * | обведённый элемент | рамка 2 `--app-highlight` и свечение `--shadow-app-highlight` (0 0 16 при 32 %) | `33694:3918`: рамка 2 `accent/default`, тень 0 0 16 `rgba(46,91,255,.32)` |
 * | фрагмент | окно во всю ширину и 288 в высоту — телефон `md` без верхних 72 (`--spacing-app-crop`: поле корпуса 6, строка состояния 24, шапка 32, поле тела 10) | `Frame 2131328875` `33694:3883`: 278 × 289, телефон с `y = −71` |
 *
 * Цвета — роли `--app-*` на ролях кита: ДС мобильного приложения в репо нет, тема `viewapp` пуста. Когда появится палитра
 * приложения, экраны переходят на неё заменой значений `--app-*` (ревью, раздел 10). Гарнитура — `--font-sans` кита: строка
 * состояния и шапка макета стоят на Inter, в ките гарнитура одна.
 *
 * Частей, которых в макете нет (поле анкеты, галочка подтверждения, строка списка, подсказка на экране, пустой экран, крупный
 * заголовок), — по аналогии с нарисованными: тот же кегль 12/16, радиус 6 и поля 8 кнопки, поверхность `--app-surface` и
 * линия `--app-track`. Строки реестра расхождений — `docs/scheme-edit.md`, раздел 11, такт 89.
 *
 * ## Рамка браузера — `AppPreviewBrowser`, такт 90
 *
 * Карточка 13 `docs/scheme-edit.md`, раздел 8: ворота открыты заранее решением 6 оркестратора 2026-10-08 — «рамка браузера в
 * семействе превью такта 89». Роль — страница сайта в рамке: превью публичной страницы сценария (ревью 4.8, «Компьютер /
 * Телефон»). Макета нет (ДС сайта в репо нет): рамка собрана по аналогии с корпусом телефона и полосами экрана приложения
 * этого семейства — те же роли `--app-*`.
 *
 * | часть | компьютер | телефон |
 * |---|---|---|
 * | рамка | окно во всю ширину контейнера до 1280 (`--container-browser-desktop`), рамка 1 `--app-track`, радиус 12, `--app-surface` | корпус `--app-device`, поле 6, радиус 32; экран 375 (`--container-browser-phone`), радиус 26 — концентрический |
 * | полоса | 40, `--app-screen`, линия 1 `--app-track` снизу: три точки 10 `--app-track` через 6, адресная строка через 16 | строка состояния 24 — время 10/12 bold, как у `AppPreview`; адресная строка 32 по центру, поля 12 |
 * | адресная строка | 28, радиус 8, `--app-surface`, поля 12: замок 12 и адрес 12/16 `--app-foreground-secondary` с многоточием | то же, высота 32 |
 * | тело | прокрутка, `@container`: страница внутри раскладывается по ширине рамки; фокус с клавиатуры — область прокрутки, кольцо `--ring` внутрь | то же, без полосы прокрутки — у телефона своя |
 *
 * Высота — у потребителя: рамка тянется на высоту, заданную классом раскладки (`h-full`, `h-160`).
 *
 * ## Экран без рамки телефона — такт 92
 *
 * Проп `frame` у `AppPreview` и `AppPreviewScreen` (по умолчанию `true`): `false` — экран приложения без корпуса `--app-device`, поля 6 и
 * скруглений; экран занимает размер корпуса, разметка внутри та же, масштаб — `scale`. Роль — демо-осмотр на телефоне: экран
 * админки и есть телефон, рамка вокруг экрана лишняя (ревью 4.10, решение 5 оркестратора 2026-10-08). У фрагмента не действует.
 *
 * ## Почему не существующие
 *
 * `Image` и `MediaGalleryItem` — картинка, а экран собирается из данных черновика и меняется с настройкой. Части экрана —
 * не кит админки: `Button`, `Input`, `Checkbox` кита — элементы управления страницы с фокусом, наведением и ролями доступа;
 * на экране телефона это изображение чужого интерфейса, и большинство частей не нажимается. `Lightbox` и `FrameStage` —
 * просмотр медиа. Разбор — `scheme-edit.md`, раздел 5, строка 98.
 */

/** Глифы частей экрана — из `Icon` кита: пикт приложения в репо нет. */
export type AppPreviewIcon = Extract<IconName, 'photo-camera' | 'check' | 'add' | 'image' | 'article' | 'error' | 'help' | 'calendar-month' | 'chevron-down' | 'chevron-right' | 'list' | 'person' | 'info'>

/** Тип поля анкеты: значение поля формы схемы. */
export type AppPreviewFieldType = 'text' | 'number' | 'date' | 'checkbox' | 'choice'

/**
 * Часть экрана приложения — данные для `AppPreviewScreen`. `id` — ключ части на экране; `source` — что её формирует
 * (строка «Из чего собран экран» демо-осмотра): часть с тем же `source`, что в `marked`, обводится; `tight` — часть прижата к
 * предыдущей (зазор 2 — описание под заголовком шага); `footer` — часть внизу тела (кнопки экрана); `to` — переход по
 * нажатию: экран демо-осмотра.
 */
export type AppScreenPart = ({
  kind: 'progress'
  total: number
  done: number
} | {
  kind: 'title'
  text: string
  /** `md` — 12/16 bold, заголовок шага; `lg` — 15/20 bold, заголовок экрана без шагов. */
  size?: 'md' | 'lg'
} | {
  kind: 'text'
  text: string
  /** `secondary` — описание и пояснения, `default` — основной текст. */
  tone?: 'default' | 'secondary'
} | {
  kind: 'note'
  text: string
} | {
  kind: 'shot'
  label: string
  caption?: string
  /** Фото-подсказка в слоте — картинка каталога или своей загрузки. */
  src?: string
  video?: boolean
} | {
  kind: 'field'
  label: string
  type: AppPreviewFieldType
  required?: boolean
  placeholder?: string
  /** Конфигурация подсказок поля: «?» у подписи, «Пример» с фото. */
  hint?: 'none' | 'standard' | 'photo'
} | {
  kind: 'check'
  text: string
} | {
  kind: 'row'
  title: string
  meta?: string
  icon?: AppPreviewIcon
  src?: string
  done?: boolean
  to?: string
} | {
  kind: 'button'
  text: string
  /** `primary` — главная; `refuse` — «Осмотр невозможен», контур тона ошибки с глифом; `outline` — контур; `link` — текстом. */
  variant: 'primary' | 'refuse' | 'outline' | 'link'
  to?: string
} | {
  kind: 'empty'
  title: string
  text: string
}) & { id: string, source?: string, tight?: boolean, footer?: boolean }

/** Экран приложения: заголовок шапки и части. */
export interface AppScreen {
  title: string
  parts: AppScreenPart[]
}

/**
 * Обведённый элемент — рамка 2 `--app-highlight` и свечение (макет `33694:3918`). У частей без своей рамки — кольцо
 * снаружи с отступом 2 цветом экрана: обводка не наезжает на содержимое.
 */
export const APP_HIGHLIGHT = 'ring-2 ring-app-highlight ring-offset-2 ring-offset-app-screen shadow-app-highlight'
/** Наведение на нажимаемую часть — та же обводка: демо-осмотр подсвечивает строку «Из чего собран экран». */
export const APP_PRESSABLE = 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-screen'
