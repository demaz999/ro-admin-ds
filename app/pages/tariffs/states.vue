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
  </main>
</template>
