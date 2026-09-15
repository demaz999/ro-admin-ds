/**
 * Раскладка раздела «Палитра» на витрине.
 *
 * Порядок групп — `docs/naming.md`, раздел 2 «Цветовые роли», подраздел в подраздел, плюс
 * тени из раздела 4. Своей таксономии витрина не заводит.
 *
 * Единица подачи — строка таблицы (решение владельца, 2026-09-15). Два вида таблиц:
 * таблица ролей (`tokens`, `shadows`) и матрица состояний (`ramps`). Набор осей матрицы
 * выводится из того, какие состояния в группе есть на самом деле.
 *
 * Копирайт — для читателя-фронта и дизайнера: без имён переменных Figma, без ссылок на
 * документы. «Где применяется» — до 60 знаков, по фактам `naming.md` и поиска по
 * `app/components/ui`; «в компонентах не применяется» — тоже результат поиска.
 *
 * Значений здесь нет: витрина читает их из таблиц стилей в выбранной теме. Цветовой токен
 * темы, которого нет ни в одной группе, витрина покажет сама в «Не разложено».
 *
 * Классы теней перечислены строками литералом намеренно: Tailwind генерирует утилиту,
 * только если видит её имя в исходниках.
 */

export type PaletteState = 'base' | 'hover' | 'pressed' | 'disabled' | 'surface'

export const paletteStates: { key: PaletteState, label: string }[] = [
  { key: 'base', label: 'база' },
  { key: 'hover', label: 'hover' },
  { key: 'pressed', label: 'pressed' },
  { key: 'disabled', label: 'disabled' },
  { key: 'surface', label: 'surface' },
]

/** Строка таблицы ролей. */
export interface PaletteToken {
  /** Имя CSS-переменной с двумя дефисами. */
  name: string
  /** Имя роли — первая колонка. */
  role: string
  /** Пояснение одной строкой, если без него роль читается неверно. */
  note?: string
  /** Где применяется: до 60 знаков, в именительном. */
  where: string
}

/** Строка матрицы состояний: база и её нарисованные состояния слева направо. */
export interface PaletteRamp {
  role: string
  where: string
  steps: Partial<Record<PaletteState, string>>
}

export interface PaletteShadow {
  name: string
  role: string
  where: string
  utility: string
  /** Цвет образца — нужен тени, которая берёт `currentColor`. */
  tone?: string
}

export interface PaletteGroup {
  id: string
  title: string
  /** Одна фраза о назначении группы. */
  note: string
  ramps?: PaletteRamp[]
  tokens?: PaletteToken[]
  shadows?: PaletteShadow[]
}

const unused = 'в компонентах не применяется'

/** Рампа с именами по схеме `--x`, `--x-hover`, `--x-pressed`… */
function ramp(role: string, base: string, where: string, has: PaletteState[]): PaletteRamp {
  const steps: PaletteRamp['steps'] = {}
  for (const state of has) steps[state] = state === 'base' ? base : `${base}-${state}`
  return { role, where, steps }
}

export const paletteGroups: PaletteGroup[] = [
  {
    id: 'base',
    title: 'Основа',
    note: 'Фон, текст и поверхности, на которых лежит любой экран.',
    tokens: [
      { name: '--background', role: 'Фон страницы', where: 'страница, каркас админки' },
      { name: '--foreground', role: 'Основной текст', where: 'любая надпись по умолчанию' },
      { name: '--card', role: 'Карточка', note: 'отделяется от фона рамкой', where: 'таблица, панель фильтров, аккордеон' },
      { name: '--card-foreground', role: 'Текст карточки', where: unused },
      { name: '--popover', role: 'Всплывающее', note: 'светлое даже из тёмного меню', where: 'выпадающий список, тултип, поповер, меню' },
      { name: '--popover-foreground', role: 'Текст всплывающего', where: 'Alert, Tooltip' },
    ],
  },
  {
    id: 'brand',
    title: 'Бренд и действия',
    note: 'Цвета действий, наведения и рамок.',
    tokens: [
      { name: '--primary', role: 'Бренд', note: 'главное действие экрана', where: 'кнопка, вкладка, чекбокс, переключатель' },
      { name: '--primary-foreground', role: 'Текст на бренде', where: 'кнопка, чекбокс, аватар, бейдж' },
      { name: '--secondary', role: 'Второстепенное действие', note: 'светло-синяя плашка, не серая', where: 'кнопка, IconButton, пагинация, вкладки' },
      { name: '--secondary-foreground', role: 'Текст второстепенного', where: 'кнопка, IconButton, тег' },
      { name: '--destructive', role: 'Удаление', note: 'необратимо меняет данные', where: 'кнопка, бейдж, поле, индикатор' },
      { name: '--accent', role: 'Поверхность наведения', note: 'не бренд', where: 'пункт меню, строка таблицы, IconButton' },
      { name: '--accent-foreground', role: 'Текст на наведении', where: 'пункт меню, IconButton' },
      { name: '--muted', role: 'Приглушённая подложка', where: 'скелетон, переключатель, заглушка изображения' },
      { name: '--muted-foreground', role: 'Вторичная подпись', where: 'хлебные крошки, пустое состояние, календарь' },
      { name: '--muted-disabled', role: 'Выключенная нейтраль', where: 'слайдер, заглушка изображения' },
      { name: '--border', role: 'Рамка', where: 'шапка колонок, панель фильтров, меню' },
      { name: '--input', role: 'Рамка поля', where: unused },
      { name: '--ring', role: 'Кольцо фокуса', where: unused },
    ],
  },
  {
    id: 'service',
    title: 'Служебные состояния',
    note: 'Сообщают об успехе, предупреждении и ошибке — по смыслу, а не по цвету.',
    ramps: [
      ramp('Успех', '--success', 'бейдж, индикатор, загрузка файла', ['base', 'hover', 'pressed', 'surface']),
      ramp('Предупреждение', '--warning', 'бейдж, индикатор', ['base', 'hover', 'pressed', 'disabled', 'surface']),
      ramp('Ошибка', '--destructive', 'кнопка, ButtonAction, бейдж, поле', ['base', 'hover', 'pressed', 'disabled', 'surface']),
    ],
    tokens: [
      { name: '--destructive-foreground', role: 'Текст на ошибке', where: 'кнопка удаления' },
    ],
  },
  {
    id: 'extensions',
    title: 'Расширения под состояния',
    note: 'Нарисованные состояния ролей и подложки компонентов.',
    ramps: [
      ramp('Бренд', '--primary', 'кнопка, ButtonAction, чип, ссылка', ['base', 'hover', 'pressed', 'disabled']),
      ramp('Второстепенное действие', '--secondary', 'кнопка, IconButton, пагинация', ['base', 'hover', 'pressed', 'disabled']),
      ramp('Основной текст', '--foreground', 'ссылка, значения полей, вкладки', ['base', 'hover', 'disabled']),
      ramp('Второй уровень текста', '--foreground-secondary', 'таблица, чип, окно, пагинация', ['base', 'hover', 'pressed', 'disabled']),
    ],
    tokens: [
      { name: '--surface-contrast', role: 'Контрастная поверхность', where: unused },
      { name: '--surface-disabled', role: 'Выключенная поверхность', where: unused },
      { name: '--surface-new', role: 'Новое', where: 'строка таблицы' },
      { name: '--surface-selected', role: 'Выбранное', where: 'выбранная строка выпадающего списка' },
      { name: '--surface-selected-hover', role: 'Наведение на выбранное', where: unused },
      { name: '--border-secondary', role: 'Вторичная рамка', where: unused },
      { name: '--border-accent', role: 'Акцентная рамка', where: unused },
      { name: '--border-neutral', role: 'Нейтральная рамка', where: 'InputNumber' },
      { name: '--overlay', role: 'Подложка под модалкой', where: unused },
      { name: '--scrim-light', role: 'Осветление поверх фото', where: unused },
      { name: '--scrim-dark', role: 'Затемнение поверх фото', where: 'плитка навигации' },
      { name: '--dialog', role: 'Полноэкранный слой', where: 'модальное окно, лайтбокс' },
      { name: '--chip', role: 'Подложка чипа', where: 'чип, чип фильтра' },
      { name: '--tag', role: 'Подложка тега', where: 'тег' },
      { name: '--row', role: 'Строка-плашка', note: 'приглушённая в покое', where: 'строка списка, строка таблицы' },
      { name: '--row-active', role: 'Активная строка-плашка', note: 'всплывает белым', where: 'строка списка' },
      { name: '--list-hover', role: 'Наведение в списке', where: 'выпадающий список' },
      { name: '--list-selected', role: 'Выбор в списке', where: 'выпадающий список' },
      { name: '--accent-soft', role: 'Мягкий бренд', note: 'светлее бренда, не выключенный', where: 'маркер тега, подчёркивание ссылки' },
      { name: '--border-soft', role: 'Граница таблицы', where: 'контейнер, строки и подвал таблицы' },
      { name: '--popover-scroll-thumb', role: 'Бегунок на плашке', where: 'выпадающий список' },
    ],
  },
  {
    id: 'field',
    title: 'Поле ввода',
    note: 'Поле — залитая поверхность без рамки.',
    ramps: [
      ramp('Заливка поля', '--field', 'поле, селект, автокомплит, выбор даты', ['base', 'hover']),
      ramp('Заливка с ошибкой', '--field-error', 'поле, textarea', ['base', 'hover']),
      ramp('Плейсхолдер и подпись', '--field-placeholder', 'поле, селект, чекбокс, переключатель', ['base', 'hover']),
      ramp('Введённое значение', '--field-foreground', 'поле, селект, вкладки, таблица', ['base', 'hover']),
    ],
    tokens: [
      { name: '--field-elevated', role: 'Поле поверх карты', note: 'белое плюс тень', where: 'поле, селект, стрелка, чекбокс' },
      { name: '--field-clear', role: 'Подложка очистки', where: 'поле, автокомплит' },
      { name: '--field-clear-elevated', role: 'Очистка поверх карты', where: 'поле, автокомплит' },
      { name: '--field-clear-foreground', role: 'Крестик очистки', where: 'поле, автокомплит, выбор даты' },
      { name: '--field-error-foreground', role: 'Текст ошибки', where: 'поле, textarea' },
      { name: '--field-scroll-thumb', role: 'Бегунок в поле', where: 'textarea' },
    ],
    shadows: [
      { name: '--shadow-elevated', utility: 'shadow-elevated', role: 'Тень поля поверх карты', where: 'поле, селект, стрелка, тултип' },
      { name: '--shadow-elevated-hover', utility: 'shadow-elevated-hover', role: 'Она же при наведении', where: 'поле, селект, автокомплит' },
      { name: '--shadow-elevated-pressed', utility: 'shadow-elevated-pressed', role: 'Она же при нажатии', where: 'поле, автокомплит' },
    ],
  },
  {
    id: 'sidebar',
    title: 'Сайдбар',
    note: 'Тёмное меню при светлом интерфейсе.',
    tokens: [
      { name: '--sidebar', role: 'Подложка меню', where: 'меню, каркас админки' },
      { name: '--sidebar-foreground', role: 'Текст меню', where: 'пункт меню' },
      { name: '--sidebar-accent', role: 'Наведение на пункт', where: 'пункт меню, IconButton в меню' },
      { name: '--sidebar-accent-foreground', role: 'Текст под наведением', where: 'пункт меню, IconButton в меню' },
      { name: '--sidebar-active', role: 'Выбранный пункт', where: 'пункт меню' },
      { name: '--sidebar-active-foreground', role: 'Текст выбранного пункта', where: 'пункт меню, каркас админки' },
      { name: '--sidebar-border', role: 'Разделитель', where: 'меню' },
      { name: '--sidebar-disabled', role: 'Выключенный пункт', where: unused },
      { name: '--sidebar-scroll-track', role: 'Дорожка скролла', where: unused },
      { name: '--sidebar-scroll-thumb', role: 'Бегунок скролла', where: unused },
      { name: '--sidebar-primary', role: 'Акцент меню', where: unused },
      { name: '--sidebar-primary-foreground', role: 'Текст на акценте меню', where: unused },
      { name: '--sidebar-ring', role: 'Кольцо фокуса в меню', where: unused },
    ],
  },
  {
    id: 'palette',
    title: 'Расширенная палитра',
    note: 'Шесть рамп без смысла — берутся только по явному указанию макета.',
    ramps: [
      ramp('Зелёная', '--palette-01', 'статус-бейдж', ['base', 'hover', 'pressed', 'disabled', 'surface']),
      ramp('Бирюзовая', '--palette-02', 'статус-бейдж', ['base', 'hover', 'pressed']),
      ramp('Фиолетовая', '--palette-03', 'статус-бейдж', ['base', 'hover', 'pressed']),
      ramp('Розовая', '--palette-04', 'статус-бейдж', ['base', 'hover', 'pressed']),
      ramp('Оранжевая', '--palette-05', 'статус-бейдж', ['base', 'hover', 'pressed']),
      ramp('Красная', '--palette-06', 'статус-бейдж, признак в «Мои осмотры»', ['base', 'hover', 'pressed', 'disabled']),
    ],
    tokens: [1, 2, 3, 4, 5].map(i => ({ name: `--chart-${i}`, role: `График, категория ${i}`, where: unused })),
  },
  {
    id: 'icons',
    title: 'Иконки',
    note: 'Своего цвета нет — иконка берёт цвет текста вокруг.',
  },
  {
    id: 'shadows',
    title: 'Тени',
    note: 'Отрывают плашки и контролы от поверхности.',
    shadows: [
      { name: '--shadow-button', utility: 'shadow-button', role: 'Активная таблетка вкладки', where: unused },
      { name: '--shadow-dropdown', utility: 'shadow-dropdown', role: 'Всплывающая плашка', where: 'селект, поповер, меню, выбор даты, Alert' },
      { name: '--shadow-on-image', utility: 'shadow-on-image', role: 'Контрол поверх фото', where: 'чекбокс на превью' },
      { name: '--shadow-indicator', utility: 'shadow-indicator', role: 'Свечение точки', where: 'индикатор', tone: 'text-primary' },
    ],
  },
]

/** Все цветовые имена, разложенные по группам, — чтобы найти неразложенные. */
export function listedTokenNames(): Set<string> {
  const names = new Set<string>()
  for (const group of paletteGroups) {
    group.tokens?.forEach(t => names.add(t.name))
    group.ramps?.forEach(r => Object.values(r.steps).forEach(n => n && names.add(n)))
  }
  return names
}
