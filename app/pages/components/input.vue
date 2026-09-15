<script setup lang="ts">
import { ref } from 'vue'
import { inputGuide } from '~/components/showcase/input-guide'

useHead({ title: 'Поле ввода — гайд Рососмотра' })

const themes = [
  { value: 'rososmotr', label: 'rososmotr' },
  { value: 'atom', label: 'atom' },
] as const

const theme = ref<typeof themes[number]['value']>('rososmotr')
const demoValue = ref('')
const clearValue = ref('Акт № 1248')
const counterValue = ref('Плановый')
</script>

<template>
  <main :data-theme="theme" class="min-h-screen bg-background font-sans text-foreground">
    <div class="mx-auto max-w-6xl px-6 py-10">
      <header class="mb-12 space-y-6 border-b border-border pb-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <NuxtLink to="/" class="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            ← Вся витрина
          </NuxtLink>
          <div class="flex items-center gap-3" aria-label="Тема гайда">
            <span class="text-xs text-muted-foreground">Тема</span>
            <div class="flex gap-1">
              <button
                v-for="item in themes"
                :key="item.value"
                type="button"
                class="rounded-xs px-3 py-1.5 text-sm"
                :class="theme === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                :aria-pressed="theme === item.value"
                @click="theme = item.value"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="max-w-3xl space-y-4">
          <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Компоненты · Input
          </p>
          <h1 class="text-4xl font-bold">
            {{ inputGuide.title }}
          </h1>
          <p class="max-w-2xl text-lg text-muted-foreground">
            {{ inputGuide.lead }}
          </p>
        </div>

        <div class="max-w-2xl rounded-md border border-border bg-card p-6">
          <Field label="Поиск по осмотрам" hint="Например, номер акта или адрес">
            <Input v-model="demoValue" placeholder="Поисковый запрос" clearable />
          </Field>
        </div>
      </header>

      <div class="grid gap-12 lg:grid-cols-4">
        <aside class="lg:col-span-1">
          <nav class="sticky top-8" aria-label="На этой странице">
            <p class="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              На этой странице
            </p>
            <ol class="space-y-2 border-l border-border pl-4">
              <li v-for="item in inputGuide.toc" :key="item.id">
                <a :href="`#${item.id}`" class="text-sm text-muted-foreground hover:text-foreground">
                  {{ item.label }}
                </a>
              </li>
            </ol>
          </nav>
        </aside>

        <article class="min-w-0 space-y-16 lg:col-span-3">
          <section id="purpose" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Когда использовать
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                Сначала определите тип значения, затем выбирайте контрол.
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div
                v-for="choice in inputGuide.choices"
                :key="choice.title"
                class="rounded-md border border-border bg-card p-5"
                :class="'request' in choice ? 'md:col-span-2' : undefined"
              >
                <h3 class="mb-2 text-lg font-bold">
                  {{ choice.title }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ choice.text }}
                </p>
                <p v-if="'request' in choice" class="mt-3 text-xs font-medium text-muted-foreground">
                  Запрос в кит: {{ choice.request }}
                </p>
              </div>
            </div>
          </section>

          <section id="label" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Название поля
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                Название отвечает на вопрос «что ввести» и остаётся видимым после заполнения.
              </p>
            </div>
            <ul class="space-y-3">
              <li v-for="rule in inputGuide.labelRules" :key="rule" class="flex gap-3 text-sm">
                <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span class="max-w-2xl">{{ rule }}</span>
              </li>
            </ul>
            <div class="grid gap-6 rounded-md border border-border bg-card p-6 md:grid-cols-2">
              <Field label="Номер акта" hint="Название сверху">
                <Input placeholder="Например, 1248" :show-icon="false" />
              </Field>
              <Field label="Адрес" orientation="left">
                <Input placeholder="Населённый пункт" :show-icon="false" />
              </Field>
            </div>
          </section>

          <section id="behavior" class="scroll-mt-8 space-y-8">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Как работает
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                Правило, живой пример и фактическое поведение кита.
              </p>
            </div>
            <div v-for="item in inputGuide.behavior" :key="item.title" class="space-y-4 border-t border-border pt-6">
              <div class="max-w-2xl space-y-2">
                <h3 class="text-lg font-bold">
                  {{ item.title }}
                </h3>
                <p class="text-sm font-medium">
                  {{ item.rule }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ item.note }}
                </p>
              </div>
              <div v-if="item.title === 'Плейсхолдер'" class="max-w-lg rounded-md border border-border bg-card p-6">
                <Field label="Контактное лицо" hint="Имя и фамилия, без должности">
                  <Input placeholder="Например, Анна Петрова" :show-icon="false" />
                </Field>
              </div>
              <div v-else-if="item.title === 'Очистка'" class="max-w-lg rounded-md border border-border bg-card p-6">
                <Input v-model="clearValue" placeholder="Номер акта" clearable />
              </div>
              <div v-else class="max-w-lg rounded-md border border-border bg-card p-6">
                <Field label="Название проверки" hint="До 25 символов" :counter="`${counterValue.length}/25`">
                  <Input v-model="counterValue" placeholder="Название" :show-icon="false" />
                </Field>
              </div>
            </div>
          </section>

          <section id="variants" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Варианты и состояния
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                filled — базовое поле. elevated нужен на поверхности, где поле отделяется тенью. Состояния не задаются декоративно вокруг компонента.
              </p>
            </div>
            <div class="grid gap-6 md:grid-cols-2">
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">filled</p>
                <Input placeholder="Пустое поле" />
                <Input model-value="Заполнено" placeholder="Значение" />
              </div>
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">elevated</p>
                <Input variant="elevated" placeholder="Пустое поле" />
                <Input variant="elevated" model-value="Заполнено" placeholder="Значение" />
              </div>
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ошибка</p>
                <Input invalid error-text="Заполните поле" placeholder="Номер акта" :show-icon="false" />
              </div>
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Недоступно</p>
                <Input disabled model-value="Закрытая проверка" placeholder="Проверка" :show-icon="false" />
              </div>
            </div>
          </section>

          <section id="layout" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Размер и расположение
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                В ките два размера: md для обычных форм и lg для главного контрола сценария. Ширина должна помогать оценить ожидаемую длину значения; в одной форме не нужно много случайных ширин.
              </p>
            </div>
            <div class="space-y-6 rounded-md border border-border bg-card p-6">
              <div class="max-w-lg space-y-2">
                <p class="text-xs font-bold text-muted-foreground">md · 40</p>
                <Input placeholder="Обычное поле" :show-icon="false" />
              </div>
              <div class="max-w-2xl space-y-2">
                <p class="text-xs font-bold text-muted-foreground">lg · 64</p>
                <Input size="lg" placeholder="Главный поиск" />
              </div>
            </div>
          </section>

          <section id="keyboard" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Управление клавиатурой
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                Фокус по клику и по Tab должен выглядеть одинаково. Пройдите два поля ниже клавишей Tab.
              </p>
            </div>
            <div class="grid gap-6 rounded-md border border-border bg-card p-6 md:grid-cols-2">
              <Input placeholder="Первое поле" :show-icon="false" />
              <Input placeholder="Второе поле" :show-icon="false" />
            </div>
            <div class="overflow-hidden rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted text-muted-foreground">
                  <tr>
                    <th class="px-4 py-3 font-medium">Клавиша</th>
                    <th class="px-4 py-3 font-medium">Результат</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in inputGuide.keyboard" :key="row.key" class="border-t border-border">
                    <td class="px-4 py-3 font-medium">{{ row.key }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ row.result }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="api" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Фактический API
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                Только доступные сейчас пропы и слоты. Нативное поле всегда имеет type=text.
              </p>
            </div>
            <div class="overflow-hidden rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted text-muted-foreground">
                  <tr>
                    <th class="px-4 py-3 font-medium">Проп</th>
                    <th class="px-4 py-3 font-medium">Значения</th>
                    <th class="px-4 py-3 font-medium">Назначение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in inputGuide.api" :key="row.name" class="border-t border-border align-top">
                    <td class="px-4 py-3 font-mono text-xs">{{ row.name }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ row.values }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ row.purpose }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="rounded-md border border-border bg-secondary p-5 text-sm">
              <p class="font-bold">Открытые ограничения</p>
              <p class="mt-2 max-w-2xl text-muted-foreground">
                Маска и передача нативных атрибутов не поддержаны; Field не связывает название с нативным input; кнопка очистки не гарантирует перевод фокуса в поле. Запросы SHOWCASE-INPUT-001…004 открыты для кита.
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  </main>
</template>
