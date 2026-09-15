/**
 * Раскладка раздела «Палитра» на витрине — по ролям, а не по алфавиту.
 *
 * Значений здесь нет и быть не должно: витрина читает их из таблиц стилей в текущей
 * теме. Здесь только принадлежность токена группе и роль одной фразой. Роль снята с
 * `docs/naming.md`, `docs/tokens.md` и фактического употребления в `app/components/ui`;
 * «в компонентах не применяется» — тоже факт поиска по коду, а не оценка.
 *
 * Токен, которого нет ни в одной группе, витрина покажет сама в «Не разложено» — так
 * новая переменная темы не пропадёт молча. Токен из списка, которого нет в теме,
 * помечается «нет в теме».
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

export interface PaletteToken {
  /** Имя CSS-переменной с двумя дефисами. */
  name: string
  /** Где применяется — одной фразой, по фактам. */
  role: string
}

/** Строка «база → состояния» слева направо. */
export interface PaletteRamp {
  label: string
  note: string
  steps: Partial<Record<PaletteState, PaletteToken>>
  /** Подпись пустой ячейки: чего именно нет. */
  gap: string
}

export interface PaletteShadow {
  name: string
  utility: string
  role: string
  /** Цвет образца — нужен тени, которая берёт `currentColor`. */
  tone?: string
}

export interface PaletteGroup {
  id: string
  title: string
  note: string
  tokens?: PaletteToken[]
  ramps?: PaletteRamp[]
  shadows?: PaletteShadow[]
}

const unused = 'в компонентах не применяется'

function ramp(label: string, note: string, gap: string, steps: PaletteRamp['steps']): PaletteRamp {
  return { label, note, gap, steps }
}

function paletteRamp(n: string, note: string, baseRole: string, has: PaletteState[]): PaletteRamp {
  const suffix: Record<PaletteState, string> = { base: '', hover: '-hover', pressed: '-pressed', disabled: '-disabled', surface: '-surface' }
  const steps: PaletteRamp['steps'] = {}
  for (const state of has) {
    steps[state] = { name: `--palette-${n}${suffix[state]}`, role: state === 'base' ? baseRole : unused }
  }
  return ramp(`palette-${n}`, note, 'в ките нет', steps)
}

export const paletteGroups: PaletteGroup[] = [
  {
    id: 'surfaces',
    title: 'База · поверхности',
    note: 'На чём лежит содержимое. `accent` здесь, а не в бренде: в shadcn это поверхность наведения, бренд живёт в `primary` — ловушка 1 в tokens.md.',
    tokens: [
      { name: '--background', role: 'фон страницы и каркаса; дефолт для всего, что не карточка' },
      { name: '--card', role: 'карточка: таблица, панель фильтров, аккордеон; своей поверхности в ките нет' },
      { name: '--popover', role: 'всплывающее: выпадашка, тултип, поповер — светлое даже из тёмного сайдбара' },
      { name: '--dialog', role: 'модальное окно и лайтбокс; в rososmotr сидит на bg/page' },
      { name: '--accent', role: 'поверхность наведения, не бренд: пункт меню, строка таблицы, IconButton' },
      { name: '--muted', role: 'приглушённая нейтральная подложка: скелетон, переключатель, заглушка изображения' },
      { name: '--muted-disabled', role: 'выключенная нейтраль: дорожка слайдера, заглушка изображения' },
      { name: '--surface-selected', role: 'выбранный элемент (bg/surface_selected); в Select — через list-selected' },
      { name: '--surface-selected-hover', role: `наведение на выбранный (bg/surface_hover_selected); ${unused}` },
      { name: '--surface-new', role: 'подложка нового (bg/surface_new): строка таблицы' },
      { name: '--surface-contrast', role: `контрастная тёмная поверхность (bg/contrast); ${unused}` },
      { name: '--surface-disabled', role: `выключенная поверхность (bg/disabled); ${unused}` },
    ],
  },
  {
    id: 'component-surfaces',
    title: 'База · подложки компонентов',
    note: 'Заливка компонента в покое — отдельная роль, даже когда значение совпадает с чужим состоянием (прецедент `--tag`, `--chip`).',
    tokens: [
      { name: '--row', role: 'строка-плашка в покое: ListRow, строка таблицы, Field' },
      { name: '--row-active', role: 'активная строка-плашка — всплывает белым: ListRow' },
      { name: '--list-hover', role: 'строка выпадающего списка под наведением: Select' },
      { name: '--list-selected', role: 'выбранная строка выпадающего списка: Select' },
      { name: '--chip', role: 'заливка чипа в покое: Chip, FilterChip (мастер 747:2464)' },
      { name: '--tag', role: 'подложка неактивного тега: Tag' },
    ],
  },
  {
    id: 'text',
    title: 'База · текст',
    note: 'Три уровня: основной, второй, приглушённый. Инверсный — текст на цветной заливке.',
    tokens: [
      { name: '--foreground', role: 'основной текст; дефолт любой надписи' },
      { name: '--foreground-hover', role: 'текст под наведением (fg/primary_hover): Hyperlink, значения полей, вкладки' },
      { name: '--foreground-disabled', role: 'выключенный текст: Field' },
      { name: '--foreground-secondary', role: 'второй уровень текста (fg/secondary): подписи таблицы, чипа, окна' },
      { name: '--foreground-secondary-hover', role: `fg/secondary_hover; ${unused}` },
      { name: '--foreground-secondary-pressed', role: `fg/secondary_pressed; ${unused}` },
      { name: '--foreground-secondary-disabled', role: 'выключенный второй уровень: Pagination' },
      { name: '--muted-foreground', role: 'приглушённая подпись и иконка: хлебные крошки, пустое состояние, календарь' },
      { name: '--card-foreground', role: `текст на карточке — тот же fg/primary; ${unused}` },
      { name: '--popover-foreground', role: 'текст на всплывающем: Alert, Tooltip' },
      { name: '--accent-foreground', role: 'текст на поверхности наведения: меню, IconButton' },
      { name: '--primary-foreground', role: 'инверсный: текст и иконка на брендовой заливке' },
      { name: '--destructive-foreground', role: 'инверсный: текст на красной заливке — решение, тот же, что на брендовой' },
    ],
  },
  {
    id: 'borders',
    title: 'База · границы и разделители',
    note: 'Рамки сверх дефолтной пишутся утилитой `border-stroke-*`, а не `border-border-*` — ловушка имён в tokens.md.',
    tokens: [
      { name: '--border', role: 'рамка по умолчанию (border/default): шапка колонок, панель фильтров, меню' },
      { name: '--input', role: 'border/default в штатном слоте поля shadcn; наше поле без рамки' },
      { name: '--border-soft', role: 'граница таблицы: контейнер, строки, подвал' },
      { name: '--border-secondary', role: `border/secondary, утилита stroke-secondary; ${unused}` },
      { name: '--border-accent', role: `border/accent, утилита stroke-accent; ${unused}` },
      { name: '--border-neutral', role: 'border/neutral_soft, утилита stroke-neutral: InputNumber; на нём field-hover' },
    ],
  },
  {
    id: 'field',
    title: 'База · поле ввода',
    note: 'У Атома поле — залитая поверхность без рамки. Роли заведены под этот состав; разбор — naming.md, «Поле ввода».',
    tokens: [
      { name: '--field', role: 'заливка поля в покое — дефолт любого контрола ввода' },
      { name: '--field-hover', role: 'заливка под наведением и под кареткой' },
      { name: '--field-elevated', role: 'поле поверх карты или фото: белое плюс тень' },
      { name: '--field-error', role: 'заливка поля с ошибкой — ошибка подменяет заливку, а не рамку' },
      { name: '--field-error-hover', role: 'она же под наведением; в rososmotr второй ступени нет — @debt' },
      { name: '--field-placeholder', role: 'плейсхолдер, всплывшая подпись и иконка пустого поля' },
      { name: '--field-placeholder-hover', role: 'подпись под наведением и фокусом — темнеет' },
      { name: '--field-foreground', role: 'введённое значение и иконка заполненного поля' },
      { name: '--field-foreground-hover', role: 'значение под наведением и фокусом; в rososmotr ступени темнее нет — @debt' },
      { name: '--field-clear', role: 'подложка кнопки очистки на обычном поле' },
      { name: '--field-clear-elevated', role: 'подложка кнопки очистки на поле поверх карты' },
      { name: '--field-clear-foreground', role: 'крестик очистки — идёт за подписью, а не за значением' },
      { name: '--field-error-foreground', role: 'строка сообщения об ошибке под полем' },
      { name: '--field-scroll-thumb', role: 'бегунок скролла внутри поля: Textarea' },
    ],
  },
  {
    id: 'brand',
    title: 'Бренд',
    note: '`primary` — бренд (accent/* кита). `secondary` — тональное действие на светло-синей плашке. Состояния нарисованы руками, прозрачностью не схлопываются.',
    ramps: [
      ramp('primary', 'главное действие экрана', 'нет токена', {
        base: { name: '--primary', role: 'бренд: главное действие, активная вкладка, отметка выбора' },
        hover: { name: '--primary-hover', role: 'наведение на брендовую заливку' },
        pressed: { name: '--primary-pressed', role: 'нажатие' },
        disabled: { name: '--primary-disabled', role: 'accent/disabled; напрямую не применяется — на нём сидит accent-soft' },
      }),
      ramp('secondary', 'второстепенное действие рядом с главным', 'нет токена', {
        base: { name: '--secondary', role: 'фон тонального действия: Button, IconButton, Pagination' },
        hover: { name: '--secondary-hover', role: 'наведение (accent/surface_bright)' },
        pressed: { name: '--secondary-pressed', role: 'нажатие; в rososmotr сидит на hover — @debt' },
        disabled: { name: '--secondary-disabled', role: 'выключенное (accent/surface_disabled): Pagination' },
      }),
    ],
    tokens: [
      { name: '--secondary-foreground', role: 'текст на тональной плашке — остаётся брендовым' },
      { name: '--accent-soft', role: 'маркер тега и подчёркивание ссылки; в rososmotr на primary-disabled — @debt' },
    ],
  },
  {
    id: 'messages',
    title: 'Роли сообщений',
    note: 'Берутся по смыслу сообщения, а не по желаемому цвету. `-surface` — бледная подложка под плашку, не для текста.',
    ramps: [
      ramp('success', 'операция завершилась', 'в ките нет', {
        base: { name: '--success', role: 'проверка пройдена: Badge, Indicator, FileUpload' },
        hover: { name: '--success-hover', role: unused },
        pressed: { name: '--success-pressed', role: unused },
        surface: { name: '--success-surface', role: unused },
      }),
      ramp('warning', 'нужно внимание, работа не сломана', 'в ките нет', {
        base: { name: '--warning', role: 'Badge, Indicator' },
        hover: { name: '--warning-hover', role: unused },
        pressed: { name: '--warning-pressed', role: unused },
        disabled: { name: '--warning-disabled', role: unused },
        surface: { name: '--warning-surface', role: unused },
      }),
      ramp('destructive', 'ошибка либо необратимое действие', 'в ките нет', {
        base: { name: '--destructive', role: 'Button, Badge, Field, Indicator' },
        hover: { name: '--destructive-hover', role: 'Button, ButtonAction' },
        pressed: { name: '--destructive-pressed', role: 'Button, ButtonAction' },
        disabled: { name: '--destructive-disabled', role: `service/error-fg_disabled; ${unused}` },
        surface: { name: '--destructive-surface', role: 'в компонентах — через field-error' },
      }),
    ],
  },
  {
    id: 'palette',
    title: 'Акцентная палитра',
    note: 'Шесть рамп без смысла — в ките status-01..06. Берутся только по явному указанию макета или человека; дефолт — роли выше. Графики сидят на рампах 01–05.',
    ramps: [
      paletteRamp('01', 'зелёная · bulb, Counter, status green', 'StatusBadge', ['base', 'hover', 'pressed', 'disabled', 'surface']),
      paletteRamp('02', 'бирюзовая · status grey, в коде cyan', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('03', 'фиолетовая · badge violet, tag web, status violet', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('04', 'маджента · в ките не используется ничем', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('05', 'оранжевая · badge orange, tag mobile', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('06', 'красная · btn_txt red, badge red, status red', 'StatusBadge; признак на «Мои осмотры»', ['base', 'hover', 'pressed', 'disabled']),
    ],
    tokens: [1, 2, 3, 4, 5].map(i => ({ name: `--chart-${i}`, role: `категория графика ${i} — сидит на palette-0${i}; ${unused}` })),
  },
  {
    id: 'sidebar',
    title: 'Сайдбар',
    note: 'Тёмный при светлом интерфейсе — не тёмная тема. Внутри меню легальны только sidebar-*; всё, что вылетает порталом, живёт на светлых токенах.',
    tokens: [
      { name: '--sidebar', role: 'подложка тёмного меню (menu/bg/default)' },
      { name: '--sidebar-foreground', role: 'текст пункта меню в покое' },
      { name: '--sidebar-accent', role: 'пункт под наведением' },
      { name: '--sidebar-accent-foreground', role: 'текст пункта под наведением' },
      { name: '--sidebar-active', role: 'выбранный пункт' },
      { name: '--sidebar-active-foreground', role: 'текст выбранного пункта' },
      { name: '--sidebar-border', role: 'разделитель и заголовок раздела меню (menu/devider/default)' },
      { name: '--sidebar-disabled', role: `выключенный пункт (menu/fg/disabled); ${unused}` },
      { name: '--sidebar-scroll-track', role: `дорожка скроллбара меню; ${unused}` },
      { name: '--sidebar-scroll-thumb', role: `бегунок скроллбара меню; ${unused}` },
      { name: '--sidebar-primary', role: `штатный слот shadcn на fg/secondary_hover — решение, вопрос 15; ${unused}` },
      { name: '--sidebar-primary-foreground', role: `текст на sidebar-primary — решение; ${unused}` },
      { name: '--sidebar-ring', role: `кольцо фокуса в меню — решение; ${unused}` },
    ],
  },
  {
    id: 'service',
    title: 'Служебные: фокус, затемнения, скроллбары, тени',
    note: 'Не поверхности и не текст — механика поверх них. Тени собраны из @theme inline литералом, поэтому в любой теме показывают одно и то же.',
    tokens: [
      { name: '--ring', role: `кольцо фокуса (accent/default); ${unused}` },
      { name: '--overlay', role: `полупрозрачная брендовая подложка (bg/overlay); ${unused}` },
      { name: '--scrim-light', role: `осветление поверх изображения (bg/neutral_white40%); ${unused}` },
      { name: '--scrim-dark', role: 'затемнение поверх изображения (bg/neutral_black70%): NavigationTile' },
      { name: '--popover-scroll-thumb', role: 'бегунок скролла на белой плашке: Select' },
    ],
    shadows: [
      { name: '--shadow-button', utility: 'shadow-button', role: `активная таблетка вкладки — Button Shadow, 2181:387; ${unused}` },
      { name: '--shadow-dropdown', utility: 'shadow-dropdown', role: 'выпадающие плашки: Select, Popover, меню, DatePicker (BigShadow)' },
      { name: '--shadow-elevated', utility: 'shadow-elevated', role: 'поле и стрелка поверх карты, тултип' },
      { name: '--shadow-elevated-hover', utility: 'shadow-elevated-hover', role: 'она же под наведением — 16%' },
      { name: '--shadow-elevated-pressed', utility: 'shadow-elevated-pressed', role: 'она же на нажатии — 8%' },
      { name: '--shadow-on-image', utility: 'shadow-on-image', role: 'контрол поверх изображения: чекбокс на превью — решение владельца' },
      { name: '--shadow-indicator', utility: 'shadow-indicator', role: 'свечение точки индикатора в её же цвете, 64%', tone: 'size-3 rounded-full bg-current text-primary' },
    ],
  },
]

/** Все имена, разложенные по группам, — чтобы найти неразложенные. */
export function listedTokenNames(): Set<string> {
  const names = new Set<string>()
  for (const group of paletteGroups) {
    group.tokens?.forEach(t => names.add(t.name))
    group.ramps?.forEach(r => Object.values(r.steps).forEach(t => t && names.add(t.name)))
  }
  return names
}
