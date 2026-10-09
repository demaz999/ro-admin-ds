<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Примеры узкого экрана для стенда изменений `/kit-changes` — такт 92 (правило 23б: пример на `/kit-changes` у каждого добавления к
 * переданному). Оси узкого экрана срабатывают по ширине окна — ниже 768; стенд изменений открыт на рабочем столе,
 * поэтому пример живёт отдельной страницей и встаёт в стенд рамкой 375 × 480 (`iframe`). Случай — параметр `?case=`; без экранного
 * контекста, только компоненты кита. Оснастка стенда, в продукт не идёт.
 *
 * | `?case=` | что показано |
 * |---|---|
 * | `modal` | `ModalCardContent narrow="full"` — сайд во всё окно: действия шапки под заголовком, текст подвала над кнопками |
 * | `dock` | `ActionBar layout="dock"` — полоса главного действия у низа окна |
 * | `popover` | `PopoverContent narrow="full"` — плашка во всю ширину и до края окна |
 * | `text` | `Heading lines`, `Callout narrow="stack"`, подсказка `Field` в две строки |
 * | `toaster` | `Toaster narrow="full"` — уведомление во всю ширину с полями 16 |
 * | `frame` | каркас `admin.vue` на узком экране; `&drawer=1` — выезжающая панель меню (`ModalCard side="left" surface="sidebar"`) |
 * | `page` | формат страницы каркаса (такт 96): поля 16 по бокам и 16 сверху, баннер-ухо (слот `banner`), «Назад» (слот `back`) и заголовок через 12 |
 */
definePageMeta({ layout: false })
useHead({ title: 'Узкий экран — примеры изменений кита' })

const route = useRoute()
const kind = computed(() => String(route.query.case ?? 'modal'))
const modalOpen = ref(true)
const popoverOpen = ref(true)
const toasts = ref([1])
const mode = ref('steps')
/** Такт 96: баннер-ухо примера закрывается. */
const bannerClosed = ref(false)
</script>

<template>
  <!-- Кадр примера — фон и гарнитура темы на корне; каркас (`frame`) несёт их сам. -->
  <!-- Такт 96: формат страницы — баннер, «Назад», заголовок; поля и зазоры ставит каркас. -->
  <NuxtLayout v-if="kind === 'page'" name="admin">
    <template v-if="!bannerClosed" #banner>
      <Callout tone="warning" closable @close="bannerClosed = true">
        Баннер-ухо страницы — первой строкой, над «Назад»
      </Callout>
    </template>
    <template #back>
      <ButtonNavigation size="base" direction="left">
        Назад
      </ButtonNavigation>
    </template>
    <Heading level="page" as="h1">
      Заголовок страницы
    </Heading>
    <Callout>
      Поля рабочей зоны — 16 по бокам и сверху; «Назад» → заголовок — 12
    </Callout>
  </NuxtLayout>
  <NuxtLayout v-else-if="kind === 'frame'" name="admin">
    <Heading level="title" as="h1">
      Каркас на узком экране
    </Heading>
    <Callout>
      Ниже 1024 меню скрыто: бургер открывает выезжающую панель меню слева
    </Callout>
  </NuxtLayout>
  <main v-else data-theme="rososmotr" class="min-h-screen bg-background p-4 font-sans text-foreground" :data-case="kind">
    <template v-if="kind === 'modal'">
      <ModalCard v-model:open="modalOpen">
        <ModalCardContent placement="edge" narrow="full">
          <ModalCardHeader title="Демо-осмотр — КАСКО" subtitle="По черновику · логика не выполняется">
            <template #actions>
              <Tabs v-model="mode">
                <TabsList variant="segmented">
                  <TabsTrigger value="steps" variant="segmented">
                    По шагам
                  </TabsTrigger>
                  <TabsTrigger value="map" variant="segmented">
                    Карта
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="secondary">
                Вернуться к схеме
              </Button>
            </template>
          </ModalCardHeader>
          <ModalCardBody>
            <ModalCardText>Сайд во всё окно: действия шапки — строкой под заголовком, текст подвала — над кнопками</ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <template #note>
              После публикации создаётся неизменяемый снимок версии
            </template>
            <Button variant="secondary">
              Отмена
            </Button>
            <Button>
              Опубликовать
            </Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>
    </template>

    <template v-else-if="kind === 'dock'">
      <div class="flex flex-col gap-4 pb-20">
        <Heading level="title" as="h1">
          КАСКО — осмотр легкового автомобиля
        </Heading>
        <Callout>Главное действие закреплено у низа окна</Callout>
      </div>
      <ActionBar layout="dock" count="Публикация схемы">
        <Button class="min-w-0 flex-1">
          Опубликовать схему
        </Button>
        <IconButton variant="secondary" size="lg" label="Действия со схемой">
          <Icon name="more" :size="20" />
        </IconButton>
      </ActionBar>
    </template>

    <template v-else-if="kind === 'popover'">
      <Popover v-model:open="popoverOpen">
        <PopoverAnchor as-child>
          <div>
            <Input model-value="фото" placeholder="Поиск по настройкам схемы" />
          </div>
        </PopoverAnchor>
        <PopoverContent align="start" :side-offset="4" :width="846" narrow="full" class="p-1">
          <SelectGroup header="Настройки → Мобильное приложение">
            <SelectItem>Разрешение фото</SelectItem>
          </SelectGroup>
          <SelectGroup header="Настройки → Аномалии">
            <SelectItem>Детектор «Размытые изображения»</SelectItem>
            <SelectItem>Детектор «Съёмка с экрана»</SelectItem>
          </SelectGroup>
        </PopoverContent>
      </Popover>
    </template>

    <template v-else-if="kind === 'text'">
      <div class="flex flex-col gap-4">
        <Heading level="title" as="h1" :lines="3">
          КАСКО — комплексный осмотр легкового автомобиля перед оформлением полиса добровольного страхования с выездом
        </Heading>
        <Callout title="Статус витрины: Черновик карточки" narrow="stack">
          Карточка появится на витрине после публикации
          <template #actions>
            <Button variant="outline" size="sm">
              Предпросмотр страницы
            </Button>
            <Button variant="secondary" size="sm">
              Опубликовать на витрину
            </Button>
          </template>
        </Callout>
        <Field label="Описание" hint="Описание поможет различать схемы в общем списке и даст понимание ИИ, какую схему применять">
          <Textarea model-value="" placeholder="Введите описание схемы осмотра" />
        </Field>
      </div>
    </template>

    <template v-else-if="kind === 'toaster'">
      <Callout>Уведомление во всю ширину окна с полями 16</Callout>
      <Toaster narrow="full">
        <Toast v-for="n in toasts" :key="n" :open="true" :duration="600000" show-action @update:open="toasts = []">
          Настройка «Детектор „Размытые изображения“» выключена
          <template #action>
            Отменить
          </template>
        </Toast>
      </Toaster>
    </template>
  </main>
</template>
