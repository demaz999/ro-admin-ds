<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

/**
 * Каркас админки: тёмный сайдбар слева, тёмная верхняя панель справа от него,
 * светлая область содержимого под ней.
 *
 * Заведён тактом 8 под страницу «Типы схем осмотров» без источника. Тактом 9
 * сайдбар пересобран по мастеру **кита 1**: страница `281:62442`, компоненты
 * `left_menu` `643:3053`/`644:6545` и шапка `top_menu` `643:2253`/`643:2255`.
 * Разбор различий с Атомом — `app/components/ui/menu/index.ts`.
 *
 * «Мои осмотры» на этот каркас **не переводятся** — отдельная задача: там
 * шапка идёт во всю ширину поверх рельса, и перевод сдвинет раскладку, на
 * которую наложение уже сходится.
 *
 * ## Шапка сайдбара — по мастеру `top_menu`
 *
 * `type=iconed` `643:2253`: высота 56, отступ слева **12**, зазор до логотипа
 * **8**, бургер 24×24. Компактного состояния мастер не рисует вовсе (оба
 * варианта `top_menu` шириной 256) — центрирование бургера в свёрнутом
 * сайдбаре остаётся решением сборки, дыра в `docs/design-debt.md`.
 *
 * Логотип в мастере — картинка 85×24, а не текст: у нас логотипа Рососмотра
 * нет (решение от 2026-08-12, логотипы РИР вне скоупа), подпись `VIEWAPP`
 * остаётся местозаполнителем. Геометрия шапки при этом взята точно.
 *
 * ## Решения сборки без источника (кит 1 их не покрывает)
 *
 * | Что | Решение | Почему |
 * |---|---|---|
 * | логотип живёт в сайдбаре, а не в верхней панели | сайдбар занимает всю высоту, панель начинается от его правого края | состав страницы: бургер стоит рядом с логотипом, то есть управляет сайдбаром — кит 1 показывает шапку и список раздельно, без готовой композиции страницы |
 * | верхняя панель тёмная | `bg-sidebar`, содержимое на `sidebar-*` | образец «Мои осмотры»: там шапка тоже тёмная |
 * | язык и профиль — композиция, а не компонент | кнопка с подписью и шевроном | текстовой кнопки на тёмном в ките нет: `Button` весь на светлых ролях. Строка в `docs/design-debt.md` |
 * | шапка сайдбара в компактном режиме | бургер центрируется, логотип пропадает | у мастера `top_menu` компактного состояния нет вовсе |
 *
 * Внутри тёмной полосы действует правило порталов сайдбара: только
 * `sidebar-*`-токены. Бургер и выход поэтому стоят на `IconButton
 * variant="sidebar"`, а не на `service`.
 */
const route = useRoute()

/** Ось `Compact` у `Menu`: бургер сворачивает полосу до иконок. */
const compact = ref(false)

/**
 * Раскрытые разделы с подменю. Состояние живёт здесь, а не в `MenuSub`: у
 * обоих мастеров раскрытие — это ось, а не внутренняя память компонента.
 */
const open = reactive<Record<string, boolean>>({
  projects: false,
  admin: true,
})

/** Пункт подсвечивается по адресу, а не флагом в разметке. */
const current = computed(() => route.path)
</script>

<template>
  <div class="flex min-h-screen bg-background font-sans text-foreground">
    <!--
      variant="kit1": сайдбар собран по мастеру left_menu кита 1, а не по
      переносу Атома. Решение владельца, такт 9 — разбор в index.ts.
    -->
    <Menu variant="kit1" :compact="compact" class="min-h-screen shrink-0">
      <!--
        Шапка top_menu 643:2253: высота 56, pl-3 (12), gap-2 (8), бургер 24.
        В компактном режиме мастер не покрывает — бургер центрируется решением
        сборки.
      -->
      <div
        data-slot="app-logo"
        class="flex h-14 items-center gap-2 pl-3"
        :class="compact ? 'justify-center pl-0' : ''"
      >
        <IconButton variant="sidebar" size="lg" label="Свернуть меню" @click="compact = !compact">
          <Icon name="menu" :size="24" />
        </IconButton>
        <span v-if="!compact" class="text-xl font-bold tracking-widest text-sidebar-active-foreground">
          VIEWAPP
        </span>
      </div>

      <MenuSection first>
        <MenuItem :selected="current === '/'">
          <template #icon>
            <Icon name="home" :size="24" />
          </template>
          Главная
        </MenuItem>
        <MenuItem>
          <template #icon>
            <Icon name="payments" :size="24" />
          </template>
          Billing
        </MenuItem>
        <MenuItem>
          <template #icon>
            <Icon name="monitoring" :size="24" />
          </template>
          Построить отчёт
        </MenuItem>
      </MenuSection>

      <MenuSection title="Осмотры">
        <MenuItem :selected="current === '/my-inspections'">
          <template #icon>
            <Icon name="view-list" :size="24" />
          </template>
          Мои осмотры
        </MenuItem>
        <MenuItem>
          <template #icon>
            <Icon name="draft" :size="24" />
          </template>
          Все осмотры
        </MenuItem>
        <MenuItem>
          <template #icon>
            <Icon name="list" :size="24" />
          </template>
          Очередь на проверку
        </MenuItem>

        <!--
          Подпункты без иконок подтверждено мастером: строки dropdown_menu
          956:4737 у кита 1 тоже без иконочного слота — такт 8 угадал верно.
        -->
        <MenuSub :open="open.projects" :compact="compact" @toggle="open.projects = !open.projects">
          <template #icon>
            <Icon name="account-tree" :size="24" />
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
            <Icon name="hourglass" :size="24" />
          </template>
          Незавершённые осмотры
        </MenuItem>
      </MenuSection>

      <MenuSection title="Инструменты">
        <MenuSub :open="open.admin" :compact="compact" @toggle="open.admin = !open.admin">
          <template #icon>
            <Icon name="admin" :size="24" />
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
            <MenuItem :show-icon="false">
              Статусы
            </MenuItem>
          </template>
        </MenuSub>
      </MenuSection>
    </Menu>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Верхняя панель: язык, профиль, выход. Состав тот же, что в «Мои осмотры». -->
      <header
        data-slot="app-bar"
        class="flex h-14 shrink-0 items-center gap-6 bg-sidebar px-4 text-sidebar-foreground"
      >
        <div class="ml-auto flex items-center gap-6">
          <button type="button" class="flex items-center gap-2 text-sm outline-none">
            RU
            <Icon name="chevron-down" :size="8" />
          </button>

          <button type="button" class="flex items-center gap-2 text-sm outline-none">
            <Avatar type="letter" letter="Ш" :size="32" />
            Шипилов Михаил
            <Icon name="chevron-down" :size="8" />
          </button>

          <IconButton variant="sidebar" size="lg" label="Выйти">
            <Icon name="logout" :size="24" />
          </IconButton>
        </div>
      </header>

      <main class="flex min-w-0 flex-1 flex-col gap-6 px-8 py-6">
        <slot />
      </main>
    </div>
  </div>
</template>
