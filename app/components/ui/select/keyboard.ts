import { ref } from 'vue'

/**
 * Фокус пункта списка — такт 98, решение владельца 2026-10-09 (`docs/scheme-edit.md`, раздел «Правки владельца по приёмке,
 * такт 98»). Пункт под клавиатурой рисуется кольцом кита — 2 `--ring` внутрь пункта, по его радиусу 8, как фокус кнопок и
 * полей; системной обводки браузера у пункта нет (`outline-none`). Спека строки списка `457:4033` фокуса не рисует —
 * в ней покой, наведение, выбрана и выключена; кольцо — роль кита.
 *
 * Источник чёрной рамки до такта 98 — системная обводка `:focus-visible` браузера (`outline: auto 1px`, computed
 * `rgb(16, 16, 16) auto 1px`): у `Select` без поиска Reka переводит фокус на пункт списка.
 *
 * Пункт под клавиатурой — `data-highlighted` Reka: у `Select` без поиска это фокус самого пункта, у `Select` с поиском и у
 * `Autocomplete` фокус остаётся в поле, а пункт выделен через `aria-activedescendant`. Reka ставит `data-highlighted` и
 * под курсором — поэтому кольцо включается клавишами (стрелки, Home, End, пробел, Enter) и гаснет от движения мыши:
 * под мышью пункт показывает наведение, под клавиатурой — кольцо.
 */
export const LIST_ITEM_RING = 'data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-ring'

const KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown', ' ', 'Enter'])

export function useListKeyboard() {
  const keyboard = ref(false)
  return {
    keyboard,
    onKeydown(event: KeyboardEvent) {
      if (KEYS.has(event.key)) keyboard.value = true
    },
    /** Нажатие мыши и её движение. Движение без сдвига (`movementX` и `movementY` по нулям) Chrome шлёт сам после смены раскладки — его не считаем. */
    onPointer(event: PointerEvent) {
      if (event.type === 'pointermove' && !event.movementX && !event.movementY) return
      keyboard.value = false
    },
  }
}
