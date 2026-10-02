/**
 * Состояния оснастки страницы `/scheme-edit` для автопроверки покрытия на `/compare` — такт 61.
 * Правило и обход — `~/stands/free-shoot/coverage.ts`; параметры адреса — `naming.md`, «Такт 61».
 * Список растёт с порциями: каждое новое значение оснастки добавляется сюда.
 */
export const SCHEME_COVERAGE_STATES = [
  '', 'data=new', 'tab=form', 'tab=processes', 'tab=showcase', 'save=saving', 'save=error',
  /* Такт 62, П2: раздел порции П3 на месте содержимого, сайд словаря комментариев. */
  'section=access', 'open=comments',
] as const
