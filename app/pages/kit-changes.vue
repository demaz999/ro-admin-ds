<script setup lang="ts">
import { ref } from 'vue'
import { CHANGE_CLASS, CHANGES, COMPONENTS, HANDOVER, type ChangeClass } from '~/stands/kit-changes/handover-2026-10-01'
import { HANDOVER_NEXT, NEXT } from '~/stands/kit-changes/handover-2026-10-02'
import { DRAFT, DRAFT_BASE } from '~/stands/kit-changes/draft'

/**
 * Стенд изменений кирпичиков версии передачи — правило 23 `docs/chat-protocol.md`, такт 54. Предложение чата, принятое
 * владельцем 2026-10-01: все изменённые простые компоненты версии, по компоненту; у каждой строки — класс изменения и живой
 * пример без экранного контекста. Список строк — `~/stands/kit-changes/handover-2026-10-01.ts`, тот же текст — `CHANGELOG.md`.
 */
definePageMeta({ layout: false })
useHead({ title: `Изменения кирпичиков — ${HANDOVER}` })

const TONE: Record<ChangeClass, string> = {
  added: 'bg-success-surface text-success-strong',
  fixed: 'bg-secondary text-secondary-foreground',
  changes: 'bg-warning-surface text-warning-strong',
}
const counts = (['added', 'fixed', 'changes'] as ChangeClass[]).map(c => ({ c, n: CHANGES.filter(x => x.cls === c).length }))
const of = (component: string) => CHANGES.filter(c => c.component === component)

const tabLine = ref('a')
const tabCount = ref('a')
const tabStretch = ref('a')
const tabSeg = ref('a')
/** Такт 74: флажки с причиной и без; поле для нажатия в отступ коробки. */
const checkReasonOn = ref(true)
const inputBox = ref('КАСКО — осмотр легкового автомобиля')
/** Такт 73: выключенная вкладка с причиной. */
const tabReason = ref('a')
const inputBare = ref('ИНВ-10798')
const inputFloat = ref('ИНВ-10798')
const ITEMS = ['Рабочее', 'Неисправно', 'На консервации'].map(x => ({ value: x, label: x }))
const selBare = ref('Рабочее')
const selFloat = ref('Рабочее')
const selKey = ref('Рабочее')
const checkBare = ref(false)
const checkMixed = ref(false)
const fieldValue = ref('2014')
const mutedClicks = ref(0)
/* Такт 98: плашка по полю, фокус пункта, подсказка под внешней подписью, пояснение, минус и плюс. */
const t98Type = ref('Рабочее')
const t98Narrow = ref('Рабочее')
const t98Owner = ref('Демо Страхование')
const t98Phone = ref('+7 913 555 12 34')
const t98Search = ref('фото')
const t98Check = ref(true)
const t98Switch = ref(true)
const t98Mode = ref('regular')
const t98Minutes = ref(60)
/* Черновик следующей версии — такт 62. */
const DRAFT_ROLES = ['Администратор', 'Эксперт', 'Оператор', 'Агент'].map(x => ({ value: x, label: x }))
const draftRoles = ref(['Администратор', 'Эксперт'])
/* Слот end у Input — такт 67. */
const draftSearch = ref('')
/* Такт 89: Tab из пустого поля с крестиком; действия шапки окна. */
const draftClearTab = ref('')
const draftDemoMode = ref('steps')
/* Числовой ввод у Input — такт 78. */
const draftPrice = ref('50000')
/* Слот panel у RadioGroupItem — такт 80. */
const draftMode = ref('fixed')
const draftPair = ref({ client: 900 as number | null, nonClient: 1100 as number | null, linked: false })
/* Тон выбора у RadioGroupItem — такт 83. */
const draftChoice = ref('overwrite')
/** Такт 81: уведомление с «Отменить» поверх модального окна. */
const toastModalOpen = ref(false)
const toastList = ref<number[]>([])
let toastSeq = 0
const toastUndone = ref(0)
/** Такт 72: пример закрываемой плашки — закрытие помнит страница. */
const calloutClosed = ref(false)
/* Такт 99: плашка с иконкой, таблица с высотой полной страницы. */
const t99Hint = ref(true)
const T99_ROWS = ['Эксперты Москва', 'Эксперты Казань', 'Агенты Север', 'Агенты Юг', 'Операторы']
const t99Page = ref(2)
const t99Size = ref(3)
/* Такт 100: малый чип внутри поля — набор значений и формула; чип на странице — для сравнения размеров. */
const t100Roles = ref(['Администратор', 'Эксперт', 'Агент'])
const t100Formula = ref('Осмотр {Inspection:number} — {Car:vin} {Car:color}')
const T100_VARS = [
  { value: 'Inspection:number', label: 'Номер осмотра', group: 'Осмотр' },
  { value: 'Car:vin', label: 'VIN', group: 'Автомобиль' },
]
/* Ось readonly — такт 68: обычное, только чтение, выключено рядом. */
const RO_CASES = [
  { id: 'normal', label: 'обычное' },
  { id: 'readonly', label: 'только чтение' },
  { id: 'disabled', label: 'выключено' },
] as const
const ro = ref({ name: 'КАСКО — осмотр', text: 'Осмотр автомобиля перед оформлением полиса', type: 'Рабочее', roles: ['Администратор', 'Эксперт'], owner: 'Демо Страхование', minutes: 60, check: true, active: true, mode: 'a' })
</script>

<template>
  <main data-theme="rososmotr" class="mx-auto max-w-5xl space-y-10 bg-background px-6 py-10 font-sans text-foreground">
    <header class="space-y-3">
      <Heading level="page">
        Изменения кирпичиков
      </Heading>
      <p class="max-w-3xl text-sm text-foreground-secondary">
        Версия передачи <code>handover-2026-10-01</code> относительно передачи 2026-09-30: фронты берут компоненты по git-метке.
        Только простые компоненты, без экранного контекста: что изменилось в API, виде и поведении. Тот же список —
        <code>CHANGELOG.md</code> в корне репо и разделы «Изменения после передачи» в <code>index.ts</code> компонентов.
      </p>
      <p data-totals class="flex flex-wrap items-center gap-3 text-xs">
        <span v-for="x in counts" :key="x.c" class="inline-flex h-6 items-center rounded-full px-3 font-bold" :class="TONE[x.c]">
          {{ CHANGE_CLASS[x.c] }} — {{ x.n }}
        </span>
        <span class="text-muted-foreground">компонентов — {{ COMPONENTS.length }}, строк — {{ CHANGES.length }}</span>
      </p>
    </header>

    <!-- Черновик следующей версии: строки копятся до метки по закрытию страницы схемы (правило 23). -->
    <section data-draft class="space-y-4">
      <h2 class="text-lg font-bold">
        Следующая версия (черновик) — относительно {{ DRAFT_BASE }}
      </h2>
      <div v-for="c in DRAFT" :key="c.id" :data-change="c.id" class="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 rounded-lg border border-border p-4">
        <div class="space-y-2">
          <span class="inline-flex h-5 items-center rounded-full px-2 text-2xs font-bold" :class="TONE[c.cls]">{{ CHANGE_CLASS[c.cls] }} · {{ c.component }}</span>
          <p class="text-sm">
            {{ c.text }}
          </p>
        </div>
        <div data-example class="flex min-w-0 flex-col items-stretch gap-3">
          <!-- Такт 92: оси узкого экрана срабатывают по ширине окна — пример рамкой 375 × 480 со страницей /kit-narrow. -->
          <!-- Такт 96: формат страницы каркаса — поля 16 сверху и по бокам, «Назад» и баннер-ухо слотами; рамка со страницей /kit-narrow?case=page. -->
          <template v-if="c.id === 'frame-page-format' || c.id === 'frame-page-back' || c.id === 'frame-page-banner'">
            <iframe src="/kit-narrow?case=page" title="Формат страницы — Каркас admin.vue" class="h-120 w-full rounded-md border border-border-soft" />
          </template>
          <!-- Такт 99 (решения владельца 2026-10-09): плашка с иконкой — три роли; таблица держит высоту полной страницы. -->
          <template v-else-if="c.id === 'callout-icon'">
            <Callout tone="plain" icon="info" title="Доступные ИИ-модули зависят от типа объекта схемы">
              Текущий тип: Осмотр недвижимости
            </Callout>
            <Callout icon="info">
              Анализ стоимости доступен только для схем недвижимости
            </Callout>
            <Callout v-if="t99Hint" tone="warning" icon="info" closable @close="t99Hint = false">
              Сохранение теперь автоматическое
            </Callout>
            <Button v-else variant="outline" size="sm" class="self-start" @click="t99Hint = true">
              Вернуть плашку
            </Button>
          </template>
          <template v-else-if="c.id === 'table-page-rows'">
            <div class="flex flex-col">
              <Table attached :page-rows="t99Size">
                <TableRow>
                  <TableHead variant="column" class="min-w-0 flex-1 px-4">
                    Группа
                  </TableHead>
                </TableRow>
                <TableRow v-for="r in T99_ROWS.slice((t99Page - 1) * t99Size, t99Page * t99Size)" :key="r">
                  <TableCell class="min-w-0 flex-1 px-4">
                    {{ r }}
                  </TableCell>
                </TableRow>
              </Table>
              <TableFooter v-model:page="t99Page" v-model:page-size="t99Size" :pages="Math.ceil(T99_ROWS.length / t99Size)" :total="T99_ROWS.length" :page-sizes="[3, 4]" />
            </div>
            <span class="text-xs text-muted-foreground">переключайте страницы 1 и 2 и «строк на странице»: подвал на месте, пустое место — под последней строкой</span>
          </template>
          <!-- Такт 100 (решения владельца 2026-10-09, доска scheme-edit-batch2-v1): малый чип внутри поля — белая плашка с рамкой; правило размеров. -->
          <template v-else-if="c.id === 'chip-small'">
            <Field label="Внутри поля — малый чип 24: набор значений">
              <Select v-model:values="t100Roles" multiple :items="DRAFT_ROLES" placeholder="Выберите роли" />
            </Field>
            <Field label="Внутри поля — малый чип 24: переменные формулы (последняя — вне списка)">
              <FormulaInput v-model="t100Formula" :variables="T100_VARS" label="Формула" />
            </Field>
            <div class="flex flex-wrap items-center gap-2">
              <Chip>Администратор</Chip>
              <Chip>Эксперт</Chip>
            </div>
            <span class="text-xs text-muted-foreground">на странице — Chip 32; внутри поля — малый чип 24 одной частью у обоих полей (data-chip-size="sm"); наведите на крестик — плашка --accent</span>
          </template>
          <template v-else-if="c.id === 'select-multiple-chips'">
            <Field label="Кто может выполнять осмотр">
              <Select v-model:values="t100Roles" multiple :items="DRAFT_ROLES" placeholder="Выберите роли" />
            </Field>
            <span class="text-xs text-muted-foreground">было: сплошной --primary с белым текстом; стало: --card, рамка 1 --border, текст и крестик --foreground</span>
          </template>
          <!-- Такт 98 (решения владельца 2026-10-09): плашка по полю, фокус пункта, подсказка под внешней подписью, пояснение, минус. -->
          <template v-else-if="c.id === 'select-plaque-width'">
            <Field label="Состояние — поле во всю ширину">
              <Select v-model="t98Type" :items="ITEMS" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
            <div class="w-56">
              <Field label="Поле уже 320">
                <Select v-model="t98Narrow" :items="ITEMS" placeholder="" :show-icon="false" />
              </Field>
            </div>
            <span class="text-xs text-muted-foreground">откройте оба: плашка от левого края поля шириной поля; у узкого — 320 с поиском 312</span>
          </template>
          <template v-else-if="c.id === 'select-item-focus'">
            <Select v-model="t98Type" :items="ITEMS" placeholder="" :show-icon="false" :searchable="false" />
            <Autocomplete v-model="t98Owner" :items="[{ value: 'demo', label: 'Демо Страхование' }, { value: 'alpha', label: 'Альфа Лизинг' }]" placeholder="Найти компанию" />
            <span class="text-xs text-muted-foreground">Tab к полю, пробел (у выбора) либо фокус (у поиска), стрелка вниз — кольцо 2 у пункта; движение мыши его гасит</span>
          </template>
          <template v-else-if="c.id === 'field-labeled-hint'">
            <Field label="Телефон для звонка">
              <Input v-model="t98Phone" placeholder="+7 900 000 00 00" :show-icon="false" />
            </Field>
            <Field label="Компания-владелец">
              <Autocomplete v-model="t98Owner" :items="[{ value: 'demo', label: 'Демо Страхование' }]" placeholder="Найти компанию" />
            </Field>
            <Input v-model="t98Search" placeholder="Поиск по настройкам схемы" />
            <span class="text-xs text-muted-foreground">сверху — под подписью: подсказки внутри нет, высота 40; снизу — поле без подписи: подсказка встаёт подписью, как прежде</span>
          </template>
          <template v-else-if="c.id === 'field-hint-caption'">
            <Field label="Тип схемы осмотра" hint="Определяет структуру и набор полей формы осмотра">
              <Select v-model="t98Type" :items="ITEMS" placeholder="" :show-icon="false" :searchable="false" />
            </Field>
            <span class="text-xs text-muted-foreground">подсказка через 4 под полем, 13/16 regular --foreground-secondary</span>
          </template>
          <template v-else-if="c.id === 'checkbox-caption'">
            <Checkbox v-model="t98Check" subtitle="Осмотр не будет принят, пока не пройдёт согласование">
              Обязательное согласование осмотра после экспертизы
            </Checkbox>
            <Checkbox disabled subtitle="Проверяющий сможет утвердить осмотр одной кнопкой" reason="Недоступно компании — подключается через менеджера">
              Разрешить принимать осмотр одной кнопкой
            </Checkbox>
            <Switch v-model="t98Switch" subtitle="Детекторы подозрительной активности при проведении осмотра">
              Аномалии
            </Switch>
            <span class="text-xs text-muted-foreground">пояснение и причина через 4 под подписью, 13/16 regular --foreground-secondary</span>
          </template>
          <template v-else-if="c.id === 'radio-card-caption'">
            <RadioGroup v-model="t98Mode" class="grid grid-cols-2">
              <RadioGroupItem variant="card" value="regular" :checked="t98Mode === 'regular'">
                Обычный
                <template #description>
                  Свободное заполнение полей формы в произвольном порядке
                </template>
              </RadioGroupItem>
              <RadioGroupItem variant="card" value="checklist" :checked="t98Mode === 'checklist'">
                Чек-лист
                <template #description>
                  Пошаговое выполнение с отметкой о завершении каждого пункта
                </template>
              </RadioGroupItem>
            </RadioGroup>
            <span class="text-xs text-muted-foreground">пояснение через 4; у выбранной карточки — правило тона (--foreground на 64 %)</span>
          </template>
          <template v-else-if="c.id === 'icon-remove-box'">
            <InputNumber v-model="t98Minutes" :min="5" :max="120" :step="5" />
            <Checkbox :model-value="false" indeterminate>
              Выбрано 2
            </Checkbox>
            <span class="text-xs text-muted-foreground">«−» и «+» одной толщины; минус флажка по центру квадрата</span>
          </template>
          <template v-else-if="c.id === 'frame-narrow'">
            <iframe src="/kit-narrow?case=frame&drawer=1" title="Узкий экран — Каркас admin.vue" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: каркас ниже 1024 — компактная полоса, панель меню открыта (оснастка ?drawer=1)</span>
          </template>
          <template v-else-if="c.id === 'modal-card-narrow'">
            <iframe src="/kit-narrow?case=modal" title="Узкий экран — ModalCard" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: сайд во всё окно, действия шапки под заголовком, текст подвала над кнопками</span>
          </template>
          <template v-else-if="c.id === 'modal-card-side'">
            <iframe src="/kit-narrow?case=frame&drawer=1" title="Узкий экран — ModalCard" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: side="left" и surface="sidebar" — выезжающее меню каркаса</span>
          </template>
          <template v-else-if="c.id === 'action-bar-dock'">
            <iframe src="/kit-narrow?case=dock" title="Узкий экран — ActionBar" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: полоса у низа окна во всю ширину</span>
          </template>
          <template v-else-if="c.id === 'popover-narrow'">
            <iframe src="/kit-narrow?case=popover" title="Узкий экран — Popover" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: плашка во всю ширину и до края окна</span>
          </template>
          <template v-else-if="c.id === 'heading-lines'">
            <iframe src="/kit-narrow?case=text" title="Узкий экран — Heading" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: заголовок 24/28 — три строки с многоточием</span>
          </template>
          <template v-else-if="c.id === 'callout-narrow'">
            <iframe src="/kit-narrow?case=text" title="Узкий экран — Callout" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: действия плашки — строкой под текстом</span>
          </template>
          <template v-else-if="c.id === 'toaster-narrow'">
            <iframe src="/kit-narrow?case=toaster" title="Узкий экран — Toast" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: уведомление во всю ширину с полями 16</span>
          </template>
          <template v-else-if="c.id === 'field-hint-wrap'">
            <iframe src="/kit-narrow?case=text" title="Узкий экран — Field" class="h-120 w-93.75 self-start rounded-md border border-border-soft" />
            <span class="text-xs text-muted-foreground">рамка 375 × 480: подсказка «Описания» в две строки под полем — строка выросла</span>
          </template>
          <template v-else-if="c.id === 'input-clear-tab'">
            <Input v-model="draftClearTab" placeholder="Поиск типа объекта" clearable />
            <Button variant="outline">
              Следующий элемент
            </Button>
            <span class="text-xs text-muted-foreground">фокус в пустом поле — крестик виден; Tab ведёт к кнопке ниже (до такта 89 фокус уходил на body)</span>
          </template>
          <template v-else-if="c.id === 'field-help'">
            <Field label="Телефон для звонка" hint="Номер, на который будет совершён звонок из мобильного приложения">
              <Input model-value="+7 800 000-00-00" placeholder="+7 900 000 00 00" :show-icon="false" />
              <template #help>
                <HelpPreview title="Телефон для звонка" description="Кнопка звонка в поддержку на экране «Осмотр отправлен»" value="Сейчас: Служба поддержки · +7 800 000-00-00" action-label="" />
              </template>
            </Field>
            <span class="text-xs text-muted-foreground">значок у подписи через 8; нажатие по нему фокус в поле не ставит</span>
          </template>
          <template v-else-if="c.id === 'select-item-multiline'">
            <div class="flex w-80 flex-col">
              <SelectItem multiline subtitle="выключено — после «Начать» экран «Осмотр создан»">
                Запустить осмотр сразу после создания
                <template #trailing>
                  <ButtonAction size="sm" :show-icon="false">
                    Изменить
                  </ButtonAction>
                </template>
              </SelectItem>
              <SelectItem subtitle="выключено — после «Начать» экран «Осмотр создан»">
                Запустить осмотр сразу после создания
              </SelectItem>
            </div>
            <span class="text-xs text-muted-foreground">сверху — с переносом, снизу — прежняя строка с многоточием</span>
          </template>
          <template v-else-if="c.id === 'modal-card-header-actions'">
            <div class="relative h-60 overflow-hidden rounded-md border border-border-soft bg-background">
              <ModalCard :open="true" :modal="false">
                <ModalCardContent inline placement="full">
                  <ModalCardHeader title="Демо-осмотр — КАСКО" subtitle="По черновику · логика не выполняется">
                    <template #actions>
                      <Tabs v-model="draftDemoMode">
                        <TabsList variant="segmented">
                          <TabsTrigger value="steps" variant="segmented">
                            По шагам
                          </TabsTrigger>
                          <TabsTrigger value="map" variant="segmented">
                            Карта
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <Button variant="secondary">
                        Вернуться к схеме
                      </Button>
                    </template>
                  </ModalCardHeader>
                  <ModalCardBody>
                    <ModalCardText>Действия — справа от заголовка до крестика</ModalCardText>
                  </ModalCardBody>
                </ModalCardContent>
              </ModalCard>
            </div>
            <span class="text-xs text-muted-foreground">слот actions у ModalCardHeader; без слота шапка прежняя</span>
          </template>
          <template v-else-if="c.id === 'select-item-destructive'">
            <div class="flex w-80 flex-col rounded-lg p-1 shadow-dropdown">
              <SelectGroup>
                <SelectItem>Сделать копию</SelectItem>
                <SelectItem>Сбросить черновик к текущей версии</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectItem tone="destructive">
                  Удалить схему
                </SelectItem>
              </SelectGroup>
            </div>
            <span class="text-xs text-muted-foreground">наведение на «Удалить схему» — подложка --destructive-surface; прочие пункты прежние</span>
          </template>
          <template v-else-if="c.id === 'modal-card-lg'">
            <div class="relative h-72 overflow-auto rounded-md border border-border-soft bg-background">
              <div class="relative h-full w-250">
                <ModalCard :open="true" :modal="false">
                  <ModalCardContent inline size="lg">
                    <ModalCardHeader title="Новая схема осмотра" subtitle="С чего начать: шаблон, другая схема или пустая схема" />
                    <ModalCardBody>
                      <ModalCardText>Окно 960 — колонка источников и сетка карточек в две колонки</ModalCardText>
                    </ModalCardBody>
                  </ModalCardContent>
                </ModalCard>
              </div>
            </div>
            <span class="text-xs text-muted-foreground">size="lg" у ModalCardContent; рамка примера прокручивается по горизонтали</span>
          </template>
          <template v-else-if="c.id === 'badge-outline'">
            <div class="flex flex-wrap items-center gap-2">
              <Badge appearance="outline" variant="neutral">2 схемы</Badge>
              <Badge appearance="outline">Регресс-шкала</Badge>
              <Badge appearance="outline" variant="warning">Новая</Badge>
              <Badge appearance="outline" variant="success">Применён</Badge>
              <Badge appearance="outline" variant="destructive">Необратимо</Badge>
              <Badge>Регресс-шкала</Badge>
            </div>
            <span class="text-xs text-muted-foreground">контур пяти ролей и залитая метка рядом; матрица — /tariffs/states</span>
          </template>
          <template v-else-if="c.id === 'radio-panel'">
            <RadioGroup v-model="draftMode" class="flex flex-col gap-2">
              <RadioGroupItem value="company" variant="card" :checked="draftMode === 'company'">
                Базовая цена компании
                <template #description>
                  Наследует цену компании
                </template>
              </RadioGroupItem>
              <RadioGroupItem value="fixed" variant="card" :checked="draftMode === 'fixed'">
                Фиксированная цена группы
                <template #description>
                  Фиксированная цена только для этой группы
                </template>
                <template #panel>
                  <PricePair v-model:client="draftPair.client" v-model:non-client="draftPair.nonClient" v-model:linked="draftPair.linked" stretch />
                </template>
              </RadioGroupItem>
            </RadioGroup>
            <span class="text-xs text-muted-foreground">тело — только у отмеченной карточки; переключите режим</span>
          </template>
          <template v-else-if="c.id === 'card-dimmed'">
            <div class="flex flex-col gap-1">
              <Card tone="muted" size="sm">
                <span class="text-xs">tone="muted", size="sm"</span>
              </Card>
              <Card tone="muted" size="sm" dimmed>
                <span class="text-xs">tone="muted", size="sm", dimmed</span>
              </Card>
            </div>
          </template>
          <template v-else-if="c.id === 'button-loading'">
            <div class="flex flex-wrap items-center gap-3">
              <Button show-icon>
                <template #icon>
                  <Icon name="save" :size="20" />
                </template>
                Сохранить изменения
              </Button>
              <Button show-icon loading>
                <template #icon>
                  <Icon name="save" :size="20" />
                </template>
                Сохранить изменения
              </Button>
              <Button variant="secondary" loading>
                Применить
              </Button>
              <Button variant="outline" loading>
                Применить
              </Button>
            </div>
            <span class="text-xs text-muted-foreground">покой и загрузка той же кнопки — ширина одна; матрица — /tariffs/states</span>
          </template>
          <template v-else-if="c.id === 'input-unit'">
            <div class="flex flex-wrap items-start gap-3">
              <div class="w-price-input">
                <Input model-value="20000" unit="₽" placeholder="" :show-icon="false" />
              </div>
              <div class="w-price-input">
                <Input model-value="" unit="₽" placeholder="" :show-icon="false" />
              </div>
              <div class="w-scale-bound">
                <Input model-value="1001" unit="шт" placeholder="" :show-icon="false" readonly />
              </div>
            </div>
            <span class="text-xs text-muted-foreground">заполненное, пустое, «только чтение» — единица видна всегда; матрица — /tariffs/states</span>
          </template>
          <template v-else-if="c.id === 'input-numeric'">
            <div class="flex items-center gap-3">
              <div class="w-price-input">
                <Input v-model="draftPrice" numeric unit="₽" placeholder="" :show-icon="false" />
              </div>
              <code class="text-xs">v-model: «{{ draftPrice }}»</code>
            </div>
            <span class="text-xs text-muted-foreground">наберите буквы — не вводятся; разряды — при показе</span>
          </template>
          <template v-else-if="c.id === 'field-split'">
            <Card tone="muted" size="sm" class="flex flex-col">
              <Field orientation="split" class="flex-1" label="Минимальная сумма списания за один расчётный период" hint="Если итоговая сумма за период оказывается ниже этого порога — выставляется минимальная сумма">
                <div class="w-price-input">
                  <Input model-value="20000" numeric unit="₽" variant="elevated" placeholder="" :show-icon="false" />
                </div>
              </Field>
            </Card>
          </template>
          <template v-else-if="c.id === 'field-hint-tone'">
            <Field label="Базовая стоимость" hint="Не применяется при включённой регресс-шкале" hint-tone="warning">
              <Input model-value="500" numeric unit="₽" placeholder="" :show-icon="false" disabled />
            </Field>
          </template>
          <template v-else-if="c.id === 'icon-button-destructive'">
            <div class="flex items-center gap-4">
              <IconButton variant="destructive" size="sm" label="Удалить ступень">
                <Icon name="delete" :size="16" />
              </IconButton>
              <IconButton variant="destructive" size="sm" disabled label="Удалить ступень">
                <Icon name="delete" :size="16" />
              </IconButton>
              <span class="text-xs text-muted-foreground">покой и выключено; наведение — подложка `--destructive-surface`</span>
            </div>
          </template>
          <template v-else-if="c.id === 'card-size'">
            <div class="grid grid-cols-2 gap-3">
              <Card size="sm">
                <span class="text-xs">size="sm", tone="default"</span>
              </Card>
              <Card tone="muted" size="sm">
                <span class="text-xs">size="sm", tone="muted"</span>
              </Card>
            </div>
          </template>
          <template v-else-if="c.id === 'modal-card-icon'">
            <div class="relative h-60 overflow-hidden rounded-md border border-border-soft bg-background">
              <ModalCard :open="true" :modal="false">
                <ModalCardContent inline size="sm">
                  <ModalCardHeader title="Дата занята действующим тарифом" subtitle="Новый тариф начнётся 1 мая 2026 — эта дата уже входит в период текущего тарифа">
                    <template #icon>
                      <Icon name="calendar-month" :size="20" />
                    </template>
                  </ModalCardHeader>
                </ModalCardContent>
              </ModalCard>
            </div>
            <span class="text-xs text-muted-foreground">значок над заголовком; без слота шапка прежняя</span>
          </template>
          <template v-else-if="c.id === 'radio-tone'">
            <RadioGroup v-model="draftChoice" class="flex flex-col gap-2">
              <RadioGroupItem value="plan" variant="card" :checked="draftChoice === 'plan'">
                Запланировать изменение
                <template #description>
                  Текущий тариф продолжится до апреля 2026, затем сменится новым
                </template>
              </RadioGroupItem>
              <RadioGroupItem value="overwrite" variant="card" tone="destructive" :checked="draftChoice === 'overwrite'">
                <span class="inline-flex items-center gap-2">Перезаписать текущий тариф <Badge appearance="outline" variant="destructive">Необратимо</Badge></span>
                <template #description>
                  Текущий тариф будет завершён. Новый начнётся 1 мая 2026
                </template>
              </RadioGroupItem>
            </RadioGroup>
            <span class="text-xs text-muted-foreground">второй вариант — tone="destructive"; первый — без пропа, прежний</span>
          </template>
          <template v-else-if="c.id === 'icon-warning'">
            <span class="flex items-center gap-4 text-xs">
              <Icon name="warning" :size="11" />
              <Icon name="warning" :size="16" />
              <Icon name="warning" :size="24" />
              <code>warning</code>
            </span>
            <span class="text-xs text-muted-foreground">11 — в кнопке «Осмотр невозможен» экрана приложения, в боксе 12</span>
          </template>
          <template v-else-if="c.id === 'icon-error'">
            <span class="flex items-center gap-4 text-xs">
              <Icon name="error" :size="16" />
              <Icon name="error" :size="20" />
              <Icon name="error" :size="24" />
              <code>error</code>
            </span>
            <span class="text-xs text-muted-foreground">20 — в значке окна, белым в круге 28</span>
          </template>
          <template v-else-if="c.id === 'icon-save'">
            <span class="flex items-center gap-4 text-xs">
              <Icon name="save" :size="16" />
              <Icon name="save" :size="20" />
              <Icon name="save" :size="24" />
              <code>save</code>
            </span>
            <span class="text-xs text-muted-foreground">20 — в кнопке «Сохранить изменения»</span>
          </template>
          <template v-else-if="c.id === 'modal-card-full'">
            <div class="relative h-100 overflow-hidden rounded-md border border-border-soft bg-background">
              <ModalCard :open="true" :modal="false">
                <ModalCardContent inline placement="full">
                  <ModalCardHeader title="Осмотр повреждений" subtitle="Повторяемый процесс · форма и шаги вместе" />
                  <ModalCardBody>
                    <ModalCardText>Форма процесса и его шаги вместе; сайд шага открывается поверх слоя</ModalCardText>
                  </ModalCardBody>
                  <ModalCardFooter>
                    <Button variant="secondary">
                      Отмена
                    </Button>
                    <Button>Сохранить</Button>
                  </ModalCardFooter>
                </ModalCardContent>
              </ModalCard>
            </div>
            <span class="text-xs text-muted-foreground">full — во всё окно; в рамке показан внутри родителя (inline)</span>
          </template>
          <template v-else-if="c.id === 'frame-meta-stack'">
            <div class="flex flex-wrap items-start gap-6">
              <div class="w-group-list">
                <FrameMeta layout="stack" :rows="[{ label: 'Алиас', value: 'Body' }, { label: 'Экран создания', value: '2-й экран' }, { label: 'В мобильном', value: 'После создания' }, { label: 'Редактирование', value: 'Разрешено' }]" />
              </div>
              <div class="w-side-panel">
                <FrameMeta :rows="[{ label: 'Файл', value: 'IMG_3315.jpeg' }, { label: 'Время', value: '10:25:54' }]" />
              </div>
            </div>
            <span class="text-xs text-muted-foreground">слева — stack; справа — прежняя сетка grid</span>
          </template>
          <template v-else-if="c.id === 'action-bar-panel'">
            <ActionBar layout="panel" count="Выбрано: 2 поля">
              <Button variant="secondary">
                Сделать обязательными
              </Button>
              <Button variant="outline">
                Снять выделение
              </Button>
              <Button variant="destructive" class="ml-auto">
                Удалить
              </Button>
            </ActionBar>
            <span class="text-xs text-muted-foreground">панель в потоке; плавающая полоса — layout="float", прежняя</span>
          </template>
          <template v-else-if="c.id === 'input-trailing'">
            <Input model-value="фото" placeholder="Поиск по настройкам схемы" clearable>
              <template #trailing>
                <ToolbarText>2 из 7</ToolbarText>
                <IconButton variant="service" size="sm" label="Предыдущее совпадение">
                  <Icon name="chevron-up" :size="16" />
                </IconButton>
                <IconButton variant="service" size="sm" label="Следующее совпадение">
                  <Icon name="chevron-down" :size="16" />
                </IconButton>
              </template>
            </Input>
            <Input model-value="" placeholder="Поиск по настройкам схемы" clearable>
              <template #trailing>
                <ToolbarText>0 из 0</ToolbarText>
              </template>
            </Input>
            <span class="text-xs text-muted-foreground">слот виден и у пустого поля; крестик очистки стоит после слота</span>
          </template>
          <template v-else-if="c.id === 'input-end'">
            <Input v-model="draftSearch" placeholder="Поиск по настройкам схемы" clearable>
              <template #end>
                <Kbd surface="card">
                  /
                </Kbd>
              </template>
            </Input>
            <Input model-value="подпис" placeholder="Поиск по настройкам схемы" clearable>
              <template #end>
                <Kbd surface="card">
                  /
                </Kbd>
              </template>
            </Input>
            <span class="text-xs text-muted-foreground">пустое поле — слот; значение — крестик на месте слота</span>
          </template>
          <template v-else-if="c.id === 'checkbox-reason'">
            <Checkbox v-model="checkReasonOn">
              Согласование включено
            </Checkbox>
            <Checkbox disabled reason="Сначала включите согласование в разделе Настройки">
              Отправлять на согласование
            </Checkbox>
            <Checkbox disabled subtitle="Пояснение гаснет вместе с флажком" reason="Недоступна компании — подключается через менеджера">
              Детектор подмены снимка
            </Checkbox>
            <Checkbox disabled>
              Выключен без причины
            </Checkbox>
            <span class="text-xs text-muted-foreground">disabled с reason: флажок и подпись на 0.48, причина полным контрастом; без reason — прежний</span>
          </template>
          <template v-else-if="c.id === 'toast-over-modal'">
            <Button variant="outline" size="sm" class="self-start" data-kc="toast-modal-open" @click="toastModalOpen = true">
              Открыть окно
            </Button>
            <ModalCard v-model:open="toastModalOpen">
              <ModalCardContent placement="center" size="sm">
                <ModalCardHeader title="Окно поверх страницы" />
                <ModalCardBody>
                  <ModalCardText>Покажите уведомление и нажмите «Отменить» — окно остаётся открытым. Отменено: {{ toastUndone }}</ModalCardText>
                </ModalCardBody>
                <ModalCardFooter>
                  <Button data-kc="toast-modal-show" @click="toastList.push(++toastSeq)">
                    Показать уведомление
                  </Button>
                </ModalCardFooter>
              </ModalCardContent>
            </ModalCard>
            <span class="text-xs text-muted-foreground">модальное окно открыто — действие уведомления нажимается; раньше нажатие не доходило</span>
          </template>
          <template v-else-if="c.id === 'input-box-focus'">
            <Input v-model="inputBox" placeholder="Продающее название" :show-icon="false" />
            <Input v-model="inputBox" placeholder="Поиск по настройкам" clearable />
            <span class="text-xs text-muted-foreground">нажатие в отступ 16 слева или справа, в строку подписи или по иконке — фокус в поле, курсор у ближайшего края текста</span>
          </template>
          <template v-else-if="c.id === 'tabs-reason'">
            <Tabs v-model="tabReason" class="w-full">
              <TabsList>
                <TabsTrigger value="a">
                  Настройки
                </TabsTrigger>
                <TabsTrigger value="b" disabled reason="Станет доступно после первого сохранения схемы">
                  Форма
                </TabsTrigger>
                <TabsTrigger value="c" disabled>
                  Процессы
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span class="text-xs text-muted-foreground">«Форма» — disabled с reason: наведение и Tab показывают причину, кольцо кита; «Процессы» — disabled без причины, прежний</span>
          </template>
          <template v-else-if="c.id === 'callout-closable'">
            <Callout v-if="!calloutClosed" closable @close="calloutClosed = true">
              Сохранение теперь автоматическое. В боевые осмотры изменения попадают по кнопке «Опубликовать схему»
            </Callout>
            <Button v-else variant="outline" size="sm" class="self-start" @click="calloutClosed = false">
              Вернуть плашку
            </Button>
            <Callout tone="warning" title="Требует оформления" closable>
              Заголовок и текст: крестик стоит у первой строки
            </Callout>
            <span class="text-xs text-muted-foreground">closable — крестик и событие close; убирает плашку потребитель</span>
          </template>
          <template v-else-if="c.id === 'icon-star'">
            <span class="flex items-center gap-4 text-xs">
              <Icon name="star" :size="12" />
              <Icon name="star" :size="16" />
              <Icon name="star" :size="24" />
              <code>star</code>
              <Icon name="arrow-forward" :size="12" />
              <Icon name="arrow-forward" :size="24" />
              <code>arrow-forward</code>
            </span>
            <span class="text-xs text-muted-foreground">star 12 — таб «Витрина»; arrow-forward 12 — «Как устроена схема»</span>
          </template>
          <template v-else-if="c.id === 'icon-drag'">
            <span class="flex items-center gap-4 text-xs">
              <Icon name="drag" :size="12" />
              <Icon name="drag" :size="16" />
              <Icon name="drag" :size="24" />
              <code>drag</code>
            </span>
            <span class="text-xs text-muted-foreground">12 — ручка строки таблицы (IconButton service sm), 16 и 24 — для сравнения</span>
          </template>
          <template v-else-if="c.id === 'icon-arrow-back'">
            <span class="flex items-center gap-2 text-xs">
              <Icon name="arrow-back" :size="24" />
              <code>arrow-back</code>
            </span>
          </template>
          <template v-else-if="c.id === 'button-outline'">
            <div class="flex flex-wrap items-center gap-3">
              <Button variant="outline">
                Отменить
              </Button>
              <Button variant="outline" show-icon>
                <template #icon>
                  <Icon name="add" :size="16" />
                </template>
                Добавить шаблон
              </Button>
              <Button variant="outline" disabled>
                Выключена
              </Button>
              <Button variant="secondary">
                secondary — для сравнения
              </Button>
            </div>
          </template>
          <template v-else-if="c.id === 'select-multiple'">
            <Field label="Кто может редактировать дедлайн">
              <Select v-model:values="draftRoles" multiple :items="DRAFT_ROLES" placeholder="Выберите роли" />
            </Field>
          </template>
          <template v-else-if="c.id === 'heading-levels'">
            <Heading level="title">
              Раздел страницы — title
            </Heading>
            <Heading level="group">
              Группа в карточке — group
            </Heading>
          </template>
          <template v-else-if="c.id === 'heading-description'">
            <Heading level="title" description="Базовые параметры схемы осмотра">
              Основное
            </Heading>
          </template>
          <div v-else-if="c.id.startsWith('readonly-')" class="grid grid-cols-3 gap-3">
            <div v-for="st in RO_CASES" :key="st.id" class="flex min-w-0 flex-col gap-1" :data-case="st.id">
              <span class="text-xs text-muted-foreground">{{ st.label }}</span>
              <Field v-if="c.id === 'readonly-field'" label="Наименование" hint="Подсказка" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'">
                <Input v-model="ro.name" placeholder="" :show-icon="false" :disabled="st.id === 'disabled'" />
              </Field>
              <Input v-else-if="c.id === 'readonly-input'" v-model="ro.name" placeholder="" :show-icon="false" clearable :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'" />
              <Textarea v-else-if="c.id === 'readonly-textarea'" v-model="ro.text" placeholder="Описание" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'" />
              <template v-else-if="c.id === 'readonly-select'">
                <Select v-model="ro.type" :items="ITEMS" placeholder="" :show-icon="false" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'" />
                <Select v-model:values="ro.roles" multiple :items="DRAFT_ROLES" placeholder="Выберите роли" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'" />
              </template>
              <Autocomplete v-else-if="c.id === 'readonly-autocomplete'" v-model="ro.owner" :items="[{ value: 'demo', label: 'Демо Страхование' }]" placeholder="Найти компанию" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'" />
              <InputNumber v-else-if="c.id === 'readonly-input-number'" v-model="ro.minutes" :min="5" :max="120" :step="5" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'" />
              <Checkbox v-else-if="c.id === 'readonly-checkbox'" v-model="ro.check" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'">
                Пропускать экспертизу
              </Checkbox>
              <Switch v-else-if="c.id === 'readonly-switch'" v-model="ro.active" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'">
                Схема активна
              </Switch>
              <RadioGroup v-else-if="c.id === 'readonly-radio'" v-model="ro.mode" :readonly="st.id === 'readonly'" :disabled="st.id === 'disabled'">
                <RadioGroupItem value="a" :checked="ro.mode === 'a'" :disabled="st.id === 'disabled'">
                  Обычный
                </RadioGroupItem>
                <RadioGroupItem value="b" :checked="ro.mode === 'b'" :disabled="st.id === 'disabled'">
                  Мультиосмотр
                </RadioGroupItem>
              </RadioGroup>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Версия после первой: строки относительно предыдущей метки (правило 23). -->
    <section data-next class="space-y-4">
      <h2 class="text-lg font-bold">
        Версия {{ HANDOVER_NEXT }} — относительно {{ HANDOVER }}
      </h2>
      <div v-for="c in NEXT" :key="c.id" :data-change="c.id" class="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 rounded-lg border border-border p-4">
        <div class="space-y-2">
          <span class="inline-flex h-5 items-center rounded-full px-2 text-2xs font-bold" :class="TONE[c.cls]">{{ CHANGE_CLASS[c.cls] }} · {{ c.component }}</span>
          <p class="text-sm">
            {{ c.text }}
          </p>
        </div>
        <div data-example class="flex min-w-0 flex-col items-start gap-3">
          <template v-if="c.id === 'button-feature'">
            <div class="flex flex-wrap items-center gap-3">
              <Button variant="feature" show-icon>
                <template #icon>
                  <Icon name="auto-awesome" :size="20" />
                </template>
                Распределить автоматически
              </Button>
              <Button variant="feature">
                Без иконки
              </Button>
              <Button variant="feature" disabled>
                Выключена
              </Button>
              <Button variant="secondary">
                secondary — для сравнения
              </Button>
            </div>
          </template>
          <template v-else-if="c.id === 'icon-visibility'">
            <span class="flex items-center gap-2 text-xs">
              <Icon name="visibility" :size="24" />
              <code>visibility</code>
            </span>
          </template>
        </div>
      </div>
    </section>

    <section v-for="component in COMPONENTS" :key="component" :data-component="component" class="space-y-4">
      <h2 class="text-lg font-bold">
        {{ component }}
      </h2>

      <div v-for="c in of(component)" :key="c.id" :data-change="c.id" class="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 rounded-lg border border-border p-4">
        <div class="space-y-2">
          <span class="inline-flex h-5 items-center rounded-full px-2 text-2xs font-bold" :class="TONE[c.cls]">{{ CHANGE_CLASS[c.cls] }}</span>
          <p class="text-sm">
            {{ c.text }}
          </p>
        </div>

        <div data-example class="flex min-w-0 flex-col items-start gap-3">
          <!-- ---------------- Button ---------------- -->
          <template v-if="c.id === 'button-sidebar'">
            <div class="flex w-full flex-wrap items-center gap-2 rounded-md bg-sidebar p-3">
              <Button variant="sidebar">
                Без иконки
              </Button>
              <Button variant="sidebar" show-icon>
                <template #icon>
                  <Icon name="keyboard" :size="20" />
                </template>
                С иконкой
              </Button>
              <Button variant="sidebar" disabled>
                Выключена
              </Button>
            </div>
          </template>
          <template v-else-if="c.id === 'button-cn'">
            <div class="flex flex-wrap items-center gap-3">
              <Button>default</Button>
              <Button variant="secondary">
                secondary
              </Button>
              <Button variant="destructive">
                destructive
              </Button>
            </div>
          </template>
          <template v-else-if="c.id === 'button-ring'">
            <div class="flex flex-wrap items-center gap-4">
              <Button>default</Button>
              <Button variant="secondary">
                secondary
              </Button>
              <Button variant="destructive">
                destructive
              </Button>
            </div>
            <p class="text-2xs text-muted-foreground">
              Кольцо видно при фокусе с клавиатуры — пройдите кнопки клавишей Tab.
            </p>
          </template>

          <!-- ---------------- IconButton ---------------- -->
          <template v-else-if="c.id === 'icon-button-ring'">
            <div class="flex items-center gap-4">
              <IconButton label="Поиск">
                <Icon name="search" :size="16" />
              </IconButton>
              <IconButton variant="secondary" label="Поиск, secondary — кольцо без отступа">
                <Icon name="search" :size="16" />
              </IconButton>
            </div>
            <p class="text-2xs text-muted-foreground">
              Слева — <code>default</code> с отступом кольца, справа — <code>secondary</code> для сравнения. Фокус — клавишей Tab.
            </p>
          </template>

          <!-- ---------------- Tabs ---------------- -->
          <template v-else-if="c.id === 'tabs-segmented'">
            <Tabs v-model="tabSeg">
              <TabsList variant="segmented">
                <TabsTrigger value="a" variant="segmented">
                  Списком
                </TabsTrigger>
                <TabsTrigger value="b" variant="segmented">
                  Карточками
                </TabsTrigger>
                <TabsTrigger value="c" variant="segmented" disabled>
                  Выключен
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </template>
          <template v-else-if="c.id === 'tabs-count'">
            <Tabs v-model="tabCount" class="w-full">
              <TabsList>
                <TabsTrigger value="a" :count="12">
                  Открытые
                </TabsTrigger>
                <TabsTrigger value="b" :count="0">
                  Закрытые
                </TabsTrigger>
                <template #end>
                  <ButtonAction size="sm" :show-icon="false">
                    Действие в слоте end
                  </ButtonAction>
                </template>
              </TabsList>
            </Tabs>
          </template>
          <template v-else-if="c.id === 'tabs-stretch'">
            <div class="w-full rounded-md border border-border-soft">
              <Tabs v-model="tabStretch">
                <TabsList stretch class="px-3 pt-3">
                  <TabsTrigger value="a">
                    Первая
                  </TabsTrigger>
                  <TabsTrigger value="b">
                    Вторая
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p class="p-3 text-2xs text-muted-foreground">
                <code>stretch</code> и <code>class="px-3 pt-3"</code>: линия идёт от края до края контейнера.
              </p>
            </div>
          </template>
          <template v-else-if="c.id === 'tabs-line'">
            <Tabs v-model="tabLine">
              <TabsList>
                <TabsTrigger value="a">
                  Активная
                </TabsTrigger>
                <TabsTrigger value="b">
                  Вторая
                </TabsTrigger>
                <TabsTrigger value="c" disabled>
                  Выключена
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </template>

          <!-- ---------------- Input ---------------- -->
          <template v-else-if="c.id === 'input-placeholder'">
            <div class="grid w-full grid-cols-2 gap-4">
              <div class="space-y-1">
                <Input v-model="inputBare" :show-icon="false" placeholder="" />
                <p class="text-2xs text-muted-foreground">
                  <code>placeholder=""</code> — значение по центру
                </p>
              </div>
              <div class="space-y-1">
                <Input v-model="inputFloat" :show-icon="false" placeholder="Инвентарный номер" />
                <p class="text-2xs text-muted-foreground">
                  с подписью — прежнее
                </p>
              </div>
            </div>
          </template>

          <!-- ---------------- Select ---------------- -->
          <template v-else-if="c.id === 'select-keyboard'">
            <div class="w-60">
              <Select v-model="selKey" :items="ITEMS" :show-icon="false" placeholder="Состояние" />
            </div>
            <p class="text-2xs text-muted-foreground">
              Tab ставит фокус на поле, Enter открывает список.
            </p>
          </template>
          <template v-else-if="c.id === 'select-z'">
            <p class="text-2xs text-muted-foreground">
              Проверяется внутри модального окна: всплывающий список лежит поверх него. Отдельного вида у правки нет.
            </p>
          </template>
          <template v-else-if="c.id === 'select-item-muted'">
            <div class="w-72 rounded-lg bg-popover p-1 shadow-dropdown">
              <SelectItem>Обычный пункт</SelectItem>
              <SelectItem muted @click="mutedClicks += 1">
                Пункт muted — клик доходит
              </SelectItem>
              <SelectItem disabled>
                Пункт disabled
              </SelectItem>
            </div>
            <p class="text-2xs text-muted-foreground">
              Кликов по пункту <code>muted</code>: {{ mutedClicks }}
            </p>
          </template>
          <template v-else-if="c.id === 'select-placeholder'">
            <div class="grid w-full grid-cols-2 gap-4">
              <div class="space-y-1">
                <Select v-model="selBare" :items="ITEMS" :show-icon="false" placeholder="" />
                <p class="text-2xs text-muted-foreground">
                  <code>placeholder=""</code> — значение по центру
                </p>
              </div>
              <div class="space-y-1">
                <Select v-model="selFloat" :items="ITEMS" :show-icon="false" placeholder="Состояние" />
                <p class="text-2xs text-muted-foreground">
                  с подписью — прежнее
                </p>
              </div>
            </div>
          </template>
          <template v-else-if="c.id === 'select-group'">
            <div class="w-80 rounded-lg bg-popover p-1 shadow-dropdown">
              <SelectGroup header="Первая группа">
                <SelectItem subtitle="подзаголовок пункта">
                  Двухстрочный пункт
                </SelectItem>
                <SelectItem>Обычный пункт</SelectItem>
              </SelectGroup>
              <SelectGroup header="Вторая группа">
                <SelectItem>Обычный пункт</SelectItem>
              </SelectGroup>
            </div>
          </template>

          <!-- ---------------- Field ---------------- -->
          <template v-else-if="c.id === 'field-label'">
            <div class="flex w-full flex-col gap-2">
              <Field orientation="left" label-width="form" label="Год выпуска" required>
                <Input v-model="fieldValue" :show-icon="false" placeholder="" />
              </Field>
              <Field orientation="left" label-width="form" label="Заводской номер">
                <Input :show-icon="false" placeholder="" />
              </Field>
            </div>
          </template>

          <!-- ---------------- Checkbox ---------------- -->
          <template v-else-if="c.id === 'checkbox-indeterminate'">
            <Checkbox v-model="checkMixed" :indeterminate="!checkMixed">
              {{ checkMixed ? 'Отмечен' : 'Неопределённое состояние — клик отмечает' }}
            </Checkbox>
          </template>
          <template v-else-if="c.id === 'checkbox-gap'">
            <div data-checkbox-gap class="flex items-center gap-6">
              <Checkbox>Подпись флажка</Checkbox>
              <Checkbox :model-value="true">Отмечен</Checkbox>
              <RadioGroup model-value="a">
                <RadioGroupItem value="a" checked>Радио</RadioGroupItem>
              </RadioGroup>
              <Switch>Переключатель</Switch>
            </div>
            <p class="text-2xs text-muted-foreground">
              От контрола до подписи — 8 у флажка, радио и переключателя.
            </p>
          </template>
          <template v-else-if="c.id === 'checkbox-bare'">
            <div class="flex items-center gap-4">
              <span data-bare-box class="flex size-8 items-center justify-center rounded-sm border border-dashed border-border">
                <Checkbox v-model="checkBare" />
              </span>
              <Checkbox>С подписью — прежний</Checkbox>
            </div>
            <p class="text-2xs text-muted-foreground">
              Слева — флажок без подписи в рамке 32: квадрат по центру.
            </p>
          </template>

          <!-- ---------------- ButtonAction ---------------- -->
          <template v-else-if="c.id === 'button-action-pair'">
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-4 rounded-md bg-muted px-4 py-3">
                <ButtonAction size="sm" strong :show-icon="false">
                  Главное действие
                </ButtonAction>
                <ButtonAction size="sm" variant="muted" :show-icon="false">
                  Второстепенное
                </ButtonAction>
                <ButtonAction size="sm" :show-icon="false">
                  Без осей
                </ButtonAction>
              </div>
              <p class="text-2xs text-muted-foreground">
                <code>strong</code> и <code>variant="muted"</code> на тонированной плашке; справа — кнопка без осей, прежняя.
              </p>
            </div>
          </template>

          <!-- ---------------- Icon ---------------- -->
          <template v-else-if="c.id === 'icon-glyphs'">
            <div class="flex items-center gap-6">
              <span v-for="name in (['keyboard', 'bar-chart', 'auto-awesome'] as const)" :key="name" class="flex items-center gap-2 text-xs">
                <Icon :name="name" :size="24" />
                <code>{{ name }}</code>
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Такт 81: уведомления примера «Toast поверх модального окна». -->
    <Toaster>
      <Toast
        v-for="n in toastList"
        :key="n"
        :open="true"
        :duration="6000"
        show-action
        data-kc="toast-modal-toast"
        @update:open="toastList = toastList.filter(x => x !== n)"
        @action="toastUndone++; toastList = toastList.filter(x => x !== n)"
      >
        Тип удалён
        <template #action>
          Отменить
        </template>
      </Toast>
    </Toaster>
  </main>
</template>
