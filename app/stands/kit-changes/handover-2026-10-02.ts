import type { KitChange } from './handover-2026-10-01'

/**
 * Версия передачи фронтам `handover-2026-10-02` — изменения кирпичиков относительно `handover-2026-10-01`. Метка поставлена тактом 59 после круга
 * правок по общей сдаче. Правило 23 `docs/chat-protocol.md`; тот же текст — в `CHANGELOG.md` и в разделах «Изменения
 * после передачи» в `index.ts` компонентов. Выпущенная версия задним числом не меняется.
 */
export const HANDOVER_NEXT = 'handover-2026-10-02'

export const NEXT: KitChange[] = [
  { id: 'button-feature', component: 'Button', cls: 'added', text: 'Вариант `variant="feature"` — подсветка фичи (автоматизация, новая возможность): подложка `--feature-surface`, текст и иконка `--feature`, наведение и нажатие `--feature-hover`; по весу как `secondary`. Токены роли — `--feature`, `--feature-surface`, `--feature-hover`.' },
  { id: 'icon-visibility', component: 'Icon', cls: 'added', text: 'Глиф `visibility` (глаз) — Material Symbols, официальная выгрузка `default/24px`, границы 880×600.' },
]
