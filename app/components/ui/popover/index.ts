export { default as Popover } from './Popover.vue'
export { default as PopoverAnchor } from './PopoverAnchor.vue'
export { default as PopoverContent } from './PopoverContent.vue'
export { default as PopoverTrigger } from './PopoverTrigger.vue'

/**
 * Всплывающая плашка — мастер `Popover` `405:3786`, спека `1925:12127`.
 *
 * ## Такт 28: пересборка на примитивах Reka
 *
 * До такта 28 компонент был обычным `<div>` без Reka: закрытие кликом снаружи
 * и по Esc заведено вручную (такт 21), портала, возврата фокуса, ролей и учёта
 * краёв окна не было — долг переноса, `docs/design-debt.md`. Такт 28 собрал
 * компонент заново на примитивах `PopoverRoot` / `PopoverAnchor` / `PopoverTrigger`
 * / `PopoverPortal` / `PopoverContent`, публичный контракт (`v-model:open`,
 * содержимое плашки слотом, проп `width`) сохранён.
 *
 * ## Состав — четыре файла, как у `Dialog` и `Tooltip`
 *
 * | Файл | Что это |
 * |---|---|
 * | `Popover.vue` | `PopoverRoot` — состояние `open`, булевы пропы с ловушкой `undefined` |
 * | `PopoverAnchor.vue` | точка привязки, когда она шире триггера (разбор в файле) |
 * | `PopoverTrigger.vue` | кнопка-триггер: `as-child` на конкретную кнопку страницы |
 * | `PopoverContent.vue` | портал + тело плашки — геометрия и тема мастера |
 *
 * Потребитель собирает их так же, как уже собран `Tooltip` в `TableRowActions.vue`:
 *
 * ```html
 * <Popover v-model:open="open">
 *   <PopoverTrigger as-child>
 *     <IconButton ... />
 *   </PopoverTrigger>
 *   <PopoverContent align="end" :side-offset="4" class="p-1">
 *     …
 *   </PopoverContent>
 * </Popover>
 * ```
 *
 * У «Моих осмотров» массовые действия привязаны не к кнопке-шеврону, а к связке
 * чекбокс + кнопка целиком (мастер `select_container`) — там триггер обёрнут
 * `PopoverAnchor` пошире:
 *
 * ```html
 * <PopoverAnchor as-child>
 *   <span class="relative flex items-center">
 *     <Checkbox />
 *     <PopoverTrigger as-child><button>…</button></PopoverTrigger>
 *   </span>
 * </PopoverAnchor>
 * ```
 *
 * ## Что даёт Reka без единой строчки нашего кода
 *
 * - **Закрытие** кликом снаружи и по Esc — `DismissableLayer` внутри `PopoverContent`
 *   (`onDismiss` зовёт `rootContext.onOpenChange(false)`), клик по самому триггеру
 *   в эту категорию не попадает — переключает сам триггер, повторно не открывая.
 * - **Возврат фокуса на триггер** — `PopoverContentNonModal` уже умеет это сама:
 *   `onCloseAutoFocus` фокусирует `rootContext.triggerElement` при закрытии не
 *   через клик снаружи. `rootContext.triggerElement` выставляет `PopoverTrigger`
 *   при монтировании — присвоить его вручную не нужно.
 * - **Роли и aria** — `PopoverTrigger` ставит `aria-haspopup`, `aria-expanded`,
 *   `aria-controls`, `data-state`; `PopoverContent` — `role="dialog"` и
 *   `aria-labelledby`, указывающий на триггер.
 * - **Портал** — `PopoverPortal` уносит плашку в `body`, overflow контейнеров
 *   таблицы и колонки её больше не режет.
 * - **Коллизии с краями окна** — `avoidCollisions` включён по умолчанию: `flip`
 *   переворачивает сторону у верхнего/нижнего края (плашка кебаба на строке у
 *   низа окна открывается вверх), `shift` сдвигает плашку вдоль бокового края,
 *   не меняя выбранную грань привязки.
 *
 * ## Ловушка булевых пропов не обойдена — переехала на уровень примитива
 *
 * `Popover.vue` объявляет `open` / `defaultOpen` / `modal` через `undefined` в
 * `withDefaults`, как `Dialog` и `Tooltip`: без этого Vue подставляет отсутствующему
 * пропу `false`, и `PopoverRoot` уезжает в управляемый режим `passive: props.open
 * === undefined`, переставая открываться чем-либо. Разбор ловушки — `CLAUDE.md`.
 *
 * ## `inline` — только витрине, не продукту
 *
 * Мастер-контейнер на витрине показывается пустым, без триггера и без анкора —
 * координаты плавающей плашки тогда считать не от чего. `PopoverContent inline`
 * отключает портал и плавающее позиционирование, оставляя тот же плоский блок,
 * что был у компонента до такта 28. Приём тот же, что у `DialogContent inline`
 * и `Lightbox inline` для `/compare`.
 */
