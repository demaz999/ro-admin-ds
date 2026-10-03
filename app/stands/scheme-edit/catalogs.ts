/**
 * Справочники стенда страницы «Редактирование схемы осмотра» — вымышленные. Вынесены из модели тактом 64: ими
 * пользуются модель, дифф и каталог настроек (`diff.ts`) — общий модуль развязывает их импорты.
 */

/** Классы отделки A0–D1: код и название статичны, правится стоимость (аудит, «Раздел „ИИ-анализ стоимости“»). */
export const FINISH_CLASSES = [
  { code: 'A0', title: 'Без отделки', cost: 0 },
  { code: 'A1', title: 'Под чистовую отделку', cost: 15000 },
  { code: 'B0', title: 'Эконом', cost: 5000 },
  { code: 'B1', title: 'Эконом+', cost: 20000 },
  { code: 'C0', title: 'Стандарт', cost: 25000 },
  { code: 'C1', title: 'Стандарт+', cost: 35000 },
  { code: 'D0', title: 'Евроремонт', cost: 50000 },
  { code: 'D1', title: 'Эксклюзив', cost: 200000 },
] as const

/** 14 детекторов аномалий: три группы и одиночный без подзаголовка (r2 §4; макет `33351:9928`). */
export const DETECTOR_GROUPS = [
  { id: 'geo', title: 'Геолокация и трек', detectors: [
    { id: 'spoof', title: 'Подмена координат', help: 'Координаты кадра заданы программно, а не получены от датчиков устройства' },
    { id: 'noCoords', title: 'Отсутствие исходных координат', help: 'У кадра нет координат съёмки' },
    { id: 'speed', title: 'Аномалии скорости перемещения', help: 'Между кадрами исполнитель переместился быстрее возможного' },
    { id: 'angles', title: 'Аномалии углов направленности движения', help: 'Направление движения между кадрами меняется неправдоподобно' },
    { id: 'cluster', title: 'Аномалии кластеризации (съёмка вне основной точки)', help: 'Часть кадров снята далеко от основной точки осмотра' },
  ] },
  { id: 'device', title: 'Целостность устройства', detectors: [
    { id: 'root', title: 'Разблокирован root-доступ', help: 'На устройстве открыт доступ администратора системы' },
    { id: 'checksum', title: 'Аномалия в контрольных суммах', help: 'Контрольная сумма приложения не совпала с эталонной' },
    { id: 'versions', title: 'Разные версии приложения / телефона', help: 'В одном осмотре — кадры с разных версий приложения или устройств' },
  ] },
  { id: 'quality', title: 'Качество съёмки', detectors: [
    { id: 'blur', title: 'Размытые изображения', help: 'Кадр нерезкий' },
    { id: 'light', title: 'Плохая освещённость', help: 'Кадр слишком тёмный или пересвеченный' },
    { id: 'palette', title: 'Сниженная цветовая палитра', help: 'В кадре мало цветов: возможна пересъёмка копии' },
    { id: 'screen', title: 'Съёмка с экрана', help: 'Кадр снят с экрана другого устройства' },
    { id: 'viewpoint', title: 'Детектор ракурсов транспортных средств', help: 'Ракурс автомобиля не соответствует шагу' },
  ] },
  { id: 'single', title: '', detectors: [
    { id: 'otherRefusals', title: 'Отказ по другим осмотрам исполнителя', help: 'У исполнителя есть отказы по другим осмотрам' },
  ] },
] as const
export const DETECTOR_IDS = DETECTOR_GROUPS.flatMap(g => g.detectors.map(d => d.id))
export const DETECTORS_ON = ['spoof', 'noCoords', 'blur', 'screen']

/* Справочники стенда — вымышленные. */
export const PHOTO_RESOLUTIONS = [
  { value: 'low', label: 'Низкое — 1 Мп' },
  { value: 'medium', label: 'Среднее — 2 Мп' },
  { value: 'high', label: 'Высокое — 5 Мп' },
]
export const VIDEO_RESOLUTIONS = [
  { value: 'vga', label: 'Ниже среднего — VGA' },
  { value: 'hd', label: 'Среднее — HD' },
  { value: 'fullhd', label: 'Высокое — Full HD' },
]
/** Роли выполнения и создания осмотра — шире ролей «Общих»: с создателем осмотра и клиентом (макет `33351:6108`). */
export const ACCESS_ROLES = [
  { value: 'creator', label: 'Создатель осмотра' },
  { value: 'admin', label: 'Администратор' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'operator', label: 'Оператор осмотров' },
  { value: 'agent', label: 'Агент' },
  { value: 'client', label: 'Клиент' },
]
/** «И выше» — лестница ролей для видимости и доступа к документам. */
export const ROLE_LADDER = [
  { value: 'client', label: 'Клиент и выше' },
  { value: 'agent', label: 'Агент и выше' },
  { value: 'operator', label: 'Оператор осмотров' },
  { value: 'expert', label: 'Эксперт и выше' },
  { value: 'admin', label: 'Только администратор' },
]
const GROUP_NAMES = ['Осмотр Юг', 'Служба проверок', 'Региональные операторы', 'Осмотр Восток', 'Служба контроля', 'Региональный контроль', 'Осмотр Север', 'Служба осмотров',
  'Контроль Запад', 'Контроль Центр', 'Осмотр Урал', 'Выездные эксперты', 'Партнёрская сеть', 'Осмотр Волга', 'Контроль качества', 'Осмотр Сибирь', 'Дежурная смена',
  'Осмотр Кавказ', 'Обучение и стажёры', 'Осмотр Дальний Восток', 'Проверка документов', 'Осмотр Северо-Запад', 'Резервная группа']
const GROUP_OWNERS = ['Демо Страхование', 'Пример Лизинг', 'Образец Банк', 'Тест Финанс']
/** Группы доступа — 23 строки: три страницы по десять. */
export const ACCESS_GROUPS = GROUP_NAMES.map((name, k) => ({ id: `grp-${String(k + 1).padStart(2, '0')}`, name, owner: GROUP_OWNERS[k % GROUP_OWNERS.length]! }))
export const REGION_MATRICES = [
  { value: 'common', label: '[ОБЩИЙ] Корректировки по регионам' },
  { value: 'south', label: 'Корректировки: южные регионы' },
  { value: 'north', label: 'Корректировки: северные регионы' },
]
export const PDF_PROGRAMS = [
  { value: 'act-vehicle-v2', label: 'act-vehicle-v2' },
  { value: 'tech-report-v1', label: 'tech-report-v1' },
  { value: 'client-summary-v1', label: 'client-summary-v1' },
]
export const PDF_WHEN = [
  { value: 'always', label: 'Всегда' },
  { value: 'expertise', label: 'После успешной экспертизы' },
  { value: 'signed', label: 'После подписания' },
]
export const PDF_SIGNERS = [
  { value: 'client', label: 'Клиент' },
  { value: 'executor', label: 'Исполнитель осмотра' },
]
export const SCHEME_TYPES = [
  { value: 'vehicle', label: 'Осмотр транспорта' },
  { value: 'house', label: 'Осмотр недвижимости' },
  { value: 'equipment', label: 'Осмотр оборудования' },
]
export const OWNERS = ['Демо Страхование', 'Пример Лизинг', 'Образец Банк'].map(v => ({ value: v, label: v }))
export const ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'approver', label: 'Согласующий' },
  { value: 'expert', label: 'Эксперт' },
  { value: 'operator', label: 'Оператор' },
  { value: 'agent', label: 'Агент' },
]
export const STATUS_DICTIONARIES = [
  { value: 'standard', label: 'Стандартный словарь статусов' },
  { value: 'short', label: 'Сокращённый словарь статусов' },
]
export const COMMENT_DICTIONARIES = [
  { value: 'vehicle', label: 'Комментарии к осмотру транспорта', comments: ['Фото нерезкое', 'Не виден VIN', 'Кадр снят не с того ракурса', 'Объект снят не полностью'] },
  { value: 'common', label: 'Общий словарь комментариев', comments: ['Фото нерезкое', 'Недостаточно света', 'Кадр не относится к шагу'] },
  { value: 'docs', label: 'Комментарии к документам', comments: ['Документ не читается', 'Нет страницы с отметками'] },
]
export const DEADLINE_EVENTS = [
  { value: 'expertise', label: 'От последнего попадания в экспертизу' },
  { value: 'created', label: 'От создания осмотра' },
  { value: 'finished', label: 'От завершения съёмки' },
]
/** Служебные переменные формул и демо-значения для превью; переменные полей берутся из формы черновика. */
export const SYSTEM_VARIABLES = [
  { value: 'Inspection:number', label: 'Номер осмотра', group: 'Осмотр', sample: '№ 1024' },
  { value: 'Inspection:date', label: 'Дата осмотра', group: 'Осмотр', sample: '02.10.2026' },
  { value: 'Scheme:type', label: 'Тип схемы', group: 'Схема', sample: 'Осмотр транспорта' },
]
export const FIELD_SAMPLES: Record<string, string> = { policy_number: 'К-0001024', vin: 'DEMO0000000001024', regnum: 'А000АА00', mileage: '48 200' }

/* ------------------------------ «Форма» — такт 69, П6 ------------------------------ */
/** Типы поля формы; `choice` — тип с выбором: у него секция «Варианты выбора» (аудит, «Сайд „Редактирование поля“ — эталон»). */
export const FIELD_TYPES = [
  { value: 'text', label: 'Текст' },
  { value: 'number', label: 'Число' },
  { value: 'date', label: 'Дата' },
  { value: 'checkbox', label: 'Чекбокс' },
  { value: 'choice', label: 'Выбор' },
]
/** Настройки группы — блок «Настройки группы» макета `33179:4467`: экран создания, показ в мобильном, редактирование. */
export const CREATE_SCREENS = [
  { value: '1', label: '1-й экран' },
  { value: '2', label: '2-й экран' },
  { value: 'none', label: 'Не показывать при создании' },
]
export const MOBILE_SHOW = [
  { value: 'after-create', label: 'После создания' },
  { value: 'always', label: 'Всегда' },
  { value: 'never', label: 'Не показывать' },
]
/** «Конфигурация подсказок» сайда поля: содержимое подсказок — в отдельном разделе (макет `32936:16570`). */
export const HINT_CONFIGS = [
  { value: 'none', label: 'Без подсказок' },
  { value: 'standard', label: 'Стандартные подсказки' },
  { value: 'photo', label: 'Подсказки с фото-примером' },
]

const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
/**
 * Алиас по названию — «предложить по названию» сайда поля и «Заполнить алиасы автоматически»: транслитерация латиницей,
 * слова через подчёркивание, без пробелов (подсказка макета `32936:16479`). Занятые алиасы получают суффикс `_2`, `_3`.
 */
export function suggestAlias(title: string, taken: readonly string[] = []): string {
  const base = [...title.toLowerCase()].map(c => LATIN[c] ?? c).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field'
  let alias = base
  for (let k = 2; taken.includes(alias); k++) alias = `${base}_${k}`
  return alias
}
/** Алиас — латиница, цифры и подчёркивание, без пробелов; первая — буква. */
export const ALIAS_RE = /^[A-Za-z][A-Za-z0-9_]*$/
