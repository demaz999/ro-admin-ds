<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

/**
 * Каркас админки — одна рамка в ките (такт 48, решение чата по правилу 21, ворота 1 «одна шапка в ките»):
 * тёмная верхняя полоса во всю ширину с бургером и логотипом, под ней — боковое меню слева и светлая область
 * содержимого.
 *
 * Источник — Figma VIEWAPP Web Dashboard (`U829JoK7KMZV8do3KNkWBh`), решение владельца 2026-10-01: верхний бар
 * `top_menu` `33970:14832` и свёрнутое боковое меню `left_menu` `33970:14833`. Числа полосы — `ui/app-bar/index.ts`,
 * числа пункта меню — `ui/menu/index.ts` (мастер кита 1 `left_menu` `643:3053` / `644:6545`, такт 9).
 *
 * До такта 48 (такты 8–9, 42) сайдбар занимал всю высоту, логотип с бургером жили в нём, полоса начиналась от его
 * правого края.
 *
 * ## Как страница встаёт на каркас
 *
 * | Что | Как |
 * |---|---|
 * | типовая страница | `definePageMeta({ layout: 'admin' })` — меню развёрнуто, содержимое с полями 16 по бокам и сверху (такт 96; до него 32 / 24) |
 * | экран во всё окно (`/free-shoot`) | `<NuxtLayout name="admin" fill menu="compact">` — меню свёрнуто, содержимое без полей на высоту окна |
 * | свои пункты полосы | слот `bar` — встают в правый блок полосы перед языком и профилем |
 * | «Назад» над заголовком | слот `back` у `<NuxtLayout name="admin">` — каркас ставит «Назад» первой строкой и держит 12 до заголовка; с закреплённой шапкой «Назад» стоит в ней (такт 96) |
 * | баннер-ухо страницы | слот `banner` — `Callout` первой строкой страницы, над «Назад», до него 16; уходит с прокруткой, в закреплённую шапку не входит (такт 96) |
 * | закреплённая шапка страницы | слот `header` у `<NuxtLayout name="admin">` — липнет к верху окна при прокрутке, подложка — фон рабочей зоны (такт 78, «Тарификация»: «Сохранить изменения» закреплена сверху, §11 сводки) |
 * | меню экрана во всё окно, развёрнутое бургером | двигает содержимое, как на типовой странице (такт 55, решение владельца 2026-10-01): рабочая зона сужается на 172 и подстраивается сама; такт 50 клал меню поверх содержимого |
 *
 * «Мои осмотры» на этот каркас не переведены — у страницы свой рельс, решение такта 8.
 *
 * ## Узкий экран — уже 1024 (такт 92)
 *
 * Решение 4 оркестратора 2026-10-08 (промпт такта 92; ревью `docs/scheme-edit-review.md`, 4.10): ниже 1024 левое меню
 * скрыто, бургер верхней полосы открывает его выезжающей панелью — `ModalCard` с краем `side="left"` и поверхностью
 * `surface="sidebar"` (внутри — `sidebar`-токены, правило порталов сайдбара). Панель: строка 56 с «Закрыть меню» и логотипом,
 * меню целиком в развёрнутом виде с прокруткой, внизу — язык и выход. Верхняя полоса компактная: бургер, логотип и
 * аватар профиля; язык, имя профиля, выход и пункты страницы (слот `bar`) уходят с полосы. Поля рабочей зоны — 16 по бокам.
 * Пункт меню со страницей стенда в выезжающей панели ведёт на неё и закрывает панель; панель закрывают крестик, Esc, клик мимо,
 * переход и выход окна на ширину рабочего стола. Рабочий стол (1024 и шире) прежний — меню, полоса и поведение пунктов.
 *
 * ## Состав меню — `left_menu` `33970:14833`
 *
 * Пять групп: Главная, Charts, Billing, Построить отчёт | Все доступные осмотры | Все осмотры, Очередь на проверку,
 * Проекты осмотров, Незавершённые осмотры | Администрирование, Системное | Профиль. Подписи групп развёрнутого меню
 * («Осмотры», «Инструменты») — с тактов 8–9: узел `33970:14833` показывает только свёрнутое меню.
 *
 * Внутри тёмной полосы и меню действует правило порталов сайдбара: только `sidebar-*`-токены. Бургер и выход —
 * `IconButton variant="sidebar"`, язык и профиль — `Button variant="sidebar"`.
 *
 * ## Изменения после передачи
 *
 * Правило 23 `docs/chat-protocol.md`: каркас передан фронтам версией `handover-2026-10-01` (пакет составных компонентов
 * `free-shoot.md`, раздел 32); каждое изменение маркируется здесь, в `CHANGELOG.md` и в «Передано фронтам».
 *
 * ### Черновик следующей версии — относительно `handover-2026-10-02`
 *
 * - **Добавлено.** Слот `header` — закреплённая шапка страницы: липнет к верху окна при прокрутке, подложка — фон рабочей зоны,
 *   поля 24 сверху и 12 снизу; в покое место шапки прежнее. Без слота каркас прежний. Такт 78.
 * - **Добавлено.** Узкий экран — уже 1024: левое меню скрыто; бургер открывает выезжающую панель меню слева во всю высоту
 *   (`--sidebar`, ширина меню 256, скругление 48 справа сверху, подложка окна): строка 56 — «Закрыть меню» и логотип, меню
 *   развёрнутым с прокруткой, внизу — язык и выход; пункт со страницей ведёт на неё и закрывает панель; крестик, Esc,
 *   клик мимо и переход закрывают панель, фокус возвращается на бургер. Верхняя полоса компактная: бургер, логотип и аватар
 *   профиля без имени; язык, выход и пункты страницы — в панели и на странице. Поля рабочей зоны — 16 по бокам (было 32).
 *   Рабочий стол (1024 и шире) прежний. Такт 92.
 * - **Меняет существующее.** Поля рабочей зоны — 16 слева и справа и 16 сверху (было 32 и 24) на любой ширине окна; закреплённая
 *   шапка держит поле 16 сверху (было 24). Снизу — 24, как прежде. Значения — токены `--spacing-page-top`, `--spacing-page-x`.
 *   Решение владельца 2026-10-09 (замер экрана свободной съёмки). Такт 96.
 * - **Добавлено.** «Назад» над заголовком страницы — слот `back`: первой строкой рабочей зоны, до заголовка 12
 *   (`--spacing-page-back`); с закреплённой шапкой «Назад» стоит в ней над её содержимым. Без слота каркас прежний. Такт 96.
 * - **Добавлено.** Баннер-ухо страницы — слот `banner`: первой строкой рабочей зоны во всю её ширину, над «Назад», до него 16;
 *   уходит с прокруткой, в закреплённую шапку не входит. Без слота каркас прежний. Такт 96.
 */
const props = withDefaults(defineProps<{
  /** Меню при загрузке: развёрнутое 256 или свёрнутое 84. */
  menu?: 'expanded' | 'compact'
  /** Экран во всё окно: каркас на высоту окна, содержимое без полей, прокрутку ведёт страница. */
  fill?: boolean
}>(), { menu: 'expanded', fill: false })

const route = useRoute()

/** Ось `Compact` у `Menu`: бургер сворачивает полосу до иконок. */
const compact = ref(props.menu === 'compact')

/** Пункт подсвечивается по адресу, а не флагом в разметке. */
const current = computed(() => route.path)
const inAdmin = computed(() => current.value === '/insure-types' || current.value === '/statuses')

/**
 * Раскрытые разделы с подменю. Состояние живёт здесь, а не в `MenuSub`: у
 * обоих мастеров раскрытие — это ось, а не внутренняя память компонента.
 * В свёрнутом меню разделы при загрузке закрыты: раскрытие там — флаут поверх содержимого.
 */
const open = reactive<Record<string, boolean>>({
  projects: false,
  admin: !compact.value,
  system: false,
})

function toggleMenu() {
  compact.value = !compact.value
  if (compact.value) {
    for (const key of Object.keys(open)) open[key] = false
  }
}

/* ------------------------------ узкий экран — такт 92 ------------------------------ */
/** Граница рабочего стола: ниже 1024 меню скрыто, бургер открывает выезжающую панель. */
const NARROW = '(max-width: 1023.98px)'
/** Выезжающая панель меню. */
const drawer = ref(false)
/** Окно уже рабочего стола — подпись бургера; ставится после монтирования: серверная разметка — рабочего стола. */
const narrow = ref(false)
/** Бургер: на узком экране — выезжающая панель, на рабочем столе — свернуть или развернуть меню (прежнее поведение). */
function onBurger() {
  if (import.meta.client && window.matchMedia(NARROW).matches) {
    drawer.value = true
    return
  }
  toggleMenu()
}
/** Пункт со страницей стенда — из выезжающей панели: переход и закрытие панели. */
function go(path: string) {
  drawer.value = false
  if (route.path !== path) navigateTo(path)
}
watch(() => route.fullPath, () => { drawer.value = false })
/** Окно стало шире рабочего стола — панель не нужна: меню снова в потоке. */
let wide: MediaQueryList | null = null
const onWide = (e: MediaQueryListEvent) => {
  narrow.value = e.matches
  if (!e.matches) drawer.value = false
}
onMounted(() => {
  wide = window.matchMedia(NARROW)
  narrow.value = wide.matches
  wide.addEventListener('change', onWide)
  /* Оснастка приёмки (такт 92): `?drawer=1` — выезжающая панель открыта при загрузке на узком экране; в продукт не идёт. */
  if (route.query.drawer === '1' && wide.matches) drawer.value = true
})
onBeforeUnmount(() => wide?.removeEventListener('change', onWide))

/**
 * Меню — одна разметка на два места (такт 92): в потоке слева на рабочем столе и в выезжающей панели на узком экране.
 * `drawer` — копия в панели: развёрнута всегда, пункт со страницей стенда ведёт на неё.
 */
const [DefineMenu, ReuseMenu] = createReusableTemplate<{ compact: boolean, drawer: boolean }>()
</script>

<template>
  <div
    class="flex min-h-screen flex-col"
    :class="props.fill ? 'h-screen overflow-hidden' : ''"
  >
    <!-- Разметка меню — один раз; в потоке и в выезжающей панели — её копии (такт 92). -->
    <DefineMenu v-slot="{ compact: c, drawer: d }">
      <!--
        variant="kit1": меню по мастеру left_menu кита 1 (такт 9). Свёрнутое — left_menu 33970:14833: пункт 84×48,
        иконка 20, подпись 13/16, группы через линию.
      -->
      <Menu
        variant="kit1"
        :compact="c"
        class="shrink-0"
      >
        <MenuSection first>
          <MenuItem :selected="current === '/'" @click="d && go('/')">
            <template #icon>
              <Icon name="home" :size="20" />
            </template>
            Главная
          </MenuItem>
          <MenuItem>
            <template #icon>
              <Icon name="bar-chart" :size="20" />
            </template>
            Charts
          </MenuItem>
          <!-- Такт 92: «Тарификация» (Биллинг 2.0, `docs/tariffs.md`) — страница стенда пункта. -->
          <MenuItem @click="d && go('/tariffs')">
            <template #icon>
              <Icon name="payments" :size="20" />
            </template>
            Billing
          </MenuItem>
          <MenuItem>
            <template #icon>
              <Icon name="monitoring" :size="20" />
            </template>
            Построить отчёт
          </MenuItem>
        </MenuSection>

        <MenuSection>
          <MenuItem :selected="current === '/my-inspections'" @click="d && go('/my-inspections')">
            <template #icon>
              <Icon name="article" :size="20" />
            </template>
            Все доступные осмотры
          </MenuItem>
        </MenuSection>

        <MenuSection title="Осмотры">
          <!-- Экран распределения открыт из осмотра: активен «Все осмотры», как в макете 33970:14833. -->
          <MenuItem :selected="current.startsWith('/free-shoot')" @click="d && go('/free-shoot')">
            <template #icon>
              <Icon name="draft" :size="20" />
            </template>
            Все осмотры
          </MenuItem>
          <MenuItem>
            <template #icon>
              <Icon name="list" :size="20" />
            </template>
            Очередь на проверку
          </MenuItem>

          <!--
            Подпункты без иконок подтверждено мастером: строки dropdown_menu
            956:4737 у кита 1 тоже без иконочного слота — такт 8 угадал верно.
          -->
          <MenuSub :open="open.projects" :compact="c" @toggle="open.projects = !open.projects">
            <template #icon>
              <Icon name="account-tree" :size="20" />
            </template>
            Проекты осмотров
            <template #items>
              <!-- Состав подпунктов на скриншотах не раскрыт — демо-контент. -->
              <MenuItem :show-icon="false">
                Черновики
              </MenuItem>
              <MenuItem :show-icon="false">
                На согласовании
              </MenuItem>
              <MenuItem :show-icon="false">
                Отклонённые
              </MenuItem>
            </template>
          </MenuSub>

          <MenuItem>
            <template #icon>
              <Icon name="hourglass" :size="20" />
            </template>
            Незавершённые осмотры
          </MenuItem>
        </MenuSection>

        <MenuSection title="Инструменты">
          <!-- В свёрнутом меню раздел с открытой страницей подсвечен сам: его подпункты спрятаны во флаут. -->
          <MenuSub :open="open.admin" :compact="c" :selected="c && inAdmin" @toggle="open.admin = !open.admin">
            <template #icon>
              <Icon name="admin" :size="20" />
            </template>
            Администрирование
            <template #items>
              <MenuItem :show-icon="false">
                Компании
              </MenuItem>
              <MenuItem :show-icon="false">
                Группы доступа
              </MenuItem>
              <MenuItem :show-icon="false">
                Пользователи системы
              </MenuItem>
              <MenuItem :show-icon="false">
                Привязать пользователя к с…
              </MenuItem>
              <MenuItem :show-icon="false" :selected="current === '/insure-types'" data-menu-link="insure-types" @click="d && go('/insure-types')">
                Типы схем осмотра
              </MenuItem>
              <MenuItem :show-icon="false">
                Типы объектов съёмки
              </MenuItem>
              <MenuItem :show-icon="false" :selected="current === '/statuses'" @click="d && go('/statuses')">
                Статусы
              </MenuItem>
            </template>
          </MenuSub>

          <MenuSub :open="open.system" :compact="c" @toggle="open.system = !open.system">
            <template #icon>
              <Icon name="settings" :size="20" />
            </template>
            Системное
            <template #items>
              <!-- Состав подпунктов макет не раскрывает — демо-контент. -->
              <MenuItem :show-icon="false">
                Журнал событий
              </MenuItem>
              <MenuItem :show-icon="false">
                Настройки
              </MenuItem>
            </template>
          </MenuSub>
        </MenuSection>

        <MenuSection>
          <MenuItem>
            <template #icon>
              <Icon name="person" :size="20" />
            </template>
            Профиль
          </MenuItem>
        </MenuSection>
      </Menu>
    </DefineMenu>

    <!-- Верхняя полоса top_menu 33970:14832: левый блок 256 — бургер 24 и логотип 182×32; справа — язык, профиль, выход. -->
    <AppBar>
      <template #start>
        <!-- Такт 92: ниже 1024 бургер открывает выезжающую панель меню, на рабочем столе — сворачивает меню, как прежде. -->
        <IconButton
          variant="sidebar"
          size="lg"
          :label="narrow ? 'Открыть меню' : compact ? 'Развернуть меню' : 'Свернуть меню'"
          :aria-expanded="narrow ? drawer : undefined"
          data-menu-burger
          @click="onBurger"
        >
          <Icon name="menu" :size="24" />
        </IconButton>
        <AppBarBrand logo="/brand/rososmotr-logo.svg">Рососмотр</AppBarBrand>
      </template>

      <template #end>
        <!-- Пункты страницы: статус сохранения, действия экрана. Узкий экран (такт 92) — полоса компактная, пунктов страницы нет. -->
        <div class="contents max-lg:hidden">
          <slot name="bar" />
        </div>

        <Button variant="sidebar" class="max-lg:hidden">
          RU
          <Icon name="chevron-down" :size="8" />
        </Button>

        <Button variant="sidebar" show-icon class="max-lg:hidden">
          <template #icon>
            <Avatar type="letter" letter="Ш" :size="32" />
          </template>
          Шипилов Михаил
          <Icon name="chevron-down" :size="8" />
        </Button>
        <!-- Узкий экран: профиль — аватар без имени, подпись для чтения с экрана — «Профиль»; язык и выход — внизу выезжающей панели. -->
        <Button variant="sidebar" show-icon class="lg:hidden" aria-label="Профиль">
          <template #icon>
            <Avatar type="letter" letter="Ш" :size="32" />
          </template>
        </Button>

        <IconButton variant="sidebar" size="lg" label="Выйти" class="max-lg:hidden">
          <Icon name="logout" :size="24" />
        </IconButton>
      </template>
    </AppBar>

    <div class="flex min-h-0 flex-1">
      <!-- Развёрнутое меню двигает содержимое и на экране во всё окно (такт 55). Ниже 1024 — в выезжающей панели (такт 92). -->
      <div class="relative flex shrink-0 max-lg:hidden">
        <ReuseMenu :compact="compact" :drawer="false" />
      </div>

      <main
        class="flex min-w-0 flex-1 flex-col"
        :class="props.fill ? 'min-h-0' : 'px-page-x pt-page-top pb-6'"
      >
        <slot v-if="props.fill" />
        <template v-else>
          <!--
            Формат страницы — такт 96, решение владельца 2026-10-09 (замер `/free-shoot`; верх 16 — довесок 1): поля 16 сверху и по бокам, «Назад» →
            заголовок 12 — токены `--spacing-page-*`; порядок первой строки — баннер, «Назад», заголовок.
            Слот `banner` — баннер-ухо страницы (`Callout`): первой строкой, до «Назад» 16; уходит с прокруткой, в закреплённую
            шапку не входит; ширина — рабочая зона.
          -->
          <div v-if="$slots.banner" data-slot="page-banner" class="mb-page-top flex flex-col">
            <slot name="banner" />
          </div>
          <!--
            Слот `header` — закреплённая шапка страницы (такт 78, сводка тарификации §11: «Сохранить изменения» закреплена
            сверху). Липнет к верху окна при прокрутке, подложка — фон рабочей зоны: содержимое уходит под шапку. В покое
            место шапки прежнее — поле 16 сверху (с такта 96) и зазор 24 до содержимого; закреплённая держит поле 16 сверху
            и 12 снизу. «Назад» (слот `back`) стоит в шапке над её содержимым. Без слота каркас прежний.
          -->
          <div
            v-if="$slots.header"
            data-slot="page-header"
            class="sticky top-0 z-20 -mx-page-x -mt-page-top mb-3 flex flex-col gap-page-back bg-background px-page-x pt-page-top pb-3"
          >
            <div v-if="$slots.back" data-slot="page-back" class="flex">
              <slot name="back" />
            </div>
            <slot name="header" />
          </div>
          <!-- Слот `back` — «Назад» над заголовком страницы (такт 96): зазор до заголовка задаёт каркас, страница его не задаёт. -->
          <div v-else-if="$slots.back" data-slot="page-back" class="mb-page-back flex">
            <slot name="back" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-6">
            <slot />
          </div>
        </template>
      </main>
    </div>

    <!--
      Выезжающая панель меню — такт 92, узкий экран (решение 4 оркестратора 2026-10-08): `ModalCard` слева на поверхности меню.
      Модальная: Esc, клик мимо и крестик закрывают её, фокус возвращается на бургер.
    -->
    <ModalCard v-model:open="drawer">
      <ModalCardContent placement="edge" side="left" surface="sidebar" label="Меню" data-menu-drawer>
        <AppBar>
          <template #start>
            <IconButton variant="sidebar" size="lg" label="Закрыть меню" data-menu-close @click="drawer = false">
              <Icon name="close" :size="16" />
            </IconButton>
            <AppBarBrand logo="/brand/rososmotr-logo.svg">Рососмотр</AppBarBrand>
          </template>
        </AppBar>
        <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--sidebar-scroll-thumb)_var(--sidebar-scroll-track)] [scrollbar-width:thin]">
          <ReuseMenu :compact="false" :drawer="true" />
        </div>
        <!-- Низ панели — то, что ушло с компактной полосы: язык и выход; профиль — пункт меню «Профиль» и аватар на полосе. -->
        <div class="flex shrink-0 items-center justify-between gap-2 px-1 py-2" data-menu-account>
          <Button variant="sidebar">
            RU
            <Icon name="chevron-down" :size="8" />
          </Button>
          <IconButton variant="sidebar" size="lg" label="Выйти">
            <Icon name="logout" :size="24" />
          </IconButton>
        </div>
      </ModalCardContent>
    </ModalCard>
  </div>
</template>
