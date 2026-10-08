import { formatPrice } from '../price-range'

export { default as ScenarioPreview } from './ScenarioPreview.vue'
export { default as ScenarioPreviewCard } from './ScenarioPreviewCard.vue'
export { default as ScenarioPreviewGap } from './ScenarioPreviewGap.vue'
export { default as ScenarioPreviewHero } from './ScenarioPreviewHero.vue'
export { default as ScenarioPreviewMetrics } from './ScenarioPreviewMetrics.vue'
export { default as ScenarioPreviewPairs } from './ScenarioPreviewPairs.vue'
export { default as ScenarioPreviewSection } from './ScenarioPreviewSection.vue'
export { default as ScenarioPreviewSteps } from './ScenarioPreviewSteps.vue'
export { default as ScenarioPreviewTags } from './ScenarioPreviewTags.vue'

/**
 * Превью страницы сценария — такт 90. Карточка 14 `docs/scheme-edit.md`, раздел 8: ворота открыты заранее решением 6
 * оркестратора 2026-10-08 для роли «разделы превью страницы сценария (первый экран, пары «проблема — решение», метрики,
 * шаги) — семейством», если лестница правила 20 её не закрывает. Лестница — раздел 5 того же документа, № 109.
 *
 * ## Роль
 *
 * Публичная страница сценария на сайте и карточка сценария в каталоге — как их увидит посетитель, собранные из полей таба
 * «Витрина» (ревью `docs/scheme-edit-review.md`, 4.8; аудит, «Таб „Витрина“»: «превью — как соберётся публичная страница
 * сценария»). Страница сценария — изображение чужого интерфейса, как экран приложения у
 * `AppPreview`. Незаполненное поле — метка «Не заполнено» со ссылкой на поле таба (`ScenarioPreviewGap`): единственная часть
 * админки внутри страницы.
 *
 * ## Вид сайта условный
 *
 * ДС сайта в репо нет. Страница стоит на ролях `--site-*` поверх ролей кита (как `--app-*` у экрана приложения): ДС сайта
 * заменит значения одной правкой в теме. Шрифт — `--font-sans` кита, кегли — шкала кита, начертания 400, 500, 700.
 * Второстепенный текст — `--site-foreground` на ступени `--opacity-on-tone` (правило такта 50): на белом 5.1:1, на полосе
 * `--site-band` 4.9:1. Раскладка — по ширине рамки: контейнерный запрос `@site-wide:` (640, `--container-site-wide`); уже —
 * раскладка телефона. Рамка — `AppPreviewBrowser` (карточка 13): у её тела стоит `@container`.
 *
 * | часть | телефон (уже 640) | компьютер |
 * |---|---|---|
 * | колонка | поля 20 | поля 40, содержимое до 1040 (`--container-site`) по центру |
 * | первый экран (`ScenarioPreviewHero`) | полоса `--site-band`, поля 32 сверху и снизу; метки, заголовок 24/28 bold, описание 15/20, цена 24/28 bold с подписью 13/16, «Оставить заявку» 48 — столбиком, изображение 16:10 радиус 16 ниже | поля 48; текст и изображение в две колонки через 40, заголовок 32/36, описание 17/24 |
 * | раздел (`ScenarioPreviewSection`) | заголовок 20/24 bold, описание 15/20 второстепенным текстом, содержимое через 24 | заголовок 24/28, описание 17/24 до 76ch |
 * | пары (`ScenarioPreviewPairs`) | карточка на строку: проблема 17/24 bold, последствия 15/20, решение 15/20 на полосе `--site-band` с галочкой `--site-accent`; поля 20, радиус 16, рамка 1 `--site-border` | две колонки через 16 |
 * | метрики (`ScenarioPreviewMetrics`) | две колонки: значение 24/28 bold `--site-accent`, подпись 13/16 | три колонки, значение 32/36 |
 * | шаги (`ScenarioPreviewSteps`) | столбиком: номер — круг 32 на `--site-surface` с рамкой 1 `--site-border`, 15/20 bold `--site-accent`; подпись 15/20 medium | строкой с переносом, стрелки 16 между шагами |
 * | метки (`ScenarioPreviewTags`) | пилюли 28, поля 12, 13/16, рамка 1 `--site-border` на `--site-surface`; `md` — 36, поля 16, 15/20 | — |
 * | карточка каталога (`ScenarioPreviewCard`) | во всю ширину: изображение 16:10, поля 20, метки, название 17/24 bold, описание 15/20 до трёх строк, цена 17/24 bold и «Подробнее» 15/20 bold `--site-accent` | треть колонки — 336 (`--container-site-card`) |
 * | «Не заполнено» (`ScenarioPreviewGap`) | пунктир 1 `--warning` на `--warning-surface`, радиус 8, поля 8 / 12: «Не заполнено» 13/16 bold `--warning-strong`, подпись поля 13/16 medium `--primary`, шеврон 12; кнопка — фокус кольцом `--ring` | — |
 *
 * ## Почему не существующие
 *
 * `Heading`, `Card`, `Chip`, `Button`, `PriceRange` кита — элементы страницы админки с её ролями и состояниями: на странице сайта
 * это изображение чужого интерфейса, и вид сайта сменится его ДС одной правкой ролей `--site-*`. Страница стенда классов вида не
 * несёт; разделы собираются из данных — разбор `scheme-edit.md`, раздел 5, № 109.
 */

/** Незаполненное поле: цель на табе «Витрина» (`data-field` либо `data-act`) и подпись поля. */
export interface ScenarioGap {
  /** Место перехода на табе: значение `data-field` поля. */
  field: string
  /** Подпись поля — «Продающее название», «Краткое описание». */
  label: string
}

/** Пара «проблема — последствия — решение» блока «Зачем нужен осмотр». */
export interface ScenarioPair { problem: string, effect: string, solution: string }
/** Метрика: значение и подпись. */
export interface ScenarioMetric { label: string, value: string }

/**
 * Места незаполненного на странице: поля первого экрана, развёрнутое описание, пара и метрика по номеру, пустой список метрик,
 * скрытые модули.
 */
export type ScenarioGapKey = 'title' | 'summary' | 'image' | 'price' | 'tags' | 'description' | 'metrics' | 'modules' | `pair:${number}` | `metric:${number}`

/** Страница сценария из данных — `ScenarioPreview`. */
export interface ScenarioPage {
  /** Продающее название. */
  title: string
  /** Краткое описание — описание для витрины. */
  summary: string
  /** Изображение: адрес картинки; пусто — не загружено. */
  image: string
  /** Цена «от», ₽: `null` — цены на странице нет (не показывается либо не заполнена — тогда метка в `gaps.price`). */
  price: number | null
  /** Метки: индустрия, сферы применения, объект. */
  tags: string[]
  /** Кнопка первого экрана. */
  action: string
  /** Развёрнутое описание «Зачем нужен осмотр». */
  description: string
  pairs: ScenarioPair[]
  metrics: ScenarioMetric[]
  /** «Как устроена схема» — статусы осмотра по порядку. */
  steps: string[]
  /** «ИИ-модули и проверки» — показанные на витрине. */
  modules: string[]
  /** Незаполненное по местам страницы. */
  gaps: Partial<Record<ScenarioGapKey, ScenarioGap>>
}

/** Цена на странице — «от 2 599 ₽»: разряды неразрывным пробелом (`formatPrice` вилки цен). */
export const scenarioPrice = (n: number) => `от ${formatPrice(n)}`
