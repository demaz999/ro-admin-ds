/**
 * Состояния оснастки страницы `/tariffs` для автопроверки покрытия на `/compare` — такт 77.
 * Правило и обход — `~/stands/free-shoot/coverage.ts`; параметры адреса — `naming.md`, «Такт 77».
 * Список растёт с порциями: каждое новое значение оснастки добавляется сюда.
 */
export const TARIFFS_COVERAGE_STATES = [
  /* Такт 77, П1: шапка, вкладки, статус сохранения; набор без типов и с пустой группой. */
  '', 'tab=types', 'tab=schemes', 'save=saving', 'save=error', 'data=empty',
] as const
