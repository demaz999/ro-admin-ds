<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { OWNERS, SCHEME_TYPES } from './catalogs'
import {
  CREATE_SOURCES, createCard, createCards, defaultBasics,
  type CreateBasics, type CreateFrom, type CreateSourceId,
} from './create'
import type { SchemeConfig } from './model'

/**
 * Окно «Новая схема осмотра» — такт 91 (`docs/scheme-edit-review.md`, 5.3; решение 3 оркестратора 2026-10-08). Композиция страницы
 * схемы из компонентов кита: одна разметка на два входа — «Добавить схему» на `/scheme-edit/new` и «⋯ → Сделать копию» на
 * `/scheme-edit`. Правило стендов экрана: только компоненты кита и классы раскладки — файл входит в автопроверку разметки страницы
 * схемы на `/compare` (`app/stands/free-shoot/markup.ts`).
 *
 * Шаг 1 «С чего начать»: строка «Опишите осмотр — ИИ соберёт черновик» выключена с причиной; источники колонкой (`SectionNav`):
 * «Отобранные шаблоны» по умолчанию, «Другие схемы» со значком доступа по роли, «Недавние»; карточки источника сеткой
 * (`RadioGroupItem card`): название, описание, «объект · N полей · M шагов»; вторичные «Пустая схема» и «Загрузить из дампа»
 * (вне стенда — уведомление). Шаг 2 «Основа»: наименование, компания-владелец, тип осмотра, тип схемы; «Создать схему» — первое
 * сохранение. Копия открывается сразу на шаге 2 с «Копия — <имя>».
 *
 * Окно отдаёт выбор событием `create` — набор данных новой схемы собирает страница (`create.ts`).
 */
const props = withDefaults(defineProps<{
  open: boolean
  /** `create` — оба шага; `copy` — сразу «Основа», источник — `copy`. */
  mode?: 'create' | 'copy'
  copy?: { config: SchemeConfig, title: string } | null
  /** Оснастка приёмки: шаг, источник и карточка при открытии. */
  step?: 'start' | 'base'
  source?: CreateSourceId
  card?: string
  /** Оснастка приёмки: шаг «Основа» пустой схемы. */
  empty?: boolean
}>(), { mode: 'create', copy: null, step: 'start', source: 'templates', card: '', empty: false })

const emit = defineEmits<{ 'update:open': [value: boolean], 'create': [value: { from: CreateFrom, basics: CreateBasics }], 'notify': [text: string] }>()

const step = ref<'start' | 'base'>('start')
const source = ref<CreateSourceId>('templates')
const picked = ref('')
const isEmpty = ref(false)
const basics = ref<CreateBasics>({ name: '', owner: '', inspectionType: 'regular', schemeType: 'vehicle' })
const nameInvalid = ref(false)

const cards = computed(() => createCards(source.value))
const card = computed(() => createCard(picked.value))
const from = computed<CreateFrom>(() => {
  if (props.mode === 'copy' && props.copy) return { kind: 'copy', config: props.copy.config, title: props.copy.title }
  return isEmpty.value ? { kind: 'empty' } : { kind: 'card', id: picked.value }
})
const access = computed(() => CREATE_SOURCES.find(x => x.id === source.value)?.access ?? '')

/** Открытие — с начала: копия сразу на «Основе», иначе шаг и источник оснастки. */
function reset() {
  nameInvalid.value = false
  source.value = props.source
  const list = createCards(props.source)
  picked.value = list.some(c => c.id === props.card) ? props.card : (list[0]?.id ?? '')
  isEmpty.value = props.mode !== 'copy' && props.empty
  step.value = props.mode === 'copy' || props.step === 'base' || props.empty ? 'base' : 'start'
  if (step.value === 'base') basics.value = defaultBasics(from.value)
}
watch(() => props.open, (v) => { if (v) reset() }, { immediate: true })

/** Смена источника — первая карточка источника выбрана. */
const sourceModel = computed<string>({
  get: () => source.value,
  set: (v) => {
    source.value = v as CreateSourceId
    picked.value = createCards(source.value)[0]?.id ?? ''
  },
})
function next() {
  isEmpty.value = false
  basics.value = defaultBasics(from.value)
  nameInvalid.value = false
  step.value = 'base'
}
function startEmpty() {
  isEmpty.value = true
  basics.value = defaultBasics({ kind: 'empty' })
  nameInvalid.value = false
  step.value = 'base'
}
function back() {
  nameInvalid.value = false
  step.value = 'start'
}
function close() { emit('update:open', false) }
function submit() {
  nameInvalid.value = !basics.value.name.trim()
  if (nameInvalid.value) return
  emit('create', { from: from.value, basics: { ...basics.value } })
}

/** Откуда схема — плашка шага «Основа». */
const origin = computed(() => {
  if (props.mode === 'copy' && props.copy) return { title: `Копия схемы «${props.copy.title}»`, text: 'Настройки, форма, процессы и шаги, витрина — копией; публикаций у копии нет' }
  if (isEmpty.value) return { title: 'Пустая схема', text: 'Группы, поля, процессы и шаги — на вкладках схемы после создания' }
  const c = card.value
  return c ? { title: `${c.kind === 'template' ? 'Из шаблона' : 'Из схемы'} «${c.title}»`, text: `${c.meta} — группы, поля, процессы и шаги перейдут в схему` } : { title: '', text: '' }
})
const name = computed({ get: () => basics.value.name, set: (v: string) => { basics.value.name = v; if (v.trim()) nameInvalid.value = false } })
const owner = computed({ get: () => basics.value.owner, set: (v: string) => { basics.value.owner = v } })
const inspectionType = computed<string>({ get: () => basics.value.inspectionType, set: (v) => { basics.value.inspectionType = v === 'multi' ? 'multi' : 'regular' } })
const schemeType = computed<string>({ get: () => basics.value.schemeType, set: (v) => { basics.value.schemeType = v } })
</script>

<template>
  <ModalCard :open="props.open" @update:open="emit('update:open', $event)">
    <ModalCardContent :size="props.mode === 'copy' ? 'md' : 'lg'" data-modal="create" :data-step="step" :data-source="source" :data-mode="props.mode">
      <!-- ============================ шаг 1 «С чего начать» ============================ -->
      <template v-if="step === 'start'">
        <ModalCardHeader title="Новая схема осмотра" subtitle="С чего начать: шаблон, другая схема или пустая схема" />
        <ModalCardBody class="flex flex-col gap-6">
          <!-- ИИ-агента ещё нет: строка выключена, причина — подсказкой поля полным контрастом (решение 3). -->
          <Field hint="Появится вместе с ИИ-агентом" data-field="create-ai">
            <Input model-value="" placeholder="Опишите осмотр — ИИ соберёт черновик" disabled show-icon>
              <template #icon>
                <Icon name="auto-awesome" :size="20" />
              </template>
            </Input>
          </Field>
          <div class="flex items-start gap-6">
            <SectionNav v-model="sourceModel" title="Источник" data-create-sources>
              <SectionNavItem
                v-for="x in CREATE_SOURCES"
                :key="x.id"
                :value="x.id"
                :label="x.label"
                :count="createCards(x.id).length"
                :badge="x.icon"
                :badge-label="x.access"
              />
            </SectionNav>
            <div class="flex min-w-0 flex-1 flex-col gap-3">
              <ToolbarText v-if="access" data-create-access>
                {{ access }}
              </ToolbarText>
              <RadioGroup v-model="picked" class="grid grid-cols-2 gap-4" data-radio="createCard" aria-label="Шаблон или схема">
                <RadioGroupItem v-for="c in cards" :key="c.id" variant="card" :value="c.id" :checked="picked === c.id" :data-card="c.id">
                  {{ c.title }}
                  <template #description>
                    {{ c.description }}
                  </template>
                  <template #meta>
                    {{ c.meta }}
                  </template>
                </RadioGroupItem>
              </RadioGroup>
            </div>
          </div>
        </ModalCardBody>
        <ModalCardFooter>
          <template #note>
            <span class="flex flex-wrap items-center gap-6">
              <ButtonAction show-icon data-act="create-empty" @click="startEmpty()">
                <template #icon>
                  <Icon name="add" :size="16" />
                </template>
                Пустая схема
              </ButtonAction>
              <ButtonAction show-icon data-act="create-dump" @click="emit('notify', 'Загрузка из дампа — вне стенда')">
                <template #icon>
                  <Icon name="article" :size="16" />
                </template>
                Загрузить из дампа
              </ButtonAction>
            </span>
          </template>
          <Button variant="secondary" data-act="create-cancel" @click="close()">
            Отмена
          </Button>
          <Button :disabled="!picked" data-act="create-next" @click="next()">
            Далее
          </Button>
        </ModalCardFooter>
      </template>

      <!-- ============================ шаг 2 «Основа» ============================ -->
      <template v-else>
        <ModalCardHeader title="Новая схема осмотра" subtitle="Основа — то, что нужно для идентификатора схемы" />
        <ModalCardBody class="flex flex-col gap-6">
          <Callout :title="origin.title" data-create-origin>
            {{ origin.text }}
            <template v-if="props.mode === 'create'" #actions>
              <ButtonAction size="sm" :show-icon="false" data-act="create-change" @click="back()">
                {{ isEmpty ? 'Выбрать шаблон' : 'Выбрать другой' }}
              </ButtonAction>
            </template>
          </Callout>
          <Field label="Наименование" required :invalid="nameInvalid" :hint="nameInvalid ? 'Заполните наименование схемы' : 'Видно в списке схем и в приложении исполнителя'" data-field="create-name">
            <Input v-model="name" placeholder="" :show-icon="false" />
          </Field>
          <div class="grid grid-cols-2 gap-4">
            <Field label="Компания-владелец" data-field="create-owner">
              <Autocomplete v-model="owner" :items="OWNERS" placeholder="Найти компанию" />
            </Field>
            <Field label="Тип схемы осмотра" hint="Определяет структуру и набор полей формы осмотра" data-field="create-type">
              <Select v-model="schemeType" :items="SCHEME_TYPES" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
          </div>
          <Field label="Тип осмотра" data-field="create-inspection">
            <RadioGroup v-model="inspectionType" class="grid grid-cols-2 gap-2" data-radio="createInspection">
              <RadioGroupItem variant="card" value="regular" :checked="inspectionType === 'regular'">
                Обычный
                <template #description>
                  Один объект в осмотре
                </template>
              </RadioGroupItem>
              <RadioGroupItem variant="card" value="multi" :checked="inspectionType === 'multi'">
                Мультиосмотр
                <template #description>
                  Несколько объектов в одном осмотре
                </template>
              </RadioGroupItem>
            </RadioGroup>
          </Field>
        </ModalCardBody>
        <ModalCardFooter>
          <template #note>
            «Создать схему» — первое сохранение: «Форма» и «Процессы и шаги» откроются сразу
          </template>
          <Button v-if="props.mode === 'create'" variant="secondary" data-act="create-back" @click="back()">
            Назад
          </Button>
          <Button v-else variant="secondary" data-act="create-cancel" @click="close()">
            Отмена
          </Button>
          <Button data-act="create-confirm" @click="submit()">
            Создать схему
          </Button>
        </ModalCardFooter>
      </template>
    </ModalCardContent>
  </ModalCard>
</template>
