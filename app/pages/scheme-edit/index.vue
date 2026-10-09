<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formulaPreview } from '~/components/ui/formula-input'
import { clearMatches, highlightMatches, queryWords, type HighlightTarget } from '~/components/ui/highlight-text'
import { tableRowActionsColumn, type TableRowActionItem } from '~/components/ui/table'
import { plural } from '~/stands/scheme-edit/diff'
import { QUICK_LINKS, SEARCH_SCOPES, type SearchEntry, type SearchHit, type SearchScope } from '~/stands/scheme-edit/search'
import {
  ACCESS_GROUPS, ACCESS_ROLES, COMMENT_DICTIONARIES, COORDS_MODES, createModel, CREATE_SCREENS, DEADLINE_EVENTS, DETECTOR_GROUPS, DETECTOR_IDS, DURATION_MODES,
  FIELD_DEFAULTS, FIELD_TYPES, FINISH_CLASSES, GROUP_DEFAULTS, HINT_CONFIGS, MOBILE_SHOW, NETWORKS, OBJECT_TYPES, OWNERS, PDF_PROGRAMS, PDF_SIGNERS, PDF_WHEN,
  PHOTO_RESOLUTIONS, PROCESS_DEFAULTS, REGION_MATRICES, ROLE_LADDER, ROLES, SCHEME_TYPES, SECTION_ANCHORS, SECTIONS, STATUS_DICTIONARIES, STEP_DEFAULTS,
  STEP_FLAGS, STEP_KINDS, STEP_METHODS, suggestAlias, TABS, VIDEO_RESOLUTIONS,
  INDUSTRIES, SHOWCASE_IMAGE, SHOWCASE_OBJECTS, SHOWCASE_STATUS, SPHERES,
  PRICE_SOURCES, SITE_CATALOG, tariffPeriodText, tariffsHref, type PriceSource,
  catalogCounts, catalogHint, catalogLabel, HINT_CATEGORIES, HINT_MATCH_LABEL, hintLabel, hintSrc, hintStatus, searchCatalog,
  fillRepeatTexts, knownObjectType, REPEAT_TEXT_FIELDS, textVariants, variantChips, variantGroups,
  buildDemo, type DemoSource, type HelpKey, type HelpPreviewView,
  type BehaviorSettings, type Dataset, type DonorScheme, type FieldDraft, type FillRow, type FormulaSettings, type GroupDraft, type HintCategoryFilter, type HintMatch,
  type NetworkState, type PdfTemplate, type PdfTemplateDraft, type ProcessDraft, type ProcessStep, type RepeatTextKey, type SaveState, type SectionId, type SectionStatus, type StepDraft,
  type StepHint, type TabId,
} from '~/stands/scheme-edit/model'
import demo from '~/stands/scheme-edit/demo-data.json'
import { useReorder } from '~/stands/scheme-edit/reorder'
import SchemeCreate from '~/stands/scheme-edit/SchemeCreate.vue'
import { createCard, createdDataset, createdNotice, defaultBasics, setHandoff, takeHandoff, type CreateBasics, type CreateFrom } from '~/stands/scheme-edit/create'
import { RULES_LABEL, type Stage, type StageId } from '~/stands/scheme-edit/readiness'
import type { ReadinessGroupItem, ReadinessMarkState, ReadinessStageItem } from '~/components/ui/readiness'
import type { ModalCardDock } from '~/components/ui/modal-card'
import type { IconName } from '~/components/ui/icon/icons'

/**
 * Страница «Редактирование схемы осмотра» (VA-16377) — стенд, такты 61–65, порции П1–П5 (`docs/scheme-edit.md`,
 * раздел 10).
 *
 * Вид и структура — макеты Figma (`docs/sources/scheme-edit/figma-nodes.md`), поведение и тексты — `spec-r2.md`.
 * На странице — только компоненты кита и классы раскладки (`CLAUDE.md`, «Экран „как есть“»).
 *
 * ## Что собрано
 *
 * **П1.** Каркас `layouts/admin.vue` (№ 1), «Назад» (№ 2), H1 — наименование схемы (№ 4), «Опубликовать схему»
 * (№ 7), табы (№ 13), статус автосохранения — `AppBarStatus surface="light"` (№ 59).
 *
 * **П2.** Каркас «Настроек»: колонка содержимого 846 и правый навигатор `SectionNav` (№ 14), «Назад / Далее» (№ 15).
 * Раздел «Общие» целиком (№ 16–24): «Основное», «Поведение процесса» на `SettingRow`, «Формулы и служебное» на
 * `FormulaInput`, «Словари» с сайдом словаря комментариев (№ 69), «Дедлайны и доступ к осмотру» с полями ролей на
 * `Select multiple` (№ 71), «Экран подтверждения».
 *
 * **П3.** Шесть остальных разделов «Настроек» (№ 25–37): «Мобильное приложение», «Веб-приложение» (обоснования
 * «название — ключ» с отменой удаления), «Права доступа» (роли и таблица групп по канону страницы-таблицы),
 * «ИИ-анализ» (модули зависят от типа схемы), «Аномалии» (14 детекторов с массовым управлением и наследованием роли),
 * «PDF» (шаблоны, подписание, формула имени файла); сайд «Добавление шаблона» (№ 38).
 *
 * **П4.** Шапка: индикатор публикации `PublishStatus` с presence (№ 5, 59), «История версий», «Предпросмотр» (№ 6),
 * меню «⋯» (№ 8). Модалка-гейт публикации с `Diff` и предупреждениями валидации (№ 54, 58), первая публикация
 * (№ 55), «Сбросить черновик?» (№ 60), «Удалить схему?»; сайд истории версий с диффом версии вторым слоем (№ 56);
 * просмотр прошлой версии (№ 57): плашка, содержимое только для чтения, «Перейти к текущей версии», «Сделать копию».
 *
 * **П5.** Поиск строкой под шапкой, над табами (№ 9): `Input` с подсказкой хоткея `Kbd`; выдача — `Popover` с группами по
 * пути «Настройки → Раздел» (№ 10); пустая выдача с «Быстрым переходом» (№ 11); переход к месту и подсветка
 * найденного — ось `highlighted` у `SettingRow` (№ 12). Клавиатура: `/` — фокус в поиск, стрелки — по выдаче, Enter —
 * переход, Esc — очистить и снять выдачу.
 * **Такт 86 — поиск как в IDE** (`docs/scheme-edit-review.md`, раздел 3; эталон — JetBrains): слова запроса — начала слов в
 * любом порядке, середина слова, другая раскладка, ранжирование; выдача — охват с числом совпадений и фильтр «Изменено в
 * черновике» (`Toolbar`, `Tabs segmented`, `Switch`), строки `SearchResult` (иконка типа, подсветка совпадения `HighlightText`,
 * значение либо переключатель), «ещё N», подвал клавиш, «Недавние»; режим «найдено» — счётчик и стрелки в поле (слот
 * `trailing` у `Input`), подсветка совпадений на табе (CSS Custom Highlight API), числа на табах и в навигаторе, плашка
 * `Callout` со «Сбросить». Хоткеи: `/`, Ctrl+F, F3, Shift+F3, Enter, Shift+Enter, Alt+Enter, Tab, Shift+Tab, Esc.
 * **П6 (такт 69).** Таб «Форма» (№ 39–42, 62, 68, 70): список групп — `Card` с `RadioGroupItem variant="card"` и настройками
 * группы парами `FrameMeta layout="stack"` (довесок 1), «Добавить группу»; панель полей — заголовок группы со счётом, «Добавить поле», «Вставить из
 * другой схемы» (заглушка), «Заполнить алиасы автоматически»; поля — `Table` с выбором строк, признаком «зависимое» и
 * действиями строки; массовые действия — `ActionBar layout="panel"`; сайды поля (четыре секции) и группы — `ModalCard edge`.
 * **П7, часть 1 (такт 70).** Таб «Процессы и шаги» (№ 43–47, 61): действия таба, панель массовых действий
 * `ActionBar layout="panel"` — флаги в трёх состояниях (`Checkbox`), способ съёмки, нейросети (заглушка), удаление; карточки
 * процессов — `Card` с шапкой и `Table` шагов: ручка перестановки, выбор, номер, название с описанием и типом шага
 * (`Chip` со списком), способ, нейросети (`Chip neutral`), фото-подсказка с инлайн-загрузкой (`Badge`, `ButtonAction`,
 * `FileUpload`), действия строки. Ручка перестановки — и у таблицы полей «Формы» (`~/stands/scheme-edit/reorder.ts`).
 * **П7, часть 2 (такт 71).** Сайд «Добавление / Редактирование процесса» (№ 48, 49) — три секции макетов `33245:5722`,
 * `33245:6032`; сайд шага (№ 63) — шесть секций; сайд «Нейросети выбранных шагов» из панели; оверлей повторяемого процесса
 * (№ 64) — `ModalCard placement="full"`: форма и шаги вместе, сайд шага ложится поверх.
 * **П8 (такт 72).** Таб «Витрина» (№ 50–53, 72): статус карточки — `Callout` в тоне статуса с «Опубликовать на витрину»
 * (выключена с причиной до публикации схемы); «Витринная карточка» — `Field` с подписью слева, теги «Индустрия → Сфера
 * применения» (`Select multiple`) → «Объект» из типа схемы; «Зачем нужен осмотр» — описание, четыре пары на `Card muted`, метрики;
 * «Из схемы» — модули чипами со снятием, «Как устроена схема» — статусы `Chip neutral` со стрелками. Пустые состояния табов
 * (№ 65) — `Empty` с действием; у новой схемы «Форма» и «Процессы и шаги» неактивны до первого сохранения, причину держит
 * обёртка с `tabindex` и `Tooltip` (№ 66); плашка «Сохранение теперь автоматическое» — `Callout closable` (№ 67).
 * **Такт 87 — фото-подсказки** (`docs/scheme-edit-review.md`, 4.3, 4.4, Ш-2, Т-2, Ш-5): в ячейке шага — статус, до трёх
 * миниатюр с «+N» (`ThumbStrip`), «Загрузить» и «Выбрать из каталога»; сайд «Каталог фото-подсказок» — поиск, категории
 * колонкой (`SectionNav`), сетка `MediaGallery` с выбором нескольких, просмотр крупно (`Lightbox`, `FrameStage`), подвал
 * «Выбрано: N · Добавить»; сайд «Заполнить фото-подсказки» — подбор по названию шага и типу объекта, «Требует внимания»
 * первой группой, «Заменить» — каталог вторым слоем, «Не заполнять», «Показать все шаги», «Установить подсказки у N шагов»;
 * в сайде шага — раздел «Фото-подсказки» (`StepThumb` с удалением, «Из каталога», «Загрузить») и полные подписи признаков.
 * **Такт 88 — вставка из другой схемы и тексты процесса** (`docs/scheme-edit-review.md`, 4.5, 4.6): сайд «Вставить поля /
 * шаги из другой схемы» — паттерн «выбор из справочника»: схема (той же компании и отобранные шаблоны, поиск по названию) →
 * группа или процесс (`ListRow`) → поля или шаги (`Table` с флажками, тип, алиас либо способ съёмки); конфликт алиаса — до
 * вставки; «←» и Esc — уровень назад; подвал «Вставить N … в …». В оверлее повторяемого процесса — раздел «Тексты в
 * приложении»: шесть полей `Autocomplete` с вариантами словаря по типу объекта, до трёх вариантов чипами (`Chip pressable`),
 * «Все варианты» — поповер с поиском и группами по типу объекта; «Заполнить по типу объекта» — только пустые, с «Отменить».
 * **Такт 89 — демо-осмотр и превью у «?»** (`docs/scheme-edit-review.md`, 4.1, 4.2): «Предпросмотр» и действие поиска открывают
 * демо-осмотр — `ModalCard placement="full"`: шапка с «По шагам / Карта» и «Вернуться к схеме» (слот `actions`), слева оглавление
 * экранов по этапам с пробелами (`SectionNav`, вторая строка якоря), в центре телефон (`AppPreviewScreen`: переходы по кнопкам
 * экрана, ← → и счётчик) либо карта (`AppPreviewThumb` рядами по этапам), справа «Из чего собран экран» (`SelectItem multiline`,
 * «Изменить» — переход поиска либо сайд сущности); наведение на элемент телефона подсвечивает строку, на строку — обводит элемент.
 * «?» с превью (`HelpPreview`, слот `help` у `SettingRow` и `Field`) — у отказа от осмотра, промежуточного экрана, блока
 * дополнительных файлов, режима выполнения, телефона, подсказки и галочки экрана подтверждения; в строке поля «Формы» — «Где
 * увидит исполнитель»; в разделе «Тексты в приложении» оверлея — фрагмент экрана списка повторов.
 * **Такт 90 — витрина: цена из тарифа и превью страницы** (`docs/scheme-edit-review.md`, 4.7, 4.8): у «Цены «от»» — источник
 * радио-карточками («Из тарифа» по умолчанию, «Указать вручную», «Не показывать»); из тарифа — `PriceRange` нижней границы цены
 * для не клиента и «Открыть тарификацию», вручную — поле с предупреждением ниже тарифа. «Предпросмотр страницы» у статуса
 * витрины — `ModalCard placement="full"`: «Компьютер / Телефон», «Страница сценария / Карточка в каталоге», статус карточки и
 * будущий адрес над рамкой `AppPreviewBrowser`, страница — `ScenarioPreview`; метка «Не заполнено» ведёт к полю таба.
 * **Такт 91 — создание схемы с мягкой этапностью** (`docs/scheme-edit-review.md`, раздел 5): модель готовности в режиме создания
 * (ни одной публикации) — полоса подготовки под шапкой (`ReadinessBar`: «Подготовка схемы: N из 5 · Далее: … →», этапы кнопками,
 * «Свернуть» — память сессии), чип «Готовность N из 5» у «Опубликовать схему» (`ReadinessChip` с `ReadinessList`: этапы, проверки,
 * «Исправить», ручная отметка «Правил»), маркеры этапов на вкладках (`ReadinessMark`: готово, число замечаний, замок), «Далее» внизу этапа,
 * первая публикация — та же модель вместо сводки, блокирующее выключает «Опубликовать» с причиной в подвале. После первой
 * публикации — чип «Проверка: N» при замечаниях, число замечаний на вкладках, проверки над диффом. «История версий» — после первой публикации
 * (С-1); «Удалить схему» в меню «⋯» — тоном опасного действия (К-4); «Сделать копию» — окно «Новая схема осмотра» на шаге «Основа»
 * (`SchemeCreate`, вход — `/scheme-edit/new`).
 *
 * ## Поведение — модель `~/stands/scheme-edit/model.ts`
 *
 * Страница переводит модель в пропы компонентов, события компонентов — в операции модели. Страница ведёт прокрутку:
 * положение таба запоминается и возвращается (СС-13), клик по якорю навигатора прокручивает к подразделу, активный
 * якорь следует за прокруткой (СС-14). Сайд держит собственный черновик: «Сохранить» отдаёт его модели одной
 * операцией, «Отмена» отбрасывает (r2 §7).
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | без параметров | схема «КАСКО — осмотр легкового автомобиля»: две опубликованные версии, грязный черновик |
 * | `?data=new` | новая схема: публикаций не было |
 * | `?tab=form` · `processes` · `showcase` | таб при загрузке |
 * | `?section=mobile` · `web` · `access` · `ai` · `anomalies` · `pdf` | раздел «Настроек» при загрузке |
 * | `?open=comments` | сайд словаря комментариев |
 * | `?open=template` | сайд «Добавление шаблона» (раздел «PDF») |
 * | `?open=reason` | форма нового обоснования (раздел «Веб-приложение») |
 * | `?type=house` | тип схемы «Осмотр недвижимости»: анализ стоимости отделки доступен, модули для авто — нет |
 * | `?open=publish` · `first-publish` · `reset` · `delete` · `menu` | модалка-гейт публикации (у новой схемы — первая публикация), «Сбросить черновик?», «Удалить схему?», меню «⋯» |
 * | `?open=history`, `?version=v2` | сайд истории версий; с `version` — второй слой, дифф версии |
 * | `?view=v1` | просмотр прошлой версии |
 * | `?presence=1` | другой редактор в схеме: «Сейчас редактирует …»; `?presence=Имя` — с этим именем (длинное имя — замер шапки, такт 67) |
 * | `?now=2026-10-03T09:00:00` | неподвижные часы стенда: дата правок и публикаций для прогона |
 * | `?q=подпис` | запрос в поиске и открытая выдача; `?q=фаыфа` — пустая выдача с «Быстрым переходом»; `?q=hfpvsn` — показано по «размыт» (такт 86) |
 * | `?scope=settings` · `form` · `processes` · `showcase` · `actions` | охват выдачи при загрузке, с `?q=` (такт 86) |
 * | `?find=фото` | режим «найдено» по запросу: первое совпадение в порядке страницы (такт 86) |
 * | `?modified=1` · `list` | фильтр «Изменено в черновике»: режим «найдено» по правкам; `list` — открытая выдача правок (такт 86) |
 * | `?recent=demo` | «Недавние» — демо-запросы и места, выдача открыта при пустом запросе (такт 86) |
 * | `?found=cadastreMap` | подсветка найденного: цель — значение `data-setting` |
 * | `?save=saving` | статус «Сохранение…» без завершения записи |
 * | `?save=error` | статус «Ошибка сохранения» с «Повторить» |
 * | `?save=fail` | следующая запись черновика завершается ошибкой (СС-49) |
 * | `?group=g-body` | таб «Форма»: выбранная группа при загрузке (с `?tab=form`) |
 * | `?selected=f-vin,f-plate` | таб «Форма»: выделенные поля и панель массовых действий |
 * | `?open=field` · `new-field` | сайд поля: `?field=f-trim` — это поле, без него — первое поле группы; `new-field` — новое поле |
 * | `?open=group` · `new-group` | сайд группы: выбранная группа либо новая |
 * | `?steps=s-vin-glass,s-vin-metal` | таб «Процессы и шаги»: выделенные шаги и панель массовых действий (такт 70) |
 * | `?upload=s-vin-metal` | таб «Процессы и шаги»: инлайн-загрузчик фото-подсказки шага раскрыт (такт 70) |
 * | `?open=process` · `new-process` | сайд процесса: `?process=p-docs` — этот процесс, без него — первый; `new-process` — «Добавление процесса» (такт 71) |
 * | `?open=step` · `new-step` | сайд шага: `?step=s-front` — этот шаг, без него — первый шаг первого процесса; `new-step` — новый шаг первого процесса (такт 71) |
 * | `?open=networks` | сайд «Нейросети выбранных шагов»; выделение — `?steps=` (без него — два шага «Осмотра автомобиля») (такт 71) |
 * | `?open=overlay` · `overlay-filled` · `overlay-step` | оверлей повторяемого процесса: пустой; с шагом, добавленным в черновик оверлея; стек «оверлей → сайд нового шага» (такт 71) |
 * | `?saved=1` | новая схема (`?data=new`) уже сохранялась: «Форма» и «Процессы и шаги» доступны — их пустые состояния (такт 72) |
 * | `?card=needs` · `published` | статус витринной карточки при загрузке: «Требует оформления», «Опубликована на витрине» (такт 72) |
 * | `?hint=off` | плашка «Сохранение теперь автоматическое» закрыта при загрузке (такт 72) |
 * | `?open=catalog` | сайд «Каталог фото-подсказок» из ячейки шага: `?step=` — этот шаг, без него — «VIN на металле» (такт 87) |
 * | `?open=step-catalog` | каталог поверх сайда шага: `?step=` — этот шаг, без него — «Передняя часть» (такт 87) |
 * | `?catq=кузов` · `?category=vehicle` · `realty` · `documents` · `all` · `?picked=car-front,car-right` | каталог: запрос, категория, выбранные подсказки (такт 87) |
 * | `?open=catalog-view` | каталог и просмотр крупно первой подсказки сетки (такт 87) |
 * | `?open=fill` | сайд «Заполнить фото-подсказки»: `?fill=all` — «Показать все шаги»; с `?steps=` — только выбранные шаги (такт 87) |
 * | `?open=fill-catalog` | массовая заливка, второй слой — каталог для строки: `?row=` — этот шаг, без него — «Вид справа» (такт 87) |
 * | `?open=hint-view` | просмотр крупно фото-подсказок шага из ячейки: `?step=` — этот шаг, без него — «Передняя часть» (такт 87) |
 * | `?open=paste-fields` · `paste-steps` | сайд «Вставить поля / шаги из другой схемы»: поля — в выбранную группу «Формы» (`?group=`), шаги — в процесс `?target=`, без него — первый обычный (такт 88) |
 * | `?pasteq=квартир` · `?donor=d-osago` · `?part=dg-lead` · `?pick=df-number,df-date` | сайд вставки: запрос списка схем; схема-донор — второй уровень; группа или процесс донора — третий; выбранные поля или шаги (такт 88) |
 * | `?open=overlay-texts` · `overlay-variants` | оверлей повторяемого процесса, раздел «Тексты в приложении» в окне; `overlay-variants` — открыт поповер «Все варианты» у названия повтора (такт 88) |
 * | `?otype=car` · `?texts=filled` | тип объекта процесса в черновике оверлея; тексты заполнены основным набором типа (такт 88) |
 * | `?open=demo` · `?screen=step:p-auto:s-front` · `?demo=map` · `?mark=setting:general.behavior.refuse` | демо-осмотр: экран, режим «Карта», обведённый элемент (такт 89) |
 * | `?app=full` · `checklist` | настройки приложения в черновике: отказ разрешён, промежуточный экран, телефон поддержки; `checklist` — и режим «Чек-лист» (такт 89) |
 * | `?help=refuse` · `confirmHint` · `confirmCheckbox` · `mobileMode` · `phone` · `startAfterCreate` · `forbidExtraFiles` · `field:f-vin` | открытый поповер «?» с превью (такт 89) |
 * | `?price=tariff` · `manual` · `low` · `hidden` | источник цены «от» в черновике; `low` — вручную 500 ₽, ниже тарифа: предупреждение (такт 90) |
 * | `?open=site` · `?device=phone` · `?site=card` | превью публичной страницы: оверлей на табе «Витрина», телефон, карточка в каталоге (такт 90) |
 * | `?data=created&from=t-car` | схема, созданная из шаблона (`t-car`, `t-moto`, `t-truck`, `t-house`, `d-machine`) либо из схемы компании (`d-osago`, `d-flat`); `from=empty` — пустая; `from=copy` — копия «КАСКО…»: первое сохранение было, публикаций нет — режим создания (такт 91) |
 * | `?strip=collapsed` | полоса подготовки свёрнута в чип (такт 91) |
 * | `?open=readiness` | поповер чипа «Готовность N из 5» либо «Проверка: N» открыт (такт 91) |
 * | `?open=copy` | окно «Новая схема осмотра» копии на шаге «Основа» (такт 91) |
 * | `?rules=1` | этап «Правила» отмечен: «Проверил унаследованное…» (такт 91) |
 * | `?variant=l1-compact` · `l1-rail` | раскладка «Настроек» L1 для живой проверки владельцем: колонка и навигатор справа по центру рабочей зоны; навигатор под сайдом-слоем — выбором раздела списком над колонкой либо рейкой у края сайда (такт 101; временно — до выбора владельца) |
 */
/*
 * Такт 91: копия переходит на тот же адрес с другим набором — страница пересобирается по полному адресу.
 * Такт 96: каркас ставится в странице (`<NuxtLayout name="admin">`) — «Назад» и баннер-ухо идут в его слоты `back` и `banner`.
 */
definePageMeta({ layout: false, key: route => route.fullPath })
useHead({ title: 'Редактирование схемы осмотра — стенд' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')

/* ------------------------------ узкий экран — такт 92 ------------------------------ */
/**
 * Раскладка 375 (`docs/scheme-edit-review.md`, 4.10; решение 5 оркестратора 2026-10-08): ниже 768 — шапка с именем до трёх строк,
 * нижняя полоса «Опубликовать схему» и «⋯», выбор раздела и группы списком, строки-карточки полей и шагов, окна во всё окно,
 * демо-осмотр без рамки телефона с вкладками. Раскладка без смены состава — классами `max-md:`; смена состава — флагом `phone`.
 * Флаг ставится после монтирования: серверная разметка — рабочего стола, гидратация без расхождений; рабочий стол прежний.
 */
const PHONE = '(max-width: 767.98px)'
const phone = ref(false)
let phoneQuery: MediaQueryList | null = null
const onPhone = (e: MediaQueryListEvent) => { phone.value = e.matches }
onMounted(() => {
  phoneQuery = window.matchMedia(PHONE)
  phone.value = phoneQuery.matches
  phoneQuery.addEventListener('change', onPhone)
})
onBeforeUnmount(() => phoneQuery?.removeEventListener('change', onPhone))
/** Чип готовности и меню «⋯» — одна разметка: в шапке рабочего стола, на узком экране — в строке статусов и в нижней полосе. */
const [DefineChip, ReuseChip] = createReusableTemplate()
const [DefineMenu, ReuseMenu] = createReusableTemplate()
/** Навигатор «Настроек» — одна разметка на два места (такт 101): слева от колонки (L2) либо справа (варианты L1 оснастки). */
const [DefineSettingsNav, ReuseSettingsNav] = createReusableTemplate()
/**
 * Строка-карточка шага (решение 5): «Процессы и шаги» и оверлей повторяемого процесса — одна разметка. Карточка — `Card size="sm"`:
 * номер и название с описанием, тип и признаки, способ и нейросети, фото-подсказки; действия — «⋯» (правка в сайде, удаление).
 */
const [DefineStepCard, ReuseStepCard] = createReusableTemplate<{ st: StepDraft, k: number, overlay: boolean, edit: () => void, remove: () => void }>()
/**
 * Демо-осмотр на узком экране (решение 5): экран приложения без рамки телефона, оглавление и «Из чего собран экран» — вкладками.
 * Выбор экрана в оглавлении возвращает на вкладку экрана.
 */
const demoPane = ref<'screen' | 'toc' | 'sources'>('screen')
/* Оснастка приёмки (такт 92): `?pane=toc` · `sources` — вкладка демо-осмотра на узком экране при загрузке. */
const PANE_AT_LOAD = q('pane') === 'toc' || q('pane') === 'sources' ? q('pane') as 'toc' | 'sources' : null
function demoPick(id: string) {
  m.demoGo(id)
  if (phone.value) demoPane.value = 'screen'
}
/** Открытое меню «⋯» строки-карточки: `field:<id>`, `step:<id>`. */
const cardMenu = ref('')
function cardAct(fn: () => void) {
  cardMenu.value = ''
  fn()
}

const D = demo as unknown as Record<'main' | 'fresh', Dataset>
/** Окна и выделение «Формы» открывают таб «Форма» (такт 69); такт 88 — вставка полей из другой схемы. */
const FORM_OPEN = ['field', 'new-field', 'group', 'new-group', 'paste-fields']
/**
 * Окна «Процессов и шагов» открывают свой таб (такт 71); такт 87 — каталог, массовая заливка и просмотр подсказок; такт 88 —
 * вставка шагов и тексты повторяемого процесса.
 */
const PROCESS_OPEN = ['process', 'new-process', 'step', 'new-step', 'networks', 'overlay', 'overlay-filled', 'overlay-step',
  'catalog', 'step-catalog', 'catalog-view', 'fill', 'fill-catalog', 'hint-view', 'paste-steps', 'overlay-texts', 'overlay-variants']
/** Превью публичной страницы открывается с таба «Витрина»: туда возвращается фокус (такт 90). */
const SHOWCASE_OPEN = ['site']
const tabAtLoad = FORM_OPEN.includes(q('open')) || q('selected') ? 'form' : q('steps') || q('upload') || PROCESS_OPEN.includes(q('open')) ? 'processes'
  : SHOWCASE_OPEN.includes(q('open')) ? 'showcase' : TABS.find(t => t.id === q('tab'))?.id
const saveAtLoad = (['saving', 'error'] as SaveState[]).find(s => s === q('save'))
/**
 * Созданная схема — такт 91: набор данных передаёт окно «Новая схема осмотра» (`create.ts`, `takeHandoff`); прямой адрес
 * `?data=created&from=…` (оснастка) — набор по источнику с основой по умолчанию: шаблон или схема компании, пустая, копия «КАСКО…».
 */
const handoff = q('data') === 'created' ? takeHandoff() : null
function createdAtLoad(): Dataset {
  const at = { author: 'Анна Смирнова', editedAt: q('now') || '2026-10-03T09:00:00' }
  const id = q('from')
  if (id === 'copy') {
    const config = D.main.snapshots[D.main.snapshots.length - 1]!.config
    const from: CreateFrom = { kind: 'copy', config, title: config.settings.general.name }
    return createdDataset(from, defaultBasics(from), at)
  }
  const from: CreateFrom = createCard(id) ? { kind: 'card', id } : { kind: 'empty' }
  const basics = defaultBasics(from)
  return createdDataset(from, { ...basics, name: basics.name || 'Новая схема осмотра' }, at)
}
const created = q('data') === 'created'
const m = createModel(q('data') === 'new' ? D.fresh : created ? (handoff?.dataset ?? createdAtLoad()) : D.main, {
  tab: tabAtLoad,
  save: saveAtLoad,
  failNext: q('save') === 'fail',
  editing: q('presence') === '1' ? 'Игорь Петров' : q('presence'),
  viewing: q('view'),
  now: q('now') ? () => q('now') : undefined,
  group: q('group'),
  selectedFields: q('selected') ? q('selected').split(',') : [],
  selectedSteps: q('steps') ? q('steps').split(',') : [],
  saved: q('saved') === '1' || created,
  stripCollapsed: q('strip') === 'collapsed',
})
/* Уведомление о создании — после монтирования: тост, пришедший до области уведомлений, переносится в неё вторым узлом. */
if (handoff?.notice) onMounted(() => { setTimeout(() => m.notify(handoff.notice), 120) })
if (q('rules') === '1') m.draft.rulesChecked = true
const sectionAtLoad = SECTIONS.find(s => s.id === q('section'))?.id
if (sectionAtLoad) m.setSection(sectionAtLoad)
if (q('open') === 'comments') m.openSide('comments')
if (q('type') === 'house') m.draft.config.settings.general.schemeType = 'house'
if (q('card') === 'needs' || q('card') === 'published') m.draft.config.showcase.status = q('card') as 'needs' | 'published'
/* Оснастка приёмки (такт 90): источник цены «от» как данные; `low` — ручная цена 500 ₽ ниже тарифа. */
if (PRICE_SOURCES.some(x => x.value === q('price'))) m.draft.config.showcase.priceSource = q('price') as PriceSource
if (q('price') === 'low') Object.assign(m.draft.config.showcase, { priceSource: 'manual', priceFrom: 500 })

/** Конфигурация на экране: черновик либо открытый на просмотр снимок. */
const general = computed(() => m.shown.value.settings.general)
/** Просмотр прошлой версии — только чтение (r2 §2, состояние 7). */
const ro = computed(() => !!m.ui.viewing)
/** Поле конфигурации как `v-model`: запись идёт в черновик и запускает автосохранение. */
const bind = <T>(path: string, get: () => T) => computed<T>({ get, set: v => m.set(`settings.general.${path}`, v) })

const name = bind('name', () => general.value.name)
const description = bind('description', () => general.value.description)
const schemeType = bind('schemeType', () => general.value.schemeType)
const owner = bind('owner', () => general.value.owner)
const inspectionType = bind<string>('inspectionType', () => general.value.inspectionType)
const purpose = bind<string>('purpose', () => general.value.purpose)
const active = bind('active', () => general.value.active)

const beh = computed(() => general.value.behavior)
const setB = <K extends keyof BehaviorSettings>(key: K, value: BehaviorSettings[K]) => m.set(`settings.general.behavior.${key}`, value)
const unlockMinutes = bind('behavior.unlockMinutes', () => beh.value.unlockMinutes)
const refuseVisibility = bind<string>('behavior.refuseCommentVisibility', () => beh.value.refuseCommentVisibility)

/** Четыре формулы — r2 §4; подписи и подсказки — макет `33230:4123`…`33230:4361`. */
const FORMULAS: { key: keyof FormulaSettings, label: string, hint: string }[] = [
  { key: 'objectName', label: 'Наименование объекта', hint: 'Используется в отчётах и списках осмотров' },
  { key: 'schemeName', label: 'Наименование схемы', hint: 'Отображается в списке схем и в приложении' },
  { key: 'zipName', label: 'Имя zip-архива', hint: 'Имя архива с материалами осмотра при выгрузке' },
  { key: 'mailSubject', label: 'Тема письма оповещения', hint: 'Тема письма, которое получает клиент' },
]
const setFormula = (key: keyof FormulaSettings, value: string) => m.set(`settings.general.formulas.${key}`, value)

const statusDict = bind('dictionaries.statuses', () => general.value.dictionaries.statuses)
const commentDict = computed(() => COMMENT_DICTIONARIES.find(d => d.value === general.value.dictionaries.comments))

const dl = computed(() => general.value.deadlines)
const deadlineMode = bind<string>('deadlines.mode', () => dl.value.mode)
const deadlineHours = bind('deadlines.hours', () => dl.value.hours)
const deadlineDays = bind('deadlines.days', () => dl.value.days)
const deadlineFrom = bind('deadlines.from', () => dl.value.from)
const deadlineEditors = bind('deadlines.editors', () => dl.value.editors)
const share = bind<string>('deadlines.share', () => dl.value.share)
const manualCoordinate = bind('deadlines.manualCoordinate', () => dl.value.manualCoordinate)

const confirmHint = bind('confirm.hint', () => general.value.confirm.hint)
const confirmCheckbox = bind('confirm.checkbox', () => general.value.confirm.checkbox)

/* ------------------------------ разделы П3 ------------------------------ */
const settings = computed(() => m.shown.value.settings)
const setS = (path: string, value: unknown) => m.set(`settings.${path}`, value)
const bindS = <T>(path: string, get: () => T) => computed<T>({ get, set: v => m.set(`settings.${path}`, v) })

const mob = computed(() => settings.value.mobile)
const mobileMode = bindS<string>('mobile.mode', () => mob.value.mode)
const mobilePhoto = bindS('mobile.photo', () => mob.value.photo)
const mobileVideo = bindS('mobile.video', () => mob.value.video)
const mobilePhone = bindS('mobile.phone', () => mob.value.phone)
const mobilePhoneName = bindS('mobile.phoneName', () => mob.value.phoneName)
const mobileCallConfirm = bindS('mobile.callConfirm', () => mob.value.callConfirm)

/* Веб-приложение: форма нового обоснования — поля пустые, с плейсхолдерами (строка 12 реестра расхождений). */
const web = computed(() => settings.value.web)
const reasonForm = ref(q('open') === 'reason')
const reasonKey = ref('')
const reasonTitle = ref('')
function closeReasonForm() {
  reasonForm.value = false
  reasonKey.value = ''
  reasonTitle.value = ''
}
function createReason() {
  if (m.addReason(reasonKey.value, reasonTitle.value)) closeReasonForm()
}

/* Права доступа: таблица групп — поиск, фильтр, пагинация; счётчик строк согласован с пагинацией. */
const access = computed(() => settings.value.access)
const executors = bindS('access.executors', () => access.value.executors)
const accessManage = bindS<string>('access.manage', () => access.value.manage)
const createMode = bindS<string>('access.createMode', () => access.value.createMode)
const createRoles = bindS('access.createRoles', () => access.value.createRoles)
const GROUP_FILTERS = [{ value: 'all', label: 'Все группы' }, { value: 'selected', label: 'Только выбранные' }]
const groupQuery = ref('')
const groupFilter = ref('all')
const groupPage = ref(1)
const groupPageSize = ref(10)
const groupsFound = computed(() => {
  const needle = groupQuery.value.trim().toLowerCase()
  return ACCESS_GROUPS.filter(g => (!needle || `${g.name} ${g.owner}`.toLowerCase().includes(needle)) && (groupFilter.value === 'all' || access.value.groups.includes(g.id)))
})
const groupTotal = computed(() => groupsFound.value.length)
const groupPages = computed(() => Math.max(1, Math.ceil(groupTotal.value / groupPageSize.value)))
const groupRows = computed(() => groupsFound.value.slice((groupPage.value - 1) * groupPageSize.value, groupPage.value * groupPageSize.value))
watch([groupQuery, groupFilter, groupPageSize], () => { groupPage.value = 1 })
watch(groupPages, (n) => { if (groupPage.value > n) groupPage.value = n })
const pageGroupsState = computed(() => {
  const on = groupRows.value.filter(g => access.value.groups.includes(g.id)).length
  return on === 0 ? 'none' : on === groupRows.value.length ? 'all' : 'some'
})
/** Флажок шапки: из «все на странице» — снять их, иначе — отметить все строки страницы. */
function togglePageGroups() {
  const ids = groupRows.value.map(g => g.id)
  const rest = access.value.groups.filter(id => !ids.includes(id))
  m.set('settings.access.groups', pageGroupsState.value === 'all' ? rest : [...rest, ...ids])
}
function resetGroupSearch() {
  groupQuery.value = ''
  groupFilter.value = 'all'
}

/* ИИ-анализ: доступность модулей — от типа схемы («гасит»). */
const ai = computed(() => settings.value.ai)
const schemeTypeLabel = computed(() => SCHEME_TYPES.find(t => t.value === general.value.schemeType)?.label ?? '')
const finishOff = computed(() => !!m.rule('finishCost').reason)
const autoOff = computed(() => !!m.rule('autoModules').reason)
const aliasTotal = bindS('ai.aliasTotal', () => ai.value.aliasTotal)
const aliasRoom = bindS('ai.aliasRoom', () => ai.value.aliasRoom)
const regionMatrix = bindS('ai.regionMatrix', () => ai.value.regionMatrix)
/** Стоимость — целое неотрицательное число; прочие знаки отбрасываются. */
function setCost(code: string, text: string) {
  m.set(`settings.ai.costs.${code}`, Number(String(text).replace(/\D/g, '')) || 0)
}

/* Аномалии. */
const anomalies = computed(() => settings.value.anomalies)
const anomaliesOff = computed(() => !!m.rule('anomalies').reason)
const defaultRole = bindS('anomalies.defaultRole', () => anomalies.value.defaultRole)
const roleLabel = (role: string) => ROLE_LADDER.find(r => r.value === role)?.label ?? role
/** Подпись роли детектора: своя либо роль по умолчанию (аудит, «Раздел „Аномалии“»). */
function detectorRoleText(id: string) {
  const own = anomalies.value.detectors[id]?.role
  return own ? `роль: ${roleLabel(own)} — задана у детектора` : `роль: ${roleLabel(anomalies.value.defaultRole)} — по умолчанию`
}

/* PDF: таблица шаблонов и сайд шаблона — № 35, 38. */
const pdf = computed(() => settings.value.pdf)
const pdfSigner = bindS('pdf.signer', () => pdf.value.signer)
const TEMPLATE_ACTIONS: TableRowActionItem[] = [{ key: 'delete', label: 'Удалить', icon: 'delete', destructive: true }]
const TEMPLATE_ACTIONS_COLUMN = tableRowActionsColumn(TEMPLATE_ACTIONS)
const templateAccess = (t: PdfTemplate) => `${PDF_WHEN.find(w => w.value === t.when)?.label ?? ''}, ${roleLabel(t.role).toLowerCase()}`
const EMPTY_TEMPLATE: PdfTemplateDraft = { id: '', title: '', template: 'act-vehicle-v2', main: false, role: 'client', when: 'always' }
/** Черновик сайда шаблона: правки живут здесь до «Сохранить» (r2 §7). */
const tpl = ref<PdfTemplateDraft>({ ...EMPTY_TEMPLATE })
const tplInvalid = ref(false)
/** Имя в заголовке сайда правки — на момент открытия (карточка Д, такт 74: «Редактирование … — имя»). */
const tplTitle = ref('')
function openTemplate(id: string) {
  tpl.value = { ...(pdf.value.templates.find(t => t.id === id) ?? EMPTY_TEMPLATE) }
  tplTitle.value = tpl.value.title
  tplInvalid.value = false
  m.openSide('template')
}
if (q('open') === 'template') { m.setSection('pdf'); m.openSide('template') }
const templateOpen = sideSurface('template')
function saveTemplate() {
  tplInvalid.value = !tpl.value.title.trim()
  if (m.saveTemplate(tpl.value)) m.closeSurface()
}

/* ------------------------------ табы и прокрутка ------------------------------ */
/** Таб — состояние модели; прокрутка окна запоминается за уходящим табом и возвращается приходящему (СС-13). */
const tab = computed<string>({
  get: () => m.ui.tab,
  set: (v) => {
    if (import.meta.client) m.rememberScroll(m.ui.tab, window.scrollY)
    m.setTab(v as TabId)
  },
})
/** «Перейти к полям» — переход из середины «Настроек»: их положение запоминается, как при клике по табу. */
function goFields() {
  m.rememberScroll(m.ui.tab, window.scrollY)
  m.goToFields()
}
/**
 * Возврат положения таба. Содержимое таба монтируется не в тот же такт (`Presence` у `TabsContent`): пока документ
 * короче запомненного положения, прокрутка упирается в его конец. Положение ставится повторно, пока документ не
 * дорастёт; таймер — не `requestAnimationFrame`: в скрытой вкладке кадров нет.
 */
watch(() => m.ui.tab, async (t) => {
  await nextTick()
  const top = m.ui.scroll[t]
  for (let k = 0; k < 20 && m.ui.tab === t; k++) {
    window.scrollTo({ top, behavior: 'instant' })
    if (Math.abs(window.scrollY - top) <= 1) break
    await new Promise(r => setTimeout(r, 16))
  }
}, { flush: 'post' })

/** Верх подраздела в документе; запас 24 — поле рабочей зоны каркаса. */
const anchorTop = (id: string) => (document.getElementById(`anchor-${id}`)?.getBoundingClientRect().top ?? 0) + window.scrollY - 24
const column = ref<HTMLElement | null>(null)

/** Раздел навигатора: смена раздела ставит начало содержимого в окно. */
const section = computed<string>({
  get: () => m.ui.section,
  set: async (v) => {
    m.setSection(v as SectionId, SECTION_ANCHORS[v as SectionId][0]?.id ?? '')
    await nextTick()
    const top = (column.value?.getBoundingClientRect().top ?? 0) + window.scrollY - 24
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' })
  },
})
function goAnchor(id: string) {
  m.setSection(m.ui.section, id)
  window.scrollTo({ top: anchorTop(id), behavior: 'instant' })
}
function step(dir: -1 | 1) {
  const next = m.neighbourSection(dir)
  if (next) section.value = next
}
/** Соседние разделы для «← раздел» и «раздел →» — такт 100. */
const prevSection = computed(() => SECTIONS.find(x => x.id === m.neighbourSection(-1)) ?? null)
const nextSection = computed(() => SECTIONS.find(x => x.id === m.neighbourSection(1)) ?? null)
/** Активный якорь следует за прокруткой: последний подраздел, начало которого прошло верх окна. */
function spy() {
  const anchors = SECTION_ANCHORS[m.ui.section]
  if (m.ui.tab !== 'settings' || !anchors.length) return
  let current = anchors[0]!.id
  for (const a of anchors) if (anchorTop(a.id) <= window.scrollY + 1) current = a.id
  /* Конец страницы: последние подразделы до верха окна не доходят — активен последний; страница без прокрутки — первый. */
  const scrollable = document.documentElement.scrollHeight - window.innerHeight > 2
  if (scrollable && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = anchors[anchors.length - 1]!.id
  if (m.ui.anchor !== current) m.setSection(m.ui.section, current)
}
onMounted(() => {
  if (!m.ui.anchor) m.setSection(m.ui.section, SECTION_ANCHORS[m.ui.section][0]?.id ?? '')
  window.addEventListener('scroll', spy, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', spy))

/* ------------------------------ сайд словаря комментариев — № 69 ------------------------------ */
/** Черновик сайда: выбор словаря живёт здесь до «Сохранить» (r2 §7). */
const sideDict = ref('')
const sideOpen = sideSurface('comments')
watch(sideOpen, (v) => { if (v) sideDict.value = general.value.dictionaries.comments }, { immediate: true })
const sideComments = computed(() => COMMENT_DICTIONARIES.find(d => d.value === sideDict.value)?.comments ?? [])
function saveSide() {
  m.set('settings.general.dictionaries.comments', sideDict.value)
  m.closeSurface()
}

/* ------------------------------ поиск как в IDE — такт 86 ------------------------------ */
/**
 * Поиск — `docs/scheme-edit-review.md`, 3.2; эталон — JetBrains. Поле под шапкой, выдача — `Popover` у поля: охват с числом
 * совпадений и фильтр «Изменено в черновике» (`Toolbar`, `Tabs segmented`, `Switch`), группы по пути (`SelectGroup`), строки —
 * `SearchResult`, подвал клавиш (`ToolbarText`, `KbdText`). При пустом запросе — «Недавние». После перехода — режим
 * «найдено»: счётчик и стрелки в поле (слот `trailing` у `Input`), подсветка совпадений на табе (CSS Custom Highlight API),
 * число совпадений на табах (`TabsTrigger count`) и в навигаторе (`SectionNavItem count`), плашка над содержимым (`Callout`).
 */
const query = computed({ get: () => m.ui.query, set: v => m.setQuery(v) })
const scope = computed<string>({ get: () => m.ui.scope, set: v => m.setScope(v as SearchScope) })
const modified = computed<boolean>({ get: () => m.ui.modified, set: v => m.setModified(!!v) })
const searchFocused = ref(false)
/** Выдача открыта оснасткой адреса при загрузке: `?q=`, `?modified=list`, `?recent=demo`. */
const searchPinned = ref(!!q('q') || q('modified') === 'list' || q('recent') === 'demo')
/** Esc закрывает выдачу и оставляет фокус в поле; набор и новый фокус открывают её снова. */
const listDismissed = ref(false)
const finding = computed(() => m.ui.find.on)

/** Строка выдачи: найденное, «ещё N», недавний запрос, недавнее место, фильтр «Изменено в черновике». */
type Row =
  | { id: string, kind: 'hit', hit: SearchHit }
  | { id: string, kind: 'more', path: string, count: number }
  | { id: string, kind: 'query', text: string }
  | { id: string, kind: 'place', entry: SearchEntry }
  | { id: string, kind: 'filter', count: number }
interface Section { header: string, rows: Row[] }

/** «Недавние» при пустом запросе — 3.2, п. 11: фильтр изменённого, последние запросы и места переходов. */
const recentSections = computed<Section[]>(() => {
  const out: Section[] = []
  const changed = m.changedKeys.value.size
  if (changed) out.push({ header: '', rows: [{ id: 'filter', kind: 'filter', count: changed }] })
  if (m.ui.recent.queries.length) out.push({ header: 'Недавние запросы', rows: m.ui.recent.queries.map(text => ({ id: `q:${text}`, kind: 'query', text })) })
  if (m.recentPlaces.value.length) out.push({ header: 'Недавние места', rows: m.recentPlaces.value.map(entry => ({ id: `p:${entry.key}`, kind: 'place', entry })) })
  return out
})
/** Что в выдаче: найденное (запрос или фильтр), «Недавние» при пустом запросе; в режиме «найдено» выдачи нет. */
const listMode = computed<'results' | 'recent' | 'none'>(() => {
  if (finding.value) return 'none'
  if (m.ui.query.trim() || m.ui.modified) return 'results'
  return recentSections.value.length ? 'recent' : 'none'
})
const sections = computed<Section[]>(() => (listMode.value === 'recent'
  ? recentSections.value
  : m.searchGroups.value.map(g => ({
      header: g.path,
      rows: [
        ...g.hits.map(hit => ({ id: hit.entry.key, kind: 'hit', hit }) as Row),
        ...(g.more ? [{ id: `more:${g.path}`, kind: 'more', path: g.path, count: g.more } as Row] : []),
      ],
    }))))
const rows = computed(() => sections.value.flatMap(s => s.rows))
const searchOpen = computed(() => listMode.value !== 'none' && !listDismissed.value && (searchFocused.value || searchPinned.value))
/** Активная строка: стрелки двигают её, Enter выбирает; новый запрос, охват или фильтр — снова первая. */
const activeRow = ref(0)
watch([() => m.ui.query, () => m.ui.scope, () => m.ui.modified, listMode], () => { activeRow.value = 0 })
watch(() => m.ui.query, (v) => { if (v) listDismissed.value = false })
/** Общий счёт подвала — 3.2, п. 12: найдено в охвате. */
const totalText = computed(() => {
  const n = m.search.value.counts[m.ui.scope]
  return `${n} ${plural(n, 'результат', 'результата', 'результатов')}`
})
/** Найдено в других областях, в выбранной — ничего: подсказка про Tab вместо быстрого перехода. */
const emptyInScope = computed(() => m.search.value.hits.length > 0)
/** Пустая выдача — 3.2, п. 13: запрос, вариант в другой раскладке, быстрый переход; у фильтра без запроса — «изменений нет». */
const emptyTitle = computed(() => {
  const text = m.ui.query.trim()
  if (emptyInScope.value) return `В области «${SEARCH_SCOPES.find(s => s.id === m.ui.scope)?.label ?? ''}» ничего не найдено`
  if (!text) return 'Изменений в черновике нет'
  return m.ui.modified ? `Среди изменённого ничего не найдено по «${text}»` : `Ничего не найдено по «${text}»`
})
const emptyDescription = computed(() => {
  const n = m.search.value.hits.length
  if (emptyInScope.value) return `Найдено в других областях: ${n}. Tab — следующая область`
  if (!m.ui.query.trim()) return 'Черновик совпадает с текущей версией'
  const alt = m.search.value.alt
  return alt ? `В другой раскладке — «${alt}» — тоже ничего. Быстрый переход` : 'Быстрый переход'
})
const searchField = () => document.querySelector<HTMLInputElement>('[data-field=search] input')
/** Активная строка видна: прокрутка выдачи ставит её в видимую часть (ловушка такта 63). */
watch(activeRow, async () => {
  await nextTick()
  document.querySelector('[data-search-results] [data-slot=search-result][data-active]')?.scrollIntoView({ block: 'nearest' })
})

/** Выбор места либо действия; действие нового поля, группы, процесса открывает сайд — его черновик держит страница. */
function openEntry(e: SearchEntry) {
  searchPinned.value = false
  const side = m.openResult(e.key)
  searchField()?.blur()
  if (side === 'field') openField('')
  if (side === 'group') openGroup('')
  if (side === 'process') openProcess('')
  if (side === 'fill') openFill()
}
function pick(row: Row) {
  if (row.kind === 'hit') openEntry(row.hit.entry)
  else if (row.kind === 'place') openEntry(row.entry)
  else if (row.kind === 'more') m.expand(row.path)
  else if (row.kind === 'query') m.setQuery(row.text)
  else m.setModified(true)
}
/** Alt+Enter и переключатель строки — булева настройка переключается, выдача остаётся открытой (3.2, п. 9). */
function toggleRow(row: Row | undefined) {
  if (row?.kind === 'hit' && row.hit.entry.toggle) m.toggleFromSearch(row.hit.entry.key)
}
function goQuick(index: number) {
  searchPinned.value = false
  m.quick(index)
  searchField()?.blur()
}
/** Фокус в поле снова открывает выдачу, закрытую Esc. */
function onSearchFocusIn() {
  searchFocused.value = true
  listDismissed.value = false
  if (phone.value) revealSearch()
}
/**
 * Узкий экран (такт 92): выдача — во всю ширину окна от поля до края окна и только вниз; поле встаёт к верху окна, выдаче остаётся
 * вся высота экрана.
 */
function revealSearch() {
  const el = document.querySelector<HTMLElement>('[data-search]')
  if (!el) return
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 8)
  if (Math.abs(window.scrollY - top) > 1) window.scrollTo({ top, behavior: 'instant' })
}
onMounted(() => { if (phone.value && searchPinned.value) setTimeout(revealSearch, 60) })
/** Набор в поле в режиме «найдено» — снова выдача: режим снят, запрос прежний (и при наборе того же текста). */
function onSearchInput() {
  if (finding.value) m.leaveFind()
}
/** Esc и «Сбросить» — режим «найдено» снят, подсветка убрана, запрос и фильтр очищены (3.2, п. 18). */
function exitFind() {
  m.exitFind()
  clearMatches()
}
function onSearchKeydown(event: KeyboardEvent) {
  /* Режим «найдено» — 3.2, п. 14: Enter и Shift+Enter, стрелки поля — соседнее совпадение; фокус остаётся в поле. */
  if (finding.value) {
    if (event.key === 'Escape') { event.preventDefault(); listDismissed.value = true; exitFind() }
    else if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      m.findStep(event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey) ? -1 : 1, false)
    }
    return
  }
  if (event.key === 'Escape') {
    /* Esc очищает запрос и фильтр и закрывает выдачу (аудит, «Клавиатура и фокус»); фокус остаётся в поле. */
    event.preventDefault()
    searchPinned.value = false
    listDismissed.value = true
    m.setQuery('')
    m.setModified(false)
    return
  }
  if (!searchOpen.value) return
  if (event.key === 'Tab' && listMode.value === 'results') {
    /* Tab и Shift+Tab — соседний охват (3.2, п. 6). */
    event.preventDefault()
    m.cycleScope(event.shiftKey ? -1 : 1)
  }
  else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (!rows.value.length) return
    event.preventDefault()
    activeRow.value = (activeRow.value + (event.key === 'ArrowDown' ? 1 : rows.value.length - 1)) % rows.value.length
  }
  else if (event.key === 'Enter') {
    const row = rows.value[activeRow.value]
    if (!row) return
    event.preventDefault()
    if (event.altKey) toggleRow(row)
    else pick(row)
  }
}
/**
 * Хоткеи страницы. `/` — фокус в поиск; набор в поле ввода и в редактируемой области не перехватывается. Ctrl+F (Cmd+F) —
 * первое нажатие ставит фокус в поле и выделяет запрос, второе в поле отдаётся браузеру: браузерный поиск не видит скрытых
 * табов, поиск страницы видит (решение 3 оркестратора 2026-10-08); при открытом сайде или окне — браузеру. F3 и Shift+F3 —
 * соседнее совпадение режима «найдено»; вне режима — браузеру.
 */
function onHotkey(event: KeyboardEvent) {
  const field = searchField()
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === 'KeyF') {
    if (!field || document.activeElement === field || m.topSurface.value) return
    event.preventDefault()
    field.focus()
    field.select()
    return
  }
  if (event.key === 'F3') {
    if (!finding.value || m.topSurface.value) return
    event.preventDefault()
    m.findStep(event.shiftKey ? -1 : 1, document.activeElement !== field)
    return
  }
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
  const el = event.target as HTMLElement | null
  if (el?.closest('input, textarea, [contenteditable=true], [role=textbox]')) return
  event.preventDefault()
  /* Запрос выделяется: набор заменяет прежний (такт 86, как у Ctrl+F; запрос остаётся в поле в режиме «найдено»). */
  field?.focus()
  field?.select()
}

/**
 * Подсветка найденного: номер перехода — у строки-цели, у остальных — `null`. Номер выдаётся, когда цель уже
 * отрисована и стоит в окне: строка, смонтированная с готовым номером, смены пропа не видит и не вспыхивает.
 */
const flashed = ref({ target: '', n: 0 })
const hl = (key: string) => (flashed.value.target === key && flashed.value.n ? flashed.value.n : null)
/** Цель на странице: строка настройки, поле, группа выбора, формула, поле стоимости, кнопка; группа и карточка процесса — такт 86. */
function findTarget(target: string): HTMLElement | null {
  const cost = target.match(/^cost-(\w+)$/)
  if (cost) return document.querySelector(`[data-cost="${cost[1]}"]`)
  /* Поле формы (такт 69): строка таблицы полей; фокус встаёт на её флажок выбора. */
  const row = target.match(/^row-(.+)$/)
  if (row) return document.querySelector(`[data-form-row="${row[1]}"]`)
  /* Шаг процесса (такт 70): строка таблицы шагов; фокус встаёт на её флажок выбора. */
  const step = target.match(/^step-(.+)$/)
  if (step) return document.querySelector(`[data-step-row="${step[1]}"]`)
  /* Группа формы и процесс (такт 86): карточка группы в списке, карточка процесса. */
  const group = target.match(/^group-(.+)$/)
  /* Узкий экран (такт 92): группа — выбором списком; цель — поле выбора группы. */
  if (group) return document.querySelector(`[data-form-group="${group[1]}"]`) ?? (phone.value ? document.querySelector<HTMLElement>('[data-group-select]') : null)
  const process = target.match(/^process-(.+)$/)
  if (process) return document.querySelector(`[data-process="${process[1]}"]`)
  /* Кнопка по `data-act` (такт 91): «Добавить группу» и «Добавить процесс» пустых состояний — место проверок модели готовности. */
  if (target.startsWith('act:')) return document.querySelector(`[data-act="${target.slice(4)}"]`)
  /* Подраздел «Настроек» (такт 91): начало этапа «Правила» — его подраздел встаёт к верху окна, как по якорю навигатора. */
  if (/^anchor-/.test(target)) return document.getElementById(target)
  return document.querySelector(`[data-setting="${target}"], [data-field="${target}"], [data-radio="${target}"], [data-formula="${target}"], [data-act="${target}"]`)
}
/**
 * Переход к месту: раздел уже выставлен моделью; цель ждём, пока раздел отрисуется, ставим в верхнюю треть окна.
 * У строки настройки — вспышка (`highlighted`), у поля — фокус на его контроле. Переход из поля поиска (режим «найдено»,
 * такт 86) фокус оставляет в поле.
 */
watch(() => m.ui.found.n, async (n) => {
  if (!n || !import.meta.client) return
  const target = m.ui.found.target
  let el: HTMLElement | null = null
  for (let k = 0; k < 40 && !el; k++) {
    await new Promise(r => setTimeout(r, 16))
    el = findTarget(target)
  }
  if (!el || m.ui.found.n !== n) return
  /* Такт 91: подраздел — к верху окна, как якорь навигатора (`goAnchor`): активный якорь следит за прокруткой и встаёт на него. */
  if (/^anchor-/.test(target)) {
    window.scrollTo({ top: anchorTop(target.slice(7)), behavior: 'instant' })
    return
  }
  const top = el.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight / 3)
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
  flashed.value = { target, n }
  if (!m.ui.found.focus) return
  /* В просмотре версии (такт 68) поле — «только чтение»: фокус встаёт и на нём — значение читается и выделяется. */
  /* У строки таблицы (поле, шаг) первая кнопка — ручка перестановки (такт 70): фокус встаёт на флажок выбора строки. */
  const row = el.matches('[data-form-row], [data-step-row]') ? el.querySelector<HTMLElement>('[data-slot=choice-control]') : null
  if (el.matches('[data-setting], [data-process]')) return
  /* Такт 91: цель-кнопка («Добавить группу» пустой формы — место проверки «В форме нет полей») — фокус на ней самой. */
  const self = el.matches('button, input, textarea') ? el : null
  ;(row ?? self ?? el.querySelector<HTMLElement>('input, textarea, button, [contenteditable=true], [tabindex="0"]'))?.focus({ preventScroll: true })
})

/* ---------- подсветка совпадений на табе — 3.2, п. 15 ---------- */
/** Заголовок карточки процесса без счёта шагов в слоте `meta`. */
const processTitle = (el: Element) => el.querySelector('[data-process-title] [data-slot=heading], [data-process-title][data-slot=heading]') ?? el.querySelector('[data-process-title]')
/** Где искать слова совпадения: строка настройки, строка таблицы, карточка группы, заголовок процесса, обвязка поля. */
function scopeOf(e: SearchEntry): Element | null {
  const el = findTarget(e.target)
  if (!el) return null
  if (el.matches('[data-setting], [data-form-row], [data-step-row], [data-form-group]')) return el
  if (e.type === 'process') return processTitle(el) ?? el
  return el.closest('[data-slot=field-wrapper]') ?? el.closest('[data-formula]') ?? el
}
/** Фильтр без запроса — совпадение сама подпись места: подпись строки, название в таблице, подпись поля. */
function labelOf(e: SearchEntry): Element | null {
  const el = findTarget(e.target)
  if (!el) return null
  if (el.matches('[data-setting]')) return [...el.querySelectorAll('[data-slot=choice-title]')].find(x => x.closest('[data-setting]') === el) ?? el
  if (el.matches('[data-form-row], [data-step-row]')) return el.querySelector('[data-slot=table-cell-identity]')
  if (el.matches('[data-form-group]')) return el.querySelector('[data-slot=choice-title]')
  if (e.type === 'process') return processTitle(el)
  const field = el.closest('[data-slot=field-wrapper]')
  return field?.querySelector('label') ?? el
}
const findWords = computed(() => queryWords(m.search.value.effective))
/** Совпадения открытого таба: «Настройки» — раздел на экране, «Форма» — группа на экране. */
function paint() {
  if (!finding.value) { clearMatches(); return }
  const words = findWords.value
  const targets: HighlightTarget[] = []
  for (const e of m.findHits.value) {
    if (e.tab !== m.ui.tab || (e.tab === 'settings' && e.section !== m.ui.section) || (e.type === 'field' && e.group !== m.formGroup.value?.id)) continue
    const el = words.length ? scopeOf(e) : labelOf(e)
    if (el) targets.push({ el, words, current: e.key === m.ui.find.current })
  }
  highlightMatches(targets)
}
/** Содержимое таба монтируется не в тот же такт (`Presence` у `TabsContent`): подсветка ставится повторно таймером. */
let paintTimers: ReturnType<typeof setTimeout>[] = []
function schedulePaint() {
  if (!import.meta.client) return
  paintTimers.forEach(clearTimeout)
  paintTimers = [0, 80, 250, 600].map(ms => setTimeout(paint, ms))
}
watch([() => m.findHits.value, () => m.ui.find.current, () => m.ui.tab, () => m.ui.section, () => m.ui.group, finding], schedulePaint, { flush: 'post' })

/** Навигатор в режиме «найдено» — 3.2, п. 16: разделы с совпадениями и раздел на экране, у каждого — число. */
const navSections = computed(() => (finding.value ? SECTIONS.filter(s => m.findCounts.value.sections[s.id] > 0 || s.id === m.ui.section) : SECTIONS))
/**
 * Выбор раздела на узком экране — такт 92 (решение 5): семь разделов «Настроек» списком; в режиме «найдено» у раздела — число
 * совпадений второй строкой (как число у раздела навигатора, 3.2, п. 16).
 */
const sectionItems = computed(() => SECTIONS.map(x => ({
  value: x.id,
  label: x.label,
  subtitle: finding.value ? `Совпадений: ${m.findCounts.value.sections[x.id] ?? 0}` : undefined,
})))

/* ---------- «Недавние» — сессия вкладки (решение 5 оркестратора 2026-10-08, прецедент строки 167) ---------- */
const RECENT_KEY = 'scheme-edit:search-recent'
const DEMO_RECENT = { queries: ['размыт фото', 'дедлайн'], places: ['general.behavior.cadastreMap', 'form.f-plate', 'step.s-right', 'action.history'] }
watch(() => m.ui.recent, (r) => {
  if (!import.meta.client || q('recent') === 'demo') return
  try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(r)) } catch {}
}, { deep: true })

/* ---------- оснастка адреса — такты 65, 86 ---------- */
const SCOPE_AT_LOAD = SEARCH_SCOPES.find(s => s.id === q('scope'))?.id
if (SCOPE_AT_LOAD) m.setScope(SCOPE_AT_LOAD)
if (q('recent') === 'demo') m.setRecent(DEMO_RECENT)
if (q('modified') === '1' || q('modified') === 'list') m.setModified(true)
if (q('q')) m.setQuery(q('q'))
if (q('find')) m.setQuery(q('find'))
onMounted(() => {
  window.addEventListener('keydown', onHotkey)
  if (q('recent') !== 'demo') {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? 'null')
      if (saved && typeof saved === 'object') m.setRecent(saved)
    }
    catch {}
  }
  if (q('found')) m.goTo({ tab: 'settings', section: m.ui.section, anchor: m.ui.anchor, group: '', target: q('found') })
  if (q('find') || q('modified') === '1') m.startFind()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onHotkey)
  paintTimers.forEach(clearTimeout)
  clearMatches()
})

/* ------------------------------ публикация и версии — П4 ------------------------------ */
/** Открытая поверхность модели как `v-model:open` окна: закрытие окна снимает её со стека. */
const surface = (id: string) => computed({
  get: () => m.topSurface.value?.id === id,
  set: (v) => { if (!v && m.topSurface.value?.id === id) m.closeSurface() },
})
/**
 * Сайд страницы — такт 101 (владелец 2026-10-09, S1): немодальный, открыт, пока он в стеке, — окно по центру, открытое со
 * страницы поверх сайда (публикация, удаление), его не прячет. Закрывается, только когда он сверху: Esc и крестик — у верхнего слоя.
 * Объявлен функцией — сайды шаблона и словаря комментариев объявлены выше.
 */
function sideSurface(id: string) {
  return computed({
    get: () => m.ui.surfaces.some(x => x.id === id),
    set: (v: boolean) => { if (!v && m.topSurface.value?.id === id) m.closeSurface() },
  })
}
const publishOpen = surface('publish')
const firstPublishOpen = surface('first-publish')
const resetOpen = surface('reset')
const deleteOpen = surface('delete')
const historyOpen = sideSurface('history')
const menuOpen = ref(q('open') === 'menu')
const MENU: { key: 'export' | 'dump' | 'copy' | 'reset', label: string }[] = [
  { key: 'export', label: 'Экспортировать схему' },
  { key: 'dump', label: 'Скачать дамп' },
  { key: 'copy', label: 'Сделать копию' },
  { key: 'reset', label: 'Сбросить черновик к текущей версии' },
]
function pickMenu(key: 'export' | 'dump' | 'copy' | 'reset' | 'delete') {
  menuOpen.value = false
  m.menu(key)
}
/** Узкий экран (такт 92): «Предпросмотр» и «История версий» — пунктами «⋯». */
function pickPhone(key: 'preview' | 'history') {
  menuOpen.value = false
  if (key === 'preview') m.preview()
  else m.openHistory()
}
const currentDate = computed(() => m.history.value[0]?.date ?? '')
if (q('open') === 'publish' || q('open') === 'first-publish') m.openPublish()
if (q('open') === 'reset') m.openReset()
if (q('open') === 'delete') m.menu('delete')
if (q('open') === 'history') { m.openHistory(); if (q('version')) m.openVersion(q('version')) }
if (q('open') === 'copy') m.copy()

/* ------------------------------ «Форма» — П6, такт 69 ------------------------------ */
const fg = computed(() => m.formGroup.value)
/** Выбор группы — радио-карточки списка; смена группы снимает выделение полей. */
const groupValue = computed<string>({ get: () => fg.value?.id ?? '', set: v => m.selectGroup(v) })
const typeLabel = (t: string) => FIELD_TYPES.find(x => x.value === t)?.label ?? t
const label = (list: { value: string, label: string }[], v: string) => list.find(x => x.value === v)?.label ?? v
/** «Настройки группы» — четыре пары блока `33179:4467`. */
const groupMeta = computed(() => (fg.value
  ? [
      { label: 'Алиас', value: fg.value.alias || 'не задан' },
      { label: 'Экран создания', value: label(CREATE_SCREENS, fg.value.createScreen) },
      { label: 'В мобильном', value: label(MOBILE_SHOW, fg.value.mobile) },
      { label: 'Редактирование', value: fg.value.editable ? 'Разрешено' : 'Запрещено' },
    ]
  : []))
const fieldsCount = computed(() => (fg.value ? `${fg.value.fields.length} ${plural(fg.value.fields.length, 'поле', 'поля', 'полей')}` : ''))
const selectedCount = computed(() => m.ui.selectedFields.length)
const selectedText = computed(() => `Выбрано: ${selectedCount.value} ${plural(selectedCount.value, 'поле', 'поля', 'полей')}`)
const FIELD_ACTIONS: TableRowActionItem[] = [{ key: 'delete', label: 'Удалить', icon: 'delete', destructive: true }]
/** Выбор группы на узком экране — такт 92 (решение 5): группы списком, алиас второй строкой. */
const groupItems = computed(() => m.formGroups.value.map(g => ({ value: g.id, label: g.title, subtitle: g.alias || 'Алиас не задан' })))
const FIELD_ACTIONS_COLUMN = tableRowActionsColumn(FIELD_ACTIONS)

/** Сайд поля — № 42: черновик живёт здесь до «Сохранить» (r2 §7); порядковый номер — место в группе. */
const EMPTY_FIELD: FieldDraft = { id: '', title: '', alias: '', type: 'text', ...FIELD_DEFAULTS, order: 1 }
const fd = ref<FieldDraft>({ ...EMPTY_FIELD })
const fdTitle = ref('')
const fdError = ref<{ key: 'title' | 'alias', text: string } | null>(null)
function openField(id: string) {
  const g = fg.value
  if (!g) return
  const k = g.fields.findIndex(x => x.id === id)
  const f = g.fields[k]
  fd.value = f ? { ...JSON.parse(JSON.stringify(f)), order: k + 1 } : { ...EMPTY_FIELD, order: g.fields.length + 1 }
  fdTitle.value = f?.title ?? ''
  fdError.value = null
  m.openSide('field')
}
const fieldOpen = sideSurface('field')
const fieldOrderMax = computed(() => (fg.value?.fields.length ?? 0) + (fd.value.id ? 0 : 1))
/** «Предложить по названию» — алиас латиницей по заголовку, занятые в группе получают суффикс. */
function suggestFieldAlias() {
  fd.value.alias = suggestAlias(fd.value.title, fg.value?.fields.filter(x => x.id !== fd.value.id).map(x => x.alias) ?? [])
}
/** Зависимое поле — поле с выбором той же группы; «Не зависит» — пустое значение. */
const dependOptions = computed(() => [
  { value: 'none', label: 'Не зависит' },
  ...(fg.value?.fields.filter(x => x.id !== fd.value.id && x.type === 'choice').map(x => ({ value: x.id, label: x.title })) ?? []),
])
const fdDepends = computed<string>({ get: () => fd.value.dependsOn || 'none', set: (v) => { fd.value.dependsOn = v === 'none' ? '' : v } })
function saveFieldSide() {
  const g = fg.value
  if (!g) return
  fdError.value = m.fieldError(g.id, fd.value)
  if (m.saveField(g.id, fd.value)) m.closeSurface()
}

/** Сайд группы — № 68: поля по блоку «Настройки группы» `33179:4467`. */
const EMPTY_GROUP: GroupDraft = { id: '', title: '', alias: '', ...GROUP_DEFAULTS }
const gd = ref<GroupDraft>({ ...EMPTY_GROUP })
const gdTitle = ref('')
const gdInvalid = ref(false)
function openGroup(id: string) {
  const g = m.formGroups.value.find(x => x.id === id)
  gd.value = g ? { id: g.id, title: g.title, alias: g.alias, createScreen: g.createScreen, mobile: g.mobile, editable: g.editable } : { ...EMPTY_GROUP }
  gdTitle.value = g?.title ?? ''
  gdInvalid.value = false
  m.openSide('group')
}
const groupOpen = sideSurface('group')
/** Алиас группы — с заглавной, как у групп набора данных (`Lead`, `Car`). */
function suggestGroupAlias() {
  const alias = suggestAlias(gd.value.title, m.formGroups.value.filter(x => x.id !== gd.value.id).map(x => x.alias.toLowerCase()))
  gd.value.alias = alias.charAt(0).toUpperCase() + alias.slice(1)
}
function saveGroupSide() {
  gdInvalid.value = !gd.value.title.trim()
  if (m.saveGroup(gd.value)) m.closeSurface()
}
if (q('open') === 'field') {
  const id = fg.value?.fields.some(x => x.id === q('field')) ? q('field') : (fg.value?.fields[0]?.id ?? '')
  openField(id)
}
if (q('open') === 'new-field') openField('')
if (q('open') === 'group') openGroup(fg.value?.id ?? '')
if (q('open') === 'new-group') openGroup('')

/* ------------------------------ перестановка строк — такт 70, решение 3 оркестратора ------------------------------ */
/** Один механизм на обе таблицы: список `fields:<группа>` либо `steps:<процесс>`; номер «№» идёт за порядком. */
const reorder = useReorder((list, id, to) => {
  const [kind, owner] = list.split(':') as [string, string]
  return kind === 'steps' ? m.moveStep(owner, id, to) : m.moveField(owner, id, to)
})
const fieldRows = computed(() => (fg.value ? reorder.ordered(`fields:${fg.value.id}`, fg.value.fields) : []))

/* ------------------------------ «Процессы и шаги» — П7, такт 70 ------------------------------ */
const stepsCount = computed(() => m.selectedSteps.value.length)
const stepsText = computed(() => `Выбрано: ${stepsCount.value} ${plural(stepsCount.value, 'шаг', 'шага', 'шагов')}`)
const stepsWord = (n: number) => `${n} ${plural(n, 'шаг', 'шага', 'шагов')}`
const STEP_ACTIONS: TableRowActionItem[] = [{ key: 'delete', label: 'Удалить', icon: 'delete', destructive: true }]
const STEP_ACTIONS_COLUMN = tableRowActionsColumn(STEP_ACTIONS)
const kindLabel = (k: string) => STEP_KINDS.find(x => x.value === k)?.label ?? k
/** Тип шага в строке — атрибут правится по месту (аудит, «Принцип: атрибут — инлайн по месту»): список у метки типа. */
const kindOpen = ref('')
function pickKind(processId: string, stepId: string, kind: string) {
  kindOpen.value = ''
  m.setStepKind(processId, stepId, kind)
}
/** Инлайн-загрузчик фото-подсказки — раскрыт у одного шага; оснастка `?upload=`. */
const uploadOpen = ref(q('upload'))
function toggleUpload(id: string) { uploadOpen.value = uploadOpen.value === id ? '' : id }
/** Загрузка применяется сразу: на стенде нажатие на зону — один файл, перетаскивание — столько, сколько файлов. */
function upload(processId: string, stepId: string, count = 1) {
  m.uploadHints(processId, stepId, count)
  uploadOpen.value = ''
}
function dropFiles(event: DragEvent, processId: string, stepId: string) {
  upload(processId, stepId, event.dataTransfer?.files.length || 1)
}
/** Миниатюры подсказок шага для `ThumbStrip`: картинка и подпись — часть и ракурс либо имя своего файла (такт 87). */
const thumbs = (hints: readonly StepHint[]) => hints.map(h => ({ src: hintSrc(h), label: hintLabel(h) }))

/* ------------------------------ просмотр крупно — такт 87 ------------------------------ */
/**
 * Просмотр фото-подсказок крупно — `Lightbox` кита с `FrameStage`: из ячейки шага (миниатюры и «+N»), из сайда шага («глаз»
 * миниатюры) и из каталога (кнопка в углу плитки; там в полосе — «Выбрать»). Счётчик, стрелки и подпись — части и ракурса.
 */
interface ViewerItem { src: string, caption: string, pick: string }
const viewer = ref<{ items: ViewerItem[], index: number } | null>(null)
const viewerOpen = computed({ get: () => !!viewer.value, set: (v) => { if (!v) viewer.value = null } })
const viewerItem = computed(() => viewer.value?.items[viewer.value.index] ?? null)
function viewHints(hints: readonly StepHint[], index: number) {
  if (hints.length) viewer.value = { items: hints.map(h => ({ src: hintSrc(h), caption: hintLabel(h), pick: '' })), index: Math.min(index, hints.length - 1) }
}
function viewerStep(index: number) {
  if (viewer.value) viewer.value.index = Math.min(Math.max(0, index - 1), viewer.value.items.length - 1)
}

/* ------------------------------ каталог фото-подсказок — такт 87, 4.3 ------------------------------ */
/**
 * Сайд «Каталог фото-подсказок» — паттерн «выбор из справочника» (`spec-audit.md`): поиск, категории колонкой (категория
 * шага выбрана заранее), сетка `MediaGallery` с выбором нескольких, просмотр крупно, подвал «Выбрано: N · Добавить».
 * Откуда открыт — туда и отдаёт выбор: ячейка шага — сразу в черновик схемы одной записью; сайд шага — в черновик сайда;
 * строка массовой заливки — замена подсказки строки (второй слой сайда заливки, выбор одной).
 */
type CatalogTarget = 'cell' | 'side' | 'fill'
const cat = ref({ target: 'cell' as CatalogTarget, process: '', step: '', query: '', category: 'all' as HintCategoryFilter, picked: [] as string[] })
const catalogItems = computed(() => searchCatalog(cat.value.query, cat.value.category))
const catalogNumbers = computed(() => catalogCounts(cat.value.query))
const catalogQuery = computed({ get: () => cat.value.query, set: (v) => { cat.value.query = v } })
const catalogCategory = computed<string>({ get: () => cat.value.category, set: (v) => { cat.value.category = v as HintCategoryFilter } })
/** Шаг, для которого открыт каталог: строка таблицы, черновик сайда шага либо строка заливки. */
const catalogStep = computed(() => {
  if (cat.value.target === 'side') return { title: sd.value.title || 'Новый шаг', hints: sd.value.hints }
  const st = m.processes.value.find(p => p.id === cat.value.process)?.steps.find(x => x.id === cat.value.step)
  return { title: st?.title ?? '', hints: st?.hints ?? [] }
})
/** Подсказки каталога, которые уже у шага: плитка отмечена и выключена — «Уже у шага». В замене строки заливки — нет. */
const attached = computed(() => new Set(cat.value.target === 'fill' ? [] : catalogStep.value.hints.filter(h => h.kind === 'catalog').map(h => h.id)))
const catalogTitle = computed(() => (cat.value.target === 'fill' ? `Подсказка для шага «${catalogStep.value.title}»` : 'Каталог фото-подсказок'))
const catalogSubtitle = computed(() => (cat.value.target === 'fill' ? 'Каталог фото-подсказок · выберите одну' : `Для шага «${catalogStep.value.title}»`))
/** Пустая выдача: найдено в других категориях — переход ко всем; иначе — подсказка, по чему ищется. */
const catalogElsewhere = computed(() => (cat.value.category === 'all' ? 0 : catalogNumbers.value.all))
function openCatalog(target: CatalogTarget, processId = '', stepId = '') {
  if (target === 'cell' && !m.canEdit()) return
  const pid = target === 'side' ? sdHost.value.process : processId
  cat.value = { target, process: pid, step: target === 'side' ? sd.value.id : stepId, query: '', category: m.hintCategory(pid), picked: [] }
  if (target === 'fill') {
    const choice = fill.value.choice[stepId] ?? fillRowsNow.value.find(r => r.stepId === stepId)?.proposal.hint?.id
    cat.value.picked = choice ? [choice] : []
    fill.value.layer = 'catalog'
    return
  }
  /* Такт 101: из сайда шага каталог ложится поверх него; из ячейки — заменяет открытый сайд. */
  m.openSide('catalog', target === 'side')
}
/** Выбор плитки: в замене строки — одна подсказка, иначе — несколько. */
function togglePick(id: string) {
  const list = cat.value.picked
  if (cat.value.target === 'fill') cat.value.picked = list[0] === id ? [] : [id]
  else cat.value.picked = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
}
/** «Добавить» — ячейка: одна запись с «Отменить»; сайд шага: подсказки в черновик сайда. «Заменить» — выбор строки заливки. */
function confirmCatalog() {
  const ids = cat.value.picked.filter(id => !attached.value.has(id))
  if (!ids.length) return
  if (cat.value.target === 'fill') {
    fill.value.choice[cat.value.step] = ids[0]!
    fill.value.skip[cat.value.step] = false
    closeFillCatalog()
    return
  }
  if (cat.value.target === 'side') sd.value.hints.push(...ids.map(id => ({ kind: 'catalog' as const, id })))
  else m.addCatalogHints(cat.value.process, cat.value.step, ids)
  m.closeSurface()
}
function cancelCatalog() {
  if (cat.value.target === 'fill') closeFillCatalog()
  else m.closeSurface()
}
/** Просмотр крупно из каталога — подсказки сетки по порядку, в полосе просмотра — «Выбрать». */
function viewCatalog(id: string) {
  const list = catalogItems.value
  viewer.value = { items: list.map(c => ({ src: c.src, caption: catalogLabel(c), pick: c.id })), index: Math.max(0, list.findIndex(c => c.id === id)) }
}

/* ------------------------------ массовая заливка — такт 87, 4.4 ------------------------------ */
/**
 * Сайд «Заполнить фото-подсказки» (решение 5 оркестратора 2026-10-08): строки шагов без подсказок — «Показать все шаги»
 * добавляет остальные; у строки — предложение из каталога по названию шага и типу объекта с оценкой и причиной второй
 * строкой. «Требует внимания» — первой группой: «Похоже» и «Нет предложения». Предложение стоит заранее у шагов без
 * подсказок; «Не заполнять» убирает строку из установки, «Заполнить» возвращает; у шага с подсказками строка по умолчанию не
 * заполняется. «Заменить» — каталог вторым слоем сайда, выбор одной. Подвал — «Установить подсказки у N шагов», без окна
 * подтверждения; после — уведомление с «Отменить». Черновик — здесь, до «Установить».
 */
const fill = ref({ all: false, only: [] as string[], layer: 'list' as 'list' | 'catalog', choice: {} as Record<string, string>, skip: {} as Record<string, boolean> })
const fillRowsNow = computed<FillRow[]>(() => m.fillRows(fill.value.all, fill.value.only))
interface FillView { row: FillRow, hint: string, included: boolean, manual: boolean }
const fillViews = computed<FillView[]>(() => fillRowsNow.value.map((row) => {
  const manual = fill.value.choice[row.stepId]
  const hint = manual ?? row.proposal.hint?.id ?? ''
  /* По умолчанию заполняется шаг без подсказок, у которого есть предложение. */
  const skip = fill.value.skip[row.stepId] ?? !(row.count === 0 && !!row.proposal.hint)
  return { row, hint, included: !!hint && !skip, manual: !!manual }
}))
const fillIncluded = computed(() => fillViews.value.filter(v => v.included))
const FILL_GROUPS: { id: 'attention' | 'matched', title: string, test: (m: HintMatch) => boolean }[] = [
  { id: 'attention', title: 'Требует внимания', test: x => x !== 'match' },
  { id: 'matched', title: 'Подобрано', test: x => x === 'match' },
]
const fillGroups = computed(() => FILL_GROUPS.map(g => ({ ...g, rows: fillViews.value.filter(v => g.test(v.row.proposal.match)) })).filter(g => g.rows.length))
const fillSubtitle = computed(() => `Подобрано ${fillIncluded.value.length} из ${fillViews.value.length}`)
const fillApplyText = computed(() => `Установить подсказки у ${fillIncluded.value.length} ${plural(fillIncluded.value.length, 'шага', 'шагов', 'шагов')}`)
/** Оценка строки — метка-контур тоном: «Совпадает» — успех, «Похоже» — предупреждение, «Нет предложения» — нейтральная; выбранное вручную — бренд. */
const MATCH_TONE: Record<HintMatch, 'success' | 'warning' | 'neutral'> = { match: 'success', similar: 'warning', none: 'neutral' }
/** Подпись подсказки каталога по id: часть и ракурс; пусто — подсказки нет. */
const catalogName = (id: string) => { const c = catalogHint(id); return c ? catalogLabel(c) : '' }
/** Вторая строка шага: процесс и подсказки, которые уже есть. */
const fillWhere = (r: FillRow) => (r.count ? `${r.process} · уже ${r.count} ${plural(r.count, 'подсказка', 'подсказки', 'подсказок')}` : r.process)
function openFill(only: readonly string[] = []) {
  if (!m.canEdit()) return
  fill.value = { all: false, only: [...only], layer: 'list', choice: {}, skip: {} }
  m.openSide('fill')
}
function fillToggle(stepId: string) {
  const v = fillViews.value.find(x => x.row.stepId === stepId)
  if (v) fill.value.skip[stepId] = v.included
}
function closeFillCatalog() { fill.value.layer = 'list' }
function applyFill() {
  if (m.applyHints(fillIncluded.value.map(v => ({ stepId: v.row.stepId, hint: v.hint })))) m.closeSurface()
}

/** Сайд каталога и сайд массовой заливки — одно окно: заливка показывает каталог вторым слоем, как дифф версии в истории. */
const hintsSurface = computed(() => [...m.ui.surfaces].reverse().find(x => x.id === 'catalog' || x.id === 'fill')?.id ?? '')
const hintsOpen = computed({ get: () => !!hintsSurface.value, set: (v) => { if (!v && hintsSurface.value && m.topSurface.value?.id === hintsSurface.value) m.closeSurface() } })
const catalogShown = computed(() => hintsSurface.value === 'catalog' || (hintsSurface.value === 'fill' && fill.value.layer === 'catalog'))
/** Esc во втором слое заливки — назад к списку, сайд остаётся. */
function onHintsEscape(event: KeyboardEvent) {
  if (hintsSurface.value === 'fill' && fill.value.layer === 'catalog') {
    event.preventDefault()
    closeFillCatalog()
  }
}

/* ------------------------------ вставка из другой схемы — такт 88, 4.5 ------------------------------ */
/**
 * Сайд «Вставить поля / шаги из другой схемы» — паттерн «выбор из справочника» (`spec-audit.md`; решение 3 оркестратора
 * 2026-10-08): навигация внутри одного сайда «схема → группа (процесс) → поля (шаги)»; «←» и Esc — уровень назад, Esc на
 * первом уровне закрывает сайд. Схемы — той же компании и отобранные шаблоны, поиск по названию (`ListRow`, как список версий
 * истории, № 56); поля и шаги — `Table` с флажками, типом, алиасом либо способом съёмки; конфликт алиаса виден до вставки.
 * Подвал — «Вставить N … в …». Выбор живёт в открытой группе (процессе): возврат на уровень назад его сбрасывает.
 */
type PasteKind = 'fields' | 'steps'
type PasteLevel = 'schemes' | 'parts' | 'items'
const paste = ref({ kind: 'fields' as PasteKind, query: '', scheme: '', part: '', picked: [] as string[], target: '' })
const pasteOpen = sideSurface('paste')
const pasteLevel = computed<PasteLevel>(() => (!paste.value.scheme ? 'schemes' : !paste.value.part ? 'parts' : 'items'))
const pasteDonor = computed(() => m.donorById(paste.value.scheme))
const pasteSchemes = computed(() => m.donorGroups(paste.value.query))
const pasteQuery = computed({ get: () => paste.value.query, set: (v) => { paste.value.query = v } })
const schemeTypeName = (v: string) => SCHEME_TYPES.find(t => t.value === v)?.label ?? v
const fieldsText = (n: number) => `${n} ${plural(n, 'поле', 'поля', 'полей')}`
/** Вторая строка схемы: тип и состав — группы и поля у вставки полей, процессы и шаги у вставки шагов. */
function donorMeta(d: DonorScheme) {
  const what = paste.value.kind === 'fields'
    ? `${d.groups.length} ${plural(d.groups.length, 'группа', 'группы', 'групп')} · ${fieldsText(d.groups.reduce((n, g) => n + g.fields.length, 0))}`
    : `${d.processes.length} ${plural(d.processes.length, 'процесс', 'процесса', 'процессов')} · ${stepsWord(d.processes.reduce((n, p) => n + p.steps.length, 0))}`
  return `${schemeTypeName(d.schemeType)} · ${what}`
}
/** Второй уровень — группы либо процессы донора: алиас и число полей (шагов); пустые выключены. */
const pasteParts = computed(() => {
  const d = pasteDonor.value
  if (!d) return []
  return paste.value.kind === 'fields'
    ? d.groups.map(g => ({ id: g.id, title: g.title, meta: `${g.alias || 'алиас не задан'} · ${fieldsText(g.fields.length)}`, empty: !g.fields.length }))
    : d.processes.map(p => ({ id: p.id, title: p.title, meta: `${p.alias || 'алиас не задан'} · ${stepsWord(p.steps.length)}`, empty: !p.steps.length }))
})
const pastePart = computed(() => pasteParts.value.find(x => x.id === paste.value.part) ?? null)
/** Поля открытой группы с планом алиасов: конфликт с группой-целью виден до вставки. */
const pasteFieldRows = computed(() => (paste.value.kind === 'fields' && pasteLevel.value === 'items' && fg.value
  ? m.fieldPastePlan(fg.value.id, paste.value.scheme, paste.value.part)
  : []))
/** Шаги открытого процесса донора. */
const pasteStepRows = computed<ProcessStep[]>(() => (paste.value.kind === 'steps' && pasteLevel.value === 'items'
  ? pasteDonor.value?.processes.find(p => p.id === paste.value.part)?.steps ?? []
  : []))
const pasteRowIds = computed(() => (paste.value.kind === 'fields' ? pasteFieldRows.value.map(r => r.field.id) : pasteStepRows.value.map(s => s.id)))
const pasteAll = computed<'all' | 'some' | 'none'>(() => {
  const n = pasteRowIds.value.filter(id => paste.value.picked.includes(id)).length
  return n === 0 ? 'none' : n === pasteRowIds.value.length ? 'all' : 'some'
})
/** Что переносится с шагом — вторая строка шага: фото-подсказки и нейросети. */
function stepCarry(st: ProcessStep) {
  const n = st.hints.length
  const hints = n ? `${n} ${plural(n, 'фото-подсказка', 'фото-подсказки', 'фото-подсказок')}` : 'без фото-подсказок'
  return `${hints} · ${st.networks.length ? st.networks.join(', ') : 'без нейросетей'}`
}
/** Процессы-цели вставки шагов — обычные процессы схемы (шаги повторяемого правит оверлей). */
const pasteTargetItems = computed(() => m.pasteTargets.value.map(p => ({ value: p.id, label: p.title })))
const pasteTarget = computed<string>({ get: () => paste.value.target, set: (v) => { paste.value.target = v } })
const pasteWhere = computed(() => (paste.value.kind === 'fields'
  ? `в группу «${fg.value?.title ?? ''}»`
  : `в процесс «${m.processes.value.find(p => p.id === paste.value.target)?.title ?? ''}»`))
const pasteTitle = computed(() => {
  if (pasteLevel.value === 'items') return pastePart.value?.title ?? ''
  if (pasteLevel.value === 'parts') return pasteDonor.value?.title ?? ''
  return paste.value.kind === 'fields' ? 'Вставить поля из другой схемы' : 'Вставить шаги из другой схемы'
})
const pasteSubtitle = computed(() => {
  if (pasteLevel.value === 'items') return pasteDonor.value?.title ?? ''
  if (pasteLevel.value === 'parts') return paste.value.kind === 'fields' ? 'Группы полей схемы' : 'Процессы схемы'
  return `${pasteWhere.value.charAt(0).toUpperCase()}${pasteWhere.value.slice(1)}`
})
const pasteConfirmText = computed(() => {
  const n = paste.value.picked.length
  if (!n) return `Вставить ${pasteWhere.value}`
  return `Вставить ${n} ${paste.value.kind === 'fields' ? plural(n, 'поле', 'поля', 'полей') : plural(n, 'шаг', 'шага', 'шагов')} ${pasteWhere.value}`
})
/** Фокус после смены уровня — строка, с которой пришли, либо первая строка уровня: содержимое сайда сменилось целиком. */
function focusPaste(sel: string) {
  nextTick(() => setTimeout(() => document.querySelector<HTMLElement>(`[data-side=paste] ${sel}`)?.focus(), 0))
}
function openPaste(kind: PasteKind) {
  if (!m.canEdit()) return
  if (kind === 'fields' && !fg.value) { m.notify('В форме нет групп — сначала добавьте группу', 'err'); return }
  const target = m.pasteTargets.value[0]?.id ?? ''
  if (kind === 'steps' && !target) { m.notify('В схеме нет процессов для шагов — сначала добавьте процесс', 'err'); return }
  paste.value = { kind, query: '', scheme: '', part: '', picked: [], target }
  m.openSide('paste')
}
function pasteGo(scheme: string) {
  paste.value.scheme = scheme
  paste.value.part = ''
  paste.value.picked = []
  focusPaste('[data-paste-part]:not(:disabled)')
}
function pasteOpenPart(part: string) {
  paste.value.part = part
  paste.value.picked = []
  focusPaste('[data-paste-row] [data-slot=choice-control]')
}
/** «←» и Esc — уровень назад: выбор полей (шагов) сбрасывается, фокус — на строке, с которой пришли. */
function pasteBack() {
  const p = paste.value
  if (p.part) {
    const from = p.part
    p.part = ''
    p.picked = []
    focusPaste(`[data-paste-part="${from}"]`)
  }
  else if (p.scheme) {
    const from = p.scheme
    p.scheme = ''
    focusPaste(`[data-paste-scheme="${from}"]`)
  }
}
/** Esc на втором и третьем уровне — назад; на первом закрывает сайд (обычное поведение окна). */
function onPasteEscape(event: KeyboardEvent) {
  if (!paste.value.scheme) return
  event.preventDefault()
  pasteBack()
}
function pasteToggle(id: string) {
  const list = paste.value.picked
  paste.value.picked = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
}
/** Флажок шапки: из «все» — снять, иначе — выбрать все строки открытой группы (процесса). */
function pasteToggleAll() {
  paste.value.picked = pasteAll.value === 'all' ? [] : [...pasteRowIds.value]
}
/** «Вставить N …» — одна запись с «Отменить»; сайд закрывается, фокус — на кнопке, которая его открыла. */
function confirmPaste() {
  const p = paste.value
  const n = p.kind === 'fields'
    ? (fg.value ? m.pasteFields(fg.value.id, p.scheme, p.part, p.picked) : 0)
    : m.pasteSteps(p.target, p.scheme, p.part, p.picked)
  if (n) m.closeSurface()
}

/* ------------------------------ сайды процесса и шага, оверлей — П7, часть 2, такт 71 ------------------------------ */
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x))
/**
 * Поверхность в стеке как `v-model:open`: оверлей остаётся открытым, пока поверх него сайд шага (стек «оверлей → сайд»,
 * r2 §7); закрытие снимает его, только когда он верхний.
 */
const stacked = (id: string) => computed({
  get: () => m.ui.surfaces.some(x => x.id === id),
  set: (v) => { if (!v && m.topSurface.value?.id === id) m.closeSurface() },
})
/** Иконка типа процесса на стенде — один демо-файл. */
const ICON_FILE = 'process-icon.svg'
const durationLabel = (v: string) => DURATION_MODES.find(x => x.value === v)?.label ?? v

/** Сайд процесса — № 48, 49 (макеты `33245:5722`, `33245:6032`): черновик живёт здесь до «Сохранить». */
const EMPTY_PROCESS: ProcessDraft = { id: '', title: '', alias: '', repeatable: false, steps: [], ...PROCESS_DEFAULTS, order: 1 }
const pd = ref<ProcessDraft>(copy(EMPTY_PROCESS))
const pdTitle = ref('')
const pdError = ref<{ key: 'title' | 'alias', text: string } | null>(null)
function openProcess(id: string) {
  if (!m.canEdit()) return
  const list = m.processes.value
  const k = list.findIndex(x => x.id === id)
  const p = list[k]
  pd.value = p ? { ...copy(p), order: k + 1 } : { ...copy(EMPTY_PROCESS), order: list.length + 1 }
  pdTitle.value = p?.title ?? ''
  pdError.value = null
  m.openSide('process')
}
const processOpen = sideSurface('process')
const processOrderMax = computed(() => m.processes.value.length + (pd.value.id ? 0 : 1))
/** «Предложить по названию» — алиас процесса латиницей, занятые получают суффикс. */
function suggestProcessAlias(d: ProcessDraft) {
  d.alias = suggestAlias(d.title, m.processes.value.filter(x => x.id !== d.id).map(x => x.alias))
}
function saveProcessSide() {
  pdError.value = m.processError(pd.value)
  if (m.saveProcess(pd.value)) m.closeSurface()
}

/**
 * Оверлей повторяемого процесса — № 64 (r2 §7): полноэкранный слой, форма процесса и его шаги вместе; черновик оверлея —
 * копия процесса, «Сохранить» отдаёт его модели одной операцией вместе с шагами. В просмотре версии открывается на чтение.
 */
const od = ref<ProcessDraft>(copy(EMPTY_PROCESS))
const odError = ref<{ key: 'title' | 'alias', text: string } | null>(null)
function openOverlay(id: string) {
  const list = m.processes.value
  const k = list.findIndex(x => x.id === id)
  const p = list[k]
  if (!p) return
  od.value = { ...copy(p), order: k + 1 }
  odError.value = null
  m.openOverlay()
}
const overlayOpen = stacked('process-overlay')
function saveOverlay() {
  odError.value = m.processError(od.value)
  if (m.saveProcess(od.value, true)) m.closeSurface()
}
/** Удаление шага в оверлее — правка черновика оверлея: «Отмена» оверлея его вернёт. */
function removeOverlayStep(id: string) { od.value.steps = od.value.steps.filter(x => x.id !== id) }
const overlaySubtitle = computed(() => (ro.value ? 'Повторяемый процесс · только чтение' : 'Повторяемый процесс · форма и шаги вместе'))

/* ---------- тексты в приложении — такт 88, 4.6 ---------- */
/**
 * Раздел «Тексты в приложении» оверлея (решения 4, 5 оркестратора 2026-10-08): шесть текстов экрана повторяемого процесса.
 * Поле — `Autocomplete` с вариантами словаря по типу объекта процесса (без типа — всех типов); под полем до трёх вариантов
 * чипами (`Chip pressable`) и «Все варианты» — поповер с поиском и группами по типу объекта. Правка — черновик оверлея: в схему
 * уходит по «Сохранить» оверлея одной записью. «Заполнить по типу объекта» — только пустые, с «Отменить» (`m.fillTexts`).
 */
const textsTyped = computed(() => knownObjectType(od.value.objectType))
const textsFillHint = computed(() => (textsTyped.value ? 'Только пустые поля — заполненные не меняются' : 'Сначала выберите тип объекта съёмки в разделе «Поведение»'))
const textItems = (key: RepeatTextKey) => textVariants(od.value.objectType, key).map(v => ({ value: v, label: v }))
/** Поповер «Все варианты» открыт у одного поля; запрос поиска — свой у каждого открытия. */
const variantsOpen = ref<RepeatTextKey | ''>('')
const variantQuery = ref('')
function openVariants(key: RepeatTextKey, open: boolean) {
  if (open) { variantQuery.value = ''; variantsOpen.value = key }
  else if (variantsOpen.value === key) variantsOpen.value = ''
}
/** Вариант чипом или из поповера — в поле черновика оверлея; поповер закрывается, фокус — на «Все варианты». */
function pickText(key: RepeatTextKey, value: string) {
  od.value.texts[key] = value
  if (variantsOpen.value === key) variantsOpen.value = ''
}
/**
 * Фрагмент экрана приложения у раздела текстов — такт 89 (решение 7 оркестратора): экран списка повторов на текстах черновика
 * оверлея, тем же механизмом, что демо-осмотр. Поле в фокусе выбирает экран, где его текст виден, и обводит текст: название
 * повтора и подсказка — экран повтора, «Есть ещё?» и кнопка завершения — экран вопроса, остальное — список.
 */
const textFocus = ref<RepeatTextKey | ''>('')
const TEXT_SCREEN: Record<RepeatTextKey, 'repeat-list' | 'repeat-item' | 'repeat-more'> = {
  empty: 'repeat-list', add: 'repeat-list', item: 'repeat-item', before: 'repeat-item', more: 'repeat-more', finish: 'repeat-more',
}
const textsPreview = computed(() => {
  const p = { ...od.value, id: od.value.id || 'draft', repeatable: true, hidden: false }
  const d = buildDemo({ ...m.shown.value, processes: [p] })
  return d.byId[`${textFocus.value ? TEXT_SCREEN[textFocus.value] : 'repeat-list'}:${p.id}`] ?? null
})
const textsMark = computed(() => (textFocus.value ? [`texts:${od.value.id || 'draft'}:${textFocus.value}`] : []))
function onTextFocus(event: FocusEvent) {
  const key = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-text]')?.dataset.text as RepeatTextKey | undefined
  if (key) textFocus.value = key
}

/* ------------------------------ демо-осмотр — такт 89, 4.1 ------------------------------ */
/**
 * Демо-осмотр (решения 5, 6 оркестратора 2026-10-08): полноэкранный оверлей — слева оглавление экранов по этапам с пробелами
 * (`SectionNav`), в центре телефон с переходами по кнопкам экрана, ← → и счётчиком либо карта — ряды миниатюр по этапам;
 * справа «Из чего собран экран» со ссылками «Изменить». Наведение на элемент телефона подсвечивает строку справа, наведение
 * на строку обводит элемент. Экраны — модель (`m.demo`, `~/stands/scheme-edit/demo.ts`).
 */
const demoOpen = surface('demo')
const demoMode = computed<string>({ get: () => m.ui.demo.mode, set: v => m.setDemoMode(v === 'map' ? 'map' : 'steps') })
/** Этап открытого экрана — раздел оглавления; выбор этапа ведёт на его первый экран. */
const demoStage = computed<string>({
  get: () => m.demoScreen.value.stage,
  set: (v) => {
    const st = m.demo.value.stages.find(x => x.id === v)
    if (st && st.id !== m.demoScreen.value.stage) m.demoGo(st.screens[0]!)
    /* Узкий экран (такт 92): этап без якорей — сразу его экран на вкладке «Экран». */
    if (st && phone.value && !tocAnchors(st.id).length) demoPane.value = 'screen'
  },
})
/**
 * Обводка элемента телефона и подсветка строки «Из чего собран экран»: переход из «?» (модель, до смены экрана) и наведение —
 * на элемент телефона либо на строку (страница).
 */
const demoHover = ref('')
const demoMarked = computed(() => (demoHover.value ? [...m.ui.demo.mark, demoHover.value] : m.ui.demo.mark))
watch(() => m.ui.demo.screen, () => { demoHover.value = '' })
/*
 * Такт 91: «Изменить» закрывает оверлей под курсором — строка уходит из DOM без `mouseleave`, и наведение пережило бы закрытие:
 * снова открытый демо-осмотр подсвечивал строку без курсора над ней (вскрыл прогон, СС-96). Закрытие оверлея наведение сбрасывает.
 */
watch(() => demoOpen.value, (v) => {
  if (!v) demoHover.value = ''
  /* Узкий экран (такт 92): демо-осмотр открывается на вкладке «Экран». */
  else demoPane.value = 'screen'
})
if (PANE_AT_LOAD) onMounted(() => { demoPane.value = PANE_AT_LOAD })
const demoTitle = computed(() => `Демо-осмотр — ${general.value.name || 'Новая схема осмотра'}`)
const demoSubtitle = computed(() => (ro.value ? `По версии от ${m.history.value.find(v => v.id === m.ui.viewing)?.date ?? ''} · логика не выполняется` : 'По черновику · логика не выполняется'))
/** Якоря этапа в оглавлении: у этапа из нескольких экранов и у экрана с пробелом. */
const tocAnchors = (stageId: string) => {
  const st = m.demo.value.stages.find(x => x.id === stageId)
  return st && (st.screens.length > 1 || m.demo.value.byId[st.screens[0]!]!.gaps.length) ? st.screens.map(id => m.demo.value.byId[id]!) : []
}
/** Миниатюра карты — экран «По шагам». */
function openFromMap(id: string) {
  m.demoGo(id)
  m.setDemoMode('steps')
}
/** ← → в оверлее — соседний экран; в поле ввода и на карте стрелки свои. */
function onDemoKey(event: KeyboardEvent) {
  if (m.ui.demo.mode !== 'steps' || event.altKey || event.ctrlKey || event.metaKey) return
  if ((event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable=true], [role=tablist]')) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    m.demoStep(event.key === 'ArrowLeft' ? -1 : 1)
  }
}
/**
 * «Изменить» строки «Из чего собран экран»: оверлей закрывается, страница ведёт к месту (настройка — переходом поиска,
 * сущность — к своему месту), сущность открывает свой сайд — после того как оверлей вернул фокус открывателю. В просмотре
 * версии — «Показать»: только переход, сайдов правки в просмотре нет (СС-53/просмотр).
 */
function editDemo(src: DemoSource) {
  const e = m.demoEdit(src)
  const open = () => {
    if (e.kind === 'field') openField(e.field)
    else if (e.kind === 'group') openGroup(e.group)
    else if (e.kind === 'step') openStep(e.process, e.step, false, e.section)
    else if (e.kind === 'process') {
      if (!e.repeatable) { openProcess(e.process); return }
      openOverlay(e.process)
      if (e.texts) nextTick(() => setTimeout(() => document.querySelector('[data-overlay-texts]')?.scrollIntoView({ block: 'start' }), 120))
    }
  }
  if (e.kind !== 'setting' && e.kind !== 'tab' && !ro.value) nextTick(() => setTimeout(open, 60))
}

/* ---------- превью у «?» — такт 89, 4.2 ---------- */
/**
 * «?» с превью (решение 7 оркестратора): у настроек с проявлением в приложении — поповер по нажатию с фрагментом экрана,
 * названием, пояснением и значением; «Открыть в демо-осмотре» — на этот экран с обведённым элементом. Открытый — один.
 */
const helpOpen = ref('')
function setHelp(key: string, open: boolean) {
  if (open) helpOpen.value = key
  else if (helpOpen.value === key) helpOpen.value = ''
}
const help = (key: HelpKey) => m.helpView(key)
const fieldHelp = (id: string) => m.fieldView(id)
/** Пропы «?» настройки: название, пояснение, значение, открытость; метка `data-help` — оснастка и прогон. */
function helpBind(key: HelpKey) {
  const v = help(key)
  return { 'title': v.title, 'description': v.description, 'value': v.value, 'open': helpOpen.value === key, 'data-help': key }
}
/** «Где увидит исполнитель» у поля формы — тот же поповер (решение 7). */
function fieldBind(id: string) {
  const v = fieldHelp(id)
  return { 'title': v?.title ?? '', 'description': v?.description ?? '', 'value': v?.value ?? '', 'open': helpOpen.value === `field:${id}`, 'data-help': `field:${id}`, 'label': 'Где увидит исполнитель' }
}
/** «Открыть в демо-осмотре»: экран превью и обведённый элемент; места нет (поле только web) — первый экран анкеты. */
function demoFromHelp(view: HelpPreviewView | null) {
  helpOpen.value = ''
  const anketa = m.demo.value.stages.find(st => st.kind === 'form')?.screens[0] ?? ''
  m.openDemo(view?.screen?.id ?? anketa, view?.mark ?? [])
}

/**
 * Сайд шага — № 63 (пробел макета): шесть секций аудита — «Основное», «Поведение», «Съёмка», «Нейросети», «Подсказки»,
 * «Связи». Открывается с полотна (пишет в черновик схемы) либо поверх оверлея (пишет в черновик оверлея).
 */
const EMPTY_STEP: StepDraft = { id: '', title: '', kind: 'main', method: '1 фото', networks: [], hints: [], ...copy(STEP_DEFAULTS), order: 1 }
const sd = ref<StepDraft>(copy(EMPTY_STEP))
const sdTitle = ref('')
const sdInvalid = ref(false)
const sdHost = ref({ process: '', overlay: false })
const hostSteps = computed(() => (sdHost.value.overlay ? od.value.steps : m.processes.value.find(x => x.id === sdHost.value.process)?.steps ?? []))
const hostTitle = computed(() => (sdHost.value.overlay ? od.value.title : m.processes.value.find(x => x.id === sdHost.value.process)?.title ?? ''))
function openStep(processId: string, stepId: string, overlay = false, section = '') {
  if (!overlay && !m.canEdit()) return
  sdHost.value = { process: processId, overlay }
  const steps = hostSteps.value
  const k = steps.findIndex(x => x.id === stepId)
  const st = steps[k]
  sd.value = st ? { ...copy(st), order: k + 1 } : { ...copy(EMPTY_STEP), order: steps.length + 1 }
  sdTitle.value = st?.title ?? ''
  sdInvalid.value = false
  m.openSide('step')
  if (section) focusStepSection(section)
}
/** «Настроить нейросети» в строке шага — сайд шага с секцией «Нейросети» в окне и фокусом на первом флажке. */
function focusStepSection(section: string) {
  nextTick(() => setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-side=step] [data-step-section=${section}]`)
    el?.scrollIntoView({ block: 'start' })
    el?.querySelector<HTMLElement>('[data-slot=choice-control]:not(:disabled)')?.focus({ preventScroll: true })
  }, 80))
}
/** Сайд шага открыт и под каталогом фото-подсказок поверх него (стек «шаг → каталог», такт 87). */
const stepOpen = stacked('step')
const stepOrderMax = computed(() => hostSteps.value.length + (sd.value.id ? 0 : 1))
/** Раздел «Фото-подсказки» сайда шага — такт 87, Ш-2: «Загрузить» — свой файл в черновик сайда, крестик миниатюры — убрать. */
function uploadSideHint() { sd.value.hints.push(...m.newUploads(sd.value.hints, 1)) }
function removeSideHint(id: string) { sd.value.hints = sd.value.hints.filter(h => h.id !== id) }
function toggleNetwork(name: string) {
  const list = sd.value.networks
  sd.value.networks = list.includes(name) ? list.filter(x => x !== name) : [...list, name]
}
/** Связи шага: поля формы — «Группа · Поле»; словарь комментариев шага — свой либо как в схеме. */
const fieldLinkItems = computed(() => m.shown.value.form.groups.flatMap(g => g.fields.map(x => ({ value: x.id, label: `${g.title} · ${x.title}` }))))
const stepComments = computed(() => [
  { value: 'scheme', label: `Как в схеме — ${COMMENT_DICTIONARIES.find(d => d.value === general.value.dictionaries.comments)?.label ?? ''}` },
  ...COMMENT_DICTIONARIES.map(({ value, label }) => ({ value, label })),
])
const sdComments = computed<string>({ get: () => sd.value.comments || 'scheme', set: (v) => { sd.value.comments = v === 'scheme' ? '' : v } })
function saveStepSide() {
  const error = m.stepError(sd.value)
  sdInvalid.value = !!error
  if (sdHost.value.overlay) {
    if (error) { m.notify(error, 'err'); return }
    od.value.steps = m.placeStep(od.value.steps, sd.value)
    m.closeSurface()
    return
  }
  if (m.saveStep(sdHost.value.process, sd.value)) m.closeSurface()
}

/** Сайд «Нейросети выбранных шагов» — «Настроить нейросети» панели массовых действий: флажки трёх состояний, как флаги. */
const nd = ref<Record<string, NetworkState>>({})
function openNetworks() {
  if (!m.canEdit()) return
  nd.value = Object.fromEntries(NETWORKS.filter(x => !x.denied).map(x => [x.value, m.networkState(x.value)]))
  m.openSide('networks')
}
const networksOpen = sideSurface('networks')
/** Из «все» — снять у выбранных, иначе (часть, нет) — поставить всем. */
function cycleNetwork(name: string) { nd.value[name] = nd.value[name] === 'all' ? 'none' : 'all' }
function saveNetworksSide() {
  m.bulkNetworks(nd.value)
  m.closeSurface()
}

/*
 * Второй слой поверх первого (просмотр над каталогом, каталог над сайдом шага, сайд шага над оверлеем) оснастка открывает после
 * монтирования: два окна, открытые сразу при загрузке, дают предупреждение браузера «Blocked aria-hidden» — фокус первого окна
 * остаётся под `aria-hidden` второго. Нажатиями этого нет: окно поверх открывается, когда фокус уже в нижнем (такты 87, 88).
 */
const afterMount = (fn: () => void) => onMounted(() => { setTimeout(fn, 120) })

/* Оснастка приёмки (такт 71): сайды процесса и шага, нейросети выбранных шагов, оверлей. */
{
  const procs = m.processes.value
  if (q('open') === 'process') openProcess(procs.some(x => x.id === q('process')) ? q('process') : (procs[0]?.id ?? ''))
  if (q('open') === 'new-process') openProcess('')
  if (q('open') === 'step') {
    const owner = procs.find(x => x.steps.some(st => st.id === q('step'))) ?? procs.find(x => x.steps.length)
    if (owner) openStep(owner.id, owner.steps.some(st => st.id === q('step')) ? q('step') : owner.steps[0]!.id)
  }
  if (q('open') === 'new-step' && procs[0]) openStep(procs[0].id, '')
  if (q('open') === 'networks') {
    if (!m.ui.selectedSteps.length) m.ui.selectedSteps.push('s-vin-glass', 's-vin-metal')
    openNetworks()
  }
  const repeatable = procs.find(x => x.repeatable)
  if (['overlay', 'overlay-filled', 'overlay-step'].includes(q('open')) && repeatable) {
    openOverlay(repeatable.id)
    if (q('open') === 'overlay-filled') {
      od.value.steps = m.placeStep([], { ...copy(EMPTY_STEP), title: 'Повреждение — общий план', description: 'Снимите повреждённую деталь целиком с расстояния 1–2 метра', method: '2–7 фото', networks: ['Оценка повреждений'], required: true, order: 1 })
    }
    /* Такт 88 (решение 1 оркестратора): сайд шага поверх оверлея — после монтирования, как каталог над сайдом шага. */
    if (q('open') === 'overlay-step') afterMount(() => openStep(repeatable.id, '', true))
  }
}

/* Оснастка приёмки (такт 87): каталог из ячейки и поверх сайда шага, запрос, категория и выбор, просмотр крупно, заливка. */
{
  const procs = m.processes.value
  const ownerOf = (id: string) => procs.find(x => x.steps.some(st => st.id === id))
  const stepAt = (fallback: string) => (ownerOf(q('step')) ? q('step') : fallback)
  const tune = () => {
    if (q('catq')) cat.value.query = q('catq')
    if (['all', ...HINT_CATEGORIES.map(c => c.id)].includes(q('category'))) cat.value.category = q('category') as HintCategoryFilter
    if (q('picked')) cat.value.picked = q('picked').split(',').filter(id => !!catalogHint(id))
  }
  /* Второй слой поверх первого — после монтирования (`afterMount`). */
  const later = afterMount
  if (q('open') === 'catalog' || q('open') === 'catalog-view') {
    const id = stepAt('s-vin-metal')
    const owner = ownerOf(id)
    if (owner) { openCatalog('cell', owner.id, id); tune() }
    if (q('open') === 'catalog-view') later(() => { if (catalogItems.value[0]) viewCatalog(catalogItems.value[0].id) })
  }
  if (q('open') === 'step-catalog') {
    const id = stepAt('s-front')
    const owner = ownerOf(id)
    if (owner) { openStep(owner.id, id); later(() => { openCatalog('side'); tune() }) }
  }
  if (q('open') === 'fill' || q('open') === 'fill-catalog') {
    openFill(m.ui.selectedSteps)
    if (q('fill') === 'all') fill.value.all = true
    if (q('open') === 'fill-catalog') {
      const row = fillRowsNow.value.find(r => r.stepId === (q('row') || 's-right'))
      if (row) { openCatalog('fill', row.processId, row.stepId); tune() }
    }
  }
  if (q('open') === 'hint-view') {
    const id = stepAt('s-front')
    viewHints(ownerOf(id)?.steps.find(st => st.id === id)?.hints ?? [], 0)
  }
}

/*
 * Оснастка приёмки (такт 88): сайд вставки из другой схемы — уровни, запрос, выбор, процесс-цель; оверлей с разделом
 * «Тексты в приложении» — тип объекта, заполненные тексты, поповер «Все варианты».
 */
{
  if (q('open') === 'paste-fields' || q('open') === 'paste-steps') {
    const kind: PasteKind = q('open') === 'paste-fields' ? 'fields' : 'steps'
    openPaste(kind)
    const d = m.donorById(q('donor'))
    const parts = kind === 'fields' ? d?.groups : d?.processes
    const part = parts?.find(x => x.id === q('part'))
    const rows = part ? ('fields' in part ? part.fields.map(f => f.id) : part.steps.map(st => st.id)) : []
    paste.value.query = q('pasteq')
    if (d) paste.value.scheme = d.id
    if (part) paste.value.part = part.id
    if (q('pick')) paste.value.picked = q('pick').split(',').filter(id => rows.includes(id))
    if (m.pasteTargets.value.some(p => p.id === q('target'))) paste.value.target = q('target')
  }
  const repeatable = m.processes.value.find(x => x.repeatable)
  if ((q('open') === 'overlay-texts' || q('open') === 'overlay-variants') && repeatable) {
    openOverlay(repeatable.id)
    if (OBJECT_TYPES.some(t => t.value === q('otype'))) od.value.objectType = q('otype')
    if (q('texts') === 'filled') od.value.texts = fillRepeatTexts(od.value.texts, od.value.objectType).texts
    afterMount(() => {
      document.querySelector('[data-overlay-texts]')?.scrollIntoView({ block: 'start' })
      if (q('open') === 'overlay-variants') openVariants('item', true)
    })
  }
}

/* ------------------------------ модель готовности — такт 91 ------------------------------ */
/**
 * Мягкая этапность (`docs/scheme-edit-review.md`, 5.4–5.5; решения 4–5 оркестратора 2026-10-08): модель считает этапы и проверки
 * (`readiness.ts`), страница переводит их в пропы семейства `Readiness`. Режим создания — ни одной публикации; в просмотре
 * версии модели нет.
 */
const R = computed(() => m.readiness.value)
const creatingNow = computed(() => m.creating.value && !ro.value)
/** Маркер этапа: замок; блокирующие — число по всем замечаниям этапа; предупреждения — число; иначе готово либо не готово. */
function stageMark(st: Stage): { state: ReadinessMarkState, count: number } {
  if (st.locked) return { state: 'locked', count: 0 }
  /*
   * «Проверка и публикация» своих проверок не несёт: её маркер — блокирующие всей схемы. Такт 92 (решение 1а): этап засчитывается
   * публикацией — до неё без блокирующих «Готово к публикации» (`ready`, без галочки выполненного).
   */
  if (st.id === 'publish') return R.value.blocks ? { state: 'blocked', count: R.value.blocks } : { state: st.done ? 'done' : 'ready', count: 0 }
  const blocks = st.checks.filter(c => c.level === 'block').length
  const warns = st.checks.filter(c => c.level === 'warn').length
  if (blocks) return { state: 'blocked', count: blocks + warns }
  if (warns) return { state: 'warning', count: warns }
  return { state: st.done ? 'done' : 'todo', count: 0 }
}
const mainStages = computed(() => R.value.stages.filter(st => !st.after))
const stripStages = computed<ReadinessStageItem[]>(() => mainStages.value.map(st => ({ id: st.id, label: st.label, ...stageMark(st), reason: st.locked })))
const stripTitle = computed(() => `Подготовка схемы: ${R.value.done} из ${R.value.total}`)
const nextLabel = (st: Stage | null) => (!st ? '' : st.id === 'publish' ? 'Проверить и опубликовать' : `Далее: ${st.label} →`)
/** Строки поповера и окна первой публикации: этапы с проверками; «Правила» — с ручной отметкой. */
function stageGroups(inPublish = false): ReadinessGroupItem[] {
  return R.value.stages.map(st => ({
    id: st.id, title: st.after ? `${st.label} — после публикации` : st.label, ...stageMark(st),
    meta: st.locked || st.meta,
    action: st.locked ? '' : st.id === 'publish' ? (inPublish ? '' : 'Проверить и опубликовать') : 'Перейти',
    /* Ручная отметка «Правил» — флажок группы: задача «Проверьте унаследованное» в строках не повторяется. */
    checks: st.checks.filter(c => c.key !== 'rules-check').map(c => ({ key: c.key, level: c.level, text: c.text, area: c.area, action: c.level === 'todo' ? 'Перейти' : 'Исправить' })),
    manual: st.id === 'rules' ? { label: RULES_LABEL, checked: m.draft.rulesChecked } : undefined,
  }))
}
/** Проверки по областям — чип «Проверка: N» и проверки над диффом после публикации; задачи этапов сюда не идут. */
const AREAS: { tab: TabId, title: string }[] = [{ tab: 'settings', title: 'Настройки' }, { tab: 'form', title: 'Форма' }, { tab: 'processes', title: 'Процессы и шаги' }, { tab: 'showcase', title: 'Витрина' }]
const checkGroups = computed<ReadinessGroupItem[]>(() => AREAS.map((a) => {
  const list = R.value.checks.filter(c => c.level !== 'todo' && c.place.tab === a.tab)
  const blocks = list.filter(c => c.level === 'block').length
  return { id: a.tab, title: a.title, state: (blocks ? 'blocked' : 'warning') as ReadinessMarkState, count: list.length,
    checks: list.map(c => ({ key: c.key, level: c.level, text: c.text, area: c.area, action: 'Исправить' })) }
}).filter(g => g.checks.length))
const issues = computed(() => R.value.blocks + R.value.warns)
/** Чип у «Опубликовать схему»: в режиме создания — всегда; после публикации — при замечаниях. */
const chip = computed(() => {
  const r = R.value
  if (m.creating.value) {
    /* Такт 92 (решение 1а): этапы 1–4 готовы, блокирующих и предупреждений нет — «Готово к публикации», без галочки выполненного. */
    const prepared = r.stages.filter(st => !st.after && st.id !== 'publish').every(st => st.done)
    const state: ReadinessMarkState | '' = r.blocks ? 'blocked' : r.warns ? 'warning' : prepared ? 'ready' : ''
    const tail = [r.blocks ? `блокирует публикацию: ${r.blocks}` : 'блокирующих нет', r.warns ? `предупреждений: ${r.warns}` : ''].filter(Boolean).join(' · ')
    return { label: `Готовность ${r.done} из ${r.total}`, markAfter: false, state, count: r.blocks || r.warns, title: 'Готовность к публикации', summary: `${r.done} из ${r.total} этапов · ${tail}` }
  }
  if (!issues.value) return null
  return { label: 'Проверка:', markAfter: true, state: (r.blocks ? 'blocked' : 'warning') as ReadinessMarkState, count: issues.value, title: 'Проверка перед публикацией',
    summary: [r.blocks ? `Блокирует публикацию: ${r.blocks}` : 'Блокирующих нет', r.warns ? `предупреждений: ${r.warns}` : ''].filter(Boolean).join(' · ') }
})
const readinessOpen = ref(false)
if (q('open') === 'readiness') onMounted(() => { setTimeout(() => { readinessOpen.value = true }, 120) })
/** «Исправить» и «Перейти»: поповер закрывается, модель ведёт к месту (окно публикации закрывает сама). */
function fixFrom(key: string) {
  readinessOpen.value = false
  m.fixCheck(key)
}
function goStageFrom(id: string) {
  readinessOpen.value = false
  m.goStage(id as StageId)
}
function manualFrom(_id: string, on: boolean) { m.setRulesChecked(on) }
/** Причина выключенной «Опубликовать» — в подвале окна полным контрастом. */
const publishNote = computed(() => (m.blocked.value
  ? `Публикация невозможна: исправьте блокирующие проверки — ${R.value.blocks}`
  : 'После публикации создаётся неизменяемый снимок версии'))

/* Полоса подготовки свёрнута — память сессии вкладки (решение 5); хранилище бывает закрыто — чтение и запись в `try`. */
const STRIP_KEY = 'scheme-edit:readiness-strip'
function setStrip(collapsed: boolean) {
  m.setStrip(collapsed)
  try { sessionStorage.setItem(STRIP_KEY, collapsed ? 'collapsed' : 'open') } catch {}
}
onMounted(() => {
  if (q('strip')) return
  try { if (sessionStorage.getItem(STRIP_KEY) === 'collapsed') m.setStrip(true) } catch {}
})

/* «Сделать копию» — окно «Новая схема осмотра» на шаге «Основа»; «Создать схему» — набор копии и переход в режим создания. */
const copyOpen = surface('copy')
function createCopy(e: { from: CreateFrom, basics: CreateBasics }) {
  setHandoff({ dataset: createdDataset(e.from, e.basics, { author: 'Анна Смирнова', editedAt: q('now') || new Date().toISOString() }), notice: createdNotice(e.from, e.basics.name.trim()) })
  m.closeSurface()
  navigateTo({ path: '/scheme-edit', query: { data: 'created', from: 'copy', ...(q('now') ? { now: q('now') } : {}) } })
}

/*
 * Оснастка приёмки (такт 89): настройки приложения в черновике, демо-осмотр — экран, режим, обведённый элемент; открытый «?».
 * `?app=full` — отказ разрешён (и от повторяемых), промежуточный экран, телефон поддержки; `?app=checklist` — то же и режим
 * «Чек-лист».
 */
const HELP_KEYS: HelpKey[] = ['refuse', 'confirmHint', 'confirmCheckbox', 'mobileMode', 'phone', 'startAfterCreate', 'forbidExtraFiles']
const HELP_MOBILE: HelpKey[] = ['mobileMode', 'phone', 'startAfterCreate']
{
  if (q('app') === 'full' || q('app') === 'checklist') {
    const s = m.draft.config.settings
    s.general.behavior.refuse = true
    s.general.behavior.refuseRepeatable = true
    s.mobile.startAfterCreate = false
    s.mobile.phone = '+7 800 000-00-00'
    s.mobile.phoneName = 'Служба поддержки'
    s.mobile.callConfirm = 'Позвонить в службу поддержки осмотров?'
    if (q('app') === 'checklist') s.mobile.mode = 'checklist'
  }
  if (q('open') === 'demo') {
    m.openDemo(q('screen'), q('mark') ? q('mark').split(',') : [])
    if (q('demo') === 'map') m.setDemoMode('map')
  }
  const key = q('help')
  const reveal = () => document.querySelector(`[data-help="${key}"]`)?.scrollIntoView({ block: 'center', behavior: 'instant' })
  if ((HELP_KEYS as string[]).includes(key)) {
    if (HELP_MOBILE.includes(key as HelpKey)) m.setSection('mobile')
    afterMount(() => { reveal(); helpOpen.value = key })
  }
  else if (key.startsWith('field:')) {
    const grp = m.formGroups.value.find(g => g.fields.some(f => f.id === key.slice(6)))
    if (grp) {
      m.setTab('form')
      m.selectGroup(grp.id)
      afterMount(() => { reveal(); helpOpen.value = key })
    }
  }
}

/* Оснастка приёмки (такт 90): превью публичной страницы — устройство и вид. */
if (q('open') === 'site') {
  m.openSite()
  if (q('device') === 'phone') m.setSiteDevice('phone')
  if (q('site') === 'card') m.setSiteView('card')
}

/* ------------------------------ «Витрина» — П8, такт 72 ------------------------------ */
const sc = computed(() => m.showcase.value)
/** Статус карточки — тон плашки: требует оформления — предупреждение, черновик — нейтральный, опубликована — успех. */
const CARD_TONE = { needs: 'warning', draft: 'neutral', published: 'success' } as const
const cardText = computed(() => {
  if (m.showcaseReason.value) return 'Схема ещё не опубликована в ядре — витрина станет доступна после'
  if (sc.value.status === 'published') return 'Карточка на витрине. Правка карточки вернёт её в черновик — опубликуйте снова'
  if (sc.value.status === 'needs') return 'Схема опубликована — оформите карточку и опубликуйте её на витрине'
  return 'Карточка появится на витрине после публикации'
})
/** Цена «от» — целое число; прочие знаки отбрасываются, пустое поле — цены нет (необязательное поле). */
function setPrice(text: string) {
  const digits = String(text).replace(/\D/g, '')
  m.setShowcase('priceFrom', digits ? Number(digits) : null)
}
/**
 * Источник цены «от» — такт 90 (ревью 4.7; решение 3 оркестратора 2026-10-08): радио-карточки «Из тарифа» (по умолчанию),
 * «Указать вручную», «Не показывать». Из тарифа — нижняя граница цены для не клиента и «Открыть тарификацию»; вручную — поле,
 * ниже тарифа — предупреждение под полем.
 */
const priceSource = computed<string>({ get: () => sc.value.priceSource, set: v => m.setPriceSource(v as PriceSource) })
const price = computed(() => m.price.value)
/** Пояснение цены из тарифа: период и схема тарификации; схемы нет — причина. */
const tariffNote = computed(() => {
  const t = price.value.tariff
  return t ? `${tariffPeriodText(t)} · «${t.scheme.name}», ${t.group.name}` : 'схемы нет в тарификации'
})
const tariffLink = computed(() => {
  const t = price.value.tariff
  return tariffsHref(t ? { company: t.company, group: t.group.id, scheme: t.scheme.id } : null)
})

/* ---------- превью публичной страницы — такт 90, ревью 4.8 ---------- */
/**
 * «Предпросмотр страницы» (решение 5): полноэкранный оверлей — «Компьютер / Телефон», «Страница сценария / Карточка в каталоге»,
 * над рамкой статус карточки и будущий адрес; метка «Не заполнено» закрывает оверлей и ставит фокус в поле таба.
 */
const siteOpen = surface('site')
const siteDevice = computed<string>({ get: () => m.ui.site.device, set: v => m.setSiteDevice(v === 'phone' ? 'phone' : 'desktop') })
const siteView = computed<string>({ get: () => m.ui.site.view, set: v => m.setSiteView(v === 'card' ? 'card' : 'page') })
/** Статус карточки — тон метки, как у плашки статуса (строка 154). */
const SITE_STATUS_BADGE = { needs: 'warning', draft: 'neutral', published: 'success' } as const
const siteSubtitle = computed(() => {
  const by = ro.value ? `По версии от ${m.history.value.find(v => v.id === m.ui.viewing)?.date ?? ''}` : 'По черновику'
  return `${by} · вид сайта условный: дизайн-системы сайта в репо нет`
})
/** Будущий адрес страницы; у опубликованной карточки — адрес страницы. Без продающего названия адреса нет. */
const siteAddress = computed(() => {
  const s = m.site.value
  if (!s.address) return 'Адрес страницы появится с продающим названием'
  return `${s.status === 'published' ? 'Адрес страницы' : 'Будущий адрес'}: https://${s.address}`
})
const siteGaps = computed(() => {
  const list = m.site.value.gapList
  return list.length ? `Не заполнено: ${list.map(g => g.label).join(', ')}` : 'Все поля витрины заполнены'
})
/** Адрес в рамке: страница сценария либо каталог. */
const siteUrl = computed(() => (m.ui.site.view === 'card' ? SITE_CATALOG : m.site.value.address || `${SITE_CATALOG}/…`))

/** Сферы применения — в пределах выбранной индустрии (каскад тегов). */
const sphereItems = computed(() => SPHERES.filter(x => x.industry === sc.value.industry).map(({ value, label }) => ({ value, label })))
const objectItems = computed(() => [{ value: general.value.schemeType, label: SHOWCASE_OBJECTS[general.value.schemeType] ?? schemeTypeLabel.value }])

/* ------------------------------ плашка «Сохранение теперь автоматическое» — № 67 ------------------------------ */
/**
 * Одноразовая ориентация (аудит, «Смена парадигмы»): закрытая плашка не возвращается. На стенде закрытие помнится в
 * пределах сессии вкладки — `sessionStorage` (решение 5 оркестратора такта 72); хранилище бывает закрыто — чтение и запись
 * в `try`. Оснастка `?hint=off` закрывает плашку при загрузке.
 */
const HINT_KEY = 'scheme-edit:autosave-hint'
function closeHint() {
  m.closeHint()
  try { sessionStorage.setItem(HINT_KEY, 'closed') } catch {}
}
if (q('hint') === 'off') m.closeHint()
onMounted(() => {
  try { if (sessionStorage.getItem(HINT_KEY) === 'closed') m.closeHint() } catch {}
})

/* ------------------------------ раскладка «Настроек» и сайды — такт 101 ------------------------------ */
/**
 * Решения владельца 2026-10-09 (доска `scheme-edit-wide-v4`): **L2** — навигатор «Настроек» у левого края рабочей зоны, колонка 846
 * за ним, левый край не двигается; **S1** — сайды страницы немодальные: слотом справа, когда рядом с раскладкой помещаются, иначе
 * слоем у правого края; страница под сайдом работает. Довесок 1: ширина сайда тянется ручкой (480 — половина окна), помнится в
 * сессии вкладки и общая для всех сайдов; слот или слой — по текущей ширине.
 *
 * Слот помещается, когда справа от раскладки «Настроек» (`--container-settings-group` 1136 от левого поля рабочей зоны) остаётся
 * ширина сайда и поле 16: при развёрнутом меню 256 + 16 + 1136 + 16 + 642 = 2066 (сайд 480 — 1904). Порог один на все табы.
 * Узкий экран (уже 768) — сайды как прежде: модальные во всё окно. Сайд поверх полноэкранного слоя (шаг в оверлее процесса) —
 * слой: страница под оверлеем не видна, место ей не уступается.
 */
/** Оснастка приёмки — `?variant=l1-compact` · `l1-rail`: варианты L1 для живой проверки владельцем; по умолчанию — L2. */
const VARIANT: '' | 'l1-compact' | 'l1-rail' = q('variant') === 'l1-compact' || q('variant') === 'l1-rail' ? q('variant') as 'l1-compact' | 'l1-rail' : ''
const l1 = VARIANT !== ''
const SIDE_KEY = 'scheme-edit:side-width'
/** Ширина сайдов страницы — ручка `ModalCardContent resizable`; не задана — 642. */
const sideWidth = ref<number | undefined>(undefined)
onMounted(() => {
  try {
    const v = Number(sessionStorage.getItem(SIDE_KEY))
    if (v > 0) sideWidth.value = v
  } catch {}
})
watch(sideWidth, (v) => {
  if (!v) return
  try { sessionStorage.setItem(SIDE_KEY, String(v)) } catch {}
})
/** Числа раскладки — токены `tailwind.css`; меряются после монтирования, при смене ширины окна и меню. */
const layout = ref({ room: 0, edge: 642, min: 480, viewport: 0, navRight: 0 })
function cssPx(name: string, fallback: number) {
  const v = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
  return Number.isFinite(v) && v > 0 ? v : fallback
}
function measureLayout() {
  const main = document.querySelector('main')
  const left = main?.getBoundingClientRect().left ?? 0
  const px = cssPx('--spacing-page-x', 16)
  const nav = document.querySelector('[data-settings-nav]')?.getBoundingClientRect()
  layout.value = {
    room: window.innerWidth - left - px - cssPx('--container-settings-group', 1136) - px,
    edge: cssPx('--container-modal-edge', 642),
    min: cssPx('--container-modal-edge-min', 480),
    viewport: window.innerWidth,
    navRight: nav?.width ? nav.right : 0,
  }
}
/** Ширина сайда на экране — те же пределы, что у ручки: не уже 480, не шире половины окна. */
const sideShown = computed(() => {
  const { edge, min, viewport } = layout.value
  const max = Math.max(min, Math.floor(viewport / 2))
  return Math.round(Math.min(max, Math.max(min, sideWidth.value ?? edge)))
})
const sideDock = computed<ModalCardDock | undefined>(() => {
  if (phone.value || !layout.value.viewport) return undefined
  if (m.ui.surfaces.some(x => x.kind === 'overlay')) return 'layer'
  return layout.value.room >= sideShown.value ? 'slot' : 'layer'
})
/** Открыт сайд страницы. */
const sideOpenAny = computed(() => m.ui.surfaces.some(x => x.kind === 'side'))
/**
 * L1: навигатор справа от колонки уходит под сайд-слой — тогда он сворачивается: `l1-compact` — выбор раздела списком над
 * колонкой (часть узкого экрана, такт 92), `l1-rail` — рейка у левого края сайда. Место навигатора держится (`invisible`):
 * колонка не двигается.
 */
const navCovered = computed(() => l1 && !phone.value && sideOpenAny.value && sideDock.value === 'layer'
  && layout.value.navRight > layout.value.viewport - sideShown.value)
/** Глиф раздела рейки — из лежащих в `icons.ts`; новых не скачивалось. */
const RAIL_ICON: Record<SectionId, IconName> = {
  general: 'settings',
  mobile: 'photo-camera',
  web: 'monitoring',
  access: 'lock',
  ai: 'auto-awesome',
  anomalies: 'warning',
  pdf: 'article',
}
const RAIL_TONE: Record<SectionStatus, 'success' | 'neutral' | 'warning' | undefined> = { none: undefined, on: 'success', off: 'neutral', attention: 'warning' }
let layoutObserver: ResizeObserver | null = null
onMounted(() => {
  measureLayout()
  window.addEventListener('resize', measureLayout)
  const main = document.querySelector('main')
  if (main) {
    layoutObserver = new ResizeObserver(() => measureLayout())
    layoutObserver.observe(main)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureLayout)
  layoutObserver?.disconnect()
})
/* Навигатор L1 меряется заново, когда открывается сайд и меняется его ширина: слот сдвигает группу к центру оставшейся ширины. */
watch([sideOpenAny, sideShown, sideDock, () => m.ui.tab], () => {
  if (import.meta.client) nextTick(() => measureLayout())
})
/** Сетка карточек сайда (довесок 1): уже 560 — одна колонка, от 560 — две, от 900 — три. */
const sideCols = computed(() => (sideShown.value < 560 ? 'grid-cols-1' : sideShown.value < 900 ? 'grid-cols-2' : 'grid-cols-3'))

/* ------------------------------ уведомления над подвалом окна — такт 88 ------------------------------ */
/**
 * Угол уведомлений — справа внизу, там же кнопки подвала сайда и оверлея. Уведомление с «Отменить» у «Заполнить по типу
 * объекта» и отказы сайдов приходят при открытом окне и закрывали бы «Сохранить» на 3–6 с. Уведомления поднимаются над
 * кнопками подвала, которые лежат под их углом (прецедент — над панелью выделения «Свободной съёмки», такт 55); окно по центру
 * угла не касается — место прежнее. Строка 224 реестра расхождений.
 */
const toastBottom = ref<string | undefined>(undefined)
/** Отступ угла и ширина уведомления — `Toaster` (`right-6`, `w-90`). */
const TOAST_ZONE = 24 + 360
function placeToasts() {
  const tops = [...document.querySelectorAll('[data-slot=modal-card-actions]')]
    .filter(x => x.closest('[data-slot=modal-card]')?.getAttribute('data-state') !== 'closed').map(x => x.getBoundingClientRect())
    .filter(r => r.width > 0 && r.right > window.innerWidth - TOAST_ZONE).map(r => r.top)
  /* Узкий экран (такт 92): без открытого окна уведомления — над нижней полосой «Опубликовать схему». */
  if (!tops.length && phone.value) {
    const dock = document.querySelector('[data-dock]')?.getBoundingClientRect()
    if (dock?.width) tops.push(dock.top)
  }
  toastBottom.value = tops.length ? `${Math.round(window.innerHeight - Math.min(...tops)) + 12}px` : undefined
}
watch([() => m.ui.surfaces.length, () => m.notices.length, phone], () => {
  if (import.meta.client) nextTick(() => setTimeout(placeToasts, 0))
})

if (import.meta.client) {
  /* Прогону — состояние модели для сравнения «до / после»; оснастка приёмки. */
  ;(window as unknown as { __scheme: unknown }).__scheme = m
}
</script>

<template>
  <div
    data-scheme-edit
    :data-tab="m.ui.tab"
    :data-section="m.ui.section"
    :data-anchor="m.ui.anchor"
    :data-save="m.save.state"
    :data-publish="m.publishState.value"
    :data-surface="m.topSurface.value?.id ?? ''"
    :data-viewing="m.ui.viewing"
    :data-phone="phone || undefined"
  >
    <!--
      Такт 92 — узкий экран (ревью 4.10, решение 5 оркестратора 2026-10-08): чип готовности и меню «⋯» — одна разметка на два места.
      Рабочий стол — в строке шапки; узкий экран — чип в строке статусов, «⋯» — в нижней полосе рядом с «Опубликовать схему».
    -->
    <DefineChip>
      <!--
        Чип модели готовности — такт 91 (5.5): в режиме создания «Готовность N из 5» с этапами и проверками; после публикации —
        «Проверка: N» только при замечаниях. «Исправить» ведёт к месту тем же переходом, что поиск.
      -->
      <ReadinessChip
        v-if="chip"
        v-model:open="readinessOpen"
        :label="chip.label"
        :state="chip.state"
        :count="chip.count"
        :mark-after="chip.markAfter"
        :title="chip.title"
        :summary="chip.summary"
        data-act="readiness"
      >
        <ReadinessList :groups="m.creating.value ? stageGroups() : checkGroups" data-readiness-list @go="goStageFrom" @fix="fixFrom" @manual="manualFrom" />
        <template v-if="m.creating.value && m.ui.stripCollapsed" #footer>
          <ButtonAction size="sm" :show-icon="false" data-act="strip-expand" @click="setStrip(false); readinessOpen = false">
            Показать полосу подготовки
          </ButtonAction>
        </template>
      </ReadinessChip>
    </DefineChip>
    <DefineMenu>
      <!-- Меню «⋯» — № 8: список действий в поповере, удаление — отдельной группой. -->
      <Popover v-model:open="menuOpen">
        <PopoverTrigger as-child>
          <IconButton variant="secondary" size="lg" label="Действия со схемой" data-act="menu">
            <Icon name="more" :size="20" />
          </IconButton>
        </PopoverTrigger>
        <PopoverContent data-menu="scheme" align="end" :side-offset="4" class="p-1">
          <!-- Такт 92 (решение 5): на узком экране «Предпросмотр» и «История версий» уходят из шапки в «⋯». -->
          <SelectGroup v-if="phone">
            <SelectItem data-action="preview" @click="pickPhone('preview')">
              Предпросмотр
            </SelectItem>
            <SelectItem v-if="m.current.value" data-action="history" @click="pickPhone('history')">
              История версий
            </SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectItem v-for="a in MENU" :key="a.key" :data-action="a.key" @click="pickMenu(a.key)">
              {{ a.label }}
            </SelectItem>
          </SelectGroup>
          <SelectGroup data-section="danger">
            <!-- К-4 (такт 91): удаление — тоном опасного действия. -->
            <SelectItem tone="destructive" data-action="delete" @click="pickMenu('delete')">
              Удалить схему
            </SelectItem>
          </SelectGroup>
        </PopoverContent>
      </Popover>
    </DefineMenu>

    <DefineStepCard v-slot="{ st, k, overlay, edit, remove }">
      <Card size="sm" class="flex items-start gap-3" :data-step-row="overlay ? undefined : st.id" :data-overlay-step="overlay ? st.id : undefined">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <TableCellIdentity>
            {{ k + 1 }}. {{ st.title }}
            <template v-if="st.description" #description>
              {{ st.description }}
            </template>
          </TableCellIdentity>
          <div class="flex flex-wrap items-center gap-2">
            <Chip variant="neutral">
              {{ kindLabel(st.kind) }}
            </Chip>
            <template v-for="x in STEP_FLAGS" :key="x.key">
              <Badge v-if="st[x.key]" size="sm" :variant="x.key === 'required' ? 'default' : 'neutral'" :data-badge="x.key">
                {{ x.label }}
              </Badge>
            </template>
          </div>
          <ToolbarText data-step-meta>
            {{ st.method }} · {{ st.networks.length ? `нейросети: ${st.networks.join(', ')}` : 'нейросети не выбраны' }}
          </ToolbarText>
          <div v-if="!overlay" class="flex flex-wrap items-center gap-2" :data-step-hints="st.hints.length">
            <Badge size="sm" :variant="st.hints.length ? 'success' : 'warning'" data-hint-status>
              {{ hintStatus(st.hints.length) }}
            </Badge>
            <ThumbStrip v-if="st.hints.length" :items="thumbs(st.hints)" :label="`Фото-подсказки шага «${st.title}»`" :data-hint-thumbs="st.id" @open="viewHints(st.hints, $event)" />
          </div>
        </div>
        <Popover :open="cardMenu === `step:${st.id}`" @update:open="cardMenu = $event ? `step:${st.id}` : ''">
          <PopoverTrigger as-child>
            <IconButton :inert="ro" variant="service" size="lg" :label="`Действия с шагом «${st.title}»`" data-act="card-menu">
              <Icon name="more" :size="20" />
            </IconButton>
          </PopoverTrigger>
          <PopoverContent data-menu="card" align="end" :side-offset="4" class="p-1">
            <SelectGroup>
              <SelectItem data-action="edit" @click="cardAct(edit)">
                Изменить шаг
              </SelectItem>
            </SelectGroup>
            <SelectGroup data-section="danger">
              <SelectItem tone="destructive" data-action="delete" @click="cardAct(remove)">
                Удалить шаг
              </SelectItem>
            </SelectGroup>
          </PopoverContent>
        </Popover>
      </Card>
    </DefineStepCard>

    <NuxtLayout name="admin">
      <!--
        Плашка «Сохранение теперь автоматическое» — № 67, баннер-ухо страницы (такт 96, решение владельца 2026-10-09): слот `banner`
        каркаса — первой строкой над «Назад», тон мягкого предупреждения (`Callout warning`); уходит с прокруткой. Одноразовая
        ориентация: закрытая не возвращается (аудит, «Смена парадигмы»; строка 167).
      -->
      <!-- Такт 101: сайд-слот справа — плашка уступает ему место, как вся страница (`pr-modal-slot`). -->
      <template v-if="!ro && !m.ui.hintClosed" #banner>
        <div class="flex flex-col pr-modal-slot">
          <Callout tone="warning" icon="info" closable data-autosave-hint @close="closeHint()">
            Сохранение теперь автоматическое. В боевые осмотры изменения попадают по кнопке «Опубликовать схему»
          </Callout>
        </div>
      </template>
      <!-- «Назад» — слот `back` каркаса (такт 96): до заголовка 12 держит каркас. -->
      <template #back>
        <ButtonNavigation size="base" direction="left" data-act="back" @click="m.back()">
          Назад
        </ButtonNavigation>
      </template>

    <!-- Такт 101: сайд-слот справа (S1) — страница уступает ему место, колонка «Настроек» не двигается (L2). -->
    <div class="flex min-w-0 flex-col gap-6 pr-modal-slot max-md:pb-20">

    <div class="flex flex-col gap-2">
      <!-- Узкий экран (такт 92): имя — ступень 24/28 (макет `33694:3930`), до трёх строк. -->
      <Heading :level="phone ? 'title' : 'page'" as="h1" :lines="phone ? 3 : undefined" data-scheme-title>
        {{ general.name }}
      </Heading>

      <!--
        Строка состояния и действий — одна строка высотой 44 (`scheme-edit.md`, 3.2; такт 67): слева — индикатор
        публикации, история и статус автосохранения, справа — действия. Ужимается только индикатор — многоточием,
        полный текст в подсказке; история, статус и кнопки ширину держат. Перенос строки сдвигал страницу под шапкой
        на 28 при каждой смене статуса сохранения — причина промаха клика в списке переменных (`scheme-edit.md`, 19.4).
      -->
      <!-- Узкий экран (такт 92): строка статусов переносится, действия — в нижней полосе. -->
      <div class="flex h-11 items-center gap-6 max-md:h-auto max-md:flex-wrap max-md:gap-y-2" data-header-row>
        <div class="flex min-w-0 flex-1 items-center gap-4 max-md:flex-wrap max-md:gap-y-2">
          <PublishStatus
            v-if="!ro"
            :state="m.publishState.value"
            :author="m.draft.author"
            :date="m.draftDate.value"
            :editing="m.ui.editing"
            @open="m.openPublish()"
          />
          <div class="flex shrink-0 items-center gap-4">
            <!-- С-1 (такт 91): история — после первой публикации; у схемы без публикаций входа в пустоту нет. -->
            <ButtonAction v-if="m.current.value && !phone" size="sm" :show-icon="false" data-act="history" @click="m.openHistory()">
              История версий
            </ButtonAction>
            <AppBarStatus v-if="!ro" surface="light" retryable :state="m.save.state" @retry="m.retry()" />
          </div>
          <ReuseChip v-if="phone && !ro" />
        </div>

        <!-- Просмотр прошлой версии: индикатора черновика и «Опубликовать схему» нет (r2 §2, состояние 7). -->
        <template v-if="!phone">
          <div v-if="ro" class="ml-auto flex shrink-0 items-center gap-3">
            <Button variant="outline" data-act="view-copy" @click="m.copy()">
              Сделать копию
            </Button>
            <Button data-act="view-leave" @click="m.leaveView()">
              Перейти к текущей версии
            </Button>
          </div>
          <div v-else class="ml-auto flex shrink-0 items-center gap-3">
            <Button variant="outline" show-icon data-act="preview" @click="m.preview()">
              <template #icon>
                <Icon name="visibility" :size="20" />
              </template>
              Предпросмотр
            </Button>
            <ReuseChip />
            <Button data-act="publish" @click="m.openPublish()">
              Опубликовать схему
            </Button>
            <ReuseMenu />
          </div>
        </template>
      </div>

      <Callout v-if="ro" data-viewing-banner>
        {{ m.viewingText.value }}. Настройки открыты только для чтения
      </Callout>
    </div>

    <!--
      Нижняя полоса узкого экрана — такт 92 (ревью 4.10, решение 5): «Опубликовать схему» и «⋯» прибиты к низу окна; в просмотре
      версии — «Перейти к текущей версии» и «Сделать копию». `ActionBar layout="dock"`.
    -->
    <ActionBar v-if="phone" layout="dock" :count="ro ? 'Просмотр версии' : 'Публикация схемы'" data-dock>
      <template v-if="ro">
        <Button class="min-w-0 flex-1" data-act="view-leave" @click="m.leaveView()">
          Перейти к текущей версии
        </Button>
        <IconButton variant="secondary" size="lg" label="Сделать копию" data-act="view-copy" @click="m.copy()">
          <Icon name="copy" :size="20" />
        </IconButton>
      </template>
      <template v-else>
        <Button class="min-w-0 flex-1" data-act="publish" @click="m.openPublish()">
          Опубликовать схему
        </Button>
        <ReuseMenu />
      </template>
    </ActionBar>

    <!-- Полоса подготовки — такт 91 (5.5): до первой публикации; сворачивается в чип у «Опубликовать схему». -->
    <ReadinessBar
      v-if="creatingNow && !m.ui.stripCollapsed"
      :title="stripTitle"
      :stages="stripStages"
      :current="m.currentStage.value"
      :next-label="nextLabel(R.next)"
      data-readiness-bar
      @select="m.goStage($event as StageId)"
      @next="m.goStage(R.next.id)"
      @collapse="setStrip(true)"
    />

    <!-- ============================ поиск — № 9–11, такт 86: строкой под шапкой, над табами, на всех табах ============================ -->
    <Popover :open="searchOpen">
      <PopoverAnchor as-child>
        <!-- Такт 101: поле — ширина раскладки «Настроек» L2 (навигатор, зазор, колонка — 1136): края по навигатору и колонке. -->
        <div :class="l1 ? 'mx-auto w-full max-w-settings-group' : 'max-w-settings-group'" data-search :data-find="finding || undefined">
          <div data-field="search" @keydown="onSearchKeydown" @input="onSearchInput" @focusin="onSearchFocusIn" @focusout="searchFocused = false">
            <!--
              Подсказка хоткея — внутри поля справа, слотом `end` (такт 67, строка 98): при непустом значении её место занимает крестик.
              Режим «найдено» (такт 86; 3.2, п. 14): запрос остаётся в поле, справа — счётчик «2 из 7» и стрелки ↑ ↓ (слот `trailing`).
            -->
            <Input v-model="query" :placeholder="m.ui.modified && finding ? 'Изменено в черновике' : 'Поиск по настройкам схемы'" clearable>
              <template v-if="finding" #trailing>
                <ToolbarText data-find-counter>
                  {{ m.findPos.value }} из {{ m.findHits.value.length }}
                </ToolbarText>
                <IconButton variant="service" size="sm" label="Предыдущее совпадение" data-act="find-prev" @click="m.findStep(-1)">
                  <Icon name="chevron-up" :size="16" />
                </IconButton>
                <IconButton variant="service" size="sm" label="Следующее совпадение" data-act="find-next" @click="m.findStep(1)">
                  <Icon name="chevron-down" :size="16" />
                </IconButton>
              </template>
              <template v-else-if="!phone" #end>
                <Kbd surface="card" data-search-hotkey>
                  /
                </Kbd>
              </template>
            </Input>
          </div>
        </div>
      </PopoverAnchor>
      <!--
        Выдача — ширина поля 1136 (`--container-settings-group`, такт 101; до него — 846): охват, строки со значением справа и подвал клавиш (такт 86, строка 99).
        Фокус остаётся в поле: выдача его не забирает; клик по выдаче не снимает фокус с поля до перехода.
      -->
      <PopoverContent
        data-search-results
        align="start"
        :side-offset="4"
        :width="1136"
        narrow="full"
        :side-flip="!phone"
        class="max-md:flex max-md:flex-col"
        @open-auto-focus="$event.preventDefault()"
        @close-auto-focus="$event.preventDefault()"
        @mousedown.prevent
      >
        <!-- Охват с числом совпадений (3.2, п. 6) и фильтр «Изменено в черновике» (п. 17). -->
        <Toolbar v-if="listMode === 'results'" data-search-toolbar>
          <!-- Узкий экран (такт 92): охват прокручивается вбок. -->
          <Tabs v-model="scope" class="max-md:max-w-full">
            <TabsList variant="segmented" class="max-md:max-w-full max-md:overflow-x-auto">
              <TabsTrigger v-for="s in SEARCH_SCOPES" :key="s.id" :value="s.id" variant="segmented" :count="m.search.value.counts[s.id]" :data-scope="s.id">
                {{ s.label }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Switch v-if="m.modifiedAvailable.value" v-model="modified" class="ml-auto" data-field="search-modified">
            Изменено в черновике
          </Switch>
        </Toolbar>
        <!-- Пустая выдача повторена в другой раскладке (3.2, п. 4). -->
        <div v-if="listMode === 'results' && m.search.value.shownFor" class="flex px-4 pt-2">
          <ToolbarText data-search-layout>
            Показано по «{{ m.search.value.shownFor }}»
          </ToolbarText>
        </div>
        <!-- Узкий экран (такт 92): список занимает высоту выдачи до края окна. -->
        <div v-if="rows.length" class="max-h-96 overflow-y-auto p-1 max-md:max-h-none max-md:min-h-0 max-md:flex-1" role="listbox" aria-label="Выдача поиска">
          <SelectGroup v-for="sec in sections" :key="sec.header || sec.rows[0]?.id" :header="sec.header">
            <template v-for="row in sec.rows" :key="row.id">
              <SearchResult
                v-if="row.kind === 'hit'"
                :type="row.hit.entry.type"
                :icon="row.hit.entry.icon"
                :label="row.hit.entry.label"
                :query="m.search.value.effective"
                :hint="row.hit.hint"
                :value="row.hit.entry.value"
                :toggle="row.hit.entry.toggle"
                :checked="row.hit.entry.checked"
                :reason="row.hit.entry.reason"
                :active="rows[activeRow]?.id === row.id"
                :data-result="row.id"
                @select="pick(row)"
                @toggle="toggleRow(row)"
              />
              <SearchResult
                v-else-if="row.kind === 'place'"
                :type="row.entry.type"
                :icon="row.entry.icon"
                :label="row.entry.label"
                :hint="row.entry.path"
                :active="rows[activeRow]?.id === row.id"
                :data-result="row.id"
                @select="pick(row)"
              />
              <SearchResult v-else-if="row.kind === 'query'" type="query" :label="row.text" :active="rows[activeRow]?.id === row.id" :data-result="row.id" @select="pick(row)" />
              <SearchResult v-else-if="row.kind === 'more'" type="more" :label="`ещё ${row.count}`" :active="rows[activeRow]?.id === row.id" :data-result="row.id" @select="pick(row)" />
              <SearchResult
                v-else
                type="filter"
                label="Изменено в черновике"
                hint="Места, которые черновик меняет против текущей версии"
                :value="`${row.count} ${plural(row.count, 'место', 'места', 'мест')}`"
                :active="rows[activeRow]?.id === row.id"
                data-result="filter"
                @select="pick(row)"
              />
            </template>
          </SelectGroup>
        </div>
        <!-- Пустая выдача подсказывает: другая раскладка и «Быстрый переход» к разделам (3.2, п. 13). -->
        <Empty v-else-if="listMode === 'results'" :title="emptyTitle" :description="emptyDescription" class="px-4 py-4" data-search-empty>
          <template v-if="m.ui.query.trim() && !emptyInScope" #action>
            <div class="flex flex-wrap justify-center gap-2">
              <Button v-for="(link, k) in QUICK_LINKS" :key="link.label" variant="secondary" size="sm" :data-quick="k" @click="goQuick(k)">
                {{ link.label }}
              </Button>
            </div>
          </template>
        </Empty>
        <!-- Подвал — 3.2, п. 12: клавиши и общий счёт охвата. Узкий экран (такт 92): клавиш нет — только счёт. -->
        <div class="flex items-center justify-between gap-4 px-4 pt-1 pb-3 max-md:mt-auto" data-search-footer>
          <ToolbarText v-if="!phone">
            <KbdText :text="listMode === 'results' ? '[↑↓] выбрать · [Enter] перейти · [Alt+Enter] переключить · [Tab] область · [Esc] закрыть' : '[↑↓] выбрать · [Enter] перейти · [Esc] закрыть'" />
          </ToolbarText>
          <ToolbarText v-if="listMode === 'results'" data-search-total>
            {{ totalText }}
          </ToolbarText>
        </div>
      </PopoverContent>
    </Popover>

    <Tabs v-model="tab">
      <TabsList>
        <template v-for="t in TABS" :key="t.id">
          <!--
            Новая схема (№ 66; аудит, «Двухфазность и табы»): «Форма» и «Процессы и шаги» неактивны до первого сохранения.
            Причину держит сама вкладка — проп `reason` (такт 73, строка 166): подсказка, фокус с клавиатуры, кольцо кита.
          -->
          <TabsTrigger v-if="m.tabLocked(t.id)" :value="t.id" disabled :reason="m.PHASE_REASON" :data-tab-trigger="t.id">
            {{ t.label }}
            <!-- Такт 91: замок до идентификатора — маркер для глаза; причину читает сама вкладка. -->
            <template #counter>
              <ReadinessMark state="locked" label="" />
            </template>
          </TabsTrigger>
          <!-- Режим «найдено» (такт 86; 3.2, п. 16): число совпадений таба — счётчик вкладки. -->
          <TabsTrigger v-else :value="t.id" :count="finding ? m.findCounts.value.tabs[t.id] : undefined" :data-tab-trigger="t.id">
            <!-- Звезда «Витрины» — макет `33347:6751`: глиф 12, зазор вкладки 8 (строка 13 реестра покрытия). -->
            <Icon v-if="t.id === 'showcase'" name="star" :size="12" />
            {{ t.label }}
            <!-- Такт 91 (5.5): маркер этапа — готово (в режиме создания), число — замечания с местом исправления на вкладке. -->
            <template v-if="!ro && m.tabMark(t.id).state" #counter>
              <ReadinessMark :state="m.tabMark(t.id).state || 'todo'" :count="m.tabMark(t.id).count" />
            </template>
          </TabsTrigger>
        </template>
      </TabsList>

      <!-- Режим «найдено» — 3.2, пп. 16, 18: сводка над содержимым и «Сбросить». -->
      <Callout v-if="finding" class="mt-6" narrow="stack" data-find-bar>
        {{ m.findSummary.value }}
        <template #actions>
          <ButtonAction size="sm" :show-icon="false" data-act="find-reset" @click="exitFind()">
            Сбросить
          </ButtonAction>
        </template>
      </Callout>

      <TabsContent value="settings">
        <!--
          Узкий экран (такт 92; решение 5 оркестратора 2026-10-08): навигатор — выбор раздела списком, липкий под табами.
          Отступление от макета `33694:3930` (навигатор раскрыт карточкой) — строка реестра расхождений.
        -->
        <Toolbar v-if="phone" class="sticky top-0 z-20 -mx-4" data-section-select>
          <Select v-model="section" :items="sectionItems" placeholder="Раздел настроек" :show-icon="false" :searchable="false" data-field="section-select" />
        </Toolbar>
        <!--
          Навигатор — № 14: липкий (r2 §3). Узкий экран — выбор раздела списком над колонкой (такт 92). Такт 101: место навигатора
          держится, когда он под сайдом-слоем в вариантах L1 (`invisible`) — колонка не двигается.
        -->
        <DefineSettingsNav>
          <SectionNav v-model="section" title="Настройки" :class="navCovered ? 'invisible sticky top-6' : 'sticky top-6'" data-settings-nav>
            <!-- Режим «найдено» (такт 86; 3.2, п. 16): разделы с совпадениями и раздел на экране, у каждого — число совпадений. -->
            <SectionNavItem
              v-for="s in navSections"
              :key="s.id"
              :value="s.id"
              :label="s.label"
              :status="m.sectionStatus.value[s.id]"
              :count="finding ? m.findCounts.value.sections[s.id] : undefined"
            >
              <SectionNavAnchor v-for="a in SECTION_ANCHORS[s.id]" :key="a.id" :label="a.label" :active="m.ui.anchor === a.id" :data-anchor-link="a.id" @select="goAnchor(a.id)" />
            </SectionNavItem>
          </SectionNav>
        </DefineSettingsNav>
        <!--
          Каркас «Настроек» — такт 101, L2 (владелец 2026-10-09, доска `scheme-edit-wide-v4`): навигатор 266 у левого края рабочей
          зоны, зазор 24, колонка 846; справа свободно — место сайда-слота. Макет `33346:5470` ставит навигатор справа от колонки —
          отклонение в `figma-fixes.md`. Варианты L1 оснастки (`?variant=`): колонка и навигатор справа — группой по центру.
        -->
        <div class="flex items-start gap-6 pt-6" :class="l1 ? 'justify-center' : ''" :data-layout="l1 ? VARIANT : 'l2'">
          <ReuseSettingsNav v-if="!phone && !l1" />
          <div ref="column" class="flex max-w-settings min-w-0 flex-1 flex-col gap-8" data-settings-column>
            <!-- Вариант `l1-compact` (такт 101): навигатор под сайдом-слоем — выбор раздела списком над колонкой, липкий; часть узкого экрана (такт 92). -->
            <Toolbar v-if="navCovered && VARIANT === 'l1-compact'" class="sticky top-0 z-20" data-section-select>
              <Select v-model="section" :items="sectionItems" placeholder="Раздел настроек" :show-icon="false" :searchable="false" data-field="section-select" />
            </Toolbar>
            <!-- Просмотр прошлой версии (такт 68): поля — «только чтение» осью `readonly` у `Field` и контролов, значения выделяются; действия разделов закрыты `inert`; навигатор, табы и «Назад / Далее» работают. -->
            <div class="contents" :data-readonly="ro || undefined">
            <template v-if="m.ui.section === 'general'">
              <!-- ============================ Основное — № 16, 17, 19 ============================ -->
              <section id="anchor-main" data-anchor-section="main" class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-4">
                  <Heading level="title" description="Базовые параметры схемы осмотра">
                    Основное
                  </Heading>
                  <Card class="px-6 py-3.5">
                    <Switch :readonly="ro" v-model="active" data-field="active">
                      Схема активна
                    </Switch>
                  </Card>
                </div>
                <Card class="flex flex-col gap-4">
                  <Field :readonly="ro" label="Наименование">
                    <Input v-model="name" placeholder="" :show-icon="false" data-field="name" />
                  </Field>
                  <Field :readonly="ro" label="Описание" hint="Описание поможет различать схемы в общем списке и даст понимание ИИ, какую схему применять в конкретном случае">
                    <Textarea v-model="description" placeholder="Введите описание схемы осмотра" data-field="description" />
                  </Field>
                  <Field :readonly="ro" label="Тип схемы осмотра" hint="Определяет структуру и набор полей формы осмотра" data-field="schemeType">
                    <Select v-model="schemeType" :items="SCHEME_TYPES" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field :readonly="ro" label="Компания-владелец" data-field="owner">
                    <Autocomplete v-model="owner" :items="OWNERS" placeholder="Найти компанию" />
                  </Field>
                  <Field :readonly="ro" label="Тип осмотра" hint="Мультиосмотр объединяет несколько объектов в одном осмотре">
                    <RadioGroup v-model="inspectionType" class="grid grid-cols-3 max-md:grid-cols-1" data-radio="inspectionType">
                      <RadioGroupItem variant="card" value="regular" :checked="inspectionType === 'regular'">
                        Обычный
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="multi" :checked="inspectionType === 'multi'">
                        Мультиосмотр
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                  <Field :readonly="ro" label="Назначение схемы" hint="От назначения зависит доступность части настроек">
                    <RadioGroup v-model="purpose" class="grid grid-cols-3 max-md:grid-cols-1" data-radio="purpose">
                      <RadioGroupItem variant="card" value="standard" :checked="purpose === 'standard'">
                        Стандартная
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="typical" :checked="purpose === 'typical'">
                        Типовая
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="sample" :checked="purpose === 'sample'">
                        Схема-образец
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                </Card>
                <!-- Такт 91 (5.5): «Далее» внизу этапа «Основа» — к анкете. -->
                <div v-if="creatingNow" class="flex" data-stage-next="base">
                  <Button variant="outline" data-act="stage-next-base" @click="m.goStage('form')">
                    {{ nextLabel(m.nextStage('base')) }}
                  </Button>
                </div>
              </section>

              <!-- ============================ Поведение процесса — № 18, 20 ============================ -->
              <section id="anchor-behavior" data-anchor-section="behavior" class="flex flex-col gap-4">
                <Heading level="title" description="Настройки алгоритма выполнения осмотра — условия проверки, согласования и отказа">
                  Поведение процесса
                </Heading>
                <div class="flex flex-col gap-6">
                  <Card class="flex flex-col gap-2">
                    <Heading level="group">
                      Экспертиза и проверка
                    </Heading>
                    <SettingRow data-setting="skipExpertise" :highlighted="hl('skipExpertise')">
                      <Checkbox :readonly="ro" :model-value="beh.skipExpertise" subtitle="Осмотр будет сразу передан на проверку без этапа экспертизы" @update:model-value="setB('skipExpertise', $event)">
                        Пропускать экспертизу
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="lockOnReview" :highlighted="hl('lockOnReview')" :collapsed="!beh.lockOnReview">
                      <Checkbox :readonly="ro" :model-value="beh.lockOnReview" subtitle="Запрещает редактирование осмотра другими пользователями во время проверки" @update:model-value="setB('lockOnReview', $event)">
                        Блокировать осмотр при проверке
                      </Checkbox>
                      <template #children>
                        <Field :readonly="ro" label="Разблокировать при неактивности через, минут" :orientation="phone ? 'split' : 'left'" :control-height="32" data-field="unlockMinutes">
                          <InputNumber v-model="unlockMinutes" :min="5" :max="120" :step="5" />
                        </Field>
                      </template>
                    </SettingRow>
                    <SettingRow v-slot="{ disabled }" data-setting="quickAccept" :highlighted="hl('quickAccept')" :reason="m.rule('quickAccept').reason">
                      <Checkbox :readonly="ro" :model-value="beh.quickAccept" :disabled="disabled" subtitle="Проверяющий сможет утвердить осмотр без поэтапного прохождения всех шагов" @update:model-value="setB('quickAccept', $event)">
                        Разрешить принимать осмотр одной кнопкой
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="requireAllSteps" :highlighted="hl('requireAllSteps')">
                      <Checkbox :readonly="ro" :model-value="beh.requireAllSteps" subtitle="Возврат на доработку возможен только после вынесения решения по каждому шагу" @update:model-value="setB('requireAllSteps', $event)">
                        Требовать решения во всех шагах для возврата на доработку
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="lowRolesReturn" :highlighted="hl('lowRolesReturn')">
                      <Checkbox :readonly="ro" :model-value="beh.lowRolesReturn" subtitle="Агенты и операторы смогут инициировать возврат осмотра на доработку" @update:model-value="setB('lowRolesReturn', $event)">
                        Разрешить низким ролям возвращать осмотр на доработку
                      </Checkbox>
                    </SettingRow>
                  </Card>

                  <Card class="flex flex-col gap-2">
                    <Heading level="group">
                      Отказ от осмотра
                    </Heading>
                    <!-- «?» с превью в приложении — такт 89 (ревью 4.2, решение 7): фрагмент экрана шага с кнопкой «Осмотр невозможен». -->
                    <SettingRow data-setting="refuse" :highlighted="hl('refuse')">
                      <Checkbox :readonly="ro" :model-value="beh.refuse" @update:model-value="setB('refuse', $event)">
                        Разрешить отказываться с отметкой «Осмотр невозможен»
                      </Checkbox>
                      <template #help>
                        <HelpPreview v-bind="helpBind('refuse')" @update:open="setHelp('refuse', $event)" @action="demoFromHelp(help('refuse'))">
                          <template v-if="help('refuse').screen" #default>
                            <AppPreviewScreen fragment size="md" :screen="help('refuse').screen" :marked="help('refuse').mark" />
                          </template>
                        </HelpPreview>
                      </template>
                      <template #children>
                        <SettingRow v-slot="{ disabled }" data-setting="refuseRepeatable" :highlighted="hl('refuseRepeatable')" :reason="m.rule('refuseRepeatable').reason">
                          <Checkbox :readonly="ro" :model-value="beh.refuseRepeatable" :disabled="disabled" @update:model-value="setB('refuseRepeatable', $event)">
                            Разрешить отказываться от повторяемых процессов с той же отметкой
                          </Checkbox>
                        </SettingRow>
                      </template>
                    </SettingRow>
                    <Field :readonly="ro" label="Видимость комментария к отказу" hint="Кто увидит комментарий исполнителя к отказу">
                      <RadioGroup v-model="refuseVisibility" class="grid grid-cols-3 max-md:grid-cols-1" data-radio="refuseCommentVisibility">
                        <RadioGroupItem variant="card" value="all" :checked="refuseVisibility === 'all'">
                          Все роли
                        </RadioGroupItem>
                        <RadioGroupItem variant="card" value="expert" :checked="refuseVisibility === 'expert'">
                          Эксперт и выше
                        </RadioGroupItem>
                        <RadioGroupItem variant="card" value="admin" :checked="refuseVisibility === 'admin'">
                          Только администратор
                        </RadioGroupItem>
                      </RadioGroup>
                    </Field>
                  </Card>

                  <Card class="flex flex-col gap-2">
                    <Heading level="group">
                      Согласование
                    </Heading>
                    <SettingRow
                      data-setting="approval"
                      :highlighted="hl('approval')"
                      help="Поля для согласования отмечаются в табе «Форма»"
                      :meta="m.rule('approval').meta"
                      :meta-tone="m.rule('approval').metaTone"
                    >
                      <Checkbox :readonly="ro" :model-value="beh.approval" @update:model-value="setB('approval', $event)">
                        Отправлять поля на согласование согласующему лицу
                      </Checkbox>
                      <template v-if="beh.approval" #action>
                        <ButtonAction :inert="ro" size="sm" :show-icon="false" data-act="go-fields" @click="goFields()">
                          Перейти к полям
                        </ButtonAction>
                      </template>
                    </SettingRow>
                    <SettingRow data-setting="approvalRequired" :highlighted="hl('approvalRequired')">
                      <Checkbox :readonly="ro" :model-value="beh.approvalRequired" subtitle="Осмотр не будет принят, пока не пройдёт согласование" @update:model-value="setB('approvalRequired', $event)">
                        Обязательное согласование осмотра после экспертизы
                      </Checkbox>
                    </SettingRow>
                  </Card>

                  <Card class="flex flex-col gap-2">
                    <Heading level="group">
                      Расширенное
                    </Heading>
                    <SettingRow data-setting="cadastreMap" :highlighted="hl('cadastreMap')">
                      <Checkbox :readonly="ro" :model-value="beh.cadastreMap" subtitle="Отображает геолокацию объекта на карте по кадастровому номеру" @update:model-value="setB('cadastreMap', $event)">
                        Показывать координаты на кадастровой карте
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="forbidExtraFiles" :highlighted="hl('forbidExtraFiles')">
                      <Checkbox :readonly="ro" :model-value="beh.forbidExtraFiles" subtitle="Пользователь не сможет прикрепить файлы за пределами обязательных полей" @update:model-value="setB('forbidExtraFiles', $event)">
                        Запретить использовать блок дополнительных файлов
                      </Checkbox>
                      <template #help>
                        <HelpPreview v-bind="helpBind('forbidExtraFiles')" @update:open="setHelp('forbidExtraFiles', $event)" @action="demoFromHelp(help('forbidExtraFiles'))">
                          <template v-if="help('forbidExtraFiles').screen" #default>
                            <AppPreviewScreen fragment size="md" :screen="help('forbidExtraFiles').screen" :marked="help('forbidExtraFiles').mark" />
                          </template>
                        </HelpPreview>
                      </template>
                    </SettingRow>
                  </Card>
                </div>
              </section>

              <!-- ============================ Формулы и служебное — № 21 ============================ -->
              <section id="anchor-formulas" data-anchor-section="formulas" class="flex flex-col gap-4">
                <Heading level="title" description="Расширенные настройки для технических специалистов">
                  Формулы и служебное
                </Heading>
                <Card class="flex flex-col gap-8">
                  <div v-for="f in FORMULAS" :key="f.key" class="flex flex-col gap-2" :data-formula="f.key">
                    <Field :readonly="ro" :label="f.label" :hint="f.hint">
                      <FormulaInput
                        :model-value="general.formulas[f.key]"
                        :variables="m.variables.value"
                        :label="f.label"
                        placeholder="Текст и переменные"
                        @update:model-value="setFormula(f.key, $event)"
                      />
                    </Field>
                    <FormulaPreview :value="formulaPreview(general.formulas[f.key], m.variableSamples.value)" />
                  </div>
                </Card>
              </section>

              <!-- ============================ Словари — № 22 ============================ -->
              <section id="anchor-dictionaries" data-anchor-section="dictionaries" class="flex flex-col gap-4">
                <Heading level="title" description="Привязка справочников статусов и комментариев к схеме">
                  Словари
                </Heading>
                <Card class="grid grid-cols-2 max-md:grid-cols-1 items-start gap-6">
                  <Field :readonly="ro" label="Словарь статусов" data-field="statusDict">
                    <Select v-model="statusDict" :items="STATUS_DICTIONARIES" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field :readonly="ro" label="Словарь комментариев" data-field="commentDict">
                    <ListRow :inert="ro" data-act="open-comments" @click="m.openSide('comments')">
                      {{ commentDict?.label ?? 'Словарь не привязан' }}
                      <template #secondary>
                        {{ commentDict ? `Комментариев: ${commentDict.comments.length}` : 'Привязать словарь' }}
                      </template>
                    </ListRow>
                  </Field>
                </Card>
              </section>

              <!-- ============================ Дедлайны и доступ к осмотру — № 23, 71 ============================ -->
              <section id="anchor-deadlines" data-anchor-section="deadlines" class="flex flex-col gap-4">
                <Heading level="title" description="Управление сроками проверки и правами на операции с осмотром">
                  Дедлайны и доступ к осмотру
                </Heading>
                <Card class="flex flex-col gap-6">
                  <div class="flex flex-col gap-3">
                    <Heading level="group">
                      Дедлайн проверки
                    </Heading>
                    <RadioGroup :readonly="ro" v-model="deadlineMode" class="grid grid-cols-3 max-md:grid-cols-1" data-radio="deadlineMode">
                      <RadioGroupItem variant="card" value="none" :checked="deadlineMode === 'none'">
                        Не устанавливать автоматически
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="hours" :checked="deadlineMode === 'hours'">
                        Установить через N часов
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="days" :checked="deadlineMode === 'days'">
                        Установить через N дней
                      </RadioGroupItem>
                    </RadioGroup>
                    <div v-if="deadlineMode !== 'none'" class="flex flex-wrap items-start gap-6">
                      <Field v-if="deadlineMode === 'hours'" :readonly="ro" label="Часов" :orientation="phone ? 'split' : 'left'" :control-height="32" data-field="deadlineHours">
                        <InputNumber v-model="deadlineHours" :min="1" :max="240" />
                      </Field>
                      <Field v-else :readonly="ro" label="Дней" :orientation="phone ? 'split' : 'left'" :control-height="32" data-field="deadlineDays">
                        <InputNumber v-model="deadlineDays" :min="1" :max="90" />
                      </Field>
                    </div>
                    <Field :readonly="ro" label="Событие отсчёта" :disabled="deadlineMode === 'none'" data-field="deadlineFrom">
                      <Select v-model="deadlineFrom" :items="DEADLINE_EVENTS" placeholder="" :show-icon="false" :searchable="false" :disabled="deadlineMode === 'none'" />
                    </Field>
                  </div>
                  <!-- Сверка дублей, такт 73: подпись одного контрола — `Field label`, как у «Кто может задавать координату вручную». -->
                  <Field :readonly="ro" label="Кто может редактировать дедлайн">
                    <Select v-model:values="deadlineEditors" multiple :items="ROLES" placeholder="Выберите роли" data-field="deadlineEditors" />
                  </Field>
                  <Field :readonly="ro" label="Кто может делиться осмотром">
                    <RadioGroup v-model="share" class="grid grid-cols-4 max-md:grid-cols-1" data-radio="share">
                      <RadioGroupItem variant="card" value="anyone" :checked="share === 'anyone'">
                        Любой, с кем поделились
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="executor" :checked="share === 'executor'">
                        Только исполнитель
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="executor-up" :checked="share === 'executor-up'">
                        Исполнитель и выше
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="nobody" :checked="share === 'nobody'">
                        Никто
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                  <Field :readonly="ro" label="Кто может задавать координату вручную">
                    <Select v-model:values="manualCoordinate" multiple :items="ROLES" placeholder="Выберите роли" data-field="manualCoordinate" />
                  </Field>
                </Card>
              </section>

              <!-- ============================ Экран подтверждения — № 24 ============================ -->
              <section id="anchor-confirm" data-anchor-section="confirm" class="flex flex-col gap-4">
                <Heading level="title" description="Тексты, отображаемые клиенту перед финальным подтверждением осмотра">
                  Экран подтверждения
                </Heading>
                <Card class="grid grid-cols-2 max-md:grid-cols-1 items-start gap-6">
                  <Field :readonly="ro" label="Подсказка клиенту" hint="Текст подсказки на экране подтверждения">
                    <Input v-model="confirmHint" placeholder="Введите подсказку для экрана подтверждения" :show-icon="false" data-field="confirmHint" />
                    <template #help>
                      <HelpPreview v-bind="helpBind('confirmHint')" @update:open="setHelp('confirmHint', $event)" @action="demoFromHelp(help('confirmHint'))">
                        <template v-if="help('confirmHint').screen" #default>
                          <AppPreviewScreen fragment size="md" :screen="help('confirmHint').screen" :marked="help('confirmHint').mark" />
                        </template>
                      </HelpPreview>
                    </template>
                  </Field>
                  <Field :readonly="ro" label="Текст галочки" hint="Текст рядом с чекбоксом подтверждения">
                    <Input v-model="confirmCheckbox" placeholder="Информация напротив галочки подтверждения" :show-icon="false" data-field="confirmCheckbox" />
                    <template #help>
                      <HelpPreview v-bind="helpBind('confirmCheckbox')" @update:open="setHelp('confirmCheckbox', $event)" @action="demoFromHelp(help('confirmCheckbox'))">
                        <template v-if="help('confirmCheckbox').screen" #default>
                          <AppPreviewScreen fragment size="md" :screen="help('confirmCheckbox').screen" :marked="help('confirmCheckbox').mark" />
                        </template>
                      </HelpPreview>
                    </template>
                  </Field>
                </Card>
              </section>
            </template>

            <!-- ============================ Мобильное приложение — № 25 ============================ -->
            <template v-else-if="m.ui.section === 'mobile'">
              <section id="anchor-shooting" data-anchor-section="shooting" class="flex flex-col gap-4">
                <Heading level="title" description="Выполнение осмотра и фото- и видеосъёмки в мобильном приложении">
                  Параметры съёмки
                </Heading>
                <Card class="flex flex-col gap-4">
                  <Field :readonly="ro" label="Режим выполнения">
                    <template #help>
                      <HelpPreview v-bind="helpBind('mobileMode')" @update:open="setHelp('mobileMode', $event)" @action="demoFromHelp(help('mobileMode'))">
                        <template v-if="help('mobileMode').screen" #default>
                          <AppPreviewScreen fragment size="md" :screen="help('mobileMode').screen" :marked="help('mobileMode').mark" />
                        </template>
                      </HelpPreview>
                    </template>
                    <RadioGroup v-model="mobileMode" class="grid grid-cols-2 max-md:grid-cols-1" data-radio="mobileMode">
                      <RadioGroupItem variant="card" value="regular" :checked="mobileMode === 'regular'">
                        Обычный
                        <template #description>
                          Свободное заполнение полей формы в произвольном порядке
                        </template>
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="checklist" :checked="mobileMode === 'checklist'">
                        Чек-лист
                        <template #description>
                          Пошаговое выполнение с отметкой о завершении каждого пункта
                        </template>
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                  <Field :readonly="ro" label="Разрешение фото" data-field="photo">
                    <Select v-model="mobilePhoto" :items="PHOTO_RESOLUTIONS" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field :readonly="ro" label="Разрешение видео" data-field="video">
                    <Select v-model="mobileVideo" :items="VIDEO_RESOLUTIONS" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field :readonly="ro" label="Телефон для звонка" hint="Номер, на который будет совершён звонок из мобильного приложения">
                    <Input v-model="mobilePhone" placeholder="+7 900 000 00 00" :show-icon="false" data-field="phone" />
                    <template #help>
                      <HelpPreview v-bind="helpBind('phone')" @update:open="setHelp('phone', $event)" @action="demoFromHelp(help('phone'))">
                        <template v-if="help('phone').screen" #default>
                          <AppPreviewScreen fragment size="md" :screen="help('phone').screen" :marked="help('phone').mark" />
                        </template>
                      </HelpPreview>
                    </template>
                  </Field>
                  <Field :readonly="ro" label="Название телефона" hint="Отображаемое имя контакта, которое увидит пользователь при звонке">
                    <Input v-model="mobilePhoneName" placeholder="Например, «Служба поддержки»" :show-icon="false" data-field="phoneName" />
                  </Field>
                  <Field :readonly="ro" label="Запрос подтверждения звонка" hint="Сообщение, показываемое пользователю перед началом звонка для подтверждения">
                    <Input v-model="mobileCallConfirm" placeholder="Текст перед набором номера" :show-icon="false" data-field="callConfirm" />
                  </Field>
                </Card>
              </section>

              <section id="anchor-mobile-behavior" data-anchor-section="mobile-behavior" class="flex flex-col gap-4">
                <Card class="flex flex-col gap-2">
                  <Heading level="group">
                    Поведение в мобильном приложении
                  </Heading>
                  <SettingRow data-setting="startAfterCreate" :highlighted="hl('startAfterCreate')">
                    <Checkbox :readonly="ro" :model-value="mob.startAfterCreate" subtitle="Пользователь сразу переходит к выполнению без промежуточного экрана" @update:model-value="setS('mobile.startAfterCreate', $event)">
                      Запустить осмотр сразу после создания
                    </Checkbox>
                    <template #help>
                      <HelpPreview v-bind="helpBind('startAfterCreate')" @update:open="setHelp('startAfterCreate', $event)" @action="demoFromHelp(help('startAfterCreate'))">
                        <template v-if="help('startAfterCreate').screen" #default>
                          <AppPreviewScreen fragment size="md" :screen="help('startAfterCreate').screen" :marked="help('startAfterCreate').mark" />
                        </template>
                      </HelpPreview>
                    </template>
                  </SettingRow>
                  <SettingRow data-setting="hideHints" :highlighted="hl('hideHints')">
                    <Checkbox :readonly="ro" :model-value="mob.hideHints" subtitle="Опытные пользователи — те, кто проходил осмотр минимум три раза по данной схеме" @update:model-value="setS('mobile.hideHints', $event)">
                      Разрешать опытным пользователям скрывать подсказки к шагам
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="skipConfirm" :highlighted="hl('skipConfirm')">
                    <Checkbox :readonly="ro" :model-value="mob.skipConfirm" subtitle="Опытные пользователи — те, кто проходил осмотр минимум три раза по данной схеме" @update:model-value="setS('mobile.skipConfirm', $event)">
                      Разрешать опытным пользователям пропускать подтверждение после шага
                    </Checkbox>
                  </SettingRow>
                </Card>
              </section>
            </template>

            <!-- ============================ Веб-приложение — № 26 ============================ -->
            <template v-else-if="m.ui.section === 'web'">
              <section id="anchor-feedback" data-anchor-section="feedback" class="flex flex-col gap-4">
                <Heading level="title">
                  Обратная связь
                </Heading>
                <Card class="flex flex-col gap-6">
                  <div class="flex flex-col gap-2">
                    <Heading level="group">
                      Обоснования
                    </Heading>
                    <SettingRow data-setting="feedback" :highlighted="hl('feedback')">
                      <Checkbox :readonly="ro" :model-value="web.feedback" subtitle="Позволяет экспертам оставлять комментарии и оценки по результатам проверки" @update:model-value="setS('web.feedback', $event)">
                        Блок обратной связи на странице экспертизы
                      </Checkbox>
                    </SettingRow>
                  </div>
                  <!-- Такт 99 (владелец, 2026-10-09): заголовок → чипы 12; список (чипы, плашка причины) → «Добавить вариант» и форма — 16. -->
                  <div class="flex flex-col gap-4" data-reasons>
                    <div class="flex flex-col gap-3">
                      <Heading level="group" description="Типы обоснований, которые эксперт может выбрать при проверке">
                        Варианты обоснований
                      </Heading>
                      <Callout v-if="m.rule('feedbackBlock').reason" icon="info" data-reason-callout="feedback">
                        {{ m.rule('feedbackBlock').reason }}
                      </Callout>
                      <!-- Вариант — «название — ключ»; крестик снимает вариант, уведомление предлагает отмену. -->
                      <div v-if="web.reasons.length" class="flex flex-wrap gap-2">
                        <Chip v-for="r in web.reasons" :key="r.key" :trailing="web.feedback && !ro ? 'remove' : 'none'" :data-reason="r.key" @remove="m.removeReason(r.key)">
                          {{ r.title }} — {{ r.key }}
                        </Chip>
                      </div>
                    </div>
                    <Card v-if="reasonForm && web.feedback" tone="muted" class="flex flex-col gap-4" data-reason-form>
                      <FieldSet legend="Новое обоснование">
                        <div class="grid grid-cols-2 max-md:grid-cols-1 items-start gap-4">
                          <Field :readonly="ro" label="Ключ">
                            <Input v-model="reasonKey" placeholder="Например, geo" variant="elevated" :show-icon="false" data-field="reasonKey" />
                          </Field>
                          <Field :readonly="ro" label="Название">
                            <Input v-model="reasonTitle" placeholder="Например, «Координаты»" variant="elevated" :show-icon="false" data-field="reasonTitle" />
                          </Field>
                        </div>
                      </FieldSet>
                      <!-- Такт 100 (владелец, 2026-10-09, доска scheme-edit-batch2-v1): кнопки встроенной формы — как подвал окна: справа, «Отмена», затем главная, 16. -->
                      <div class="flex items-center justify-end gap-4" data-form-actions>
                        <Button :inert="ro" variant="secondary" data-act="reason-cancel" @click="closeReasonForm()">
                          Отмена
                        </Button>
                        <Button :inert="ro" data-act="reason-create" @click="createReason()">
                          Создать обоснование
                        </Button>
                      </div>
                    </Card>
                    <div v-else class="flex">
                      <Button :inert="ro" variant="outline" show-icon :disabled="!web.feedback" data-act="reason-add" @click="reasonForm = true">
                        <template #icon>
                          <Icon name="add" :size="16" />
                        </template>
                        Добавить вариант
                      </Button>
                    </div>
                  </div>
                </Card>
                <Card class="flex flex-col gap-2">
                  <Heading level="group">
                    Если не заполнен блок обратной связи
                  </Heading>
                  <!-- Сверка дублей, такт 73: группу гасит тот же рубильник — причина стоит и здесь (строка 65). -->
                  <Callout v-if="m.rule('feedbackBlock').reason" icon="info" data-reason-callout="feedback-block">
                    {{ m.rule('feedbackBlock').reason }}
                  </Callout>
                  <SettingRow data-setting="blockRepeat" :highlighted="hl('blockRepeat')">
                    <Checkbox :readonly="ro" :model-value="web.blockRepeat" :disabled="!web.feedback" @update:model-value="setS('web.blockRepeat', $event)">
                      Запретить переход в «Повтор»
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="blockRefuse" :highlighted="hl('blockRefuse')">
                    <Checkbox :readonly="ro" :model-value="web.blockRefuse" :disabled="!web.feedback" @update:model-value="setS('web.blockRefuse', $event)">
                      Запретить переход в «Отказ»
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="blockContract" :highlighted="hl('blockContract')">
                    <Checkbox :readonly="ro" :model-value="web.blockContract" :disabled="!web.feedback" @update:model-value="setS('web.blockContract', $event)">
                      Запретить переход в «Подписание» или «Контракт»
                    </Checkbox>
                  </SettingRow>
                </Card>
              </section>
            </template>

            <!-- ============================ Права доступа — № 27, 28, 71 ============================ -->
            <template v-else-if="m.ui.section === 'access'">
              <section id="anchor-execution" data-anchor-section="execution" class="flex flex-col gap-4">
                <Heading level="title" description="Настройка ролей, допущенных к выполнению и управлению осмотром">
                  Выполнение осмотра
                </Heading>
                <Card class="flex flex-col gap-6">
                  <Field :readonly="ro" label="Кто может выполнять осмотр">
                    <Select v-model:values="executors" multiple :items="ACCESS_ROLES" placeholder="Выберите роли" data-field="executors" />
                  </Field>
                  <Field :readonly="ro" label="Кто может управлять выполнением осмотра">
                    <RadioGroup v-model="accessManage" class="grid grid-cols-3 max-md:grid-cols-1" data-radio="manage">
                      <RadioGroupItem variant="card" value="all" :checked="accessManage === 'all'">
                        Все роли
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="expert" :checked="accessManage === 'expert'">
                        Эксперт и выше
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="admin" :checked="accessManage === 'admin'">
                        Только администратор
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                </Card>
              </section>

              <section id="anchor-creation" data-anchor-section="creation" class="flex flex-col gap-4">
                <Heading level="title" description="Правила, определяющие, кто и при каких условиях может создавать осмотры по данной схеме">
                  Создание и проверка осмотров
                </Heading>
                <Card class="flex flex-col gap-6">
                  <Field :readonly="ro" label="Кто может управлять созданием осмотра">
                    <RadioGroup v-model="createMode" class="gap-2" data-radio="createMode">
                      <RadioGroupItem variant="card" value="groups" :checked="createMode === 'groups'">
                        Учитывать роль и группы доступа
                        <template #description>
                          Пользователь должен входить в одну из групп доступа схемы и иметь подходящую роль
                        </template>
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="role" :checked="createMode === 'role'">
                        Только по роли
                        <template #description>
                          Достаточно подходящей роли без проверки групп
                        </template>
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="open" :checked="createMode === 'open'">
                        Открытое создание
                        <template #description>
                          Создавать может любой пользователь с доступом к схеме, роль не проверяется
                        </template>
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                  <Field :readonly="ro" label="Необходимая роль для создания" :disabled="createMode === 'open'" :hint="createMode === 'open' ? 'При открытом создании роль не проверяется' : ''">
                    <Select v-model:values="createRoles" multiple :items="ACCESS_ROLES" placeholder="Выберите роли" :disabled="createMode === 'open'" data-field="createRoles" />
                  </Field>
                </Card>
              </section>

              <section id="anchor-groups" data-anchor-section="groups" class="flex flex-col gap-4">
                <Heading level="title">
                  Группы доступа
                </Heading>
                <!-- Канон страницы-таблицы (`naming.md`, «Такт 20»): шапка, таблица, подвал с пагинацией. -->
                <div class="flex min-w-0 flex-col" data-groups-table>
                  <!-- Узкий экран (такт 92): поиск — строкой во всю ширину, фильтр и счёт — под ним; подвал переносится. -->
                  <TableToolbar :inert="ro" class="items-center gap-3 max-md:h-auto max-md:flex-wrap max-md:py-3">
                    <Input v-model="groupQuery" variant="elevated" placeholder="Поиск по названию группы и компании" class="max-w-110 min-w-0 max-md:max-w-none max-md:basis-full" data-field="groupQuery" />
                    <div class="w-56 shrink-0 max-md:w-auto max-md:min-w-0 max-md:flex-1" data-field="groupFilter">
                      <Select v-model="groupFilter" variant="elevated" :items="GROUP_FILTERS" placeholder="" :show-icon="false" :searchable="false" />
                    </div>
                    <ToolbarText class="ml-auto" data-groups-count>
                      Выбрано {{ access.groups.length }}
                    </ToolbarText>
                  </TableToolbar>
                  <Table attached-top :attached="groupTotal > 0" :page-rows="groupTotal > groupPageSize ? groupPageSize : undefined">
                    <TableRow>
                      <TableHead variant="column" class="w-16 justify-center px-6" aria-label="Выбор групп на странице">
                        <Checkbox :readonly="ro"
                          :model-value="pageGroupsState === 'all'"
                          :indeterminate="pageGroupsState === 'some'"
                          :disabled="!groupRows.length"
                          data-groups-all
                          @update:model-value="togglePageGroups()"
                        />
                      </TableHead>
                      <TableHead variant="column" class="w-90 px-4">
                        Группа
                      </TableHead>
                      <TableHead variant="column" class="min-w-0 flex-1 px-4">
                        Компания-владелец
                      </TableHead>
                    </TableRow>
                    <TableEmptySearch v-if="groupTotal === 0" :inert="ro" @reset="resetGroupSearch()" />
                    <TableRow v-for="g in groupRows" v-else :key="g.id" :state="access.groups.includes(g.id) ? 'selected' : 'default'" :data-group="g.id">
                      <TableCell variant="slot" class="w-16 justify-center px-6">
                        <Checkbox :readonly="ro" :model-value="access.groups.includes(g.id)" :aria-label="g.name" @update:model-value="m.toggleGroup(g.id)" />
                      </TableCell>
                      <TableCell variant="slot" class="w-90 px-4">
                        <TableCellIdentity>
                          {{ g.name }}
                        </TableCellIdentity>
                      </TableCell>
                      <TableCell class="min-w-0 flex-1 px-4">
                        {{ g.owner }}
                      </TableCell>
                    </TableRow>
                  </Table>
                  <TableFooter :inert="ro"
                    v-if="groupTotal"
                    class="max-md:flex-wrap"
                    v-model:page="groupPage"
                    v-model:page-size="groupPageSize"
                    :pages="groupPages"
                    :total="groupTotal"
                    :page-sizes="[10, 20, 50]"
                    attached
                  />
                </div>
              </section>
            </template>

            <!-- ============================ ИИ-анализ — № 29–33 ============================ -->
            <template v-else-if="m.ui.section === 'ai'">
              <!--
                Такт 99 (владелец, 2026-10-09): плашка раздела — первой в первом подразделе: переход из навигатора к «Анализу стоимости
                отделки» ставит в окно и её; табы → плашка и плашка → заголовок — 24 и 24. Вид — плашка с иконкой без заливки (доска
                scheme-edit-callout-v1, макет `33351:8881`).
              -->
              <section id="anchor-finish" data-anchor-section="finish" class="flex flex-col gap-6">
                <Callout tone="plain" icon="info" title="Доступные ИИ-модули зависят от типа объекта схемы" data-ai-banner>
                  Текущий тип: {{ schemeTypeLabel }}
                </Callout>
                <div class="flex flex-col gap-4">
                  <Heading level="title" description="Автоматический расчёт стоимости ремонта по классам отделки для недвижимости">
                    Анализ стоимости отделки
                  </Heading>
                  <Callout v-if="finishOff" icon="info" data-reason-callout="finish">
                    {{ m.rule('finishCost').reason }}. Тип схемы задаётся в разделе «Общие → Основное»
                  </Callout>
                  <Card class="flex flex-col gap-4">
                    <Heading level="group" description="Привязанные по алиасам поля формы осмотра будут подставлены в расчёт стоимости отделки">
                      Поля для расчётов
                    </Heading>
                    <div class="grid grid-cols-2 max-md:grid-cols-1 items-start gap-6">
                      <Field :readonly="ro" label="Алиас для «Общая площадь объекта»" hint="Системное имя поля. Формат: namespace:fieldname" :disabled="finishOff">
                        <Input v-model="aliasTotal" placeholder="" :show-icon="false" :disabled="finishOff" data-field="aliasTotal" />
                      </Field>
                      <Field :readonly="ro" label="Алиас для «Площадь отдельного помещения»" hint="Системное имя поля. Формат: namespace:fieldname" :disabled="finishOff">
                        <Input v-model="aliasRoom" placeholder="" :show-icon="false" :disabled="finishOff" data-field="aliasRoom" />
                      </Field>
                    </div>
                  </Card>
                </div>
              </section>

              <section id="anchor-costs" data-anchor-section="costs" class="flex flex-col gap-4">
                <Heading level="title" description="Значения стоимости отделки по каждому классу для использования в расчётах">
                  Стоимость классов отделки
                </Heading>
                <div class="flex min-w-0 flex-col" data-costs-table>
                  <TableToolbar class="items-center justify-end gap-3">
                    <Button :inert="ro" variant="outline" :disabled="finishOff" data-act="costs-reset" @click="m.resetCosts()">
                      Сбросить к значениям по умолчанию
                    </Button>
                  </TableToolbar>
                  <Table attached-top>
                    <TableRow>
                      <TableHead variant="column" class="w-24 px-4">
                        Код
                      </TableHead>
                      <TableHead variant="column" class="min-w-0 flex-1 px-4">
                        Название
                      </TableHead>
                      <TableHead variant="column" class="w-60 px-4">
                        Стоимость, ₽/м²
                      </TableHead>
                    </TableRow>
                    <TableRow v-for="c in FINISH_CLASSES" :key="c.code" :data-class="c.code">
                      <TableCell variant="slot" class="w-24 px-4">
                        <Chip variant="neutral">
                          {{ c.code }}
                        </Chip>
                      </TableCell>
                      <TableCell class="min-w-0 flex-1 px-4">
                        {{ c.title }}
                      </TableCell>
                      <TableCell variant="slot" class="w-60 px-4">
                        <Input :readonly="ro"
                          :model-value="String(ai.costs[c.code] ?? 0)"
                          placeholder=""
                          :show-icon="false"
                          :disabled="finishOff"
                          :data-cost="c.code"
                          @update:model-value="setCost(c.code, $event)"
                        />
                      </TableCell>
                    </TableRow>
                  </Table>
                </div>
              </section>

              <section id="anchor-regions" data-anchor-section="regions" class="flex flex-col gap-4">
                <Heading level="title" description="Поправки к стоимости отделки по регионам">
                  Матрица регионов
                </Heading>
                <Card class="flex flex-col gap-4">
                  <Field :readonly="ro" label="Матрица корректировок" :disabled="finishOff" data-field="regionMatrix">
                    <Select v-model="regionMatrix" :items="REGION_MATRICES" placeholder="" :show-icon="false" :searchable="false" :disabled="finishOff" />
                  </Field>
                  <!-- Раздел матриц — другая страница: ссылка открывается в новой вкладке, контекст правки схемы сохраняется. -->
                  <div class="flex">
                    <Hyperlink href="#region-matrices" target="_blank" rel="noopener" data-link="region-matrices">
                      Матрицы корректировок по регионам
                    </Hyperlink>
                  </div>
                </Card>
              </section>

              <section class="flex flex-col gap-4" data-auto-modules>
                <Card class="flex flex-col gap-2">
                  <Heading level="group" description="Распознавание повреждений, распознавание VIN и оценка ущерба — для схем с типом «Осмотр транспорта»">
                    Модули для авто
                  </Heading>
                  <Callout v-if="autoOff" icon="info" data-reason-callout="auto">
                    {{ m.rule('autoModules').reason }}. Тип схемы задаётся в разделе «Общие → Основное»
                  </Callout>
                  <SettingRow data-setting="damage" :highlighted="hl('damage')">
                    <Checkbox :readonly="ro" :model-value="ai.damage" :disabled="autoOff" subtitle="Находит повреждения кузова на фотографиях" @update:model-value="setS('ai.damage', $event)">
                      Распознавание повреждений
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="vinRecognition" :highlighted="hl('vinRecognition')">
                    <Checkbox :readonly="ro" :model-value="ai.vinRecognition" :disabled="autoOff" subtitle="Читает VIN с фотографии и сверяет с полем формы" @update:model-value="setS('ai.vinRecognition', $event)">
                      Распознавание VIN
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="damageCost" :highlighted="hl('damageCost')">
                    <Checkbox :readonly="ro" :model-value="ai.damageCost" :disabled="autoOff" subtitle="Оценивает стоимость ремонта найденных повреждений" @update:model-value="setS('ai.damageCost', $event)">
                      Оценка ущерба
                    </Checkbox>
                  </SettingRow>
                </Card>
              </section>
            </template>

            <!-- ============================ Аномалии — № 34 ============================ -->
            <template v-else-if="m.ui.section === 'anomalies'">
              <section class="flex flex-col gap-4" data-anomalies>
                <Card class="flex flex-col">
                  <SettingRow data-setting="anomaliesEnabled" :highlighted="hl('anomaliesEnabled')">
                    <Switch :readonly="ro" :model-value="anomalies.enabled" subtitle="Детекторы подозрительной активности при проведении осмотра" @update:model-value="setS('anomalies.enabled', $event)">
                      Отображать блок аномалий
                    </Switch>
                  </SettingRow>
                </Card>
                <Card class="flex flex-col gap-6">
                  <Callout v-if="anomaliesOff" icon="info" data-reason-callout="anomalies">
                    {{ m.rule('anomalies').reason }}
                  </Callout>
                  <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <Checkbox :readonly="ro"
                      :model-value="m.detectorSetState(DETECTOR_IDS) === 'all'"
                      :indeterminate="m.detectorSetState(DETECTOR_IDS) === 'some'"
                      :disabled="anomaliesOff"
                      data-detector-set="all"
                      @update:model-value="m.toggleDetectorSet(DETECTOR_IDS)"
                    >
                      {{ m.detectorsOn.value }} из {{ DETECTOR_IDS.length }} включено
                    </Checkbox>
                    <div class="w-90" data-field="defaultRole">
                      <Field :readonly="ro" label="Роль видимости по умолчанию" :disabled="anomaliesOff">
                        <Select v-model="defaultRole" :items="ROLE_LADDER" placeholder="" :show-icon="false" :searchable="false" :disabled="anomaliesOff" />
                      </Field>
                    </div>
                  </div>
                  <div v-for="g in DETECTOR_GROUPS" :key="g.id" class="flex flex-col gap-1" :data-detector-group="g.id">
                    <!-- Группа из одного детектора — без подзаголовка (r2 §4). -->
                    <Checkbox :readonly="ro"
                      v-if="g.title"
                      :model-value="m.detectorSetState(g.detectors.map(d => d.id)) === 'all'"
                      :indeterminate="m.detectorSetState(g.detectors.map(d => d.id)) === 'some'"
                      :disabled="anomaliesOff"
                      :data-detector-set="g.id"
                      @update:model-value="m.toggleDetectorSet(g.detectors.map(d => d.id))"
                    >
                      {{ g.title }}
                    </Checkbox>
                    <div class="flex flex-col" :class="g.title ? 'pl-6' : ''">
                      <SettingRow
                        v-for="d in g.detectors"
                        :key="d.id"
                        :data-setting="`det-${d.id}`"
                        :highlighted="hl(`det-${d.id}`)"
                        :help="d.help"
                        :meta="detectorRoleText(d.id)"
                      >
                        <Checkbox :readonly="ro" :model-value="anomalies.detectors[d.id]?.on ?? false" :disabled="anomaliesOff" @update:model-value="m.setDetector(d.id, { on: $event })">
                          {{ d.title }}
                        </Checkbox>
                        <!-- Роль — переопределением: селект появляется по запросу, у выключенного детектора управления ролью нет. -->
                        <template v-if="anomalies.detectors[d.id]?.on && !anomaliesOff" #action>
                          <template v-if="anomalies.detectors[d.id]?.role">
                            <div class="w-56" :data-field="`detRole-${d.id}`">
                              <Select :readonly="ro"
                                :model-value="anomalies.detectors[d.id]!.role"
                                :items="ROLE_LADDER"
                                placeholder=""
                                :show-icon="false"
                                :searchable="false"
                                @update:model-value="m.setDetector(d.id, { role: $event })"
                              />
                            </div>
                            <ButtonAction :inert="ro" size="sm" :show-icon="false" :data-act="`det-inherit-${d.id}`" @click="m.setDetector(d.id, { role: '' })">
                              Вернуть роль по умолчанию
                            </ButtonAction>
                          </template>
                          <ButtonAction v-else :inert="ro" size="sm" :show-icon="false" :data-act="`det-override-${d.id}`" @click="m.setDetector(d.id, { role: anomalies.defaultRole })">
                            Переопределить роль
                          </ButtonAction>
                        </template>
                      </SettingRow>
                    </div>
                  </div>
                </Card>
              </section>
            </template>

            <!-- ============================ PDF — № 35–37 ============================ -->
            <template v-else-if="m.ui.section === 'pdf'">
              <section class="flex flex-col gap-6" data-pdf>
                <Card class="flex flex-col gap-4" data-pdf-templates>
                  <Heading level="group" description="PDF-шаблоны верстаются под заказчика. Здесь подключается готовый шаблон к схеме осмотра">
                    Шаблоны документов
                  </Heading>
                  <Table v-if="pdf.templates.length">
                    <TableRow>
                      <TableHead variant="column" class="w-58 px-4">
                        Название
                      </TableHead>
                      <TableHead variant="column" class="w-40 px-4">
                        Шаблон
                      </TableHead>
                      <TableHead variant="column" class="w-50 px-4">
                        Доступно
                      </TableHead>
                      <TableHead variant="column" aria-label="Действия" :class="['justify-end px-4', TEMPLATE_ACTIONS_COLUMN]" />
                    </TableRow>
                    <TableRow v-for="t in pdf.templates" :key="t.id" :data-template="t.id">
                      <TableCell variant="slot" class="w-58 gap-2 px-4">
                        <TableCellIdentity>
                          {{ t.title }}
                        </TableCellIdentity>
                        <Badge v-if="t.main" size="sm" data-template-main>
                          Основной
                        </Badge>
                      </TableCell>
                      <TableCell class="w-40 px-4">
                        {{ t.template }}
                      </TableCell>
                      <TableCell class="w-50 px-4">
                        {{ templateAccess(t) }}
                      </TableCell>
                      <TableCell variant="slot" :class="['justify-end px-4', TEMPLATE_ACTIONS_COLUMN]">
                        <TableRowActions :inert="ro" :actions="TEMPLATE_ACTIONS" @edit="openTemplate(t.id)" @action="m.removeTemplate(t.id)" />
                      </TableCell>
                    </TableRow>
                  </Table>
                  <Empty v-else title="Шаблоны не подключены" description="Без шаблона документ не формируется" />
                  <div class="flex">
                    <Button :inert="ro" variant="outline" show-icon data-act="template-add" @click="openTemplate('')">
                      <template #icon>
                        <Icon name="add" :size="16" />
                      </template>
                      Добавить шаблон
                    </Button>
                  </div>
                </Card>

                <Card class="flex flex-col gap-2">
                  <Heading level="group">
                    Формирование и подписание
                  </Heading>
                  <SettingRow data-setting="pdfSign" :highlighted="hl('pdfSign')" :collapsed="!pdf.sign">
                    <Checkbox :readonly="ro" :model-value="pdf.sign" subtitle="Добавляет в процесс этап подписания клиентом — статус «Согласование с клиентом». Клиент получает документ и подписывает его кодом из СМС" @update:model-value="setS('pdf.sign', $event)">
                      Запрашивать подписание документа после успешной экспертизы
                    </Checkbox>
                    <template #children>
                      <div class="flex max-w-110 flex-col py-2" data-field="signer">
                        <Field :readonly="ro" label="Кто подписывает документ">
                          <Select v-model="pdfSigner" :items="PDF_SIGNERS" placeholder="" :show-icon="false" :searchable="false" />
                        </Field>
                      </div>
                      <SettingRow data-setting="showSigned" :highlighted="hl('showSigned')">
                        <Checkbox :readonly="ro" :model-value="pdf.showSigned" @update:model-value="setS('pdf.showSigned', $event)">
                          Показывать подписанный PDF в приложении
                        </Checkbox>
                      </SettingRow>
                      <SettingRow data-setting="mailSigned" :highlighted="hl('mailSigned')">
                        <Checkbox :readonly="ro" :model-value="pdf.mailSigned" @update:model-value="setS('pdf.mailSigned', $event)">
                          Отправлять подписанный PDF на почту
                        </Checkbox>
                      </SettingRow>
                    </template>
                  </SettingRow>
                  <FieldSet legend="PDF без подписи">
                    <SettingRow data-setting="unsignedShow" :highlighted="hl('unsignedShow')">
                      <Checkbox :readonly="ro" :model-value="pdf.unsignedShow" @update:model-value="setS('pdf.unsignedShow', $event)">
                        Формировать PDF без подписи и показывать в приложении после экспертизы
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="unsignedMail" :highlighted="hl('unsignedMail')">
                      <Checkbox :readonly="ro" :model-value="pdf.unsignedMail" @update:model-value="setS('pdf.unsignedMail', $event)">
                        Отправлять PDF без подписи на почту
                      </Checkbox>
                    </SettingRow>
                  </FieldSet>
                </Card>

                <Card class="flex flex-col gap-4">
                  <Heading level="group">
                    Имя файла и вложения
                  </Heading>
                  <div class="flex flex-col gap-2" data-formula="pdfFileName">
                    <Field :readonly="ro" label="Формула имени PDF-документа" hint="Пустая формула — кнопка скачивания документа в приложении не покажется">
                      <FormulaInput
                        :model-value="pdf.fileName"
                        :variables="m.variables.value"
                        label="Формула имени PDF-документа"
                        placeholder="Текст и переменные"
                        @update:model-value="setS('pdf.fileName', $event)"
                      />
                    </Field>
                    <FormulaPreview :value="formulaPreview(pdf.fileName, m.variableSamples.value)" />
                  </div>
                  <SettingRow data-setting="attachExtra" :highlighted="hl('attachExtra')">
                    <Checkbox :readonly="ro" :model-value="pdf.attachExtra" @update:model-value="setS('pdf.attachExtra', $event)">
                      Прикреплять в конец документа PDF-файлы из дополнительных файлов
                    </Checkbox>
                  </SettingRow>
                </Card>
              </section>
            </template>

            </div>

            <!--
              «Назад / Далее» — № 15. Такт 100 (владелец, 2026-10-09, доска scheme-edit-batch2-v1; ревью Н-2, Т-3): по краям строки, с
              названиями соседних разделов — «← раздел» слева, «раздел →» справа; на первом разделе левой кнопки нет, на последнем — правой.
            -->
            <div class="flex items-center gap-4" data-section-steps>
              <Button v-if="prevSection" variant="secondary" :aria-label="`Предыдущий раздел: ${prevSection.label}`" data-act="section-prev" @click="step(-1)">
                ← {{ prevSection.label }}
              </Button>
              <Button v-if="nextSection" class="ml-auto" :aria-label="`Следующий раздел: ${nextSection.label}`" data-act="section-next" @click="step(1)">
                {{ nextSection.label }} →
              </Button>
            </div>
            <!--
              Такт 91 (5.4–5.5): низ этапа «Правила» — ручная отметка унаследованного и «Проверить и опубликовать» (последний этап
              с местом на странице).
            -->
            <div v-if="creatingNow" class="flex flex-wrap items-center justify-between gap-4" data-stage-next="rules">
              <Checkbox :model-value="m.draft.rulesChecked" data-field="rules-check" @update:model-value="m.setRulesChecked(!!$event)">
                {{ RULES_LABEL }}
              </Checkbox>
              <Button variant="outline" data-act="stage-publish" @click="m.goStage('publish')">
                {{ nextLabel(m.nextStage('rules')) }}
              </Button>
            </div>
          </div>

          <ReuseSettingsNav v-if="!phone && l1" />
        </div>
        <!--
          Вариант `l1-rail` (такт 101): навигатор под сайдом-слоем — рейка 48 вплотную к левому краю сайда (`right-modal-dock`): по строке
          на раздел — глиф и точка статуса, активный раздел — тональная кнопка, название — подсказкой; нажатие ведёт в раздел. Сборка
          из кита — `Card`, `IconButton`, `Tooltip`, `Indicator`; рейка — часть страницы, в кит не выносится.
        -->
        <Card v-if="navCovered && VARIANT === 'l1-rail'" class="fixed top-1/2 right-modal-dock z-40 flex -translate-y-1/2 flex-col gap-1 p-1" data-section-rail>
          <TooltipProvider>
            <div v-for="s in navSections" :key="s.id" class="flex items-center" :data-rail-section="s.id">
              <Tooltip>
                <TooltipTrigger as-child>
                  <IconButton :variant="m.ui.section === s.id ? 'secondary' : 'ghost'" size="md" :label="s.label" :aria-current="m.ui.section === s.id ? 'true' : undefined" @click="section = s.id">
                    <Icon :name="RAIL_ICON[s.id]" :size="16" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {{ s.label }}
                </TooltipContent>
              </Tooltip>
              <Indicator v-if="RAIL_TONE[m.sectionStatus.value[s.id]]" :variant="RAIL_TONE[m.sectionStatus.value[s.id]]" size="sm" />
            </div>
          </TooltipProvider>
        </Card>
      </TabsContent>

      <!-- ============================ «Форма» — № 39–42, 62, 70: группы слева, поля выбранной группы справа (r2 §5; макет `32765:5584`) ============================ -->
      <TabsContent value="form">
        <!-- Просмотр прошлой версии (такт 68, решение 3 такта 69): поля — «только чтение», действия — под `inert`; выбор группы работает. -->
        <!-- Узкий экран (такт 92): группы — над полями, выбор группы списком; поля — строками-карточками. -->
        <div class="flex items-start gap-2 pt-6 max-md:flex-col max-md:items-stretch max-md:gap-4" data-form :data-readonly="ro || undefined">
          <!-- Список групп — № 39: панель 192 (`32765:5586`), карандаш открывает сайд группы — № 68. -->
          <!-- Такт 99 (владелец, 2026-10-09, п. 2): список групп → «Добавить группу» — 16 (макет `32765:5586` — 8). -->
          <div class="flex w-group-list shrink-0 flex-col gap-4 max-md:w-full">
            <Card class="flex flex-col gap-1 p-1" data-groups>
              <div class="flex h-12 items-center justify-between gap-2 pr-2 pl-4">
                <Heading level="group">Группы</Heading>
                <div v-if="fg" :inert="ro" class="flex items-center gap-1">
                  <IconButton variant="ghost" size="md" label="Настройки группы" data-act="group-edit" @click="openGroup(fg.id)">
                    <Icon name="edit" :size="20" />
                  </IconButton>
                  <IconButton variant="ghost" size="md" label="Удалить группу" data-act="group-delete" @click="m.removeGroup(fg.id)">
                    <Icon name="delete" :size="20" />
                  </IconButton>
                </div>
              </div>
              <RadioGroup v-if="m.formGroups.value.length && !phone" v-model="groupValue" class="flex flex-col gap-0.5" data-radio="formGroup">
                <RadioGroupItem v-for="g in m.formGroups.value" :key="g.id" variant="card" :value="g.id" :checked="groupValue === g.id" :data-form-group="g.id">
                  {{ g.title }}
                  <template #description>
                    {{ g.alias || 'Алиас не задан' }}
                  </template>
                </RadioGroupItem>
              </RadioGroup>
              <div v-else-if="m.formGroups.value.length" class="px-3 pb-2" data-group-select>
                <Select v-model="groupValue" :items="groupItems" placeholder="Группа формы" :show-icon="false" :searchable="false" data-field="group-select" />
              </div>
              <!--
                Настройки группы — блок `33179:4467`: пары «подпись — значение» текстом — `FrameMeta layout="stack"` (ступень 1,
                решение оркестратора, довесок 1 к такту 69); правка — в сайде группы.
              -->
              <div v-if="fg" class="flex flex-col gap-2 px-3 pt-3 pb-3" data-group-settings>
                <Heading>Настройки группы</Heading>
                <FrameMeta layout="stack" :rows="groupMeta" />
              </div>
            </Card>
            <!-- Сверка дублей, такт 73: «Добавить …» — контурная кнопка с плюсом, как у остальных добавлений страницы. -->
            <Button v-if="m.formGroups.value.length" :inert="ro" variant="outline" show-icon class="w-full" data-act="group-add" @click="openGroup('')">
              <template #icon>
                <Icon name="add" :size="16" />
              </template>
              Добавить группу
            </Button>
          </div>

          <!-- Панель полей — № 40, 41: заголовок группы со счётом, действия, таблица полей (`32765:5628`). -->
          <Card class="flex min-w-0 flex-1 flex-col gap-4" data-fields-panel>
            <template v-if="fg">
              <!-- Счёт — слотом `meta` (карточка Б, такт 74): середина строчных, правило базовой линии. -->
              <Heading level="group" data-fields-title>
                {{ fg.title }}
                <template #meta>
                  {{ fieldsCount }}
                </template>
              </Heading>
              <div :inert="ro" class="flex flex-wrap items-start gap-2" data-fields-actions>
                <Button v-if="fg.fields.length" show-icon data-act="field-add" @click="openField('')">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  Добавить поле
                </Button>
                <!-- «Вставить из другой схемы» — № 70: с такта 88 сайд выбора из справочника (ревью 4.5; до такта 88 — заглушка, r2 §8). -->
                <Field hint="Алиас переносится целиком с группой">
                  <Button variant="outline" show-icon data-act="field-paste" @click="openPaste('fields')">
                    <template #icon>
                      <Icon name="copy" :size="16" />
                    </template>
                    Вставить из другой схемы
                  </Button>
                </Field>
                <Field hint="Только для пустых полей, не трогая заданные">
                  <Button variant="outline" show-icon data-act="fill-aliases" @click="m.fillAliases()">
                    <template #icon>
                      <Icon name="auto-fix" :size="16" />
                    </template>
                    Заполнить алиасы автоматически
                  </Button>
                </Field>
              </div>

              <!-- Массовый выбор — № 62: панель в потоке над таблицей, действия с «Отменить» в уведомлении. -->
              <ActionBar layout="panel" :open="selectedCount > 0" :count="selectedText" :inert="ro" data-fields-bar>
                <Button variant="secondary" data-act="bulk-required" @click="m.bulkFields('required')">
                  Сделать обязательными
                </Button>
                <Button variant="secondary" data-act="bulk-optional" @click="m.bulkFields('optional')">
                  Сделать необязательными
                </Button>
                <Button variant="secondary" data-act="bulk-web" @click="m.bulkFields('web')">
                  Только для web
                </Button>
                <Button variant="secondary" data-act="bulk-all-platforms" @click="m.bulkFields('all-platforms')">
                  Web и мобильное
                </Button>
                <Button variant="outline" data-act="bulk-clear" @click="m.clearFieldSelection()">
                  Снять выделение
                </Button>
                <!-- Сверка дублей, такт 73: подпись массового удаления — как у панели шагов (макет `32765:6576`). -->
                <Button variant="destructive" class="ml-auto" data-act="bulk-delete" @click="m.bulkFields('delete')">
                  Удалить выбранные
                </Button>
              </ActionBar>

              <Table v-if="fg.fields.length && !phone" data-fields-table :data-reorder-list="`fields:${fg.id}`">
                <TableRow>
                  <TableHead variant="column" class="w-10 pl-4" aria-label="Порядок полей" />
                  <TableHead variant="column" class="w-10 justify-center px-2" aria-label="Выбор полей группы">
                    <Checkbox
                      :readonly="ro"
                      :model-value="m.selectionState.value === 'all'"
                      :indeterminate="m.selectionState.value === 'some'"
                      data-fields-all
                      @update:model-value="m.toggleAllFields()"
                    />
                  </TableHead>
                  <TableHead variant="column" class="w-10 px-2">
                    №
                  </TableHead>
                  <TableHead variant="column" class="min-w-0 flex-1 px-4">
                    Поле
                  </TableHead>
                  <TableHead variant="column" class="w-36 px-4">
                    Алиас
                  </TableHead>
                  <TableHead variant="column" class="w-28 px-4">
                    Тип
                  </TableHead>
                  <TableHead variant="column" aria-label="Действия" :class="['justify-end px-4', FIELD_ACTIONS_COLUMN]" />
                </TableRow>
                <TableRow
                  v-for="(f, k) in fieldRows"
                  :key="f.id"
                  :state="m.ui.selectedFields.includes(f.id) ? 'selected' : 'default'"
                  :data-form-row="f.id"
                  :data-reorder-id="f.id"
                  :data-dragging="reorder.drag.value?.id === f.id || undefined"
                >
                  <!-- Ручка перестановки — такт 70 (макет `32765:5659`): протяжка мышью, Alt+↑ и Alt+↓ с клавиатуры. -->
                  <TableCell variant="slot" class="w-10 pl-4">
                    <IconButton
                      :inert="ro"
                      variant="service"
                      size="sm"
                      :label="`Переставить поле «${f.title}»`"
                      :data-reorder-handle="f.id"
                      @pointerdown="reorder.start($event, `fields:${fg.id}`, f.id, fg.fields.map(x => x.id))"
                      @keydown="reorder.key($event, `fields:${fg.id}`, f.id, fg.fields.map(x => x.id))"
                    >
                      <Icon name="drag" :size="12" />
                    </IconButton>
                  </TableCell>
                  <TableCell variant="slot" class="w-10 justify-center px-2">
                    <Checkbox :readonly="ro" :model-value="m.ui.selectedFields.includes(f.id)" :aria-label="f.title" @update:model-value="m.toggleField(f.id)" />
                  </TableCell>
                  <TableCell class="w-10 px-2" data-row-number>
                    {{ k + 1 }}
                  </TableCell>
                  <!--
                    Метаданные строки — метками у названия: обязательность, «только web», согласование; признак «зависимое»
                    возвращён в строку поля (r2 §1, строка 17 реестра).
                  -->
                  <TableCell variant="slot" class="min-w-0 flex-1 gap-2 px-4">
                    <TableCellIdentity class="flex-initial">
                      {{ f.title }}
                    </TableCellIdentity>
                    <!-- «Где увидит исполнитель» — такт 89 (решение 7): «?» с превью — экран анкеты с обведённым полем. -->
                    <HelpPreview v-bind="fieldBind(f.id)" @update:open="setHelp(`field:${f.id}`, $event)" @action="demoFromHelp(fieldHelp(f.id))">
                      <template v-if="fieldHelp(f.id)?.screen" #default>
                        <AppPreviewScreen fragment size="md" :screen="fieldHelp(f.id)?.screen" :marked="fieldHelp(f.id)?.mark" />
                      </template>
                    </HelpPreview>
                    <Badge v-if="f.required" size="sm" data-badge="required">
                      Обязательное
                    </Badge>
                    <Badge v-if="f.webOnly" size="sm" variant="neutral" data-badge="web">
                      Только web
                    </Badge>
                    <Badge v-if="f.approval" size="sm" variant="neutral" data-badge="approval">
                      Согласование
                    </Badge>
                    <Badge v-if="f.dependent" size="sm" variant="neutral" data-badge="dependent">
                      Зависимое
                    </Badge>
                  </TableCell>
                  <TableCell class="w-36 px-4" data-field-alias>
                    {{ f.alias || 'не задан' }}
                  </TableCell>
                  <TableCell variant="slot" class="w-28 px-4">
                    <Chip variant="neutral">
                      {{ typeLabel(f.type) }}
                    </Chip>
                  </TableCell>
                  <TableCell variant="slot" :class="['justify-end px-4', FIELD_ACTIONS_COLUMN]">
                    <TableRowActions :inert="ro" :actions="FIELD_ACTIONS" @edit="openField(f.id)" @action="m.removeField(fg.id, f.id)" />
                  </TableCell>
                </TableRow>
              </Table>
              <!--
                Узкий экран (такт 92; решение 5): поля — строками-карточками `Card size="sm"`: номер и название, алиас и тип, признаки;
                «⋯» — правка в сайде на весь экран и удаление. Перестановки и выбора нескольких на телефоне нет — правка структуры редкая.
              -->
              <div v-else-if="fg.fields.length" class="flex flex-col gap-2" data-fields-cards>
                <Card v-for="(f, k) in fieldRows" :key="f.id" size="sm" class="flex items-start gap-3" :data-form-row="f.id">
                  <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <div class="flex min-w-0 items-start gap-2">
                      <TableCellIdentity>
                        {{ k + 1 }}. {{ f.title }}
                        <template #description>
                          {{ f.alias || 'алиас не задан' }} · {{ typeLabel(f.type) }}
                        </template>
                      </TableCellIdentity>
                      <HelpPreview v-bind="fieldBind(f.id)" @update:open="setHelp(`field:${f.id}`, $event)" @action="demoFromHelp(fieldHelp(f.id))">
                        <template v-if="fieldHelp(f.id)?.screen" #default>
                          <AppPreviewScreen fragment size="md" :screen="fieldHelp(f.id)?.screen" :marked="fieldHelp(f.id)?.mark" />
                        </template>
                      </HelpPreview>
                    </div>
                    <div v-if="f.required || f.webOnly || f.approval || f.dependent" class="flex flex-wrap items-center gap-2">
                      <Badge v-if="f.required" size="sm" data-badge="required">
                        Обязательное
                      </Badge>
                      <Badge v-if="f.webOnly" size="sm" variant="neutral" data-badge="web">
                        Только web
                      </Badge>
                      <Badge v-if="f.approval" size="sm" variant="neutral" data-badge="approval">
                        Согласование
                      </Badge>
                      <Badge v-if="f.dependent" size="sm" variant="neutral" data-badge="dependent">
                        Зависимое
                      </Badge>
                    </div>
                  </div>
                  <Popover :open="cardMenu === `field:${f.id}`" @update:open="cardMenu = $event ? `field:${f.id}` : ''">
                    <PopoverTrigger as-child>
                      <IconButton :inert="ro" variant="service" size="lg" :label="`Действия с полем «${f.title}»`" data-act="card-menu">
                        <Icon name="more" :size="20" />
                      </IconButton>
                    </PopoverTrigger>
                    <PopoverContent data-menu="card" align="end" :side-offset="4" class="p-1">
                      <SelectGroup>
                        <SelectItem data-action="edit" @click="cardAct(() => openField(f.id))">
                          Изменить поле
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup data-section="danger">
                        <SelectItem tone="destructive" data-action="delete" @click="cardAct(() => m.removeField(fg!.id, f.id))">
                          Удалить поле
                        </SelectItem>
                      </SelectGroup>
                    </PopoverContent>
                  </Popover>
                </Card>
              </div>
              <!-- Пустые состояния — № 65 (аудит, «Пустые состояния»): «В группе нет полей» + «Добавить поле». -->
              <Empty v-else title="В группе нет полей" description="Добавьте первое поле группы" data-fields-empty>
                <template #action>
                  <Button :inert="ro" show-icon data-act="field-add-empty" @click="openField('')">
                    <template #icon>
                      <Icon name="add" :size="16" />
                    </template>
                    Добавить поле
                  </Button>
                </template>
              </Empty>
            </template>
            <Empty v-else title="В форме нет групп" description="Добавьте первую группу — поля формы живут в группах" data-groups-empty>
              <template #action>
                <Button :inert="ro" show-icon data-act="group-add-empty" @click="openGroup('')">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  Добавить группу
                </Button>
              </template>
            </Empty>
          </Card>
        </div>
        <!-- Такт 91 (5.5): «Далее» внизу этапа «Анкета». -->
        <div v-if="creatingNow" class="flex pt-6" data-stage-next="form">
          <Button variant="outline" data-act="stage-next-form" @click="m.goStage('shooting')">
            {{ nextLabel(m.nextStage('form')) }}
          </Button>
        </div>
      </TabsContent>

      <!-- ============================ «Процессы и шаги» — № 43–47, 61: процессы карточками с таблицей шагов (r2 §6; макет `32765:6552`) ============================ -->
      <TabsContent value="processes">
        <!-- Просмотр прошлой версии (решение 4 такта 70, правило строк 108 и 125): флажки — «только чтение», действия — под `inert`. -->
        <div class="flex flex-col gap-3 pt-6" data-processes :data-readonly="ro || undefined">
          <!--
            Действия таба — № 43 (`32765:6553`): «Заполнить изображения» — сайд массовой заливки фото-подсказок (такт 87, 4.4; до такта
            87 — заглушка r2 §9), «Вставить шаг из другой схемы» — № 70.
          -->
          <div :inert="ro" class="flex flex-wrap items-center gap-3" data-processes-actions>
            <Button v-if="m.processes.value.length" variant="outline" show-icon data-act="process-add" @click="openProcess('')">
              <template #icon>
                <Icon name="add" :size="16" />
              </template>
              Добавить процесс
            </Button>
            <Button variant="outline" show-icon data-act="step-paste" @click="openPaste('steps')">
              <template #icon>
                <Icon name="copy" :size="16" />
              </template>
              Вставить шаг из другой схемы
            </Button>
            <Button variant="outline" show-icon class="ml-auto max-md:ml-0" data-act="fill-images" @click="openFill()">
              <template #icon>
                <Icon name="auto-fix" :size="16" />
              </template>
              Заполнить изображения
            </Button>
          </div>

          <!--
            Панель массовых действий — № 44 (`32765:6576`): выделение идёт сквозь процессы. Флаги — флажки трёх состояний:
            «все» — у всех выбранных, «−» — у части; нажатие из «все» снимает, иначе ставит всем. «Фото» — способ съёмки
            выбранных (строка 128). Действие — уведомление «Применено к N шагам» с «Отменить» (№ 61).
          -->
          <ActionBar layout="panel" :open="stepsCount > 0" :count="stepsText" :inert="ro" data-steps-bar>
            <div class="flex w-full min-w-0 flex-col gap-3">
              <Field label="Флаги" :orientation="phone ? 'top' : 'left'" :control-height="20" data-steps-flags>
                <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <Checkbox
                    v-for="f in STEP_FLAGS"
                    :key="f.key"
                    :model-value="m.flagState(f.key) === 'all'"
                    :indeterminate="m.flagState(f.key) === 'some'"
                    :data-flag="f.key"
                    @update:model-value="m.bulkFlag(f.key)"
                  >
                    {{ f.label }}
                  </Checkbox>
                </div>
              </Field>
              <div class="flex flex-wrap items-center gap-2">
                <Field label="Фото" :orientation="phone ? 'top' : 'left'" :control-height="40" data-field="bulkMethod">
                  <div class="w-50">
                    <Select :model-value="''" :items="STEP_METHODS" placeholder="Способ съёмки" :show-icon="false" :searchable="false" @update:model-value="m.bulkMethod(String($event))" />
                  </div>
                </Field>
                <Button variant="secondary" data-act="bulk-networks" @click="openNetworks()">
                  Настроить нейросети
                </Button>
                <!-- Такт 87, решение 5: массовая заливка только выбранных шагов. -->
                <Button variant="secondary" data-act="bulk-fill" @click="openFill(m.ui.selectedSteps)">
                  Заполнить изображения
                </Button>
                <Button variant="outline" data-act="steps-clear" @click="m.clearStepSelection()">
                  Снять выделение
                </Button>
                <Button variant="destructive" class="ml-auto" data-act="steps-delete" @click="m.bulkDeleteSteps()">
                  Удалить выбранные
                </Button>
              </div>
            </div>
          </ActionBar>

          <!-- Ноль процессов — № 65 (аудит, «Пустые состояния»): пустое состояние с «Добавить процесс». -->
          <Card v-if="!m.processes.value.length" data-processes-empty>
            <Empty title="В схеме нет процессов" description="Процесс — этап осмотра со своими шагами съёмки; добавьте первый">
              <template #action>
                <Button :inert="ro" show-icon data-act="process-add-empty" @click="openProcess('')">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  Добавить процесс
                </Button>
              </template>
            </Empty>
          </Card>

          <!-- Карточка процесса — № 45 (`32765:6623`, `32765:6922`, `32765:7066`): шапка и таблица шагов. -->
          <Card v-for="p in m.processes.value" :key="p.id" class="flex flex-col gap-4" :data-process="p.id">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <Heading data-process-title>
                  {{ p.title }}
                  <template #meta>
                    {{ stepsWord(p.steps.length) }}
                  </template>
                </Heading>
                <Chip variant="neutral" data-process-alias>
                  {{ p.alias }}
                </Chip>
                <Badge v-if="p.repeatable" variant="success" data-badge="repeatable">
                  Повторяемый
                </Badge>
                <!-- «Скрытый процесс» сайда (такт 71) виден меткой в шапке — прецедент флагов шага (строка 135). -->
                <Badge v-if="p.hidden" variant="neutral" data-badge="hidden">
                  Скрытый
                </Badge>
              </div>
              <!-- Узкий экран (такт 92): действия процесса переносятся строкой под заголовком. -->
              <div class="flex shrink-0 items-center gap-3 max-md:shrink max-md:flex-wrap">
                <!-- «Открыть процесс» — полноэкранный оверлей повторяемого (№ 64, такт 71); чтение, поэтому и в просмотре версии. -->
                <Button v-if="p.repeatable" variant="outline" show-icon data-act="process-open" @click="openOverlay(p.id)">
                  <template #icon>
                    <Icon name="article" :size="16" />
                  </template>
                  Открыть процесс
                </Button>
                <div :inert="ro" class="flex items-center gap-3 max-md:flex-wrap">
                  <!-- «Добавить шаг» у обычного процесса — сайд нового шага (такт 71, строка 150); у повторяемого шаги правит оверлей. -->
                  <Button v-if="!p.repeatable" variant="outline" show-icon data-act="step-add" @click="openStep(p.id, '')">
                    <template #icon>
                      <Icon name="add" :size="16" />
                    </template>
                    Добавить шаг
                  </Button>
                  <Button variant="outline" show-icon data-act="process-edit" @click="openProcess(p.id)">
                    <template #icon>
                      <Icon name="edit" :size="16" />
                    </template>
                    Изменить процесс
                  </Button>
                  <IconButton variant="ghost" size="lg" :label="`Удалить процесс «${p.title}»`" data-act="process-delete" @click="m.removeProcess(p.id)">
                    <Icon name="delete" :size="20" />
                  </IconButton>
                </div>
              </div>
            </div>

            <!--
              Таблица шагов — № 46 (`32765:6642`, `32765:6652`): ручка, выбор, номер, название с описанием и типом шага, способ,
              нейросети, фото-подсказка, действия. Строку растит ячейка названия; соседние стоят у первой линии (ось `start`).
            -->
            <Table v-if="p.steps.length && !phone" :data-steps-table="p.id" :data-reorder-list="`steps:${p.id}`">
              <TableRow>
                <TableHead variant="column" class="w-10 pl-4" aria-label="Порядок шагов" />
                <TableHead variant="column" class="w-10 justify-center px-2" aria-label="Выбор шагов процесса">
                  <Checkbox
                    :readonly="ro"
                    :model-value="m.processSelection(p.id) === 'all'"
                    :indeterminate="m.processSelection(p.id) === 'some'"
                    :data-steps-all="p.id"
                    @update:model-value="m.toggleProcessSteps(p.id)"
                  />
                </TableHead>
                <TableHead variant="column" class="w-10 px-2">
                  №
                </TableHead>
                <TableHead variant="column" class="min-w-0 flex-1 px-4">
                  Название · тип шага
                </TableHead>
                <TableHead variant="column" class="w-28 px-4">
                  Способ
                </TableHead>
                <TableHead variant="column" class="w-44 px-4">
                  Нейросети
                </TableHead>
                <TableHead variant="column" class="w-44 px-4">
                  Фото-подсказка
                </TableHead>
                <TableHead variant="column" aria-label="Действия" :class="['justify-end px-4', STEP_ACTIONS_COLUMN]" />
              </TableRow>
              <TableRow
                v-for="(st, k) in reorder.ordered(`steps:${p.id}`, p.steps)"
                :key="st.id"
                :state="m.ui.selectedSteps.includes(st.id) ? 'selected' : 'default'"
                :data-step-row="st.id"
                :data-reorder-id="st.id"
                :data-dragging="reorder.drag.value?.id === st.id || undefined"
              >
                <!-- Ручка перестановки — решение 3 оркестратора (макет `32765:6653`): протяжка мышью, Alt+↑ и Alt+↓ с клавиатуры. -->
                <TableCell variant="slot" align="start" class="w-10 pl-4">
                  <IconButton
                    :inert="ro"
                    variant="service"
                    size="sm"
                    :label="`Переставить шаг «${st.title}»`"
                    :data-reorder-handle="st.id"
                    @pointerdown="reorder.start($event, `steps:${p.id}`, st.id, p.steps.map(x => x.id))"
                    @keydown="reorder.key($event, `steps:${p.id}`, st.id, p.steps.map(x => x.id))"
                  >
                    <Icon name="drag" :size="12" />
                  </IconButton>
                </TableCell>
                <TableCell variant="slot" align="start" class="w-10 justify-center px-2">
                  <Checkbox :readonly="ro" :model-value="m.ui.selectedSteps.includes(st.id)" :aria-label="st.title" @update:model-value="m.toggleStep(st.id)" />
                </TableCell>
                <TableCell align="start" class="w-10 px-2" data-row-number>
                  {{ k + 1 }}
                </TableCell>
                <!--
                  Название, описание, тип шага списком у метки и флаги метками — ячейка растит строку. Колонка тянется, а таблица
                  стоит на `min-w-max`: `contain-inline-size` не даёт длинному описанию растянуть строку за карточку.
                -->
                <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start gap-2 px-4 pt-4.5 pb-3 contain-inline-size" data-step-name>
                  <TableCellIdentity class="w-full flex-none">
                    {{ st.title }}
                    <template v-if="st.description" #description>
                      {{ st.description }}
                    </template>
                  </TableCellIdentity>
                  <div class="flex flex-wrap items-center gap-2">
                    <Popover :open="kindOpen === st.id" @update:open="kindOpen = $event ? st.id : ''">
                      <PopoverTrigger as="span" as-child>
                        <Chip trailing="expand" :expanded="kindOpen === st.id" :inert="ro" data-step-kind>
                          {{ kindLabel(st.kind) }}
                        </Chip>
                      </PopoverTrigger>
                      <PopoverContent :data-kind-menu="st.id" align="start" :side-offset="4" class="p-1">
                        <SelectItem v-for="x in STEP_KINDS" :key="x.value" :selected="x.value === st.kind" :data-kind="x.value" @click="pickKind(p.id, st.id, x.value)">
                          {{ x.label }}
                        </SelectItem>
                      </PopoverContent>
                    </Popover>
                    <template v-for="f in STEP_FLAGS" :key="f.key">
                      <Badge v-if="st[f.key]" size="sm" :variant="f.key === 'required' ? 'default' : 'neutral'" :data-badge="f.key">
                        {{ f.label }}
                      </Badge>
                    </template>
                  </div>
                </TableCell>
                <TableCell align="start" class="w-28 px-4" data-step-method>
                  {{ st.method }}
                </TableCell>
                <!-- Нейросети строками 13/16 (макет `32765:6684`): длинное имя обрезается с подсказкой; «Настроить нейросети» — сайд шага, секция «Нейросети». -->
                <TableCell variant="slot" class="h-auto w-44 flex-col items-start gap-1 px-4 pt-4.5 pb-3" data-step-networks>
                  <TableCellText v-for="n in st.networks" :key="n" size="sm" class="w-full">
                    {{ n }}
                  </TableCellText>
                  <ToolbarText v-if="!st.networks.length" data-networks-empty>
                    Нейросети не выбраны
                  </ToolbarText>
                  <div :inert="ro" class="flex pt-1">
                    <ButtonAction size="sm" :show-icon="false" data-act="step-networks" @click="openStep(p.id, st.id, false, 'networks')">
                      Настроить нейросети
                    </ButtonAction>
                  </div>
                </TableCell>
                <!--
                  Фото-подсказка — № 47 (`32765:6709`, `32765:6773`): статус на месте, загрузка инлайн в ячейке, без «Сохранить». Такт 87
                  (Ш-5, решения 4 и 6): до трёх миниатюр и «+N» — `ThumbStrip`, нажатие — просмотр крупно; «Загрузить» и «Выбрать из
                  каталога» рядом — у шага с подсказками тоже (удаление — в сайде шага, раздел «Фото-подсказки»).
                -->
                <TableCell variant="slot" class="h-auto w-44 flex-col items-start gap-2 px-4 pt-4 pb-3" :data-step-hints="st.hints.length">
                  <Badge size="sm" :variant="st.hints.length ? 'success' : 'warning'" data-hint-status>
                    {{ hintStatus(st.hints.length) }}
                  </Badge>
                  <ThumbStrip v-if="st.hints.length" :items="thumbs(st.hints)" :label="`Фото-подсказки шага «${st.title}»`" :data-hint-thumbs="st.id" @open="viewHints(st.hints, $event)" />
                  <div :inert="ro" class="flex w-full flex-col items-start gap-1">
                    <ButtonAction size="sm" :show-icon="false" data-act="hint-upload" @click="toggleUpload(st.id)">
                      {{ uploadOpen === st.id ? 'Свернуть' : 'Загрузить' }}
                    </ButtonAction>
                    <ButtonAction size="sm" :show-icon="false" data-act="hint-catalog" @click="openCatalog('cell', p.id, st.id)">
                      Выбрать из каталога
                    </ButtonAction>
                    <button
                      v-if="uploadOpen === st.id"
                      type="button"
                      class="w-full pt-1"
                      :data-upload-zone="st.id"
                      @click="upload(p.id, st.id)"
                      @dragover.prevent
                      @drop.prevent="dropFiles($event, p.id, st.id)"
                    >
                      <FileUpload>
                        {{ st.hints.length ? 'Добавить подсказку' : 'Загрузить подсказку' }}
                        <template #hint>
                          или перетащите файл сюда
                        </template>
                      </FileUpload>
                    </button>
                  </div>
                </TableCell>
                <TableCell variant="slot" align="start" :class="['justify-end px-4', STEP_ACTIONS_COLUMN]">
                  <TableRowActions :inert="ro" :actions="STEP_ACTIONS" @edit="openStep(p.id, st.id)" @action="m.removeStep(p.id, st.id)" />
                </TableCell>
              </TableRow>
            </Table>
            <!-- Узкий экран (такт 92; решение 5): шаги — строками-карточками; правка — в сайде шага на весь экран. -->
            <div v-else-if="p.steps.length" class="flex flex-col gap-2" :data-steps-cards="p.id">
              <ReuseStepCard
                v-for="(st, k) in p.steps"
                :key="st.id"
                :st="st"
                :k="k"
                :overlay="false"
                :edit="() => openStep(p.id, st.id)"
                :remove="() => m.removeStep(p.id, st.id)"
              />
            </div>
          </Card>
        </div>
        <!-- Такт 91 (5.5): «Далее» внизу этапа «Съёмка». -->
        <div v-if="creatingNow" class="flex pt-6" data-stage-next="shooting">
          <Button variant="outline" data-act="stage-next-shooting" @click="m.goStage('rules')">
            {{ nextLabel(m.nextStage('shooting')) }}
          </Button>
        </div>
      </TabsContent>

      <!-- ============================ «Витрина» — № 50–53, 72 (r2 §7; макет `32765:11378`; аудит, «Таб „Витрина“») ============================ -->
      <TabsContent value="showcase">
        <!-- Просмотр прошлой версии (решение 4 такта 72, правило строк 108, 125, 138): поля — «только чтение», действия — под `inert`. -->
        <div class="flex flex-col gap-3 pt-6" data-showcase :data-readonly="ro || undefined">
          <!--
            Статус карточки — № 50 (`32765:11448`): `Callout` в тоне статуса (строка 32). «Опубликовать на витрину» — «вооружает»:
            выключена, пока схема не опубликована в ядре; причина — текстом плашки (макет: «Доступно после публикации схемы в ядре»).
          -->
          <!--
            Такт 90 (решение 5): «Предпросмотр страницы» — у статуса витрины, всегда и в просмотре версии (страница по снимку);
            «Опубликовать на витрину» — до публикации карточки, в просмотре версии под `inert`.
          -->
          <!-- Узкий экран (такт 92): действия статуса — строкой под текстом (`narrow="stack"`). -->
          <Callout :tone="CARD_TONE[sc.status]" :title="`Статус витрины: ${SHOWCASE_STATUS[sc.status]}`" narrow="stack" data-showcase-status>
            {{ cardText }}
            <template #actions>
              <div class="flex flex-wrap gap-3">
                <Button variant="outline" show-icon data-act="site-preview" @click="m.openSite()">
                  <template #icon>
                    <Icon name="visibility" :size="16" />
                  </template>
                  Предпросмотр страницы
                </Button>
                <div v-if="sc.status !== 'published'" :inert="ro" class="flex">
                  <Button variant="secondary" :disabled="!!m.showcaseReason.value" data-act="publish-showcase" @click="m.publishShowcase()">
                    Опубликовать на витрину
                  </Button>
                </div>
              </div>
            </template>
          </Callout>

          <!-- Витринная карточка — № 51, 72 (`32765:11470`): строки «подпись слева — поле», теги каскадом «Индустрия → Сфера → Объект». -->
          <Card class="flex flex-col gap-6" data-showcase-card>
            <Heading level="group" description="Публичное представление схемы для клиентов и менеджеров продаж">
              Витринная карточка
            </Heading>
            <Field :readonly="ro" label="Продающее название" :orientation="phone ? 'top' : 'left'" label-width="form" hint="Отличается от технического наименования схемы" data-field="scTitle">
              <Input :model-value="sc.title" placeholder="" :show-icon="false" @update:model-value="m.setShowcase('title', String($event ?? ''))" />
            </Field>
            <Field :readonly="ro" label="Краткое описание" :orientation="phone ? 'top' : 'left'" label-width="form" data-field="scSummary">
              <Textarea :model-value="sc.summary" placeholder="1–2 предложения для карточки на витрине" @update:model-value="m.setShowcase('summary', String($event ?? ''))" />
            </Field>
            <Field :readonly="ro" label="Изображение" :orientation="phone ? 'top' : 'left'" label-width="form" hint="Релевантное фото объекта. JPEG или PNG, до 5 МБ" data-field="scImage">
              <button type="button" class="w-full" :inert="ro" data-act="showcase-image" @click="m.setShowcase('image', SHOWCASE_IMAGE)">
                <FileUpload>
                  {{ sc.image ? `Изображение загружено · ${sc.image}` : 'Загрузить изображение' }}
                  <template #hint>
                    {{ sc.image ? 'нажмите, чтобы заменить' : 'перетащите файл сюда или нажмите для загрузки' }}
                  </template>
                </FileUpload>
              </button>
            </Field>
            <!--
              Цена «от» — № 106 (такт 90, ревью 4.7; решение 3): источник — радио-карточки, как «Дедлайн проверки» (№ 23); под ними —
              цена из тарифа (`PriceRange` и «Открыть тарификацию») либо ручная цена с предупреждением ниже тарифа.
            -->
            <Field :readonly="ro" label="Цена «от»" :orientation="phone ? 'top' : 'left'" label-width="form" data-field="scPrice">
              <div class="flex flex-col gap-3">
                <RadioGroup v-model="priceSource" :readonly="ro" class="grid grid-cols-3 max-md:grid-cols-1 gap-2" data-radio="priceSource">
                  <RadioGroupItem v-for="x in PRICE_SOURCES" :key="x.value" variant="card" :value="x.value" :checked="priceSource === x.value" :data-price-source="x.value">
                    {{ x.label }}
                    <template #description>
                      {{ x.description }}
                    </template>
                  </RadioGroupItem>
                </RadioGroup>
                <div v-if="priceSource === 'tariff'" class="flex flex-wrap items-baseline gap-x-6 gap-y-2" data-price-tariff>
                  <PriceRange label="На витрине" :min="price.value" :note="tariffNote" />
                  <Hyperlink :href="tariffLink" target="_blank" rel="noopener" size="sm" data-link="tariffs">
                    Открыть тарификацию
                  </Hyperlink>
                </div>
                <Field
                  v-else-if="priceSource === 'manual'"
                  :readonly="ro"
                  :hint="price.warning || price.hint"
                  :hint-tone="price.warning ? 'warning' : 'default'"
                  data-field="scPriceValue"
                >
                  <div class="w-price-input">
                    <Input :model-value="sc.priceFrom == null ? '' : String(sc.priceFrom)" placeholder="" unit="₽" numeric :show-icon="false" @update:model-value="setPrice(String($event ?? ''))" />
                  </div>
                </Field>
              </div>
            </Field>
            <Field :readonly="ro" label="Теги" :orientation="phone ? 'top' : 'left'" label-width="form">
              <div class="grid grid-cols-3 max-md:grid-cols-1 gap-3">
                <Field :readonly="ro" label="Индустрия" data-field="scIndustry">
                  <Select :model-value="sc.industry" :items="INDUSTRIES" :placeholder="sc.industry ? '' : 'Выберите индустрию'" :show-icon="false" :searchable="false" @update:model-value="m.setIndustry(String($event))" />
                </Field>
                <Field :readonly="ro" label="Сфера применения" :hint="sc.industry ? '' : 'Сначала выберите индустрию'" data-field="scSpheres">
                  <Select :values="sc.spheres" multiple :items="sphereItems" :disabled="!sc.industry" placeholder="Выберите сферы" @update:values="m.setShowcase('spheres', $event)" />
                </Field>
                <Field readonly label="Объект" :hint="`Подтянут из типа схемы «${schemeTypeLabel}»`" data-field="scObject">
                  <Select :model-value="general.schemeType" :items="objectItems" placeholder="" :show-icon="false" :searchable="false" />
                </Field>
              </div>
            </Field>
          </Card>

          <!-- «Зачем нужен осмотр» — № 52 (`32765:11572`): предзаполнено шаблоном по типу объекта; четыре пары, метрики. -->
          <Card class="flex flex-col gap-6" data-showcase-why>
            <Heading level="group" description="Обоснование ценности для клиента — предзаполнено шаблоном по типу объекта">
              Зачем нужен осмотр
            </Heading>
            <Callout data-template-note>
              {{ m.fromTemplate.value ? `Заполнено шаблоном для типа «${schemeTypeLabel}» — отредактируйте текст под конкретный кейс или оставьте как есть` : `Текст отличается от шаблона для типа «${schemeTypeLabel}»` }}
              <template v-if="!m.fromTemplate.value" #actions>
                <div :inert="ro" class="flex">
                  <Button variant="secondary" size="sm" data-act="showcase-template" @click="m.applyTemplate()">
                    Заполнить шаблоном
                  </Button>
                </div>
              </template>
            </Callout>
            <Field :readonly="ro" label="Развёрнутое описание" data-field="scDescription">
              <Textarea :model-value="sc.description" placeholder="Подробное описание ценности осмотра для клиента" @update:model-value="m.setShowcase('description', String($event ?? ''))" />
            </Field>
            <div class="flex flex-col gap-3">
              <Heading>Проблемы и решения</Heading>
              <div class="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                <Card v-for="(p, k) in sc.problems" :key="k" tone="muted" class="flex flex-col gap-3 p-4" :data-problem="k">
                  <Field :readonly="ro" label="Проблема" :data-field="`scProblem${k}`">
                    <Input :model-value="p.problem" placeholder="" :show-icon="false" @update:model-value="m.setProblem(k, 'problem', String($event ?? ''))" />
                  </Field>
                  <Field :readonly="ro" label="Последствия" :data-field="`scEffect${k}`">
                    <Input :model-value="p.effect" placeholder="" :show-icon="false" @update:model-value="m.setProblem(k, 'effect', String($event ?? ''))" />
                  </Field>
                  <Field :readonly="ro" label="Решение" :data-field="`scSolution${k}`">
                    <Input :model-value="p.solution" placeholder="" :show-icon="false" @update:model-value="m.setProblem(k, 'solution', String($event ?? ''))" />
                  </Field>
                </Card>
              </div>
            </div>
            <!-- Такт 99 (владелец, 2026-10-09, п. 2): заголовок и строки метрик — через 12; список → «Добавить метрику» — 16. -->
            <div class="flex flex-col gap-4" data-metrics>
              <div class="flex flex-col gap-3">
                <Heading>Метрики</Heading>
                <div v-for="(x, k) in sc.metrics" :key="k" class="flex items-end gap-3" :data-metric="k">
                  <Field :readonly="ro" :label="k === 0 ? 'Метрика' : ''" class="min-w-0 flex-1" :data-field="`scMetric${k}`">
                    <Input :model-value="x.label" placeholder="" :show-icon="false" @update:model-value="m.setMetric(k, 'label', String($event ?? ''))" />
                  </Field>
                  <Field :readonly="ro" :label="k === 0 ? 'Значение' : ''" class="w-40 shrink-0" :data-field="`scMetricValue${k}`">
                    <Input :model-value="x.value" placeholder="" :show-icon="false" @update:model-value="m.setMetric(k, 'value', String($event ?? ''))" />
                  </Field>
                  <IconButton :inert="ro" variant="ghost" size="lg" :label="`Удалить метрику «${x.label}»`" data-act="metric-delete" @click="m.removeMetric(k)">
                    <Icon name="delete" :size="20" />
                  </IconButton>
                </div>
              </div>
              <div :inert="ro" class="flex">
                <Button variant="outline" show-icon data-act="metric-add" @click="m.addMetric()">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  Добавить метрику
                </Button>
              </div>
            </div>
          </Card>

          <!-- «Из схемы» — № 53 (`32765:11704`): модули подтянуты из настроек и скрываются на витрине; «Как устроена схема» — только чтение. -->
          <Card class="flex flex-col gap-6" data-showcase-from>
            <Heading level="group" description="Данные подтянуты из настроек схемы в ядре; на витрине их можно скрыть">
              Из схемы
            </Heading>
            <Field :readonly="ro" label="ИИ-модули и проверки" hint="Из настроек схемы — модуль можно скрыть на витрине" data-field="scModules">
              <div class="flex flex-wrap gap-2">
                <Chip v-for="x in m.visibleModules.value" :key="x.key" :trailing="ro ? 'none' : 'remove'" :data-module="x.key" @remove="m.hideModule(x.key)">
                  {{ x.label }}
                </Chip>
                <ToolbarText v-if="!m.visibleModules.value.length">
                  Модулей для показа нет
                </ToolbarText>
              </div>
            </Field>
            <Field v-if="m.hiddenModules.value.length" :readonly="ro" label="Скрыто на витрине" data-field="scHidden">
              <div :inert="ro" class="flex flex-wrap gap-2">
                <Button v-for="x in m.hiddenModules.value" :key="x.key" variant="outline" size="sm" show-icon :data-module-show="x.key" @click="m.showModule(x.key)">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  {{ x.label }}
                </Button>
              </div>
            </Field>
            <Field :readonly="ro" label="Как устроена схема" hint="Формируется автоматически из статусов схемы — правка в «Настройках»" data-field="scFlow">
              <Card tone="muted" class="flex flex-wrap items-center gap-2 p-4" data-flow>
                <template v-for="(s, k) in m.flow.value" :key="s">
                  <Icon v-if="k" name="arrow-forward" :size="12" />
                  <Chip variant="neutral">
                    {{ s }}
                  </Chip>
                </template>
              </Card>
            </Field>
          </Card>
        </div>
      </TabsContent>
    </Tabs>

    <!-- ============================ сайд словаря комментариев — № 69 ============================ -->
    <ModalCard v-model:open="sideOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="comments">
        <ModalCardHeader title="Словарь комментариев" subtitle="Привязка словаря к схеме" />
        <ModalCardBody class="flex flex-col gap-6">
          <Field label="Словарь" data-field="sideDict">
            <Select v-model="sideDict" :items="COMMENT_DICTIONARIES" placeholder="" :show-icon="false" :searchable="false" />
          </Field>
          <FieldSet :legend="`Комментарии словаря: ${sideComments.length}`">
            <div class="flex flex-wrap gap-2" data-side-comments>
              <Chip v-for="c in sideComments" :key="c" variant="neutral">
                {{ c }}
              </Chip>
            </div>
          </FieldSet>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="side-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="side-save" @click="saveSide()">
            Сохранить
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ сайд шаблона PDF — № 38 ============================ -->
    <ModalCard v-model:open="templateOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="template">
        <ModalCardHeader :title="tpl.id ? `Редактирование шаблона — ${tplTitle}` : 'Добавление шаблона'" />
        <ModalCardBody class="flex flex-col gap-4">
          <Field label="Отображаемое название" required :invalid="tplInvalid" :hint="tplInvalid ? 'Заполните отображаемое название' : ''">
            <Input v-model="tpl.title" placeholder="Например, Акт осмотра" :show-icon="false" :invalid="tplInvalid" data-field="tplTitle" />
          </Field>
          <Field label="Программный шаблон" data-field="tplProgram">
            <Select v-model="tpl.template" :items="PDF_PROGRAMS" placeholder="" :show-icon="false" :searchable="false" />
          </Field>
          <Checkbox v-model="tpl.main" data-field="tplMain">
            Является основным шаблоном
          </Checkbox>
          <Field label="Доступно ролям">
            <RadioGroup v-model="tpl.role" data-radio="tplRole">
              <RadioGroupItem v-for="r in ROLE_LADDER" :key="r.value" :value="r.value" :checked="tpl.role === r.value">
                {{ r.label }}
              </RadioGroupItem>
            </RadioGroup>
          </Field>
          <Field label="Когда доступен" data-field="tplWhen">
            <Select v-model="tpl.when" :items="PDF_WHEN" placeholder="" :show-icon="false" :searchable="false" />
          </Field>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="template-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="template-save" @click="saveTemplate()">
            {{ tpl.id ? 'Сохранить' : 'Добавить шаблон' }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ сайд поля — № 42: четыре секции (аудит, «Сайд „Редактирование поля“ — эталон»; макет `32936:16381`) ============================ -->
    <ModalCard v-model:open="fieldOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="field">
        <ModalCardHeader :title="fd.id ? `Редактирование поля — ${fdTitle}` : 'Добавление поля'" />
        <ModalCardBody class="flex flex-col gap-6">
          <FieldSet legend="Основное">
            <Field label="Заголовок" required :invalid="fdError?.key === 'title'" :hint="fdError?.key === 'title' ? fdError.text : ''">
              <Input v-model="fd.title" placeholder="Например, Госномер" :show-icon="false" :invalid="fdError?.key === 'title'" data-field="fdTitle" />
            </Field>
            <Field
              label="Алиас"
              :invalid="fdError?.key === 'alias'"
              :hint="fdError?.key === 'alias' ? fdError.text : 'Латиницей без пробелов · кнопка справа предложит по названию'"
            >
              <div class="flex items-center gap-2">
                <Input v-model="fd.alias" placeholder="Например, regnum" :show-icon="false" :invalid="fdError?.key === 'alias'" class="min-w-0 flex-1" data-field="fdAlias" />
                <IconButton variant="secondary" size="lg" label="Предложить по названию" data-act="alias-suggest" @click="suggestFieldAlias()">
                  <Icon name="auto-fix" :size="20" />
                </IconButton>
              </div>
            </Field>
            <Field label="Тип поля" data-field="fdType">
              <Select v-model="fd.type" :items="FIELD_TYPES" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
            <Field label="Порядковый номер" data-field="fdOrder">
              <InputNumber v-model="fd.order" :min="1" :max="fieldOrderMax" />
            </Field>
            <Field label="Текст заполнителя (placeholder)">
              <Input v-model="fd.placeholder" placeholder="Например, Введите номер" :show-icon="false" data-field="fdPlaceholder" />
            </Field>
          </FieldSet>

          <!--
            Шаг строк флажков — 32, как в макете (`32936:16508`…`32936:16543`: строка 20, зазор 12); флажки — `Checkbox` кита
            (довесок 1 к такту 69): строка `SettingRow` с полями 8 давала шаг около 51.
          -->
          <FieldSet legend="Поведение и видимость">
            <div class="flex flex-col gap-3" data-field-flags>
              <Checkbox v-model="fd.required" data-field="fdRequired">
                Обязательное заполнение
              </Checkbox>
              <Checkbox v-model="fd.webOnly" data-field="fdWebOnly">
                Только для web (скрыто в мобильном)
              </Checkbox>
              <Checkbox v-model="fd.mobileAfterCreate" data-field="fdMobile">
                Отображается в мобильном после создания осмотра
              </Checkbox>
              <!-- «гасит»: согласование выключено в «Настройках» — причина `reason` под флажком полным контрастом (макет `32936:16531`; карточка А, такт 74). -->
              <Checkbox v-model="fd.approval" :disabled="!!m.fieldApprovalReason.value" :reason="m.fieldApprovalReason.value" data-field="fdApproval">
                Отправлять на согласование
              </Checkbox>
              <!-- «?» — только у этой строки, как в макете (`32936:16538`). -->
              <div class="flex items-start gap-2">
                <Checkbox v-model="fd.noConfidential" data-field="fdNoConfidential">
                  Поле не содержит конфиденциальных данных
                </Checkbox>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <IconButton variant="ghost" size="sm" rounded label="Пояснение" class="-my-0.5 shrink-0" data-field-help>
                        <Icon name="help" :size="16" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent class="max-w-80 whitespace-normal">
                      Значение поля можно передавать в отчёты и выгрузки без маскирования
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Checkbox v-model="fd.highlight" data-field="fdHighlight">
                Подсвечивать поле
              </Checkbox>
            </div>
          </FieldSet>

          <!-- Условная секция: только у типа с выбором (аудит: «не висят серыми всегда»). -->
          <FieldSet v-if="fd.type === 'choice'" legend="Варианты выбора" data-field-choices>
            <Field label="Варианты" hint="Каждый вариант с новой строки: ключ|значение">
              <Textarea v-model="fd.options" placeholder="ключ|значение" data-field="fdOptions" />
            </Field>
            <Field label="Зависимое поле" hint="Варианты фильтруются по значению выбранного поля" data-field="fdDepends">
              <Select v-model="fdDepends" :items="dependOptions" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
          </FieldSet>

          <FieldSet legend="Валидация и подсказки">
            <Field label="Валидация регулярным выражением" hint="Например, ^[0-9]{4}$ — ровно четыре цифры">
              <Input v-model="fd.regexp" placeholder="^[0-9]{4}$" :show-icon="false" data-field="fdRegexp" />
            </Field>
            <Field label="Конфигурация подсказок" hint="Настройка содержимого подсказок — в отдельном разделе" data-field="fdHints">
              <Select v-model="fd.hints" :items="HINT_CONFIGS" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
          </FieldSet>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="field-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="field-save" @click="saveFieldSide()">
            {{ fd.id ? 'Сохранить' : 'Добавить поле' }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ сайд процесса — № 48, 49: три секции макетов `33245:5722`, `33245:6032` ============================ -->
    <ModalCard v-model:open="processOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="process">
        <ModalCardHeader :title="pd.id ? `Редактирование процесса — ${pdTitle}` : 'Добавление процесса'" />
        <ModalCardBody class="flex flex-col gap-6">
          <FieldSet legend="Основное">
            <Field label="Название" required :invalid="pdError?.key === 'title'" :hint="pdError?.key === 'title' ? pdError.text : ''">
              <Input v-model="pd.title" placeholder="Например, Осмотр автомобиля" :show-icon="false" :invalid="pdError?.key === 'title'" data-field="pdTitle" />
            </Field>
            <!-- «?» у подписей макета — строкой подсказки `Field` (прецедент строки 117). -->
            <Field label="Алиас" :invalid="pdError?.key === 'alias'" :hint="pdError?.key === 'alias' ? pdError.text : 'Латиницей без пробелов — ключ процесса в выгрузках · кнопка справа предложит по названию'">
              <div class="flex items-center gap-2">
                <Input v-model="pd.alias" placeholder="Например, auto_inspection" :show-icon="false" :invalid="pdError?.key === 'alias'" class="min-w-0 flex-1" data-field="pdAlias" />
                <IconButton variant="secondary" size="lg" label="Предложить по названию" data-act="process-alias-suggest" @click="suggestProcessAlias(pd)">
                  <Icon name="auto-fix" :size="20" />
                </IconButton>
              </div>
            </Field>
            <div data-formula="pdFormula">
              <Field label="Формула наименования" hint="Имя объекта процесса в списках осмотра — текст и переменные {Группа:ключ}">
                <FormulaInput v-model="pd.formula" :variables="m.variables.value" label="Формула наименования" placeholder="Текст и переменные" />
              </Field>
            </div>
            <Field label="Порядковый номер" data-field="pdOrder">
              <InputNumber v-model="pd.order" :min="1" :max="processOrderMax" />
            </Field>
            <Field label="Иконка типа процесса" hint="Показывается у процесса в мобильном приложении">
              <button type="button" class="w-full" data-act="process-icon" @click="pd.icon = ICON_FILE">
                <FileUpload>
                  {{ pd.icon ? `Иконка загружена · ${pd.icon}` : 'Загрузить иконку' }}
                  <template #hint>
                    {{ pd.icon ? 'нажмите, чтобы заменить' : 'SVG или PNG · или перетащите файл сюда' }}
                  </template>
                </FileUpload>
              </button>
            </Field>
          </FieldSet>

          <FieldSet legend="Поведение">
            <div class="flex flex-col gap-3" data-process-flags>
              <Checkbox v-model="pd.hidden" data-field="pdHidden">
                Скрытый процесс
              </Checkbox>
              <Checkbox v-model="pd.pickSteps" data-field="pdPickSteps">
                Разрешать выбор шагов во время съёмки
              </Checkbox>
              <Checkbox v-model="pd.repeatable" data-field="pdRepeatable">
                Повторяемый процесс
              </Checkbox>
            </div>
            <Field label="Тип объекта съёмки" data-field="pdObjectType">
              <Select v-model="pd.objectType" :items="OBJECT_TYPES" placeholder="Не выбран" :show-icon="false" :searchable="false" />
            </Field>
            <Field label="Получение координат" data-field="pdCoords">
              <Select v-model="pd.coords" :items="COORDS_MODES" placeholder="Не выбрано" :show-icon="false" :searchable="false" />
            </Field>
          </FieldSet>

          <FieldSet legend="Подсказки">
            <Field label="Подсказка на экране подготовки" hint="Исполнитель видит её перед началом процесса">
              <Textarea v-model="pd.prepHint" placeholder="Например, Убедитесь, что автомобиль стоит на открытом пространстве с хорошим освещением" data-field="pdPrepHint" />
            </Field>
            <Field label="Подсказка «Обычно занимает N минут»">
              <RadioGroup v-model="pd.duration" data-radio="pdDuration">
                <RadioGroupItem v-for="x in DURATION_MODES" :key="x.value" :value="x.value" :checked="pd.duration === x.value">
                  {{ x.label }}
                </RadioGroupItem>
              </RadioGroup>
            </Field>
            <Field v-if="pd.duration === 'manual'" label="Минут" data-field="pdDurationMin">
              <InputNumber v-model="pd.durationMin" :min="1" :max="120" />
            </Field>
          </FieldSet>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="process-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="process-save" @click="saveProcessSide()">
            {{ pd.id ? 'Сохранить' : 'Добавить процесс' }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ оверлей повторяемого процесса — № 64: `ModalCard placement="full"` (r2 §7) ============================
      Форма процесса и его шаги вместе; сайд шага ложится поверх (стек «оверлей → сайд»), Esc закрывает верхний слой. В просмотре
      версии — чтение: поля «только для чтения», действия под `inert`, в подвале — «Закрыть».
    -->
    <ModalCard v-model:open="overlayOpen">
      <ModalCardContent narrow="full" placement="full" data-overlay="process" :data-readonly="ro || undefined">
        <ModalCardHeader :title="od.title" :subtitle="overlaySubtitle" />
        <!-- Узкий экран (такт 92): форма процесса над шагами, шаги — строками-карточками. -->
        <ModalCardBody class="flex items-start gap-6 max-md:flex-col max-md:items-stretch">
          <div class="flex w-modal-narrow shrink-0 flex-col gap-6 max-md:w-full" data-overlay-form>
            <FieldSet legend="Основное">
              <Field :readonly="ro" label="Название" required :invalid="odError?.key === 'title'" :hint="odError?.key === 'title' ? odError.text : ''">
                <Input v-model="od.title" placeholder="Например, Осмотр повреждений" :show-icon="false" :invalid="odError?.key === 'title'" data-field="odTitle" />
              </Field>
              <Field :readonly="ro" label="Алиас" :invalid="odError?.key === 'alias'" :hint="odError?.key === 'alias' ? odError.text : 'Латиницей без пробелов — ключ процесса в выгрузках'">
                <div class="flex items-center gap-2">
                  <Input v-model="od.alias" placeholder="Например, damage_inspection" :show-icon="false" :invalid="odError?.key === 'alias'" class="min-w-0 flex-1" data-field="odAlias" />
                  <IconButton v-if="!ro" variant="secondary" size="lg" label="Предложить по названию" data-act="overlay-alias-suggest" @click="suggestProcessAlias(od)">
                    <Icon name="auto-fix" :size="20" />
                  </IconButton>
                </div>
              </Field>
              <div data-formula="odFormula">
                <Field :readonly="ro" label="Формула наименования" hint="Имя объекта процесса в списках осмотра — текст и переменные {Группа:ключ}">
                  <FormulaInput v-model="od.formula" :variables="m.variables.value" label="Формула наименования" placeholder="Текст и переменные" />
                </Field>
              </div>
              <Field :readonly="ro" label="Порядковый номер" data-field="odOrder">
                <InputNumber v-model="od.order" :min="1" :max="m.processes.value.length" />
              </Field>
            </FieldSet>
            <FieldSet legend="Поведение">
              <div class="flex flex-col gap-3">
                <Checkbox v-model="od.hidden" :readonly="ro" data-field="odHidden">
                  Скрытый процесс
                </Checkbox>
                <Checkbox v-model="od.pickSteps" :readonly="ro" data-field="odPickSteps">
                  Разрешать выбор шагов во время съёмки
                </Checkbox>
                <Checkbox v-model="od.repeatable" :readonly="ro" data-field="odRepeatable">
                  Повторяемый процесс
                </Checkbox>
              </div>
              <Field :readonly="ro" label="Тип объекта съёмки" data-field="odObjectType">
                <Select v-model="od.objectType" :items="OBJECT_TYPES" placeholder="Не выбран" :show-icon="false" :searchable="false" />
              </Field>
              <Field :readonly="ro" label="Получение координат" data-field="odCoords">
                <Select v-model="od.coords" :items="COORDS_MODES" placeholder="Не выбрано" :show-icon="false" :searchable="false" />
              </Field>
            </FieldSet>
            <FieldSet legend="Подсказки">
              <!-- Такт 88: подсказка перед каждым повтором — в «Текстах в приложении»; эта — один раз, перед процессом (строка 222). -->
              <Field :readonly="ro" label="Подсказка на экране подготовки" hint="Исполнитель видит её перед началом процесса">
                <Textarea v-model="od.prepHint" placeholder="Например, Снимайте каждое повреждение отдельно" data-field="odPrepHint" />
              </Field>
              <Field :readonly="ro" label="Подсказка «Обычно занимает N минут»">
                <RadioGroup v-model="od.duration" data-radio="odDuration">
                  <RadioGroupItem v-for="x in DURATION_MODES" :key="x.value" :value="x.value" :checked="od.duration === x.value">
                    {{ x.label }}
                  </RadioGroupItem>
                </RadioGroup>
              </Field>
            </FieldSet>

            <!--
              Тексты в приложении — такт 88 (ревью 4.6; решения 4, 5 оркестратора): шесть текстов экрана повторяемого процесса,
              у каждого — где его видит исполнитель. Поле — `Autocomplete` с вариантами словаря по типу объекта процесса; под ним
              до трёх вариантов чипами (`Chip pressable`) и «Все варианты» — поповер с поиском и группами по типу объекта.
              «Заполнить по типу объекта» — только пустые, с «Отменить»; без типа объекта выключена, причина — подсказкой рядом.
            -->
            <FieldSet legend="Тексты в приложении" data-overlay-texts>
              <ModalCardText>
                Тексты экранов этого процесса в мобильном приложении. Варианты — из словаря по типу объекта съёмки
              </ModalCardText>
              <div :inert="ro" class="flex" data-texts-fill>
                <Field :readonly="ro" :hint="textsFillHint">
                  <Button variant="outline" show-icon :disabled="!textsTyped" data-act="texts-fill" @click="m.fillTexts(od)">
                    <template #icon>
                      <Icon name="auto-fix" :size="16" />
                    </template>
                    Заполнить по типу объекта
                  </Button>
                </Field>
              </div>
              <!--
                Фрагмент экрана приложения — такт 89 (решение 7): экран списка повторов на текстах черновика оверлея; поле в фокусе
                выбирает экран, где его текст виден, и обводит текст. Тот же механизм, что демо-осмотр.
              -->
              <div v-if="textsPreview" class="flex" data-texts-preview>
                <AppPreviewScreen fragment size="md" :screen="textsPreview" :marked="textsMark" />
              </div>
              <!-- Поля с чипами — через 16: при шаге группы полей 8 подсказка поля сливалась с подписью следующего. -->
              <div class="flex flex-col gap-4" @focusin="onTextFocus">
                <Field v-for="f in REPEAT_TEXT_FIELDS" :key="f.key" :readonly="ro" :label="f.label" :hint="f.hint" :data-text="f.key">
                  <div class="flex flex-col gap-2">
                    <Autocomplete v-model="od.texts[f.key]" :items="textItems(f.key)" :placeholder="f.placeholder" :show-icon="false" />
                    <div v-if="!ro" class="flex flex-wrap items-center gap-2" data-text-chips>
                      <Chip
                        v-for="v in variantChips(od.objectType, f.key)"
                        :key="v"
                        pressable
                        :active="od.texts[f.key] === v"
                        :title="v"
                        :data-variant="v"
                        @click="pickText(f.key, v)"
                      >
                        {{ v }}
                      </Chip>
                      <Popover :open="variantsOpen === f.key" @update:open="openVariants(f.key, $event)">
                        <PopoverTrigger as-child>
                          <Chip trailing="expand" :expanded="variantsOpen === f.key" data-act="text-variants">
                            Все варианты
                          </Chip>
                        </PopoverTrigger>
                        <PopoverContent :width="360" align="start" :side-offset="4" class="flex flex-col p-1" :data-variants="f.key">
                          <div class="p-2">
                            <Input v-model="variantQuery" placeholder="Поиск по вариантам" data-field="variants-search" />
                          </div>
                          <div class="max-h-80 overflow-y-auto">
                            <SelectGroup v-for="g in variantGroups(od.objectType, f.key, variantQuery)" :key="g.type" :header="g.label" :data-variant-group="g.type">
                              <SelectItem v-for="v in g.items" :key="v" :selected="od.texts[f.key] === v" :data-variant="v" @click="pickText(f.key, v)">
                                <HighlightText :text="v" :query="variantQuery" />
                              </SelectItem>
                            </SelectGroup>
                            <Empty
                              v-if="!variantGroups(od.objectType, f.key, variantQuery).length"
                              :title="`Ничего не найдено по «${variantQuery.trim()}»`"
                              description="Свой текст — набором в поле"
                              class="px-4 py-6"
                              data-variants-empty
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </Field>
              </div>
            </FieldSet>
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-4" data-overlay-steps>
            <div class="flex items-center gap-3">
              <Heading data-overlay-steps-title>
                Шаги
                <template #meta>
                  {{ stepsWord(od.steps.length) }}
                </template>
              </Heading>
              <div :inert="ro" class="ml-auto flex">
                <Button variant="outline" show-icon data-act="overlay-step-add" @click="openStep(od.id, '', true)">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  Добавить шаг
                </Button>
              </div>
            </div>
            <Table v-if="od.steps.length && !phone" data-overlay-table>
              <TableRow>
                <TableHead variant="column" class="w-10 pl-4">
                  №
                </TableHead>
                <TableHead variant="column" class="min-w-0 flex-1 px-4">
                  Название · тип шага
                </TableHead>
                <TableHead variant="column" class="w-28 px-4">
                  Способ
                </TableHead>
                <TableHead variant="column" class="w-44 px-4">
                  Нейросети
                </TableHead>
                <TableHead variant="column" aria-label="Действия" :class="['justify-end px-4', STEP_ACTIONS_COLUMN]" />
              </TableRow>
              <TableRow v-for="(st, k) in od.steps" :key="st.id" :data-overlay-step="st.id">
                <TableCell align="start" class="w-10 pl-4" data-row-number>
                  {{ k + 1 }}
                </TableCell>
                <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start gap-2 px-4 pt-4.5 pb-3 contain-inline-size">
                  <TableCellIdentity class="w-full flex-none">
                    {{ st.title }}
                    <template v-if="st.description" #description>
                      {{ st.description }}
                    </template>
                  </TableCellIdentity>
                  <div class="flex flex-wrap items-center gap-2">
                    <Chip variant="neutral">
                      {{ kindLabel(st.kind) }}
                    </Chip>
                    <template v-for="x in STEP_FLAGS" :key="x.key">
                      <Badge v-if="st[x.key]" size="sm" :variant="x.key === 'required' ? 'default' : 'neutral'" :data-badge="x.key">
                        {{ x.label }}
                      </Badge>
                    </template>
                  </div>
                </TableCell>
                <TableCell align="start" class="w-28 px-4">
                  {{ st.method }}
                </TableCell>
                <TableCell variant="slot" class="h-auto w-44 flex-col items-start gap-1 px-4 pt-4.5 pb-3">
                  <TableCellText v-for="n in st.networks" :key="n" size="sm" class="w-full">
                    {{ n }}
                  </TableCellText>
                  <ToolbarText v-if="!st.networks.length">
                    Нейросети не выбраны
                  </ToolbarText>
                </TableCell>
                <TableCell variant="slot" align="start" :class="['justify-end px-4', STEP_ACTIONS_COLUMN]">
                  <TableRowActions :inert="ro" :actions="STEP_ACTIONS" @edit="openStep(od.id, st.id, true)" @action="removeOverlayStep(st.id)" />
                </TableCell>
              </TableRow>
            </Table>
            <div v-else-if="od.steps.length" class="flex flex-col gap-2" data-overlay-cards>
              <ReuseStepCard
                v-for="(st, k) in od.steps"
                :key="st.id"
                :st="st"
                :k="k"
                :overlay="true"
                :edit="() => openStep(od.id, st.id, true)"
                :remove="() => removeOverlayStep(st.id)"
              />
            </div>
            <Card v-else tone="muted">
              <Empty title="В процессе нет шагов" description="Шаги повторяемого процесса снимаются при каждом повторении — добавьте первый" data-overlay-empty />
            </Card>
          </div>
        </ModalCardBody>
        <ModalCardFooter>
          <template v-if="ro">
            <Button variant="secondary" data-act="overlay-close" @click="m.closeSurface()">
              Закрыть
            </Button>
          </template>
          <template v-else>
            <Button variant="secondary" data-act="overlay-cancel" @click="m.closeSurface()">
              Отмена
            </Button>
            <Button data-act="overlay-save" @click="saveOverlay()">
              Сохранить
            </Button>
          </template>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ демо-осмотр — № 98–102, такт 89: `ModalCard placement="full"` (ревью 4.1; решения 5, 6) ============================
      Шапка — «Демо-осмотр · по черновику · логика не выполняется», «По шагам / Карта», «Вернуться к схеме»; слева оглавление
      экранов по этапам с пробелами, в центре телефон (переходы по кнопкам экрана, ← → и счётчик) либо карта, справа «Из чего
      собран экран» со ссылками «Изменить». Esc закрывает.
    -->
    <ModalCard v-model:open="demoOpen">
      <ModalCardContent narrow="full" placement="full" data-overlay="demo" :data-mode="m.ui.demo.mode" :data-screen="m.demoScreen.value.id" @keydown="onDemoKey">
        <ModalCardHeader :title="demoTitle" :subtitle="demoSubtitle">
          <template #actions>
            <Tabs v-model="demoMode">
              <TabsList variant="segmented">
                <TabsTrigger value="steps" variant="segmented" data-demo-mode="steps">
                  По шагам
                </TabsTrigger>
                <TabsTrigger value="map" variant="segmented" data-demo-mode="map">
                  Карта
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="secondary" data-act="demo-close" @click="m.closeSurface()">
              Вернуться к схеме
            </Button>
          </template>
        </ModalCardHeader>
        <ModalCardBody class="flex items-start gap-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
          <!--
            Узкий экран (такт 92; решение 5): экран, оглавление и «Из чего собран экран» — вкладками; экран приложения — без рамки
            телефона. Рабочий стол — три колонки (такт 89).
          -->
          <Tabs v-if="phone" v-model="demoPane" data-demo-panes>
            <TabsList stretch>
              <TabsTrigger value="screen" data-demo-pane="screen">
                Экран
              </TabsTrigger>
              <TabsTrigger value="toc" data-demo-pane="toc">
                Оглавление
              </TabsTrigger>
              <TabsTrigger value="sources" data-demo-pane="sources">
                Из чего собран экран
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <!-- Оглавление экранов по этапам — № 100: `SectionNav`, у экрана с пробелом — метка тоном предупреждения. -->
          <SectionNav v-if="!phone || demoPane === 'toc'" v-model="demoStage" title="Экраны" class="sticky top-0 max-md:static max-md:w-full" data-demo-toc>
            <SectionNavItem
              v-for="st in m.demo.value.stages"
              :key="st.id"
              :value="st.id"
              :label="st.label"
              :status="st.gaps ? 'attention' : 'none'"
              :data-stage="st.id"
            >
              <SectionNavAnchor
                v-for="s in tocAnchors(st.id)"
                :key="s.id"
                :label="s.label"
                :description="s.gaps.join(' · ')"
                tone="warning"
                :active="s.id === m.demoScreen.value.id"
                :data-screen="s.id"
                @select="demoPick(s.id)"
              />
            </SectionNavItem>
          </SectionNav>

          <!-- Центр — № 99, 101: телефон «По шагам» либо карта экранов. -->
          <div v-if="m.ui.demo.mode === 'steps' && (!phone || demoPane === 'screen')" class="sticky top-0 flex min-w-0 flex-1 flex-col items-center gap-4 max-md:static" data-demo-center>
            <AppPreviewScreen
              :screen="m.demoScreen.value"
              size="lg"
              :scale="1.4"
              :frame="!phone"
              interactive
              :marked="demoMarked"
              data-demo-phone
              @go="m.demoGo($event)"
              @enter="demoHover = $event"
              @leave="demoHover = ''"
            />
            <div class="flex items-center gap-3" data-demo-nav>
              <IconButton variant="secondary" size="md" label="Предыдущий экран" :disabled="m.demoPos.value <= 1" data-act="demo-prev" @click="m.demoStep(-1)">
                <Icon name="chevron-left" :size="16" />
              </IconButton>
              <ToolbarText data-demo-counter>
                Экран {{ m.demoPos.value }} из {{ m.demo.value.order.length }}
              </ToolbarText>
              <IconButton variant="secondary" size="md" label="Следующий экран" :disabled="m.demoPos.value >= m.demo.value.order.length" data-act="demo-next" @click="m.demoStep(1)">
                <Icon name="chevron-right" :size="16" />
              </IconButton>
            </div>
          </div>
          <div v-else-if="m.ui.demo.mode === 'map' && (!phone || demoPane === 'screen')" class="flex min-w-0 flex-1 flex-col gap-8" data-demo-map>
            <section v-for="st in m.demo.value.stages" :key="st.id" class="flex flex-col gap-3" :data-map-stage="st.id">
              <Heading>
                {{ st.label }}
                <template #meta>
                  {{ st.hint }} · {{ st.screens.length }} {{ plural(st.screens.length, 'экран', 'экрана', 'экранов') }}
                </template>
              </Heading>
              <div class="flex flex-wrap items-start gap-3">
                <template v-for="(id, k) in st.screens" :key="id">
                  <span v-if="k" class="flex pt-28">
                    <Icon name="arrow-forward" :size="16" />
                  </span>
                  <AppPreviewThumb
                    :screen="m.demo.value.byId[id]"
                    :label="m.demo.value.byId[id]?.label ?? ''"
                    :gaps="m.demo.value.byId[id]?.gaps"
                    :current="id === m.demoScreen.value.id"
                    :data-thumb="id"
                    @click="openFromMap(id)"
                  />
                </template>
              </div>
              <ToolbarText v-if="st.kind === 'refuse'">
                Ветка — кнопка «Осмотр невозможен» на экранах съёмки; «Вернуться к осмотру» ведёт обратно
              </ToolbarText>
              <ToolbarText v-else-if="st.kind === 'done' && st.screens.length > 1">
                Звонок — кнопка на экране «Осмотр отправлен»
              </ToolbarText>
            </section>
          </div>

          <!-- «Из чего собран экран» — № 102: наведение на строку обводит элемент телефона, «Изменить» ведёт к месту. -->
          <div v-if="!phone || demoPane === 'sources'" class="flex w-80 shrink-0 flex-col gap-3 max-md:w-full" data-demo-sources>
            <Heading>
              Из чего собран экран
            </Heading>
            <ToolbarText>
              {{ m.demoScreen.value.label }}
            </ToolbarText>
            <SelectGroup>
              <SelectItem
                v-for="src in m.demoScreen.value.sources"
                :key="src.id"
                multiline
                :subtitle="src.value"
                :selected="demoMarked.includes(src.id)"
                :data-source="src.id"
                :data-gap="src.gap || undefined"
                @mouseenter="demoHover = src.id"
                @mouseleave="demoHover = ''"
              >
                {{ src.label }}
                <template #trailing>
                  <ButtonAction size="sm" :show-icon="false" data-act="demo-edit" @click="editDemo(src)">
                    {{ ro ? 'Показать' : 'Изменить' }}
                  </ButtonAction>
                </template>
              </SelectItem>
            </SelectGroup>
          </div>
        </ModalCardBody>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ превью публичной страницы — № 107, 108, такт 90: `ModalCard placement="full"` (ревью 4.8; решение 5) ============================
      Шапка — «Предпросмотр страницы сценария», вид сайта условный; «Компьютер / Телефон», «Страница сценария / Карточка в
      каталоге», «Вернуться к витрине». Над рамкой — статус карточки, будущий адрес и незаполненное; метка «Не заполнено» в
      странице закрывает оверлей и ставит фокус в поле таба. Esc закрывает.
    -->
    <ModalCard v-model:open="siteOpen">
      <ModalCardContent narrow="full" placement="full" data-overlay="site" :data-device="m.ui.site.device" :data-view="m.ui.site.view">
        <ModalCardHeader title="Предпросмотр страницы сценария" :subtitle="siteSubtitle">
          <template #actions>
            <Tabs v-model="siteDevice">
              <TabsList variant="segmented">
                <TabsTrigger value="desktop" variant="segmented" data-site-device="desktop">
                  Компьютер
                </TabsTrigger>
                <TabsTrigger value="phone" variant="segmented" data-site-device="phone">
                  Телефон
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs v-model="siteView">
              <TabsList variant="segmented">
                <TabsTrigger value="page" variant="segmented" data-site-view="page">
                  Страница сценария
                </TabsTrigger>
                <TabsTrigger value="card" variant="segmented" data-site-view="card">
                  Карточка в каталоге
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="secondary" data-act="site-close" @click="m.closeSurface()">
              Вернуться к витрине
            </Button>
          </template>
        </ModalCardHeader>
        <ModalCardBody class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2" data-site-info>
            <Badge :variant="SITE_STATUS_BADGE[m.site.value.status]" data-site-status>
              {{ m.site.value.statusLabel }}
            </Badge>
            <ToolbarText data-site-address>
              {{ siteAddress }}
            </ToolbarText>
            <ToolbarText data-site-gaps>
              {{ siteGaps }}
            </ToolbarText>
          </div>
          <div class="flex min-h-0 flex-1 justify-center" data-site-frame>
            <AppPreviewBrowser :device="m.ui.site.device" :url="siteUrl" :label="m.ui.site.view === 'card' ? 'Каталог сценариев на сайте' : 'Страница сценария на сайте'">
              <ScenarioPreview :page="m.site.value" :view="m.ui.site.view" @gap="m.siteGo($event.field)" />
            </AppPreviewBrowser>
          </div>
        </ModalCardBody>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ сайд шага — № 63: шесть секций аудита (пробел макета) ============================
      «Принцип: всё редактирование сущности — в сайде»: Основное · Поведение · Съёмка · Нейросети («гасит» по компании) ·
      Подсказки · Связи. Образец — сайд поля (№ 42). Поверх оверлея пишет в черновик оверлея.
    -->
    <ModalCard v-model:open="stepOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="step" :data-host="sdHost.overlay ? 'overlay' : 'page'">
        <ModalCardHeader :title="sd.id ? `Редактирование шага — ${sdTitle}` : 'Добавление шага'" :subtitle="`Процесс «${hostTitle}»`" />
        <ModalCardBody class="flex flex-col gap-6">
          <FieldSet legend="Основное" data-step-section="main">
            <Field label="Название" required :invalid="sdInvalid" :hint="sdInvalid ? 'Заполните название шага' : ''">
              <Input v-model="sd.title" placeholder="Например, Передняя часть" :show-icon="false" :invalid="sdInvalid" data-field="sdTitle" />
            </Field>
            <Field label="Описание" hint="Исполнитель видит его на экране шага">
              <Textarea v-model="sd.description" placeholder="Например, Снимите переднюю часть автомобиля с расстояния 3–5 метров" data-field="sdDescription" />
            </Field>
            <Field label="Тип шага" data-field="sdKind">
              <Select v-model="sd.kind" :items="STEP_KINDS" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
            <Field label="Порядковый номер" data-field="sdOrder">
              <InputNumber v-model="sd.order" :min="1" :max="stepOrderMax" />
            </Field>
          </FieldSet>

          <FieldSet legend="Поведение" data-step-section="behavior">
            <div class="flex flex-col gap-3" data-step-flags>
              <template v-for="x in STEP_FLAGS" :key="x.key">
                <Checkbox v-if="x.key !== 'gallery' && x.key !== 'docScan'" v-model="sd[x.key]" :data-field="`sd-${x.key}`">
                  {{ x.label }}
                </Checkbox>
              </template>
            </div>
          </FieldSet>

          <!-- Такт 87: текстовая подсказка — в «Съёмке»: она стоит над видоискателем экрана съёмки; раздел «Подсказки» стал «Фото-подсказками». -->
          <FieldSet legend="Съёмка" data-step-section="shooting">
            <Field label="Способ съёмки" data-field="sdMethod">
              <Select v-model="sd.method" :items="STEP_METHODS" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
            <div class="flex flex-col gap-3">
              <Checkbox v-model="sd.gallery" data-field="sd-gallery">
                Из галереи
              </Checkbox>
              <Checkbox v-model="sd.docScan" data-field="sd-docScan">
                Скан документов
              </Checkbox>
            </div>
            <Field label="Текстовая подсказка" hint="Строка над видоискателем на экране съёмки">
              <Textarea v-model="sd.tip" placeholder="Например, Держите телефон горизонтально" data-field="sdTip" />
            </Field>
          </FieldSet>

          <!-- Нейросети: недоступная компании — «гасит» по компании (макет `32765:6702`): флажок выключен, причина `reason` полным контрастом (карточка А, такт 74). -->
          <FieldSet :legend="`Нейросети · выбрано ${sd.networks.length}`" data-step-section="networks">
            <div class="flex flex-col gap-3" data-step-networks-list>
              <Checkbox
                v-for="x in NETWORKS"
                :key="x.value"
                :model-value="sd.networks.includes(x.value)"
                :disabled="!!x.denied"
                :reason="x.denied ?? ''"
                :data-network="x.value"
                @update:model-value="toggleNetwork(x.value)"
              >
                {{ x.value }}
              </Checkbox>
            </div>
          </FieldSet>

          <!--
            Раздел «Фото-подсказки» — такт 87 (Ш-2, решение 6): всё редактирование подсказок шага — здесь. Миниатюры — `StepThumb`
            кита: на наведении «глаз» — просмотр крупно, крестик — убрать из шага; подсказка миниатюры — часть и ракурс либо имя
            своего файла. «Из каталога» — каталог поверх сайда; «Загрузить» — свой файл. Всё — в черновик сайда до «Сохранить».
          -->
          <FieldSet :legend="`Фото-подсказки · ${sd.hints.length}`" data-step-section="photo-hints">
            <!-- Такт 99 (владелец, 2026-10-09, п. 2): статус и миниатюры — через 12; список → кнопки добавления — 16. -->
            <div class="flex flex-col items-start gap-4">
              <div class="flex flex-col items-start gap-3">
                <Badge :variant="sd.hints.length ? 'success' : 'warning'" data-step-hint-status>
                  {{ hintStatus(sd.hints.length) }}
                </Badge>
                <div v-if="sd.hints.length" class="flex flex-wrap gap-2" data-step-hint-list>
                  <TooltipProvider>
                    <StepThumb
                      v-for="(h, k) in sd.hints"
                      :key="h.id"
                      :src="hintSrc(h)"
                      :alt="hintLabel(h)"
                      :reason="hintLabel(h)"
                      :data-hint="h.id"
                      @open="viewHints(sd.hints, k)"
                      @remove="removeSideHint(h.id)"
                    />
                  </TooltipProvider>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="outline" show-icon data-act="step-hint-catalog" @click="openCatalog('side')">
                  <template #icon>
                    <Icon name="image" :size="16" />
                  </template>
                  Из каталога
                </Button>
                <Button variant="outline" show-icon data-act="step-hint-upload" @click="uploadSideHint()">
                  <template #icon>
                    <Icon name="add" :size="16" />
                  </template>
                  Загрузить
                </Button>
              </div>
            </div>
          </FieldSet>

          <FieldSet legend="Связи" data-step-section="links">
            <Field label="Поля формы, которые заполняет шаг" hint="Значения приходят из распознавания нейросетей шага" data-field="sdLinks">
              <Select v-model:values="sd.links" multiple :items="fieldLinkItems" placeholder="Выберите поля" />
            </Field>
            <Field label="Словарь комментариев шага" data-field="sdComments">
              <Select v-model="sdComments" :items="stepComments" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
          </FieldSet>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="step-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="step-save" @click="saveStepSide()">
            {{ sd.id ? 'Сохранить' : 'Добавить шаг' }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ сайд «Нейросети выбранных шагов» — «Настроить нейросети» панели (№ 44) ============================ -->
    <ModalCard v-model:open="networksOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="networks">
        <ModalCardHeader title="Нейросети выбранных шагов" :subtitle="stepsText" />
        <ModalCardBody class="flex flex-col gap-6">
          <ModalCardText>
            «−» — нейросеть у части выбранных шагов: если её не трогать, у каждого шага останется как было
          </ModalCardText>
          <div class="flex flex-col gap-3" data-networks-list>
            <Checkbox
              v-for="x in NETWORKS"
              :key="x.value"
              :model-value="nd[x.value] === 'all'"
              :indeterminate="nd[x.value] === 'some'"
              :disabled="!!x.denied"
              :reason="x.denied ?? ''"
              :data-network="x.value"
              @update:model-value="cycleNetwork(x.value)"
            >
              {{ x.value }}
            </Checkbox>
          </div>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="networks-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="networks-save" @click="saveNetworksSide()">
            Сохранить
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ каталог фото-подсказок и массовая заливка — такт 87 (ревью 4.3, 4.4) ============================
      Одно окно-сайд 642: каталог из ячейки шага либо поверх сайда шага; заливка — список строк, «Заменить» — каталог вторым слоем
      с «←», как дифф версии в истории. Категории — `SectionNav` колонкой слева, сетка — `MediaGallery` (решение 4).
    -->
    <ModalCard v-model:open="hintsOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" :data-side="catalogShown ? 'catalog' : 'fill'" :data-target="catalogShown ? cat.target : undefined" @escape-key-down="onHintsEscape">
        <template v-if="catalogShown">
          <ModalCardHeader v-if="cat.target === 'fill'" back :title="catalogTitle" :subtitle="catalogSubtitle" @back="closeFillCatalog()" />
          <ModalCardHeader v-else :title="catalogTitle" :subtitle="catalogSubtitle" />
          <ModalCardBody class="flex flex-col gap-4">
            <Input v-model="catalogQuery" placeholder="Поиск по части и ракурсу" data-field="catalog-search" />
            <!-- Узкий экран (такт 92): категории над сеткой, плитки по две в ряд. -->
            <div class="flex items-start gap-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
              <SectionNav v-model="catalogCategory" aria-label="Категории каталога" class="sticky top-0 max-w-44 max-md:static max-md:w-full max-md:max-w-none" data-catalog-categories>
                <SectionNavItem value="all" label="Все" :count="catalogNumbers.all" />
                <SectionNavItem v-for="c in HINT_CATEGORIES" :key="c.id" :value="c.id" :label="c.label" :count="catalogNumbers[c.id]" />
              </SectionNav>
              <div class="min-w-0 flex-1">
                <!-- Довесок 1 к такту 101: сетка по ширине сайда — уже 560 одна колонка, от 560 две, от 900 три; узкий экран — по две. -->
                <MediaGallery v-if="catalogItems.length" size="md" :class="phone ? undefined : `grid ${sideCols}`" :data-cols="phone ? undefined : sideCols" data-catalog-grid>
                  <MediaGalleryItem
                    v-for="c in catalogItems"
                    :key="c.id"
                    size="md"
                    :class="phone ? 'w-44 max-md:w-36' : 'w-auto'"
                    :src="c.src"
                    :alt="catalogLabel(c)"
                    selectable
                    :selected="attached.has(c.id) || cat.picked.includes(c.id)"
                    :disabled="attached.has(c.id)"
                    open-label="Открыть крупно"
                    :data-catalog-item="c.id"
                    @toggle="togglePick(c.id)"
                    @open="viewCatalog(c.id)"
                  >
                    <template #title>
                      <HighlightText :text="c.part" :query="cat.query" />
                    </template>
                    <template #subtitle>
                      <HighlightText :text="attached.has(c.id) ? 'Уже у шага' : c.angle" :query="cat.query" />
                    </template>
                  </MediaGalleryItem>
                </MediaGallery>
                <Empty
                  v-else
                  :title="`Ничего не найдено по «${cat.query}»`"
                  :description="catalogElsewhere ? `Найдено в других категориях: ${catalogElsewhere}` : 'Ищется по части и ракурсу и по связанным словам: «фара», «кузов», «полис»'"
                  data-catalog-empty
                >
                  <template v-if="catalogElsewhere" #action>
                    <Button variant="outline" data-act="catalog-all" @click="catalogCategory = 'all'">
                      Искать во всех категориях
                    </Button>
                  </template>
                </Empty>
              </div>
            </div>
          </ModalCardBody>
          <ModalCardFooter>
            <template #note>
              Выбрано: {{ cat.picked.length }}
            </template>
            <Button variant="secondary" data-act="catalog-cancel" @click="cancelCatalog()">
              Отмена
            </Button>
            <Button :disabled="!cat.picked.length" data-act="catalog-confirm" @click="confirmCatalog()">
              {{ cat.target === 'fill' ? 'Заменить' : 'Добавить' }}
            </Button>
          </ModalCardFooter>
        </template>

        <template v-else>
          <ModalCardHeader title="Заполнить фото-подсказки" :subtitle="fillSubtitle" />
          <ModalCardBody class="flex flex-col gap-6">
            <div class="flex flex-wrap items-center gap-4">
              <Switch v-model="fill.all" data-field="fill-all">
                Показать все шаги
              </Switch>
              <ToolbarText v-if="fill.only.length" data-fill-only>
                Только выбранные шаги — {{ fill.only.length }}
              </ToolbarText>
            </div>
            <!--
              Строка — шаг и его процесс с оценкой подбора; ниже — предложенная подсказка, причина второй строкой, «Заменить» и «Не
              заполнять». Строка, которая не заполняется, приглушена (`Card dimmed`), действия остаются.
            -->
            <FieldSet v-for="g in fillGroups" :key="g.id" :legend="`${g.title} · ${g.rows.length}`" :data-fill-group="g.id">
              <div class="flex flex-col gap-2">
                <Card
                  v-for="v in g.rows"
                  :key="v.row.stepId"
                  size="sm"
                  :dimmed="!v.included && !!v.hint"
                  class="flex flex-col gap-3"
                  :data-fill-row="v.row.stepId"
                  :data-included="v.included || undefined"
                >
                  <div class="flex items-center gap-3">
                    <TableCellIdentity>
                      {{ v.row.title }}
                      <template #description>
                        {{ fillWhere(v.row) }}
                      </template>
                    </TableCellIdentity>
                    <Badge appearance="outline" :variant="v.manual ? 'default' : MATCH_TONE[v.row.proposal.match]" data-fill-match>
                      {{ v.manual ? 'Выбрано вручную' : HINT_MATCH_LABEL[v.row.proposal.match] }}
                    </Badge>
                  </div>
                  <!-- Узкий экран (такт 92): действия строки — строкой под предложением. -->
                  <div class="flex items-center gap-4 max-md:flex-wrap">
                    <MediaGalleryItem size="sm" :src="catalogHint(v.hint)?.src ?? ''" :alt="catalogName(v.hint)" class="w-24 shrink-0" />
                    <TableCellIdentity>
                      {{ catalogName(v.hint) || 'Нет предложения' }}
                      <template #description>
                        {{ v.manual ? 'выбрано в каталоге' : v.row.proposal.reason }}
                      </template>
                    </TableCellIdentity>
                    <div class="flex shrink-0 flex-col items-end gap-1 max-md:basis-full max-md:flex-row max-md:items-center max-md:gap-6">
                      <ButtonAction size="sm" :show-icon="false" data-act="fill-replace" @click="openCatalog('fill', v.row.processId, v.row.stepId)">
                        {{ v.hint ? 'Заменить' : 'Выбрать из каталога' }}
                      </ButtonAction>
                      <ButtonAction v-if="v.hint" size="sm" variant="muted" :show-icon="false" data-act="fill-toggle" @click="fillToggle(v.row.stepId)">
                        {{ v.included ? 'Не заполнять' : 'Заполнить' }}
                      </ButtonAction>
                    </div>
                  </div>
                </Card>
              </div>
            </FieldSet>
            <Empty
              v-if="!fillViews.length"
              title="У всех шагов есть фото-подсказки"
              description="Включите «Показать все шаги», чтобы добавить подсказки и к ним"
              data-fill-empty
            />
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" data-act="fill-cancel" @click="m.closeSurface()">
              Отмена
            </Button>
            <Button :disabled="!fillIncluded.length" data-act="fill-apply" @click="applyFill()">
              {{ fillApplyText }}
            </Button>
          </ModalCardFooter>
        </template>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ вставка из другой схемы — такт 88 (ревью 4.5; решение 3 оркестратора) ============================
      Сайд 642, паттерн «выбор из справочника»: схема → группа (процесс) → поля (шаги) внутри одного сайда; «←» и Esc — уровень
      назад. Схемы и группы — строки-переходы `ListRow` (как список версий истории, № 56); поля и шаги — `Table` с флажками.
    -->
    <ModalCard v-model:open="pasteOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="paste" :data-kind="paste.kind" :data-level="pasteLevel" @escape-key-down="onPasteEscape">
        <ModalCardHeader v-if="pasteLevel === 'schemes'" :title="pasteTitle" :subtitle="pasteSubtitle" />
        <ModalCardHeader v-else back :title="pasteTitle" :subtitle="pasteSubtitle" @back="pasteBack()" />
        <ModalCardBody class="flex flex-col gap-4">
          <!-- Первый уровень — схемы: той же компании и отобранные шаблоны, поиск по названию. -->
          <template v-if="pasteLevel === 'schemes'">
            <Input v-model="pasteQuery" placeholder="Поиск схемы по названию" data-field="paste-search" />
            <FieldSet v-for="g in pasteSchemes" :key="g.id" :legend="g.title" :data-paste-group="g.id">
              <!-- Довесок 1 к такту 101: строки-карточки — колонками по ширине сайда, как сетка каталога. -->
              <div class="grid gap-2" :class="phone ? 'grid-cols-1' : sideCols">
                <ListRow v-for="d in g.schemes" :key="d.id" :data-paste-scheme="d.id" @click="pasteGo(d.id)">
                  <HighlightText :text="d.title" :query="paste.query" />
                  <template #secondary>
                    {{ donorMeta(d) }}
                  </template>
                </ListRow>
              </div>
            </FieldSet>
            <Empty
              v-if="!pasteSchemes.length"
              :title="`Ничего не найдено по «${paste.query.trim()}»`"
              description="Ищется по названию среди схем компании и отобранных шаблонов"
              data-paste-empty
            />
          </template>

          <!-- Второй уровень — группы полей либо процессы схемы. -->
          <div v-else-if="pasteLevel === 'parts'" class="grid gap-2" :class="phone ? 'grid-cols-1' : sideCols" data-paste-parts>
            <ListRow v-for="x in pasteParts" :key="x.id" :disabled="x.empty" :data-paste-part="x.id" @click="pasteOpenPart(x.id)">
              {{ x.title }}
              <template #secondary>
                {{ x.meta }}
              </template>
            </ListRow>
          </div>

          <!-- Третий уровень — поля группы: тип, алиас, конфликт алиаса до вставки. -->
          <!-- Узкий экран (такт 92): колонка названия не уже 176 — таблица прокручивается вбок. -->
          <Table v-else-if="paste.kind === 'fields'" data-paste-table>
            <TableRow>
              <TableHead variant="column" class="w-10 justify-center px-2" aria-label="Выбор полей группы">
                <Checkbox :model-value="pasteAll === 'all'" :indeterminate="pasteAll === 'some'" data-paste-all @update:model-value="pasteToggleAll()" />
              </TableHead>
              <TableHead variant="column" class="min-w-0 flex-1 px-4 max-md:min-w-44">
                Поле
              </TableHead>
              <TableHead variant="column" class="w-40 px-4">
                Алиас
              </TableHead>
              <TableHead variant="column" class="w-28 px-4">
                Тип
              </TableHead>
            </TableRow>
            <TableRow
              v-for="r in pasteFieldRows"
              :key="r.field.id"
              :state="paste.picked.includes(r.field.id) ? 'selected' : 'default'"
              :data-paste-row="r.field.id"
              :data-conflict="r.conflict || undefined"
            >
              <TableCell variant="slot" align="start" class="w-10 justify-center px-2">
                <Checkbox :model-value="paste.picked.includes(r.field.id)" :aria-label="r.field.title" @update:model-value="pasteToggle(r.field.id)" />
              </TableCell>
              <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start px-4 pt-4.5 pb-3 contain-inline-size max-md:min-w-44">
                <TableCellIdentity class="w-full flex-none">
                  {{ r.field.title }}
                  <template v-if="r.conflict" #description>
                    алиас {{ r.field.alias }} уже есть — будет {{ r.alias }}
                  </template>
                </TableCellIdentity>
              </TableCell>
              <TableCell align="start" class="w-40 px-4" data-paste-alias>
                {{ r.field.alias || 'не задан' }}
              </TableCell>
              <TableCell variant="slot" align="start" class="w-28 px-4">
                <Chip variant="neutral">
                  {{ typeLabel(r.field.type) }}
                </Chip>
              </TableCell>
            </TableRow>
          </Table>

          <!-- Третий уровень — шаги процесса: процесс-цель, тип и способ съёмки; подсказки и нейросети переносятся с шагом. -->
          <template v-else>
            <Field label="Вставить в процесс" :orientation="phone ? 'top' : 'left'" :control-height="40" data-field="paste-target">
              <div class="w-72">
                <Select v-model="pasteTarget" :items="pasteTargetItems" placeholder="" :show-icon="false" :searchable="false" />
              </div>
            </Field>
            <Table data-paste-table>
              <TableRow>
                <TableHead variant="column" class="w-10 justify-center px-2" aria-label="Выбор шагов процесса">
                  <Checkbox :model-value="pasteAll === 'all'" :indeterminate="pasteAll === 'some'" data-paste-all @update:model-value="pasteToggleAll()" />
                </TableHead>
                <TableHead variant="column" class="min-w-0 flex-1 px-4 max-md:min-w-44">
                  Шаг
                </TableHead>
                <TableHead variant="column" class="w-40 px-4">
                  Тип шага
                </TableHead>
                <TableHead variant="column" class="w-28 px-4">
                  Способ
                </TableHead>
              </TableRow>
              <TableRow v-for="st in pasteStepRows" :key="st.id" :state="paste.picked.includes(st.id) ? 'selected' : 'default'" :data-paste-row="st.id">
                <TableCell variant="slot" align="start" class="w-10 justify-center px-2">
                  <Checkbox :model-value="paste.picked.includes(st.id)" :aria-label="st.title" @update:model-value="pasteToggle(st.id)" />
                </TableCell>
                <TableCell variant="slot" class="h-auto min-w-0 flex-1 flex-col items-start px-4 pt-4.5 pb-3 contain-inline-size max-md:min-w-44">
                  <TableCellIdentity class="w-full flex-none">
                    {{ st.title }}
                    <template #description>
                      {{ stepCarry(st) }}
                    </template>
                  </TableCellIdentity>
                </TableCell>
                <TableCell variant="slot" align="start" class="w-40 px-4">
                  <Chip variant="neutral">
                    {{ kindLabel(st.kind) }}
                  </Chip>
                </TableCell>
                <TableCell align="start" class="w-28 px-4" data-paste-method>
                  {{ st.method }}
                </TableCell>
              </TableRow>
            </Table>
          </template>
        </ModalCardBody>
        <ModalCardFooter>
          <template #note>
            Выбрано: {{ paste.picked.length }}
          </template>
          <Button variant="secondary" data-act="paste-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button :disabled="!paste.picked.length" data-act="paste-confirm" @click="confirmPaste()">
            {{ pasteConfirmText }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!--
      ============================ просмотр фото-подсказок крупно — такт 87: `Lightbox` с `FrameStage` ============================
      Монтируется при открытии: портал окна, смонтированный при загрузке страницы, встаёт в `body` раньше порталов сайдов и
      оказывается под ними — просмотр из каталога не нажимался бы (ловушка такта 87).
    -->
    <Lightbox v-if="viewer" v-model:open="viewerOpen" :index="(viewer?.index ?? 0) + 1" :total="viewer?.items.length ?? 0" :caption="viewerItem?.caption ?? ''" @update:index="viewerStep">
      <template v-if="viewerItem?.pick" #actions>
        <Button
          :variant="cat.picked.includes(viewerItem.pick) ? 'secondary' : 'default'"
          :show-icon="cat.picked.includes(viewerItem.pick)"
          :disabled="attached.has(viewerItem.pick)"
          data-act="viewer-pick"
          @click="togglePick(viewerItem.pick)"
        >
          <template #icon>
            <Icon name="check" :size="16" />
          </template>
          {{ attached.has(viewerItem.pick) ? 'Уже у шага' : cat.picked.includes(viewerItem.pick) ? 'Выбрано' : 'Выбрать' }}
        </Button>
      </template>
      <FrameStage v-if="viewerItem" :src="viewerItem.src" :alt="viewerItem.caption" />
    </Lightbox>

    <!-- ============================ сайд группы — № 68: поля по блоку «Настройки группы» `33179:4467` ============================ -->
    <ModalCard v-model:open="groupOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="group">
        <ModalCardHeader :title="gd.id ? `Редактирование группы — ${gdTitle}` : 'Добавление группы'" />
        <ModalCardBody class="flex flex-col gap-4">
          <Field label="Название" required :invalid="gdInvalid" :hint="gdInvalid ? 'Заполните название группы' : ''">
            <Input v-model="gd.title" placeholder="Например, Документы" :show-icon="false" :invalid="gdInvalid" data-field="gdTitle" />
          </Field>
          <Field label="Алиас" hint="Латиницей без пробелов — первая часть переменной формулы {Алиас:поле}">
            <div class="flex items-center gap-2">
              <Input v-model="gd.alias" placeholder="Например, Docs" :show-icon="false" class="min-w-0 flex-1" data-field="gdAlias" />
              <IconButton variant="secondary" size="lg" label="Предложить по названию" data-act="group-alias-suggest" @click="suggestGroupAlias()">
                <Icon name="auto-fix" :size="20" />
              </IconButton>
            </div>
          </Field>
          <Field label="Экран создания" data-field="gdScreen">
            <Select v-model="gd.createScreen" :items="CREATE_SCREENS" placeholder="" :show-icon="false" :searchable="false" />
          </Field>
          <Field label="В мобильном" data-field="gdMobile">
            <Select v-model="gd.mobile" :items="MOBILE_SHOW" placeholder="" :show-icon="false" :searchable="false" />
          </Field>
          <Checkbox v-model="gd.editable" subtitle="Поля группы можно править после создания осмотра" data-field="gdEditable">
            Разрешить редактирование
          </Checkbox>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="group-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button data-act="group-save" @click="saveGroupSide()">
            {{ gd.id ? 'Сохранить' : 'Добавить группу' }}
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ публикация: модалка-гейт с диффом — № 54, 58 ============================ -->
    <ModalCard v-model:open="publishOpen">
      <ModalCardContent narrow="full" data-modal="publish">
        <ModalCardHeader title="Публикация схемы" subtitle="Эти изменения войдут в новую версию и будут применяться к новым осмотрам" />
        <ModalCardBody class="flex flex-col gap-4">
          <!-- Такт 91 (5.5): проверки модели готовности над диффом — та же правда, что у чипа; «Исправить» ведёт к месту. -->
          <ReadinessList v-if="checkGroups.length" :groups="checkGroups" data-publish-checks @fix="fixFrom" />
          <Diff
            v-if="m.draftDiff.value"
            :areas="m.draftDiff.value.areas"
            :attention="m.draftDiff.value.attention"
            :total="m.draftDiff.value.total"
          />
        </ModalCardBody>
        <ModalCardFooter>
          <template #note>
            {{ publishNote }}
          </template>
          <!-- Сверка дублей, такт 73: отказ от окна — «Отмена» `secondary`, как в сайдах и окнах подтверждения (строки 33, 89). -->
          <Button variant="secondary" data-act="publish-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button :disabled="m.blocked.value" data-act="publish-confirm" @click="m.confirmPublish()">
            Опубликовать
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ первая публикация — № 55 ============================ -->
    <ModalCard v-model:open="firstPublishOpen">
      <ModalCardContent narrow="full" data-modal="first-publish">
        <ModalCardHeader title="Первая публикация схемы" />
        <ModalCardBody class="flex flex-col gap-4">
          <ModalCardText>
            Схема публикуется впервые. После публикации она станет доступна для создания осмотров.
          </ModalCardText>
          <!-- Такт 91 (5.5): та же модель готовности вместо сводки — этапы с проверками и «Исправить». -->
          <ReadinessList :groups="stageGroups(true)" data-first-readiness @go="goStageFrom" @fix="fixFrom" @manual="manualFrom" />
        </ModalCardBody>
        <ModalCardFooter>
          <template #note>
            {{ publishNote }}
          </template>
          <Button variant="secondary" data-act="first-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button :disabled="m.blocked.value" data-act="first-confirm" @click="m.confirmPublish()">
            Опубликовать
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ «Сбросить черновик?» — № 60 ============================ -->
    <ModalCard v-model:open="resetOpen">
      <ModalCardContent narrow="full" data-modal="reset">
        <ModalCardHeader title="Сбросить черновик?" :subtitle="`Черновик вернётся к текущей версии от ${currentDate}. Будет сброшено:`" />
        <ModalCardBody>
          <Diff v-if="m.draftDiff.value" :areas="m.draftDiff.value.areas" :attention="m.draftDiff.value.attention" :total="m.draftDiff.value.total" />
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="reset-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button variant="destructive" data-act="reset-confirm" @click="m.confirmReset()">
            Сбросить черновик
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ «Удалить схему?» — № 8 ============================ -->
    <ModalCard v-model:open="deleteOpen">
      <ModalCardContent narrow="full" size="sm" data-modal="delete">
        <ModalCardHeader title="Удалить схему?" />
        <ModalCardBody>
          <ModalCardText>
            Схема и её черновик будут удалены. Опубликованные версии останутся у осмотров, которые по ним прошли.
          </ModalCardText>
        </ModalCardBody>
        <ModalCardFooter>
          <Button variant="secondary" data-act="delete-cancel" @click="m.closeSurface()">
            Отмена
          </Button>
          <Button variant="destructive" data-act="delete-confirm" @click="m.confirmDelete()">
            Удалить
          </Button>
        </ModalCardFooter>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ история версий: сайд и дифф версии — № 56 ============================ -->
    <ModalCard v-model:open="historyOpen" :dock="sideDock">
      <ModalCardContent v-model:width="sideWidth" narrow="full" placement="edge" :resizable="!phone" data-side="history">
        <template v-if="!m.versionShown.value">
          <ModalCardHeader title="История версий" subtitle="Публикации схемы: текущая версия сверху" />
          <ModalCardBody class="flex flex-col gap-2">
            <Empty v-if="!m.history.value.length" title="Публикаций ещё не было" description="Версия появится после первой публикации схемы" />
            <ListRow v-for="v in m.history.value" :key="v.id" :active="v.current" :data-version="v.id" @click="m.openVersion(v.id)">
              Версия от {{ v.date }}
              <template #secondary>
                {{ v.meta }}
              </template>
              <template v-if="v.current" #trailing>
                <Badge size="sm">Текущая</Badge>
              </template>
            </ListRow>
          </ModalCardBody>
        </template>
        <!-- Второй слой: дифф версии с предыдущей; «←» возвращает к списку. -->
        <template v-else>
          <ModalCardHeader back :title="`Версия от ${m.versionShown.value.date}`" :subtitle="m.versionShown.value.meta" @back="m.closeVersion()" />
          <ModalCardBody class="flex flex-col gap-4">
            <Diff
              v-if="m.versionDiff.value"
              :areas="m.versionDiff.value.areas"
              :attention="m.versionDiff.value.attention"
              :total="m.versionDiff.value.total"
            />
            <ModalCardText v-else data-version-first>
              Первая публикация схемы: сравнивать не с чем
            </ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="outline" data-act="version-copy" @click="m.copy()">
              Сделать копию
            </Button>
            <Button v-if="!m.versionShown.value.current" variant="secondary" data-act="version-view" @click="m.view(m.versionShown.value.id)">
              Открыть версию
            </Button>
          </ModalCardFooter>
        </template>
      </ModalCardContent>
    </ModalCard>

    <!-- ============================ «Сделать копию» — окно «Новая схема осмотра» на шаге «Основа» (такт 91) ============================ -->
    <SchemeCreate v-model:open="copyOpen" mode="copy" :copy="m.copySource.value" @create="createCopy" @notify="m.notify($event)" />

    <!-- Узкий экран (такт 92): стопка во всю ширину окна с полями 16 (`narrow="full"`). -->
    <Toaster :bottom="toastBottom" narrow="full">
      <Toast
        v-for="n in m.notices"
        :key="n.id"
        :open="true"
        :duration="n.undo ? 6000 : 3000"
        :show-action="n.undo"
        @update:open="m.dismissNotice(n.id)"
        @action="m.undo(n.id)"
      >
        {{ n.text }}
        <template v-if="n.undo" #action>
          Отменить
        </template>
      </Toast>
    </Toaster>
    </div>
    </NuxtLayout>
  </div>
</template>
