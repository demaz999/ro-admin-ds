# Инвентарь кита 1 (Figma)

## Мастер-компоненты: nodeId

Сняты обходом через Plugin API. С этими id работают `get_design_context` и `get_variable_defs` —
искать их заново через `get_metadata` бесполезно, он не видит нужных страниц.

| Компонент | nodeId | Тип | Варианты |
|---|---|---|---|
| `btn_accent` | `709:6413` | SET | state (Default/Hover/Pressed/Dissabled/not_active) × size (44/32) — 10 |
| `btn_secondary` | `713:3319` | SET | state ×4 |
| `btn_outline` | `1990:226` | SET | state ×4 |
| `btn_txt` | `715:3605` | SET | state × size (l_20/s_16) × color (accent/warning/red) × type (bold/regular) × icon — 27 |
| `input` | `720:11753` | SET | label (left/top) × state (Default/pressed/field/error/disabled) × size (40/44) — 20 |
| `select` **актуальный** | `1929:4067` | SET | type: default/field/pressed/loading — 4 · обновлён 2026-06-24 |
| `select` старый | `244:13976` | SET | label × state — 18 · обновлён 2026-01-23 |
| `multiselect` | `251:16816` | SET | 18 · обновлён 2026-01-23 |
| `badge` → в коде **`Badge`** | `1173:196` | SET | color: violet/red/orange — 3 · высота **24**, иконка, декоративная статусная метка |
| `badge` → в коде **`Chip`** | `747:2464` | COMPONENT | высота **32**, внутри счётчик `bulb` и крестик `20_ic_close` · интерактивный |
| `tabs` | `2702:315` | SET | amount: 2/3/4 |
| `iconed_tab_list` | `2181:387` | SET | selected × type — 4 |
| `left_menu` | `643:3054` | SET | type: Default/iconed/with shadow |
| `menu_item` | `637:2521` | SET | state (default/activ/hover/selected/disabled) × size — 10 |

## Сайтовый слой — другой файл

Не всё живёт в ките админки. Компоненты сайта лежат в файле
**«🖥️ Новый сайт Рососмотра»**, fileKey `byDGy0Ab4QciP0CHTMLxYv`.

| Компонент | nodeId | Особенности |
|---|---|---|
| Большая кнопка | `1314:2350` | шрифт **Martian Grotesk**, не PT Root UI |

Сайтовый слой держится **отдельно от админского**: его типографика в админскую шкалу
(PT Root UI, три веса) не входит и наоборот. При переносе такие компоненты помечаются
источником-файлом, чтобы шрифт и стили не расползлись между слоями.

## Страницы файла (38)

`get_metadata` показывает только 5 из них. Полный список:

Cover Page · 🟡 Icons · 🟡 Colors · 🟡 Typography · ✅ Menu · 🟢 Alerts · 🟢 Avatars · 🟢 Badge ·
Bulb (counter) · 🟢 Buttons · 🟢🟡 Checkbox, Radio Button · 🟢 dropdown · 🟢 Filters · 🟢🟡 input ·
🟢 List Item · 🟢 Modal_cards · ✅ Other (scrolls, loader) · 🟢 Pagination · 🟢 Table · 🟢 Switch ·
🟢 Tabs · 🟢 Tags · 🟢 Text_link · 🟢 Title · 🟢 tool_tip · user_card · select и multiselect ·
BreadCrumbs · pop_over · ➡️ slots · text area · 🚫 Accordion · 🚫 table · плюс 5 страниц-разделителей

Префикс 🚫 у Accordion и table, судя по всему, означает «не использовать».

---


Снято через Figma MCP `search_design_system` из библиотеки `🖥️ UI Kit · Web Platform`
(fileKey `uG3HTIcMwr2jI2d7YEYPs2`). Дата снятия: 2026-08-11.

Это срез по опубликованным компонентам библиотеки, а не формальная инвентаризация — она
отдельная задача после полного переноса. Здесь ровно столько, сколько нужно для планирования
волн 0-2 и для мапинг-таблицы к киту 3.

## Покрытие волн 0 и 1

| Целевой компонент | В ките | Статус |
|---|---|---|
| Button | `btn_accent`, `btn_secondary`, `btn_outline`, `btn_txt`, `btn_service`, `btn_back`, `btn_remove`, `btn_map`, `btn_navigation`, `accent_icon_btn`, `collapsed_btn`, `page_btn` | есть |
| Input | `input`, `txt_field`, `txt_area` | есть |
| Select | `select` (два сета), `select_container`, `multiselect`, `dropdown_list` | есть |
| Badge | `badge` `1173:196`, `tag_platform_type` | есть |
| Chip | `badge` `747:2464` — под тем же именем, но другой компонент | есть |
| Tabs | `tabs`, `iconed_tab_list` | есть |
| Dialog | `modal_cards_header`, `overlay`, `Popover`, `card` | частично — только шапка и подложка |
| Dropdown Menu | `dropdown_menu`, `dropdown_list`, `menu`, `menu_item`, `menu_devider`, `Popover` | есть |
| Checkbox | `checkbox`, `checkbox_title`, `filter_checkbox` | есть |
| Radio | `radiobtn`, `radiobtn_title` | есть |
| Switch | `switch`, `Switcher` | есть |
| Tooltip | `Tooltip`, `Hint_pointer` | есть |
| Toast | `notification` | частично — одиночный компонент без состояний |
| Table | `table_header`, `TableHeader`, `table_shadow`, `column_cell`, `column_name`, `cell`, `list_item`, `simple_item` | частично — только части, строки нет |
| Pagination | `pagination`, `pagination_group`, `page_btn`, `page_number` | есть |
| Breadcrumbs | `bread_crumbs` | есть |
| Skeleton | — | **нет** |
| Alert | `alert_error`, `alert_success` | есть |

## Полный срез

**Кнопки.** `btn_accent`, `btn_secondary`, `btn_outline`, `btn_txt`, `btn_service`, `btn_back`,
`btn_remove`, `btn_map`, `btn_navigation`, `accent_icon_btn`, `collapsed_btn`, `page_btn`

**Поля и контролы.** `input`, `txt_field`, `txt_area`, `select` ×2, `select_container`,
`multiselect`, `dropdown_list`, `checkbox`, `checkbox_title`, `filter_checkbox`, `radiobtn`,
`radiobtn_title`, `switch`, `Switcher`, `range_slider`, `sort`

**Навигация.** `tabs`, `iconed_tab_list`, `bread_crumbs`, `pagination`, `pagination_group`,
`page_number`, `left_menu`, `top_menu`, `menu`, `menu_item`, `menu_line`, `menu_devider`,
`dropdown_menu`, `header`, `keyboard_arrow`, `Scroll` ×2, `scroll_default`

**Обратная связь.** `alert_error`, `alert_success`, `notification`, `Tooltip`, `Hint_pointer`,
`Popover`, `loader`, `badge`, `tag_platform_type`, `overlay`, `hourglass`

**Таблицы и списки.** `table_header`, `TableHeader`, `table_shadow`, `column_cell`, `column_name`,
`cell`, `list_item`, `simple_item`, `items`, `role_list`, `role`

**Модалки, карточки, сущности.** `modal_cards_header`, `card`, `user_card`, `company`, `Avatar`,
`avatar_title`, `Title`, `article`, `logo`

**Фильтры.** `filter_date`, `filter_name`, `saved_filter` ×2, `filter_checkbox`

**Служебное.** `slot`, `horizontal_slot`, `стикер`, `шаблон`, `Пример`

**Иконки.** `24_ic_pending`, `24_ic_move_item`, `24_ic_keyboard_arrow_down`, `24_ic_warning`,
`24_ic_search`, `24_ic_tune`, `24_ic_calendar_month`, `24_ic_download`, `24_ic_sort_up`,
`24_ic_check_circle`, `24_ic_chevron_right`, `24_ic_chevron_left`, `24_ic_add`, `24_ic_call`,
`24_info`, `20_ic_archive`, `20_ic_keep`, `20_ic_close`, `20_ic_content_copy`, `20_ic_check`,
`16ic_copy`, `16ic_search`, `16ic_done`, `ic_error`, `ic_person`, `ic_person_add`, `ic_delete24`,
`ic_layers24`, `ic_placeholder16`, `visibility_off`, `format_list_numbered`, `library_books`,
`grid_view`, `instant_mix`, `contract`, `person`, `calculate`, `home`

## Чего нет вовсе

Skeleton, Accordion, детерминированный Progress bar, Date picker / Calendar (есть только иконка
и `filter_date`), Empty state, Stepper, Command / Combobox, строка таблицы, тело и футер диалога.

Всё перечисленное **не блокирует работу**: берётся дефолтом shadcn-vue сразу и учитывается в
[design-debt.md](design-debt.md). Кит закрывает любой экран админки.
