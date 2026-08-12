<script setup lang="ts">
import { onMounted, ref } from 'vue'

useHead({ title: 'Витрина — админский дизайн-кит' })

/** Состояние focus нельзя показать статикой — наводим его программно на один экземпляр. */
const focusedInput = ref<HTMLElement | null>(null)

onMounted(() => {
  focusedInput.value?.querySelector('input')?.focus()
})

const buttonVariants = ['default', 'secondary', 'outline', 'ghost'] as const
const ghostTones = ['accent', 'warning', 'red'] as const
const badgeColors = ['violet', 'red', 'orange'] as const
const statusColors = ['green', 'cyan', 'violet', 'magenta', 'orange', 'red'] as const

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
  <main class="mx-auto max-w-5xl space-y-12 px-6 py-10">
    <header class="space-y-3">
      <p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        кит 2 · волна 0
      </p>
      <h1 class="text-4xl font-bold">
        Витрина админского дизайн-кита
      </h1>
      <p class="max-w-2xl text-muted-foreground">
        Токены читаются прямо из таблиц стилей документа, поэтому витрина не может разойтись с
        файлом токенов. Компоненты показаны в состояниях default, hover, focus, disabled и error.
      </p>
      <p class="max-w-2xl rounded-md border border-border bg-secondary p-3 text-sm">
        <strong>Тема кита применена.</strong> Все 78 переменных — 69 <code>mode</code> и
        9 <code>menu</code> — перенесены; мапинг с provenance в <code>docs/tokens.md</code>,
        раздел 7. Состояния идут из токенов-расширений, не через прозрачность.
      </p>
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
      title="Button"
      note="Четыре мастера кита сведены в один компонент: btn_accent → default, btn_secondary → secondary, btn_outline → outline, btn_txt → ghost. Иконочные слоты в мастерах включены по умолчанию, поэтому показаны с ними."
    >
      <div class="space-y-6">
        <div>
          <h3 class="mb-3 text-sm font-medium">Варианты · size 44</h3>
          <div class="flex flex-wrap items-center gap-3">
            <Button v-for="v in buttonVariants" :key="v" :variant="v">
              <template #left><IconPlaceholder /></template>
              {{ v }}
              <template #right><IconPlaceholder /></template>
            </Button>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">size 32</h3>
          <div class="flex flex-wrap items-center gap-3">
            <Button v-for="v in buttonVariants" :key="v" :variant="v" size="sm">
              <template #left><IconPlaceholder /></template>
              {{ v }}
            </Button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <ShowcaseCell label="Default"><Button>Найти</Button></ShowcaseCell>
          <ShowcaseCell label="Hover" hint="наведите курсор"><Button>Найти</Button></ShowcaseCell>
          <ShowcaseCell label="Pressed" hint="зажмите"><Button>Найти</Button></ShowcaseCell>
          <ShowcaseCell label="Dissabled"><Button disabled>Найти</Button></ShowcaseCell>
          <ShowcaseCell label="not_active" hint="пятое состояние, только у accent">
            <Button inactive>Найти</Button>
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">btn_txt · цветовая ось и начертание</h3>
          <div class="flex flex-wrap items-center gap-4">
            <Button v-for="t in ghostTones" :key="t" variant="ghost" :tone="t">
              <template #left><IconPlaceholder /></template>
              {{ t }}
            </Button>
            <Button variant="ghost" weight="regular">regular</Button>
            <Button variant="ghost" size="sm">s_16</Button>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">Только иконка</h3>
          <p class="mb-3 text-sm text-muted-foreground">
            Отдельного варианта в ките нет — режим достигается пропом «показать текст» = false.
            У secondary и outline получается 44×44, у accent ширина в мастере зафиксирована на 152.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="secondary"><template #left><IconPlaceholder /></template></Button>
            <Button variant="outline"><template #left><IconPlaceholder /></template></Button>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Input"
      note="Состояния сняты с мастера кита: везде рамка 1px, кольца нет ни в одном состоянии. В disabled поле остаётся белым — гаснут рамка и текст. Полевая обёртка (подпись, подсказка, счётчик, раскладки слева/сверху) — компонент InputField в волне 1, см. docs/waves.md."
    >
      <div class="grid gap-6 sm:grid-cols-2">
        <ShowcaseCell label="Default">
          <Input label="Номер осмотра" placeholder="Text" hint="Подсказка" counter="0/25">
            <template #left><IconPlaceholder /></template>
            <template #right><IconPlaceholder /></template>
          </Input>
        </ShowcaseCell>
        <ShowcaseCell label="field" hint="есть значение">
          <Input label="Номер осмотра" model-value="4815162342" hint="Подсказка" counter="10/25">
            <template #left><IconPlaceholder /></template>
            <template #right><IconPlaceholder /></template>
          </Input>
        </ShowcaseCell>
        <ShowcaseCell label="error">
          <Input label="Номер осмотра" model-value="абв" invalid hint="Только цифры" counter="3/25">
            <template #left><IconPlaceholder /></template>
            <template #right><IconPlaceholder /></template>
          </Input>
        </ShowcaseCell>
        <ShowcaseCell label="disabled">
          <Input label="Номер осмотра" model-value="Text" disabled hint="Подсказка" counter="4/25">
            <template #left><IconPlaceholder /></template>
            <template #right><IconPlaceholder /></template>
          </Input>
        </ShowcaseCell>
        <ShowcaseCell label="label=left">
          <Input label="Заголовок" orientation="left" placeholder="Text" hint="Подсказка" counter="0/25" />
        </ShowcaseCell>
        <ShowcaseCell label="size=40">
          <Input label="Номер осмотра" size="sm" placeholder="Text" />
        </ShowcaseCell>
      </div>
    </ShowcaseSection>

    <ShowcaseSection title="Select">
      <div class="grid gap-4 sm:grid-cols-2">
        <ShowcaseCell label="default">
          <Select>
            <SelectTrigger class="w-56">
              <SelectValue placeholder="Статус осмотра" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                Новый
              </SelectItem>
              <SelectItem value="in-progress">
                В работе
              </SelectItem>
              <SelectItem value="done">
                Завершён
              </SelectItem>
            </SelectContent>
          </Select>
        </ShowcaseCell>
        <ShowcaseCell label="disabled">
          <Select disabled>
            <SelectTrigger class="w-56">
              <SelectValue placeholder="Статус осмотра" />
            </SelectTrigger>
          </Select>
        </ShowcaseCell>
      </div>
    </ShowcaseSection>

    <ShowcaseSection title="Badge">
      <div class="space-y-6">
        <div class="flex flex-wrap gap-3">
          <Badge v-for="c in badgeColors" :key="c" :color="c">
            <template #icon><IconPlaceholder /></template>
            {{ c }}
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          Набор цветов — ровно тот, что нарисован в ките: violet, red, orange. Заливка сплошная,
          текст белый, кегль 13/16 Bold.
        </p>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="StatusBadge"
      note="Статусная плашка кита: точка 8×8 плюс подпись. Цвет — явный проп, отдельный статусный слой, а не общий variant."
    >
      <div class="space-y-4">
        <p
          class="max-w-2xl rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900"
        >
          <strong>Цвета иллюстративные.</strong> Раскладка повторяет текущие макеты, чтобы
          прототипы рендерились цветными. В продукте статусные цвета приходят с сервера вместе с
          данными — при интеграции здесь будет мапинг с данных, а не выбор цвета руками.
        </p>
        <div class="flex flex-wrap gap-6">
          <StatusBadge v-for="c in statusColors" :key="c" :color="c">
            {{ c }}
          </StatusBadge>
        </div>
        <p class="text-sm text-muted-foreground">
          Имя <code>cyan</code> вместо китового <code>grey</code> — в ките ошибка: вариант с именем
          grey красится в бирюзовый. См. вопрос 12.
        </p>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Tabs"
      note="В ките два разных мастера вкладок, и они не сводятся друг к другу: tabs 2702:315 — навигация с подчёркиванием, iconed_tab_list 2181:387 — переключатель режима показа."
    >
      <div class="space-y-8">
        <div>
          <h3 class="mb-3 text-sm font-medium">variant="line" · мастер tabs 2702:315</h3>
          <p class="mb-3 text-sm text-muted-foreground">
            Рельс 1px neutral/soft под всем списком, активный таб — линия 2px accent/default
            во всю ширину поверх рельса. Активный становится Bold, неактивный — fg/primary.
            Табы равными долями, gap 4.
          </p>
          <Tabs default-value="all" class="w-full max-w-md">
            <TabsList variant="line">
              <TabsTrigger variant="line" value="all">Все</TabsTrigger>
              <TabsTrigger variant="line" value="mine">Мои</TabsTrigger>
              <TabsTrigger variant="line" value="archive">Архив</TabsTrigger>
            </TabsList>
            <TabsContent value="all" class="pt-6 text-sm text-muted-foreground">Все осмотры.</TabsContent>
            <TabsContent value="mine" class="pt-6 text-sm text-muted-foreground">Осмотры текущего пользователя.</TabsContent>
            <TabsContent value="archive" class="pt-6 text-sm text-muted-foreground">Архив.</TabsContent>
          </Tabs>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">variant="pill" · мастер iconed_tab_list 2181:387</h3>
          <p class="mb-3 text-sm text-muted-foreground">
            Контейнер h44 r8 на accent/surface_soft с паддингом 4, табы вплотную. Активный —
            белая плашка с Button Shadow. Начертание не меняется, неактивный текст fg/secondary.
            В ките ровно два таба, а иконка и текст взаимоисключающи.
          </p>
          <div class="flex flex-wrap gap-6">
            <Tabs default-value="list">
              <TabsList variant="pill">
                <TabsTrigger variant="pill" value="list">
                  <template #icon><IconPlaceholder /></template>
                </TabsTrigger>
                <TabsTrigger variant="pill" value="cards">
                  <template #icon><IconPlaceholder /></template>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs default-value="a">
              <TabsList variant="pill">
                <TabsTrigger variant="pill" value="a">Кадры</TabsTrigger>
                <TabsTrigger variant="pill" value="b">Видео</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
    </ShowcaseSection>
  </main>
</template>
