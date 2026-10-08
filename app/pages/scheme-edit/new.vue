<script setup lang="ts">
import { ref } from 'vue'
import SchemeCreate from '~/stands/scheme-edit/SchemeCreate.vue'
import { createdDataset, createdNotice, fromParam, setHandoff, type CreateBasics, type CreateFrom, type CreateSourceId } from '~/stands/scheme-edit/create'

/**
 * Вход в создание схемы — стенд, такт 91 (`docs/scheme-edit-review.md`, 5.3; решение 3 оркестратора 2026-10-08). Фон — заголовок
 * «Схемы осмотра» и короткая таблица демо-схем с «Добавить схему»: список схем вне стенда, в продукт фон не идёт. Окно «Новая схема
 * осмотра» открыто сразу (`SchemeCreate` — одна разметка с копией на `/scheme-edit`). «Создать схему» — первое сохранение: страница
 * схемы открывается в режиме создания (`/scheme-edit?data=created&from=…`), набор данных передаётся модулем `create.ts`.
 *
 * На странице — только компоненты кита и классы раскладки (`CLAUDE.md`, «Экран „как есть“»).
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | без параметров | окно открыто на шаге «С чего начать», источник «Отобранные шаблоны», выбран первый шаблон |
 * | `?source=other` · `recent` | источник «Другие схемы» (значок доступа по роли) либо «Недавние» |
 * | `?card=t-house` | выбранная карточка источника |
 * | `?step=base` | шаг «Основа» выбранной карточки; `?step=empty` — шаг «Основа» пустой схемы |
 * | `?open=closed` | окно закрыто — фон и «Добавить схему» |
 * | `?now=2026-10-03T09:00:00` | неподвижные часы — переходят на страницу созданной схемы |
 */
definePageMeta({ layout: 'admin' })
useHead({ title: 'Новая схема осмотра — стенд' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')

const open = ref(q('open') !== 'closed')
const SOURCE = (['templates', 'other', 'recent'] as CreateSourceId[]).find(x => x === q('source')) ?? 'templates'

/** Фон — демо-схемы списка (вымышленные). */
const ROWS = [
  { id: 's-kasko', name: 'КАСКО — осмотр легкового автомобиля', company: 'Демо Страхование', type: 'Осмотр транспорта', status: 'Опубликована', tone: 'success', edited: '01.10.2026' },
  { id: 's-osago', name: 'ОСАГО — осмотр легкового автомобиля', company: 'Демо Страхование', type: 'Осмотр транспорта', status: 'Опубликована', tone: 'success', edited: '18.09.2026' },
  { id: 's-flat', name: 'Осмотр квартиры перед страхованием', company: 'Демо Страхование', type: 'Осмотр недвижимости', status: 'Черновик', tone: 'neutral', edited: '22.09.2026' },
  { id: 's-machine', name: 'Осмотр спецтехники в лизинге', company: 'Пример Лизинг', type: 'Осмотр оборудования', status: 'Опубликована', tone: 'success', edited: '03.09.2026' },
] as const

/** Уведомления окна: «Загрузить из дампа» — вне стенда. */
const notices = ref<{ id: number, text: string }[]>([])
let seq = 0
function notify(text: string) {
  notices.value = [...notices.value.slice(-2), { id: ++seq, text }]
}
function dismiss(id: number) { notices.value = notices.value.filter(n => n.id !== id) }

/** «Создать схему»: набор данных — странице схемы, переход в режим создания; часы оснастки идут следом. */
function create(e: { from: CreateFrom, basics: CreateBasics }) {
  const editedAt = q('now') || new Date().toISOString()
  setHandoff({ dataset: createdDataset(e.from, e.basics, { author: 'Анна Смирнова', editedAt }), notice: createdNotice(e.from, e.basics.name.trim()) })
  open.value = false
  navigateTo({ path: '/scheme-edit', query: { data: 'created', from: fromParam(e.from), ...(q('now') ? { now: q('now') } : {}) } })
}
</script>

<template>
  <div data-scheme-list class="flex min-w-0 flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <Heading level="page" as="h1">
        Схемы осмотра
      </Heading>
      <Button show-icon data-act="scheme-add" @click="open = true">
        <template #icon>
          <Icon name="add" :size="16" />
        </template>
        Добавить схему
      </Button>
    </div>

    <Table data-schemes-table>
      <TableRow>
        <TableHead variant="column" class="min-w-0 flex-1 px-4">
          Наименование
        </TableHead>
        <TableHead variant="column" class="w-48 px-4">
          Тип схемы
        </TableHead>
        <TableHead variant="column" class="w-36 px-4">
          Статус
        </TableHead>
        <TableHead variant="column" class="w-32 px-4">
          Изменена
        </TableHead>
      </TableRow>
      <TableRow v-for="r in ROWS" :key="r.id" :data-scheme-row="r.id">
        <TableCell variant="slot" class="min-w-0 flex-1 px-4">
          <TableCellIdentity>
            {{ r.name }}
            <template #description>
              {{ r.company }}
            </template>
          </TableCellIdentity>
        </TableCell>
        <TableCell class="w-48 px-4">
          {{ r.type }}
        </TableCell>
        <TableCell variant="slot" class="w-36 px-4">
          <Badge :variant="r.tone">
            {{ r.status }}
          </Badge>
        </TableCell>
        <TableCell class="w-32 px-4">
          {{ r.edited }}
        </TableCell>
      </TableRow>
    </Table>

    <SchemeCreate
      v-model:open="open"
      :source="SOURCE"
      :card="q('card')"
      :step="q('step') === 'base' ? 'base' : 'start'"
      :empty="q('step') === 'empty'"
      @create="create"
      @notify="notify"
    />

    <Toaster>
      <Toast v-for="n in notices" :key="n.id" :open="true" :duration="3000" @update:open="dismiss(n.id)">
        {{ n.text }}
      </Toast>
    </Toaster>
  </div>
</template>
