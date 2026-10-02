import type { KitChange } from './handover-2026-10-01'

/**
 * Черновик следующей версии передачи фронтам — изменения кирпичиков относительно `handover-2026-10-02`. Метка ставится
 * по закрытию страницы «Редактирование схемы осмотра» (`docs/scheme-edit.md`); тогда файл получает датированное имя.
 * Правило 23 `docs/chat-protocol.md`; тот же текст — в `CHANGELOG.md` и в разделах «Изменения после передачи» в
 * `index.ts` компонентов.
 */
export const DRAFT_BASE = 'handover-2026-10-02'

export const DRAFT: KitChange[] = [
  { id: 'icon-arrow-back', component: 'Icon', cls: 'added', text: 'Глиф `arrow-back` (стрелка «назад») — Material Symbols `keyboard_backspace`, официальная выгрузка `default/24px`, границы 720×480. Такт 64.' },
  { id: 'button-outline', component: 'Button', cls: 'added', text: 'Вариант `variant="outline"` — контурная кнопка по мастеру кита 1 `btn_outline` `1990:226`: рамка 1 и текст `--primary`, наведение `--primary-hover`, нажатие `--primary-pressed`, выключено `--primary-disabled`; фона нет. Прочие варианты прежние. Такт 63.' },
  { id: 'select-multiple', component: 'Select', cls: 'added', text: 'Ось `multiple` — набор значений чипами «текст ×» по мастеру кита 1 `multiselect` `251:16816`: значение — `v-model:values` (массив строк), тело растёт с переносом чипов, список остаётся открытым при выборе, у выбранной строки — галочка. Без `multiple` вызовы прежние. Такт 62.' },
  { id: 'heading-levels', component: 'Heading', cls: 'added', text: 'Ступени `level="title"` (24/28, тег `h2`) и `level="group"` (20/24, тег `h3`): заголовок раздела страницы настроек и заголовок группы в карточке. Такт 62.' },
  { id: 'heading-description', component: 'Heading', cls: 'added', text: 'Проп `description` — подпись под заголовком, 13/16 `--foreground-secondary`, зазор 4. Без пропа разметка прежняя. Такт 62.' },
]
