/**
 * Состояния оснастки страницы `/tariffs` для автопроверки покрытия на `/compare` — такт 77.
 * Правило и обход — `~/stands/free-shoot/coverage.ts`; параметры адреса — `naming.md`, «Такт 77».
 * Список растёт с порциями: каждое новое значение оснастки добавляется сюда.
 */
export const TARIFFS_COVERAGE_STATES = [
  /* Такт 77, П1: шапка, вкладки, статус сохранения; набор без типов и с пустой группой. */
  '', 'tab=types', 'tab=schemes', 'save=saving', 'save=error', 'data=empty',
  /* Такт 78, П2: общая шкала включена; открыта подсказка «Как считается стоимость». */
  'scale=on', 'open=help',
  /* Такт 79, П3: раскрытые строки типов (шкала выключена и «По ролям»), выбор типа, пустой список типов. */
  'expand=t-car,t-special', 'open=type-picker', 'tab=types&data=empty',
  /* Такт 80, П4: вкладка «Схемы осмотра» с пустой группой; панель группы в трёх режимах; панель пустой группы. */
  'tab=schemes&data=empty', 'open=group', 'open=group&mode=fixed', 'open=group&mode=scale', 'open=group&group=g-realty&data=empty',
  /*
   * Такт 81, П5: панель схемы — «Ценообразование» в трёх режимах (шкала «По ролям» у `s-pre`), схема без повторяемых
   * процессов; «Типы объектов» — глобальные, индивидуальные, глобальных нет.
   */
  'open=scheme', 'open=scheme&mode=individual', 'open=scheme&scheme=s-pre', 'open=scheme&scheme=s-moto',
  'open=scheme&panel=types', 'open=scheme&scheme=s-flat&panel=types', 'open=scheme&panel=types&data=empty',
  /*
   * Такт 82, П6.1: список периодов, окно планирования; запланированный, черновик с плашкой, окно удаления черновика; архив —
   * только просмотр на трёх вкладках и в панелях.
   */
  'open=periods', 'open=plan', 'period=planned', 'period=draft', 'open=delete-draft',
  'period=archive', 'period=archive&expand=t-special', 'period=archive&tab=schemes', 'period=archive&open=group&group=g-realty',
  'period=archive&open=scheme', 'period=archive&open=scheme&scheme=s-flat&panel=types',
  /*
   * Такт 83, П6.2: окна «Сохранить изменения» — «Применить изменения?», очередь в обоих выборах, «Дата занята» в обоих выборах
   * (второй — тоном ошибки), «Уже запланирован» в обоих; загрузка страницы; отказ применения.
   */
  'open=apply', 'open=queue', 'open=queue&queue=this', 'open=occupied', 'open=occupied&choice=overwrite', 'open=conflict',
  'open=conflict&choice=replace', 'state=loading', 'save=fail',
] as const
