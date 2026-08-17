<script setup lang="ts">
import { ref } from 'vue'

/**
 * Пилотная страница «Мои осмотры» — сборка из реестра.
 *
 * Эталон: файл дашборда `U829JoK7KMZV8do3KNkWBh`, узел `20304:54594`
 * («карточный вид 1280 — дефолтное состояние»), 1280×1764. Спек-страниц у
 * дашборда нет: источник один — макет.
 *
 * Правила: только компоненты реестра, ни одного значения мимо токенов. Всё,
 * чего не хватило, **не дорисовано на месте**, а вынесено строкой в таблицу
 * расхождений `docs/page-my-inspections.md`.
 */
useHead({ title: 'Мои осмотры' })

/**
 * Рельс меню. Иконки — из набора Material, подобраны по смыслу подписи:
 * соответствие «подпись на макете → имя глифа» в `docs/naming.md`.
 *
 * Подписи в компактном режиме не рисуются — у Атома их там нет вовсе. Строка в
 * таблице расхождений.
 */
const railGroups = [
  [
    { icon: 'home', label: 'Главная' },
    { icon: 'monitoring', label: 'Charts' },
    { icon: 'payments', label: 'Billing' },
    { icon: 'account-tree', label: 'Построение' },
  ],
  [{ icon: 'draft', label: 'Все доступные' }],
  [
    { icon: 'list', label: 'Все осмотры', selected: true },
    { icon: 'hourglass', label: 'Очередь' },
    { icon: 'account-tree', label: 'Проекты' },
    { icon: 'schedule', label: 'Незавершённые' },
  ],
  [
    { icon: 'admin', label: 'Администрирование' },
    { icon: 'settings', label: 'Системные' },
  ],
  [{ icon: 'person', label: 'Профиль' }],
] as const

const autoUpdate = ref(true)
const view = ref('cards')
const search = ref('')

/** Карточки осмотров. Данные выдуманные, состав — с макета. */
const cards = [
  { id: 1, cover: '', locked: false, multi: true, marks: ['cancelled', 'archived'], status: { color: 'red', text: 'Требуется повторить осмотр' }, user: null, blockAction: false },
  { id: 2, cover: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=720&q=60', locked: true, multi: true, marks: ['archived'], status: { color: 'violet', text: 'Экспертиза' }, user: { letter: 'К', name: 'Круппов Сергей Олегович', role: 'Эксперт' }, blockAction: false },
  { id: 3, cover: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=720&q=60', locked: true, multi: true, marks: [], status: { color: 'red', text: 'Требуется повторить осмотр' }, user: { letter: 'К', name: 'Круппов Сергей Олегович', role: 'Администратор' }, blockAction: false },
  { id: 4, cover: '', locked: false, multi: false, marks: ['cancelled', 'archived'], status: { color: 'green', text: 'Договор' }, user: null, blockAction: false },
  { id: 5, cover: '', locked: false, multi: true, marks: ['cancelled', 'archived'], status: { color: 'green', text: 'Договор' }, user: null, blockAction: true },
  { id: 6, cover: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=720&q=60', locked: false, multi: true, marks: [], status: { color: 'red', text: 'Требуется повторить осмотр' }, user: null, blockAction: false },
  { id: 7, cover: '', locked: false, multi: false, marks: [], status: { color: 'cyan', text: 'Осмотр не завершен' }, user: null, blockAction: false },
  { id: 8, cover: '', locked: false, multi: true, marks: [], status: { color: 'cyan', text: 'Осмотр не завершен' }, user: null, blockAction: false },
] as const

const statusFilters = ['Осмотр не завершён', 'Отправка на проверку', 'Проходит согласование', 'Требуется подтверждение', 'Экспертиза']
const propertyFilters = ['В архиве', 'Мультиосмотр', 'Отменен']
const companyFilters = ['Альфа Страхование', 'ДомКлик', 'Ренесанс', 'РГС', 'Сбер']
const accessFilters = [
  'АльфаСтрахование: Брокер КАССА',
  'АльфаСтрахование: Разработка схем',
  'АльфаСтрахование: Эксперты МРЦ',
  'Группа для тестирования Ренессанс.Осмотр бытовая техника',
  'Домклик (Загородная недвижимость)',
  'Интеллект Софт: Тест',
  'Ренессанс: страхование гаджетов и бытовой техники',
  'MAINS-Ренессанс',
]
const collapsedFilters = [
  'Длинный заголовок у пункта, который отображается в две строки',
  'Фильтр, который свернут и в нем есть отмеченные пункты',
]
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground">
    <!--
      Тёмный слой: шапка во всю ширину и рельс под ней. Внутри действуют только
      sidebar-токены — правило порталов сайдбара.
    -->
    <header
      data-slot="app-bar"
      class="flex h-14 items-center gap-6 bg-sidebar px-4 text-sidebar-foreground"
    >
      <!-- @debt Логотипа нет: логотипы РИР исключены из скоупа, логотип Рососмотра не отрисован. -->
      <span class="text-xl font-bold tracking-widest text-sidebar-active-foreground">VIEWAPP</span>

      <div class="ml-auto flex items-center gap-6 pr-4">
        <button type="button" class="flex items-center gap-2 text-sm outline-none">
          RU
          <Icon name="chevron-down" :size="8" />
        </button>

        <button type="button" class="flex items-center gap-2 text-sm outline-none">
          <Avatar type="letter" letter="Ш" :size="32" />
          Шипилов Михаил
          <Icon name="chevron-down" :size="8" />
        </button>

        <button type="button" aria-label="Выйти" class="flex outline-none">
          <Icon name="logout" :size="24" />
        </button>
      </div>
    </header>

    <div class="flex min-h-[calc(100vh-56px)]">
      <!-- Рельс: компактное меню Атома. У него 56 против 84 на макете — расхождение записано. -->
      <Menu compact class="shrink-0 py-2">
        <template v-for="(group, gi) in railGroups" :key="gi">
          <span v-if="gi > 0" class="my-2 h-px bg-sidebar-active" />
          <MenuItem
            v-for="item in group"
            :key="item.label"
            :selected="'selected' in item ? item.selected : false"
            :title="item.label"
          >
            <template #icon>
              <Icon :name="item.icon" :size="24" />
            </template>
            {{ item.label }}
          </MenuItem>
        </template>
      </Menu>

      <!-- Контент: колонка списка и колонка фильтров 348, зазор 24. -->
      <div class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_348px] content-start gap-6 px-8 py-6">
        <!-- Шапка списка. -->
        <div data-slot="page-header" class="col-start-1 row-start-1 flex h-11 items-center gap-4">
          <!-- Заголовок прижат к верху строки, соседи центрированы — так в макете. -->
          <h1 class="self-start text-4xl font-bold">
            Мои осмотры
          </h1>

          <Switch v-model="autoUpdate" class="w-auto">
            Автообновление списка
          </Switch>

          <button type="button" aria-label="Подсказка" class="flex text-foreground-secondary outline-none">
            <Icon name="help" :size="24" />
          </button>

          <!--
            Переключатель вида. Ближайшее системное — вкладки-таблетки. В макете
            это сегментированный контрол: подложка secondary, активная плашка
            белая. Расхождение записано.
          -->
          <Tabs v-model="view" class="ml-auto">
            <TabsList variant="pill" class="rounded-lg bg-secondary p-1">
              <TabsTrigger value="list" variant="pill" class="h-9 w-10 rounded-sm px-0">
                <Icon name="view-list" :size="24" />
              </TabsTrigger>
              <TabsTrigger value="cards" variant="pill" class="h-9 w-10 rounded-sm px-0">
                <Icon name="view-cards" :size="24" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <!-- Кнопка сворачивания фильтров — вровень с шапкой. -->
        <div class="col-start-2 row-start-1">
          <Button variant="secondary" wide>
            <template #icon>
              <Icon name="expand-circle-up" :size="24" />
            </template>
            Свернуть фильтры
          </Button>
        </div>

        <!-- Панель действий над списком. -->
        <div
          data-slot="list-toolbar"
          class="col-start-1 row-start-2 flex h-19 items-center gap-10 rounded-xl bg-secondary p-4"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="flex items-center gap-1">
              <Checkbox />
              <Icon name="chevron-down" :size="8" class="text-foreground-secondary" />
            </span>

            <div class="flex min-w-0 flex-1 items-center gap-3">
              <Input
                v-model="search"
                variant="elevated"
                placeholder="Наименование объекта или схемы, ID"
                class="min-w-0 flex-1"
              />
              <IconButton variant="ghost" size="lg" label="Обновить">
                <Icon name="refresh" :size="20" />
              </IconButton>
            </div>

            <div class="flex shrink-0 flex-col">
              <span class="text-sm font-bold">Найдено 64 787</span>
              <span class="text-sm text-foreground-secondary">Выбрано 0</span>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <IconButton size="lg" label="Ещё" disabled>
              <Icon name="more" :size="20" />
            </IconButton>
            <IconButton size="lg" label="Скачать">
              <Icon name="download" :size="20" />
            </IconButton>
            <IconButton size="lg" label="На карте">
              <Icon name="location" :size="20" />
            </IconButton>
          </div>
        </div>

        <!-- Сетка карточек: две колонки, зазор 24. -->
        <!-- items-start: карточки не тянутся до высоты строки — в макете они разной высоты. -->
        <div data-slot="cards-list" class="col-start-1 row-start-3 grid grid-cols-2 items-start gap-6">
          <article
            v-for="card in cards"
            :key="card.id"
            data-slot="inspection-card"
            class="flex flex-col gap-2"
          >
            <!-- Обложка: чекбокс слева сверху, метки поверх. -->
            <div class="relative overflow-hidden rounded-xl">
              <Image ratio="16:10" :src="card.cover || undefined" alt="" />

              <span class="absolute top-0 left-0 flex size-12 items-center justify-center bg-secondary">
                <Checkbox />
              </span>

              <!--
                Метки. В Атоме у `Badge` иконки нет вовсе, а цвет — семантическая
                роль, не палитра. Поэтому «Мультиосмотр» стоит на нейтральной
                роли, а не на фиолетовой рампе макета. Обе строки — в таблице.
              -->
              <span v-if="card.multi" class="absolute top-4 right-4">
                <Badge variant="neutral">Мультиосмотр</Badge>
              </span>

              <span class="absolute bottom-4 left-4 flex gap-2">
                <Badge v-if="card.marks.includes('cancelled')" variant="destructive">Отменён</Badge>
                <Badge v-if="card.marks.includes('archived')" variant="warning">В архиве</Badge>
              </span>
            </div>

            <!-- Сведения. -->
            <div class="flex flex-col gap-1">
              <span class="flex items-center gap-1">
                <Icon v-if="card.locked" name="lock" :size="14" class="text-primary" />
                <Hyperlink href="#">Номер оферты: 6323756800-нкл</Hyperlink>
              </span>

              <div class="flex items-start gap-9">
                <!-- Статус и дата идут вплотную: в макете блок 40 при двух строках по 20. -->
                <div class="flex min-w-0 flex-1 flex-col">
                  <StatusBadge :color="card.status.color">
                    {{ card.status.text }}
                  </StatusBadge>
                  <span class="text-sm text-foreground-secondary">3 фев, 2023 (пт), 06:49</span>
                </div>

                <span class="flex shrink-0 items-center gap-1 text-sm text-foreground-secondary">
                  ID 186 243
                  <Icon name="copy" :size="16" />
                </span>
              </div>

              <span class="truncate text-sm text-foreground-secondary">
                РФ, Ульяновская область, Сурский район, р.п....
              </span>
            </div>

            <!-- Блок блокировки. -->
            <div v-if="card.user" class="flex items-center gap-2">
              <Avatar type="letter" variant="soft" :letter="card.user.letter" :size="40" />
              <span class="flex min-w-0 flex-col">
                <span class="flex items-baseline gap-2">
                  <span class="truncate text-sm font-bold">{{ card.user.name }}</span>
                  <span class="shrink-0 text-xs text-foreground-secondary">{{ card.user.role }}</span>
                </span>
                <span class="text-sm text-foreground-secondary">Заблокировал в 14:44, 14 мая 2024</span>
              </span>
            </div>

            <span v-if="card.blockAction">
              <Button variant="secondary" size="sm">Заблокировать за мной</Button>
            </span>
          </article>
        </div>

        <!-- Пагинация: в кадре эталона она за нижним краем, но в композиции есть. -->
        <div class="col-start-1 row-start-4 rounded-xl bg-card p-4">
          <Pagination :page="1" :pages="12" />
        </div>

        <!-- Колонка фильтров. -->
        <aside data-slot="filters" class="col-start-2 row-span-3 row-start-2 flex flex-col gap-6">
          <section class="flex flex-col gap-6 rounded-xl bg-card p-4">
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-lg font-bold">
                  Сохраненные отборы
                </h2>
                <Icon name="chevron-up" :size="24" class="text-foreground-secondary" />
              </div>
              <p class="text-sm text-foreground-secondary">
                Сохранённых поисков пока нет
              </p>
            </div>

            <Button variant="secondary" wide :show-icon="false">
              Сохранить текущий поиск
            </Button>
          </section>

          <section class="flex flex-col gap-6 rounded-xl bg-card p-4">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-bold">
                Фильтры
              </h2>
              <ButtonAction :show-icon="false">
                Показать все
              </ButtonAction>
            </div>

            <Accordion default-open>
              <template #title>
                Статус
              </template>
              <div class="flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in statusFilters" :key="f">
                  {{ f }}
                </Checkbox>
              </div>
            </Accordion>

            <Accordion default-open>
              <template #title>
                Дата создания
              </template>
              <div class="flex items-center gap-2 pt-1">
                <DatePicker placeholder="дд.мм.гггг" class="min-w-0 flex-1" />
                <span class="text-foreground-secondary">—</span>
                <DatePicker placeholder="дд.мм.гггг" class="min-w-0 flex-1" />
              </div>
            </Accordion>

            <Accordion default-open>
              <template #title>
                Особые свойства
              </template>
              <div class="flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in propertyFilters" :key="f">
                  {{ f }}
                </Checkbox>
              </div>
            </Accordion>

            <Accordion default-open>
              <template #title>
                Компания
              </template>
              <div class="flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in companyFilters" :key="f">
                  {{ f }}
                </Checkbox>
                <ButtonAction :show-icon="false" size="sm">
                  Показать все
                </ButtonAction>
              </div>
            </Accordion>

            <Accordion v-for="title in collapsedFilters" :key="title">
              <template #title>
                {{ title }}
              </template>
              <span />
            </Accordion>

            <Accordion default-open>
              <template #title>
                Группа доступа
              </template>
              <div class="flex flex-col gap-2 pt-1">
                <ButtonAction :show-icon="false" size="sm">
                  Выбрать все
                </ButtonAction>
                <Checkbox v-for="f in accessFilters" :key="f">
                  {{ f }}
                </Checkbox>
                <ButtonAction :show-icon="false" size="sm">
                  Свернуть
                </ButtonAction>
              </div>
            </Accordion>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>
