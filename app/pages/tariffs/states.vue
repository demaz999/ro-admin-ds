<script setup lang="ts">
import type { RegressStep, ScaleForm } from '~/components/ui/regress-scale'
import { ref } from 'vue'

/**
 * Матрицы осей и компонентов страницы «Тарификация» — стенд, такты 77–78. Примеры вызова для фронтов. Оснастка приёмки, не
 * продукт. Сам экран — `/tariffs`.
 *
 * П1 (`docs/tariffs.md`, раздел 9): проп `loading` у `Button` — макет `30957:18341`, `Loader24` `30957:18364`; глиф
 * `save` у `Icon` — макет `Icon/Save` `30957:18323`.
 *
 * П2 (такт 78): `PricePair` и `RegressScale` (карточки 1 и 2, раздел 8); оси `Input unit` и `Input numeric`, `Field
 * orientation="split"` и `hintTone`, `Card size="sm"`, `IconButton variant="destructive"` (раздел 9).
 *
 * П4 (такт 80): `PriceRange` (карточка 4, раздел 8); оси `Badge appearance="outline"`, слот `panel` у `RadioGroupItem`,
 * `Card dimmed` (раздел 9).
 *
 * П6.1 (такт 82): `PeriodSwitcher` с частью `PeriodSwitcherItem` (карточка 3, раздел 8) — четыре вида триггера (Figma
 * `30957:7855`), список периодов (`31089:12090`), пункт с меткой в слоте `badge` (окно очереди, П6.2).
 */
definePageMeta({ layout: false })
useHead({ title: 'Тарификация — матрицы' })

const VARIANTS = ['default', 'secondary', 'destructive', 'feature', 'outline'] as const
const SIZES = ['lg', 'md', 'sm'] as const

/* Живой пример: нажатие включает загрузку на 1.5 с. */
const busy = ref(false)
function press() {
  busy.value = true
  setTimeout(() => { busy.value = false }, 1500)
}

const LOADING_EXAMPLE = `<Button show-icon :disabled="!dirty" :loading="applying" @click="apply">
  <template #icon>
    <Icon name="save" :size="20" />
  </template>
  Сохранить изменения
</Button>   <!-- loading: спиннер вместо иконки и подписи, ширина прежняя, нажатия не принимает, aria-busy -->`

/* ------------------------------ П2 — такт 78 ------------------------------ */

/** Живая пара: связанная и развязанная. */
const pair = ref({ client: 50000 as number | null, nonClient: 50000 as number | null, linked: true })
const pairFree = ref({ client: 800 as number | null, nonClient: 1000 as number | null, linked: false })
const PAIR_EXAMPLE = `<PricePair
  v-model:client="price.client"
  v-model:non-client="price.nonClient"
  v-model:linked="price.linked"
  variant="elevated"
  :disabled="scale.on"
/>   <!-- связано: «Не клиент» повторяет «Клиент» и выключен; замок — Enter и пробел; stretch — поровну по строке -->`

/** Живая шкала: правила ступеней внутри компонента. */
const steps = ref<RegressStep[]>([
  { from: 1, to: 1000, price: { client: 500, nonClient: 500, linked: true } },
  { from: 1001, to: null, price: { client: 400, nonClient: 400, linked: true } },
])
const form = ref<ScaleForm>('single')
const removed = ref('')
const rolesSteps = ref<RegressStep[]>([
  { from: 1, to: 10, price: { client: 50000, nonClient: 50000, linked: true } },
  { from: 11, to: 30, price: { client: 45000, nonClient: 47000, linked: false } },
  { from: 31, to: null, price: { client: 40000, nonClient: 40000, linked: true } },
])
const errorSteps = ref<RegressStep[]>([
  { from: 1, to: 1000, price: { client: 500, nonClient: 500, linked: true } },
  { from: 1001, to: 500, price: { client: 400, nonClient: 400, linked: true } },
  { from: 501, to: null, price: { client: 300, nonClient: 300, linked: true } },
])
const SCALE_EXAMPLE = `<RegressScale
  v-model:steps="scale.steps"
  v-model:form="scale.form"
  @remove-step="({ previous }) => toastWithUndo('Ступень удалена', () => (scale.steps = previous))"
/>   <!-- «От» считается сам; «До» последней — пусто (бесконечность); ввод «До» в последнюю рождает ступень -->`

/** Поля `Input`: единица и числовой ввод. */
const unitValue = ref('20000')
const UNIT_EXAMPLE = `<Input v-model="sum" numeric unit="₽" placeholder="" :show-icon="false" />
<!-- numeric: только цифры, разряды неразрывным пробелом при показе; в модели — строка цифр -->`

/* ------------------------------ П4 — такт 80 ------------------------------ */

/** Вилка: все виды формата 6.5 в двух раскладках. */
const RANGE_CASES = [
  { id: 'range', label: 'диапазон', min: 3500, max: 4500 },
  { id: 'single', label: 'одна цена', min: 1500, max: 1500 },
  { id: 'from', label: 'только нижняя — «от»', min: 20000, max: null },
  { id: 'none', label: 'цены нет', min: null, max: null },
  { id: 'swap', label: 'min больше max — по порядку', min: 75000, max: 50000 },
] as const
const RANGE_EXAMPLE = `<PriceRange label="Вилка цен" :min="range.min" :max="range.max" />
<!-- «от 50 000 ₽ до 75 000 ₽»; равные — «X ₽»; только min — «от X ₽»; ничего — «—» -->
<PriceRange layout="dash" label="Стоимость осмотров группы по умолчанию:" :min="3500" :max="4500"
  note="наследуется схемами без индивидуальной цены" />   <!-- «3 500–4 500 ₽ · …» -->`

/** Метки-контуры: шесть ролей. */
const BADGE_ROLES = ['default', 'success', 'warning', 'destructive', 'neutral'] as const
const BADGE_EXAMPLE = `<Badge appearance="outline" variant="default">Регресс-шкала</Badge>
<Badge appearance="outline" variant="warning">Новая</Badge>
<Badge appearance="outline" variant="neutral">2 схемы</Badge>   <!-- контур 20: рамка 1 и текст тона, 12/16 -->`

/** Карточки режима с телом: живой пример. */
const mode = ref('fixed')
const modePrice = ref({ client: 900 as number | null, nonClient: 1100 as number | null, linked: false })
const modeSteps = ref<RegressStep[]>([
  { from: 1, to: 500, price: { client: 1200, nonClient: 1200, linked: true } },
  { from: 501, to: null, price: { client: 1000, nonClient: 1000, linked: true } },
])
const modeForm = ref<ScaleForm>('single')
const PANEL_EXAMPLE = `<RadioGroup v-model="group.mode">
  <RadioGroupItem value="fixed" variant="card" :checked="group.mode === 'fixed'">
    Фиксированная цена группы
    <template #description>Фиксированная цена только для этой группы</template>
    <template #panel>
      <PricePair stretch v-model:client="…" v-model:non-client="…" v-model:linked="…" />
    </template>
  </RadioGroupItem>
</RadioGroup>   <!-- тело рисуется только у отмеченной, в общей рамке с карточкой -->`

const DIMMED_EXAMPLE = `<Card tone="muted" size="sm" :dimmed="scheme.outdated"> … </Card>
<!-- содержимое на 0.48, подложка прежняя; нажатия остаются -->`

/* ------------------------------ П6.1 — такт 82 ------------------------------ */

/** Периоды демо: архив, текущий, запланированный, черновик — сроки по 6.4 при часах «апрель 2026». */
const PERIODS = [
  { id: 'p-archive', status: 'archive' as const, from: '2025-01', to: '2025-12' },
  { id: 'p-current', status: 'current' as const, from: '2026-01', to: '2026-06' },
  { id: 'p-planned', status: 'planned' as const, from: '2026-07', to: null },
  { id: 'p-draft', status: 'draft' as const, from: '2026-10', to: null },
]
/** Живой переключатель: выбор периода и «Запланировать изменение цен». */
const livePeriod = ref('p-current')
const planned = ref(0)
const PERIOD_EXAMPLE = `<PeriodSwitcher
  v-model="selectedPeriodId"
  v-model:open="periodsOpen"
  :periods="periods"   <!-- { id, status: 'current' | 'planned' | 'draft' | 'archive', from: 'ГГГГ-ММ', to: 'ГГГГ-ММ' | null }[] -->
  @plan="openPlanDialog"
/>   <!-- срок выводит сам: «до <месяц год>» у текущего и архива, «с <месяц год>» у запланированного и черновика -->

<PeriodSwitcherItem :period="period">   <!-- пункт вне списка, например в окне очереди -->
  <template #badge><Badge appearance="outline">Изменяется</Badge></template>
</PeriodSwitcherItem>`

const FIELD_EXAMPLE = `<Field orientation="split" label="Базовая стоимость схемы осмотра" :hint="hint" :hint-tone="scale.on ? 'warning' : 'default'">
  <PricePair … />
</Field>   <!-- подпись слева во всю свободную ширину, контрол справа, подсказка во всю ширину под строкой -->`
</script>

<template>
  <main class="flex flex-col gap-10 px-8 py-6">
    <Heading level="page" as="h1">
      Тарификация — матрицы
    </Heading>

    <section class="flex flex-col gap-4" data-matrix="button-loading">
      <Heading>Button · loading — загрузка главной кнопки</Heading>
      <div class="grid grid-cols-[auto_auto_auto] items-center justify-start gap-x-6 gap-y-3">
        <template v-for="v in VARIANTS" :key="v">
          <Button :variant="v" show-icon :data-case="`${v}-rest`">
            <template #icon>
              <Icon name="save" :size="20" />
            </template>
            Сохранить изменения
          </Button>
          <Button :variant="v" show-icon loading :data-case="`${v}-loading`">
            <template #icon>
              <Icon name="save" :size="20" />
            </template>
            Сохранить изменения
          </Button>
          <Button :variant="v" show-icon disabled :data-case="`${v}-disabled`">
            <template #icon>
              <Icon name="save" :size="20" />
            </template>
            Сохранить изменения
          </Button>
        </template>
      </div>
      <Heading>Размеры: lg · md · sm, покой и загрузка</Heading>
      <div class="flex flex-wrap items-center gap-6">
        <template v-for="s in SIZES" :key="s">
          <Button :size="s" :data-case="`size-${s}-rest`">
            Применить
          </Button>
          <Button :size="s" loading :data-case="`size-${s}-loading`">
            Применить
          </Button>
        </template>
      </div>
      <Heading>Живой пример: нажатие — загрузка 1.5 с</Heading>
      <div class="flex">
        <Button show-icon :loading="busy" data-case="live" @click="press">
          <template #icon>
            <Icon name="save" :size="20" />
          </template>
          Сохранить изменения
        </Button>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ LOADING_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="icon-save">
      <Heading>Icon · save — дискета</Heading>
      <span class="flex items-center gap-4 text-xs">
        <Icon name="save" :size="16" />
        <Icon name="save" :size="20" />
        <Icon name="save" :size="24" />
        <code>save</code>
      </span>
      <span class="text-xs text-muted-foreground">20 — в кнопке «Сохранить изменения»: видимый глиф 20×20, как у макета `Icon/Save` в боксе 24</span>
    </section>

    <section class="flex flex-col gap-4" data-matrix="price-pair">
      <Heading>PricePair — пара цен «клиент / не клиент» с замком (Figma `31649:3835`, `31767:8605`)</Heading>
      <div class="grid grid-cols-[10rem_auto] items-end gap-x-6 gap-y-5 text-xs">
        <span>связано</span>
        <PricePair :client="50000" :non-client="50000" :linked="true" variant="elevated" data-case="pair-linked" />
        <span>развязано</span>
        <PricePair :client="800" :non-client="1000" :linked="false" variant="elevated" data-case="pair-free" />
        <span>пусто, связано</span>
        <PricePair :client="null" :non-client="null" :linked="true" variant="elevated" data-case="pair-empty" />
        <span>выключено (шкала включена)</span>
        <PricePair :client="50000" :non-client="50000" :linked="true" variant="elevated" disabled data-case="pair-disabled" />
        <span>только чтение, развязано</span>
        <PricePair :client="800" :non-client="1000" :linked="false" readonly data-case="pair-readonly" />
        <span>без подписей</span>
        <PricePair :client="700" :non-client="900" :linked="false" :labels="false" data-case="pair-nolabels" />
        <span>поле filled</span>
        <PricePair :client="700" :non-client="700" :linked="true" data-case="pair-filled" />
      </div>
      <Heading>stretch — поля делят строку поровну</Heading>
      <div class="w-160">
        <PricePair :client="45000" :non-client="47000" :linked="false" stretch data-case="pair-stretch" />
      </div>
      <Heading>Живой пример: две пары</Heading>
      <div class="flex flex-wrap items-end gap-8">
        <PricePair v-model:client="pair.client" v-model:non-client="pair.nonClient" v-model:linked="pair.linked" variant="elevated" data-case="pair-live" />
        <PricePair v-model:client="pairFree.client" v-model:non-client="pairFree.nonClient" v-model:linked="pairFree.linked" variant="elevated" data-case="pair-live-free" />
        <code class="text-xs">{{ JSON.stringify(pair) }} · {{ JSON.stringify(pairFree) }}</code>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PAIR_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="regress-scale">
      <Heading>RegressScale — регресс-шкала (Figma `30961:27333`, `30863:3895`)</Heading>
      <Heading>Живой пример: «Единая цена»; «До» последней рождает ступень, удаление — событие remove-step</Heading>
      <Card>
        <RegressScale v-model:steps="steps" v-model:form="form" data-case="scale-live" @remove-step="e => (removed = `удалена ступень ${e.index + 1}, до удаления ступеней ${e.previous.length}`)" />
      </Card>
      <code class="text-xs">{{ form }} · {{ JSON.stringify(steps.map(s => [s.from, s.to, s.price.client, s.price.nonClient, s.price.linked])) }} {{ removed }}</code>
      <Heading>«По ролям»: связанная, развязанная, связанная</Heading>
      <Card>
        <RegressScale v-model:steps="rolesSteps" form="roles" data-case="scale-roles" />
      </Card>
      <Heading>Ошибка «До» меньше «От»</Heading>
      <Card>
        <RegressScale v-model:steps="errorSteps" form="single" data-case="scale-error" />
      </Card>
      <Heading>Единственная ступень — удаления нет</Heading>
      <Card>
        <RegressScale :steps="[{ from: 1, to: null, price: { client: 300, nonClient: 300, linked: true } }]" form="single" data-case="scale-one" />
      </Card>
      <Heading>Выключено и только чтение</Heading>
      <Card class="flex flex-col gap-6">
        <RegressScale :steps="rolesSteps" form="roles" disabled data-case="scale-disabled" />
        <RegressScale :steps="rolesSteps" form="roles" readonly data-case="scale-readonly" />
      </Card>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ SCALE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="input-unit">
      <Heading>Input · unit и numeric — единица и числовой ввод (мастер `input` `720:11753`, `right_icon`; Figma `31767:8594`)</Heading>
      <div class="grid grid-cols-[10rem_10rem_10rem_10rem_10rem] items-start gap-4 text-xs">
        <span>покой</span><span>пусто</span><span>только чтение</span><span>выключено</span><span>ошибка</span>
        <Input model-value="20000" numeric unit="₽" placeholder="" :show-icon="false" data-case="unit-rest" />
        <Input model-value="" numeric unit="₽" placeholder="" :show-icon="false" data-case="unit-empty" />
        <Input model-value="1001" numeric unit="шт" placeholder="" :show-icon="false" readonly data-case="unit-readonly" />
        <Input model-value="20000" numeric unit="₽" placeholder="" :show-icon="false" disabled data-case="unit-disabled" />
        <Input model-value="5" numeric unit="шт" placeholder="" :show-icon="false" invalid error-text="Не меньше 11" data-case="unit-error" />
      </div>
      <Heading>Живой пример: буквы не вводятся, разряды — при показе</Heading>
      <div class="flex items-center gap-4">
        <div class="w-price-input">
          <Input v-model="unitValue" numeric unit="₽" variant="elevated" placeholder="" :show-icon="false" data-case="unit-live" />
        </div>
        <code class="text-xs">«{{ unitValue }}»</code>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ UNIT_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="field-split">
      <Heading>Field · orientation="split" и hintTone, Card · size="sm" (Figma `31767:8590`, `31649:3835`, `31767:8639`)</Heading>
      <div class="grid w-280 grid-cols-2 gap-2">
        <Card tone="muted" size="sm" class="flex flex-col" data-case="tile-min">
          <Field orientation="split" class="flex-1" label="Минимальная сумма списания за один расчётный период" hint="Если итоговая сумма за период оказывается ниже этого порога — выставляется минимальная сумма">
            <div class="w-price-input">
              <Input model-value="20000" numeric unit="₽" variant="elevated" placeholder="" :show-icon="false" />
            </div>
          </Field>
        </Card>
        <Card tone="muted" size="sm" class="flex flex-col" data-case="tile-pair-warning">
          <Field orientation="split" class="flex-1" label="Базовая стоимость схемы осмотра" hint="Не применяется при включённой регресс-шкале. Выключите общую регресс-шкалу для переключения на базовую стоимость" hint-tone="warning">
            <PricePair :client="500" :non-client="700" :linked="false" variant="elevated" disabled />
          </Field>
        </Card>
      </div>
      <div class="flex w-280 flex-col gap-3">
        <Field label="Подсказка тоном предупреждения, раскладка top" hint="Не применяется при включённой регресс-шкале" hint-tone="warning" data-case="hint-warning-top">
          <Input model-value="" placeholder="" :show-icon="false" />
        </Field>
        <Card size="sm" data-case="card-sm-default">
          Card size="sm", tone="default": радиус 8, поля 16
        </Card>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ FIELD_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="price-range">
      <Heading>PriceRange — вилка цен (Figma `30875:127825`, `30875:127816`)</Heading>
      <div class="grid grid-cols-[14rem_auto_auto_auto] items-baseline gap-x-8 gap-y-4 text-xs">
        <span />
        <span>prefixed · md</span>
        <span>dash · md</span>
        <span>dash · sm</span>
        <template v-for="c in RANGE_CASES" :key="c.id">
          <span>{{ c.label }}</span>
          <PriceRange label="Вилка цен" :min="c.min" :max="c.max" :data-case="`range-${c.id}-prefixed`" />
          <PriceRange layout="dash" :min="c.min" :max="c.max" :data-case="`range-${c.id}-dash`" />
          <PriceRange layout="dash" size="sm" :min="c.min" :max="c.max" :data-case="`range-${c.id}-sm`" />
        </template>
      </div>
      <Heading>С подписью и пояснением — строка группы; на тонированной плитке — строка схемы</Heading>
      <div class="flex flex-col gap-3">
        <PriceRange layout="dash" label="Стоимость осмотров группы по умолчанию:" :min="3500" :max="4500" note="наследуется схемами без индивидуальной цены" data-case="range-group" />
        <Card tone="muted" size="sm" class="flex items-center justify-between gap-5">
          <Heading>Осмотр легкового автомобиля</Heading>
          <PriceRange label="Вилка цен" :min="50000" :max="75000" data-case="range-on-tone" />
        </Card>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ RANGE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="badge-outline">
      <Heading>Badge · appearance="outline" — метка-контур (Figma `31175:4820`)</Heading>
      <div class="grid grid-cols-[8rem_auto_auto_auto] items-center justify-start gap-x-6 gap-y-3 text-xs">
        <span />
        <span>контур</span>
        <span>контур на тоне</span>
        <span>залитая md (прежняя)</span>
        <template v-for="v in BADGE_ROLES" :key="v">
          <span>{{ v }}</span>
          <Badge appearance="outline" :variant="v" :data-case="`badge-outline-${v}`">Регресс-шкала</Badge>
          <Card tone="muted" size="sm" class="flex">
            <Badge appearance="outline" :variant="v" :data-case="`badge-outline-tone-${v}`">2 схемы</Badge>
          </Card>
          <Badge :variant="v" :data-case="`badge-filled-${v}`">Регресс-шкала</Badge>
        </template>
      </div>
      <div class="flex w-fit items-center gap-3 rounded-md bg-foreground p-3">
        <Badge appearance="outline" variant="inverse" data-case="badge-outline-inverse">Регресс-шкала</Badge>
        <Badge variant="inverse" data-case="badge-filled-inverse">Регресс-шкала</Badge>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ BADGE_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="radio-panel">
      <Heading>RadioGroupItem · слот panel — тело выбранного режима (Figma `32021:6851`, `32021:6858`)</Heading>
      <div class="w-160">
        <RadioGroup v-model="mode" class="flex flex-col gap-2" data-case="radio-panel-live">
          <RadioGroupItem value="company" variant="card" :checked="mode === 'company'">
            Базовая цена компании
            <template #description>
              Наследует цену компании: <PriceRange size="sm" layout="dash" :min="500" :max="700" />
            </template>
          </RadioGroupItem>
          <RadioGroupItem value="fixed" variant="card" :checked="mode === 'fixed'">
            Фиксированная цена группы
            <template #description>
              Фиксированная цена только для этой группы
            </template>
            <template #panel>
              <PricePair v-model:client="modePrice.client" v-model:non-client="modePrice.nonClient" v-model:linked="modePrice.linked" stretch />
            </template>
          </RadioGroupItem>
          <RadioGroupItem value="scale" variant="card" :checked="mode === 'scale'">
            Регресс-шкала группы
            <template #description>
              Цена снижается при росте объёма осмотров
            </template>
            <template #panel>
              <RegressScale v-model:steps="modeSteps" v-model:form="modeForm" label="" />
            </template>
          </RadioGroupItem>
        </RadioGroup>
      </div>
      <Heading>Без слота panel — карточка прежняя</Heading>
      <div class="w-160">
        <RadioGroup model-value="a" class="flex flex-col gap-2" data-case="radio-card-plain">
          <RadioGroupItem value="a" variant="card" checked>
            Сквозной учет
            <template #description>
              Любой выполненный осмотр увеличивает счётчик во всех активных шкалах компании
            </template>
          </RadioGroupItem>
        </RadioGroup>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PANEL_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="card-dimmed">
      <Heading>Card · dimmed — устаревшая схема приглушена (§11; макета нет)</Heading>
      <div class="flex w-200 flex-col gap-1">
        <Card tone="muted" size="sm" class="flex items-center gap-5" data-case="card-muted">
          <Heading class="flex-1">Осмотр транспортного средства</Heading>
          <PriceRange label="Вилка цен" :min="900" :max="1100" />
        </Card>
        <Card tone="muted" size="sm" dimmed class="flex items-center gap-5" data-case="card-muted-dimmed">
          <Heading class="flex-1">Осмотр прицепа</Heading>
          <Badge appearance="outline" variant="neutral">Устаревшая</Badge>
          <PriceRange label="Вилка цен" :min="900" :max="1100" />
        </Card>
        <Card size="sm" dimmed data-case="card-default-dimmed">
          <span>Card size="sm", tone="default", dimmed: рамка и подложка прежние, содержимое на 0.48</span>
        </Card>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ DIMMED_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="icon-button-destructive">
      <Heading>IconButton · destructive — удаление строки (`btn_delete` `21816:77497`)</Heading>
      <div class="flex items-center gap-6 text-xs">
        <IconButton variant="destructive" size="sm" label="Удалить ступень" data-case="destructive-sm">
          <Icon name="delete" :size="16" />
        </IconButton>
        <IconButton variant="destructive" size="md" label="Удалить" data-case="destructive-md">
          <Icon name="delete" :size="16" />
        </IconButton>
        <IconButton variant="destructive" size="lg" label="Удалить" data-case="destructive-lg">
          <Icon name="delete" :size="20" />
        </IconButton>
        <IconButton variant="destructive" size="sm" disabled label="Удалить" data-case="destructive-disabled">
          <Icon name="delete" :size="16" />
        </IconButton>
        <span>sm · md · lg · выключено; наведение — `--destructive-surface`</span>
      </div>
    </section>

    <section class="flex flex-col gap-4" data-matrix="period-switcher">
      <Heading>PeriodSwitcher — переключатель тарифного периода (Figma `30957:7855`, `31089:12090`)</Heading>
      <div class="grid grid-cols-[10rem_auto] items-center justify-start gap-x-6 gap-y-3 text-xs">
        <template v-for="p in PERIODS" :key="p.id">
          <span>{{ p.status }}</span>
          <div class="flex">
            <PeriodSwitcher :model-value="p.id" :periods="PERIODS" :data-case="`period-${p.status}`" />
          </div>
        </template>
        <span>живой</span>
        <div class="flex items-center gap-4">
          <PeriodSwitcher v-model="livePeriod" :periods="PERIODS" data-case="period-live" @plan="planned++" />
          <span>выбран {{ livePeriod }}; «Запланировать» — {{ planned }}</span>
        </div>
      </div>
      <Heading>Список периодов и пункт с меткой — PeriodSwitcherItem</Heading>
      <div class="flex items-start gap-8">
        <SelectContent :width="280" max-height="none" data-case="period-list">
          <SelectGroup>
            <PeriodSwitcherItem :period="PERIODS[1]!" selected />
            <PeriodSwitcherItem :period="PERIODS[2]!" />
            <PeriodSwitcherItem :period="PERIODS[3]!" />
          </SelectGroup>
          <SelectGroup>
            <PeriodSwitcherItem :period="PERIODS[0]!" />
          </SelectGroup>
        </SelectContent>
        <SelectContent :width="432" max-height="none" data-case="period-item-badge">
          <PeriodSwitcherItem :period="PERIODS[1]!">
            <template #badge>
              <Badge appearance="outline">Изменяется</Badge>
            </template>
          </PeriodSwitcherItem>
          <PeriodSwitcherItem :period="PERIODS[2]!">
            <template #badge>
              <Badge appearance="outline" variant="neutral">Затронет</Badge>
            </template>
          </PeriodSwitcherItem>
        </SelectContent>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PERIOD_EXAMPLE }}</pre>
    </section>
  </main>
</template>
