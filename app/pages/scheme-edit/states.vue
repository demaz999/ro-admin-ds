<script setup lang="ts">
import { ref } from 'vue'
import { formulaPreview } from '~/components/ui/formula-input'

/**
 * Матрицы компонентов страницы «Редактирование схемы осмотра» — стенд, такты 61–62. Примеры вызова для фронтов.
 * Оснастка приёмки, не продукт. Сам экран — `/scheme-edit`.
 *
 * П1: ось `AppBarStatus` — `surface="light"` и `retryable`.
 * П2: `Card`, `SettingRow`, `SectionNav`, `FormulaInput` с `FormulaPreview`, ось `Select multiple`, ступени `Heading`
 * `title`, `group` и проп `description` (`docs/scheme-edit.md`, разделы 8 и 9).
 * П3: вариант `Button variant="outline"` — мастер кита 1 `btn_outline` `1990:226`; события `edit` и `action` у
 * `TableRowActions`.
 */
definePageMeta({ layout: false })
useHead({ title: 'Редактирование схемы осмотра — матрицы' })

const STATES = ['saving', 'saved', 'error'] as const

/* ------------------------------ П2 ------------------------------ */
const row = ref({ plain: true, help: false, parent: true, off: false, armed: true, zero: true, blocked: false })
const minutes = ref(60)

const nav = ref('general')
const navAnchor = ref('behavior')
const nav2 = ref('access')

const ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'approver', label: 'Согласующий' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'operator', label: 'Оператор' },
  { value: 'agent', label: 'Агент' },
]
const rolesEmpty = ref<string[]>([])
const rolesOne = ref(['admin'])
const rolesMany = ref(['admin', 'approver', 'expert', 'operator', 'agent'])

const VARIABLES = [
  { value: 'Car:vin', label: 'VIN', group: 'Автомобиль' },
  { value: 'Car:regnum', label: 'Госномер', group: 'Автомобиль' },
  { value: 'Inspection:number', label: 'Номер осмотра', group: 'Осмотр' },
]
const SAMPLES = { 'Car:vin': 'DEMO0000000001024', 'Car:regnum': 'А000АА00', 'Inspection:number': '№ 1024' }
const formula = ref('Осмотр {Inspection:number} — {Car:vin}')
const formulaEmpty = ref('')
const formulaUnknown = ref('Архив {Car:vin}_{Car:color}')

/* ------------------------------ П3 ------------------------------ */
const rowLog = ref('—')
const ROW_ACTIONS = [{ key: 'delete', label: 'Удалить', icon: 'delete' as const, destructive: true }]

const BUTTON_OUTLINE_EXAMPLE = `<Button variant="outline">Отменить</Button>                       <!-- контурная: рамка 1 и текст --primary, фона нет -->
<Button variant="outline" show-icon>
  <template #icon><Icon name="add" :size="16" /></template>
  Добавить шаблон
</Button>
<Button variant="outline" disabled>Сбросить к значениям по умолчанию</Button>   <!-- выключено — цветом --primary-disabled -->`

const ROW_ACTIONS_EXAMPLE = `<TableRowActions
  :actions="[{ key: 'delete', label: 'Удалить', icon: 'delete', destructive: true }]"
  @edit="openTemplate(row.id)"            <!-- карандаш -->
  @action="key => remove(row.id, key)"    <!-- вторичное действие: ключ из actions -->
/>`

const HEADING_EXAMPLE = `<Heading level="title" description="Базовые параметры схемы осмотра">Основное</Heading>   <!-- раздел страницы: 24/28, подпись 13/16 -->
<Heading level="group">Экспертиза и проверка</Heading>                                        <!-- группа в карточке: 20/24 -->`

const CARD_EXAMPLE = `<Card class="flex flex-col gap-2">          <!-- поверхность блока: радиус 24, поля 24; раскладку задаёт класс -->
  <Heading level="group">Согласование</Heading>
  <SettingRow>…</SettingRow>
</Card>
<Card tone="muted">…</Card>                 <!-- приглушённая подложка вложенной формы -->`

const SETTING_ROW_EXAMPLE = `<!-- «гасит»: причина недоступности; контрол получает disabled из слота -->
<SettingRow v-slot="{ disabled }" :reason="rule.reason">
  <Checkbox v-model="value" :disabled="disabled" subtitle="Пояснение">Название настройки</Checkbox>
</SettingRow>

<!-- «вооружает»: счётчик связи и переход; metaTone="warning" — при нуле -->
<SettingRow help="Текст подсказки «?»" meta="Отмечено 2 поля на согласование">
  <Checkbox v-model="value">Отправлять поля на согласование</Checkbox>
  <template #action><ButtonAction size="sm" @click="goToFields">Перейти к полям</ButtonAction></template>
</SettingRow>

<!-- родитель и вложенные параметры; collapsed — родитель выключен -->
<SettingRow :collapsed="!parent">
  <Checkbox v-model="parent">Блокировать осмотр при проверке</Checkbox>
  <template #children><Field label="…" orientation="left"><InputNumber v-model="minutes" /></Field></template>
</SettingRow>`

const SECTION_NAV_EXAMPLE = `<SectionNav v-model="section" title="Настройки" class="sticky top-6">
  <SectionNavItem value="general" label="Общие" status="attention">      <!-- status: none · on · off · attention -->
    <SectionNavAnchor label="Основное" :active="anchor === 'main'" @select="goAnchor('main')" />
    <SectionNavAnchor label="Поведение процесса" :active="anchor === 'behavior'" @select="goAnchor('behavior')" />
  </SectionNavItem>
  <SectionNavItem value="pdf" label="PDF" status="off" />
</SectionNav>`

const SELECT_MULTIPLE_EXAMPLE = `<Field label="Кто может редактировать дедлайн">
  <Select v-model:values="roles" multiple :items="ROLES" placeholder="Выберите роли" />   <!-- значение — массив строк -->
</Field>`

const FORMULA_EXAMPLE = `<Field label="Тема письма оповещения" hint="Тема письма, которое получает клиент">
  <!-- значение — строка: текст и переменные {Группа:ключ} -->
  <FormulaInput v-model="formula" :variables="[{ value: 'Car:vin', label: 'VIN', group: 'Автомобиль' }, …]" label="Тема письма оповещения" />
</Field>
<FormulaPreview :value="formulaPreview(formula, { 'Car:vin': 'DEMO0000000001024' })" />   <!-- превью считает страница -->`
</script>

<template>
  <main class="flex flex-col gap-10 px-8 py-6">
    <Heading level="page" as="h1">
      Страница схемы — матрицы
    </Heading>

    <section class="flex flex-col gap-4" data-matrix="app-bar-status-light">
      <Heading>AppBarStatus · surface="light" — статус сохранения в шапке страницы</Heading>
      <div class="flex flex-col items-start gap-3">
        <AppBarStatus v-for="s in STATES" :key="s" surface="light" :state="s" />
        <AppBarStatus surface="light" state="error" retryable />
      </div>
    </section>

    <section class="flex flex-col gap-4" data-matrix="app-bar-status-dark">
      <Heading>AppBarStatus · surface="dark" — полоса приложения, как на «Свободной съёмке»</Heading>
      <AppBar>
        <template #end>
          <AppBarStatus v-for="s in STATES" :key="s" :state="s" />
          <AppBarStatus state="error" retryable />
        </template>
      </AppBar>
    </section>

    <!-- ============================ П2, такт 62 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="heading">
      <Heading>Heading · ступени title, group и проп description</Heading>
      <div class="flex max-w-settings flex-col gap-6">
        <Heading level="title" description="Базовые параметры схемы осмотра">
          Основное — level="title" с description
        </Heading>
        <Heading level="title">
          Поведение процесса — level="title"
        </Heading>
        <Heading level="group">
          Экспертиза и проверка — level="group"
        </Heading>
        <Heading level="group" description="Подпись под заголовком группы">
          Дедлайн проверки — level="group" с description
        </Heading>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HEADING_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="card">
      <Heading>Card — поверхность блока настроек</Heading>
      <div class="grid max-w-settings grid-cols-2 gap-6">
        <Card class="flex flex-col gap-2" data-case="default">
          <Heading level="group">
            tone="default"
          </Heading>
          <Checkbox :model-value="true" subtitle="Белая поверхность с рамкой, радиус 24, поля 24">
            Содержимое карточки
          </Checkbox>
        </Card>
        <Card tone="muted" class="flex flex-col gap-2" data-case="muted">
          <Heading level="group">
            tone="muted"
          </Heading>
          <Checkbox :model-value="false" subtitle="Приглушённая подложка вложенной формы">
            Содержимое карточки
          </Checkbox>
        </Card>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ CARD_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="setting-row">
      <Heading>SettingRow — строка настройки</Heading>
      <Card class="flex max-w-settings flex-col gap-2">
        <SettingRow data-case="plain">
          <Checkbox v-model="row.plain" subtitle="Контрол с названием и пояснением">
            Строка без обвязки
          </Checkbox>
        </SettingRow>
        <SettingRow data-case="help" help="Текст подсказки открывается наведением и фокусом">
          <Checkbox v-model="row.help">
            Строка с подсказкой «?»
          </Checkbox>
        </SettingRow>
        <SettingRow v-slot="{ disabled }" data-case="reason" reason="Доступно только для стандартной схемы">
          <Checkbox v-model="row.blocked" :disabled="disabled" subtitle="Паттерн «гасит»: контрол выключен, причина под ним">
            Строка с причиной недоступности
          </Checkbox>
        </SettingRow>
        <SettingRow data-case="meta" meta="Отмечено 2 поля на согласование">
          <Checkbox v-model="row.armed">
            Строка со счётчиком связи и переходом
          </Checkbox>
          <template #action>
            <ButtonAction size="sm" :show-icon="false">
              Перейти к полям
            </ButtonAction>
          </template>
        </SettingRow>
        <SettingRow data-case="meta-warning" meta="Отмечено 0 полей на согласование — согласование не сработает, пока поля не отмечены" meta-tone="warning">
          <Checkbox v-model="row.zero">
            Счётчик при нуле — предупреждение
          </Checkbox>
          <template #action>
            <ButtonAction size="sm" :show-icon="false">
              Перейти к полям
            </ButtonAction>
          </template>
        </SettingRow>
        <SettingRow data-case="children" :collapsed="!row.parent">
          <Checkbox v-model="row.parent" subtitle="Параметры родителя видны при включённом родителе">
            Родитель с вложенными параметрами
          </Checkbox>
          <template #children>
            <Field label="Разблокировать при неактивности через, минут" orientation="left" :control-height="32">
              <InputNumber v-model="minutes" :min="5" :max="120" :step="5" />
            </Field>
          </template>
        </SettingRow>
        <SettingRow data-case="collapsed" :collapsed="!row.off">
          <Switch v-model="row.off" subtitle="collapsed: вложенные параметры скрыты">
            Родитель выключен — на переключателе
          </Switch>
          <template #children>
            <Checkbox :model-value="false">
              Вложенный параметр
            </Checkbox>
          </template>
        </SettingRow>
      </Card>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SETTING_ROW_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="section-nav">
      <Heading>SectionNav — навигатор разделов</Heading>
      <div class="flex items-start gap-6">
        <SectionNav v-model="nav" title="Настройки" data-case="anchors">
          <SectionNavItem value="general" label="Общие" status="attention">
            <SectionNavAnchor label="Основное" :active="navAnchor === 'main'" @select="navAnchor = 'main'" />
            <SectionNavAnchor label="Поведение процесса" :active="navAnchor === 'behavior'" @select="navAnchor = 'behavior'" />
            <SectionNavAnchor label="Формулы и служебное" :active="navAnchor === 'formulas'" @select="navAnchor = 'formulas'" />
          </SectionNavItem>
          <SectionNavItem value="mobile" label="Мобильное приложение" />
          <SectionNavItem value="anomalies" label="Аномалии" status="on" />
          <SectionNavItem value="pdf" label="PDF" status="off" />
        </SectionNav>
        <SectionNav v-model="nav2" title="Настройки" data-case="plain">
          <SectionNavItem value="general" label="Общие" />
          <SectionNavItem value="access" label="Права доступа">
            <SectionNavAnchor label="Выполнение осмотра" active />
            <SectionNavAnchor label="Группы доступа" />
          </SectionNavItem>
          <SectionNavItem value="ai" label="ИИ-анализ" />
        </SectionNav>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SECTION_NAV_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="select-multiple">
      <Heading>Select · multiple — набор значений чипами, мастер кита 1 multiselect 251:16816</Heading>
      <div class="grid max-w-settings grid-cols-2 items-start gap-6">
        <Field label="Пусто — state=Default" hint="Подсказка — у Field">
          <Select v-model:values="rolesEmpty" multiple :items="ROLES" placeholder="Выберите роли" data-case="empty" />
        </Field>
        <Field label="Выбрано — state=field">
          <Select v-model:values="rolesOne" multiple :items="ROLES" placeholder="Выберите роли" data-case="one" />
        </Field>
        <Field label="Перенос чипов — badge_list variant=6">
          <Select v-model:values="rolesMany" multiple :items="ROLES" placeholder="Выберите роли" data-case="many" />
        </Field>
        <Field label="Выключено — state=disabled" disabled>
          <Select :values="['admin']" multiple :items="ROLES" placeholder="Выберите роли" disabled data-case="disabled" />
        </Field>
        <Field label="Подпись слева — label=left" orientation="left">
          <Select v-model:values="rolesOne" multiple :items="ROLES" placeholder="Выберите роли" data-case="left" />
        </Field>
        <Field label="С поиском в плашке — searchable">
          <Select v-model:values="rolesOne" multiple searchable :items="ROLES" placeholder="Выберите роли" data-case="search" />
        </Field>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SELECT_MULTIPLE_EXAMPLE }}</pre>
    </section>

    <!-- ============================ П3, такт 63 ============================ -->
    <section class="flex flex-col gap-4" data-matrix="button-outline">
      <Heading>Button · variant="outline" — контурная кнопка, мастер кита 1 btn_outline 1990:226</Heading>
      <div class="flex flex-wrap items-center gap-4">
        <Button variant="outline" data-case="default">
          Отменить
        </Button>
        <Button variant="outline" show-icon data-case="icon">
          <template #icon>
            <Icon name="add" :size="16" />
          </template>
          Добавить шаблон
        </Button>
        <Button variant="outline" disabled data-case="disabled">
          Выключена
        </Button>
        <Button variant="outline" size="sm" data-case="sm">
          Малая
        </Button>
        <Button variant="outline" size="lg" data-case="lg">
          Большая
        </Button>
        <Button variant="secondary">
          secondary — для сравнения
        </Button>
        <Button>
          default — для сравнения
        </Button>
      </div>
      <div class="max-w-80">
        <Button variant="outline" wide data-case="wide">
          Во всю ширину
        </Button>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ BUTTON_OUTLINE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="table-row-actions">
      <Heading>TableRowActions — события edit и action</Heading>
      <div class="flex max-w-settings flex-col">
        <Table>
          <TableRow>
            <TableCell class="min-w-0 flex-1 px-4">
              Наведите на строку и нажмите действие
            </TableCell>
            <TableCell variant="slot" class="w-50 justify-end px-4">
              <TableRowActions :actions="ROW_ACTIONS" @edit="rowLog = 'edit'" @action="rowLog = `action: ${$event}`" />
            </TableCell>
          </TableRow>
        </Table>
      </div>
      <ToolbarText data-row-log>
        Последнее событие: {{ rowLog }}
      </ToolbarText>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ ROW_ACTIONS_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="formula-input">
      <Heading>FormulaInput и FormulaPreview — текст с переменными</Heading>
      <div class="flex max-w-settings flex-col gap-6">
        <div class="flex flex-col gap-2" data-case="filled">
          <Field label="Текст и переменные" hint="Значение: строка с {Группа:ключ}">
            <FormulaInput v-model="formula" :variables="VARIABLES" label="Текст и переменные" />
          </Field>
          <FormulaPreview :value="formulaPreview(formula, SAMPLES)" />
        </div>
        <div class="flex flex-col gap-2" data-case="empty">
          <Field label="Пусто, с плейсхолдером">
            <FormulaInput v-model="formulaEmpty" :variables="VARIABLES" placeholder="Текст и переменные" label="Пусто" />
          </Field>
          <FormulaPreview :value="formulaPreview(formulaEmpty, SAMPLES)" />
        </div>
        <div class="flex flex-col gap-2" data-case="unknown">
          <Field label="Неизвестная переменная — чип в состоянии ошибки" hint="Переменной {Car:color} нет в списке" invalid>
            <FormulaInput v-model="formulaUnknown" :variables="VARIABLES" label="Неизвестная переменная" invalid />
          </Field>
          <FormulaPreview :value="formulaPreview(formulaUnknown, SAMPLES)" />
        </div>
        <Field label="Выключено" disabled data-case="disabled">
          <FormulaInput model-value="Осмотр {Car:vin}" :variables="VARIABLES" label="Выключено" disabled />
        </Field>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ FORMULA_EXAMPLE }}</pre>
    </section>
  </main>
</template>
