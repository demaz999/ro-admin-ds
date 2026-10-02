<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formulaPreview } from '~/components/ui/formula-input'
import {
  COMMENT_DICTIONARIES, createModel, DEADLINE_EVENTS, GENERAL_ANCHORS, OWNERS, ROLES, SCHEME_TYPES, SECTIONS,
  STATUS_DICTIONARIES, TABS,
  type BehaviorSettings, type Dataset, type FormulaSettings, type GeneralAnchor, type SaveState, type SectionId, type TabId,
} from '~/stands/scheme-edit/model'
import demo from '~/stands/scheme-edit/demo-data.json'

/**
 * Страница «Редактирование схемы осмотра» (VA-16377) — стенд, такты 61–62, порции П1–П2 (`docs/scheme-edit.md`,
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
 * `Select multiple` (№ 71), «Экран подтверждения». Остальные разделы и табы — порциями П3–П8: на их месте `Empty`.
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
const anchorTop = (id: string) => (document.getElementById(`general-${id}`)?.getBoundingClientRect().top ?? 0) + window.scrollY - 24
const column = ref<HTMLElement | null>(null)

/** Раздел навигатора: смена раздела ставит начало содержимого в окно. */
const section = computed<string>({
  get: () => m.ui.section,
  set: async (v) => {
    m.setSection(v as SectionId, v === 'general' ? 'main' : '')
    await nextTick()
    const top = (column.value?.getBoundingClientRect().top ?? 0) + window.scrollY - 24
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' })
  },
})
function goAnchor(id: GeneralAnchor) {
  m.setSection('general', id)
  window.scrollTo({ top: anchorTop(id), behavior: 'instant' })
}
function step(dir: -1 | 1) {
  const next = m.neighbourSection(dir)
  if (next) section.value = next
}
/** Активный якорь следует за прокруткой: последний подраздел, начало которого прошло верх окна. */
function spy() {
  if (m.ui.tab !== 'settings' || m.ui.section !== 'general') return
  let current: GeneralAnchor = 'main'
  for (const a of GENERAL_ANCHORS) if (anchorTop(a.id) <= window.scrollY + 1) current = a.id
  /* Конец страницы: последние подразделы до верха окна не доходят — активен последний видимый целиком. */
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = GENERAL_ANCHORS[GENERAL_ANCHORS.length - 1]!.id
  if (m.ui.anchor !== current) m.setSection('general', current)
}
onMounted(() => {
  if (m.ui.section === 'general' && !m.ui.anchor) m.setSection('general', 'main')
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
const sectionLabel = computed(() => SECTIONS.find(s => s.id === m.ui.section)?.label ?? '')

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
              <section id="general-main" data-anchor-section="main" class="flex flex-col gap-4">
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
              <section id="general-behavior" data-anchor-section="behavior" class="flex flex-col gap-4">
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
              <section id="general-formulas" data-anchor-section="formulas" class="flex flex-col gap-4">
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
              <section id="general-dictionaries" data-anchor-section="dictionaries" class="flex flex-col gap-4">
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
              <section id="general-deadlines" data-anchor-section="deadlines" class="flex flex-col gap-4">
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
              <section id="general-confirm" data-anchor-section="confirm" class="flex flex-col gap-4">
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

            <!-- Разделы порции П3 — на их месте название порции. -->
            <Empty v-else :title="`«${sectionLabel}» — порция П3`" description="Раздел «Настроек» собирается следующей порцией" />

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
              <template v-if="s.id === 'general'">
                <SectionNavAnchor v-for="a in GENERAL_ANCHORS" :key="a.id" :label="a.label" :active="m.ui.anchor === a.id" :data-anchor-link="a.id" @select="goAnchor(a.id)" />
              </template>
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

    <Toaster>
      <Toast v-for="n in m.notices" :key="n.id" :open="true" :duration="3000" @update:open="m.dismissNotice(n.id)">
        {{ n.text }}
      </Toast>
    </Toaster>
  </div>
</template>
