<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formulaPreview } from '~/components/ui/formula-input'
import { tableRowActionsColumn, type TableRowActionItem } from '~/components/ui/table'
import {
  ACCESS_GROUPS, ACCESS_ROLES, COMMENT_DICTIONARIES, createModel, DEADLINE_EVENTS, DETECTOR_GROUPS, DETECTOR_IDS, FINISH_CLASSES, OWNERS,
  PDF_PROGRAMS, PDF_SIGNERS, PDF_WHEN, PHOTO_RESOLUTIONS, REGION_MATRICES, ROLE_LADDER, ROLES, SCHEME_TYPES, SECTION_ANCHORS, SECTIONS,
  STATUS_DICTIONARIES, TABS, VIDEO_RESOLUTIONS,
  type BehaviorSettings, type Dataset, type FormulaSettings, type PdfTemplate, type PdfTemplateDraft, type SaveState, type SectionId, type TabId,
} from '~/stands/scheme-edit/model'
import demo from '~/stands/scheme-edit/demo-data.json'

/**
 * Страница «Редактирование схемы осмотра» (VA-16377) — стенд, такты 61–63, порции П1–П3 (`docs/scheme-edit.md`,
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
 * «PDF» (шаблоны, подписание, формула имени файла); сайд «Добавление шаблона» (№ 38). Табы «Форма», «Процессы и
 * шаги», «Витрина» — порциями П6–П8: на их месте `Empty`.
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
 * | `?save=saving` | статус «Сохранение…» без завершения записи |
 * | `?save=error` | статус «Ошибка сохранения» с «Повторить» |
 * | `?save=fail` | следующая запись черновика завершается ошибкой (СС-49) |
 */
definePageMeta({ layout: 'admin' })
useHead({ title: 'Редактирование схемы осмотра — стенд' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')

const D = demo as unknown as Record<'main' | 'fresh', Dataset>
const tabAtLoad = TABS.find(t => t.id === q('tab'))?.id
const saveAtLoad = (['saving', 'error'] as SaveState[]).find(s => s === q('save'))
const m = createModel(q('data') === 'new' ? D.fresh : D.main, { tab: tabAtLoad, save: saveAtLoad, failNext: q('save') === 'fail' })
const sectionAtLoad = SECTIONS.find(s => s.id === q('section'))?.id
if (sectionAtLoad) m.setSection(sectionAtLoad)
if (q('open') === 'comments') m.openSide('comments')
if (q('type') === 'house') m.draft.config.settings.general.schemeType = 'house'

const general = computed(() => m.draft.config.settings.general)
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
const settings = computed(() => m.draft.config.settings)
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
function openTemplate(id: string) {
  tpl.value = { ...(pdf.value.templates.find(t => t.id === id) ?? EMPTY_TEMPLATE) }
  tplInvalid.value = false
  m.openSide('template')
}
if (q('open') === 'template') { m.setSection('pdf'); m.openSide('template') }
const templateOpen = computed({
  get: () => m.topSurface.value?.id === 'template',
  set: (v) => { if (!v) m.closeSurface() },
})
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
const sideOpen = computed({
  get: () => m.topSurface.value?.id === 'comments',
  set: (v) => { if (!v) m.closeSurface() },
})
watch(sideOpen, (v) => { if (v) sideDict.value = general.value.dictionaries.comments }, { immediate: true })
const sideComments = computed(() => COMMENT_DICTIONARIES.find(d => d.value === sideDict.value)?.comments ?? [])
function saveSide() {
  m.set('settings.general.dictionaries.comments', sideDict.value)
  m.closeSurface()
}

/** Содержимое, которое соберут следующие порции, — план `scheme-edit.md`, раздел 10. */
const PENDING: Record<Exclude<TabId, 'settings'>, { title: string, description: string }> = {
  form: { title: '«Форма» — порция П6', description: 'Группы, поля, сайды поля и группы, массовый выбор' },
  processes: { title: '«Процессы и шаги» — порция П7', description: 'Процессы, таблицы шагов, массовые действия, сайды и оверлей' },
  showcase: { title: '«Витрина» — порция П8', description: 'Статус карточки, витринная карточка, «Зачем нужен осмотр», «Из схемы»' },
}

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
    class="flex min-w-0 flex-col gap-6"
  >
    <div class="flex">
      <ButtonNavigation size="base" direction="left" data-act="back" @click="m.back()">
        Назад
      </ButtonNavigation>
    </div>

    <div class="flex flex-col gap-2">
      <Heading level="page" as="h1" data-scheme-title>
        {{ general.name }}
      </Heading>

      <!-- Строка состояния и действий: слева — индикатор публикации (П4) и статус автосохранения, справа — действия. -->
      <div class="flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <AppBarStatus surface="light" retryable :state="m.save.state" @retry="m.retry()" />
        <Button data-act="publish" @click="m.publish()">
          Опубликовать схему
        </Button>
      </div>
    </div>

    <Tabs v-model="tab">
      <TabsList>
        <TabsTrigger v-for="t in TABS" :key="t.id" :value="t.id" :data-tab-trigger="t.id">
          {{ t.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings">
        <!-- Каркас «Настроек»: колонка содержимого 846 и правый навигатор 266, зазор 24 — макет `33346:5470`. -->
        <div class="flex items-start gap-6 pt-6">
          <div ref="column" class="flex max-w-settings min-w-0 flex-1 flex-col gap-8" data-settings-column>
            <template v-if="m.ui.section === 'general'">
              <!-- ============================ Основное — № 16, 17, 19 ============================ -->
              <section id="anchor-main" data-anchor-section="main" class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-4">
                  <Heading level="title" description="Базовые параметры схемы осмотра">
                    Основное
                  </Heading>
                  <Card class="px-6 py-3.5">
                    <Switch v-model="active" data-field="active">
                      Схема активна
                    </Switch>
                  </Card>
                </div>
                <Card class="flex flex-col gap-4">
                  <Field label="Наименование">
                    <Input v-model="name" placeholder="" :show-icon="false" data-field="name" />
                  </Field>
                  <Field label="Описание" hint="Описание поможет различать схемы в общем списке и даст понимание ИИ, какую схему применять в конкретном случае">
                    <Textarea v-model="description" placeholder="Введите описание схемы осмотра" data-field="description" />
                  </Field>
                  <Field label="Тип схемы осмотра" hint="Определяет структуру и набор полей формы осмотра" data-field="schemeType">
                    <Select v-model="schemeType" :items="SCHEME_TYPES" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field label="Компания-владелец" data-field="owner">
                    <Autocomplete v-model="owner" :items="OWNERS" placeholder="Найти компанию" />
                  </Field>
                  <Field label="Тип осмотра" hint="Мультиосмотр объединяет несколько объектов в одном осмотре">
                    <RadioGroup v-model="inspectionType" class="grid grid-cols-3" data-radio="inspectionType">
                      <RadioGroupItem variant="card" value="regular" :checked="inspectionType === 'regular'">
                        Обычный
                      </RadioGroupItem>
                      <RadioGroupItem variant="card" value="multi" :checked="inspectionType === 'multi'">
                        Мультиосмотр
                      </RadioGroupItem>
                    </RadioGroup>
                  </Field>
                  <Field label="Назначение схемы" hint="От назначения зависит доступность части настроек">
                    <RadioGroup v-model="purpose" class="grid grid-cols-3" data-radio="purpose">
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
                    <SettingRow data-setting="skipExpertise">
                      <Checkbox :model-value="beh.skipExpertise" subtitle="Осмотр будет сразу передан на проверку без этапа экспертизы" @update:model-value="setB('skipExpertise', $event)">
                        Пропускать экспертизу
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="lockOnReview" :collapsed="!beh.lockOnReview">
                      <Checkbox :model-value="beh.lockOnReview" subtitle="Запрещает редактирование осмотра другими пользователями во время проверки" @update:model-value="setB('lockOnReview', $event)">
                        Блокировать осмотр при проверке
                      </Checkbox>
                      <template #children>
                        <Field label="Разблокировать при неактивности через, минут" orientation="left" :control-height="32" data-field="unlockMinutes">
                          <InputNumber v-model="unlockMinutes" :min="5" :max="120" :step="5" />
                        </Field>
                      </template>
                    </SettingRow>
                    <SettingRow v-slot="{ disabled }" data-setting="quickAccept" :reason="m.rule('quickAccept').reason">
                      <Checkbox :model-value="beh.quickAccept" :disabled="disabled" subtitle="Проверяющий сможет утвердить осмотр без поэтапного прохождения всех шагов" @update:model-value="setB('quickAccept', $event)">
                        Разрешить принимать осмотр одной кнопкой
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="requireAllSteps">
                      <Checkbox :model-value="beh.requireAllSteps" subtitle="Возврат на доработку возможен только после вынесения решения по каждому шагу" @update:model-value="setB('requireAllSteps', $event)">
                        Требовать решения во всех шагах для возврата на доработку
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="lowRolesReturn">
                      <Checkbox :model-value="beh.lowRolesReturn" subtitle="Агенты и операторы смогут инициировать возврат осмотра на доработку" @update:model-value="setB('lowRolesReturn', $event)">
                        Разрешить низким ролям возвращать осмотр на доработку
                      </Checkbox>
                    </SettingRow>
                  </Card>

                  <Card class="flex flex-col gap-2">
                    <Heading level="group">
                      Отказ от осмотра
                    </Heading>
                    <SettingRow data-setting="refuse" help="Исполнитель сможет завершить осмотр без съёмки, указав причину">
                      <Checkbox :model-value="beh.refuse" @update:model-value="setB('refuse', $event)">
                        Разрешить отказываться с отметкой «Осмотр невозможен»
                      </Checkbox>
                      <template #children>
                        <SettingRow v-slot="{ disabled }" data-setting="refuseRepeatable" :reason="m.rule('refuseRepeatable').reason">
                          <Checkbox :model-value="beh.refuseRepeatable" :disabled="disabled" @update:model-value="setB('refuseRepeatable', $event)">
                            Разрешить отказываться от повторяемых процессов с той же отметкой
                          </Checkbox>
                        </SettingRow>
                      </template>
                    </SettingRow>
                    <Field label="Видимость комментария к отказу" hint="Кто увидит комментарий исполнителя к отказу">
                      <RadioGroup v-model="refuseVisibility" class="grid grid-cols-3" data-radio="refuseCommentVisibility">
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
                      help="Поля для согласования отмечаются в табе «Форма»"
                      :meta="m.rule('approval').meta"
                      :meta-tone="m.rule('approval').metaTone"
                    >
                      <Checkbox :model-value="beh.approval" @update:model-value="setB('approval', $event)">
                        Отправлять поля на согласование согласующему лицу
                      </Checkbox>
                      <template v-if="beh.approval" #action>
                        <ButtonAction size="sm" :show-icon="false" data-act="go-fields" @click="goFields()">
                          Перейти к полям
                        </ButtonAction>
                      </template>
                    </SettingRow>
                    <SettingRow data-setting="approvalRequired">
                      <Checkbox :model-value="beh.approvalRequired" subtitle="Осмотр не будет принят, пока не пройдёт согласование" @update:model-value="setB('approvalRequired', $event)">
                        Обязательное согласование осмотра после экспертизы
                      </Checkbox>
                    </SettingRow>
                  </Card>

                  <Card class="flex flex-col gap-2">
                    <Heading level="group">
                      Расширенное
                    </Heading>
                    <SettingRow data-setting="cadastreMap">
                      <Checkbox :model-value="beh.cadastreMap" subtitle="Отображает геолокацию объекта на карте по кадастровому номеру" @update:model-value="setB('cadastreMap', $event)">
                        Показывать координаты на кадастровой карте
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="forbidExtraFiles">
                      <Checkbox :model-value="beh.forbidExtraFiles" subtitle="Пользователь не сможет прикрепить файлы за пределами обязательных полей" @update:model-value="setB('forbidExtraFiles', $event)">
                        Запретить использовать блок дополнительных файлов
                      </Checkbox>
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
                    <Field :label="f.label" :hint="f.hint">
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
                <Card class="grid grid-cols-2 items-start gap-6">
                  <Field label="Словарь статусов" data-field="statusDict">
                    <Select v-model="statusDict" :items="STATUS_DICTIONARIES" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field label="Словарь комментариев" data-field="commentDict">
                    <ListRow data-act="open-comments" @click="m.openSide('comments')">
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
                    <RadioGroup v-model="deadlineMode" class="grid grid-cols-3" data-radio="deadlineMode">
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
                      <Field v-if="deadlineMode === 'hours'" label="Часов" orientation="left" :control-height="32" data-field="deadlineHours">
                        <InputNumber v-model="deadlineHours" :min="1" :max="240" />
                      </Field>
                      <Field v-else label="Дней" orientation="left" :control-height="32" data-field="deadlineDays">
                        <InputNumber v-model="deadlineDays" :min="1" :max="90" />
                      </Field>
                    </div>
                    <Field label="Событие отсчёта" :disabled="deadlineMode === 'none'" data-field="deadlineFrom">
                      <Select v-model="deadlineFrom" :items="DEADLINE_EVENTS" placeholder="" :show-icon="false" :searchable="false" :disabled="deadlineMode === 'none'" />
                    </Field>
                  </div>
                  <div class="flex flex-col gap-3">
                    <Heading level="group">
                      Кто может редактировать дедлайн
                    </Heading>
                    <Select v-model:values="deadlineEditors" multiple :items="ROLES" placeholder="Выберите роли" data-field="deadlineEditors" />
                  </div>
                  <Field label="Кто может делиться осмотром">
                    <RadioGroup v-model="share" class="grid grid-cols-4" data-radio="share">
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
                  <Field label="Кто может задавать координату вручную">
                    <Select v-model:values="manualCoordinate" multiple :items="ROLES" placeholder="Выберите роли" data-field="manualCoordinate" />
                  </Field>
                </Card>
              </section>

              <!-- ============================ Экран подтверждения — № 24 ============================ -->
              <section id="anchor-confirm" data-anchor-section="confirm" class="flex flex-col gap-4">
                <Heading level="title" description="Тексты, отображаемые клиенту перед финальным подтверждением осмотра">
                  Экран подтверждения
                </Heading>
                <Card class="grid grid-cols-2 items-start gap-6">
                  <Field label="Подсказка клиенту" hint="Текст подсказки на экране подтверждения">
                    <Input v-model="confirmHint" placeholder="Введите подсказку для экрана подтверждения" :show-icon="false" data-field="confirmHint" />
                  </Field>
                  <Field label="Текст галочки" hint="Текст рядом с чекбоксом подтверждения">
                    <Input v-model="confirmCheckbox" placeholder="Информация напротив галочки подтверждения" :show-icon="false" data-field="confirmCheckbox" />
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
                  <Field label="Режим выполнения">
                    <RadioGroup v-model="mobileMode" class="grid grid-cols-2" data-radio="mobileMode">
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
                  <Field label="Разрешение фото" data-field="photo">
                    <Select v-model="mobilePhoto" :items="PHOTO_RESOLUTIONS" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field label="Разрешение видео" data-field="video">
                    <Select v-model="mobileVideo" :items="VIDEO_RESOLUTIONS" placeholder="" :show-icon="false" :searchable="false" />
                  </Field>
                  <Field label="Телефон для звонка" hint="Номер, на который будет совершён звонок из мобильного приложения">
                    <Input v-model="mobilePhone" placeholder="+7 900 000 00 00" :show-icon="false" data-field="phone" />
                  </Field>
                  <Field label="Название телефона" hint="Отображаемое имя контакта, которое увидит пользователь при звонке">
                    <Input v-model="mobilePhoneName" placeholder="Например, «Служба поддержки»" :show-icon="false" data-field="phoneName" />
                  </Field>
                  <Field label="Запрос подтверждения звонка" hint="Сообщение, показываемое пользователю перед началом звонка для подтверждения">
                    <Input v-model="mobileCallConfirm" placeholder="Текст перед набором номера" :show-icon="false" data-field="callConfirm" />
                  </Field>
                </Card>
              </section>

              <section id="anchor-mobile-behavior" data-anchor-section="mobile-behavior" class="flex flex-col gap-4">
                <Card class="flex flex-col gap-2">
                  <Heading level="group">
                    Поведение в мобильном приложении
                  </Heading>
                  <SettingRow data-setting="startAfterCreate">
                    <Checkbox :model-value="mob.startAfterCreate" subtitle="Пользователь сразу переходит к выполнению без промежуточного экрана" @update:model-value="setS('mobile.startAfterCreate', $event)">
                      Запустить осмотр сразу после создания
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="hideHints">
                    <Checkbox :model-value="mob.hideHints" subtitle="Опытные пользователи — те, кто проходил осмотр минимум три раза по данной схеме" @update:model-value="setS('mobile.hideHints', $event)">
                      Разрешать опытным пользователям скрывать подсказки к шагам
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="skipConfirm">
                    <Checkbox :model-value="mob.skipConfirm" subtitle="Опытные пользователи — те, кто проходил осмотр минимум три раза по данной схеме" @update:model-value="setS('mobile.skipConfirm', $event)">
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
                    <SettingRow data-setting="feedback">
                      <Checkbox :model-value="web.feedback" subtitle="Позволяет экспертам оставлять комментарии и оценки по результатам проверки" @update:model-value="setS('web.feedback', $event)">
                        Блок обратной связи на странице экспертизы
                      </Checkbox>
                    </SettingRow>
                  </div>
                  <div class="flex flex-col gap-3" data-reasons>
                    <Heading level="group" description="Типы обоснований, которые эксперт может выбрать при проверке">
                      Варианты обоснований
                    </Heading>
                    <Callout v-if="m.rule('feedbackBlock').reason" data-reason-callout="feedback">
                      {{ m.rule('feedbackBlock').reason }}
                    </Callout>
                    <!-- Вариант — «название — ключ»; крестик снимает вариант, уведомление предлагает отмену. -->
                    <div v-if="web.reasons.length" class="flex flex-wrap gap-2">
                      <Chip v-for="r in web.reasons" :key="r.key" :trailing="web.feedback ? 'remove' : 'none'" :data-reason="r.key" @remove="m.removeReason(r.key)">
                        {{ r.title }} — {{ r.key }}
                      </Chip>
                    </div>
                    <Card v-if="reasonForm && web.feedback" tone="muted" class="flex flex-col gap-4" data-reason-form>
                      <FieldSet legend="Новое обоснование">
                        <div class="grid grid-cols-2 items-start gap-4">
                          <Field label="Ключ">
                            <Input v-model="reasonKey" placeholder="Например, geo" variant="elevated" :show-icon="false" data-field="reasonKey" />
                          </Field>
                          <Field label="Название">
                            <Input v-model="reasonTitle" placeholder="Например, «Координаты»" variant="elevated" :show-icon="false" data-field="reasonTitle" />
                          </Field>
                        </div>
                      </FieldSet>
                      <div class="flex items-center gap-2">
                        <Button data-act="reason-create" @click="createReason()">
                          Создать обоснование
                        </Button>
                        <Button variant="outline" data-act="reason-cancel" @click="closeReasonForm()">
                          Отменить
                        </Button>
                      </div>
                    </Card>
                    <div v-else class="flex">
                      <Button variant="outline" show-icon :disabled="!web.feedback" data-act="reason-add" @click="reasonForm = true">
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
                  <SettingRow data-setting="blockRepeat">
                    <Checkbox :model-value="web.blockRepeat" :disabled="!web.feedback" @update:model-value="setS('web.blockRepeat', $event)">
                      Запретить переход в «Повтор»
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="blockRefuse">
                    <Checkbox :model-value="web.blockRefuse" :disabled="!web.feedback" @update:model-value="setS('web.blockRefuse', $event)">
                      Запретить переход в «Отказ»
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="blockContract">
                    <Checkbox :model-value="web.blockContract" :disabled="!web.feedback" @update:model-value="setS('web.blockContract', $event)">
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
                  <Field label="Кто может выполнять осмотр">
                    <Select v-model:values="executors" multiple :items="ACCESS_ROLES" placeholder="Выберите роли" data-field="executors" />
                  </Field>
                  <Field label="Кто может управлять выполнением осмотра">
                    <RadioGroup v-model="accessManage" class="grid grid-cols-3" data-radio="manage">
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
                  <Field label="Кто может управлять созданием осмотра">
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
                  <Field label="Необходимая роль для создания" :disabled="createMode === 'open'" :hint="createMode === 'open' ? 'При открытом создании роль не проверяется' : ''">
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
                  <TableToolbar class="items-center gap-3">
                    <Input v-model="groupQuery" variant="elevated" placeholder="Поиск по названию группы и компании" class="max-w-110 min-w-0" data-field="groupQuery" />
                    <div class="w-56 shrink-0" data-field="groupFilter">
                      <Select v-model="groupFilter" variant="elevated" :items="GROUP_FILTERS" placeholder="" :show-icon="false" :searchable="false" />
                    </div>
                    <ToolbarText class="ml-auto" data-groups-count>
                      Выбрано {{ access.groups.length }}
                    </ToolbarText>
                  </TableToolbar>
                  <Table attached-top :attached="groupTotal > 0">
                    <TableRow>
                      <TableHead variant="column" class="w-16 justify-center px-6" aria-label="Выбор групп на странице">
                        <Checkbox
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
                    <TableEmptySearch v-if="groupTotal === 0" @reset="resetGroupSearch()" />
                    <TableRow v-for="g in groupRows" v-else :key="g.id" :state="access.groups.includes(g.id) ? 'selected' : 'default'" :data-group="g.id">
                      <TableCell variant="slot" class="w-16 justify-center px-6">
                        <Checkbox :model-value="access.groups.includes(g.id)" :aria-label="g.name" @update:model-value="m.toggleGroup(g.id)" />
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
                  <TableFooter
                    v-if="groupTotal"
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
              <Callout title="Доступные ИИ-модули зависят от типа объекта схемы" data-ai-banner>
                Текущий тип: {{ schemeTypeLabel }}
              </Callout>

              <section id="anchor-finish" data-anchor-section="finish" class="flex flex-col gap-4">
                <Heading level="title" description="Автоматический расчёт стоимости ремонта по классам отделки для недвижимости">
                  Анализ стоимости отделки
                </Heading>
                <Callout v-if="finishOff" tone="warning" data-reason-callout="finish">
                  {{ m.rule('finishCost').reason }}. Тип схемы задаётся в разделе «Общие → Основное»
                </Callout>
                <Card class="flex flex-col gap-4">
                  <Heading level="group" description="Привязанные по алиасам поля формы осмотра будут подставлены в расчёт стоимости отделки">
                    Поля для расчётов
                  </Heading>
                  <div class="grid grid-cols-2 items-start gap-6">
                    <Field label="Алиас для «Общая площадь объекта»" hint="Системное имя поля. Формат: namespace:fieldname" :disabled="finishOff">
                      <Input v-model="aliasTotal" placeholder="" :show-icon="false" :disabled="finishOff" data-field="aliasTotal" />
                    </Field>
                    <Field label="Алиас для «Площадь отдельного помещения»" hint="Системное имя поля. Формат: namespace:fieldname" :disabled="finishOff">
                      <Input v-model="aliasRoom" placeholder="" :show-icon="false" :disabled="finishOff" data-field="aliasRoom" />
                    </Field>
                  </div>
                </Card>
              </section>

              <section id="anchor-costs" data-anchor-section="costs" class="flex flex-col gap-4">
                <Heading level="title" description="Значения стоимости отделки по каждому классу для использования в расчётах">
                  Стоимость классов отделки
                </Heading>
                <div class="flex min-w-0 flex-col" data-costs-table>
                  <TableToolbar class="items-center justify-end gap-3">
                    <Button variant="outline" :disabled="finishOff" data-act="costs-reset" @click="m.resetCosts()">
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
                        <Badge variant="neutral">
                          {{ c.code }}
                        </Badge>
                      </TableCell>
                      <TableCell class="min-w-0 flex-1 px-4">
                        {{ c.title }}
                      </TableCell>
                      <TableCell variant="slot" class="w-60 px-4">
                        <Input
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
                  <Field label="Матрица корректировок" :disabled="finishOff" data-field="regionMatrix">
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
                  <Callout v-if="autoOff" tone="warning" data-reason-callout="auto">
                    {{ m.rule('autoModules').reason }}. Тип схемы задаётся в разделе «Общие → Основное»
                  </Callout>
                  <SettingRow data-setting="damage">
                    <Checkbox :model-value="ai.damage" :disabled="autoOff" subtitle="Находит повреждения кузова на фотографиях" @update:model-value="setS('ai.damage', $event)">
                      Распознавание повреждений
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="vinRecognition">
                    <Checkbox :model-value="ai.vinRecognition" :disabled="autoOff" subtitle="Читает VIN с фотографии и сверяет с полем формы" @update:model-value="setS('ai.vinRecognition', $event)">
                      Распознавание VIN
                    </Checkbox>
                  </SettingRow>
                  <SettingRow data-setting="damageCost">
                    <Checkbox :model-value="ai.damageCost" :disabled="autoOff" subtitle="Оценивает стоимость ремонта найденных повреждений" @update:model-value="setS('ai.damageCost', $event)">
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
                  <SettingRow data-setting="anomaliesEnabled">
                    <Switch :model-value="anomalies.enabled" subtitle="Детекторы подозрительной активности при проведении осмотра" @update:model-value="setS('anomalies.enabled', $event)">
                      Отображать блок аномалий
                    </Switch>
                  </SettingRow>
                </Card>
                <Card class="flex flex-col gap-6">
                  <Callout v-if="anomaliesOff" data-reason-callout="anomalies">
                    {{ m.rule('anomalies').reason }}
                  </Callout>
                  <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <Checkbox
                      :model-value="m.detectorSetState(DETECTOR_IDS) === 'all'"
                      :indeterminate="m.detectorSetState(DETECTOR_IDS) === 'some'"
                      :disabled="anomaliesOff"
                      data-detector-set="all"
                      @update:model-value="m.toggleDetectorSet(DETECTOR_IDS)"
                    >
                      {{ m.detectorsOn.value }} из {{ DETECTOR_IDS.length }} включено
                    </Checkbox>
                    <div class="w-90" data-field="defaultRole">
                      <Field label="Роль видимости по умолчанию" :disabled="anomaliesOff">
                        <Select v-model="defaultRole" :items="ROLE_LADDER" placeholder="" :show-icon="false" :searchable="false" :disabled="anomaliesOff" />
                      </Field>
                    </div>
                  </div>
                  <div v-for="g in DETECTOR_GROUPS" :key="g.id" class="flex flex-col gap-1" :data-detector-group="g.id">
                    <!-- Группа из одного детектора — без подзаголовка (r2 §4). -->
                    <Checkbox
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
                        :help="d.help"
                        :meta="detectorRoleText(d.id)"
                      >
                        <Checkbox :model-value="anomalies.detectors[d.id]?.on ?? false" :disabled="anomaliesOff" @update:model-value="m.setDetector(d.id, { on: $event })">
                          {{ d.title }}
                        </Checkbox>
                        <!-- Роль — переопределением: селект появляется по запросу, у выключенного детектора управления ролью нет. -->
                        <template v-if="anomalies.detectors[d.id]?.on && !anomaliesOff" #action>
                          <template v-if="anomalies.detectors[d.id]?.role">
                            <div class="w-56" :data-field="`detRole-${d.id}`">
                              <Select
                                :model-value="anomalies.detectors[d.id]!.role"
                                :items="ROLE_LADDER"
                                placeholder=""
                                :show-icon="false"
                                :searchable="false"
                                @update:model-value="m.setDetector(d.id, { role: $event })"
                              />
                            </div>
                            <ButtonAction size="sm" :show-icon="false" :data-act="`det-inherit-${d.id}`" @click="m.setDetector(d.id, { role: '' })">
                              Вернуть роль по умолчанию
                            </ButtonAction>
                          </template>
                          <ButtonAction v-else size="sm" :show-icon="false" :data-act="`det-override-${d.id}`" @click="m.setDetector(d.id, { role: anomalies.defaultRole })">
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
                        <TableRowActions :actions="TEMPLATE_ACTIONS" @edit="openTemplate(t.id)" @action="m.removeTemplate(t.id)" />
                      </TableCell>
                    </TableRow>
                  </Table>
                  <Empty v-else title="Шаблоны не подключены" description="Без шаблона документ не формируется" />
                  <div class="flex">
                    <Button variant="outline" show-icon data-act="template-add" @click="openTemplate('')">
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
                  <SettingRow data-setting="pdfSign" :collapsed="!pdf.sign">
                    <Checkbox :model-value="pdf.sign" subtitle="Добавляет в процесс этап подписания клиентом — статус «Согласование с клиентом». Клиент получает документ и подписывает его кодом из СМС" @update:model-value="setS('pdf.sign', $event)">
                      Запрашивать подписание документа после успешной экспертизы
                    </Checkbox>
                    <template #children>
                      <div class="flex max-w-110 flex-col py-2" data-field="signer">
                        <Field label="Кто подписывает документ">
                          <Select v-model="pdfSigner" :items="PDF_SIGNERS" placeholder="" :show-icon="false" :searchable="false" />
                        </Field>
                      </div>
                      <SettingRow data-setting="showSigned">
                        <Checkbox :model-value="pdf.showSigned" @update:model-value="setS('pdf.showSigned', $event)">
                          Показывать подписанный PDF в приложении
                        </Checkbox>
                      </SettingRow>
                      <SettingRow data-setting="mailSigned">
                        <Checkbox :model-value="pdf.mailSigned" @update:model-value="setS('pdf.mailSigned', $event)">
                          Отправлять подписанный PDF на почту
                        </Checkbox>
                      </SettingRow>
                    </template>
                  </SettingRow>
                  <FieldSet legend="PDF без подписи">
                    <SettingRow data-setting="unsignedShow">
                      <Checkbox :model-value="pdf.unsignedShow" @update:model-value="setS('pdf.unsignedShow', $event)">
                        Формировать PDF без подписи и показывать в приложении после экспертизы
                      </Checkbox>
                    </SettingRow>
                    <SettingRow data-setting="unsignedMail">
                      <Checkbox :model-value="pdf.unsignedMail" @update:model-value="setS('pdf.unsignedMail', $event)">
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
                    <Field label="Формула имени PDF-документа" hint="Пустая формула — кнопка скачивания документа в приложении не покажется">
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
                  <SettingRow data-setting="attachExtra">
                    <Checkbox :model-value="pdf.attachExtra" @update:model-value="setS('pdf.attachExtra', $event)">
                      Прикреплять в конец документа PDF-файлы из дополнительных файлов
                    </Checkbox>
                  </SettingRow>
                </Card>
              </section>
            </template>

            <!-- «Назад / Далее» — № 15: соседний раздел; на первом выключена «Назад», на последнем — «Далее». -->
            <div class="flex items-center gap-4">
              <Button variant="secondary" :disabled="!m.neighbourSection(-1)" data-act="section-prev" @click="step(-1)">
                Назад
              </Button>
              <Button :disabled="!m.neighbourSection(1)" data-act="section-next" @click="step(1)">
                Далее
              </Button>
            </div>
          </div>

          <!-- Правый навигатор — № 14: липкий в колонке (r2 §3). -->
          <SectionNav v-model="section" title="Настройки" class="sticky top-6">
            <SectionNavItem v-for="s in SECTIONS" :key="s.id" :value="s.id" :label="s.label" :status="m.sectionStatus.value[s.id]">
              <SectionNavAnchor v-for="a in SECTION_ANCHORS[s.id]" :key="a.id" :label="a.label" :active="m.ui.anchor === a.id" :data-anchor-link="a.id" @select="goAnchor(a.id)" />
            </SectionNavItem>
          </SectionNav>
        </div>
      </TabsContent>

      <TabsContent v-for="t in TABS.slice(1)" :key="t.id" :value="t.id">
        <div class="flex flex-col pt-6">
          <Empty :title="PENDING[t.id as Exclude<TabId, 'settings'>].title" :description="PENDING[t.id as Exclude<TabId, 'settings'>].description" />
        </div>
      </TabsContent>
    </Tabs>

    <!-- ============================ сайд словаря комментариев — № 69 ============================ -->
    <ModalCard v-model:open="sideOpen">
      <ModalCardContent placement="edge" data-side="comments">
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
    <ModalCard v-model:open="templateOpen">
      <ModalCardContent placement="edge" data-side="template">
        <ModalCardHeader :title="tpl.id ? 'Редактирование шаблона' : 'Добавление шаблона'" />
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

    <Toaster>
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
</template>
