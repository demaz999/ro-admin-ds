<script setup lang="ts">
import { ref } from 'vue'

useHead({ title: 'Витрина — админский дизайн-кит' })

/**
 * Переключатель тем. Три темы на одном наборе ролей: имена переменных везде одни
 * и те же, отличаются только значения — см. docs/themes.md.
 *
 * `atom` неполна намеренно: в неё попадает только то, что показал мастер
 * очередного перенесённого компонента. Остальные роли наследуются от rososmotr,
 * поэтому переключение выглядит как частичная подмена, а не как второй бренд.
 */
const themes = [
  { value: 'rososmotr', label: 'rososmotr', note: 'рабочая тема, приёмка идёт в ней' },
  { value: 'atom', label: 'atom', note: 'сверочная: родные цвета и гарнитура эталона' },
  { value: 'viewapp', label: 'viewapp', note: 'каркас, значений пока нет' },
] as const

const theme = ref<typeof themes[number]['value']>('rososmotr')

/** Строки для Select и Autocomplete — оба на одном примитиве Combobox. */
const options = [
  { value: 'one', label: 'Первый' },
  { value: 'two', label: 'Второй', subtitle: 'Подпись строки' },
  { value: 'three', label: 'Третий' },
  { value: 'four', label: 'Четвёртый', disabled: true },
  { value: 'five', label: 'Пятый' },
  { value: 'six', label: 'Шестой' },
]

/** Состояния Input, сведённые к осям мастера Атома 249:2768. */
const inputRows = [
  { label: 'filled · 40 · пусто', variant: 'filled', size: 'md', value: '' },
  { label: 'filled · 40 · заполнено', variant: 'filled', size: 'md', value: 'Input text' },
  { label: 'filled · 40 · disabled', variant: 'filled', size: 'md', value: 'Input text', disabled: true },
  { label: 'elevated · 40 · пусто', variant: 'elevated', size: 'md', value: '' },
  { label: 'elevated · 40 · заполнено', variant: 'elevated', size: 'md', value: 'Input text' },
  { label: 'elevated · 40 · disabled', variant: 'elevated', size: 'md', value: 'Input text', disabled: true },
  { label: 'filled · 64 · пусто', variant: 'filled', size: 'lg', value: '' },
  { label: 'filled · 64 · заполнено', variant: 'filled', size: 'lg', value: 'Input text' },
  { label: 'elevated · 64 · пусто', variant: 'elevated', size: 'lg', value: '' },
  { label: 'elevated · 64 · заполнено', variant: 'elevated', size: 'lg', value: 'Input text' },
] as const

/**
 * Восемь текстовых стилей кита. Имена слева — как в Figma; каждый стиль
 * достижим парой «кегль + начертание», отдельных утилит не заводим.
 */
const kitTextStyles = [
  { token: 'Header/bold36-40', classes: 'text-4xl font-bold', note: 'H1' },
  { token: 'Header/bold24-28', classes: 'text-2xl font-bold', note: 'H2' },
  { token: 'Header/bold20-24', classes: 'text-xl font-bold', note: 'title' },
  { token: 'Txt/bold17-24', classes: 'text-lg font-bold', note: '' },
  { token: 'Txt/bold15-20', classes: 'text-sm font-bold', note: '' },
  { token: 'Txt/medium15-20', classes: 'text-sm font-medium', note: '' },
  { token: 'Txt/regular15-20', classes: 'text-sm font-normal', note: '' },
  { token: 'Txt/bold13-16', classes: 'text-xs font-bold', note: '' },
  { token: 'Txt/regular13-16', classes: 'text-xs font-normal', note: '' },
  { token: 'Txt/bold12-16', classes: 'text-2xs font-bold', note: '' },
  { token: 'Txt/regular12-16', classes: 'text-2xs font-normal', note: '' },
]

/** Ult — это Ultra Black, самый жирный, а не UltraLight: сказано в Changelog поставки. */
const martianWeights = [
  { value: 100, name: 'Thin' },
  { value: 200, name: 'ExtraLight' },
  { value: 300, name: 'Light' },
  { value: 400, name: 'Regular' },
  { value: 500, name: 'Medium' },
  { value: 700, name: 'Bold' },
  { value: 800, name: 'ExtraBold' },
  { value: 900, name: 'Black' },
  { value: 1000, name: 'Ultra Black' },
]

/**
 * Очередь 2. Чипы живые: крестик действительно убирает фильтр, потому что иначе
 * не видно, что компонент интерактивный, — этим он и отличается от `Tag`.
 */
const chips = ref([
  { id: 'region', label: 'Московская область', count: '' },
  { id: 'type', label: 'Плановый', count: 8 },
  { id: 'status', label: 'Черновик', count: 2 },
])

const activeChips = ref<string[]>(['type'])

function toggleChip(id: string) {
  const i = activeChips.value.indexOf(id)
  if (i === -1) activeChips.value.push(id)
  else activeChips.value.splice(i, 1)
}

function removeChip(id: string) {
  chips.value = chips.value.filter(c => c.id !== id)
}

function restoreChips() {
  chips.value = [
    { id: 'region', label: 'Московская область', count: '' },
    { id: 'type', label: 'Плановый', count: 8 },
    { id: 'status', label: 'Черновик', count: 2 },
  ]
}

const sliderValue = ref([40])
const sliderRange = ref([20, 70])

/** Очередь 3: состояния демонстраций — окно, лайтбокс, стек уведомлений, шаги. */
const dialogOpen = ref(false)
const dialogScrollOpen = ref(false)
const lightboxOpen = ref(false)
const lightboxIndex = ref(1)
const step = ref(2)

/** Уведомления живут списком: стек — это как раз то, чего у Атома нет. */
const toasts = ref<{ id: number, text: string }[]>([])
let toastId = 0

function pushToast() {
  toastId += 1
  toasts.value.push({ id: toastId, text: `Осмотр № ${1200 + toastId} сохранён` })
}

function dropToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

/** Буквенные метки статуса в ячейке: буква и цвет приходят из данных, не из вёрстки. */
const letterRows = [
  { letter: 'П', color: 'violet', title: 'Плановый', name: 'Осмотр № 1201' },
  { letter: 'В', color: 'orange', title: 'Внеплановый', name: 'Осмотр № 1202' },
  { letter: 'З', color: 'green', title: 'Завершён', name: 'Осмотр № 1203' },
] as const

const martianWidths = [
  { value: 75, name: 'Condensed' },
  { value: 87.5, name: 'Narrow' },
  { value: 100, name: 'Standard' },
  { value: 112.5, name: 'SemiWide' },
  { value: 125, name: 'Wide' },
  { value: 150, name: 'ExtraWide' },
  { value: 200, name: 'UltraWide' },
]
</script>

<template>
  <main :data-theme="theme" class="mx-auto max-w-5xl space-y-12 bg-background px-6 py-10 font-sans text-foreground">
    <header class="space-y-3">
      <p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        кит 2 · перенос Атома
      </p>
      <h1 class="text-4xl font-bold">
        Витрина админского дизайн-кита
      </h1>
      <p class="max-w-2xl text-muted-foreground">
        Токены читаются прямо из таблиц стилей документа, поэтому витрина не может разойтись с
        файлом токенов.
      </p>
      <p class="max-w-2xl rounded-md border border-border bg-secondary p-3 text-sm">
        <strong>Тема кита применена.</strong> Все 78 переменных — 69 <code>mode</code> и
        9 <code>menu</code> — перенесены; мапинг с provenance в <code>docs/tokens.md</code>,
        раздел 7. Состояния идут из токенов-расширений, не через прозрачность.
      </p>
      <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
        <strong>Основа переносится заново из дизайн-системы Атом</strong> — решение от
        2026-08-12. Компоненты волны 0, собранные по составам кита 1, отложены в
        <code>archive/kit1-components</code> до фазы обогащения. Разбивка по волнам —
        <code>docs/atom-audit.md</code>, наложение на эталоны — <code>/compare</code>.
      </p>

      <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
        <strong>Собрана пилотная страница:</strong>
        <a href="/my-inspections" class="underline underline-offset-4">«Мои осмотры»</a> —
        только из компонентов реестра, ноль новых сущностей. Наложение на макет и таблица
        расхождений по категориям — на <code>/compare</code> и в
        <code>docs/page-my-inspections.md</code>.
      </p>

      <div class="flex flex-wrap items-center gap-3 pt-2">
        <span class="text-sm font-medium">Тема:</span>
        <div class="flex gap-1">
          <button
            v-for="t in themes"
            :key="t.value"
            type="button"
            :title="t.note"
            class="rounded-xs px-3 py-1.5 text-sm"
            :class="theme === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            @click="theme = t.value"
          >
            {{ t.label }}
          </button>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ themes.find(t => t.value === theme)?.note }}
        </span>
      </div>
    </header>

    <ShowcaseSection
      title="Палитра"
      note="Все цветовые токены темы. Свотч залит через var(), то есть показывает ровно то, что применится в компонентах."
    >
      <ShowcaseTokens kind="color" />
    </ShowcaseSection>

    <ShowcaseSection
      title="Радиусы"
      note="Значения --radius-* и производные от них."
    >
      <ShowcaseTokens prefix="--radius" />
    </ShowcaseSection>

    <ShowcaseSection
      title="Типографика"
      note="Семейства шрифтов темы."
    >
      <ShowcaseTokens kind="font" />

      <div class="mt-6 space-y-4">
        <p class="text-sm text-muted-foreground">
          Все одиннадцать текстовых стилей документа кита. Каждый подписан именем токена в
          Figma. Других кеглей в шкале нет: дефолты Tailwind погашены целиком, поэтому взять
          размер «из фреймворка» уже нельзя.
        </p>

        <div
          v-for="s in kitTextStyles"
          :key="s.token"
          class="flex flex-wrap items-baseline gap-x-4 border-t border-border pt-3"
        >
          <code class="w-48 shrink-0 text-xs text-muted-foreground">{{ s.token }}</code>
          <code class="w-40 shrink-0 text-xs text-muted-foreground">{{ s.classes }}</code>
          <span class="w-10 shrink-0 text-xs text-muted-foreground">{{ s.note }}</span>
          <p :class="s.classes">
            Съешь ещё этих мягких булок
          </p>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Martian Grotesk — дополнительная гарнитура"
      note="Не шрифт кита. Компоненты кита живут только на PT Root UI; эта гарнитура берётся точечно и по явному указанию."
    >
      <div class="space-y-6">
        <p class="max-w-2xl text-sm text-muted-foreground">
          63 начертания: 9 весов (100–1000, шестисотого нет) × 7 ширин (75–200%). Зарегистрированы
          одним семейством, поэтому работают ключевые слова
          <code>font-stretch: condensed</code>. Браузер грузит только применённое начертание.
        </p>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Веса
          </h3>
          <div class="space-y-1 font-display text-lg">
            <p v-for="w in martianWeights" :key="w.value" :style="{ fontWeight: w.value }">
              {{ w.value }} — {{ w.name }} · съешь ещё этих булок
            </p>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Ширины
          </h3>
          <div class="space-y-1 font-display text-lg">
            <p v-for="s in martianWidths" :key="s.value" :style="{ fontStretch: `${s.value}%` }">
              {{ s.value }}% — {{ s.name }} · Мои осмотры
            </p>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Выбор и переключение · волна 3"
      note="Три мастера Атома построены одинаково: контрол в строке высотой 20, зазор 12, заголовок с подписью. Заголовок темнеет, когда контрол включён; выключенное гасит весь узел прозрачностью 0.48 — как у полей, а не как у кнопок."
    >
      <div class="space-y-6">
        <div class="grid gap-6 sm:grid-cols-2">
          <ShowcaseCell label="Checkbox">
            <Checkbox subtitle="Подпись строки">
              Флажок
            </Checkbox>
          </ShowcaseCell>
          <ShowcaseCell label="Checkbox · отмечен">
            <Checkbox :model-value="true" subtitle="Подпись строки">
              Отмечен
            </Checkbox>
          </ShowcaseCell>
          <ShowcaseCell label="Checkbox · частичный" hint="ось Partial мастера">
            <Checkbox indeterminate>
              Частичный
            </Checkbox>
          </ShowcaseCell>
          <ShowcaseCell label="Checkbox · disabled">
            <Checkbox :model-value="true" disabled>
              Недоступен
            </Checkbox>
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Tabs · мастера 1782:13075 и 1772:11731
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Два несводимых вида: подчёркивание с зазором 20 и таблетка с зазором 0. Линия идёт по
            ширине текста, а не вкладки. У Атома есть <strong>hover и disabled</strong>, которых
            в ките 1 не было вовсе.
          </p>
          <div class="flex flex-col gap-8">
            <Tabs model-value="all">
              <TabsList>
                <TabsTrigger value="all">
                  Все
                </TabsTrigger>
                <TabsTrigger value="mine">
                  Мои
                </TabsTrigger>
                <TabsTrigger value="archive" disabled>
                  Архив
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" class="pt-4 text-sm text-muted-foreground">
                Все осмотры.
              </TabsContent>
              <TabsContent value="mine" class="pt-4 text-sm text-muted-foreground">
                Осмотры текущего пользователя.
              </TabsContent>
            </Tabs>

            <Tabs model-value="list">
              <TabsList variant="pill">
                <TabsTrigger value="list" variant="pill">
                  Списком
                </TabsTrigger>
                <TabsTrigger value="cards" variant="pill">
                  Карточками
                </TabsTrigger>
                <TabsTrigger value="map" variant="pill" disabled>
                  На карте
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div class="grid gap-6 sm:grid-cols-2">
          <ShowcaseCell label="RadioGroup">
            <RadioGroup model-value="a">
              <RadioGroupItem value="a" checked subtitle="Подпись строки">
                Первый
              </RadioGroupItem>
              <RadioGroupItem value="b">
                Второй
              </RadioGroupItem>
              <RadioGroupItem value="c" disabled>
                Недоступен
              </RadioGroupItem>
            </RadioGroup>
          </ShowcaseCell>

          <ShowcaseCell label="Switch">
            <div class="flex flex-col gap-3">
              <Switch subtitle="Подпись строки">
                Выключен
              </Switch>
              <Switch :model-value="true">
                Включён
              </Switch>
              <Switch :model-value="true" disabled>
                Недоступен
              </Switch>
            </div>
          </ShowcaseCell>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Button · волна 2"
      note="Мастер Атома 57:340, 118 вариантов. В код перенесены 24: цветовая ось не переносится, источником взята брендовая синяя колонка. Rounded отдельной осью не идёт — она связана с размером."
    >
      <div class="space-y-6">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Размеры и типы
          </h3>
          <div class="flex flex-wrap items-center gap-4">
            <Button size="lg" show-icon>
              Большая
            </Button>
            <Button show-icon>
              Средняя
            </Button>
            <Button size="sm">
              Малая
            </Button>
            <Button variant="secondary" show-icon>
              Тональная
            </Button>
            <Button variant="secondary" size="sm">
              Тональная малая
            </Button>
          </div>
        </div>

        <div class="grid gap-6 sm:grid-cols-2">
          <ShowcaseCell label="hover" hint="наведите — переход 0.1 сек">
            <Button>Найти</Button>
          </ShowcaseCell>
          <ShowcaseCell label="pressed" hint="зажмите — переход мгновенный">
            <Button>Найти</Button>
          </ShowcaseCell>
          <ShowcaseCell label="disabled · залитая" hint="прозрачность 0.32">
            <Button disabled>
              Найти
            </Button>
          </ShowcaseCell>
          <ShowcaseCell label="disabled · тональная" hint="прозрачность 0.48">
            <Button variant="secondary" disabled>
              Найти
            </Button>
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Ширина
          </h3>
          <div class="max-w-sm space-y-3">
            <Button wide show-icon>
              Во всю ширину
            </Button>
            <Button variant="secondary" wide>
              И тональная
            </Button>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            destructive · из колонки fargo
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Исключение из решения по цветовой оси: исключалась ось выбора цвета, а не семантика.
            Покой снят с мастера, наведение и нажатие выведены по механике брендовой колонки —
            светлота ±10/255. <code>ghost</code> у текстовой кнопки не заводится: такого типа
            в мастере нет.
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <Button variant="destructive">
              Удалить
            </Button>
            <Button variant="destructive" size="sm">
              Удалить
            </Button>
            <Button variant="destructive" disabled>
              Удалить
            </Button>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            ButtonArrow и ButtonNavigation · мастера 1938:12858 и 612:5443
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Стрелка — единственный мастер волны без цветовой оси, перенесена целиком.
            Навигационная надпись перенесена <strong>тремя размерами из семи</strong>: кегли
            остальных — 28, 32, 40 и 56, таких ступеней в нашей шкале нет вовсе, а округлять
            нельзя — три разных размера стали бы одним. Вопрос 30.
          </p>
          <div class="flex flex-wrap items-center gap-6">
            <ButtonArrow size="lg" label="Назад" />
            <ButtonArrow label="Назад" />
            <ButtonArrow size="sm" label="Назад" />
            <ButtonArrow variant="ghost" size="lg" direction="right" label="Вперёд" />
            <ButtonArrow disabled label="Назад" />
          </div>
          <div class="mt-4 flex flex-wrap items-baseline gap-8">
            <ButtonNavigation size="lg">
              В соседний раздел
            </ButtonNavigation>
            <ButtonNavigation>
              В соседний раздел
            </ButtonNavigation>
            <ButtonNavigation size="sm" muted>
              Приглушённая
            </ButtonNavigation>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Tag и Link · мастера 256:3601 и 5792:97292
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Тег снять нельзя и он ничего не считает — крестика и счётчика в мастере нет, поэтому
            это не чип. У ссылки цветовая ось красит <strong>подчёркивание</strong>, а не текст:
            во всех восьми колонках текст один и тот же. Подчёркивание — отдельный слой 2px,
            а не <code>text-decoration</code>.
          </p>
          <div class="flex flex-wrap items-center gap-6">
            <Tag active>
              Активный
            </Tag>
            <Tag>Обычный</Tag>
            <Tag :show-marker="false">
              Без точки
            </Tag>
            <Tag disabled>
              Выключен
            </Tag>
            <Hyperlink href="https://design.rusatom.dev">
              Ссылка
            </Hyperlink>
            <Hyperlink size="sm">
              Малая ссылка
            </Hyperlink>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            ButtonAction · мастер 6626:56755 · ниша ghost
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Текст с иконкой без заливки, радиуса и паддингов — высотой в строку. Описание мастера
            называет место применения: поповеры и модальные окна. Именно этот компонент занимает
            нишу <code>ghost</code>, поэтому у <code>Button</code> такого варианта нет.
          </p>
          <div class="flex flex-wrap items-center gap-6">
            <ButtonAction>Назад</ButtonAction>
            <ButtonAction size="sm">
              Назад
            </ButtonAction>
            <ButtonAction variant="destructive">
              Удалить
            </ButtonAction>
            <ButtonAction disabled>
              Назад
            </ButtonAction>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            InputNumber · мастер 803:9446
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Собран из иконочных кнопок типа <code>transparent</code>, поэтому и ждал их переноса.
            Плашка не залита — только контур 2px с радиусом 6. Ось <code>State</code> мастера
            это не оформление, а значение: при нуле кнопка уменьшения приглушена.
          </p>
          <div class="flex flex-wrap items-center gap-8">
            <InputNumber />
            <InputNumber :model-value="3" />
            <InputNumber :model-value="3" disabled />
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            IconButton · мастер ButtonSimple 110:1566
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Отдельный компонент, а не кнопка без подписи: текстового пропа у мастера нет.
            Боксы 40, 32, 24; глиф 20 у большого и 16 у остальных. У иконочной
            <code>ghost</code> законен — он есть в мастере отдельным типом
            <code>transparent</code>.
          </p>
          <div class="flex flex-wrap items-center gap-4">
            <IconButton size="lg" label="Метка" />
            <IconButton label="Метка" />
            <IconButton size="sm" label="Метка" />
            <IconButton variant="secondary" size="lg" label="Метка" />
            <IconButton variant="ghost" size="lg" label="Метка" />
            <IconButton variant="elevated" size="lg" label="Метка" />
            <IconButton size="lg" rounded label="Метка" />
            <IconButton size="lg" disabled label="Метка" />
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Input · волна 1"
      note="Мастер Атома 249:2768, 16 вариантов. Поле — залитая поверхность без рамки: обводки нет ни в одном из шестнадцати. Заполненное состояние перестраивает разметку — плейсхолдер уезжает наверх подписью 13/16, под ним появляется значение."
    >
      <div class="space-y-6">
        <div class="grid gap-6 sm:grid-cols-2">
          <ShowcaseCell v-for="r in inputRows" :key="r.label" :label="r.label">
            <Input
              :variant="r.variant"
              :size="r.size"
              :model-value="r.value"
              :disabled="r.disabled ?? false"
            />
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Кнопка очистки
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Булев проп мастера <code>Show ClearButton</code>, по умолчанию выключен — поэтому в
            экспорте эталона его нет ни в одном варианте и наложением он не проверяется.
            Появляется только в заполненном поле, как и в мастере.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="filled · с очисткой">
              <Input model-value="Input text" clearable />
            </ShowcaseCell>
            <ShowcaseCell label="elevated · с очисткой">
              <Input variant="elevated" model-value="Input text" clearable />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Состояния · спека 237:2820
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            В мастере состояний нет — они живут на странице спецификации того же файла. Наведение
            уплотняет заливку с 32% до 48%, фокус дополнительно поднимает плейсхолдер наверх
            подписью. У поля поверх карты меняется не заливка, а тень.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="Hover" hint="наведите курсор">
              <Input />
            </ShowcaseCell>
            <ShowcaseCell label="Pressed/Active" hint="поставьте каретку">
              <Input />
            </ShowcaseCell>
            <ShowcaseCell label="ErrorDefault">
              <Input invalid error-text="text about error here" />
            </ShowcaseCell>
            <ShowcaseCell label="ErrorFilled">
              <Input invalid model-value="Input text" error-text="text about error here" />
            </ShowcaseCell>
            <ShowcaseCell label="Error · elevated">
              <Input invalid variant="elevated" error-text="text about error here" />
            </ShowcaseCell>
            <ShowcaseCell label="Error · disabled">
              <Input invalid disabled model-value="Input text" />
            </ShowcaseCell>
          </div>
        </div>

        <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
          <strong>Чего у Атома нет вовсе:</strong> внешней подписи над полем, строки подсказки и
          счётчика символов — ни в мастере, ни в спеке. Это дизайн-долг с источником «архив кита 1»,
          закрывается в фазе обогащения первым приоритетом.
          См. <code>docs/design-debt.md</code>.
        </p>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Textarea · мастер 282:4688
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Та же лестница состояний, что у поля ввода — спека формулирует её прямым текстом:
            «bg django, opacity +16». Коробка 272×140, высота фиксированная: оси размера в мастере
            нет и ручки растягивания не нарисовано. Скроллбар свой, 4px с радиусом 2.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="пусто">
              <Textarea />
            </ShowcaseCell>
            <ShowcaseCell label="заполнено">
              <Textarea model-value="Input text" />
            </ShowcaseCell>
            <ShowcaseCell label="disabled">
              <Textarea model-value="Input text" disabled />
            </ShowcaseCell>
            <ShowcaseCell label="error">
              <Textarea invalid error-text="text about error here" />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Select · триггер · мастер 434:3074
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            У Атома селект — то же поле ввода плюс шеврон, вплоть до паддингов. Ось
            <code>Active</code> меняет только направление шеврона: заливка при нажатии
            остаётся заливкой покоя, в отличие от <code>Input</code>.
            Выпадающая часть — отдельный мастер <code>571:4889</code>, ещё не перенесён,
            поэтому открытость здесь приходит пропом.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="с поиском" hint="нажмите — поиск включён, как в мастере">
              <Select :items="options" />
            </ShowcaseCell>
            <ShowcaseCell label="без поиска" hint="searchable=false">
              <Select :items="options" :searchable="false" />
            </ShowcaseCell>
            <ShowcaseCell label="выбрано">
              <Select :items="options" model-value="two" />
            </ShowcaseCell>
            <ShowcaseCell label="disabled">
              <Select :items="options" model-value="two" disabled />
            </ShowcaseCell>
            <ShowcaseCell label="elevated">
              <Select :items="options" variant="elevated" />
            </ShowcaseCell>
            <ShowcaseCell label="триггер отдельно" hint="презентационный, для наложения">
              <SelectTrigger open label="Option" />
            </ShowcaseCell>
            <ShowcaseCell label="большой · 64" hint="«Другие селекты»: радиус 32">
              <SelectTrigger size="lg" :show-icon="false" />
            </ShowcaseCell>
            <ShowcaseCell label="большой · заполнен">
              <SelectTrigger size="lg" :show-icon="false" label="Option" />
            </ShowcaseCell>
          </div>

          <p class="mt-4 mb-3 max-w-2xl text-sm text-muted-foreground">
            Иконка слева — слот со свопом, как у поля ввода: в мастере это
            <code>link</code>, но глиф подменяется. Ниже — список с иконками строк по
            держателю <code>_IconListItem</code> 16×20.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="триггер с иконкой">
              <SelectTrigger label="Option" />
            </ShowcaseCell>
            <ShowcaseCell label="триггер без иконки">
              <SelectTrigger :show-icon="false" label="Option" />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Выпадающая плашка · PopOverList 571:4889
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            320×304, радиус 12, тень 0/8/32, рамки нет. Паддинг <code>4 / 0 / 4 / 4</code> —
            справа ноль, там скроллбар шириной 4. Поиск внутри плашки у Атома встроенный и
            включён по умолчанию, а не пустой слот. Строка: 44 в одну строку, 52 с подписью,
            заливки в покое нет — она появляется под курсором.
          </p>
          <SelectContent>
            <template #search>
              <Input placeholder="Search" :style="{ width: '312px' }" />
            </template>
            <SelectGroup header="С иконками">
              <SelectItem show-icon>
                Ссылка
              </SelectItem>
              <SelectItem show-icon subtitle="Подпись строки">
                <template #icon>
                  <Icon name="search" :size="16" />
                </template>
                Поиск
              </SelectItem>
              <!--
                Крестик в строке списка идёт с оптической поправкой 0.75:
                сплошной диагональный X при полном боксе тяжелее соседей.
                Крестик очистки в поле поправку НЕ получает — там 8×8 из мастера.
              -->
              <SelectItem show-icon selected>
                <template #icon>
                  <Icon name="close" :size="16" :scale="0.75" />
                </template>
                Выбранная
              </SelectItem>
              <SelectItem show-icon disabled>
                Недоступная
              </SelectItem>
            </SelectGroup>
            <SelectGroup header="Без иконок">
              <SelectItem subtitle="Подпись строки">
                Ещё один
              </SelectItem>
              <SelectItem>И ещё</SelectItem>
            </SelectGroup>
          </SelectContent>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Autocomplete · мастер 3874:36379
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Тот же примитив <code>Combobox</code>, что и у селекта, — различается поведение,
            а не вид. Здесь пользователь вводит текст сам, и введённое может не совпасть ни с
            одной строкой. Поиска внутри плашки нет: полем поиска работает само поле.
            Геометрия совпадает с <code>Input</code>, крестик очистки в мастере нарисован во
            всех заполненных вариантах.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="пусто" hint="наберите текст">
              <Autocomplete :items="options" />
            </ShowcaseCell>
            <ShowcaseCell label="заполнено">
              <Autocomplete :items="options" model-value="Первый" />
            </ShowcaseCell>
            <ShowcaseCell label="elevated">
              <Autocomplete :items="options" variant="elevated" />
            </ShowcaseCell>
            <ShowcaseCell label="disabled">
              <Autocomplete :items="options" model-value="Первый" disabled />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Popover · мастер 405:3786
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            В мастере это пустой контейнер: 320 шириной, радиус 12, фон белый, тень 0/8/32,
            паддинга и рамки нет. Начинку кладёт тот, кто применяет. Плашка светлая даже
            когда вылетает из тёмного меню.
          </p>
          <Popover>
            <div class="p-4 text-sm text-foreground">
              Содержимое плашки. Паддинг задаёт содержимое, а не сам компонент —
              в мастере паддинга нет.
            </div>
          </Popover>
        </div>

        <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
          <strong>Между полями формы — минимум 24px по вертикали.</strong> Правило размётки, снятое
          со спеки: два соседних поля стоят с зазором 24, метка «min 24px» стоит ровно в этом
          промежутке. Это правило раскладки, а не проп компонента.
        </p>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Обогащение · очередь 1"
      note="Этап 2. Атомовское ядро остаётся ядром, наши расширения из архива кита 1 надстраиваются над ним по одному. Это то, без чего «Мои осмотры» не собираются."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Field · мастер кита 1 720:11753
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            У Атома <strong>нет ни подписи, ни подсказки, ни счётчика</strong> — ни в мастере,
            ни в спеке. Их вообще нет как сущностей, это показала разведка этапа 0. Обвязка даёт
            их <strong>любому</strong> контролу и ничего не знает о том, что внутри: поле,
            селект, пикер даты или времени.
          </p>
          <div class="grid max-w-3xl gap-6 sm:grid-cols-2">
            <ShowcaseCell label="подпись сверху" hint="зазор 8, подсказка через 4">
              <Field label="Наименование" hint="До 25 символов" counter="10/25" class="w-full">
                <Input placeholder="Введите наименование" />
              </Field>
            </ShowcaseCell>
            <ShowcaseCell label="подпись слева" hint="по центру высоты поля, не блока">
              <Field label="Дата" orientation="left" hint="Формат ДД.ММ.ГГГГ" class="w-full">
                <DatePicker />
              </Field>
            </ShowcaseCell>
            <ShowcaseCell label="ошибка" hint="краснеют подсказка и счётчик">
              <Field label="Наименование" hint="Поле обязательно" counter="0/25" invalid class="w-full">
                <Input placeholder="Введите наименование" invalid />
              </Field>
            </ShowcaseCell>
            <ShowcaseCell label="выключено" hint="гаснут подпись и строка подсказки">
              <Field label="Наименование" hint="До 25 символов" counter="10/25" disabled class="w-full">
                <Input placeholder="Введите наименование" disabled />
              </Field>
            </ShowcaseCell>
            <ShowcaseCell label="над селектом" hint="обвязка не знает, что внутри">
              <Field label="Тип осмотра" hint="Выберите из справочника" class="w-full">
                <Select />
              </Field>
            </ShowcaseCell>
            <ShowcaseCell label="без подсказки" hint="строка не рисуется вовсе">
              <Field label="Комментарий" class="w-full">
                <Input placeholder="Необязательно" />
              </Field>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            StatusBadge · компонент `status` кита 1
          </h3>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Цвета иллюстративные.</strong> Раскладка повторяет текущие макеты, чтобы
            прототипы рендерились цветными. В продукте статусные цвета приходят
            <strong>с сервера вместе с данными</strong> — при интеграции здесь будет мапинг из
            данных, а не выбор цвета руками. Поэтому цвет вынесен отдельным пропом, а не значением
            <code>variant</code>: <code>variant</code> означал бы, что вид выбирает автор
            страницы.
          </p>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Значения сидят на расширенной палитре, а не на семантических ролях: статусов в
            продукте больше шести, они заводятся в справочнике, и семантики
            <code>success</code> / <code>warning</code> за ними нет. Это тот самый случай
            «различение, а не сообщение».
          </p>
          <ShowcaseCell label="цвета" hint="точка 8×8, радиус 2, кегль 15/20">
            <StatusBadge color="green">
              Завершён
            </StatusBadge>
            <StatusBadge color="cyan">
              На проверке
            </StatusBadge>
            <StatusBadge color="violet">
              Запланирован
            </StatusBadge>
            <StatusBadge color="magenta">
              Отложен
            </StatusBadge>
            <StatusBadge color="orange">
              Требует внимания
            </StatusBadge>
            <StatusBadge color="red">
              Отменён
            </StatusBadge>
          </ShowcaseCell>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Обогащение · очередь 2"
      note="Чип, слайдер и буквенная метка статуса. Два источника из трёх оказались живыми мастерами кита 1 — реконструировать по справочнику не потребовалось."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Chip · мастер кита 1 747:2464 + ось <code>active</code> из ButtonTag Атома
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            <strong>Чип — не тег и не бейдж.</strong> Его можно снять крестиком, и он умеет
            считать: высота 32 против 24 у обоих соседей. У Атома такой сущности нет —
            <code>ButtonTag</code> нельзя снять и он ничего не считает. Оттуда взяты только ось
            <code>active</code> и маркер-точка: фильтр без включённого состояния не работает.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Счётчик не переиспользует <code>Indicator</code>.</strong> Плашка похожа —
            те же 16 высоты и паддинг 4, — но типографика у неё атомовская, 13/16 Medium, а у
            чипа кита 1 стоит 12/16 Bold. Подстановка утащила бы кегль Атома в компонент кита 1.
          </p>
          <div class="grid max-w-3xl gap-6 sm:grid-cols-2">
            <ShowcaseCell label="как в мастере" hint="подпись, счётчик, крестик">
              <Chip count="8">
                Badge text
              </Chip>
            </ShowcaseCell>
            <ShowcaseCell label="без счётчика" hint="гейт Show bulb выключен">
              <Chip>
                Московская область
              </Chip>
            </ShowcaseCell>
            <ShowcaseCell label="включён" hint="ось из ButtonTag: заливка брендовая">
              <Chip active count="8">
                Badge text
              </Chip>
            </ShowcaseCell>
            <ShowcaseCell label="с маркером" hint="точка 8×8 из ButtonTag, по умолчанию выключена">
              <Chip marker count="2">
                Черновик
              </Chip>
              <Chip marker active>
                Плановый
              </Chip>
            </ShowcaseCell>
          </div>

          <div class="mt-4">
            <ShowcaseCell label="живой фильтр" hint="клик по подписи включает, крестик убирает">
              <Chip
                v-for="c in chips"
                :key="c.id"
                :count="c.count"
                :active="activeChips.includes(c.id)"
                @remove="removeChip(c.id)"
              >
                <button type="button" class="outline-none" @click="toggleChip(c.id)">
                  {{ c.label }}
                </button>
              </Chip>
              <ButtonAction v-if="chips.length < 3" @click="restoreChips()">
                Вернуть
              </ButtonAction>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Slider · мастер кита 1 2034:5889
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Порядок источников был «архив кита 1, а при его отсутствии — дефолт shadcn с долгом».
            Кода в архиве нет, зато <strong>жив сам мастер</strong>: <code>range_slider</code> на
            странице «Other (scrolls, loader)», 75×4. Дорожка 4 и бегунок 12 сняты с него,
            дефолтом компонент не берётся.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Залитой части в мастере нет</strong> — обе половины дорожки одного серого,
            и второго бегунка тоже нет, хотя имя <code>range_slider</code> его обещает. Заливка
            добавлена дефолтом по аналогии с брендовой заливкой выбранного: без неё контрол не
            сообщает значение вовсе. Помечено <code>@debt</code>, просьба дизайнерам — в
            <code>figma-fixes.md</code>. У Атома альтернативы нет: <code>Fader</code> 635:5430 —
            пустой узел.
          </p>
          <div class="grid max-w-3xl gap-6 sm:grid-cols-2">
            <ShowcaseCell label="один бегунок" hint="как в мастере">
              <Slider v-model="sliderValue" class="w-64" />
            </ShowcaseCell>
            <ShowcaseCell label="два бегунка" hint="@debt в мастере не нарисован">
              <Slider v-model="sliderRange" class="w-64" />
            </ShowcaseCell>
            <ShowcaseCell label="шаг 10" hint="поведение примитива Reka">
              <Slider :model-value="[50]" :step="10" class="w-64" />
            </ShowcaseCell>
            <ShowcaseCell label="выключен" hint="@debt состояния в мастере нет">
              <Slider :model-value="[30]" disabled class="w-64" />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            StatusLetter · мастер Атома _BulbStatus 5862:53423
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Волна 7 разобрала этот мастер и <strong>сознательно не завела</strong> его
            компонентом: единственная ось у него цветовая, а без цветовой оси остаётся буква.
            Очередь 2 снимает возражение, не отменяя решения: цвет здесь не ось и не вариант, а
            <strong>данные</strong> — ровно как у <code>StatusBadge</code>.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Цвета иллюстративные.</strong> Восьми вариантам мастера отвечают шесть рамп
            расширенной палитры: в продукте статусов больше шести, они заводятся в справочнике и
            приходят <strong>с сервера вместе с данными</strong>. Дорисовывать две рампы под
            восьмёрку Атома значило бы выдумать цвет — расхождение записано строкой в
            <code>waves.md</code>.
          </p>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Размер <strong>диктует ячейка</strong>, а не лесенка аватара: 20×20 в ней
            отсутствует (24 / 32 / 40 / 56 / 72 / 104), и растягивать лесенку под один случай не
            стали — это мелкая дыра, записанная ещё волной 7.
          </p>

          <ShowcaseCell label="цвета" hint="круг 20×20, буква 13/16 Bold">
            <StatusLetter letter="З" color="green" />
            <StatusLetter letter="П" color="cyan" />
            <StatusLetter letter="Н" color="violet" />
            <StatusLetter letter="О" color="magenta" />
            <StatusLetter letter="В" color="orange" />
            <StatusLetter letter="А" color="red" />
          </ShowcaseCell>

          <div class="mt-4 w-fit overflow-x-auto">
            <TableRow>
              <TableHead variant="simple" class="w-12" />
              <TableHead variant="active" class="w-50">
                Наименование
              </TableHead>
              <TableHead variant="simple" class="w-40">
                Статус
              </TableHead>
            </TableRow>
            <TableRow v-for="row in letterRows" :key="row.letter">
              <TableCell variant="slot" class="w-12">
                <StatusLetter :letter="row.letter" :color="row.color" />
              </TableCell>
              <TableCell class="w-50">
                {{ row.name }}
              </TableCell>
              <TableCell variant="slot" class="w-40">
                <StatusBadge :color="row.color">
                  {{ row.title }}
                </StatusBadge>
              </TableCell>
            </TableRow>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Обогащение · очередь 3"
      note="То, чего нет мастерами. Сначала снят состав с композиций Атома — модальное окно и лайтбокс, — и только потом взяты дефолты: уведомление со стеком, скелетон, шаги, пустое состояние."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Dialog · композиция ModalWindow 6626:56959 и спека 1156:10007
          </h3>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Окно занимает экран целиком.</strong> Это не наше решение и не дефолт: на
            странице спеки написано дословно — «Модальные окна отображаются в полный экран на
            белом непрозрачном фоне». Ни карточки по центру, ни затемняющей подложки в композиции
            нет, поэтому <code>DialogOverlay</code> не рисуется вовсе.
          </p>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            <code>wide</code>, <code>middle</code>, <code>narrow</code> в спеке — это
            <strong>ширины экрана</strong>, а не размеры окна: рядом подписано «Всегда вся ширина
            экрана». Оси размера у компонента поэтому нет, а вместе с шириной меняются три
            величины: боковой паддинг 24 / 32 / 40, высота шапки 44 / 44 / 60 и отступ крестика,
            равный <code>(шапка − 40) / 2</code>.
          </p>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Колонка контента — <strong>8 колонок из 12</strong> с гуттером 32. Проверено на двух
            ширинах: при 1360 это 842, при 1024 — 618, обе сходятся без подгонки. Поэтому в коде
            стоит настоящая сетка, а не выведенный процент.
          </p>

          <ShowcaseCell label="окно" hint="возврат, крестик, колонка на 8 колонок">
            <Dialog v-model:open="dialogOpen">
              <DialogTrigger>
                <Button>Открыть окно</Button>
              </DialogTrigger>
              <DialogContent back="К контрольной точке" @back="dialogOpen = false">
                <DialogHeader class="pt-25">
                  <span data-slot="dialog-icon" class="flex size-14 items-start text-success">
                    <Icon name="check" :size="56" />
                  </span>
                  <DialogTitle>Заголовок в форме вопроса или утверждения</DialogTitle>
                  <DialogDescription>
                    Функциональность решения покрывает практически все задачи, выполняемые
                    оперативным персоналом крупных промышленных объектов, связанных с опасным
                    производством: от формирования рабочих сменных бригад, подготовки расписания
                    их работы до составления маршрутов обходов, выполнения, анализа их результатов
                    и ведения многочисленных оперативных журналов
                  </DialogDescription>
                  <div class="mt-4 grid grid-cols-2 gap-8">
                    <DialogClose>
                      <Button variant="secondary" class="w-full">
                        Отменить
                      </Button>
                    </DialogClose>
                    <Button class="w-full">
                      Подтвердить
                    </Button>
                  </div>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Dialog v-model:open="dialogScrollOpen">
              <DialogTrigger>
                <Button variant="secondary">
                  Окно с футером
                </Button>
              </DialogTrigger>
              <DialogContent back="Назад" @back="dialogScrollOpen = false">
                <DialogHeader class="pb-6">
                  <DialogTitle>Длинная форма</DialogTitle>
                  <DialogDescription>
                    Блок кнопок прижат к низу и лежит поверх прокручиваемого тела — так нарисовано
                    в четырёх схемах из восьми.
                  </DialogDescription>
                </DialogHeader>
                <div class="space-y-4 pb-6">
                  <Field v-for="i in 8" :key="i" :label="`Поле ${i}`" class="w-full">
                    <Input placeholder="Значение" />
                  </Field>
                </div>
                <template #footer>
                  <DialogFooter>
                    <DialogClose>
                      <Button variant="secondary">
                        Отменить
                      </Button>
                    </DialogClose>
                    <Button>Сохранить</Button>
                  </DialogFooter>
                </template>
              </DialogContent>
            </Dialog>
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Lightbox · композиция LightBox 8867:69956
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Тот же полноэкранный слой: «Полноэкранный режим просмотра фото и видео». Полосы 56 и
            64, кадр с боковым паддингом 48, стрелки прижаты к краям. Стрелки центрируются
            <strong>по кадру, а не по окну</strong> — замер дал центр 316 при высоте 640, то есть
            ровно середину области между полосами.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Границы диапазона видны по отрисовке, а не по флагам.</strong> У тёмной
            композиции правая стрелка помечена видимой, а <code>absoluteRenderBounds</code> у неё
            <code>null</code> — то есть на последнем кадре её просто нет. В коде стрелки скрыты на
            границах.
          </p>

          <ShowcaseCell label="лайтбокс" hint="счётчик, слот действий, крестик, подпись">
            <Button variant="secondary" @click="lightboxOpen = true">
              Открыть лайтбокс
            </Button>
            <Lightbox
              v-model:open="lightboxOpen"
              v-model:index="lightboxIndex"
              :total="3"
              caption="«50 лет Победы» — самый большой и современный из арктических атомоходов"
            >
              <div class="flex size-full items-center justify-center bg-muted text-muted-foreground">
                Кадр {{ lightboxIndex }}
              </div>
            </Lightbox>
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Дефолты со статусом долга
          </h3>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            Четыре сущности, которых нет ни мастером, ни композицией. Каждая помечена
            <code>@debt</code> в шапке файла и строкой в <code>design-debt.md</code>. Вид собран не
            из значений Tailwind, а <strong>по аналогии с уже перенесённым</strong> — источник
            аналогии назван в <code>index.ts</code> каждого компонента.
          </p>

          <div class="grid max-w-3xl gap-6 sm:grid-cols-2">
            <ShowcaseCell label="Toast" hint="плашка — перенесённый Alert, дефолт только стек">
              <Button variant="secondary" @click="pushToast()">
                Показать уведомление
              </Button>
            </ShowcaseCell>

            <ShowcaseCell label="Skeleton" hint="заливка --muted, радиус из шкалы">
              <div class="w-full space-y-2">
                <Skeleton class="h-5 w-2/3" />
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-4/5" />
              </div>
            </ShowcaseCell>

            <ShowcaseCell label="Stepper" hint="кружок 24, галочка у пройденного">
              <Stepper v-model="step" class="w-full">
                <StepperItem :step="1" :current="step">
                  Данные
                </StepperItem>
                <StepperItem :step="2" :current="step">
                  Проверка
                </StepperItem>
                <StepperItem :step="3" :current="step" last>
                  Готово
                </StepperItem>
              </Stepper>
            </ShowcaseCell>

            <ShowcaseCell label="Empty state" hint="иконка, заголовок, пояснение, действие">
              <Empty
                title="Осмотров пока нет"
                description="Здесь появятся осмотры, назначенные на вас."
                class="w-full"
              >
                <template #icon>
                  <Icon name="draft" :size="40" />
                </template>
                <template #action>
                  <Button>Создать осмотр</Button>
                </template>
              </Empty>
            </ShowcaseCell>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Медиа · волна 9 — последняя"
      note="Хвост переноса: галерея, слайдшоу и два плеера плюс две кнопки, пришедшие из волны 2 как медийные по природе. После неё остаётся этап 2 — то, чего в Атоме нет вовсе."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            MediaGallery · мастера 6734:62674 и 6734:62222
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Три размера плитки — 320×200, 176×110, 112×70 — и <strong>одна пропорция на все
              три</strong>: деление даёт ровно 1.6, то есть 16:10. Радиус и зазор растут вместе
            с плиткой (24/16/8), пропорция нет. Габариты не переносятся: ось
            <code>Brakepoint</code> — снимки, как у плитки и баннера.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Две странности в самих числах.</strong> У крупного размера
            <code>middle</code> шире, чем <code>wide</code> — 1064 против 976. А у мелкого
            брейкпоинт не влияет вовсе: все три значения дают 472×70. Обе отданы дизайнерам.
          </p>
          <MediaGallery size="md" class="max-w-2xl">
            <MediaGalleryItem v-for="i in 4" :key="i" size="md" class="w-44" />
            <MediaGalleryItem size="md" more class="w-44" />
          </MediaGallery>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Slideshow · мастера 5946:53926 и 5946:53594
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            <strong>Активное превью выделено высотой, а не рамкой:</strong> 104×73 против 104×65,
            причём ни заливки, ни обводки у обоих нет — проверено. Превью не подсвечивается, а
            вырастает до полной высоты ленты.
          </p>
          <div class="max-w-lg">
            <Slideshow :count="5" />
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            PlayerVideo · мастер 6922:58170 · PlayerAudio · мастер 6921:57397
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            <strong>Видео идёт в 16:9, а галерея и слайдшоу — в 16:10.</strong> Проверено
            делением: 640/360 = 1.778 против 320/200 = 1.6. Две пропорции в одном разделе.
            Кнопка плеера — белый круг на <strong>88%</strong>: под ней просвечивает кадр.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            У аудиоплеера ось <code>State</code> называет <strong>глиф, а не состояние</strong>:
            <code>State=play</code> — это когда показана кнопка «играть», то есть звук
            остановлен. В коде проп зовётся <code>playing</code>. Дорожка перемотки появляется
            только во время воспроизведения — это состав мастера.
          </p>
          <div class="grid max-w-3xl gap-4">
            <div class="w-100">
              <PlayerVideo size="md" />
            </div>
            <ShowcaseCell label="аудио · остановлен">
              <PlayerAudio>
                Запись осмотра от 13.08.2026
              </PlayerAudio>
            </ShowcaseCell>
            <ShowcaseCell label="аудио · играет" hint="появляется дорожка перемотки">
              <PlayerAudio playing time="2:14">
                Запись осмотра от 13.08.2026
              </PlayerAudio>
            </ShowcaseCell>
            <ShowcaseCell label="кнопка плеера" hint="128 · 80 · 40, белая на 88%">
              <span class="flex items-center gap-4 rounded-xl bg-muted-foreground/[var(--opacity-soft)] p-4">
                <PlayerButton size="lg" />
                <PlayerButton size="md" type="pause" />
                <PlayerButton size="sm" />
                <PlayerButton size="sm" disabled />
              </span>
            </ShowcaseCell>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Контейнеры и оверлеи · волна 8"
      note="Accordion закрывает старейшую позицию дизайн-долга: он стоял на дефолте shadcn-vue с волны 2 маршрута по киту 1, с пометкой «в ките нет вовсе». В Атоме он есть."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Accordion · мастер 6644:58398
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            <code>Collapsed=true</code> снова означает <strong>раскрытое</strong> — третий случай
            инвертированного имени оси. Доказано высотой: 76 против 120 у крупного размера.
            Цвет плашки связан с видом намертво, поэтому отдельного пропа нет.
          </p>
          <div class="grid max-w-2xl gap-4">
            <ShowcaseCell label="plain" hint="без плашки, паддингов нет">
              <Accordion>
                <template #title>
                  Заголовок раздела
                </template>
                Содержимое раскрытой части.
              </Accordion>
            </ShowcaseCell>
            <ShowcaseCell label="soft · раскрыт" hint="мягкая ступень, радиус 16">
              <Accordion variant="soft" default-open>
                <template #title>
                  Заголовок раздела
                </template>
                Содержимое раскрытой части.
              </Accordion>
            </ShowcaseCell>
            <ShowcaseCell label="card · sm" hint="белая плашка, кегль 20">
              <Accordion variant="card" size="sm">
                <template #title>
                  Заголовок раздела
                </template>
                Содержимое раскрытой части.
              </Accordion>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Image · мастер 174:3128 · Story · мастер 749:5436
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            У всех шести вариантов <code>Image</code> высота одна и та же, 170 — это
            <strong>один снимок в шести пропорциях</strong>, а не шесть размеров. Переносится
            пропорция, ширину задаёт раскладка.
          </p>
          <div class="flex flex-wrap items-end gap-4">
            <div class="w-30">
              <Image ratio="1:1" class="rounded-md" />
            </div>
            <div class="w-40">
              <Image ratio="16:10" class="rounded-md" />
            </div>
            <div class="w-24">
              <Image ratio="3:4" class="rounded-md" />
            </div>
            <Story>
              Длинная подпись сюжета в три строки
            </Story>
            <Story>
              Короткая
            </Story>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Banner · мастер 149:1663
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Четыре варианта дают <strong>три ступени текста</strong>: у среднего размера широкий
            и у крупного узкий типографика совпадает, различие только в габарите. Поэтому в коде
            одна ось из трёх ступеней, а не две по два значения.
          </p>
          <div class="flex flex-wrap gap-6">
            <div class="w-70">
              <Banner size="lg">
                <template #media>
                  <Image ratio="16:10" class="rounded-md" />
                </template>
                <template #title>
                  Крупная ступень
                </template>
                Заголовок 20, подпись 16
              </Banner>
            </div>
            <div class="w-50">
              <Banner size="md">
                <template #media>
                  <Image ratio="16:10" class="rounded-md" />
                </template>
                <template #title>
                  Средняя ступень
                </template>
                Заголовок 16, подпись 13
              </Banner>
            </div>
            <div class="w-38">
              <Banner size="sm">
                <template #media>
                  <Image ratio="16:10" class="rounded-md" />
                </template>
                <template #title>
                  Мелкая ступень
                </template>
                Заголовок 13, подпись 10
              </Banner>
            </div>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Таблица · волна 7"
      note="Матрица ячейки урезана решением, а не переносом: у оси Type двадцать значений, перенесено пять плюс слот. Пометка «— DS» означает «дизайн-система даёт готовым» — разбор в docs/table-ds-marker.md."
    >
      <div class="space-y-8">
        <div>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Пять помеченных типов дают <strong>390 инстансов из 436</strong> в демонстрационной
            раскладке, каждый непомеченный встречается ровно 2 или 4 раза. И тип
            <code>Input</code> содержит текстовый слой, а не инстанс поля — то есть он рисунок
            контрола, а не композиция с ним. Всё содержательное кладётся в слот.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Подсветка живёт на ячейке, а не на строке.</strong> У <code>_Row</code>
            заливки нет вовсе — ось <code>Active</code> есть у ячейки. Чтобы подсветить строку,
            её выставляют каждой ячейке. Проверено отдельно, отдано дизайнерам.
          </p>

          <div class="w-fit overflow-x-auto">
            <TableRow>
              <TableHead variant="checkbox" />
              <TableHead variant="active" class="w-50">
                Наименование
              </TableHead>
              <TableHead variant="interactive" class="w-30">
                Дата
              </TableHead>
              <TableHead variant="simple" class="w-30">
                Статус
              </TableHead>
              <TableHead variant="simple" class="w-30">
                Ответственный
              </TableHead>
            </TableRow>

            <TableRow v-for="r in 3" :key="r">
              <TableCell variant="checkbox" :active="r === 2" />
              <TableCell :active="r === 2" class="w-50">
                Осмотр № {{ 1200 + r }}
              </TableCell>
              <TableCell :active="r === 2" class="w-30">
                13.08.2026
              </TableCell>
              <!-- Слот: статус — композиция из перенесённого, а не тип ячейки. -->
              <TableCell variant="slot" :active="r === 2" class="w-30">
                <Badge :variant="r === 1 ? 'success' : r === 2 ? 'warning' : 'neutral'" size="sm">
                  {{ r === 1 ? 'Готов' : r === 2 ? 'В работе' : 'Черновик' }}
                </Badge>
              </TableCell>
              <TableCell variant="slot" :active="r === 2" class="w-30">
                <span class="flex items-center gap-2">
                  <Avatar type="letter" letter="И" :size="24" />
                  <span class="truncate text-base">Иванов</span>
                </span>
              </TableCell>
            </TableRow>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Заголовки колонок · мастер 5137:37282
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Три текстовых типа различаются <strong>начертанием и цветом</strong>, а не размером:
            по <code>simple</code> не сортируют, у <code>interactive</code> сортировка доступна,
            <code>active</code> — колонка, по которой сортируют сейчас.
          </p>
          <div class="flex flex-wrap gap-8">
            <TableHead variant="simple">
              Без сортировки
            </TableHead>
            <TableHead variant="interactive">
              Можно сортировать
            </TableHead>
            <TableHead variant="active">
              Сортируется сейчас
            </TableHead>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Дата и время · волна 6"
      note="Предсказание подтвердилось наполовину: заливка и геометрия поля совпали с Input бит в бит, но разметка у пикера своя — ему нужны две иконки, а у поля один слот слева и крестик справа."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            DatePicker · мастера 1763:10301 и 1159:10888
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Спека подписывает выключенное состояние дословно —
            <strong>«text opacity — 0.48, as Select»</strong>: пикер гасится как поле, а не как
            кнопка. Замер подтверждает. Календарь — только сетка: плашку даёт тот же
            <code>Popover</code>, что у выпадашки и подменю.
          </p>
          <div class="grid max-w-xl gap-4 sm:grid-cols-2">
            <ShowcaseCell label="default" hint="272×40, заливка поля">
              <DatePicker />
            </ShowcaseCell>
            <ShowcaseCell label="disabled" hint="прозрачность 0.48, как поле">
              <DatePicker disabled />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Calendar · мастер 1159:10888
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Шесть строк всегда, независимо от месяца: сетка не скачет по высоте при
            перелистывании. Ось <code>Range</code> на контейнер не влияет — замер дал одинаковые
            габариты, — она меняет только отрисовку выделения.
          </p>
          <div class="w-fit rounded-lg bg-popover p-5 shadow-dropdown">
            <Calendar />
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            FileUpload · мастер 1572:10113 · File · мастер 1931:12249
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Снаружи все четыре состояния области загрузки <strong>одинаковы</strong>: 320×88,
            пунктирная рамка 1px со штрихом 2/4. Различие целиком внутри, в двух надписях — и
            сделано <strong>подменой цвета, а не прозрачностью</strong>. Это третий механизм
            выключенного состояния у Атома: у кнопок 0.32, у полей 0.48, здесь цвет.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <code>uploaded</code> — не ошибка и не успех, а <strong>исчерпанный лимит</strong>:
            заголовок приглушён, подпись зелёная. Контрол выключен, но сообщение положительное —
            загружать больше нельзя, потому что всё уже загружено.
          </p>
          <div class="grid max-w-3xl gap-4 sm:grid-cols-2">
            <ShowcaseCell label="default">
              <FileUpload />
            </ShowcaseCell>
            <ShowcaseCell label="error">
              <FileUpload state="error">
                Загрузить файлы
                <template #hint>
                  Ошибка загрузки: 2 из 5 файлов
                </template>
              </FileUpload>
            </ShowcaseCell>
            <ShowcaseCell label="uploaded" hint="лимит исчерпан, подпись зелёная">
              <FileUpload state="uploaded">
                Загрузить файлы
                <template #hint>
                  Вы уже загрузили максимум файлов
                </template>
              </FileUpload>
            </ShowcaseCell>
            <ShowcaseCell label="disabled" hint="всё приглушено цветом">
              <FileUpload state="disabled" />
            </ShowcaseCell>
          </div>

          <div class="mt-4 grid max-w-3xl gap-4">
            <ShowcaseCell label="File" hint="плашка на мягкой ступени · simple без плашки">
              <div class="flex w-full flex-col gap-2">
                <File>
                  Договор оказания услуг.pdf
                  <template #subtitle>
                    2,4 МБ
                  </template>
                </File>
                <File size="sm">
                  Акт сверки.xlsx
                  <template #subtitle>
                    880 КБ
                  </template>
                </File>
                <File variant="simple" :show-subtitle="false">
                  Скан паспорта.jpg
                </File>
              </div>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            TimePicker · мастера 3871:26784 и 1161:9805
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Поле совпадает с пикером даты полностью. Различие одно и оно в составе:
            <strong>в заполненном состоянии правая иконка заменяется крестиком очистки</strong> —
            у пикера даты обе иконки остаются на месте.
          </p>
          <div class="grid max-w-xl gap-4 sm:grid-cols-2">
            <ShowcaseCell label="default">
              <TimePicker />
            </ShowcaseCell>
            <ShowcaseCell label="filled" hint="справа крестик вместо иконки">
              <TimePicker model-value="09:30" />
            </ShowcaseCell>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Навигация · волна 5"
      note="Меню Атома нарисовано на белом — тёмным его делает тема, а не мастер. С мастера пришли состав, геометрия и механика состояний; цвет берётся из sidebar-*."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Menu · мастера 3499:24661, 3465:22566, 3497:23069
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Подложка пункта ходит <strong>плотностью одной нейтрали</strong>: покоя нет вовсе,
            наведение 8%, выбор 12%. Наведение и выбор различаются только плотностью — подпись у
            них одна. Направляющая подменю сидит на той же мягкой ступени.
          </p>
          <div class="flex flex-wrap items-start gap-6">
            <Menu>
              <MenuItem selected>
                Выбранный пункт
              </MenuItem>
              <MenuItem>
                Обычный пункт
              </MenuItem>
              <MenuItem show-bulb>
                Со счётчиком
              </MenuItem>
              <MenuSub open selected>
                Пункт с подменю
                <template #items>
                  <MenuItem>
                    Второй уровень
                  </MenuItem>
                  <MenuItem selected>
                    Выбранный
                  </MenuItem>
                  <MenuItem>
                    Ещё один
                  </MenuItem>
                </template>
              </MenuSub>
              <MenuItem disabled>
                Выключенный
              </MenuItem>
            </Menu>

            <Menu compact>
              <MenuItem selected />
              <MenuItem />
              <MenuItem show-bulb />
              <MenuItem disabled />
            </Menu>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            ListRow · мастер 1910:12739
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Заливка устроена наоборот привычного: <strong>в покое плашка приглушённая, а активная
              — белая</strong>. Активная строка всплывает над фоном, а не подсвечивается.
            Выключенная гаснет до <strong>0.48</strong>, а не до 0.32 — у Атома два уровня
            гашения, и строка идёт по тому же, что поля и контролы выбора.
          </p>
          <div class="grid max-w-2xl gap-4">
            <ShowcaseCell label="типы левого слота" hint="стрелка · иконка · число">
              <div class="flex w-full flex-col gap-2">
                <ListRow type="arrow">
                  Заголовок строки
                  <template #secondary>
                    Вторая строка подписи
                  </template>
                </ListRow>
                <ListRow type="icon">
                  Заголовок строки
                  <template #secondary>
                    Вторая строка подписи
                  </template>
                </ListRow>
                <ListRow type="number" :number="7">
                  Заголовок строки
                  <template #secondary>
                    Вторая строка подписи
                  </template>
                </ListRow>
              </div>
            </ShowcaseCell>
            <ShowcaseCell label="active / disabled" hint="активная белая, выключенная 0.48">
              <div class="flex w-full flex-col gap-2">
                <ListRow active>
                  Активная строка
                  <template #secondary>
                    Всплывает белым
                  </template>
                </ListRow>
                <ListRow disabled>
                  Выключенная строка
                  <template #secondary>
                    Прозрачность 0.48
                  </template>
                </ListRow>
              </div>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Breadcrumb · мастер 3880:31214 · Pagination · мастер 4104:36392
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Оба — <strong>композиции уже перенесённого</strong>, а не новые сущности. У крошек
            шеврон-разделитель уже входит в <code>ButtonNavigation</code>: отдельный разделитель
            заводить не нужно, иначе стрелок станет две. У пагинации внутри мастера лежит инстанс
            <code>Tabs</code> — номера страниц у Атома это вкладки.
          </p>
          <div class="space-y-4">
            <ShowcaseCell label="breadcrumb" hint="зазор 8, свёрнутая середина — кнопка">
              <Breadcrumb>
                <li><ButtonNavigation size="sm" muted>
                  Главная
                </ButtonNavigation></li>
                <li><BreadcrumbCollapsed /></li>
                <li><ButtonNavigation size="sm" muted>
                  Раздел
                </ButtonNavigation></li>
                <li><ButtonNavigation size="sm">
                  Текущая
                </ButtonNavigation></li>
              </Breadcrumb>
            </ShowcaseCell>
            <ShowcaseCell label="pagination" hint="номера — это Tabs из волны 3">
              <Pagination :page="3" :pages="7" />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            NavigationTile · мастер 638:5476
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Ось <code>Breakpoint</code> — это не размер, а точка перелома: два варианта мастера
            суть <strong>два снимка одной плитки на разных ширинах окна</strong>. Габариты в код
            не перенесены сознательно — зашить 153px значило бы воспроизвести отсутствие резиновой
            раскладки у Figma. Различие вариантов в коде — кегль.
          </p>
          <p class="mb-3 max-w-2xl rounded-md border border-border p-3 text-sm">
            <strong>Это плитка-ссылка в раздел, а не карточка с текстом.</strong> В первом
            переносе от неё остался белый прямоугольник: не переехали фотография во всю коробку
            и шторка-градиент снизу, а подпись должна лежать поверх них белой. Ниже — в
            реалистичном контейнере, сеткой по три, с подложкой вместо фото.
          </p>
          <div class="grid max-w-2xl grid-cols-3 gap-4">
            <NavigationTile class="h-51 bg-muted-foreground">
              Мои осмотры
            </NavigationTile>
            <NavigationTile class="h-51 bg-muted-foreground">
              Отчёты и выгрузки
            </NavigationTile>
            <NavigationTile class="h-51 bg-muted-foreground">
              Справочники
            </NavigationTile>
          </div>
          <div class="mt-4 max-w-2xl">
            <NavigationTile size="lg" class="h-70 w-53 bg-muted-foreground">
              Крупная ступень
            </NavigationTile>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            MenuPopover · мастер 3499:27440
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            В компактном режиме подменю некуда развернуть внутри полосы 56 шириной — оно уезжает
            плашкой вбок. <strong>Правило порталов здесь видно буквально:</strong> плашка
            вылетает из тёмного меню и остаётся светлой. Проверено по мастеру, а не принято по
            правилу: заливка белая, тень <code>0 / 8 / 32</code> — та же, что у выпадашки.
          </p>
          <MenuPopover>
            <MenuItem selected>
              Второй уровень
            </MenuItem>
            <MenuItem>
              Ещё пункт
            </MenuItem>
            <MenuItem show-bulb>
              Со счётчиком
            </MenuItem>
          </MenuPopover>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Индикаторы и обратная связь · волна 4"
      note="Состояний у этой группы нет: спека Bulb 1858:11709 подписывает компонент «Неинтерактивный», у таймера и уведомления состояний в мастерах тоже не нарисовано. Показаны формы, размеры и роли."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Indicator · мастер 790:10402
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Три формы: точка-метка, голая цифра и счётчик в плашке. Цветовая ось мастера сведена
            к семантическим ролям — точка статуса без цвета статуса не работает. Матрица мастера
            не полный крест: белого нет у точки и счётчика, мелкого размера нет у счётчика.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <ShowcaseCell label="точка · md" hint="12×12, свечение в цвете роли">
              <Indicator variant="default" />
              <Indicator variant="success" />
              <Indicator variant="warning" />
              <Indicator variant="destructive" />
              <Indicator variant="neutral" />
            </ShowcaseCell>
            <ShowcaseCell label="точка · sm" hint="8×8">
              <Indicator variant="default" size="sm" />
              <Indicator variant="success" size="sm" />
              <Indicator variant="warning" size="sm" />
              <Indicator variant="destructive" size="sm" />
              <Indicator variant="neutral" size="sm" />
            </ShowcaseCell>
            <ShowcaseCell label="цифра" hint="13/16 Medium и 10/12 Regular">
              <Indicator type="text">
                99+
              </Indicator>
              <Indicator type="text" variant="destructive">
                12
              </Indicator>
              <Indicator type="text" size="sm">
                99+
              </Indicator>
              <Indicator type="text" size="sm" variant="success">
                7
              </Indicator>
            </ShowcaseCell>
            <ShowcaseCell label="счётчик" hint="высота 16, размер в мастере один">
              <Indicator type="counter">
                9
              </Indicator>
              <Indicator type="counter">
                99+
              </Indicator>
              <Indicator type="counter" variant="destructive">
                3
              </Indicator>
              <Indicator type="counter" variant="neutral">
                12
              </Indicator>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Timer · мастер 6344:55714
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Индикатор обратного отсчёта, не спиннер: у спиннера конца нет, у таймера конец и есть
            смысл. Внутри мастера два вектора — подложка на 12% и заливка отсчёта на 100%,
            без дырки в середине. Это сектор, а не кольцо.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <ShowcaseCell label="размеры" hint="20 · 32 · 48">
              <Timer size="sm" :value="0.25" />
              <Timer size="md" :value="0.5" />
              <Timer size="lg" :value="0.75" />
            </ShowcaseCell>
            <ShowcaseCell label="с цифрой" hint="булев проп Number">
              <Timer size="lg" show-number :value="0.25">
                5
              </Timer>
              <Timer size="md" show-number :value="0.6">
                3
              </Timer>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Badge · мастер 913:8279
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Текстовая метка, и только: иконки у бейджа Атома нет вовсе. Из десяти колонок мастера
            перенесены шесть, за которыми стоит роль. Розовая, фиолетовая, бирюзовая и жёлтая не
            перенесены — они различают, а не сообщают; для этого есть расширенная палитра.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <ShowcaseCell label="md" hint="высота 24, кегль 13/16">
              <Badge>Badge text</Badge>
              <Badge variant="success">
                Готово
              </Badge>
              <Badge variant="warning">
                Внимание
              </Badge>
              <Badge variant="destructive">
                Ошибка
              </Badge>
              <Badge variant="neutral">
                Черновик
              </Badge>
              <Badge variant="inverse">
                Инверсия
              </Badge>
            </ShowcaseCell>
            <ShowcaseCell label="sm" hint="высота 16, кегль 10/12">
              <Badge size="sm">
                Badge text
              </Badge>
              <Badge size="sm" variant="success">
                Готово
              </Badge>
              <Badge size="sm" variant="warning">
                Внимание
              </Badge>
              <Badge size="sm" variant="destructive">
                Ошибка
              </Badge>
              <Badge size="sm" variant="neutral">
                Черновик
              </Badge>
              <Badge size="sm" variant="inverse">
                Инверсия
              </Badge>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Avatar · мастер 3488:24229
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Две колонки цвета здесь не роли, а плотность заливки: брендовая сплошная и она же на
            12%. Содержимое идёт за заливкой. Лестницы глифа и кегля непропорциональны стороне —
            сняты поштучно. Буква есть у трёх младших размеров: у крупных её ступени это
            display-кегли, под которые шкала не расширяется.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <ShowcaseCell label="иконка · solid" hint="24 · 32 · 40 · 56 · 72 · 104">
              <Avatar :size="24" />
              <Avatar :size="32" />
              <Avatar :size="40" />
              <Avatar :size="56" />
              <Avatar :size="72" />
              <Avatar :size="104" />
            </ShowcaseCell>
            <ShowcaseCell label="иконка · soft" hint="брендовый на 12%">
              <Avatar variant="soft" :size="24" />
              <Avatar variant="soft" :size="32" />
              <Avatar variant="soft" :size="40" />
              <Avatar variant="soft" :size="56" />
              <Avatar variant="soft" :size="72" />
              <Avatar variant="soft" :size="104" />
            </ShowcaseCell>
            <ShowcaseCell label="буква" hint="только 24, 32 и 40">
              <Avatar type="letter" letter="А" :size="24" />
              <Avatar type="letter" letter="Б" :size="32" />
              <Avatar type="letter" letter="В" :size="40" />
              <Avatar type="letter" letter="Г" variant="soft" :size="40" />
            </ShowcaseCell>
            <ShowcaseCell label="фотография" hint="заливка — само изображение">
              <Avatar type="photo" :size="40" />
              <Avatar type="photo" :size="72" />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Spinner · мастер 134:1768
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Ожидание без известного конца — этим и отличается от таймера. Кольцо с угловой
            заливкой: стопы сняты с мастера, брендовый на 12% → он же на 100%. Толщина кольца
            непропорциональна стороне, замерена по экспорту.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <ShowcaseCell label="размеры" hint="16 · 20 · 32 · 48 · 72">
              <Spinner size="xs" />
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </ShowcaseCell>
            <ShowcaseCell label="inverse" hint="белая колонка мастера, показана на тёмном">
              <span class="flex items-center gap-3 rounded-md bg-sidebar p-3">
                <Spinner variant="inverse" size="sm" />
                <Spinner variant="inverse" size="md" />
                <Spinner variant="inverse" size="lg" />
              </span>
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Tooltip · мастер 834:10127
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Семь вариантов оси — это семь положений хвостика, а не семь стилей. Разложены на
            <code>side</code> × <code>align</code> плюс булев «хвостик есть»: набор достижимых
            положений совпадает с мастером. Тень у подсказки средняя, не как у выпадашки.
          </p>
          <TooltipProvider>
            <div class="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger class="rounded-md border border-border px-3 py-2 text-sm">
                  снизу слева
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                  Tooltip text here
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger class="rounded-md border border-border px-3 py-2 text-sm">
                  сверху справа
                </TooltipTrigger>
                <TooltipContent side="top" align="end">
                  Tooltip text here
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger class="rounded-md border border-border px-3 py-2 text-sm">
                  сбоку
                </TooltipTrigger>
                <TooltipContent side="right">
                  Tooltip text here
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger class="rounded-md border border-border px-3 py-2 text-sm">
                  без хвостика
                </TooltipTrigger>
                <TooltipContent side="top" :show-arrow="false">
                  Tooltip text here
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Alert · мастер 5883:58974
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Плашка уведомления целиком: 360 шириной, радиус 12, тень выпадашки. Крестик и таймер
            взаимоисключающи — плашка с отсчётом закрывается сама, и крестика в этом варианте
            мастера нет. Всплывающего <code>Toast</code> со стеком в Атоме не нарисовано —
            строка в <code>design-debt.md</code>.
          </p>
          <div class="space-y-4">
            <ShowcaseCell label="default" hint="без иконки, паддинги 20/40">
              <Alert>
                Notification text
              </Alert>
            </ShowcaseCell>
            <ShowcaseCell label="с иконкой" hint="паддинги 16/40">
              <Alert show-icon>
                Notification text
              </Alert>
            </ShowcaseCell>
            <ShowcaseCell label="timer" hint="паддинги 16/20, крестика нет">
              <Alert type="timer" :value="0.25">
                Notification text
              </Alert>
            </ShowcaseCell>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <!-- Область показа уведомлений: одна на страницу, как и положено стеку. -->
    <Toaster>
      <Toast
        v-for="t in toasts"
        :key="t.id"
        :open="true"
        show-icon
        @update:open="dropToast(t.id)"
      >
        {{ t.text }}
      </Toast>
    </Toaster>
  </main>
</template>
