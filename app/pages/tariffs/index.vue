<script setup lang="ts">
import type { RegressStep, ScaleForm } from '~/components/ui/regress-scale'
import { computed, nextTick, ref, watch } from 'vue'
import { createModel, TABS, type Dataset, type GroupMode, type Price, type RowBadge, type SaveState, type TabId } from '~/stands/tariffs/model'
import demo from '~/stands/tariffs/demo-data.json'

/**
 * Страница «Тарификация» (Биллинг 2.0, VA-14629) — стенд; порции П1 (такт 77) и П2 (такт 78), план — `docs/tariffs.md`,
 * раздел 10.
 *
 * Вид и структура — макеты Figma (`docs/sources/tariffs/figma-nodes.md`), поведение и тексты — `spec.md`.
 * На странице — только компоненты кита и классы раскладки (`CLAUDE.md`, «Сборка страниц»).
 *
 * ## Что собрано
 *
 * П1: каркас `layouts/admin.vue` (№ 1), «Назад» (№ 2), заголовок (№ 3), «Сохранить изменения» с иконкой и загрузкой (№ 6),
 * статус автосохранения (№ 7), вкладки с иконками и счётчиками (№ 8).
 *
 * П2: шапка закреплена сверху — слот `header` каркаса (§11, строка 60 реестра); «Как считается стоимость» (№ 9); вкладка
 * «Базовые настройки» целиком — блоки на `Card` (№ 11), заголовки с подписью и рубильником (№ 12), минимальная сумма (№ 13),
 * базовая стоимость схемы с парой цен (№ 14, 15), подсказка тоном предупреждения (№ 16), рубильник общей шкалы (№ 17),
 * шкала с формой (№ 18, 19), учёт прогресса (№ 20), числовой ввод цен (№ 52), ошибка «До» меньше «От» (№ 53).
 *
 * П3: вкладка «Типы объектов» — блок с «Добавить тип объекта» (№ 21), таблица типов на `Table` с раскрытием, парой цен,
 * рубильником шкалы и удалением (№ 22), шкала типа в раскрытой строке (№ 23), выбор типа из справочника с поиском (№ 24),
 * удаление с «Отменить» (№ 25, 56), пустой список (№ 26).
 * П4 (такт 80): вкладка «Схемы осмотра» — группы на `Card` с метками `Badge appearance="outline"`, вилкой `PriceRange` и
 * «Настроить группу» (№ 27–29); строки схем — `Card tone="muted" size="sm"`, устаревшая — `dimmed` (№ 30, 31); пустая
 * группа — `Empty` (№ 57). Панель группы — `ModalCard` edge (№ 32): режимы — `RadioGroupItem variant="card"` со слотом
 * `panel` (№ 33), фиксированная цена — `PricePair` (№ 34), шкала — `RegressScale` (№ 35), «Схемы в группе» — `Table`
 * только для чтения (№ 36). Панель схемы (шестерёнка строки) — порция П5: уведомление-заглушка. Переключатель периода — П6.1.
 *
 * ## Поведение — модель `~/stands/tariffs/model.ts`
 *
 * Страница переводит модель в пропы компонентов, события компонентов — в операции модели.
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | без параметров | «Демо Страхование»: архив, текущий тариф, запланированный, черновик; выбран текущий |
 * | `?tab=base` · `types` · `schemes` | вкладка при загрузке |
 * | `?save=saving` | статус «Сохранение…» без завершения записи |
 * | `?save=error` | статус «Ошибка сохранения» с «Повторить» |
 * | `?now=ГГГГ-ММ` | часы модели: от них считаются статусы и сроки периодов |
 * | `?data=empty` | компания без типов объектов, группа без схем |
 * | `?scale=on` | общая регресс-шкала включена (такт 78) |
 * | `?open=help` | открыта подсказка «Как считается стоимость» (такт 78) |
 * | `?expand=<id типа>` | раскрыта строка типа объекта, через запятую — несколько; без `?tab=` — вкладка «Типы объектов» (такт 79) |
 * | `?open=type-picker` | открыт выбор типа из справочника; без `?tab=` — вкладка «Типы объектов» (такт 79) |
 * | `?open=group` | открыта панель группы; без `?tab=` — вкладка «Схемы осмотра» (такт 80) |
 * | `?group=<id группы>` | какая группа открыта: `g-kasko`, `g-osago`, `g-realty`; без параметра — первая (такт 80) |
 * | `?mode=company` · `fixed` · `scale` | режим открытой группы — как данные, правка не пишется (такт 80) |
 */
definePageMeta({ layout: false })
useHead({ title: 'Тарификация — стенд' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')

const OPEN_AT_LOAD = ['help', 'type-picker', 'group']
const openAtLoad = OPEN_AT_LOAD.find(s => s === q('open'))
const expandAtLoad = q('expand') ? q('expand').split(',').filter(Boolean) : []
/* Выбор типа и раскрытая строка живут на «Типах объектов»: без `?tab=` оснастка такта 79 открывает эту вкладку. */
const tabAtLoad = TABS.find(t => t.id === q('tab'))?.id
  ?? (openAtLoad === 'type-picker' || expandAtLoad.length ? 'types' : openAtLoad === 'group' ? 'schemes' : undefined)
const MODES: GroupMode[] = ['company', 'fixed', 'scale']
const saveAtLoad = (['saving', 'error'] as SaveState[]).find(s => s === q('save'))
const m = createModel(demo as unknown as Dataset, {
  data: q('data') === 'empty' ? 'empty' : 'main',
  tab: tabAtLoad,
  save: saveAtLoad,
  now: q('now') || undefined,
  scale: q('scale') === 'on',
  open: openAtLoad,
  expand: expandAtLoad,
  group: q('group') || undefined,
  mode: MODES.find(x => x === q('mode')),
})

const tab = computed<string>({ get: () => m.ui.tab, set: v => m.setTab(v as TabId) })
const base = computed(() => m.view.value.base)

/** Минимальная сумма за период (№ 13): пустое — минималка не применяется (§7); числовой ввод — № 52. */
const minPayment = computed({
  get: () => (base.value.minPayment ?? '').toString(),
  set: (v: string) => { m.set('base.minPayment', v === '' ? null : Number(v)) },
})

/** Пара базовой цены (№ 14, 15): замок и правила пары — операция модели `setPrice`. */
const setBasePrice = (patch: Partial<Price>) => m.setPrice('base.price', patch)

/** Общая регресс-шкала (№ 17–19): включение, форма, ступени; удаление ступени — уведомление с «Отменить». */
const scaleOn = computed({
  get: () => base.value.scale.on,
  set: (v: boolean) => { m.setScale('base.scale', { on: v }) },
})
const scaleSteps = computed({
  get: () => base.value.scale.steps,
  set: (v: RegressStep[]) => { m.setScale('base.scale', { steps: v }) },
})
const scaleForm = computed({
  get: () => base.value.scale.form,
  set: (v: ScaleForm) => { m.setScale('base.scale', { form: v }) },
})

/** Учёт прогресса (№ 20): сквозной по умолчанию (§5, §11). */
const counter = computed({
  get: () => base.value.counter,
  set: (v: string) => { m.set('base.counter', v) },
})

/** Подсказка пары: при включённой шкале — тон предупреждения (№ 16, Figma `31767:8639`). */
const BASE_HINT = 'Применяется к схеме осмотра по умолчанию, если не заданы индивидуальная цена, регресс-шкала или стоимость по типу объекта.'
const SCALE_HINT = 'Не применяется при включённой регресс-шкале. Выключите общую регресс-шкалу для переключения на базовую стоимость'

/**
 * «Как считается стоимость» (№ 9) — порядок поиска цены по §4 (6.1; строка 11 реестра: порядок макета `31650:7781`
 * заменён порядком сводки). Итог с повторяемыми процессами — ждут людей, п. 2 (строка 14).
 */
const HELP_ORDER = [
  { title: 'Цена типа объекта в схеме', note: 'Максимум по этапам — панель схемы' },
  { title: 'Индивидуальная цена схемы', note: 'Панель схемы, «Ценообразование»' },
  { title: 'Цена группы схем', note: 'Панель «Настройка группы»' },
  { title: 'Цена типа объекта', note: 'Максимум по этапам — вкладка «Типы»' },
  { title: 'Базовая цена компании', note: 'Вкладка «Базовые настройки»' },
]
const helpOpen = computed({ get: () => m.ui.open === 'help', set: (v: boolean) => m.setOpen(v ? 'help' : '') })

/** Счётчик вкладки (№ 8): у «Базовых настроек» его нет. */
const countOf = (id: TabId) => (id === 'types' ? m.counts.value.types : id === 'schemes' ? m.counts.value.schemes : undefined)

/* ------------------------------ «Типы объектов» — П3, такт 79 ------------------------------ */
/** Подпись блока — по §3 (строка 12 реестра): режима «По типам объектов» в сводке нет. */
const TYPES_DESCRIPTION = 'Глобальные цены по типам объектов. Применяются во всех схемах, где для типа не задана индивидуальная цена'

/** Строки таблицы типов (№ 22): тип справочника, пара, шкала, раскрытие. */
const typeRows = computed(() => m.view.value.objectTypes.map(t => ({
  id: t.typeId,
  name: m.typeOf(t.typeId)?.name ?? t.typeId,
  icon: m.typeOf(t.typeId)?.icon ?? 'package',
  price: t.price,
  scale: t.scale,
  expanded: m.ui.expanded.includes(t.typeId),
})))

/** Пара цен типа (№ 22): правила пары — `setPrice` модели по пути типа. */
function setTypePrice(id: string, patch: Partial<Price>) {
  const path = m.typePath(id)
  if (path) m.setPrice(`${path}.price`, patch)
}
/** Шкала типа (№ 23): ступени и форма — `setScale` модели; удаление ступени — уведомление с «Отменить». */
function setTypeScale(id: string, patch: { steps?: RegressStep[], form?: ScaleForm }) {
  const path = m.typePath(id)
  if (path) m.setScale(`${path}.scale`, patch)
}
function typeStepRemoved(id: string, previous: RegressStep[]) {
  const path = m.typePath(id)
  if (path) m.stepRemoved(`${path}.scale`, previous)
}

/**
 * Выбор типа из справочника (№ 24) — композиция раздела 4: `ButtonAction` + `Popover` + `SelectContent` с поиском `Input`
 * и пунктами `SelectItem`; пустой поиск — `Empty` «Ничего не найдено». Клавиатура: стрелки по пунктам, Enter добавляет.
 */
const pickerOpen = computed({
  get: () => m.ui.open === 'type-picker',
  set: (v: boolean) => { m.setOpen(v ? 'type-picker' : '') },
})
const typeQuery = ref('')
const activeType = ref(-1)
const pickerList = computed(() => m.pickerTypes(typeQuery.value))
watch(pickerOpen, (v) => { if (v) { typeQuery.value = ''; activeType.value = -1 } })
watch(typeQuery, () => { activeType.value = -1 })
function pickType(id: string) {
  m.addType(id)
  pickerOpen.value = false
}
function onPickerKeydown(e: KeyboardEvent) {
  const n = pickerList.value.length
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!n) return
    activeType.value = e.key === 'ArrowDown' ? (activeType.value + 1) % n : (activeType.value - 1 + n) % n
    /* Пункт длинного списка — в видимую часть области прокрутки (ловушка такта 63). */
    nextTick(() => document.querySelector(`[data-type-option="${pickerList.value[activeType.value]?.id}"]`)?.scrollIntoView({ block: 'nearest' }))
  }
  else if (e.key === 'Enter' && activeType.value >= 0 && pickerList.value[activeType.value]) {
    e.preventDefault()
    pickType(pickerList.value[activeType.value]!.id)
  }
}

/* ------------------------------ «Схемы осмотра» и панель группы — П4, такт 80 ------------------------------ */
/**
 * Тон метки — строка 25 реестра (решение оркестратора 3): режимы — `default`, «Новая» — `warning`, счёт и признаки —
 * `neutral`; расширенная палитра не берётся.
 */
const BADGE_TONE: Record<RowBadge['kind'], 'default' | 'warning' | 'neutral'> = { mode: 'default', new: 'warning', flag: 'neutral', count: 'neutral' }

/** Группы со схемами (№ 27, 30): метки по 6.6, вилки по 6.5. */
const groupRows = computed(() => m.view.value.groups.map(g => ({
  id: g.id,
  name: g.name,
  badges: m.groupBadges(g.id),
  range: m.groupRange(g.id),
  schemes: m.schemesOf(g.id).map(x => ({
    id: x.id,
    name: x.name,
    badges: m.schemeBadges(x.id),
    range: m.schemeRange(x.id),
    outdated: x.flags.includes('outdated'),
  })),
})))
/** Вход в панель схемы — порция П5 (решение оркестратора 2 промпта такта 80): уведомление-заглушка. */
const openScheme = () => m.pendingPortion('Панель схемы', 'П5')

/** Панель группы (№ 32–36): открыта — `ui.open === 'group'`; закрытие — Esc, крестик, клик мимо. */
const groupOpen = computed({
  get: () => m.ui.open === 'group' && m.ui.panel?.kind === 'group',
  set: (v: boolean) => { if (!v) m.closePanel() },
})
const panelGroup = computed(() => (m.ui.panel?.kind === 'group' ? m.groupOf(m.ui.panel.id) : undefined))
const panelSchemes = computed(() => (panelGroup.value
  ? m.schemesOf(panelGroup.value.id).map(x => ({ id: x.id, name: x.name, range: m.schemeRange(x.id) }))
  : []))
const groupMode = computed({
  get: () => panelGroup.value?.mode ?? 'company',
  set: (v: string) => { if (panelGroup.value) m.setGroupMode(panelGroup.value.id, v as GroupMode) },
})
/** Пара и шкала группы — `setPrice`, `setScale` модели по пути группы; правки сразу в черновик (стр. 53). */
function setGroupPrice(patch: Partial<Price>) {
  const path = panelGroup.value && m.groupPath(panelGroup.value.id)
  if (path) m.setPrice(`${path}.price`, patch)
}
function setGroupScale(patch: { steps?: RegressStep[], form?: ScaleForm }) {
  const path = panelGroup.value && m.groupPath(panelGroup.value.id)
  if (path) m.setScale(`${path}.scale`, patch)
}
function groupStepRemoved(previous: RegressStep[]) {
  const path = panelGroup.value && m.groupPath(panelGroup.value.id)
  if (path) m.stepRemoved(`${path}.scale`, previous)
}

if (import.meta.client) {
  /* Прогону — состояние модели для сравнения «до / после»; оснастка приёмки. */
  ;(window as unknown as { __tariffs: unknown }).__tariffs = m
}
</script>

<template>
  <div
    data-tariffs
    :data-tab="m.ui.tab"
    :data-save="m.save.state"
    :data-dirty="m.dirty.value ? '1' : '0'"
    :data-apply="m.apply.state"
    :data-period="m.selected.value.status"
    :data-scale="base.scale.on ? 'on' : 'off'"
    :data-open="m.ui.open || undefined"
  >
    <NuxtLayout name="admin">
      <!-- Шапка — Figma `30957:7809` в `30980:7926`; закреплена сверху (§11) — слот `header` каркаса. -->
      <template #header>
        <div class="flex flex-col gap-3">
          <div class="flex">
            <ButtonNavigation size="base" direction="left" data-act="back" @click="m.back()">
              Назад
            </ButtonNavigation>
          </div>

          <div class="flex h-11 items-center justify-between gap-6" data-header-row>
            <div class="flex min-w-0 items-center gap-3">
              <Heading level="page" as="h1" data-tariffs-title>
                Тарификация
              </Heading>
              <!-- Переключатель тарифного периода `PeriodSwitcher` (№ 4, 5) — порция П6.1. -->
            </div>

            <div class="flex shrink-0 items-center gap-4">
              <AppBarStatus surface="light" retryable :state="m.save.state" @retry="m.retry()" />
              <Button
                show-icon
                :disabled="!m.dirty.value"
                :loading="m.apply.state === 'applying'"
                data-act="apply"
                @click="m.applyChanges()"
              >
                <template #icon>
                  <Icon name="save" :size="20" />
                </template>
                Сохранить изменения
              </Button>
            </div>
          </div>
        </div>
      </template>

      <!-- Вкладки — Figma `30912:245548`: иконка 16, подпись, счётчик; справа — «Как считается стоимость» (№ 9). -->
      <Tabs v-model="tab">
        <!-- Строка вкладок — Figma `30912:245547`: вкладки слева, «Как считается стоимость» справа (`30912:245571`). -->
        <div class="flex items-center justify-between gap-6">
          <TabsList>
            <TabsTrigger v-for="t in TABS" :key="t.id" :value="t.id" :count="countOf(t.id)" :data-tab-trigger="t.id">
              <Icon :name="t.icon" :size="16" />
              {{ t.label }}
            </TabsTrigger>
          </TabsList>
          <!-- Подсказка — Figma `30912:245571`, `31650:7772`: кнопка с «i» и поповер с порядком поиска цены (§4). -->
          <Popover v-model:open="helpOpen">
            <PopoverTrigger as-child>
              <ButtonAction variant="muted" data-act="help">
                <template #icon>
                  <Icon name="info" :size="16" />
                </template>
                Как считается стоимость
              </ButtonAction>
            </PopoverTrigger>
            <PopoverContent align="end" class="flex flex-col gap-3 p-4" data-help>
              <Heading description="Ищется первая заданная цена — от частного к общему. К ней применяется регресс-шкала её уровня, иначе общая шкала компании, иначе цена фиксированная.">
                Приоритет выбора цены
              </Heading>
              <div class="flex flex-col gap-1">
                <ListRow
                  v-for="(x, k) in HELP_ORDER"
                  :key="x.title"
                  type="number"
                  :number="k + 1"
                  tabindex="-1"
                  :data-help-step="k + 1"
                >
                  {{ x.title }}
                  <template #secondary>
                    {{ x.note }}
                  </template>
                </ListRow>
              </div>
              <!-- Итог с повторяемыми процессами — MAX по реализации 29.06.2026: ждут людей, п. 2 (строка 14 реестра). -->
              <Heading data-awaiting="2" description="Больше из цены осмотра и суммы цен повторяемых процессов. Если сумма за месяц ниже минимальной — выставляется минимальная.">
                Итог осмотра
              </Heading>
            </PopoverContent>
          </Popover>
        </div>

        <TabsContent value="base">
          <!-- Блоки вкладки — Figma `30912:245513`: зазор между блоками 8. -->
          <div class="flex flex-col gap-2 pt-6">
            <!-- «Базовая минимальная стоимость» — Figma `30912:245578`: две плитки через 8. -->
            <Card as="section" class="flex flex-col gap-6" data-block="base">
              <Heading level="group" description="Минимальные пороги биллинга и базовые цены, применяемые к схемам осмотра по умолчанию.">
                Базовая минимальная стоимость
              </Heading>
              <div class="grid grid-cols-2 gap-2">
                <!-- Плитка — Figma `31767:8590`: подпись, поле 160 с «₽», подсказка во всю ширину. -->
                <Card tone="muted" size="sm" class="flex flex-col">
                  <Field
                    orientation="split"
                    class="flex-1"
                    label="Минимальная сумма списания за один расчётный период"
                    hint="Если итоговая сумма за период оказывается ниже этого порога — выставляется минимальная сумма"
                  >
                    <div class="w-price-input">
                      <Input v-model="minPayment" numeric unit="₽" variant="elevated" placeholder="" :show-icon="false" data-field="min-payment" />
                    </div>
                  </Field>
                </Card>
                <!-- Плитка — Figma `31649:3835`, при шкале — `31767:8605`: пара цен с замком; подсказка тоном предупреждения. -->
                <Card tone="muted" size="sm" class="flex flex-col">
                  <Field
                    orientation="split"
                    class="flex-1"
                    label="Базовая стоимость схемы осмотра"
                    :hint="base.scale.on ? SCALE_HINT : BASE_HINT"
                    :hint-tone="base.scale.on ? 'warning' : 'default'"
                    data-field="base-price-field"
                  >
                    <PricePair
                      variant="elevated"
                      :client="base.price.client"
                      :non-client="base.price.nonClient"
                      :linked="base.price.linked"
                      :disabled="base.scale.on"
                      data-field="base-price"
                      @update:client="v => setBasePrice({ client: v })"
                      @update:non-client="v => setBasePrice({ nonClient: v })"
                      @update:linked="v => setBasePrice({ linked: v })"
                    />
                  </Field>
                </Card>
              </div>
            </Card>

            <!-- «Общая регресс-шкала компании» — Figma `30912:245618`, включённая — `30956:102261`. -->
            <Card as="section" class="flex flex-col gap-6" data-block="scale">
              <div class="flex items-start justify-between gap-6">
                <Heading level="group" description="Применяется ко всем осмотрам, где типовая регресс-шкала не активна.">
                  Общая регресс-шкала компании
                </Heading>
                <Switch v-model="scaleOn" aria-label="Общая регресс-шкала компании" data-field="scale-switch" />
              </div>
              <RegressScale
                v-if="base.scale.on"
                v-model:steps="scaleSteps"
                v-model:form="scaleForm"
                data-field="base-scale"
                @remove-step="e => m.stepRemoved('base.scale', e.previous)"
              />
            </Card>

            <!-- «Учет прогресса в регресс-шкалах» — Figma `30912:245625`: две карточки выбора 544 через 8. -->
            <Card as="section" class="flex flex-col gap-6" data-block="counter">
              <!-- Сброс счётчика 1-го числа месяца — реализация 29.06.2026: ждут людей, п. 3 (строка 15 реестра). -->
              <Heading level="group" data-awaiting="3" description="Счётчик осмотров обнуляется 1-го числа каждого месяца.">
                Учет прогресса в регресс-шкалах
              </Heading>
              <RadioGroup v-model="counter" class="grid grid-cols-2 gap-2" data-field="counter">
                <RadioGroupItem value="global" variant="card" :checked="counter === 'global'" data-counter="global">
                  Сквозной учет
                  <template #description>
                    Любой выполненный осмотр увеличивает счётчик во всех активных шкалах компании
                  </template>
                </RadioGroupItem>
                <RadioGroupItem value="individual" variant="card" :checked="counter === 'individual'" data-counter="individual">
                  Раздельный учет
                  <template #description>
                    Каждый уровень считает свои осмотры: шкала уровня снижает цену по объёму осмотров этого уровня
                  </template>
                </RadioGroupItem>
              </RadioGroup>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="types">
          <div class="flex flex-col gap-2 pt-6">
            <!-- Блок «Типы объектов» — Figma `30863:3843`: шапка с «Добавить тип объекта», колонки, строки типов. -->
            <Card as="section" class="flex flex-col gap-6" data-block="types">
              <!-- Один выбор типа на блок (№ 24): открыватель — кнопка шапки либо действие пустого списка. -->
              <Popover v-model:open="pickerOpen">
                <div class="flex items-start justify-between gap-6">
                  <Heading level="group" :description="TYPES_DESCRIPTION">
                    Типы объектов
                  </Heading>
                  <PopoverTrigger v-if="typeRows.length" as-child>
                    <ButtonAction data-act="add-type">
                      <template #icon>
                        <Icon name="add" :size="16" />
                      </template>
                      Добавить тип объекта
                    </ButtonAction>
                  </PopoverTrigger>
                </div>

                <!-- Таблица типов — Figma `30863:3850`, `30863:3857`: колонки «Тип объекта», «Клиент, ₽», «Не клиент, ₽», «Регресс-шкала». -->
                <Table v-if="typeRows.length" data-types-table>
                  <TableRow>
                    <TableHead variant="expand" aria-hidden="true" />
                    <TableHead class="min-w-0 flex-1">
                      Тип объекта
                    </TableHead>
                    <TableHead class="w-46">
                      Клиент, ₽
                    </TableHead>
                    <TableHead class="w-46">
                      Не клиент, ₽
                    </TableHead>
                    <TableHead class="w-40">
                      Регресс-шкала
                    </TableHead>
                    <TableHead class="w-16" aria-hidden="true" />
                  </TableRow>

                  <template v-for="row in typeRows" :key="row.id">
                    <TableRow :data-type-row="row.id" :data-expanded="row.expanded ? '' : undefined">
                      <TableCell variant="slot" class="w-16 justify-center px-0">
                        <IconButton
                          variant="ghost"
                          :label="row.expanded ? `Свернуть: ${row.name}` : `Раскрыть шкалу: ${row.name}`"
                          :aria-expanded="row.expanded ? 'true' : 'false'"
                          data-act="type-expand"
                          @click="m.toggleExpand(row.id)"
                        >
                          <Icon :name="row.expanded ? 'chevron-up' : 'chevron-down'" :size="16" />
                        </IconButton>
                      </TableCell>
                      <TableCell variant="slot" class="min-w-0 flex-1">
                        <TableCellIdentity :icon="row.icon" data-type-name>
                          {{ row.name }}
                        </TableCellIdentity>
                      </TableCell>
                      <!-- Пара цен типа: при включённой шкале выключена (§5, стр. 08). -->
                      <TableCell variant="slot">
                        <PricePair
                          :labels="false"
                          :client="row.price.client"
                          :non-client="row.price.nonClient"
                          :linked="row.price.linked"
                          :disabled="row.scale.on"
                          data-field="type-price"
                          @update:client="v => setTypePrice(row.id, { client: v })"
                          @update:non-client="v => setTypePrice(row.id, { nonClient: v })"
                          @update:linked="v => setTypePrice(row.id, { linked: v })"
                        />
                      </TableCell>
                      <TableCell variant="slot" class="w-40">
                        <Switch
                          :model-value="row.scale.on"
                          :aria-label="`Регресс-шкала: ${row.name}`"
                          data-field="type-scale-switch"
                          @update:model-value="v => m.setTypeScaleOn(row.id, !!v)"
                        />
                      </TableCell>
                      <TableCell variant="slot" class="w-16 justify-center px-0">
                        <IconButton variant="destructive" :label="`Удалить тип: ${row.name}`" data-act="type-remove" @click="m.removeType(row.id)">
                          <Icon name="delete" :size="16" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <!-- Раскрытая строка — Figma `30863:3894`: шкала типа на всю ширину таблицы; при выключенной шкале — выключена (стр. 69). -->
                    <TableRow v-if="row.expanded" :data-type-body="row.id">
                      <TableCell variant="slot" class="h-auto min-w-0 flex-1 py-4 pl-16">
                        <RegressScale
                          :steps="row.scale.steps"
                          :form="row.scale.form"
                          :disabled="!row.scale.on"
                          class="w-full"
                          data-field="type-scale"
                          @update:steps="v => setTypeScale(row.id, { steps: v })"
                          @update:form="v => setTypeScale(row.id, { form: v })"
                          @remove-step="e => typeStepRemoved(row.id, e.previous)"
                        />
                      </TableCell>
                    </TableRow>
                  </template>
                </Table>

                <!-- Пустой список (№ 26, стр. 46): действие закрывает пустоту — тот же выбор типа. -->
                <Empty
                  v-else
                  title="Типов объектов пока нет"
                  description="Добавьте тип из справочника компании, чтобы задать ему цену и регресс-шкалу"
                  data-types-empty
                >
                  <template #action>
                    <PopoverTrigger as-child>
                      <Button variant="secondary" data-act="add-type">
                        Добавить тип объекта
                      </Button>
                    </PopoverTrigger>
                  </template>
                </Empty>

                <!-- Выбор типа — Figma `31488:258091`: плашка с поиском и списком справочника; добавленные типы из списка ушли. -->
                <PopoverContent as-child align="end" :side-offset="4" :width="320">
                  <SelectContent data-type-picker @keydown="onPickerKeydown">
                    <template #search>
                      <Input v-model="typeQuery" placeholder="Поиск типа объекта" clearable data-field="type-search" />
                    </template>
                    <SelectItem
                      v-for="(t, k) in pickerList"
                      :key="t.id"
                      :selected="k === activeType"
                      :data-type-option="t.id"
                      @click="pickType(t.id)"
                    >
                      {{ t.name }}
                    </SelectItem>
                    <Empty
                      v-if="!pickerList.length"
                      :title="typeQuery.trim() ? 'Ничего не найдено' : 'Все типы справочника добавлены'"
                      class="px-4 py-6"
                      data-type-picker-empty
                    />
                  </SelectContent>
                </PopoverContent>
              </Popover>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schemes">
          <!-- Вкладка «Схемы осмотра» — Figma `30875:127755`: блоки групп через 4. -->
          <div class="flex flex-col gap-1 pt-6" data-block="schemes">
            <Card v-for="g in groupRows" :key="g.id" as="section" class="flex flex-col gap-6" :data-group="g.id">
              <!-- Строка группы — Figma `30875:127808`: имя и метки, вилка группы, «Настроить группу». -->
              <div class="flex items-baseline gap-6" data-group-head>
                <div class="flex shrink-0 items-center gap-3">
                  <Heading level="group" data-group-name>
                    {{ g.name }}
                  </Heading>
                  <div class="flex items-center gap-0.5" data-badges>
                    <Badge v-for="b in g.badges" :key="b.id" appearance="outline" :variant="BADGE_TONE[b.kind]" :data-badge="b.id">
                      {{ b.text }}
                    </Badge>
                  </div>
                </div>
                <PriceRange
                  layout="dash"
                  label="Стоимость осмотров группы по умолчанию:"
                  note="наследуется схемами без индивидуальной цены"
                  :min="g.range.min"
                  :max="g.range.max"
                  class="flex-1"
                  data-group-range
                />
                <ButtonAction class="shrink-0" data-act="group-settings" @click="m.openGroup(g.id)">
                  <template #icon>
                    <Icon name="settings" :size="16" />
                  </template>
                  Настроить группу
                </ButtonAction>
              </div>

              <!-- Строки схем — Figma `30875:127821`: имя с метками, вилка «от … до …», шестерёнка; устаревшая приглушена (§11). -->
              <div v-if="g.schemes.length" class="flex flex-col gap-1">
                <Card
                  v-for="x in g.schemes"
                  :key="x.id"
                  tone="muted"
                  size="sm"
                  :dimmed="x.outdated"
                  class="flex items-center gap-5"
                  :data-scheme="x.id"
                >
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <Heading data-scheme-name>
                      {{ x.name }}
                    </Heading>
                    <div class="flex items-center gap-0.5" data-badges>
                      <Badge v-for="b in x.badges" :key="b.id" appearance="outline" :variant="BADGE_TONE[b.kind]" :data-badge="b.id">
                        {{ b.text }}
                      </Badge>
                    </div>
                  </div>
                  <PriceRange label="Вилка цен" :min="x.range.min" :max="x.range.max" class="shrink-0" data-scheme-range />
                  <IconButton variant="ghost" :label="`Настроить схему: ${x.name}`" data-act="scheme-settings" @click="openScheme">
                    <Icon name="settings" :size="16" />
                  </IconButton>
                </Card>
              </div>
              <!-- Пустая группа (№ 57, стр. 46): схемы добавляются в конструкторе схем — действия на странице нет. -->
              <Empty
                v-else
                title="В группе пока нет схем"
                description="Цена группы применится к схемам, когда они появятся в группе"
                data-group-empty
              />
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <!-- Панель группы — Figma `32021:6684`, `32021:6756`, `32021:6829`: сайд 642, правки сразу в черновик (стр. 53), подвала нет. -->
      <ModalCard v-model:open="groupOpen">
        <ModalCardContent placement="edge" data-side="group">
          <ModalCardHeader title="Настройка группы" />
          <ModalCardBody v-if="panelGroup" class="flex flex-col gap-8">
            <!-- Имя группы и число схем — Figma `32021:6689`; цены в подстроке нет (VA-14951, стр. 04). -->
            <Heading level="page" :description="`${panelSchemes.length} ${m.schemesWord(panelSchemes.length)}`" data-panel-name>
              {{ panelGroup.name }}
            </Heading>

            <!-- Режимы — Figma `32021:6693`: названия по §11 (стр. 29); тело выбранного — в общей рамке с карточкой (стр. 36). -->
            <RadioGroup v-model="groupMode" class="flex flex-col gap-2" data-field="group-mode">
              <RadioGroupItem value="company" variant="card" :checked="groupMode === 'company'" data-group-mode="company">
                Базовая цена компании
                <template #description>
                  Наследует цену компании:
                  <PriceRange size="sm" layout="dash" :min="m.companyRange().min" :max="m.companyRange().max" data-company-range />
                </template>
              </RadioGroupItem>
              <RadioGroupItem value="fixed" variant="card" :checked="groupMode === 'fixed'" data-group-mode="fixed">
                Фиксированная цена группы
                <template #description>
                  Фиксированная цена только для этой группы
                </template>
                <template #panel>
                  <PricePair
                    stretch
                    :client="panelGroup.price.client"
                    :non-client="panelGroup.price.nonClient"
                    :linked="panelGroup.price.linked"
                    data-field="group-price"
                    @update:client="v => setGroupPrice({ client: v })"
                    @update:non-client="v => setGroupPrice({ nonClient: v })"
                    @update:linked="v => setGroupPrice({ linked: v })"
                  />
                </template>
              </RadioGroupItem>
              <RadioGroupItem value="scale" variant="card" :checked="groupMode === 'scale'" data-group-mode="scale">
                Регресс-шкала группы
                <template #description>
                  Цена снижается при росте объёма осмотров
                </template>
                <template #panel>
                  <RegressScale
                    label=""
                    :steps="panelGroup.scale.steps"
                    :form="panelGroup.scale.form"
                    data-field="group-scale"
                    @update:steps="v => setGroupScale({ steps: v })"
                    @update:form="v => setGroupScale({ form: v })"
                    @remove-step="e => groupStepRemoved(e.previous)"
                  />
                </template>
              </RadioGroupItem>
            </RadioGroup>

            <!-- «Схемы в группе» — Figma `32021:6894`: только чтение, цена схемы справа; «N по группе» — схемы, наследующие цену группы. -->
            <section class="flex flex-col gap-4" data-group-schemes>
              <div class="flex items-center justify-between gap-4">
                <Heading level="group">
                  Схемы в группе
                </Heading>
                <Badge appearance="outline" variant="neutral" data-inheriting>
                  {{ m.inheritingCount(panelGroup.id) }} по группе
                </Badge>
              </div>
              <Table v-if="panelSchemes.length">
                <TableRow v-for="x in panelSchemes" :key="x.id" :data-group-scheme="x.id">
                  <TableCell class="min-w-0 flex-1 pl-6" data-group-scheme-name>
                    {{ x.name }}
                  </TableCell>
                  <TableCell variant="slot" class="justify-end">
                    <PriceRange layout="dash" :min="x.range.min" :max="x.range.max" data-group-scheme-range />
                  </TableCell>
                </TableRow>
              </Table>
              <Empty v-else title="В группе пока нет схем" data-group-schemes-empty />
            </section>
          </ModalCardBody>
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
    </NuxtLayout>
  </div>
</template>
