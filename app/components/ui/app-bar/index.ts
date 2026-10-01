export { default as AppBar } from './AppBar.vue'
export { default as AppBarBrand } from './AppBarBrand.vue'
export { default as AppBarStatus } from './AppBarStatus.vue'

/**
 * Верхняя полоса приложения на тёмной поверхности — карточка 1 такта 37 (`docs/free-shoot.md`, 16.3), ворота
 * 2026-09-30: «да», верхняя панель `admin.vue` переходит на неё (одна шапка в ките). Собрана тактом 42 (порция П5).
 *
 * Геометрия — такт 48, решение владельца 2026-10-01: `top_menu` `33970:14832` файла VIEWAPP Web Dashboard
 * (`U829JoK7KMZV8do3KNkWBh`). Внутри тёмной полосы — только `sidebar`-типы: `IconButton variant="sidebar"`,
 * `Button variant="sidebar"` (правило порталов сайдбара).
 *
 * | часть | `top_menu` `33970:14832` | кит |
 * |---|---|---|
 * | полоса | 56, `#0e1e33` `menu/bg/default` | `h-14`, `--sidebar` |
 * | левый блок | 256, слева 12, зазор 16: бургер 24, логотип 182×32 | `w-64`, слева 4 и зазор 8 — бургер `IconButton` lg несёт поле 8 вокруг глифа 24 |
 * | правый блок | у правого края, поля 32, зазор 24 | справа 24 и зазор 8 — у контролов полосы поле 8 |
 * | подписи | 14/20 regular белым | 15/20 regular `--sidebar-active-foreground`: ступени 14 в шкале кита нет (`figma-fixes.md`) |
 *
 * Слоты: `start` — бургер и бренд, по умолчанию — середина (занимает остаток), `end` — статус и действия справа.
 *
 * | часть | кит | прототип VA-9265 (`.topbar`) |
 * |---|---|---|
 * | полоса | 56, `--sidebar` | 48, `--navy-900`, отступы 16, зазор 16 |
 * | бренд (`AppBarBrand`) | логотип 182×32 (`logo`); без него — 13/16 bold, разрядка `tracking-widest`, `--sidebar-foreground` | `.logo` 13 bold, 0.14em, `#9FB3CC` |
 * | статус (`AppBarStatus`) | точка `Indicator` sm (`success` / `warning` / `destructive`), подпись 13/16 `--sidebar-foreground`, поля 8 | `.saved` 12.5, точка 7 `#4FBF7B`, в работе — `#E6C77E` с пульсом |
 *
 * Тексты статуса — спека §17.2: «Сохранение…», «Все изменения сохранены»; ошибка выводится отдельно и сама не скрывается.
 */
export type AppBarSaveState = 'saving' | 'saved' | 'error'
