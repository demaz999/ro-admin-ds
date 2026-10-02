<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { createModel, TABS, type Dataset, type SaveState, type TabId } from '~/stands/scheme-edit/model'
import demo from '~/stands/scheme-edit/demo-data.json'

/**
 * Страница «Редактирование схемы осмотра» (VA-16377) — стенд, такт 61, порция П1 (`docs/scheme-edit.md`, раздел 10).
 *
 * Вид и структура — макеты Figma (`docs/sources/scheme-edit/figma-nodes.md`), поведение и тексты — `spec-r2.md`.
 * На странице — только компоненты кита и классы раскладки (`CLAUDE.md`, «Экран „как есть“»).
 *
 * ## Что собрано в П1
 *
 * Каркас `layouts/admin.vue` (№ 1), «Назад» (№ 2), H1 — наименование схемы (№ 4), «Опубликовать схему» (№ 7), табы
 * (№ 13). Статус автосохранения — `AppBarStatus surface="light"` в строке шапки, рядом с местом индикатора публикации
 * (№ 59; сам индикатор `PublishStatus` — порция П4). В «Настройках» — два поля «Основного» (наименование и «Схема
 * активна»): на них идёт сценарий автосохранения СС-20; остальное содержимое табов — порциями П2–П8, на его месте
 * стоит `Empty` с названием порции.
 *
 * ## Поведение — модель `~/stands/scheme-edit/model.ts`
 *
 * Страница переводит модель в пропы компонентов, события компонентов — в операции модели. Прокрутка таба — страница:
 * при смене таба положение запоминается в модели и возвращается (СС-13).
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | без параметров | схема «КАСКО — осмотр легкового автомобиля»: две опубликованные версии, грязный черновик |
 * | `?data=new` | новая схема: публикаций не было |
 * | `?tab=form` · `processes` · `showcase` | таб при загрузке |
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

const general = computed(() => m.draft.config.settings.general)
const name = computed({ get: () => general.value.name, set: v => m.set('settings.general.name', v) })
const active = computed({ get: () => general.value.active, set: v => m.set('settings.general.active', v) })

/** Таб — состояние модели; прокрутка окна запоминается за уходящим табом и возвращается приходящему (СС-13). */
const tab = computed<string>({
  get: () => m.ui.tab,
  set: (v) => {
    if (import.meta.client) m.rememberScroll(m.ui.tab, window.scrollY)
    m.setTab(v as TabId)
  },
})
watch(() => m.ui.tab, async (t) => {
  await nextTick()
  window.scrollTo({ top: m.ui.scroll[t], behavior: 'instant' })
}, { flush: 'post' })

/** Содержимое табов, которое соберут следующие порции, — план `scheme-edit.md`, раздел 10. */
const PENDING: Record<TabId, { title: string, description: string }> = {
  settings: { title: 'Разделы «Настроек» — порции П2 и П3', description: 'Навигатор разделов, карточки и строки настроек семи разделов' },
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
    :data-save="m.save.state"
    :data-publish="m.publishState.value"
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
        <div class="flex max-w-settings flex-col gap-6 pt-6">
          <Field label="Наименование">
            <Input v-model="name" data-field="name" />
          </Field>
          <Switch v-model="active" data-field="active">
            Схема активна
          </Switch>
          <Empty :title="PENDING.settings.title" :description="PENDING.settings.description" />
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
