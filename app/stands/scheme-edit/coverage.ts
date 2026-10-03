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
  /* Такт 69, П6: «Форма» — группа, выделение с панелью, сайд поля (тип с выбором и без), новое поле, сайд группы, просмотр версии. */
  'tab=form&group=g-body', 'group=g-car&selected=f-vin,f-plate', 'open=field', 'open=field&group=g-body&field=f-trim', 'open=new-field', 'open=group',
  'tab=form&view=v1',
  /* Такт 70, П7 часть 1: «Процессы и шаги» — выделение шагов с панелью, инлайн-загрузчик фото-подсказки, просмотр версии. */
  'steps=s-vin-glass,s-vin-metal,s-pts', 'upload=s-vin-metal', 'tab=processes&view=v1',
  /* Такт 71, П7 часть 2: сайды процесса (правка и новый), сайд шага, нейросети выбранных шагов, оверлей — пустой, с шагом, стек «оверлей → сайд», на чтение. */
  'open=process', 'open=new-process', 'open=step', 'open=networks', 'open=overlay', 'open=overlay-filled', 'open=overlay-step', 'view=v2&open=overlay',
  /* Такт 72, П8: «Витрина» — статусы карточки, новая схема, просмотр версии; пустые «Форма» и «Процессы» сохранённой новой схемы. */
  'tab=showcase&card=needs', 'tab=showcase&card=published', 'data=new&tab=showcase', 'view=v1&tab=showcase',
  'data=new&saved=1&tab=form', 'data=new&saved=1&tab=processes',
] as const
