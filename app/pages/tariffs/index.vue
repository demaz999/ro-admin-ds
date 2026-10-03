<script setup lang="ts">
import type { RegressStep, ScaleForm } from '~/components/ui/regress-scale'
import { computed } from 'vue'
import { createModel, TABS, type Dataset, type Price, type SaveState, type TabId } from '~/stands/tariffs/model'
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
 * «Типы объектов» и «Схемы осмотра» — порции П3, П4: на их месте `Empty` с названием порции. Переключатель периода — П6.1.
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
 */
definePageMeta({ layout: false })
useHead({ title: 'Тарификация — стенд' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')

const tabAtLoad = TABS.find(t => t.id === q('tab'))?.id
const saveAtLoad = (['saving', 'error'] as SaveState[]).find(s => s === q('save'))
const m = createModel(demo as unknown as Dataset, {
  data: q('data') === 'empty' ? 'empty' : 'main',
  tab: tabAtLoad,
  save: saveAtLoad,
  now: q('now') || undefined,
  scale: q('scale') === 'on',
  open: q('open') === 'help' ? 'help' : undefined,
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

/** Содержимое вкладок, которое соберут следующие порции, — план `tariffs.md`, раздел 10. */
const PENDING: Record<string, { title: string, description: string }> = {
  types: { title: '«Типы объектов» — порция П3', description: 'Глобальные цены типов объектов, шкалы типов, выбор типа из справочника' },
  schemes: { title: '«Схемы осмотра» — порция П4', description: 'Группы и схемы с вилками цен и метками, панели группы и схемы' },
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

        <TabsContent v-for="t in TABS.slice(1)" :key="t.id" :value="t.id">
          <div class="flex flex-col pt-6">
            <Empty :title="PENDING[t.id]?.title" :description="PENDING[t.id]?.description" />
          </div>
        </TabsContent>
      </Tabs>

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
