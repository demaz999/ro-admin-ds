/**
 * Состояния оснастки страницы `/scheme-edit` для автопроверки покрытия на `/compare` — такт 61.
 * Правило и обход — `~/stands/free-shoot/coverage.ts`; параметры адреса — `naming.md`, «Такт 61».
 * Список растёт с порциями: каждое новое значение оснастки добавляется сюда.
 */
export const SCHEME_COVERAGE_STATES = [
  '', 'data=new', 'tab=form', 'tab=processes', 'tab=showcase', 'save=saving', 'save=error',
  /* Такт 62, П2: раздел «Права доступа», сайд словаря комментариев. */
  'section=access', 'open=comments',
  /* Такт 63, П3: шесть разделов «Настроек», оба типа схемы у «ИИ-анализа», сайд шаблона PDF, форма обоснования. */
  'section=mobile', 'section=web', 'section=web&open=reason', 'section=ai', 'section=ai&type=house', 'section=anomalies', 'section=pdf', 'open=template',
  /* Такт 64, П4: модалки публикации, сброса и удаления, меню «⋯», сайд истории и дифф версии, просмотр версии, presence. */
  'open=publish', 'data=new&open=first-publish', 'open=reset', 'open=delete', 'open=menu', 'open=history', 'open=history&version=v2', 'view=v1', 'presence=1',
  /* Такт 65, П5: выдача поиска, пустая выдача, подсветка найденного. */
  'q=подпис', 'q=фаыфа', 'found=cadastreMap',
] as const
