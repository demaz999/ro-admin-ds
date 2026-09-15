/**
 * Раскладка раздела «Палитра» на витрине.
 *
 * Структура и порядок групп — `docs/naming.md`, раздел 2 «Цветовые роли», подраздел в
 * подраздел: Основа · Бренд и действия · Служебные состояния · Расширения под состояния ·
 * Поле ввода · Сайдбар · Расширенная палитра · Иконки. Своей таксономии витрина не заводит.
 *
 * Роль у свотча — фраза из `naming.md` (раздел 2), из мапинг-таблицы `docs/tokens.md`
 * (раздел 7) или из кода, где токен употреблён. «В компонентах не применяется» — результат
 * поиска по `app/components/ui`, а не оценка.
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

export interface PaletteToken {
  /** Имя CSS-переменной с двумя дефисами. */
  name: string
  /** Роль одной фразой — из naming.md, tokens.md или кода. */
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
}

export interface PaletteGroup {
  id: string
  title: string
  note: string
  ramps?: PaletteRamp[]
  tokens?: PaletteToken[]
  shadows?: PaletteShadow[]
}

const unused = 'в компонентах не применяется'

function paletteRamp(n: string, note: string, baseRole: string, has: PaletteState[]): PaletteRamp {
  const suffix: Record<PaletteState, string> = { base: '', hover: '-hover', pressed: '-pressed', disabled: '-disabled', surface: '-surface' }
  const steps: PaletteRamp['steps'] = {}
  for (const state of has) {
    steps[state] = { name: `--palette-${n}${suffix[state]}`, role: state === 'base' ? baseRole : `status-${n}/${state === 'surface' ? 'bg' : state}; ${unused}` }
  }
  return { label: `palette-${n}`, note, gap: 'в ките нет', steps }
}

export const paletteGroups: PaletteGroup[] = [
  {
    id: 'base',
    title: 'Основа',
    note: 'Одна светлая тема. Тёмная приедет переопределением этих же имён, а не вторым набором.',
    tokens: [
      { name: '--background', role: 'фон страницы. Дефолт для всего, что не карточка и не плашка' },
      { name: '--foreground', role: 'основной текст. Дефолт для любой надписи, пока не доказано обратное' },
      { name: '--card', role: 'карточка. Своей поверхности в ките нет — сидит на фоне страницы, отделяется рамкой' },
      { name: '--card-foreground', role: `текст карточки (fg/primary); ${unused}` },
      { name: '--popover', role: 'всё, что всплывает: выпадашка, тултип, поповер. Светлое даже из тёмного сайдбара' },
      { name: '--popover-foreground', role: 'текст всплывающего (fg/primary): Alert, Tooltip' },
    ],
  },
  {
    id: 'brand',
    title: 'Бренд и действия',
    note: 'Ловушка имени: в shadcn accent — поверхность наведения, бренд живёт в primary.',
    tokens: [
      { name: '--primary', role: 'бренд. Главное действие экрана, активная вкладка, фокусное кольцо. На экране обычно одна' },
      { name: '--primary-foreground', role: 'текст и иконка на брендовой заливке' },
      { name: '--secondary', role: 'фон второстепенного действия — светло-синяя плашка, не серая' },
      { name: '--secondary-foreground', role: 'текст на ней; остаётся брендовым' },
      { name: '--destructive', role: 'действие удаляет или необратимо меняет данные. Не «просто красный»' },
      { name: '--accent', role: 'поверхность наведения, а не бренд' },
      { name: '--accent-foreground', role: 'текст на ней' },
      { name: '--muted', role: 'приглушённое: неактивная подложка' },
      { name: '--muted-foreground', role: 'приглушённое: вторичная подпись, плейсхолдер' },
      { name: '--muted-disabled', role: 'neutral/disabled: выключенная нейтраль — Image, Slider' },
      { name: '--border', role: 'рамка по умолчанию' },
      { name: '--input', role: 'рамка поля' },
      { name: '--ring', role: `кольцо фокуса; ${unused}` },
    ],
  },
  {
    id: 'service',
    title: 'Служебные состояния',
    note: 'Три семантических цвета. Берутся по смыслу сообщения, а не по желаемому цвету. -surface — бледная подложка под плашку сообщения, не для текста.',
    ramps: [
      {
        label: 'success',
        note: 'операция завершилась, проверка пройдена',
        gap: 'в ките нет',
        steps: {
          base: { name: '--success', role: 'service/success-default: Badge, Indicator, FileUpload' },
          hover: { name: '--success-hover', role: `service/success-hover; ${unused}` },
          pressed: { name: '--success-pressed', role: `service/success-pressed; ${unused}` },
          surface: { name: '--success-surface', role: `service/success-surface; ${unused}` },
        },
      },
      {
        label: 'warning',
        note: 'требуется внимание, но работа не сломана',
        gap: 'в ките нет',
        steps: {
          base: { name: '--warning', role: 'service/warning-default: Badge, Indicator' },
          hover: { name: '--warning-hover', role: `service/warning-hover; ${unused}` },
          pressed: { name: '--warning-pressed', role: `service/warning-pressed; ${unused}` },
          disabled: { name: '--warning-disabled', role: `service/warning-disabled; ${unused}` },
          surface: { name: '--warning-surface', role: `service/warning-surface; ${unused}` },
        },
      },
      {
        label: 'destructive',
        note: 'ошибка либо необратимое действие',
        gap: 'в ките нет',
        steps: {
          base: { name: '--destructive', role: 'service/error-default: Button, Badge, Field, Indicator' },
          hover: { name: '--destructive-hover', role: 'service/error-hover: Button, ButtonAction' },
          pressed: { name: '--destructive-pressed', role: 'service/error-pressed: Button, ButtonAction' },
          disabled: { name: '--destructive-disabled', role: `service/error-fg_disabled; ${unused}` },
          surface: { name: '--destructive-surface', role: 'service/error-surface; в поле — через field-error' },
        },
      },
    ],
    tokens: [
      { name: '--destructive-foreground', role: 'текст на красной заливке — решение: тот же, что на брендовой. Button' },
    ],
  },
  {
    id: 'extensions',
    title: 'Расширения под состояния',
    note: 'Состояния в ките нарисованы руками: hover — это другой цвет, а не прозрачность поверх подложки. Схлопывать в bg-primary/90 нельзя.',
    ramps: [
      {
        label: 'primary-*',
        note: 'бренд',
        gap: 'нет токена',
        steps: {
          base: { name: '--primary', role: 'accent/default' },
          hover: { name: '--primary-hover', role: 'accent/hover: Button, ButtonAction, Chip, Hyperlink' },
          pressed: { name: '--primary-pressed', role: 'accent/pressed: Button, ButtonAction, IconButton' },
          disabled: { name: '--primary-disabled', role: 'accent/disabled; напрямую не применяется — на нём accent-soft' },
        },
      },
      {
        label: 'secondary-*',
        note: 'вторичная кнопка',
        gap: 'нет токена',
        steps: {
          base: { name: '--secondary', role: 'accent/surface_soft' },
          hover: { name: '--secondary-hover', role: 'accent/surface_bright: Button, IconButton, Pagination' },
          pressed: { name: '--secondary-pressed', role: 'третьей ступени в теме нет — сидит на hover (design-debt.md)' },
          disabled: { name: '--secondary-disabled', role: 'accent/surface_disabled: Pagination' },
        },
      },
      {
        label: 'foreground-*',
        note: 'текст',
        gap: 'нет токена',
        steps: {
          base: { name: '--foreground', role: 'fg/primary' },
          hover: { name: '--foreground-hover', role: 'fg/primary_hover: Hyperlink, значения полей, вкладки' },
          disabled: { name: '--foreground-disabled', role: 'fg/primary_disabled: Field' },
        },
      },
      {
        label: 'foreground-secondary-*',
        note: 'второй уровень текста',
        gap: 'нет токена',
        steps: {
          base: { name: '--foreground-secondary', role: 'fg/secondary: подписи таблицы, чипа, окна' },
          hover: { name: '--foreground-secondary-hover', role: `fg/secondary_hover; ${unused}` },
          pressed: { name: '--foreground-secondary-pressed', role: `fg/secondary_pressed; ${unused}` },
          disabled: { name: '--foreground-secondary-disabled', role: 'fg/secondary_disabled: Pagination' },
        },
      },
    ],
    tokens: [
      { name: '--surface-contrast', role: `surface-*: bg/contrast; ${unused}` },
      { name: '--surface-disabled', role: `surface-*: bg/disabled; ${unused}` },
      { name: '--surface-new', role: 'surface-*: bg/surface_new — строка таблицы' },
      { name: '--surface-selected', role: 'surface-*: bg/surface_selected — в Select через list-selected' },
      { name: '--surface-selected-hover', role: `surface-*: bg/surface_hover_selected; ${unused}` },
      { name: '--border-secondary', role: `stroke-*: рамка сверх дефолтной (border/secondary); ${unused}` },
      { name: '--border-accent', role: `stroke-*: рамка сверх дефолтной (border/accent); ${unused}` },
      { name: '--border-neutral', role: 'stroke-*: рамка сверх дефолтной (border/neutral_soft) — InputNumber' },
      { name: '--overlay', role: `затемнение и осветление под модалками (bg/overlay); ${unused}` },
      { name: '--scrim-light', role: `осветление поверх фото (bg/neutral_white40%); ${unused}` },
      { name: '--scrim-dark', role: 'затемнение поверх фото (bg/neutral_black70%) — NavigationTile' },
      { name: '--dialog', role: 'поверхность полноэкранного слоя: модальное окно и лайтбокс' },
      { name: '--chip', role: 'подложка чипа в покое — роль, а не состояние: Chip, FilterChip' },
      { name: '--tag', role: 'подложка неактивного тега: Tag' },
      { name: '--row', role: 'строка-плашка в покое (Plank 1910:12739): ListRow, строка таблицы' },
      { name: '--row-active', role: 'активная строка-плашка — всплывает белым: ListRow' },
      { name: '--list-hover', role: 'строка выпадающего списка под наведением: Select' },
      { name: '--list-selected', role: 'выбранная строка выпадающего списка: Select' },
      { name: '--accent-soft', role: 'маркер тега и подчёркивание ссылки; сидит на primary-disabled (design-debt.md)' },
      { name: '--border-soft', role: 'граница таблицы: контейнер, строки, подвал' },
      { name: '--popover-scroll-thumb', role: 'бегунок скролла на белой плашке: Select' },
    ],
  },
  {
    id: 'field',
    title: 'Поле ввода',
    note: 'У Атома поле — залитая поверхность без рамки, а не белое поле с обводкой. Под этот состав заведены отдельные роли.',
    tokens: [
      { name: '--field', role: 'заливка поля в покое. Дефолт для любого контрола ввода' },
      { name: '--field-hover', role: 'заливка под наведением и под кареткой' },
      { name: '--field-elevated', role: 'заливка поля, лежащего поверх карты или фото: белая плюс тень' },
      { name: '--field-error', role: 'заливка поля с ошибкой. Ошибка — не рамка, а подмена заливки' },
      { name: '--field-error-hover', role: 'она же под наведением' },
      { name: '--field-placeholder', role: 'плейсхолдер, во всплывшем состоянии — подпись; тем же цветом иконка' },
      { name: '--field-placeholder-hover', role: 'она же под наведением и фокусом: подпись темнеет' },
      { name: '--field-foreground', role: 'введённое значение в покое; им же иконка заполненного поля' },
      { name: '--field-foreground-hover', role: 'значение под наведением и фокусом — на ступень темнее' },
      { name: '--field-clear', role: 'подложка кнопки очистки на обычном поле' },
      { name: '--field-clear-elevated', role: 'подложка кнопки очистки на поле поверх карты' },
      { name: '--field-clear-foreground', role: 'сам крестик. Идёт за подписью, а не за значением' },
      { name: '--field-error-foreground', role: 'строка сообщения об ошибке под полем' },
      { name: '--field-scroll-thumb', role: 'бегунок скролла внутри поля: Textarea' },
    ],
    shadows: [
      { name: '--shadow-elevated', utility: 'shadow-elevated', role: 'тень поля поверх карты: 12% в покое' },
      { name: '--shadow-elevated-hover', utility: 'shadow-elevated-hover', role: '16% на наведении' },
      { name: '--shadow-elevated-pressed', utility: 'shadow-elevated-pressed', role: '8% на нажатии' },
    ],
  },
  {
    id: 'sidebar',
    title: 'Сайдбар',
    note: 'Сайдбар тёмный при светлом интерфейсе. Это не тёмная тема и не второй мод. Внутри — только sidebar-*; всё, что вылетает порталом, живёт на светлых токенах.',
    tokens: [
      { name: '--sidebar', role: 'подложка меню' },
      { name: '--sidebar-foreground', role: 'текст меню' },
      { name: '--sidebar-accent', role: 'наведение на пункт' },
      { name: '--sidebar-accent-foreground', role: 'текст пункта под наведением' },
      { name: '--sidebar-active', role: 'выбранный пункт' },
      { name: '--sidebar-active-foreground', role: 'текст выбранного пункта' },
      { name: '--sidebar-border', role: 'разделитель' },
      { name: '--sidebar-disabled', role: `выключенный пункт; ${unused}` },
      { name: '--sidebar-scroll-track', role: `свой скроллбар меню — дорожка; ${unused}` },
      { name: '--sidebar-scroll-thumb', role: `свой скроллбар меню — бегунок; ${unused}` },
      { name: '--sidebar-primary', role: `fg/secondary_hover — решение, см. вопрос 15; ${unused}` },
      { name: '--sidebar-primary-foreground', role: `menu/bg/default — решение, контраст 5.9:1; ${unused}` },
      { name: '--sidebar-ring', role: `menu/fg/default — решение, контраст 13.5:1; ${unused}` },
    ],
  },
  {
    id: 'palette',
    title: 'Расширенная палитра',
    note: 'Шесть дополнительных рамп. Это не статусы и не семантика, несмотря на имя status-01..06 в Figma. Дефолт — семантические роли; палитра — только по явному указанию макета или человека. Категориальные графики сидят на палитре осознанно.',
    ramps: [
      paletteRamp('01', '#1bb149 зелёная', 'StatusBadge', ['base', 'hover', 'pressed', 'disabled', 'surface']),
      paletteRamp('02', '#1192bb бирюзовая', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('03', '#806aea фиолетовая', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('04', '#d461ba розовая · ни одним компонентом кита не используется', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('05', '#ff8552 оранжевая', 'StatusBadge', ['base', 'hover', 'pressed']),
      paletteRamp('06', '#c91826 красная', 'StatusBadge; признак на «Мои осмотры»', ['base', 'hover', 'pressed', 'disabled']),
    ],
    tokens: [1, 2, 3, 4, 5].map(i => ({ name: `--chart-${i}`, role: `категориальный график — сидит на palette-0${i}; ${unused}` })),
  },
  {
    id: 'icons',
    title: 'Иконки',
    note: 'Своих цветовых токенов нет: цвет у Icon не задаётся никогда — глиф идёт за цветом текста родителя.',
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
