<script setup lang="ts">
import { ref } from 'vue'
import { CHANGE_CLASS, CHANGES, COMPONENTS, HANDOVER, type ChangeClass } from '~/stands/kit-changes/draft'

/**
 * Стенд изменений кирпичиков версии передачи — правило 23 `docs/chat-protocol.md`, такт 54. Предложение чата, принятое
 * владельцем 2026-10-01: все изменённые простые компоненты версии, по компоненту; у каждой строки — класс изменения и живой
 * пример без экранного контекста. Список строк — `~/stands/kit-changes/draft.ts`, тот же текст — `CHANGELOG.md`.
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
</script>

<template>
  <main data-theme="rososmotr" class="mx-auto max-w-5xl space-y-10 bg-background px-6 py-10 font-sans text-foreground">
    <header class="space-y-3">
      <Heading level="page">
        Изменения кирпичиков
      </Heading>
      <p class="max-w-3xl text-sm text-foreground-secondary">
        Следующая версия передачи — черновик, относительно передачи 2026-09-30: имя метки и дату впишет такт закрытия круга
        правок экрана. Только простые компоненты, без экранного
        контекста: что изменилось в API, виде и поведении. Тот же список — <code>CHANGELOG.md</code> в корне репо и разделы
        «Изменения после передачи» в <code>index.ts</code> компонентов.
      </p>
      <p data-totals class="flex flex-wrap items-center gap-3 text-xs">
        <span v-for="x in counts" :key="x.c" class="inline-flex h-6 items-center rounded-full px-3 font-bold" :class="TONE[x.c]">
          {{ CHANGE_CLASS[x.c] }} — {{ x.n }}
        </span>
        <span class="text-muted-foreground">компонентов — {{ COMPONENTS.length }}, строк — {{ CHANGES.length }}</span>
      </p>
    </header>

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
  </main>
</template>
