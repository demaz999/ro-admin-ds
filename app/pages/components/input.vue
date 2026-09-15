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
const clearEmptyValue = ref('')
const counterValue = ref('Плановый')
const query = ref('')
const actNumber = ref('')
const primarySearch = ref('')
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
                {{ inputGuide.purpose.intro }}
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div
                v-for="choice in inputGuide.purpose.choices"
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
                {{ inputGuide.label.intro }}
              </p>
            </div>
            <ul class="space-y-3">
              <li v-for="rule in inputGuide.label.rules" :key="rule" class="flex gap-3 text-sm">
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
            <div class="space-y-4 border-t border-border pt-6">
              <h3 class="text-lg font-bold">
                {{ inputGuide.label.comparison.title }}
              </h3>
              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-3 rounded-md border border-border bg-card p-5">
                  <p class="text-xs font-bold uppercase tracking-widest text-destructive">Неправильно</p>
                  <Field label="Введите ваш адрес:">
                    <Input placeholder="Адрес" :show-icon="false" />
                  </Field>
                  <p class="text-xs text-muted-foreground">{{ inputGuide.label.comparison.wrong }}</p>
                </div>
                <div class="space-y-3 rounded-md border border-border bg-card p-5">
                  <p class="text-xs font-bold uppercase tracking-widest text-success">Правильно</p>
                  <Field label="Адрес">
                    <Input placeholder="Населённый пункт и улица" :show-icon="false" />
                  </Field>
                  <p class="text-xs text-muted-foreground">{{ inputGuide.label.comparison.right }}</p>
                </div>
              </div>
            </div>
          </section>

          <section id="behavior" class="scroll-mt-8 space-y-8">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Как работает
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                {{ inputGuide.behavior.intro }}
              </p>
            </div>
            <div v-for="item in inputGuide.behavior.items" :key="item.id" class="space-y-4 border-t border-border pt-6">
              <div class="max-w-2xl space-y-2">
                <h3 class="text-lg font-bold">
                  {{ item.title }}
                </h3>
                <p class="text-sm font-medium">
                  {{ item.rule }}
                </p>
                <ul class="space-y-2 text-sm text-muted-foreground">
                  <li v-for="fact in item.facts" :key="fact" class="flex gap-3">
                    <span class="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    <span>{{ fact }}</span>
                  </li>
                </ul>
              </div>
              <div v-if="item.id === 'placeholder'" class="max-w-lg rounded-md border border-border bg-card p-6">
                <Field label="Контактное лицо" hint="Имя и фамилия, без должности">
                  <Input placeholder="Например, Анна Петрова" :show-icon="false" />
                </Field>
              </div>
              <div v-else-if="item.id === 'clear'" class="grid max-w-2xl gap-6 rounded-md border border-border bg-card p-6 md:grid-cols-2">
                <div data-demo="clear-empty" class="space-y-2">
                  <p class="text-xs font-bold text-muted-foreground">Пустое</p>
                  <Input v-model="clearEmptyValue" placeholder="Номер акта" clearable />
                </div>
                <div data-demo="clear-filled" class="space-y-2">
                  <p class="text-xs font-bold text-muted-foreground">Заполненное</p>
                  <Input v-model="clearValue" placeholder="Номер акта" clearable />
                </div>
              </div>
              <div v-else class="max-w-lg rounded-md border border-border bg-card p-6">
                <Field label="Название проверки" hint="До 25 символов" :counter="`${counterValue.length}/25`">
                  <Input v-model="counterValue" placeholder="Название" :show-icon="false" />
                </Field>
              </div>
            </div>

            <div class="space-y-4 border-t border-border pt-6">
              <h3 class="text-lg font-bold">
                {{ inputGuide.behavior.valueComparison.title }}
              </h3>
              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-3 rounded-md border border-border bg-card p-5">
                  <p class="text-xs font-bold uppercase tracking-widest text-destructive">Неправильно</p>
                  <Input placeholder="Анна Петрова" :show-icon="false" />
                  <p class="text-xs text-muted-foreground">{{ inputGuide.behavior.valueComparison.wrong }}</p>
                </div>
                <div class="space-y-3 rounded-md border border-border bg-card p-5">
                  <p class="text-xs font-bold uppercase tracking-widest text-success">Правильно</p>
                  <Input model-value="Анна Петрова" placeholder="Контактное лицо" :show-icon="false" />
                  <p class="text-xs text-muted-foreground">{{ inputGuide.behavior.valueComparison.right }}</p>
                </div>
              </div>
            </div>
          </section>

          <section id="variants" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Варианты и состояния
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                {{ inputGuide.variants.intro }}
              </p>
            </div>
            <div class="grid gap-6 md:grid-cols-2">
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">filled</p>
                <p class="text-xs text-muted-foreground">{{ inputGuide.variants.facts[0].text }}</p>
                <Input placeholder="Пустое поле" />
                <Input model-value="Заполнено" placeholder="Значение" />
              </div>
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">elevated</p>
                <p class="text-xs text-muted-foreground">{{ inputGuide.variants.facts[1].text }}</p>
                <Input variant="elevated" placeholder="Пустое поле" />
                <Input variant="elevated" model-value="Заполнено" placeholder="Значение" />
              </div>
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ошибка</p>
                <p class="text-xs text-muted-foreground">{{ inputGuide.variants.facts[2].text }}</p>
                <Input invalid error-text="Заполните поле" placeholder="Номер акта" :show-icon="false" />
              </div>
              <div class="space-y-3 rounded-md border border-border bg-card p-5">
                <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Недоступно</p>
                <p class="text-xs text-muted-foreground">{{ inputGuide.variants.facts[3].text }}</p>
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
                {{ inputGuide.layout.intro }}
              </p>
            </div>
            <ul class="space-y-3">
              <li v-for="rule in inputGuide.layout.rules" :key="rule" class="flex gap-3 text-sm">
                <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span class="max-w-2xl">{{ rule }}</span>
              </li>
            </ul>
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
            <div class="space-y-4 border-t border-border pt-6">
              <h3 class="text-lg font-bold">
                {{ inputGuide.layout.comparison.title }}
              </h3>
              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-3 rounded-md border border-border bg-card p-5">
                  <p class="text-xs font-bold uppercase tracking-widest text-destructive">Неправильно</p>
                  <Input placeholder="Номер акта" :show-icon="false" />
                  <p class="text-xs text-muted-foreground">{{ inputGuide.layout.comparison.wrong }}</p>
                </div>
                <div class="space-y-3 rounded-md border border-border bg-card p-5">
                  <p class="text-xs font-bold uppercase tracking-widest text-success">Правильно</p>
                  <div class="max-w-52">
                    <Input placeholder="Номер акта" :show-icon="false" />
                  </div>
                  <p class="text-xs text-muted-foreground">{{ inputGuide.layout.comparison.right }}</p>
                </div>
              </div>
            </div>
          </section>

          <section id="keyboard" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Управление клавиатурой
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                {{ inputGuide.keyboard.intro }}
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
                  <tr v-for="row in inputGuide.keyboard.keys" :key="row.key" class="border-t border-border">
                    <td class="px-4 py-3 font-medium">{{ row.key }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ row.result }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="max-w-2xl text-sm text-muted-foreground">
              {{ inputGuide.keyboard.note }}
            </p>
          </section>

          <section id="code" class="scroll-mt-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold">
                Использование в коде
              </h2>
              <p class="max-w-2xl text-sm text-muted-foreground">
                {{ inputGuide.code.intro }}
              </p>
            </div>
            <div class="space-y-6">
              <div
                v-for="example in inputGuide.code.examples"
                :key="example.id"
                class="grid gap-4 rounded-md border border-border bg-card p-5 md:grid-cols-2"
              >
                <div class="space-y-3">
                  <h3 class="text-lg font-bold">{{ example.title }}</h3>
                  <pre class="overflow-x-auto rounded-md bg-muted p-4 text-xs"><code>{{ example.code }}</code></pre>
                </div>
                <div class="flex items-center">
                  <Input
                    v-if="example.id === 'search'"
                    v-model="query"
                    placeholder="Поисковый запрос"
                    clearable
                  />
                  <Field v-else-if="example.id === 'field'" label="Номер акта" hint="До 12 символов" class="w-full">
                    <Input v-model="actNumber" :show-icon="false" />
                  </Field>
                  <Input
                    v-else
                    v-model="primarySearch"
                    size="lg"
                    variant="elevated"
                    placeholder="Главный поиск"
                  />
                </div>
              </div>
            </div>
            <div class="rounded-md border border-border bg-secondary p-5 text-sm">
              <p class="font-bold">Открытые ограничения</p>
              <p class="mt-2 max-w-2xl text-muted-foreground">
                {{ inputGuide.code.limitations }}
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  </main>
</template>
