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
  /*
   * Такт 86, поиск как в IDE: выдача с охватом, значениями и переключателями, повтор в другой раскладке, «Недавние»,
   * фильтр «Изменено в черновике», режим «найдено» на «Настройках», «Форме» и по изменённому.
   */
  'q=фото', 'q=фото&scope=settings', 'q=hfpvsn', 'recent=demo', 'modified=list', 'find=фото', 'find=госномер', 'modified=1',
  /*
   * Такт 87, фото-подсказки: каталог из ячейки (поиск с подсветкой, пустая выдача в категории, выбор), каталог поверх сайда
   * шага с отмеченными «Уже у шага», просмотр крупно из каталога и из ячейки; массовая заливка — подбор, все шаги, «Нет
   * предложения» (тип «Недвижимость»), только выбранные, второй слой «Заменить».
   */
  'open=catalog', 'open=catalog&catq=кузов', 'open=catalog&catq=кузов&category=documents', 'open=catalog&category=realty&picked=realty-facade,realty-roof',
  'open=step-catalog', 'open=catalog-view', 'open=hint-view', 'open=fill', 'open=fill&fill=all', 'open=fill&type=house',
  'open=fill&steps=s-vin-metal,s-pts', 'open=fill-catalog',
  /*
   * Такт 88, вставка из другой схемы и тексты процесса: сайд вставки полей — схемы, поиск, пустой поиск, группы донора, поля с
   * конфликтом алиаса и выбором; сайд вставки шагов — схемы, шаги с выбором и процесс-цель; оверлей с разделом «Тексты в
   * приложении» — без типа объекта, с типом, заполненный, поповер «Все варианты», на чтение.
   */
  'open=paste-fields', 'open=paste-fields&pasteq=квартир', 'open=paste-fields&pasteq=трактор', 'open=paste-fields&donor=d-osago',
  'open=paste-fields&donor=d-osago&part=dg-lead&pick=df-number,df-date,df-phone', 'open=paste-steps',
  'open=paste-steps&donor=d-osago&part=dp-auto&pick=ds-rear,ds-left&target=p-docs',
  'open=overlay-texts', 'open=overlay-texts&otype=car', 'open=overlay-texts&otype=car&texts=filled', 'open=overlay-variants&otype=house',
  'view=v2&open=overlay-texts',
  /*
   * Такт 89, демо-осмотр и превью у «?»: оверлей «По шагам» на экранах всех видов (начало, промежуточный, анкета, шаг с отказом и
   * обводкой, чек-лист, повторяемый процесс, подтверждение, готово, звонок, отказ), «Карта», новая схема, просмотр версии;
   * поповеры «?» настроек и поля; фрагмент экрана в разделе текстов.
   */
  'open=demo', 'open=demo&app=full&screen=intro', 'open=demo&app=full&screen=form:g-body', 'open=demo&app=full&screen=step:p-auto:s-front&mark=setting:general.behavior.refuse',
  'open=demo&app=checklist&screen=checklist:p-auto', 'open=demo&app=full&screen=repeat-list:p-damage', 'open=demo&app=full&screen=repeat-more:p-damage',
  'open=demo&app=full&screen=confirm', 'open=demo&app=full&screen=call', 'open=demo&app=full&screen=refuse', 'open=demo&app=full&demo=map',
  'data=new&open=demo&screen=form:none', 'data=new&open=demo&demo=map', 'view=v1&open=demo',
  'help=refuse', 'app=full&help=confirmCheckbox', 'app=full&help=phone', 'help=startAfterCreate', 'tab=form&help=field:f-vin', 'tab=form&help=field:f-start',
  /*
   * Такт 90, витрина: цена «от» — вручную, вручную ниже тарифа с предупреждением, не показывать (из тарифа и без тарифа — состояния
   * такта 72 `tab=showcase`, `data=new&tab=showcase`); превью публичной страницы — компьютер и телефон, страница и карточка в
   * каталоге, новая схема, просмотр версии, без цены.
   */
  'tab=showcase&price=manual', 'tab=showcase&price=low', 'tab=showcase&price=hidden',
  'open=site', 'open=site&device=phone', 'open=site&site=card', 'open=site&device=phone&site=card', 'data=new&open=site', 'view=v1&open=site',
  'open=site&price=hidden',
  /*
   * Такт 91, создание схемы: окно «Новая схема осмотра» на фоне списка — «С чего начать» по трём источникам, «Основа» шаблона и
   * пустой схемы, окно закрыто; режим создания — схема из шаблона (полоса, чип, маркеры, «Далее» внизу этапов на трёх вкладках),
   * поповер готовности, полоса свёрнута, пустая схема и первая публикация с блокирующей проверкой и без, копия, «Проверка: N» после
   * публикации, новая схема без идентификатора с поповером.
   */
  '/scheme-edit/new', '/scheme-edit/new?source=other', '/scheme-edit/new?source=recent', '/scheme-edit/new?step=base', '/scheme-edit/new?step=empty',
  '/scheme-edit/new?open=closed',
  'data=created&from=t-car', 'data=created&from=t-car&tab=form', 'data=created&from=t-car&tab=processes', 'data=created&from=t-car&open=readiness',
  'data=created&from=t-car&strip=collapsed', 'data=created&from=empty', 'data=created&from=empty&open=first-publish', 'data=created&from=t-car&open=first-publish',
  'open=copy', 'open=readiness', 'data=new&open=readiness',
] as const

/**
 * Такт 92 — узкий экран 375 × 812 (`docs/scheme-edit-review.md`, 4.10): отдельный проход покрытия по раскладке телефона. Шапка с нижней
 * полосой, выбор раздела списком на семи разделах, «Форма» и «Процессы» строками-карточками, выдача поиска во всё окно, режим
 * «найдено», меню «⋯» из нижней полосы, сайды, окна и оверлеи во всё окно, демо-осмотр без рамки телефона — три вкладки, превью
 * страницы, режим создания с полосой и чипом, просмотр версии, выезжающее меню каркаса.
 */
export const SCHEME_PHONE_STATES = [
  '', 'section=mobile', 'section=web', 'section=access', 'section=ai', 'section=anomalies', 'section=pdf',
  'tab=form', 'tab=form&group=g-body', 'tab=processes', 'tab=showcase', 'data=new', 'data=new&saved=1&tab=form',
  'q=фото', 'q=фаыфа', 'find=фото', 'open=menu', 'drawer=1', 'help=refuse',
  'open=demo', 'open=demo&pane=toc', 'open=demo&pane=sources', 'open=demo&demo=map', 'open=demo&app=full&screen=step:p-auto:s-front',
  'open=site', 'open=site&device=phone', 'open=step', 'open=field', 'open=group', 'open=process', 'open=networks', 'open=comments', 'open=template',
  'open=publish', 'data=new&open=first-publish', 'open=reset', 'open=delete', 'open=history', 'open=history&version=v2',
  'open=overlay-filled', 'open=overlay-texts', 'open=catalog', 'open=fill', 'open=paste-fields&donor=d-osago&part=dg-lead', 'open=copy',
  'view=v1', 'view=v1&tab=processes', 'data=created&from=t-car', 'data=created&from=t-car&open=readiness', 'open=readiness',
] as const
