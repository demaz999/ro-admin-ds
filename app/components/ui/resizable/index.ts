export { default as ResizableHandle } from './ResizableHandle.vue'
export { default as ResizablePanel } from './ResizablePanel.vue'
export { default as ResizablePanelGroup } from './ResizablePanelGroup.vue'

/**
 * Панели с разделителем — карточка 3 такта 37 (`docs/free-shoot.md`, 16.3), ворота 2026-09-30: «да». Имена —
 * канонические shadcn-vue, примитив — `Splitter` Reka (перетаскивание, клавиатура, `aria-valuenow`). Собрана тактом 42.
 *
 * Размер панели — в пикселях (`sizeUnit="px"` Reka): пределы экрана VA-9265 заданы в пикселях — спека §7, прототип
 * `Math.min(820, Math.max(320, innerWidth - clientX))`; токены `--container-panel-min` 320, `--container-panel-max` 820,
 * `--container-side-panel` 440 — по умолчанию. Панель без размера занимает остаток.
 *
 * | часть | кит | прототип (`.splitter`) |
 * |---|---|---|
 * | ручка | колонка 10, линия 2 `--border-soft` по центру | колонка 10, линия 2 `#E1E7EF` (`inset: 0 4px`) |
 * | наведение и перетаскивание | линия `--primary`, захват 6 × 32 `--muted-foreground` виден | линия `#638EBF`, захват 6 × 34 `#C7D2DE` |
 * | фокус с клавиатуры | линия `--primary` и захват | — (у прототипа ручка не фокусируется) |
 * | курсор | `col-resize` | `col-resize` |
 */
