import type { StepHint } from './hints'

/**
 * Схемы-доноры для «Вставить из другой схемы» — такт 88 (`docs/scheme-edit-review.md`, 4.5; решение 3 оркестратора
 * 2026-10-08). Демо-данные стенда: вымышленные схемы разных типов объекта — транспорт и недвижимость компании-владельца
 * «Демо Страхование» и отобранные шаблоны платформы. Названия, номера и люди — вымышленные.
 *
 * Такт 91 (ревью 5.3, решение 3 оркестратора 2026-10-08): отобранные шаблоны — один каталог на окно «Новая схема осмотра» и на
 * вставку из другой схемы. К шаблону оборудования такта 88 добавлены четыре — легковой автомобиль, мототехника, грузовой
 * транспорт, загородный дом. У схемы — объект (подпись карточки окна), описание и формула наименования объекта: схема, созданная
 * из шаблона, получает формулы по своей анкете (ловушка такта 64 — формулы по умолчанию ссылались бы на чужие поля).
 *
 * Здесь — сырые данные: недостающие атрибуты полей, групп, процессов и шагов модель берёт из значений по умолчанию
 * (`model.ts`, `donorSchemes`). Модуль не импортирует модель во время загрузки — циклического импорта нет (ловушка такта 64).
 */

export interface DonorFieldRaw { id: string, title: string, alias: string, type: string, required?: boolean, placeholder?: string, options?: string, webOnly?: boolean }
export interface DonorGroupRaw { id: string, title: string, alias: string, fields: DonorFieldRaw[] }
export interface DonorStepRaw {
  id: string
  title: string
  description: string
  kind: string
  method: string
  networks: string[]
  hints: StepHint[]
  required?: boolean
  docScan?: boolean
  gallery?: boolean
}
export interface DonorProcessRaw { id: string, title: string, alias: string, steps: DonorStepRaw[] }
export interface DonorSchemeRaw {
  id: string
  title: string
  /** Тип схемы — значение `SCHEME_TYPES`. */
  schemeType: string
  /** Объект осмотра — подпись карточки окна «Новая схема осмотра» (такт 91). */
  object: string
  /** Описание — вторая строка карточки окна (такт 91). */
  description: string
  /** Переменная наименования объекта `{Группа:алиас}` — формулы схемы, созданной из этой (такт 91). */
  formula: string
  /** Компания-владелец; у отобранного шаблона — пусто. */
  owner: string
  /** Отобранный шаблон платформы — виден всем компаниям. */
  template: boolean
  groups: DonorGroupRaw[]
  processes: DonorProcessRaw[]
}

const cat = (id: string): StepHint => ({ kind: 'catalog', id })
const up = (id: string, name: string): StepHint => ({ kind: 'upload', id, name })

export const DONOR_SCHEMES: DonorSchemeRaw[] = [
  {
    id: 'd-osago', title: 'ОСАГО — осмотр легкового автомобиля', schemeType: 'vehicle', owner: 'Демо Страхование', template: false,
    object: 'Легковой автомобиль', description: 'Схема компании: осмотр перед оформлением ОСАГО — четыре стороны, одометр, документы', formula: '{Car:vin}',
    groups: [
      { id: 'dg-lead', title: 'Заявка', alias: 'Lead', fields: [
        { id: 'df-number', title: 'Номер полиса', alias: 'policy_number', type: 'text', required: true },
        { id: 'df-date', title: 'Дата осмотра', alias: 'inspection_date', type: 'date', required: true },
        { id: 'df-phone', title: 'Телефон клиента', alias: 'client_phone', type: 'text', required: true, placeholder: '+7 000 000-00-00' },
        { id: 'df-email', title: 'Email клиента', alias: 'client_email', type: 'text' },
      ] },
      { id: 'dg-car', title: 'Автомобиль', alias: 'Car', fields: [
        { id: 'df-vin', title: 'VIN', alias: 'vin', type: 'text', required: true },
        { id: 'df-plate', title: 'Госномер', alias: 'regnum', type: 'text', required: true },
        { id: 'df-brand', title: 'Марка', alias: 'brand', type: 'text' },
        { id: 'df-model', title: 'Модель', alias: 'model', type: 'text' },
        { id: 'df-mileage', title: 'Пробег', alias: 'mileage', type: 'number' },
      ] },
    ],
    processes: [
      { id: 'dp-auto', title: 'Осмотр автомобиля', alias: 'auto_inspection', steps: [
        { id: 'ds-rear', title: 'Задняя часть', description: 'Снимите заднюю часть автомобиля с расстояния 3–5 метров', kind: 'main', method: '2–7 фото',
          networks: ['Оценка повреждений'], hints: [cat('car-rear'), cat('car-rear-left'), cat('car-rear-right')], required: true },
        { id: 'ds-left', title: 'Вид слева', description: 'Боковая съёмка левой стороны автомобиля', kind: 'main', method: '2–7 фото',
          networks: ['Ракурсы авто · Левая сторона'], hints: [cat('car-left')] },
        { id: 'ds-odometer', title: 'Одометр', description: 'Приборная панель с показаниями пробега', kind: 'main', method: '1 фото',
          networks: [], hints: [cat('car-odometer')], required: true },
        { id: 'ds-interior', title: 'Салон', description: 'Передние сиденья и руль', kind: 'main', method: '2 фото', networks: [], hints: [cat('car-interior')] },
        { id: 'ds-wheels', title: 'Колёса', description: 'Каждое колесо крупно: протектор и диск', kind: 'main', method: '2–7 фото',
          networks: ['Оценка повреждений'], hints: [cat('car-wheel'), up('du-wheel-1', 'wheel-1.jpg')] },
      ] },
      { id: 'dp-docs', title: 'Документы', alias: 'docs', steps: [
        { id: 'ds-sts', title: 'СТС', description: 'Лицевая сторона свидетельства о регистрации', kind: 'tech', method: '2 фото',
          networks: ['Сканер документов'], hints: [cat('doc-sts')], docScan: true },
        { id: 'ds-diag', title: 'Диагностическая карта', description: 'Первая страница действующей карты', kind: 'tech', method: '1 фото',
          networks: [], hints: [cat('doc-diag')], docScan: true },
      ] },
    ],
  },
  {
    id: 'd-flat', title: 'Осмотр квартиры перед страхованием', schemeType: 'house', owner: 'Демо Страхование', template: false,
    object: 'Квартира', description: 'Схема компании: помещения, отделка и инженерные системы квартиры', formula: '{Object:address}',
    groups: [
      { id: 'dg-object', title: 'Объект', alias: 'Object', fields: [
        { id: 'df-address', title: 'Адрес объекта', alias: 'address', type: 'text', required: true },
        { id: 'df-area', title: 'Общая площадь, м²', alias: 'total_area', type: 'number', required: true },
        { id: 'df-floor', title: 'Этаж', alias: 'floor', type: 'number' },
        { id: 'df-finish', title: 'Класс отделки', alias: 'finish_class', type: 'choice', options: 'A0|Без отделки\nB0|Эконом\nC0|Стандарт\nD0|Евроремонт' },
      ] },
      { id: 'dg-owner', title: 'Собственник', alias: 'Owner', fields: [
        { id: 'df-owner-name', title: 'ФИО собственника', alias: 'owner_name', type: 'text', required: true },
        { id: 'df-owner-phone', title: 'Телефон собственника', alias: 'owner_phone', type: 'text' },
        { id: 'df-owner-policy', title: 'Номер полиса', alias: 'policy_number', type: 'text' },
      ] },
    ],
    processes: [
      { id: 'dp-rooms', title: 'Осмотр помещений', alias: 'rooms', steps: [
        { id: 'ds-facade', title: 'Фасад здания', description: 'Общий план здания с улицы', kind: 'main', method: '1 фото', networks: [], hints: [cat('realty-facade')] },
        { id: 'ds-room', title: 'Помещение — общий план', description: 'Снимите помещение от входа', kind: 'main', method: '2–7 фото', networks: [],
          hints: [cat('realty-room')], required: true },
        { id: 'ds-floor', title: 'Пол', description: 'Покрытие пола на всю глубину помещения', kind: 'main', method: '1 фото', networks: [], hints: [cat('realty-floor')] },
        { id: 'ds-ceiling', title: 'Потолок и освещение', description: 'Потолок снизу, светильники в кадре', kind: 'main', method: '1 фото', networks: [], hints: [cat('realty-ceiling')] },
        { id: 'ds-pipes', title: 'Инженерные системы', description: 'Трубы, вентили и радиаторы', kind: 'tech', method: '2 фото', networks: [], hints: [cat('realty-pipes')] },
      ] },
    ],
  },
  {
    id: 't-car', title: 'Осмотр легкового автомобиля', schemeType: 'vehicle', owner: '', template: true,
    object: 'Легковой автомобиль', description: 'Предстраховой осмотр: четыре стороны, VIN, одометр, салон и документы', formula: '{Car:vin}',
    groups: [
      { id: 'tg-car-lead', title: 'Заявка', alias: 'Lead', fields: [
        { id: 'tf-car-policy', title: 'Номер полиса', alias: 'policy_number', type: 'text', required: true },
        { id: 'tf-car-insurer', title: 'Страхователь', alias: 'insurer', type: 'text', required: true },
        { id: 'tf-car-phone', title: 'Телефон клиента', alias: 'client_phone', type: 'text', placeholder: '+7 000 000-00-00' },
      ] },
      { id: 'tg-car-car', title: 'Автомобиль', alias: 'Car', fields: [
        { id: 'tf-car-vin', title: 'VIN', alias: 'vin', type: 'text', required: true },
        { id: 'tf-car-plate', title: 'Госномер', alias: 'regnum', type: 'text', required: true },
        { id: 'tf-car-brand', title: 'Марка', alias: 'brand', type: 'text' },
        { id: 'tf-car-model', title: 'Модель', alias: 'model', type: 'text' },
        { id: 'tf-car-mileage', title: 'Пробег', alias: 'mileage', type: 'number' },
      ] },
    ],
    processes: [
      { id: 'tp-car-auto', title: 'Осмотр автомобиля', alias: 'auto_inspection', steps: [
        { id: 'ts-car-front', title: 'Передняя часть', description: 'Снимите переднюю часть с расстояния 3–5 метров', kind: 'main', method: '2–7 фото',
          networks: ['Ракурсы авто · Передняя'], hints: [cat('car-front')], required: true },
        { id: 'ts-car-rear', title: 'Задняя часть', description: 'Снимите заднюю часть с расстояния 3–5 метров', kind: 'main', method: '2–7 фото',
          networks: ['Оценка повреждений'], hints: [cat('car-rear')], required: true },
        { id: 'ts-car-left', title: 'Вид слева', description: 'Левая сторона целиком, автомобиль в кадре полностью', kind: 'main', method: '2–7 фото',
          networks: ['Ракурсы авто · Левая сторона'], hints: [cat('car-left')] },
        { id: 'ts-car-right', title: 'Вид справа', description: 'Правая сторона целиком, автомобиль в кадре полностью', kind: 'main', method: '2–7 фото',
          networks: ['Ракурсы авто · Правая сторона'], hints: [cat('car-right')] },
        { id: 'ts-car-vin', title: 'VIN на кузове', description: 'Выбитый номер крупно — все символы читаются', kind: 'main', method: '1 фото',
          networks: ['Распознавание VIN'], hints: [cat('car-vin-body')], required: true },
        { id: 'ts-car-odometer', title: 'Одометр', description: 'Приборная панель с показаниями пробега', kind: 'main', method: '1 фото',
          networks: [], hints: [cat('car-odometer')] },
        { id: 'ts-car-interior', title: 'Салон', description: 'Передние сиденья и приборная панель', kind: 'main', method: '2 фото', networks: [], hints: [] },
      ] },
      { id: 'tp-car-docs', title: 'Документы', alias: 'docs', steps: [
        { id: 'ts-car-sts', title: 'СТС', description: 'Лицевая сторона свидетельства о регистрации', kind: 'tech', method: '2 фото',
          networks: ['Сканер документов'], hints: [cat('doc-sts')], docScan: true },
        { id: 'ts-car-policy', title: 'Страховой полис', description: 'Первая страница действующего полиса', kind: 'tech', method: '1 фото',
          networks: ['Сканер документов'], hints: [cat('doc-policy')], docScan: true },
      ] },
    ],
  },
  {
    id: 't-moto', title: 'Осмотр мототехники', schemeType: 'vehicle', owner: '', template: true,
    object: 'Мототехника', description: 'Мотоцикл и скутер: обе стороны, номер рамы, пробег и регистрационный документ', formula: '{Moto:vin}',
    groups: [
      { id: 'tg-moto-lead', title: 'Заявка', alias: 'Lead', fields: [
        { id: 'tf-moto-policy', title: 'Номер полиса', alias: 'policy_number', type: 'text', required: true },
        { id: 'tf-moto-insurer', title: 'Страхователь', alias: 'insurer', type: 'text', required: true },
      ] },
      { id: 'tg-moto-moto', title: 'Мототехника', alias: 'Moto', fields: [
        { id: 'tf-moto-vin', title: 'Номер рамы', alias: 'vin', type: 'text', required: true },
        { id: 'tf-moto-plate', title: 'Госномер', alias: 'regnum', type: 'text', required: true },
        { id: 'tf-moto-brand', title: 'Марка и модель', alias: 'brand', type: 'text' },
        { id: 'tf-moto-mileage', title: 'Пробег', alias: 'mileage', type: 'number' },
      ] },
    ],
    processes: [
      { id: 'tp-moto-moto', title: 'Осмотр мототехники', alias: 'moto_inspection', steps: [
        { id: 'ts-moto-front', title: 'Спереди', description: 'Фара, вилка и переднее колесо в кадре', kind: 'main', method: '1 фото', networks: [], hints: [cat('car-front')], required: true },
        { id: 'ts-moto-left', title: 'Вид слева', description: 'Левая сторона целиком', kind: 'main', method: '1 фото', networks: [], hints: [cat('car-left')], required: true },
        { id: 'ts-moto-right', title: 'Вид справа', description: 'Правая сторона целиком', kind: 'main', method: '1 фото', networks: [], hints: [cat('car-right')], required: true },
        { id: 'ts-moto-vin', title: 'Номер рамы', description: 'Выбитый номер на рулевой колонке крупно', kind: 'main', method: '1 фото',
          networks: ['Распознавание VIN'], hints: [cat('car-vin-body')], required: true },
        { id: 'ts-moto-odometer', title: 'Приборная панель', description: 'Показания пробега при включённом зажигании', kind: 'main', method: '1 фото', networks: [], hints: [cat('car-odometer')] },
      ] },
      { id: 'tp-moto-docs', title: 'Документы', alias: 'docs', steps: [
        { id: 'ts-moto-sts', title: 'СТС', description: 'Лицевая сторона свидетельства о регистрации', kind: 'tech', method: '2 фото',
          networks: ['Сканер документов'], hints: [cat('doc-sts')], docScan: true },
      ] },
    ],
  },
  {
    id: 't-truck', title: 'Осмотр грузового транспорта', schemeType: 'vehicle', owner: '', template: true,
    object: 'Грузовой транспорт', description: 'Кабина, борта и кузов, колёса и документы перевозчика', formula: '{Truck:vin}',
    groups: [
      { id: 'tg-truck-lead', title: 'Заявка', alias: 'Lead', fields: [
        { id: 'tf-truck-policy', title: 'Номер полиса', alias: 'policy_number', type: 'text', required: true },
        { id: 'tf-truck-carrier', title: 'Перевозчик', alias: 'carrier', type: 'text', required: true },
        { id: 'tf-truck-phone', title: 'Телефон водителя', alias: 'driver_phone', type: 'text', placeholder: '+7 000 000-00-00' },
      ] },
      { id: 'tg-truck-truck', title: 'Транспорт', alias: 'Truck', fields: [
        { id: 'tf-truck-vin', title: 'VIN', alias: 'vin', type: 'text', required: true },
        { id: 'tf-truck-plate', title: 'Госномер', alias: 'regnum', type: 'text', required: true },
        { id: 'tf-truck-body', title: 'Тип кузова', alias: 'body_kind', type: 'choice', options: 'tent|Тент\nfridge|Рефрижератор\ntipper|Самосвал' },
        { id: 'tf-truck-load', title: 'Грузоподъёмность, т', alias: 'load_capacity', type: 'number' },
      ] },
    ],
    processes: [
      { id: 'tp-truck-body', title: 'Осмотр кабины и кузова', alias: 'truck_inspection', steps: [
        { id: 'ts-truck-front', title: 'Кабина спереди', description: 'Кабина целиком с расстояния 5–7 метров', kind: 'main', method: '2–7 фото',
          networks: ['Оценка повреждений'], hints: [cat('car-front')], required: true },
        { id: 'ts-truck-left', title: 'Левый борт', description: 'Левый борт и кузов целиком', kind: 'main', method: '2–7 фото', networks: [], hints: [cat('car-left')], required: true },
        { id: 'ts-truck-right', title: 'Правый борт', description: 'Правый борт и кузов целиком', kind: 'main', method: '2–7 фото', networks: [], hints: [cat('car-right')], required: true },
        { id: 'ts-truck-rear', title: 'Кузов сзади', description: 'Двери кузова и задние фонари', kind: 'main', method: '2–7 фото', networks: [], hints: [cat('car-rear')] },
        { id: 'ts-truck-wheels', title: 'Колёса', description: 'Каждая ось: протектор и диски', kind: 'main', method: '2–7 фото', networks: [], hints: [cat('car-wheel')] },
        { id: 'ts-truck-vin', title: 'VIN', description: 'Табличка с VIN крупно', kind: 'main', method: '1 фото', networks: ['Распознавание VIN'], hints: [cat('car-vin-body')], required: true },
      ] },
      { id: 'tp-truck-docs', title: 'Документы', alias: 'docs', steps: [
        { id: 'ts-truck-sts', title: 'СТС', description: 'Лицевая сторона свидетельства о регистрации', kind: 'tech', method: '2 фото',
          networks: ['Сканер документов'], hints: [cat('doc-sts')], docScan: true },
        { id: 'ts-truck-diag', title: 'Диагностическая карта', description: 'Первая страница действующей карты', kind: 'tech', method: '1 фото',
          networks: [], hints: [cat('doc-diag')], docScan: true },
      ] },
    ],
  },
  {
    id: 't-house', title: 'Осмотр загородного дома', schemeType: 'house', owner: '', template: true,
    object: 'Загородный дом', description: 'Фасад, кровля, участок, помещения и инженерные системы', formula: '{House:address}',
    groups: [
      { id: 'tg-house-object', title: 'Объект', alias: 'House', fields: [
        { id: 'tf-house-address', title: 'Адрес объекта', alias: 'address', type: 'text', required: true },
        { id: 'tf-house-area', title: 'Общая площадь, м²', alias: 'total_area', type: 'number', required: true },
        { id: 'tf-house-year', title: 'Год постройки', alias: 'year_built', type: 'number' },
        { id: 'tf-house-walls', title: 'Материал стен', alias: 'wall_material', type: 'choice', options: 'brick|Кирпич\nframe|Каркас\ntimber|Брус' },
      ] },
      { id: 'tg-house-owner', title: 'Собственник', alias: 'Owner', fields: [
        { id: 'tf-house-owner', title: 'ФИО собственника', alias: 'owner_name', type: 'text', required: true },
        { id: 'tf-house-phone', title: 'Телефон собственника', alias: 'owner_phone', type: 'text' },
      ] },
    ],
    processes: [
      { id: 'tp-house-house', title: 'Осмотр дома', alias: 'house_inspection', steps: [
        { id: 'ts-house-facade', title: 'Фасад', description: 'Дом целиком с улицы', kind: 'main', method: '2–7 фото', networks: [], hints: [cat('realty-facade')], required: true },
        { id: 'ts-house-roof', title: 'Кровля', description: 'Кровля и карниз снизу', kind: 'main', method: '1 фото', networks: [], hints: [cat('realty-roof')] },
        { id: 'ts-house-territory', title: 'Участок и ограждение', description: 'Дом с территорией издали', kind: 'main', method: '1 фото', networks: [], hints: [cat('realty-territory')] },
        { id: 'ts-house-room', title: 'Помещение — общий план', description: 'Каждое помещение от входа', kind: 'main', method: '2–7 фото', networks: [], hints: [cat('realty-room')], required: true },
        { id: 'ts-house-pipes', title: 'Инженерные системы', description: 'Котёл, трубы и вентили', kind: 'tech', method: '2 фото', networks: [], hints: [cat('realty-pipes')] },
      ] },
    ],
  },
  {
    id: 'd-machine', title: 'Осмотр спецтехники в лизинге', schemeType: 'equipment', owner: '', template: true,
    object: 'Спецтехника', description: 'Техника в лизинге: общий вид, шильдик, моточасы и документы по договору', formula: '{Machine:serial_number}',
    groups: [
      { id: 'dg-machine', title: 'Техника', alias: 'Machine', fields: [
        { id: 'df-serial', title: 'Серийный номер', alias: 'serial_number', type: 'text', required: true },
        { id: 'df-maker', title: 'Производитель', alias: 'manufacturer', type: 'text' },
        { id: 'df-year', title: 'Год выпуска', alias: 'year', type: 'number' },
        { id: 'df-hours', title: 'Моточасы', alias: 'engine_hours', type: 'number' },
      ] },
      { id: 'dg-lease', title: 'Договор лизинга', alias: 'Lease', fields: [
        { id: 'df-contract', title: 'Номер договора', alias: 'contract_number', type: 'text', required: true },
        { id: 'df-handover', title: 'Дата передачи', alias: 'handover_date', type: 'date' },
      ] },
    ],
    processes: [
      { id: 'dp-machine', title: 'Осмотр техники', alias: 'machine', steps: [
        { id: 'ds-overview', title: 'Общий вид', description: 'Техника целиком с четырёх сторон', kind: 'main', method: '2–7 фото', networks: [], hints: [] },
        { id: 'ds-plate', title: 'Табличка изготовителя', description: 'Шильдик с серийным номером крупно', kind: 'main', method: '1 фото',
          networks: ['Распознавание шильдиков'], hints: [cat('car-plate')], required: true },
        { id: 'ds-hours', title: 'Счётчик моточасов', description: 'Показания на приборной панели', kind: 'main', method: '1 фото', networks: [], hints: [cat('car-odometer')] },
        { id: 'ds-engine', title: 'Двигатель', description: 'Моторный отсек сверху', kind: 'main', method: '2 фото', networks: [], hints: [cat('car-engine')] },
      ] },
      { id: 'dp-lease-docs', title: 'Документы по договору', alias: 'lease_docs', steps: [
        { id: 'ds-contract', title: 'Договор лизинга', description: 'Страница с подписями сторон', kind: 'tech', method: '2 фото',
          networks: ['Сканер документов'], hints: [cat('doc-contract')], docScan: true },
        { id: 'ds-act', title: 'Акт приёма-передачи', description: 'Первая страница акта', kind: 'tech', method: '1 фото',
          networks: ['Сканер документов'], hints: [cat('doc-act')], docScan: true },
      ] },
    ],
  },
]
