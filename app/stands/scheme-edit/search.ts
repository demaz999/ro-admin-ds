import { SETTINGS, type SettingMeta } from './diff'

/**
 * Поиск по настройкам схемы — такт 65, порция П5 (`docs/scheme-edit.md`, 6.2). Источник — `spec-audit.md`,
 * «Требования к поиску»: буквальный матч сквозь все табы и разделы, словарь синонимов, переход к месту, пустая
 * выдача с быстрым переходом.
 *
 * Индекс — «ключ · подпись · синонимы · описание · путь»: ключ, подпись и место берутся из каталога настроек
 * `SETTINGS` (`diff.ts`), синонимы и описания — из словарей ниже. Тот же индекс годится агенту (MCP): по нему
 * настройка находится, чтобы её выставить.
 *
 * Чистые функции: DOM и реактивности модуль не знает.
 *
 * **Что в индексе.** Настройки собранных разделов таба «Настройки» — порции П2–П3. Поля формы, процессы, шаги и
 * витрина входят в индекс своими порциями П6–П8 (строка реестра расхождений).
 */

/**
 * Демо-словарь синонимов: слова, которыми настройку называют в разговоре, — из текстов спеки и аудита
 * (пример аудита — «размытые фото» → детектор размытых изображений). Курируемый словарь из вики — за аналитиком.
 */
export const SYNONYMS: Record<string, string[]> = {
  'general.active': ['включить схему', 'отключить схему', 'выключить схему'],
  'general.schemeType': ['тип объекта', 'недвижимость', 'транспорт'],
  'general.owner': ['владелец', 'клиент', 'организация'],
  'general.purpose': ['образец', 'типовая схема', 'стандартная схема'],
  'general.behavior.skipExpertise': ['без экспертизы', 'сразу на проверку'],
  'general.behavior.lockOnReview': ['блокировка осмотра', 'занят другим'],
  'general.behavior.quickAccept': ['быстрое принятие', 'принять сразу'],
  'general.behavior.refuse': ['отказ от осмотра', 'осмотр невозможен'],
  'general.behavior.approval': ['согласующий', 'согласование полей', 'этап согласования'],
  'general.behavior.cadastreMap': ['кадастр', 'геолокация объекта'],
  'general.formulas.objectName': ['шаблон названия объекта', 'переменные'],
  'general.formulas.zipName': ['архив', 'выгрузка материалов'],
  'general.formulas.mailSubject': ['письмо клиенту', 'оповещение'],
  'general.dictionaries.comments': ['комментарии эксперта', 'причины возврата'],
  'general.deadlines.mode': ['срок проверки', 'сроки'],
  'general.deadlines.share': ['поделиться осмотром', 'ссылка на осмотр'],
  'mobile.mode': ['чек-лист', 'порядок выполнения'],
  'mobile.photo': ['качество фото', 'мегапиксели'],
  'mobile.video': ['качество видео'],
  'mobile.phone': ['звонок в поддержку', 'номер поддержки'],
  'web.feedback': ['обратная связь', 'оценка экспертизы'],
  'web.reasons': ['обоснования', 'причины оценки'],
  'access.executors': ['исполнитель', 'кто снимает'],
  'access.groups': ['группы пользователей', 'доступ по группам'],
  'ai.costs.A0': ['цена отделки', 'стоимость ремонта'],
  'ai.regionMatrix': ['региональные коэффициенты', 'поправки по регионам'],
  'ai.damage': ['повреждения кузова', 'нейросеть повреждений'],
  'anomalies.enabled': ['подозрительная активность', 'мошенничество'],
  'anomalies.detectors.blur.on': ['размытые фото', 'нерезкие фото', 'смазанные кадры'],
  'anomalies.detectors.spoof.on': ['фейковые координаты', 'подмена геолокации'],
  'anomalies.detectors.screen.on': ['фото с экрана', 'пересъёмка'],
  'anomalies.detectors.root.on': ['взломанный телефон', 'рут'],
  'pdf.templates': ['шаблон документа', 'акт осмотра'],
  'pdf.sign': ['подпись клиента', 'смс-подпись', 'согласование с клиентом'],
  'pdf.fileName': ['имя файла документа', 'название pdf'],
}

/** Описания — пояснения настроек со страницы: поиск находит по ним, когда слова нет в подписи. */
export const DESCRIPTIONS: Record<string, string> = {
  'general.behavior.skipExpertise': 'Осмотр будет сразу передан на проверку без этапа экспертизы',
  'general.behavior.lockOnReview': 'Запрещает редактирование осмотра другими пользователями во время проверки',
  'general.behavior.quickAccept': 'Проверяющий сможет утвердить осмотр без поэтапного прохождения всех шагов',
  'general.behavior.requireAllSteps': 'Возврат на доработку возможен только после вынесения решения по каждому шагу',
  'general.behavior.lowRolesReturn': 'Агенты и операторы смогут инициировать возврат осмотра на доработку',
  'general.behavior.approvalRequired': 'Осмотр не будет принят, пока не пройдёт согласование',
  'general.behavior.cadastreMap': 'Отображает геолокацию объекта на карте по кадастровому номеру',
  'general.behavior.forbidExtraFiles': 'Пользователь не сможет прикрепить файлы за пределами обязательных полей',
  'mobile.startAfterCreate': 'Пользователь сразу переходит к выполнению без промежуточного экрана',
  'web.feedback': 'Позволяет экспертам оставлять комментарии и оценки по результатам проверки',
  'pdf.sign': 'Добавляет в процесс этап подписания клиентом. Клиент получает документ и подписывает его кодом из СМС',
  'anomalies.enabled': 'Детекторы подозрительной активности при проведении осмотра',
}

export const SECTION_LABELS: Record<string, string> = {
  general: 'Общие', mobile: 'Мобильное приложение', web: 'Веб-приложение', access: 'Права доступа', ai: 'ИИ-анализ', anomalies: 'Аномалии', pdf: 'PDF',
}

export interface SearchItem {
  /** Путь настройки в конфигурации — ключ индекса. */
  key: string
  label: string
  section: string
  anchor: string
  /** Цель на странице — значение `data-setting`, `data-field`, `data-radio` либо `data-formula`. */
  target: string
  /** Чем найдено: подписью, синонимом или описанием. */
  via: 'label' | 'synonym' | 'description'
  /** Пояснение для строки выдачи: синоним либо описание, по которому найдено. */
  hint: string
}
export interface SearchGroup { path: string, items: SearchItem[] }
export interface SearchResult { query: string, groups: SearchGroup[], count: number }

/** Сколько результатов показывает выдача: палитра ведёт к месту, список целиком ей не нужен. */
export const SEARCH_LIMIT = 12

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

interface Entry { meta: SettingMeta, label: string, synonyms: string[], description: string }
const INDEX: Entry[] = SETTINGS
  /* Роль детектора ищется через сам детектор: отдельной строкой выдачи она дублировала бы его 14 раз. */
  .filter(meta => !/^anomalies\.detectors\.\w+\.role$/.test(meta.path))
  .map(meta => ({ meta, label: norm(meta.label), synonyms: (SYNONYMS[meta.path] ?? []).map(norm), description: norm(DESCRIPTIONS[meta.path] ?? '') }))

/**
 * Поиск: буквальный матч по подписи, затем по синонимам, затем по описанию — сквозь все разделы. Выдача
 * сгруппирована по пути «Настройки → Раздел»; порядок групп — порядок разделов, внутри — порядок настроек.
 */
export function searchSettings(query: string): SearchResult {
  const q = norm(query)
  if (!q) return { query, groups: [], count: 0 }
  const found: SearchItem[] = []
  for (const e of INDEX) {
    const synonym = e.synonyms.find(x => x.includes(q))
    const via = e.label.includes(q) ? 'label' : synonym ? 'synonym' : e.description.includes(q) ? 'description' : null
    if (!via) continue
    const original = (SYNONYMS[e.meta.path] ?? []).find(x => norm(x) === synonym)
    found.push({
      key: e.meta.path, label: e.meta.label, section: e.meta.section, anchor: e.meta.anchor, target: e.meta.target ?? '', via,
      hint: via === 'synonym' ? `по запросу «${original}»` : via === 'description' ? (DESCRIPTIONS[e.meta.path] ?? '') : '',
    })
  }
  const shown = found.slice(0, SEARCH_LIMIT)
  const groups: SearchGroup[] = []
  for (const item of shown) {
    const path = `Настройки → ${SECTION_LABELS[item.section] ?? item.section}`
    let grp = groups.find(x => x.path === path)
    if (!grp) groups.push(grp = { path, items: [] })
    grp.items.push(item)
  }
  return { query, groups, count: found.length }
}

/** «Быстрый переход» пустой выдачи — макет `33245:9031`: разделы и таб. */
export const QUICK_LINKS: { label: string, tab: 'settings' | 'processes', section?: string }[] = [
  { label: 'Аномалии', tab: 'settings', section: 'anomalies' },
  { label: 'Права доступа', tab: 'settings', section: 'access' },
  { label: 'PDF', tab: 'settings', section: 'pdf' },
  { label: 'Процессы и шаги', tab: 'processes' },
]
