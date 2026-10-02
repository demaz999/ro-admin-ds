import type { KitChange } from './handover-2026-10-01'

/**
 * Следующая версия передачи фронтам (черновик) — изменения кирпичиков относительно `handover-2026-10-01`. Имя метки и
 * дату впишет такт сдачи. Правило 23 `docs/chat-protocol.md`; тот же текст — в `CHANGELOG.md` и в разделах «Изменения
 * после передачи» в `index.ts` компонентов.
 */
export const DRAFT: KitChange[] = [
  { id: 'button-feature', component: 'Button', cls: 'added', text: 'Вариант `variant="feature"` — подсветка фичи (автоматизация, новая возможность): подложка `--feature-surface`, текст и иконка `--feature`, наведение и нажатие `--feature-hover`; по весу как `secondary`. Токены роли — `--feature`, `--feature-surface`, `--feature-hover`, пара для тёмной темы — в `.dark`.' },
  { id: 'icon-visibility', component: 'Icon', cls: 'added', text: 'Глиф `visibility` (глаз) — Material Symbols, официальная выгрузка `default/24px`, границы 880×600.' },
]
