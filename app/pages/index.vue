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
  </main>
</template>
