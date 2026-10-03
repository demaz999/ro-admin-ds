<script setup lang="ts">
import { computed } from 'vue'
import { createModel, TABS, type Dataset, type SaveState, type TabId } from '~/stands/tariffs/model'
import demo from '~/stands/tariffs/demo-data.json'

/**
 * Страница «Тарификация» (Биллинг 2.0, VA-14629) — стенд, такт 77, порция П1 (`docs/tariffs.md`, раздел 10).
 *
 * Вид и структура — макеты Figma (`docs/sources/tariffs/figma-nodes.md`), поведение и тексты — `spec.md`.
 * На странице — только компоненты кита и классы раскладки (`CLAUDE.md`, «Сборка страниц»).
 *
 * ## Что собрано в П1
 *
 * Каркас `layouts/admin.vue` (№ 1), «Назад» (№ 2), заголовок «Тарификация» (№ 3), «Сохранить изменения» с иконкой
 * дискеты и загрузкой (№ 6), статус автосохранения — `AppBarStatus surface="light"` слева от главной кнопки (№ 7),
 * вкладки с иконками и счётчиками (№ 8). На «Базовых настройках» — поле минимальной суммы: на нём идут сценарии
 * автосохранения и применения ТФ-02–ТФ-04; плитку с единицей ₽ соберёт порция П2. Остальное содержимое вкладок —
 * порциями П2–П4, на его месте стоит `Empty` с названием порции. Переключатель периода рядом с заголовком — порция П6.1.
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
 */
definePageMeta({ layout: 'admin' })
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
})

const tab = computed<string>({ get: () => m.ui.tab, set: v => m.setTab(v as TabId) })

/** Минимальная сумма за период (№ 13): пустое — минималка не применяется (§7); ввод цифр — № 52, порция П2. */
const minPayment = computed({
  get: () => (m.view.value.base.minPayment ?? '').toString(),
  set: (v: string) => {
    const digits = String(v ?? '').replace(/\D/g, '')
    m.set('base.minPayment', digits ? Number(digits) : null)
  },
})

/** Счётчик вкладки (№ 8): у «Базовых настроек» его нет. */
const countOf = (id: TabId) => (id === 'types' ? m.counts.value.types : id === 'schemes' ? m.counts.value.schemes : undefined)

/** Содержимое вкладок, которое соберут следующие порции, — план `tariffs.md`, раздел 10. */
const PENDING: Record<TabId, { title: string, description: string }> = {
  base: { title: '«Базовые настройки» — порция П2', description: 'Базовая стоимость схемы с парой цен, общая регресс-шкала, учёт прогресса, «Как считается стоимость»' },
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
    class="flex min-w-0 flex-col gap-6"
  >
    <!-- Шапка — Figma `30957:7809` в `30980:7926`: «Назад», через 12 — строка заголовка 44 с главной кнопкой справа. -->
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

    <!-- Вкладки — Figma `30912:245548`: иконка 16, подпись, счётчик у «Типов объектов» и «Схем осмотра». -->
    <Tabs v-model="tab">
      <TabsList>
        <TabsTrigger v-for="t in TABS" :key="t.id" :value="t.id" :count="countOf(t.id)" :data-tab-trigger="t.id">
          <Icon :name="t.icon" :size="16" />
          {{ t.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="base">
        <div class="flex flex-col gap-6 pt-6">
          <div class="grid grid-cols-2 gap-2">
            <Field
              label="Минимальная сумма списания за один расчётный период"
              hint="Если итоговая сумма за период оказывается ниже этого порога — выставляется минимальная сумма"
            >
              <Input v-model="minPayment" placeholder="" :show-icon="false" inputmode="numeric" data-field="min-payment" />
            </Field>
          </div>
          <Empty :title="PENDING.base.title" :description="PENDING.base.description" />
        </div>
      </TabsContent>

      <TabsContent v-for="t in TABS.slice(1)" :key="t.id" :value="t.id">
        <div class="flex flex-col pt-6">
          <Empty :title="PENDING[t.id].title" :description="PENDING[t.id].description" />
        </div>
      </TabsContent>
    </Tabs>

    <Toaster>
      <Toast v-for="n in m.notices" :key="n.id" :open="true" :duration="3000" @update:open="m.dismissNotice(n.id)">
        {{ n.text }}
      </Toast>
    </Toaster>
  </div>
</template>
