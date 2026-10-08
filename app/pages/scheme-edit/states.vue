<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { formulaPreview } from '~/components/ui/formula-input'
import { clearMatches, highlightMatches, queryWords } from '~/components/ui/highlight-text'
import { variantChips, variantGroups } from '~/stands/scheme-edit/repeat-texts'
import { createModel, PRICE_SOURCES, SHOWCASE_IMAGE_SRC, type Dataset } from '~/stands/scheme-edit/model'
import type { ScenarioPage } from '~/components/ui/scenario-preview'
import demoData from '~/stands/scheme-edit/demo-data.json'

/**
 * Матрицы компонентов страницы «Редактирование схемы осмотра» — стенд, такты 61–62. Примеры вызова для фронтов.
 * Оснастка приёмки, не продукт. Сам экран — `/scheme-edit`.
 *
 * П1: ось `AppBarStatus` — `surface="light"` и `retryable`.
 * П2: `Card`, `SettingRow`, `SectionNav`, `FormulaInput` с `FormulaPreview`, ось `Select multiple`, ступени `Heading`
 * `title`, `group` и проп `description` (`docs/scheme-edit.md`, разделы 8 и 9).
 * П5: ось `highlighted` у `SettingRow` — подсветка найденного.
 * П4: `PublishStatus`, `Diff` с частями, ось `ModalCardHeader back` (`docs/scheme-edit.md`, раздел 8, карточки 5 и 6).
 * П3: вариант `Button variant="outline"` — мастер кита 1 `btn_outline` `1990:226`; события `edit` и `action` у
 * `TableRowActions`.
 * Такт 68: ось `readonly` у `Field` и десяти контролов — матрица «обычное · только чтение · выключено».
 * Такт 86: `SearchResult`, `HighlightText`, счётчик `SectionNavItem count`.
 * Такт 87: оси `MediaGalleryItem` — выбор, «уже у шага», «открыть крупно», подпись; `ThumbStrip` (карточка 10).
 * Такт 88: ось `Chip pressable` — чип-вариант; композиции страницы — строки вставки из другой схемы (поле с конфликтом
 * алиаса, шаг с подсказками) и поле текста повторяемого процесса с вариантами.
 * Такт 89: семейство «Превью приложения» (`AppPreview`, части, `AppPreviewScreen`, `AppPreviewThumb` — карточка 11) и «?» с
 * превью `HelpPreview` (карточка 12); слот `help` у `SettingRow` и `Field`, вторая строка якоря `SectionNavAnchor`. Экраны — из
 * демо-данных страницы схемы той же сборкой, что демо-осмотр (`buildDemo`).
 * Такт 90: рамка браузера `AppPreviewBrowser` (карточка 13) и семейство «Превью страницы сценария» (`ScenarioPreview` и части —
 * карточка 14); композиция страницы — «Цена «от»» с источником. Страницы — из демо-данных страницы схемы той же сборкой, что
 * превью на табе «Витрина» (`buildSitePreview`).
 */
definePageMeta({ layout: false })
useHead({ title: 'Редактирование схемы осмотра — матрицы' })

const STATES = ['saving', 'saved', 'error'] as const

/* ------------------------------ П2 ------------------------------ */
const row = ref({ plain: true, help: false, parent: true, off: false, armed: true, zero: true, blocked: false })
const minutes = ref(60)

const nav = ref('general')
const navAnchor = ref('behavior')
const nav2 = ref('access')

const ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'approver', label: 'Согласующий' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'operator', label: 'Оператор' },
  { value: 'agent', label: 'Агент' },
]
const rolesEmpty = ref<string[]>([])
const rolesOne = ref(['admin'])
const rolesMany = ref(['admin', 'approver', 'expert', 'operator', 'agent'])

const VARIABLES = [
  { value: 'Car:vin', label: 'VIN', group: 'Автомобиль' },
  { value: 'Car:regnum', label: 'Госномер', group: 'Автомобиль' },
  { value: 'Inspection:number', label: 'Номер осмотра', group: 'Осмотр' },
]
const SAMPLES = { 'Car:vin': 'DEMO0000000001024', 'Car:regnum': 'А000АА00', 'Inspection:number': '№ 1024' }
const formula = ref('Осмотр {Inspection:number} — {Car:vin}')
const formulaEmpty = ref('')
const formulaUnknown = ref('Архив {Car:vin}_{Car:color}')

/* ------------------------------ Такт 68: только чтение ------------------------------ */
const RO_STATES = [
  { id: 'normal', label: 'обычное' },
  { id: 'readonly', label: 'только чтение' },
  { id: 'disabled', label: 'выключено' },
] as const
const SCHEME_TYPES = [{ value: 'car', label: 'Осмотр транспорта' }, { value: 'house', label: 'Осмотр недвижимости' }]
const OWNERS = [{ value: 'demo', label: 'Демо Страхование' }, { value: 'test', label: 'Тест Лизинг' }]
const ro = ref({
  name: 'КАСКО — осмотр легкового автомобиля',
  description: 'Осмотр автомобиля перед оформлением полиса',
  type: 'car',
  roles: ['admin', 'expert'],
  owner: 'Демо Страхование',
  minutes: 60,
  formula: 'Осмотр {Inspection:number} — {Car:vin}',
  check: true,
  active: true,
  mode: 'regular',
})
const READONLY_EXAMPLE = `<!-- обвязка отдаёт ось контролу внутри: значение выделяется и копируется, правки нет -->
<Field label="Наименование" readonly>
  <Input v-model="name" placeholder="" :show-icon="false" />
</Field>
<!-- без обвязки — свой проп у каждого из десяти контролов -->
<Checkbox v-model="skipExpertise" readonly>Пропускать экспертизу</Checkbox>`

/* ------------------------------ П5 ------------------------------ */
const flash = ref<number | null>(null)
const HIGHLIGHT_EXAMPLE = `<!-- новое число запускает вспышку строки; длительность держит компонент -->
<SettingRow :highlighted="found === 'cadastreMap' ? foundCount : null">
  <Checkbox v-model="value" subtitle="Пояснение">Показывать координаты на кадастровой карте</Checkbox>
</SettingRow>`

/* ------------------------------ П4 ------------------------------ */
const statusLog = ref('—')
const DIFF_AREAS = [
  { id: 'settings', title: 'Настройки', count: '2 изменения', tone: 'changed' as const, groups: [
    { kind: 'changed' as const, items: [
      { label: 'Отправлять поля на согласование согласующему лицу', before: 'выключено', after: 'включено', effect: 'В процесс добавится этап согласования' },
      { label: 'Описание', before: 'Осмотр автомобиля', after: 'Комплексный осмотр автомобиля' },
    ] },
  ] },
  { id: 'form', title: 'Форма', count: '+7 полей', tone: 'added' as const, groups: [
    { kind: 'added' as const, items: Array.from({ length: 7 }, (_, k) => ({ label: `Поле «Фото ${k + 1}»`, after: 'группа «Автомобиль»' })) },
  ] },
  { id: 'processes', title: 'Процессы и шаги', count: '−1 шаг', tone: 'removed' as const, groups: [
    { kind: 'removed' as const, items: [{ label: 'Шаг «Страховой полис»', before: 'процесс «Осмотр документов»' }] },
  ] },
  { id: 'showcase', title: 'Витрина', count: 'без изменений', tone: 'none' as const, groups: [] },
]
const DIFF_WARNINGS = [
  { text: 'Согласование включено, поля для согласования не отмечены', critical: false },
  { text: 'У поля «Пробег» пустой алиас', critical: true },
]

const PUBLISH_STATUS_EXAMPLE = `<PublishStatus state="draft" author="Игорь Петров" date="01.10.2026, 11:40" @open="openDiff" />   <!-- кнопка: открывает дифф -->
<PublishStatus state="published" />
<PublishStatus state="never" />
<PublishStatus state="draft" author="Анна Смирнова" date="03.10.2026, 09:00" editing="Игорь Петров" />   <!-- presence -->

<!-- в узкой строке шапки — ужимается многоточием, полный текст в подсказке (такт 67) -->
<div class="flex min-w-0 flex-1 items-center gap-4">
  <PublishStatus state="draft" :author="draft.author" :date="draftDate" :editing="editing" />
  <div class="flex shrink-0 items-center gap-4">…история, статус сохранения…</div>
</div>`

const DIFF_EXAMPLE = `<!-- готовый результат сравнения: области, опасное, предупреждения, итог -->
<Diff :areas="diff.areas" :attention="diff.attention" :warnings="warnings" :total="diff.total" />

<!-- те же части по одной -->
<DiffArea title="Форма" count="+1 поле" tone="added">
  <DiffGroup kind="added" :items="[{ label: 'Поле «Цвет кузова»', after: 'группа «Автомобиль»' }]" />
</DiffArea>`

const HEADER_BACK_EXAMPLE = `<ModalCardHeader back title="Версия от 22.09.2026, 16:05" subtitle="Опубликовал(а) Игорь Петров" @back="toList" />`

/* ------------------------------ П3 ------------------------------ */
const rowLog = ref('—')
const ROW_ACTIONS = [{ key: 'delete', label: 'Удалить', icon: 'delete' as const, destructive: true }]

const BUTTON_OUTLINE_EXAMPLE = `<Button variant="outline">Отменить</Button>                       <!-- контурная: рамка 1 и текст --primary, фона нет -->
<Button variant="outline" show-icon>
  <template #icon><Icon name="add" :size="16" /></template>
  Добавить шаблон
</Button>
<Button variant="outline" disabled>Сбросить к значениям по умолчанию</Button>   <!-- выключено — цветом --primary-disabled -->`

const ROW_ACTIONS_EXAMPLE = `<TableRowActions
  :actions="[{ key: 'delete', label: 'Удалить', icon: 'delete', destructive: true }]"
  @edit="openTemplate(row.id)"            <!-- карандаш -->
  @action="key => remove(row.id, key)"    <!-- вторичное действие: ключ из actions -->
/>`

const IDENTITY_EXAMPLE = `<TableCellIdentity>
  VIN под стеклом
  <template #description>Сфотографируйте VIN-номер через лобовое стекло</template>   <!-- пояснение 13/16, не больше двух строк -->
</TableCellIdentity>
<TableCellIdentity icon="car">Легковой автомобиль</TableCellIdentity>                  <!-- без слота — прежний блок -->
<TableCellText size="sm" class="w-full">Распознавание VIN</TableCellText>                <!-- строка списка в ячейке: 13/16, обрезка с подсказкой -->`

const HEADING_EXAMPLE = `<Heading level="title" description="Базовые параметры схемы осмотра">Основное</Heading>   <!-- раздел страницы: 24/28, подпись 13/16 -->
<Heading level="group">Экспертиза и проверка</Heading>                                        <!-- группа в карточке: 20/24 -->`

const CARD_EXAMPLE = `<Card class="flex flex-col gap-2">          <!-- поверхность блока: радиус 24, поля 24; раскладку задаёт класс -->
  <Heading level="group">Согласование</Heading>
  <SettingRow>…</SettingRow>
</Card>
<Card tone="muted">…</Card>                 <!-- приглушённая подложка вложенной формы -->`

const SETTING_ROW_EXAMPLE = `<!-- «гасит»: причина недоступности; контрол получает disabled из слота -->
<SettingRow v-slot="{ disabled }" :reason="rule.reason">
  <Checkbox v-model="value" :disabled="disabled" subtitle="Пояснение">Название настройки</Checkbox>
</SettingRow>

<!-- «вооружает»: счётчик связи и переход; metaTone="warning" — при нуле -->
<SettingRow help="Текст подсказки «?»" meta="Отмечено 2 поля на согласование">
  <Checkbox v-model="value">Отправлять поля на согласование</Checkbox>
  <template #action><ButtonAction size="sm" @click="goToFields">Перейти к полям</ButtonAction></template>
</SettingRow>

<!-- родитель и вложенные параметры; collapsed — родитель выключен -->
<SettingRow :collapsed="!parent">
  <Checkbox v-model="parent">Блокировать осмотр при проверке</Checkbox>
  <template #children><Field label="…" orientation="left"><InputNumber v-model="minutes" /></Field></template>
</SettingRow>`

const SECTION_NAV_EXAMPLE = `<SectionNav v-model="section" title="Настройки" class="sticky top-6">
  <SectionNavItem value="general" label="Общие" status="attention">      <!-- status: none · on · off · attention -->
    <SectionNavAnchor label="Основное" :active="anchor === 'main'" @select="goAnchor('main')" />
    <SectionNavAnchor label="Поведение процесса" :active="anchor === 'behavior'" @select="goAnchor('behavior')" />
  </SectionNavItem>
  <SectionNavItem value="pdf" label="PDF" status="off" />
</SectionNav>`

const SELECT_MULTIPLE_EXAMPLE = `<Field label="Кто может редактировать дедлайн">
  <Select v-model:values="roles" multiple :items="ROLES" placeholder="Выберите роли" />   <!-- значение — массив строк -->
</Field>`

const FORMULA_EXAMPLE = `<Field label="Тема письма оповещения" hint="Тема письма, которое получает клиент">
  <!-- значение — строка: текст и переменные {Группа:ключ} -->
  <FormulaInput v-model="formula" :variables="[{ value: 'Car:vin', label: 'VIN', group: 'Автомобиль' }, …]" label="Тема письма оповещения" />
</Field>
<FormulaPreview :value="formulaPreview(formula, { 'Car:vin': 'DEMO0000000001024' })" />   <!-- превью считает страница -->`

/* ------------------------------ Такт 86: поиск как в IDE ------------------------------ */
const resultOn = ref(true)
const resultLog = ref('—')
const SEARCH_RESULT_EXAMPLE = `<!-- строка выдачи: иконка типа, подпись с подсвеченным совпадением, пояснение, значение справа -->
<SearchResult type="setting" label="Разрешение фото" query="фото" value="Среднее — 2 Мп" :active="active === key" @select="open(key)" />
<!-- булева настройка: переключатель справа; нажатие по нему — событие toggle, строку оно не выбирает -->
<SearchResult type="setting" label="Детектор «Размытые изображения»" query="размыт фото" hint="по запросу «размытые фото»" toggle :checked="on" @toggle="toggle(key)" />
<!-- погашенная зависимостью: всё на 0.48, причина второй строкой полным контрастом, переключатель выключен -->
<SearchResult type="setting" label="Разрешить принимать осмотр одной кнопкой" toggle reason="Доступно только для стандартной схемы" />
<!-- действие — своя иконка -->
<SearchResult type="action" icon="visibility" label="Предпросмотр" query="пред" />`

const HIGHLIGHT_TEXT_EXAMPLE = `<!-- каждое слово запроса — начало слова в тексте, иначе — с середины слова от трёх знаков; регистр и «ё» не важны -->
<HighlightText text="Детектор «Размытые изображения»" query="размыт изоб" />

<!-- подсветка на странице — CSS Custom Highlight API: разметку страницы не трогает -->
highlightMatches([{ el: row, words: queryWords('фото'), current: true }, { el: other, words: queryWords('фото') }])
clearMatches()`

const SECTION_NAV_COUNT_EXAMPLE = `<!-- режим «найдено» страницы схемы: число совпадений раздела у правого края строки; 0 показывается -->
<SectionNavItem value="anomalies" label="Аномалии" status="on" :count="2" />`

/* ------------------------------ Такт 87: фото-подсказки ------------------------------ */
const HINT = (id: string) => `/scheme-edit/hints/${id}.svg`
const UPLOAD = HINT('upload')
const tilePicked = ref<string[]>(['car-right'])
const tileLog = ref('—')
function tileToggle(id: string) {
  tilePicked.value = tilePicked.value.includes(id) ? tilePicked.value.filter(x => x !== id) : [...tilePicked.value, id]
  tileLog.value = `toggle: ${id}`
}
const THUMBS = [
  { src: HINT('car-front'), label: 'Передняя часть · анфас' },
  { src: HINT('car-front-left'), label: 'Передняя часть · три четверти слева' },
  { src: HINT('car-front-right'), label: 'Передняя часть · три четверти справа' },
  { src: UPLOAD, label: 'Своя загрузка · front-1.jpg' },
  { src: UPLOAD, label: 'Своя загрузка · front-2.jpg' },
]
const thumbLog = ref('—')
const GALLERY_SELECT_EXAMPLE = `<!-- плитка выбора: нажатие, пробел и Enter — событие toggle; флажок в левом верхнем углу -->
<MediaGallery size="md">
  <MediaGalleryItem
    v-for="c in items" :key="c.id" size="md" class="w-44" :src="c.src" :alt="c.label"
    selectable :selected="picked.includes(c.id)" :disabled="attached.has(c.id)"
    open-label="Открыть крупно" @toggle="toggle(c.id)" @open="view(c.id)"
  >
    <template #title><HighlightText :text="c.part" :query="query" /></template>   <!-- 13/16 medium -->
    <template #subtitle>{{ c.angle }}</template>                                   <!-- 13/16 --muted-foreground -->
  </MediaGalleryItem>
</MediaGallery>
<!-- без новых осей и слотов — прежняя плитка: корень и есть картинка -->
<MediaGalleryItem size="sm" :src="src" class="w-24" />`
const THUMB_STRIP_EXAMPLE = `<!-- до max миниатюр 28 × 20, остаток — «+N»; нажатие — номер миниатюры с нуля, по «+N» — первая скрытая -->
<ThumbStrip :items="hints.map(h => ({ src: h.src, label: h.label }))" :max="3" label="Фото-подсказки шага «Передняя часть»" @open="k => view(k)" />`

/* ------------------------------ Такт 88: вставка из другой схемы, тексты повторяемого процесса ------------------------------ */
const chipValue = ref('Повреждение')
const chipLog = ref('—')
const CHIP_PRESSABLE_EXAMPLE = `<!-- чип-вариант: пилюля целиком — кнопка; active — значение уже выбрано (aria-pressed); подпись не шире контейнера -->
<Chip v-for="v in variants" :key="v" pressable :active="value === v" :title="v" @click="value = v">{{ v }}</Chip>
<!-- рядом — «Все варианты»: прежний чип с раскрытием, триггер поповера -->
<PopoverTrigger as-child><Chip trailing="expand" :expanded="open">Все варианты</Chip></PopoverTrigger>`
const pastePicked = ref<string[]>(['df-number'])
function pasteDemoToggle(id: string) {
  pastePicked.value = pastePicked.value.includes(id) ? pastePicked.value.filter(x => x !== id) : [...pastePicked.value, id]
}
const PASTE_ROWS_EXAMPLE = `<!-- строка поля донора: флажок, имя, конфликт алиаса пояснением под именем, алиас, тип -->
<TableRow :state="picked ? 'selected' : 'default'">
  <TableCell variant="slot" align="start" class="w-10 justify-center px-2"><Checkbox v-model="picked" :aria-label="field.title" /></TableCell>
  <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start px-4 pt-4.5 pb-3 contain-inline-size">
    <TableCellIdentity class="w-full flex-none">
      {{ field.title }}
      <template v-if="conflict" #description>алиас {{ field.alias }} уже есть — будет {{ newAlias }}</template>
    </TableCellIdentity>
  </TableCell>
  <TableCell align="start" class="w-40 px-4">{{ field.alias }}</TableCell>
  <TableCell variant="slot" align="start" class="w-28 px-4"><Chip variant="neutral">Текст</Chip></TableCell>
</TableRow>
<!-- схема донора и группа — строка-переход ListRow, как список версий истории -->
<ListRow @click="openScheme(id)"><HighlightText :text="title" :query="query" /><template #secondary>Осмотр транспорта · 2 группы · 9 полей</template></ListRow>`
const textEmpty = ref('')
const textPicked = ref('Деталь кузова')
const textOwn = ref('Найденное повреждение')
const textRo = ref('Повреждение')
const textVariantsOpen = ref(false)
const REPEAT_TEXT_EXAMPLE = `<Field label="Название повтора" hint="Список повторов — с номером: «Повреждение 1», «Повреждение 2»">
  <div class="flex flex-col gap-2">
    <Autocomplete v-model="texts.item" :items="variants.map(v => ({ value: v, label: v }))" placeholder="Например, Повреждение" :show-icon="false" />
    <div class="flex flex-wrap items-center gap-2">
      <Chip v-for="v in chips" :key="v" pressable :active="texts.item === v" :title="v" @click="texts.item = v">{{ v }}</Chip>
      <Popover v-model:open="open">…«Все варианты»: Input поиска, SelectGroup по типу объекта, SelectItem…</Popover>
    </div>
  </div>
</Field>`

/* ------------------------------ такт 89: превью приложения и «?» с превью ------------------------------ */
/** Экраны матрицы — демо-данные страницы схемы с разрешённым отказом, промежуточным экраном и телефоном (оснастка `?app=full`). */
const appModel = createModel((demoData as unknown as Record<'main', Dataset>).main)
{
  const s = appModel.draft.config.settings
  s.general.behavior.refuse = true
  s.general.behavior.refuseRepeatable = true
  s.mobile.startAfterCreate = false
  s.mobile.phone = '+7 800 000-00-00'
  s.mobile.phoneName = 'Служба поддержки'
}
const appScreens = appModel.demo.value.byId
const REFUSE = ['setting:general.behavior.refuse']
const pressLog = ref('—')
const previewOpen = ref(true)
const anchorAt = ref('step-2')
const APP_PREVIEW_EXAMPLE = `<!-- экран из данных: части в рамке телефона; marked — источники обведённых частей; interactive — кнопки с переходом нажимаются -->
<AppPreviewScreen :screen="{ title: 'Осмотр КАСКО', parts }" size="lg" :scale="1.4" :marked="['setting:refuse']" interactive
  @go="openScreen" @enter="hover = $event" @leave="hover = ''" />
<!-- фрагмент для поповера «?»: тело экрана без строки состояния и шапки, окно во всю ширину и 288 в высоту -->
<AppPreviewScreen :screen="screen" size="md" fragment :marked="['setting:refuse']" />
<!-- части отдельно -->
<AppPreview title="Осмотр КАСКО" size="md">
  <AppPreviewProgress :total="4" :done="2" />
  <AppPreviewText variant="heading">Шаг 3: Фото переднего бампера</AppPreviewText>
  <AppPreviewText variant="secondary" class="-mt-2">Сфотографируйте повреждения крупным планом</AppPreviewText>
  <AppPreviewShot caption="1 фото" />
  <template #footer>
    <AppPreviewButton variant="refuse" highlighted>Осмотр невозможен</AppPreviewButton>
    <AppPreviewButton>Продолжить</AppPreviewButton>
  </template>
</AppPreview>
<!-- миниатюра карты экранов: подпись, пробелы, текущий -->
<AppPreviewThumb :screen="screen" label="Шаг 2: VIN на металле" :gaps="['нет фото-подсказки']" current @click="open" />`
const HELP_PREVIEW_EXAMPLE = `<!-- «?» с превью: поповер по нажатию справа от кнопки; фрагмент — слотом; «Открыть в демо-осмотре» — событие action -->
<SettingRow>
  <Checkbox v-model="refuse">Разрешить отказываться с отметкой «Осмотр невозможен»</Checkbox>
  <template #help>
    <HelpPreview title="Отказ от осмотра" description="…" value="Сейчас: разрешён" @action="openDemo">
      <AppPreviewScreen :screen="screen" size="md" fragment :marked="['setting:refuse']" />
    </HelpPreview>
  </template>
</SettingRow>
<!-- у подписи поля — слот help у Field -->
<Field label="Телефон для звонка"><Input v-model="phone" /><template #help><HelpPreview … /></template></Field>`
const ANCHOR_DESCRIPTION_EXAMPLE = `<!-- вторая строка якоря: пробелы экрана тоном предупреждения -->
<SectionNavAnchor label="Шаг 2: VIN на металле" description="нет фото-подсказки" tone="warning" :active="current" @select="open" />`

/** Подсветка на странице — пример `highlightMatches` на узлах матрицы: все совпадения и текущее. */
const pagePainted = ref('—')
function paintDemo() {
  const rows = [...document.querySelectorAll('[data-matrix="page-highlight"] [data-demo-row]')]
  const words = queryWords('фото')
  const r = highlightMatches(rows.map((el, k) => ({ el, words, current: k === 1 })))
  pagePainted.value = `${r.all} + ${r.current}`
}
function clearDemo() {
  clearMatches()
  pagePainted.value = '—'
}
onBeforeUnmount(() => clearMatches())

/* ------------------------------ такт 90: превью публичной страницы, цена «от» ------------------------------ */
/** Страница сценария черновика демо-данных: краткое описание и изображение не заполнены. */
const siteGaps: ScenarioPage = appModel.site.value
/** Та же страница заполненной целиком. */
const siteFull: ScenarioPage = {
  ...siteGaps,
  summary: 'Клиент снимает автомобиль сам по подсказкам приложения — осмотр за 15 минут без выезда эксперта',
  image: SHOWCASE_IMAGE_SRC.vehicle!,
  gaps: {},
}
/** Новая схема: метки «Не заполнено» у первого экрана. */
const siteFresh: ScenarioPage = createModel((demoData as unknown as Record<'fresh', Dataset>).fresh).site.value
/** Незаполненные части — пара и метрика, пустой список метрик. */
const PAIRS_GAP = [siteFull.pairs[0]!, { problem: 'Хаос в материалах', effect: '', solution: '' }]
const METRICS_GAP = [siteFull.metrics[0]!, { label: '', value: '' }]
const gapLog = ref('—')
const priceSourceDemo = ref('tariff')
const priceManualDemo = ref('500')
const SITE_EXAMPLE = `<!-- рамка браузера: компьютер либо телефон; тело — прокрутка и @container, высоту задаёт раскладка -->
<AppPreviewBrowser :device="device" url="example.com/scenarios/osmotr-avtomobilya" class="h-full">
  <!-- страница сценария из данных; view="card" — карточка в каталоге; метка «Не заполнено» — событие gap с полем таба -->
  <ScenarioPreview :page="page" :view="view" @gap="gap => goToField(gap.field)" />
</AppPreviewBrowser>
<!-- части отдельно — внутри контейнера @container: раскладка по его ширине -->
<ScenarioPreviewHero title="Дистанционный осмотр автомобиля" summary="Осмотр за 15 минут" :price="700" :tags="['Страхование']" :gaps="{ image: { field: 'scImage', label: 'Изображение' } }" @gap="…" />
<ScenarioPreviewSection title="Зачем нужен осмотр" description="…">
  <ScenarioPreviewPairs :pairs="pairs" :gaps="{ 1: { field: 'scEffect1', label: 'Проблемы и решения, пара 2' } }" />
  <ScenarioPreviewMetrics :metrics="metrics" :empty="{ field: 'scMetrics', label: 'Метрики' }" />
</ScenarioPreviewSection>
<ScenarioPreviewSection title="Как устроена схема" tone="band"><ScenarioPreviewSteps :steps="steps" /></ScenarioPreviewSection>
<ScenarioPreviewTags size="md" :items="modules" />
<ScenarioPreviewCard title="…" summary="…" :price="700" :tags="tags" />
<ScenarioPreviewGap label="Краткое описание" @go="goToField('scSummary')" />`
const PRICE_EXAMPLE = `<!-- композиция страницы: источник цены — радио-карточки, под ними цена из тарифа либо ручная цена -->
<Field label="Цена «от»" orientation="left" label-width="form">
  <RadioGroup v-model="source" class="grid grid-cols-3 gap-2">
    <RadioGroupItem v-for="x in sources" :key="x.value" variant="card" :value="x.value" :checked="source === x.value">
      {{ x.label }}<template #description>{{ x.description }}</template>
    </RadioGroupItem>
  </RadioGroup>
  <PriceRange label="На витрине" :min="700" note="текущий тариф с января 2026 · «Осмотр легкового автомобиля», КАСКО" />
  <Hyperlink href="/tariffs?tab=schemes&open=scheme&scheme=s-car" target="_blank" rel="noopener" size="sm">Открыть тарификацию</Hyperlink>
  <!-- вручную: ниже тарифа — подсказка тоном предупреждения -->
  <Field hint="Ниже тарифа: для не клиента — от 700 ₽" hint-tone="warning"><Input v-model="price" unit="₽" numeric /></Field>
</Field>`
</script>

<template>
  <main class="flex flex-col gap-10 px-8 py-6">
    <Heading level="page" as="h1">
      Страница схемы — матрицы
    </Heading>

    <section class="flex flex-col gap-4" data-matrix="app-bar-status-light">
      <Heading>AppBarStatus · surface="light" — статус сохранения в шапке страницы</Heading>
      <div class="flex flex-col items-start gap-3">
        <AppBarStatus v-for="s in STATES" :key="s" surface="light" :state="s" />
        <AppBarStatus surface="light" state="error" retryable />
      </div>
    </section>

    <section class="flex flex-col gap-4" data-matrix="app-bar-status-dark">
      <Heading>AppBarStatus · surface="dark" — полоса приложения, как на «Свободной съёмке»</Heading>
      <AppBar>
        <template #end>
          <AppBarStatus v-for="s in STATES" :key="s" :state="s" />
          <AppBarStatus state="error" retryable />
        </template>
      </AppBar>
    </section>

    <!-- ============================ П2, такт 62 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="heading">
      <Heading>Heading · ступени title, group и проп description</Heading>
      <div class="flex max-w-settings flex-col gap-6">
        <Heading level="title" description="Базовые параметры схемы осмотра">
          Основное — level="title" с description
        </Heading>
        <Heading level="title">
          Поведение процесса — level="title"
        </Heading>
        <Heading level="group">
          Экспертиза и проверка — level="group"
        </Heading>
        <Heading level="group" description="Подпись под заголовком группы">
          Дедлайн проверки — level="group" с description
        </Heading>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HEADING_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="card">
      <Heading>Card — поверхность блока настроек</Heading>
      <div class="grid max-w-settings grid-cols-2 gap-6">
        <Card class="flex flex-col gap-2" data-case="default">
          <Heading level="group">
            tone="default"
          </Heading>
          <Checkbox :model-value="true" subtitle="Белая поверхность с рамкой, радиус 24, поля 24">
            Содержимое карточки
          </Checkbox>
        </Card>
        <Card tone="muted" class="flex flex-col gap-2" data-case="muted">
          <Heading level="group">
            tone="muted"
          </Heading>
          <Checkbox :model-value="false" subtitle="Приглушённая подложка вложенной формы">
            Содержимое карточки
          </Checkbox>
        </Card>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ CARD_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="setting-row">
      <Heading>SettingRow — строка настройки</Heading>
      <Card class="flex max-w-settings flex-col gap-2">
        <SettingRow data-case="plain">
          <Checkbox v-model="row.plain" subtitle="Контрол с названием и пояснением">
            Строка без обвязки
          </Checkbox>
        </SettingRow>
        <SettingRow data-case="help" help="Текст подсказки открывается наведением и фокусом">
          <Checkbox v-model="row.help">
            Строка с подсказкой «?»
          </Checkbox>
        </SettingRow>
        <SettingRow v-slot="{ disabled }" data-case="reason" reason="Доступно только для стандартной схемы">
          <Checkbox v-model="row.blocked" :disabled="disabled" subtitle="Паттерн «гасит»: контрол выключен, причина под ним">
            Строка с причиной недоступности
          </Checkbox>
        </SettingRow>
        <SettingRow data-case="meta" meta="Отмечено 2 поля на согласование">
          <Checkbox v-model="row.armed">
            Строка со счётчиком связи и переходом
          </Checkbox>
          <template #action>
            <ButtonAction size="sm" :show-icon="false">
              Перейти к полям
            </ButtonAction>
          </template>
        </SettingRow>
        <SettingRow data-case="meta-warning" meta="Отмечено 0 полей на согласование — согласование не сработает, пока поля не отмечены" meta-tone="warning">
          <Checkbox v-model="row.zero">
            Счётчик при нуле — предупреждение
          </Checkbox>
          <template #action>
            <ButtonAction size="sm" :show-icon="false">
              Перейти к полям
            </ButtonAction>
          </template>
        </SettingRow>
        <SettingRow data-case="children" :collapsed="!row.parent">
          <Checkbox v-model="row.parent" subtitle="Параметры родителя видны при включённом родителе">
            Родитель с вложенными параметрами
          </Checkbox>
          <template #children>
            <Field label="Разблокировать при неактивности через, минут" orientation="left" :control-height="32">
              <InputNumber v-model="minutes" :min="5" :max="120" :step="5" />
            </Field>
          </template>
        </SettingRow>
        <SettingRow data-case="collapsed" :collapsed="!row.off">
          <Switch v-model="row.off" subtitle="collapsed: вложенные параметры скрыты">
            Родитель выключен — на переключателе
          </Switch>
          <template #children>
            <Checkbox :model-value="false">
              Вложенный параметр
            </Checkbox>
          </template>
        </SettingRow>
      </Card>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SETTING_ROW_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="section-nav">
      <Heading>SectionNav — навигатор разделов</Heading>
      <div class="flex items-start gap-6">
        <SectionNav v-model="nav" title="Настройки" data-case="anchors">
          <SectionNavItem value="general" label="Общие" status="attention">
            <SectionNavAnchor label="Основное" :active="navAnchor === 'main'" @select="navAnchor = 'main'" />
            <SectionNavAnchor label="Поведение процесса" :active="navAnchor === 'behavior'" @select="navAnchor = 'behavior'" />
            <SectionNavAnchor label="Формулы и служебное" :active="navAnchor === 'formulas'" @select="navAnchor = 'formulas'" />
          </SectionNavItem>
          <SectionNavItem value="mobile" label="Мобильное приложение" />
          <SectionNavItem value="anomalies" label="Аномалии" status="on" />
          <SectionNavItem value="pdf" label="PDF" status="off" />
        </SectionNav>
        <SectionNav v-model="nav2" title="Настройки" data-case="plain">
          <SectionNavItem value="general" label="Общие" />
          <SectionNavItem value="access" label="Права доступа">
            <SectionNavAnchor label="Выполнение осмотра" active />
            <SectionNavAnchor label="Группы доступа" />
          </SectionNavItem>
          <SectionNavItem value="ai" label="ИИ-анализ" />
        </SectionNav>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SECTION_NAV_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="select-multiple">
      <Heading>Select · multiple — набор значений чипами, мастер кита 1 multiselect 251:16816</Heading>
      <div class="grid max-w-settings grid-cols-2 items-start gap-6">
        <Field label="Пусто — state=Default" hint="Подсказка — у Field">
          <Select v-model:values="rolesEmpty" multiple :items="ROLES" placeholder="Выберите роли" data-case="empty" />
        </Field>
        <Field label="Выбрано — state=field">
          <Select v-model:values="rolesOne" multiple :items="ROLES" placeholder="Выберите роли" data-case="one" />
        </Field>
        <Field label="Перенос чипов — badge_list variant=6">
          <Select v-model:values="rolesMany" multiple :items="ROLES" placeholder="Выберите роли" data-case="many" />
        </Field>
        <Field label="Выключено — state=disabled" disabled>
          <Select :values="['admin']" multiple :items="ROLES" placeholder="Выберите роли" disabled data-case="disabled" />
        </Field>
        <Field label="Подпись слева — label=left" orientation="left">
          <Select v-model:values="rolesOne" multiple :items="ROLES" placeholder="Выберите роли" data-case="left" />
        </Field>
        <Field label="С поиском в плашке — searchable">
          <Select v-model:values="rolesOne" multiple searchable :items="ROLES" placeholder="Выберите роли" data-case="search" />
        </Field>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SELECT_MULTIPLE_EXAMPLE }}</pre>
    </section>

    <!-- ============================ П5, такт 65 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="setting-row-highlighted">
      <Heading>SettingRow · highlighted — подсветка найденного</Heading>
      <Card class="flex max-w-settings flex-col gap-2">
        <SettingRow data-case="highlighted" :highlighted="flash">
          <Checkbox :model-value="true" subtitle="Вспышка: заливка держится и гаснет за 1.5 с">
            Строка, найденная поиском
          </Checkbox>
        </SettingRow>
        <SettingRow data-case="rest">
          <Checkbox :model-value="false">
            Соседняя строка — без подсветки
          </Checkbox>
        </SettingRow>
      </Card>
      <div class="flex">
        <Button variant="secondary" data-act="flash" @click="flash = (flash ?? 0) + 1">
          Подсветить строку
        </Button>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HIGHLIGHT_EXAMPLE }}</pre>
    </section>

    <!-- ============================ П4, такт 64 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="publish-status">
      <Heading>PublishStatus — индикатор состояния публикации</Heading>
      <div class="flex flex-col items-start gap-3">
        <PublishStatus state="never" data-case="never" />
        <PublishStatus state="draft" author="Игорь Петров" date="01.10.2026, 11:40" data-case="draft" @open="statusLog = 'open'" />
        <PublishStatus state="draft" data-case="draft-bare" />
        <PublishStatus state="published" data-case="published" />
        <PublishStatus state="draft" author="Анна Смирнова" date="03.10.2026, 09:00" editing="Игорь Петров" data-case="editing" />
        <PublishStatus state="published" editing="Игорь Петров" data-case="published-editing" />
      </div>
      <!-- Узкий контейнер — такт 67: текст ужимается многоточием, полный — в подсказке; у первой строки подсказка открыта оснасткой. -->
      <div class="flex w-60 flex-col items-stretch gap-6 pt-8">
        <PublishStatus state="draft" author="Игорь Петров" date="01.10.2026, 11:40" tooltip-open data-case="narrow-draft" />
        <PublishStatus state="draft" author="Анна Смирнова" date="03.10.2026, 09:00" editing="Константин Константинопольский-Преображенский" data-case="narrow-editing" />
        <PublishStatus state="never" data-case="narrow-never" />
      </div>
      <ToolbarText>
        Событие индикатора черновика: {{ statusLog }}
      </ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PUBLISH_STATUS_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="diff">
      <Heading>Diff, DiffArea, DiffGroup, DiffChange — дифф конфигураций</Heading>
      <div class="grid max-w-settings grid-cols-1 gap-6">
        <Card data-case="full">
          <Diff :areas="DIFF_AREAS" :attention="['Удалён шаг «Страховой полис»']" :warnings="DIFF_WARNINGS" total="Итого: 10 изменений в 3 разделах" />
        </Card>
        <Card data-case="open">
          <Diff total="Итого: 2 изменения в 1 разделе">
            <DiffArea title="Настройки" count="2 изменения" tone="changed" open>
              <DiffGroup kind="changed" :items="DIFF_AREAS[0]!.groups[0]!.items" />
            </DiffArea>
            <DiffArea title="Форма" count="+7 полей" tone="added" open>
              <DiffGroup kind="added" :items="DIFF_AREAS[1]!.groups[0]!.items" />
            </DiffArea>
            <DiffArea title="Процессы и шаги" count="−1 шаг" tone="removed" open>
              <DiffGroup kind="removed" :items="DIFF_AREAS[2]!.groups[0]!.items" />
            </DiffArea>
            <DiffArea title="Витрина" count="без изменений" tone="none" />
          </Diff>
        </Card>
        <Card data-case="warnings">
          <Diff :warnings="[DIFF_WARNINGS[0]!]" />
        </Card>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ DIFF_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="modal-card-header-back">
      <Heading>ModalCardHeader · back — вариант «←» мастера modal_cards_header 864:2746</Heading>
      <div class="relative h-60 max-w-settings overflow-hidden">
        <ModalCard :open="true" :modal="false">
          <ModalCardContent inline placement="edge" data-case="back">
            <ModalCardHeader back title="Версия от 22.09.2026, 16:05" subtitle="Опубликовал(а) Игорь Петров · 41 осмотр" />
            <ModalCardBody>
              <ModalCardText>Второй слой окна: стрелка возвращает к списку версий</ModalCardText>
            </ModalCardBody>
          </ModalCardContent>
        </ModalCard>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HEADER_BACK_EXAMPLE }}</pre>
    </section>

    <!-- ============================ П3, такт 63 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="button-outline">
      <Heading>Button · variant="outline" — контурная кнопка, мастер кита 1 btn_outline 1990:226</Heading>
      <div class="flex flex-wrap items-center gap-4">
        <Button variant="outline" data-case="default">
          Отменить
        </Button>
        <Button variant="outline" show-icon data-case="icon">
          <template #icon>
            <Icon name="add" :size="16" />
          </template>
          Добавить шаблон
        </Button>
        <Button variant="outline" disabled data-case="disabled">
          Выключена
        </Button>
        <Button variant="outline" size="sm" data-case="sm">
          Малая
        </Button>
        <Button variant="outline" size="lg" data-case="lg">
          Большая
        </Button>
        <Button variant="secondary">
          secondary — для сравнения
        </Button>
        <Button>
          default — для сравнения
        </Button>
      </div>
      <div class="max-w-80">
        <Button variant="outline" wide data-case="wide">
          Во всю ширину
        </Button>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ BUTTON_OUTLINE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="table-row-actions">
      <Heading>TableRowActions — события edit и action</Heading>
      <div class="flex max-w-settings flex-col">
        <Table>
          <TableRow>
            <TableCell class="min-w-0 flex-1 px-4">
              Наведите на строку и нажмите действие
            </TableCell>
            <TableCell variant="slot" class="w-50 justify-end px-4">
              <TableRowActions :actions="ROW_ACTIONS" @edit="rowLog = 'edit'" @action="rowLog = `action: ${$event}`" />
            </TableCell>
          </TableRow>
        </Table>
      </div>
      <ToolbarText data-row-log>
        Последнее событие: {{ rowLog }}
      </ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ ROW_ACTIONS_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="formula-input">
      <Heading>FormulaInput и FormulaPreview — текст с переменными</Heading>
      <div class="flex max-w-settings flex-col gap-6">
        <div class="flex flex-col gap-2" data-case="filled">
          <Field label="Текст и переменные" hint="Значение: строка с {Группа:ключ}">
            <FormulaInput v-model="formula" :variables="VARIABLES" label="Текст и переменные" />
          </Field>
          <FormulaPreview :value="formulaPreview(formula, SAMPLES)" />
        </div>
        <div class="flex flex-col gap-2" data-case="empty">
          <Field label="Пусто, с плейсхолдером">
            <FormulaInput v-model="formulaEmpty" :variables="VARIABLES" placeholder="Текст и переменные" label="Пусто" />
          </Field>
          <FormulaPreview :value="formulaPreview(formulaEmpty, SAMPLES)" />
        </div>
        <div class="flex flex-col gap-2" data-case="unknown">
          <Field label="Неизвестная переменная — чип в состоянии ошибки" hint="Переменной {Car:color} нет в списке" invalid>
            <FormulaInput v-model="formulaUnknown" :variables="VARIABLES" label="Неизвестная переменная" invalid />
          </Field>
          <FormulaPreview :value="formulaPreview(formulaUnknown, SAMPLES)" />
        </div>
        <Field label="Выключено" disabled data-case="disabled">
          <FormulaInput model-value="Осмотр {Car:vin}" :variables="VARIABLES" label="Выключено" disabled />
        </Field>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ FORMULA_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Такт 70 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="table-cell-identity-description">
      <Heading>TableCellIdentity — слот description: пояснение под именем (строка шага, макет 32765:6668); TableCellText size="sm" — строки 13/16</Heading>
      <div class="flex max-w-settings flex-col">
        <Table>
          <TableRow>
            <TableCell variant="slot" class="h-auto min-w-0 flex-1 items-start px-4 py-3 contain-inline-size" data-case="description">
              <TableCellIdentity>
                VIN под стеклом
                <template #description>
                  Сфотографируйте VIN-номер через лобовое стекло, номер должен быть чётко виден
                </template>
              </TableCellIdentity>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell variant="slot" class="h-auto min-w-0 flex-1 items-start px-4 py-3 contain-inline-size" data-case="description-long">
              <TableCellIdentity icon="car">
                Передняя часть автомобиля
                <template #description>
                  Снимите переднюю часть автомобиля с расстояния 3–5 метров: номерной знак, фары и бампер целиком, без бликов на лобовом стекле и без посторонних предметов в кадре
                </template>
              </TableCellIdentity>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell variant="slot" class="min-w-0 flex-1 px-4" data-case="plain">
              <TableCellIdentity icon="car">
                Без слота — прежний блок
              </TableCellIdentity>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell variant="slot" class="h-auto w-44 flex-col items-start gap-1 px-4 py-3" data-case="text-sm">
              <TableCellText size="sm" class="w-full">
                Распознавание VIN
              </TableCellText>
              <TableCellText size="sm" class="w-full">
                Ракурсы авто · Правая сторона — длинное имя обрезается с подсказкой
              </TableCellText>
            </TableCell>
          </TableRow>
        </Table>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ IDENTITY_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Такт 68 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="readonly">
      <Heading>Только чтение — ось readonly у Field и десяти контролов: обычное · только чтение · выключено</Heading>
      <div class="grid grid-cols-3 gap-x-6 gap-y-6">
        <template v-for="st in RO_STATES" :key="'h-' + st.id">
          <Heading level="group">
            {{ st.label }}
          </Heading>
        </template>

        <template v-for="st in RO_STATES" :key="'input-' + st.id">
          <Field label="Input" :readonly="st.id === 'readonly'" :data-case="'input-' + st.id">
            <Input v-model="ro.name" placeholder="" :show-icon="false" clearable :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'textarea-' + st.id">
          <Field label="Textarea" :readonly="st.id === 'readonly'" :data-case="'textarea-' + st.id">
            <Textarea v-model="ro.description" placeholder="Описание" :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'select-' + st.id">
          <Field label="Select" :readonly="st.id === 'readonly'" :data-case="'select-' + st.id">
            <Select v-model="ro.type" :items="SCHEME_TYPES" placeholder="" :show-icon="false" :searchable="false" :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'select-multiple-' + st.id">
          <Field label="Select multiple" :readonly="st.id === 'readonly'" :data-case="'select-multiple-' + st.id">
            <Select v-model:values="ro.roles" multiple :items="ROLES" placeholder="Выберите роли" :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'autocomplete-' + st.id">
          <Field label="Autocomplete" :readonly="st.id === 'readonly'" :data-case="'autocomplete-' + st.id">
            <Autocomplete v-model="ro.owner" :items="OWNERS" placeholder="Найти компанию" :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'input-number-' + st.id">
          <Field label="InputNumber" orientation="left" :control-height="32" :readonly="st.id === 'readonly'" :data-case="'input-number-' + st.id">
            <InputNumber v-model="ro.minutes" :min="5" :max="120" :step="5" :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'formula-' + st.id">
          <Field label="FormulaInput" :readonly="st.id === 'readonly'" :data-case="'formula-' + st.id">
            <FormulaInput v-model="ro.formula" :variables="VARIABLES" label="FormulaInput" :disabled="st.id === 'disabled'" />
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'checkbox-' + st.id">
          <Field label="Checkbox" :readonly="st.id === 'readonly'" :data-case="'checkbox-' + st.id">
            <Checkbox v-model="ro.check" subtitle="Пояснение" :disabled="st.id === 'disabled'">
              Пропускать экспертизу
            </Checkbox>
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'switch-' + st.id">
          <Field label="Switch" :readonly="st.id === 'readonly'" :data-case="'switch-' + st.id">
            <Switch v-model="ro.active" :disabled="st.id === 'disabled'">
              Схема активна
            </Switch>
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'radio-' + st.id">
          <Field label="RadioGroupItem" :readonly="st.id === 'readonly'" :data-case="'radio-' + st.id">
            <RadioGroup v-model="ro.mode" :disabled="st.id === 'disabled'">
              <RadioGroupItem value="regular" :checked="ro.mode === 'regular'" :disabled="st.id === 'disabled'">
                Обычный
              </RadioGroupItem>
              <RadioGroupItem value="multi" :checked="ro.mode === 'multi'" :disabled="st.id === 'disabled'">
                Мультиосмотр
              </RadioGroupItem>
            </RadioGroup>
          </Field>
        </template>
        <template v-for="st in RO_STATES" :key="'radio-card-' + st.id">
          <Field label="RadioGroupItem card" :readonly="st.id === 'readonly'" :data-case="'radio-card-' + st.id">
            <RadioGroup v-model="ro.mode" class="grid grid-cols-2" :disabled="st.id === 'disabled'">
              <RadioGroupItem variant="card" value="regular" :checked="ro.mode === 'regular'" :disabled="st.id === 'disabled'">
                Обычный
              </RadioGroupItem>
              <RadioGroupItem variant="card" value="multi" :checked="ro.mode === 'multi'" :disabled="st.id === 'disabled'">
                Мульти
              </RadioGroupItem>
            </RadioGroup>
          </Field>
        </template>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ READONLY_EXAMPLE }}</pre>
    </section>
    <!-- ============================ Такт 86: поиск как в IDE ============================ -->
    <section class="flex flex-col gap-4" data-matrix="search-result">
      <Heading>SearchResult — строка выдачи поиска: иконка типа, подпись с подсвеченным совпадением, пояснение, значение либо переключатель</Heading>
      <div class="grid grid-cols-2 items-start gap-6">
        <div class="flex flex-col gap-2">
          <ToolbarText>Типы и значение справа</ToolbarText>
          <div class="flex w-160 flex-col rounded-lg bg-popover p-1 shadow-dropdown" role="listbox">
            <SearchResult type="setting" label="Разрешение фото" query="фото" value="Среднее — 2 Мп" data-case="setting-value" @select="resultLog = 'select: setting'" />
            <SearchResult type="setting" label="Детектор «Размытые изображения»" query="размыт фото" hint="по запросу «размытые фото»" toggle :checked="resultOn" data-case="setting-toggle" @toggle="resultOn = !resultOn; resultLog = 'toggle'" @select="resultLog = 'select: toggle row'" />
            <SearchResult type="field" label="Госномер" query="regnum" hint="алиас regnum" value="Текст" data-case="field" />
            <SearchResult type="group" label="Автомобиль" query="авто" value="4 поля" data-case="group" />
            <SearchResult type="step" label="VIN под стеклом" query="фото" hint="Сфотографируйте VIN-номер через лобовое стекло" value="Основной" data-case="step" />
            <SearchResult type="process" label="Осмотр документов" query="осмотр док" value="1 шаг" data-case="process" />
            <SearchResult type="showcase" label="Продающее название" query="прод" value="не задано" data-case="showcase" />
            <SearchResult type="action" icon="visibility" label="Предпросмотр" query="пред" data-case="action" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <ToolbarText>Состояния: активная, недоступная с причиной, служебные строки</ToolbarText>
          <div class="flex w-160 flex-col rounded-lg bg-popover p-1 shadow-dropdown" role="listbox">
            <SearchResult type="setting" label="Блокировать осмотр при проверке" query="блок" toggle checked active data-case="active" />
            <SearchResult type="setting" label="Разрешить принимать осмотр одной кнопкой" query="одной" toggle reason="Доступно только для стандартной схемы" data-case="reason-toggle" />
            <SearchResult type="action" icon="refresh" label="Сбросить черновик" query="сброс" reason="Черновик совпадает с текущей версией" data-case="reason-action" />
            <SearchResult type="query" label="размыт фото" data-case="query" />
            <SearchResult type="more" label="ещё 10" data-case="more" />
            <SearchResult type="filter" label="Изменено в черновике" hint="Места, которые черновик меняет против текущей версии" value="4 места" data-case="filter" />
          </div>
          <ToolbarText>
            Событие строки: {{ resultLog }}
          </ToolbarText>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SEARCH_RESULT_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="highlight-text">
      <Heading>HighlightText — фрагмент текста с подсветкой совпадения; подсветка на странице — CSS Custom Highlight API</Heading>
      <div class="grid grid-cols-2 items-start gap-6">
        <div class="flex flex-col gap-2 text-sm font-medium">
          <span data-case="word-start"><HighlightText text="Детектор «Размытые изображения»" query="размыт изоб" /></span>
          <span data-case="any-order"><HighlightText text="Детектор «Размытые изображения»" query="изоб размыт" /></span>
          <span data-case="mid-word"><HighlightText text="Сфотографируйте VIN-номер через лобовое стекло" query="фото" /></span>
          <span data-case="yo"><HighlightText text="Съёмка с экрана" query="СЪЕМК" /></span>
          <span data-case="none"><HighlightText text="Отправлять поля на согласование" query="фото" /></span>
          <span class="text-xs text-field-placeholder" data-case="small"><HighlightText text="по запросу «размытые фото»" query="фото" /></span>
        </div>
        <div class="flex flex-col gap-2" data-matrix="page-highlight">
          <p class="m-0 text-sm" data-demo-row>
            Разрешение фото — все совпадения: подложка --search-match
          </p>
          <p class="m-0 text-sm" data-demo-row>
            Фото-подсказка шага — текущее совпадение: подложка --search-match-current
          </p>
          <p class="m-0 text-sm" data-demo-row>
            Строка без совпадения
          </p>
          <div class="flex items-center gap-3">
            <Button variant="secondary" data-act="paint" @click="paintDemo()">
              Подсветить «фото»
            </Button>
            <Button variant="outline" data-act="unpaint" @click="clearDemo()">
              Снять
            </Button>
            <ToolbarText>Фрагментов: {{ pagePainted }}</ToolbarText>
          </div>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HIGHLIGHT_TEXT_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="section-nav-count">
      <Heading>SectionNavItem · count — число совпадений раздела в режиме «найдено»</Heading>
      <div class="flex items-start gap-6">
        <SectionNav model-value="mobile" title="Настройки" data-case="count">
          <SectionNavItem value="mobile" label="Мобильное приложение" :count="1">
            <SectionNavAnchor label="Параметры съёмки" active />
            <SectionNavAnchor label="Поведение в мобильном приложении" />
          </SectionNavItem>
          <SectionNavItem value="anomalies" label="Аномалии" status="on" :count="2" />
          <SectionNavItem value="general" label="Общие" status="attention" :count="0" />
          <SectionNavItem value="pdf" label="PDF" :count="12" />
        </SectionNav>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SECTION_NAV_COUNT_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Такт 87: фото-подсказки ============================ -->
    <section class="flex flex-col gap-4" data-matrix="media-gallery-select">
      <Heading>MediaGalleryItem · selectable, selected, disabled, openLabel, подпись — плитка каталога фото-подсказок</Heading>
      <div class="flex flex-wrap items-start gap-4">
        <div class="flex flex-col gap-2" data-case="rest">
          <ToolbarText>покой</ToolbarText>
          <MediaGalleryItem size="md" class="w-44" :src="HINT('car-front')" alt="Передняя часть · анфас" selectable :selected="tilePicked.includes('car-front')" open-label="Открыть крупно" @toggle="tileToggle('car-front')" @open="tileLog = 'open: car-front'">
            <template #title>
              Передняя часть
            </template>
            <template #subtitle>
              Анфас
            </template>
          </MediaGalleryItem>
        </div>
        <div class="flex flex-col gap-2" data-case="hover">
          <ToolbarText>наведение (demoHover)</ToolbarText>
          <MediaGalleryItem size="md" class="w-44" :src="HINT('car-left')" alt="Левая сторона · профиль" selectable open-label="Открыть крупно" demo-hover>
            <template #title>
              Левая сторона
            </template>
            <template #subtitle>
              Профиль
            </template>
          </MediaGalleryItem>
        </div>
        <div class="flex flex-col gap-2" data-case="selected">
          <ToolbarText>выбрана</ToolbarText>
          <MediaGalleryItem size="md" class="w-44" :src="HINT('car-right')" alt="Правая сторона · профиль" selectable :selected="tilePicked.includes('car-right')" open-label="Открыть крупно" @toggle="tileToggle('car-right')" @open="tileLog = 'open: car-right'">
            <template #title>
              Правая сторона
            </template>
            <template #subtitle>
              Профиль
            </template>
          </MediaGalleryItem>
        </div>
        <div class="flex flex-col gap-2" data-case="disabled">
          <ToolbarText>уже у шага (disabled)</ToolbarText>
          <MediaGalleryItem size="md" class="w-44" :src="HINT('car-vin-glass')" alt="VIN под стеклом · через лобовое стекло" selectable selected disabled open-label="Открыть крупно">
            <template #title>
              VIN под стеклом
            </template>
            <template #subtitle>
              Уже у шага
            </template>
          </MediaGalleryItem>
        </div>
        <div class="flex flex-col gap-2" data-case="query">
          <ToolbarText>подпись с подсветкой запроса</ToolbarText>
          <MediaGalleryItem size="md" class="w-44" :src="HINT('car-vin-body')" alt="VIN на кузове · выбитый номер" selectable open-label="Открыть крупно">
            <template #title>
              <HighlightText text="VIN на кузове" query="кузов" />
            </template>
            <template #subtitle>
              <HighlightText text="Выбитый номер" query="кузов" />
            </template>
          </MediaGalleryItem>
        </div>
        <div class="flex flex-col gap-2" data-case="plain">
          <ToolbarText>без осей: прежняя плитка sm, без картинки — подложка</ToolbarText>
          <div class="flex gap-2">
            <MediaGalleryItem size="sm" :src="HINT('doc-pts')" class="w-24" />
            <MediaGalleryItem size="sm" class="w-24" />
          </div>
        </div>
      </div>
      <ToolbarText>
        Событие: {{ tileLog }} · выбрано: {{ tilePicked.join(', ') || '—' }}
      </ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ GALLERY_SELECT_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="thumb-strip">
      <Heading>ThumbStrip — полоса миниатюр фото-подсказок в ячейке шага: до трёх и «+N» (карточка 10)</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex flex-col gap-2" data-case="one">
          <ToolbarText>одна</ToolbarText>
          <ThumbStrip :items="THUMBS.slice(0, 1)" @open="thumbLog = `open: ${$event}`" />
        </div>
        <div class="flex flex-col gap-2" data-case="three">
          <ToolbarText>три — без хвоста</ToolbarText>
          <ThumbStrip :items="THUMBS.slice(0, 3)" @open="thumbLog = `open: ${$event}`" />
        </div>
        <div class="flex flex-col gap-2" data-case="more">
          <ToolbarText>пять — «+2»</ToolbarText>
          <ThumbStrip :items="THUMBS" :max="3" label="Фото-подсказки шага «Передняя часть»" @open="thumbLog = `open: ${$event}`" />
        </div>
        <div class="flex flex-col gap-2" data-case="uploads">
          <ToolbarText>свои загрузки</ToolbarText>
          <ThumbStrip :items="THUMBS.slice(3)" @open="thumbLog = `open: ${$event}`" />
        </div>
      </div>
      <ToolbarText>
        Событие: {{ thumbLog }}
      </ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ THUMB_STRIP_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Такт 88: вставка из другой схемы, тексты повторяемого процесса ============================ -->
    <section class="flex flex-col gap-4" data-matrix="chip-pressable">
      <Heading>Chip · pressable — чип-вариант: пилюля целиком кнопка, хвоста нет</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex flex-col gap-2" data-case="rest">
          <ToolbarText>покой и выбран (active), нажатие подставляет вариант</ToolbarText>
          <div class="flex flex-wrap items-center gap-2">
            <Chip v-for="v in ['Повреждение', 'Деталь кузова', 'Колесо']" :key="v" pressable :active="chipValue === v" :title="v" @click="chipValue = v; chipLog = `click: ${v}`">
              {{ v }}
            </Chip>
            <Chip trailing="expand">
              Все варианты
            </Chip>
          </div>
        </div>
        <div class="flex w-80 flex-col gap-2" data-case="long">
          <ToolbarText>не шире контейнера 320 — подпись многоточием, полный текст в title</ToolbarText>
          <Chip pressable title="Положите документ на ровную поверхность и снимите целиком без бликов">
            Положите документ на ровную поверхность и снимите целиком без бликов
          </Chip>
        </div>
        <div class="flex flex-col gap-2" data-case="filter">
          <ToolbarText>без оси — прежние фильтр-чип и метка</ToolbarText>
          <div class="flex flex-wrap items-center gap-2">
            <Chip>Фильтр</Chip>
            <Chip active>
              Включён
            </Chip>
            <Chip variant="neutral">
              Метка
            </Chip>
          </div>
        </div>
      </div>
      <ToolbarText>
        Событие: {{ chipLog }} · значение: {{ chipValue }}
      </ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ CHIP_PRESSABLE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="paste-rows">
      <Heading>Вставка из другой схемы — композиция: схема строкой-переходом, поле донора с конфликтом алиаса, шаг с подсказками</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex w-120 flex-col gap-2" data-case="schemes">
          <ToolbarText>схема и группа — ListRow с подсветкой запроса «осаго»</ToolbarText>
          <ListRow>
            <HighlightText text="ОСАГО — осмотр легкового автомобиля" query="осаго" />
            <template #secondary>
              Осмотр транспорта · 2 группы · 9 полей
            </template>
          </ListRow>
          <ListRow>
            Заявка
            <template #secondary>
              Lead · 4 поля
            </template>
          </ListRow>
          <ListRow disabled>
            Пустая группа
            <template #secondary>
              Empty · 0 полей
            </template>
          </ListRow>
        </div>
        <div class="flex w-144 flex-col gap-2" data-case="rows">
          <ToolbarText>поля: обычная · выбрана · конфликт алиаса; шаг с подсказками</ToolbarText>
          <Table>
            <TableRow>
              <TableHead variant="column" class="w-10 justify-center px-2" aria-label="Выбор полей" />
              <TableHead variant="column" class="min-w-0 flex-1 px-4">
                Поле
              </TableHead>
              <TableHead variant="column" class="w-40 px-4">
                Алиас
              </TableHead>
              <TableHead variant="column" class="w-28 px-4">
                Тип
              </TableHead>
            </TableRow>
            <TableRow v-for="r in [{ id: 'df-number', title: 'Номер полиса', alias: 'policy_number', next: 'policy_number_2', type: 'Текст' }, { id: 'df-date', title: 'Дата осмотра', alias: 'inspection_date', next: '', type: 'Дата' }, { id: 'df-phone', title: 'Телефон клиента', alias: 'client_phone', next: '', type: 'Текст' }]" :key="r.id" :state="pastePicked.includes(r.id) ? 'selected' : 'default'">
              <TableCell variant="slot" align="start" class="w-10 justify-center px-2">
                <Checkbox :model-value="pastePicked.includes(r.id)" :aria-label="r.title" @update:model-value="pasteDemoToggle(r.id)" />
              </TableCell>
              <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start px-4 pt-4.5 pb-3 contain-inline-size">
                <TableCellIdentity class="w-full flex-none">
                  {{ r.title }}
                  <template v-if="r.next" #description>
                    алиас {{ r.alias }} уже есть — будет {{ r.next }}
                  </template>
                </TableCellIdentity>
              </TableCell>
              <TableCell align="start" class="w-40 px-4">
                {{ r.alias }}
              </TableCell>
              <TableCell variant="slot" align="start" class="w-28 px-4">
                <Chip variant="neutral">
                  {{ r.type }}
                </Chip>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell variant="slot" align="start" class="w-10 justify-center px-2">
                <Checkbox aria-label="Задняя часть" />
              </TableCell>
              <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start px-4 pt-4.5 pb-3 contain-inline-size">
                <TableCellIdentity class="w-full flex-none">
                  Задняя часть
                  <template #description>
                    3 фото-подсказки · Оценка повреждений
                  </template>
                </TableCellIdentity>
              </TableCell>
              <TableCell variant="slot" align="start" class="w-40 px-4">
                <Chip variant="neutral">
                  Основной
                </Chip>
              </TableCell>
              <TableCell align="start" class="w-28 px-4">
                2–7 фото
              </TableCell>
            </TableRow>
          </Table>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PASTE_ROWS_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="repeat-text">
      <Heading>Текст повторяемого процесса — композиция: Autocomplete с вариантами словаря, чипы-варианты, «Все варианты»</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex w-110 flex-col gap-2" data-case="no-type">
          <ToolbarText>тип объекта не выбран — варианты разных типов</ToolbarText>
          <Field label="Название повтора" hint="Список повторов — с номером: «Повреждение 1», «Повреждение 2»">
            <div class="flex flex-col gap-2">
              <Autocomplete v-model="textEmpty" :items="variantGroups('', 'item').flatMap(g => g.items).map(v => ({ value: v, label: v }))" placeholder="Например, Повреждение" :show-icon="false" />
              <div class="flex flex-wrap items-center gap-2">
                <Chip v-for="v in variantChips('', 'item')" :key="v" pressable :active="textEmpty === v" :title="v" @click="textEmpty = v">
                  {{ v }}
                </Chip>
                <Chip trailing="expand">
                  Все варианты
                </Chip>
              </div>
            </div>
          </Field>
        </div>
        <div class="flex w-110 flex-col gap-2" data-case="picked">
          <ToolbarText>легковой автомобиль, вариант выбран чипом; «Все варианты» открыт</ToolbarText>
          <Field label="Название повтора" hint="Список повторов — с номером: «Повреждение 1», «Повреждение 2»">
            <div class="flex flex-col gap-2">
              <Autocomplete v-model="textPicked" :items="variantChips('car', 'item').map(v => ({ value: v, label: v }))" placeholder="Например, Повреждение" :show-icon="false" />
              <div class="flex flex-wrap items-center gap-2">
                <Chip v-for="v in variantChips('car', 'item')" :key="v" pressable :active="textPicked === v" :title="v" @click="textPicked = v">
                  {{ v }}
                </Chip>
                <Popover v-model:open="textVariantsOpen">
                  <PopoverTrigger as-child>
                    <Chip trailing="expand" :expanded="textVariantsOpen">
                      Все варианты
                    </Chip>
                  </PopoverTrigger>
                  <PopoverContent :width="360" align="start" :side-offset="4" class="flex flex-col p-1">
                    <div class="max-h-80 overflow-y-auto">
                      <SelectGroup v-for="g in variantGroups('car', 'item')" :key="g.type" :header="g.label">
                        <SelectItem v-for="v in g.items" :key="v" :selected="textPicked === v" @click="textPicked = v; textVariantsOpen = false">
                          {{ v }}
                        </SelectItem>
                      </SelectGroup>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Field>
        </div>
        <div class="flex w-110 flex-col gap-2" data-case="own">
          <ToolbarText>свой текст — ни один чип не выбран</ToolbarText>
          <Field label="Название повтора">
            <div class="flex flex-col gap-2">
              <Autocomplete v-model="textOwn" :items="[]" placeholder="Например, Повреждение" :show-icon="false" />
              <div class="flex flex-wrap items-center gap-2">
                <Chip v-for="v in variantChips('car', 'item')" :key="v" pressable :title="v" @click="textOwn = v">
                  {{ v }}
                </Chip>
              </div>
            </div>
          </Field>
        </div>
        <div class="flex w-110 flex-col gap-2" data-case="readonly">
          <ToolbarText>только чтение — просмотр версии: поле осью readonly, чипов-вариантов нет (части правки не рисуются)</ToolbarText>
          <Field label="Название повтора" readonly>
            <Autocomplete v-model="textRo" :items="[]" placeholder="Например, Повреждение" :show-icon="false" />
          </Field>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ REPEAT_TEXT_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Такт 89: превью приложения, «?» с превью ============================ -->
    <section class="flex flex-col gap-4" data-matrix="app-preview">
      <Heading>AppPreview — рамка телефона и экран приложения (карточка 11; макет 33694:3879)</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex flex-col gap-2" data-case="mockup">
          <ToolbarText>md 220 × 360 — как в макете: «Осмотр невозможен» обведён</ToolbarText>
          <AppPreviewScreen :screen="appScreens['step:p-auto:s-front']!" size="md" :marked="REFUSE" />
        </div>
        <div class="flex w-70 flex-col gap-2" data-case="fragment">
          <ToolbarText>фрагмент для поповера «?»: окно 288 во всю ширину</ToolbarText>
          <AppPreviewScreen :screen="appScreens['step:p-auto:s-vin-glass']!" size="md" fragment :marked="REFUSE" />
        </div>
        <div class="flex flex-col gap-2" data-case="lg">
          <ToolbarText>lg 220 × 476 (пропорция 375 × 812), масштаб 1 — экран анкеты</ToolbarText>
          <AppPreviewScreen :screen="appScreens['form:g-car']!" size="lg" />
        </div>
        <div class="flex flex-col gap-2" data-case="interactive">
          <ToolbarText>нажимается — кнопки с переходом; масштаб 0.75</ToolbarText>
          <AppPreviewScreen :screen="appScreens.start!" size="lg" :scale="0.75" interactive @go="pressLog = `go: ${$event}`" />
          <ToolbarText>Событие: {{ pressLog }}</ToolbarText>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-4" data-matrix="app-preview-parts">
      <Heading>Части экрана приложения — AppPreviewProgress, AppPreviewText, AppPreviewShot, AppPreviewField, AppPreviewButton, AppPreviewRow</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex flex-col gap-2" data-case="texts">
          <ToolbarText>полоски, тексты, подсказка, пустой экран</ToolbarText>
          <AppPreview title="Осмотр КАСКО" size="lg">
            <AppPreviewProgress :total="4" :done="2" />
            <AppPreviewText variant="heading">
              Шаг 3: Фото переднего бампера
            </AppPreviewText>
            <AppPreviewText variant="secondary" class="-mt-2">
              Сфотографируйте повреждения крупным планом
            </AppPreviewText>
            <AppPreviewText variant="note">
              Снимайте при дневном свете
            </AppPreviewText>
            <AppPreviewText variant="title">
              Осмотр отправлен
            </AppPreviewText>
            <AppPreviewText variant="body">
              Основной текст экрана 12/16
            </AppPreviewText>
            <AppPreviewText variant="empty" title="Полей пока нет">
              Добавьте группы и поля на табе «Форма»
            </AppPreviewText>
          </AppPreview>
        </div>
        <div class="flex flex-col gap-2" data-case="shot-field">
          <ToolbarText>слот съёмки — без подсказки и с ней; поля анкеты и галочка</ToolbarText>
          <AppPreview title="Осмотр КАСКО" size="lg">
            <AppPreviewShot caption="1 фото" />
            <AppPreviewShot caption="от 2 до 7 фото" src="/scheme-edit/hints/car-front.svg" />
            <AppPreviewField label="VIN" required placeholder="VIN" hint="standard" />
            <AppPreviewField label="Дата начала" type="date" placeholder="ДД.ММ.ГГГГ" />
            <AppPreviewField label="Тип кузова" type="choice" required placeholder="Тип кузова" hint="photo" />
            <AppPreviewField label="Подтверждаю, что данные верны" type="checkbox" />
          </AppPreview>
        </div>
        <div class="flex flex-col gap-2" data-case="buttons">
          <ToolbarText>кнопки и строки; обведённые — справа</ToolbarText>
          <div class="flex gap-6">
            <AppPreview title="Осмотр КАСКО" size="lg">
              <AppPreviewRow title="1. VIN под стеклом" meta="1 фото · обязательный" src="/scheme-edit/hints/car-vin-glass.svg" pressable @press="pressLog = 'row'" />
              <AppPreviewRow title="Повреждение 1" meta="снято" done />
              <AppPreviewRow title="Дополнительные файлы" meta="Приложить сверх шагов" icon="add" />
              <template #footer>
                <AppPreviewButton variant="link" pressable @press="pressLog = 'link'">
                  Пропустить шаг
                </AppPreviewButton>
                <AppPreviewButton variant="outline">
                  Выполнить позже
                </AppPreviewButton>
                <AppPreviewButton variant="refuse">
                  Осмотр невозможен
                </AppPreviewButton>
                <AppPreviewButton pressable @press="pressLog = 'primary'">
                  Продолжить
                </AppPreviewButton>
              </template>
            </AppPreview>
            <AppPreview title="Осмотр КАСКО" size="lg">
              <AppPreviewProgress :total="4" :done="1" highlighted />
              <AppPreviewText variant="heading" highlighted>
                Шаг 2: VIN на металле
              </AppPreviewText>
              <AppPreviewField label="VIN" required placeholder="VIN" highlighted />
              <AppPreviewRow title="Дополнительные файлы" icon="add" highlighted />
              <template #footer>
                <AppPreviewButton variant="refuse" highlighted>
                  Осмотр невозможен
                </AppPreviewButton>
                <AppPreviewButton highlighted>
                  Продолжить
                </AppPreviewButton>
              </template>
            </AppPreview>
          </div>
        </div>
      </div>
      <ToolbarText>
        Событие: {{ pressLog }}
      </ToolbarText>
    </section>

    <section class="flex flex-col gap-4" data-matrix="app-preview-thumb">
      <Heading>AppPreviewThumb — миниатюра карты экранов: подпись, пробелы, текущий</Heading>
      <div class="flex flex-wrap items-start gap-6">
        <AppPreviewThumb :screen="appScreens['step:p-auto:s-vin-glass']!" label="Шаг 1: VIN под стеклом" data-case="rest" @click="pressLog = 'thumb: rest'" />
        <AppPreviewThumb :screen="appScreens['step:p-auto:s-vin-metal']!" label="Шаг 2: VIN на металле" :gaps="['нет фото-подсказки']" current data-case="current" @click="pressLog = 'thumb: current'" />
        <AppPreviewThumb :screen="appScreens['repeat-item:p-damage']!" label="Повтор 1" :gaps="['нет названия повтора', 'нет шагов повтора']" data-case="gaps" @click="pressLog = 'thumb: gaps'" />
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ APP_PREVIEW_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="section-nav-anchor-description">
      <Heading>SectionNavAnchor · description — вторая строка якоря: пробелы экрана в оглавлении демо-осмотра</Heading>
      <SectionNav model-value="process" title="Экраны">
        <SectionNavItem value="process" label="Осмотр автомобиля" status="attention">
          <SectionNavAnchor label="Шаг 1: VIN под стеклом" :active="anchorAt === 'step-1'" @select="anchorAt = 'step-1'" />
          <SectionNavAnchor label="Шаг 2: VIN на металле" description="нет фото-подсказки" tone="warning" :active="anchorAt === 'step-2'" @select="anchorAt = 'step-2'" />
          <SectionNavAnchor label="Шаг 4: Вид справа" description="нет описания · нет фото-подсказки" tone="warning" :active="anchorAt === 'step-4'" @select="anchorAt = 'step-4'" />
        </SectionNavItem>
        <SectionNavItem value="confirm" label="Подтверждение" />
      </SectionNav>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ ANCHOR_DESCRIPTION_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="help-preview">
      <Heading>HelpPreview — «?» с превью в приложении (карточка 12): слот help у SettingRow и Field; поповер справа от «?»</Heading>
      <div class="flex flex-col gap-6">
        <div class="flex max-w-settings flex-col" data-case="setting-row">
          <SettingRow>
            <Checkbox :model-value="true">
              Разрешить отказываться с отметкой «Осмотр невозможен»
            </Checkbox>
            <template #help>
              <HelpPreview
                v-model:open="previewOpen"
                title="Отказ от осмотра"
                description="Исполнитель сможет завершить осмотр с отметкой «Осмотр невозможен», если выполнение осмотра в данный момент недоступно (например, объект повреждён или заблокирован)."
                value="Сейчас: разрешён — кнопка на экранах съёмки"
                @action="pressLog = 'help: action'"
              >
                <AppPreviewScreen :screen="appScreens['step:p-auto:s-vin-glass']!" size="md" fragment :marked="REFUSE" />
              </HelpPreview>
            </template>
          </SettingRow>
          <SettingRow help="Текстовая подсказка по наведению — у настроек без проявления в приложении">
            <Checkbox :model-value="false">
              Отправлять поля на согласование согласующему лицу
            </Checkbox>
          </SettingRow>
        </div>
        <div class="flex w-110 flex-col" data-case="field">
          <Field label="Телефон для звонка" hint="Номер, на который будет совершён звонок из мобильного приложения">
            <Input model-value="+7 800 000-00-00" placeholder="+7 900 000 00 00" :show-icon="false" />
            <template #help>
              <HelpPreview title="Телефон для звонка" value="Сейчас: Служба поддержки · +7 800 000-00-00" @action="pressLog = 'help: phone'">
                <AppPreviewScreen :screen="appScreens.done!" size="md" fragment :marked="['setting:mobile.phone']" />
              </HelpPreview>
            </template>
          </Field>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HELP_PREVIEW_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Такт 90: превью публичной страницы сценария, цена «от» ============================ -->
    <section class="flex flex-col gap-4" data-matrix="app-preview-browser">
      <Heading>AppPreviewBrowser — рамка браузера: компьютер и телефон (карточка 13)</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex w-full max-w-4xl flex-col gap-2" data-case="desktop">
          <ToolbarText>компьютер — окно до 1280, три точки и адресная строка; тело — прокрутка и @container</ToolbarText>
          <AppPreviewBrowser url="example.com/scenarios/distantsionnyy-osmotr-avtomobilya-pered-strakhovaniem" class="h-120">
            <ScenarioPreview :page="siteFull" />
          </AppPreviewBrowser>
        </div>
        <div class="flex flex-col gap-2" data-case="phone">
          <ToolbarText>телефон — корпус, строка состояния, адресная строка; экран 375</ToolbarText>
          <AppPreviewBrowser device="phone" url="example.com/scenarios/distantsionnyy-osmotr-avtomobilya-pered-strakhovaniem" class="h-160">
            <ScenarioPreview :page="siteFull" />
          </AppPreviewBrowser>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-4" data-matrix="scenario-preview">
      <Heading>ScenarioPreview — страница сценария из данных: незаполненное, карточка в каталоге, новая схема (карточка 14)</Heading>
      <div class="flex flex-wrap items-start gap-10">
        <div class="flex w-full max-w-4xl flex-col gap-2" data-case="gaps">
          <ToolbarText>черновик демо-данных: краткое описание и изображение — метки «Не заполнено»</ToolbarText>
          <AppPreviewBrowser url="example.com/scenarios/distantsionnyy-osmotr-avtomobilya-pered-strakhovaniem" class="h-120">
            <ScenarioPreview :page="siteGaps" @gap="gapLog = `gap: ${$event.field}`" />
          </AppPreviewBrowser>
        </div>
        <div class="flex flex-col gap-2" data-case="card">
          <ToolbarText>карточка в каталоге — телефон</ToolbarText>
          <AppPreviewBrowser device="phone" url="example.com/scenarios" class="h-160">
            <ScenarioPreview :page="siteGaps" view="card" @gap="gapLog = `gap: ${$event.field}`" />
          </AppPreviewBrowser>
        </div>
        <div class="flex w-full max-w-4xl flex-col gap-2" data-case="fresh">
          <ToolbarText>новая схема — первый экран из меток: индустрия, название, описание, цена (схемы нет в тарификации), изображение</ToolbarText>
          <AppPreviewBrowser url="example.com/scenarios/…" class="h-120">
            <ScenarioPreview :page="siteFresh" @gap="gapLog = `gap: ${$event.field}`" />
          </AppPreviewBrowser>
        </div>
      </div>
      <ToolbarText>Событие: {{ gapLog }}</ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SITE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="scenario-preview-parts">
      <Heading>Части страницы сценария — ScenarioPreviewHero, Section, Pairs, Metrics, Steps, Tags, Card, Gap; раскладка по ширине контейнера</Heading>
      <div class="flex flex-wrap items-start gap-6" data-case="gap-tags">
        <ScenarioPreviewGap label="Краткое описание" @go="gapLog = 'gap: scSummary'" />
        <div class="w-80">
          <ScenarioPreviewGap block label="Изображение" @go="gapLog = 'gap: scImage'" />
        </div>
        <ScenarioPreviewTags :items="siteFull.tags" />
        <ScenarioPreviewTags size="md" :items="siteFull.modules" />
      </div>
      <div class="flex flex-wrap items-start gap-10">
        <div class="@container flex w-browser-phone flex-col gap-2 border border-dashed border-border" data-case="narrow">
          <ToolbarText>контейнер 375 — раскладка телефона</ToolbarText>
          <ScenarioPreviewHero :title="siteFull.title" :summary="siteFull.summary" :image="siteFull.image" :price="siteFull.price" :tags="siteFull.tags" />
          <ScenarioPreviewSection title="Как устроена схема" tone="band">
            <ScenarioPreviewSteps :steps="siteFull.steps" />
          </ScenarioPreviewSection>
          <ScenarioPreviewSection title="Сценарии осмотра">
            <ScenarioPreviewCard :title="siteFull.title" :summary="siteFull.summary" :image="siteFull.image" :price="siteFull.price" :tags="siteFull.tags" />
          </ScenarioPreviewSection>
        </div>
        <div class="@container flex w-full max-w-4xl flex-col gap-2 border border-dashed border-border" data-case="wide">
          <ToolbarText>контейнер шире 640 — раскладка компьютера; у пары, метрики и списка метрик — «Не заполнено»</ToolbarText>
          <ScenarioPreviewHero :title="siteFull.title" :price="null" :tags="siteFull.tags" :gaps="siteGaps.gaps" @gap="gapLog = `gap: ${$event.field}`" />
          <ScenarioPreviewSection title="Зачем нужен осмотр" :description="siteFull.description">
            <ScenarioPreviewPairs :pairs="PAIRS_GAP" :gaps="{ 1: { field: 'scEffect1', label: 'Проблемы и решения, пара 2' } }" @gap="gapLog = `gap: ${$event.field}`" />
            <ScenarioPreviewMetrics :metrics="METRICS_GAP" :gaps="{ 1: { field: 'scMetric1', label: 'Метрика 2' } }" @gap="gapLog = `gap: ${$event.field}`" />
            <ScenarioPreviewMetrics :metrics="[]" :empty="{ field: 'scMetrics', label: 'Метрики' }" @gap="gapLog = `gap: ${$event.field}`" />
          </ScenarioPreviewSection>
          <ScenarioPreviewSection title="Как устроена схема" tone="band">
            <ScenarioPreviewSteps :steps="siteFull.steps" />
          </ScenarioPreviewSection>
        </div>
      </div>
      <ToolbarText>Событие: {{ gapLog }}</ToolbarText>
    </section>

    <section class="flex flex-col gap-4" data-matrix="price-source">
      <Heading>Цена «от» — композиция страницы: источник радио-карточками; из тарифа — PriceRange и «Открыть тарификацию»; вручную — предупреждение ниже тарифа</Heading>
      <div class="flex max-w-settings flex-col gap-6">
        <Field label="Цена «от»" orientation="left" label-width="form">
          <div class="flex flex-col gap-3">
            <RadioGroup v-model="priceSourceDemo" class="grid grid-cols-3 gap-2">
              <RadioGroupItem v-for="x in PRICE_SOURCES" :key="x.value" variant="card" :value="x.value" :checked="priceSourceDemo === x.value">
                {{ x.label }}
                <template #description>
                  {{ x.description }}
                </template>
              </RadioGroupItem>
            </RadioGroup>
            <div v-if="priceSourceDemo === 'tariff'" class="flex flex-wrap items-baseline gap-x-6 gap-y-2" data-case="tariff">
              <PriceRange label="На витрине" :min="700" note="текущий тариф с января 2026 · «Осмотр легкового автомобиля», КАСКО" />
              <Hyperlink href="/tariffs?tab=schemes&open=scheme&scheme=s-car" target="_blank" rel="noopener" size="sm">
                Открыть тарификацию
              </Hyperlink>
            </div>
            <Field v-else-if="priceSourceDemo === 'manual'" :hint="Number(priceManualDemo) < 700 ? 'Ниже тарифа: для не клиента — от 700 ₽' : 'По тарифу для не клиента — от 700 ₽'" :hint-tone="Number(priceManualDemo) < 700 ? 'warning' : 'default'" data-case="manual">
              <div class="w-price-input">
                <Input v-model="priceManualDemo" placeholder="" unit="₽" numeric :show-icon="false" />
              </div>
            </Field>
          </div>
        </Field>
        <Field label="Цена «от»" orientation="left" label-width="form" data-case="no-tariff">
          <div class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <PriceRange label="На витрине" :min="null" note="схемы нет в тарификации" />
            <Hyperlink href="/tariffs?tab=schemes" target="_blank" rel="noopener" size="sm">
              Открыть тарификацию
            </Hyperlink>
          </div>
        </Field>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PRICE_EXAMPLE }}</pre>
    </section>
  </main>
</template>
