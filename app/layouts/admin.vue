<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

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
 * | типовая страница | `definePageMeta({ layout: 'admin' })` — меню развёрнуто, содержимое с полями 32 / 24 |
 * | экран во всё окно (`/free-shoot`) | `<NuxtLayout name="admin" fill menu="compact">` — меню свёрнуто, содержимое без полей на высоту окна |
 * | свои пункты полосы | слот `bar` — встают в правый блок полосы перед языком и профилем |
 * | закреплённая шапка страницы | слот `header` у `<NuxtLayout name="admin">` — липнет к верху окна при прокрутке, подложка — фон рабочей зоны (такт 78, «Тарификация»: «Сохранить изменения» закреплена сверху, §11 сводки) |
 * | меню экрана во всё окно, развёрнутое бургером | двигает содержимое, как на типовой странице (такт 55, решение владельца 2026-10-01): рабочая зона сужается на 172 и подстраивается сама; такт 50 клал меню поверх содержимого |
 *
 * «Мои осмотры» на этот каркас не переведены — у страницы свой рельс, решение такта 8.
 *
 * ## Состав меню — `left_menu` `33970:14833`
 *
 * Пять групп: Главная, Charts, Billing, Построить отчёт | Все доступные осмотры | Все осмотры, Очередь на проверку,
 * Проекты осмотров, Незавершённые осмотры | Администрирование, Системное | Профиль. Подписи групп развёрнутого меню
 * («Осмотры», «Инструменты») — с тактов 8–9: узел `33970:14833` показывает только свёрнутое меню.
 *
 * Внутри тёмной полосы и меню действует правило порталов сайдбара: только `sidebar-*`-токены. Бургер и выход —
 * `IconButton variant="sidebar"`, язык и профиль — `Button variant="sidebar"`.
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
</script>

<template>
  <div
    class="flex min-h-screen flex-col"
    :class="props.fill ? 'h-screen overflow-hidden' : ''"
  >
    <!-- Верхняя полоса top_menu 33970:14832: левый блок 256 — бургер 24 и логотип 182×32; справа — язык, профиль, выход. -->
    <AppBar>
      <template #start>
        <IconButton variant="sidebar" size="lg" :label="compact ? 'Развернуть меню' : 'Свернуть меню'" @click="toggleMenu">
          <Icon name="menu" :size="24" />
        </IconButton>
        <AppBarBrand logo="/brand/rososmotr-logo.svg">Рососмотр</AppBarBrand>
      </template>

      <template #end>
        <!-- Пункты страницы: статус сохранения, действия экрана. -->
        <slot name="bar" />

        <Button variant="sidebar">
          RU
          <Icon name="chevron-down" :size="8" />
        </Button>

        <Button variant="sidebar" show-icon>
          <template #icon>
            <Avatar type="letter" letter="Ш" :size="32" />
          </template>
          Шипилов Михаил
          <Icon name="chevron-down" :size="8" />
        </Button>

        <IconButton variant="sidebar" size="lg" label="Выйти">
          <Icon name="logout" :size="24" />
        </IconButton>
      </template>
    </AppBar>

    <div class="flex min-h-0 flex-1">
      <!--
        variant="kit1": меню по мастеру left_menu кита 1 (такт 9). Свёрнутое — left_menu 33970:14833: пункт 84×48,
        иконка 20, подпись 13/16, группы через линию.
      -->
      <!-- Развёрнутое меню двигает содержимое и на экране во всё окно (такт 55). -->
      <div class="relative flex shrink-0">
      <Menu
        variant="kit1"
        :compact="compact"
        class="shrink-0"
      >
        <MenuSection first>
          <MenuItem :selected="current === '/'">
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
          <MenuItem>
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
          <MenuItem :selected="current === '/my-inspections'">
            <template #icon>
              <Icon name="article" :size="20" />
            </template>
            Все доступные осмотры
          </MenuItem>
        </MenuSection>

        <MenuSection title="Осмотры">
          <!-- Экран распределения открыт из осмотра: активен «Все осмотры», как в макете 33970:14833. -->
          <MenuItem :selected="current.startsWith('/free-shoot')">
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
          <MenuSub :open="open.projects" :compact="compact" @toggle="open.projects = !open.projects">
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
          <MenuSub :open="open.admin" :compact="compact" :selected="compact && inAdmin" @toggle="open.admin = !open.admin">
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
              <MenuItem :show-icon="false" :selected="current === '/insure-types'">
                Типы схем осмотра
              </MenuItem>
              <MenuItem :show-icon="false">
                Типы объектов съёмки
              </MenuItem>
              <MenuItem :show-icon="false" :selected="current === '/statuses'">
                Статусы
              </MenuItem>
            </template>
          </MenuSub>

          <MenuSub :open="open.system" :compact="compact" @toggle="open.system = !open.system">
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
      </div>

      <main
        class="flex min-w-0 flex-1 flex-col"
        :class="props.fill ? 'min-h-0' : 'gap-6 px-8 py-6'"
      >
        <!--
          Слот `header` — закреплённая шапка страницы (такт 78, сводка тарификации §11: «Сохранить изменения» закреплена
          сверху). Липнет к верху окна при прокрутке, подложка — фон рабочей зоны: содержимое уходит под шапку. В покое
          место шапки прежнее — поля рабочей зоны 24 сверху и зазор 24 до содержимого; закреплённая держит поле 24 сверху
          и 12 снизу. Без слота каркас прежний.
        -->
        <div
          v-if="$slots.header && !props.fill"
          data-slot="page-header"
          class="sticky top-0 z-20 -mx-8 -mt-6 -mb-3 bg-background px-8 pt-6 pb-3"
        >
          <slot name="header" />
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>
