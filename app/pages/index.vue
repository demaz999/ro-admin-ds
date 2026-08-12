<script setup lang="ts">
import { onMounted, ref } from 'vue'

useHead({ title: 'Витрина — админский дизайн-кит' })

/** Состояние focus нельзя показать статикой — наводим его программно на один экземпляр. */
const focusedInput = ref<HTMLElement | null>(null)

onMounted(() => {
  focusedInput.value?.querySelector('input')?.focus()
})

const buttonVariants = ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'] as const
const badgeColors = ['violet', 'red', 'orange'] as const
const statusColors = ['green', 'cyan', 'violet', 'magenta', 'orange', 'red'] as const

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

      <div class="mt-6 space-y-3">
        <p class="text-4xl font-bold">
          Заголовок страницы — Мои осмотры
        </p>
        <p class="text-xl font-medium">
          Заголовок раздела — Фильтры
        </p>
        <p class="text-base">
          Основной текст. Проверка кириллицы: съешь ещё этих мягких французских булок.
        </p>
        <p class="text-sm text-muted-foreground">
          Вспомогательный текст и подписи полей.
        </p>
        <p class="font-mono text-sm">
          Моноширинный: ID 4815162342
        </p>
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
      note="В ките 1 кнопка разложена на 12 отдельных компонент-сетов. Здесь это один компонент с пропом variant: btn_accent → default, btn_txt → ghost, btn_remove → destructive. Значения вариантов ниже — ещё дефолтные shadcn, не из кита."
    >
      <div class="space-y-6">
        <div>
          <h3 class="mb-3 text-sm font-medium">
            Варианты
          </h3>
          <div class="flex flex-wrap gap-3">
            <Button v-for="v in buttonVariants" :key="v" :variant="v">
              {{ v }}
            </Button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <ShowcaseCell label="default">
            <Button>Найти</Button>
          </ShowcaseCell>
          <ShowcaseCell label="hover" hint="наведите курсор">
            <Button>Найти</Button>
          </ShowcaseCell>
          <ShowcaseCell label="focus" hint="Tab до кнопки">
            <Button>Найти</Button>
          </ShowcaseCell>
          <ShowcaseCell label="disabled">
            <Button disabled>
              Найти
            </Button>
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Размеры
          </h3>
          <div class="flex flex-wrap items-center gap-3">
            <Button size="sm">
              Маленькая
            </Button>
            <Button size="default">
              Обычная
            </Button>
            <Button size="lg">
              Большая
            </Button>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Input"
      note="Состояния сняты с мастера кита: везде рамка 1px, кольца нет ни в одном состоянии. В disabled поле остаётся белым — гаснут рамка и текст. Полевая обёртка (подпись, подсказка, счётчик, раскладки слева/сверху) — компонент InputField в волне 1, см. docs/waves.md."
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <ShowcaseCell label="default">
          <Input placeholder="Номер осмотра" />
        </ShowcaseCell>
        <ShowcaseCell label="focus" hint="наведён программно">
          <div ref="focusedInput" class="w-full">
            <Input placeholder="Номер осмотра" />
          </div>
        </ShowcaseCell>
        <ShowcaseCell label="filled">
          <Input model-value="4815162342" />
        </ShowcaseCell>
        <ShowcaseCell label="disabled">
          <Input disabled placeholder="Номер осмотра" />
        </ShowcaseCell>
        <ShowcaseCell label="error" hint="рамка 1px, красные подсказка и счётчик">
          <div class="w-full space-y-1">
            <Input aria-invalid="true" model-value="абв" />
            <div class="flex justify-between gap-4 text-xs">
              <span class="text-destructive">Только цифры</span>
              <span class="text-destructive">3/10</span>
            </div>
          </div>
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

    <ShowcaseSection title="Tabs">
      <Tabs default-value="all" class="w-full">
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
    </ShowcaseSection>
  </main>
</template>
