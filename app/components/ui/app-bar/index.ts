export { default as AppBar } from './AppBar.vue'
export { default as AppBarBrand } from './AppBarBrand.vue'
export { default as AppBarStatus } from './AppBarStatus.vue'

/**
 * Верхняя полоса приложения на тёмной поверхности — карточка 1 такта 37 (`docs/free-shoot.md`, 16.3), ворота
 * 2026-09-30: «да», верхняя панель `admin.vue` переходит на неё (одна шапка в ките). Собрана тактом 42 (порция П5).
 *
 * Геометрия — верхней панели `admin.vue` (такты 8–9): высота 56 — шапка `top_menu` кита 1 `643:2253`, отступы 16,
 * зазор 24, поверхность `--sidebar`, текст `--sidebar-foreground`. Внутри тёмной полосы — только `sidebar`-типы:
 * `IconButton variant="sidebar"`, `Button variant="sidebar"`, `Breadcrumb surface="dark"` (правило порталов сайдбара).
 *
 * Слоты: `start` — бренд, по умолчанию — навигация (занимает остаток), `end` — статус и действия справа.
 *
 * | часть | кит | прототип VA-9265 (`.topbar`) |
 * |---|---|---|
 * | полоса | 56, `--sidebar`, отступы 16, зазор 24 | 48, `--navy-900`, отступы 16, зазор 16 |
 * | бренд (`AppBarBrand`) | 13/16 bold, разрядка `tracking-widest`, `--sidebar-foreground` | `.logo` 13 bold, 0.14em, `#9FB3CC` |
 * | статус (`AppBarStatus`) | точка `Indicator` sm (`success` / `warning` / `destructive`), подпись 13/16 `--sidebar-foreground` | `.saved` 12.5, точка 7 `#4FBF7B`, в работе — `#E6C77E` с пульсом |
 *
 * Тексты статуса — спека §17.2: «Сохранение…», «Все изменения сохранены»; ошибка выводится отдельно и сама не скрывается.
 */
export type AppBarSaveState = 'saving' | 'saved' | 'error'
