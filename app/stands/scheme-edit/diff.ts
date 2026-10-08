import type { DiffAreaItem, DiffChangeItem, DiffGroupItem, DiffKind, DiffTone, DiffWarning } from '~/components/ui/diff'
import type { SchemeConfig } from './model'
import {
  ACCESS_GROUPS, ACCESS_ROLES, COMMENT_DICTIONARIES, DEADLINE_EVENTS, DETECTOR_GROUPS, FINISH_CLASSES, PDF_SIGNERS, PHOTO_RESOLUTIONS,
  REGION_MATRICES, ROLE_LADDER, ROLES, SCHEME_TYPES, STATUS_DICTIONARIES, STEP_FLAGS, STEP_KINDS, VIDEO_RESOLUTIONS,
  COORDS_MODES, DURATION_MODES, OBJECT_TYPES, SHOWCASE_STATUS,
} from './catalogs'
import { hintLabel } from './hints'
import { REPEAT_TEXT_FIELDS } from './repeat-texts'

/**
 * Дифф конфигураций схемы, валидация и каталог настроек — такт 64, порция П4 (`docs/scheme-edit.md`, 6.2).
 * Источник — `spec-audit.md`: «Как устроен дифф», «Масштабируемость диффа», «Валидационный гейт публикации».
 *
 * Чистые функции: DOM и реактивности модуль не знает. Один расчёт на оба режима — черновик против текущей версии
 * и версия N против N−1.
 *
 * Каталог `SETTINGS` — подпись и место каждой настройки: им пользуются дифф (подписи и значения «было → стало») и
 * поиск порции П5 (индекс «ключ · подпись · путь»).
 */
type Option = { value: string, label: string }
export interface SettingMeta {
  /** Путь в конфигурации после `settings.`. */
  path: string
  label: string
  section: string
  /** Якорь подраздела (`SECTION_ANCHORS`); пусто — раздел без якорей. */
  anchor: string
  /** Варианты значения: значение показывается подписью варианта. */
  options?: readonly Option[]
  /** Якорь строки на странице — `data-setting` либо `data-field`; по нему поиск ведёт к месту. */
  target?: string
}

const opt = (...pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }))
const g = (path: string, label: string, anchor: string, more: Partial<SettingMeta> = {}): SettingMeta => ({ path: `general.${path}`, label, section: 'general', anchor, ...more })
const s = (section: string, path: string, label: string, anchor = '', more: Partial<SettingMeta> = {}): SettingMeta => ({ path: `${section}.${path}`, label, section, anchor, ...more })

export const SETTINGS: SettingMeta[] = [
  g('name', 'Наименование', 'main', { target: 'name' }),
  g('description', 'Описание', 'main', { target: 'description' }),
  g('schemeType', 'Тип схемы осмотра', 'main', { options: SCHEME_TYPES, target: 'schemeType' }),
  g('owner', 'Компания-владелец', 'main', { target: 'owner' }),
  g('inspectionType', 'Тип осмотра', 'main', { options: opt(['regular', 'Обычный'], ['multi', 'Мультиосмотр']), target: 'inspectionType' }),
  g('purpose', 'Назначение схемы', 'main', { options: opt(['standard', 'Стандартная'], ['typical', 'Типовая'], ['sample', 'Схема-образец']), target: 'purpose' }),
  g('active', 'Схема активна', 'main', { target: 'active' }),
  g('behavior.skipExpertise', 'Пропускать экспертизу', 'behavior', { target: 'skipExpertise' }),
  g('behavior.lockOnReview', 'Блокировать осмотр при проверке', 'behavior', { target: 'lockOnReview' }),
  g('behavior.unlockMinutes', 'Разблокировать при неактивности через, минут', 'behavior', { target: 'lockOnReview' }),
  g('behavior.quickAccept', 'Разрешить принимать осмотр одной кнопкой', 'behavior', { target: 'quickAccept' }),
  g('behavior.requireAllSteps', 'Требовать решения во всех шагах для возврата на доработку', 'behavior', { target: 'requireAllSteps' }),
  g('behavior.lowRolesReturn', 'Разрешить низким ролям возвращать осмотр на доработку', 'behavior', { target: 'lowRolesReturn' }),
  g('behavior.refuse', 'Разрешить отказываться с отметкой «Осмотр невозможен»', 'behavior', { target: 'refuse' }),
  g('behavior.refuseRepeatable', 'Разрешить отказываться от повторяемых процессов с той же отметкой', 'behavior', { target: 'refuseRepeatable' }),
  g('behavior.refuseCommentVisibility', 'Видимость комментария к отказу', 'behavior', { options: opt(['all', 'Все роли'], ['expert', 'Эксперт и выше'], ['admin', 'Только администратор']), target: 'refuseCommentVisibility' }),
  g('behavior.approval', 'Отправлять поля на согласование согласующему лицу', 'behavior', { target: 'approval' }),
  g('behavior.approvalRequired', 'Обязательное согласование осмотра после экспертизы', 'behavior', { target: 'approvalRequired' }),
  g('behavior.cadastreMap', 'Показывать координаты на кадастровой карте', 'behavior', { target: 'cadastreMap' }),
  g('behavior.forbidExtraFiles', 'Запретить использовать блок дополнительных файлов', 'behavior', { target: 'forbidExtraFiles' }),
  g('formulas.objectName', 'Формула: наименование объекта', 'formulas', { target: 'objectName' }),
  g('formulas.schemeName', 'Формула: наименование схемы', 'formulas', { target: 'schemeName' }),
  g('formulas.zipName', 'Формула: имя zip-архива', 'formulas', { target: 'zipName' }),
  g('formulas.mailSubject', 'Формула: тема письма оповещения', 'formulas', { target: 'mailSubject' }),
  g('dictionaries.statuses', 'Словарь статусов', 'dictionaries', { options: STATUS_DICTIONARIES, target: 'statusDict' }),
  g('dictionaries.comments', 'Словарь комментариев', 'dictionaries', { options: COMMENT_DICTIONARIES, target: 'commentDict' }),
  g('deadlines.mode', 'Дедлайн проверки', 'deadlines', { options: opt(['none', 'Не устанавливать автоматически'], ['hours', 'Установить через N часов'], ['days', 'Установить через N дней']), target: 'deadlineMode' }),
  g('deadlines.hours', 'Дедлайн проверки: часов', 'deadlines', { target: 'deadlineMode' }),
  g('deadlines.days', 'Дедлайн проверки: дней', 'deadlines', { target: 'deadlineMode' }),
  g('deadlines.from', 'Событие отсчёта дедлайна', 'deadlines', { options: DEADLINE_EVENTS, target: 'deadlineFrom' }),
  g('deadlines.editors', 'Кто может редактировать дедлайн', 'deadlines', { options: ROLES, target: 'deadlineEditors' }),
  g('deadlines.share', 'Кто может делиться осмотром', 'deadlines', { options: opt(['anyone', 'Любой, с кем поделились'], ['executor', 'Только исполнитель'], ['executor-up', 'Исполнитель и выше'], ['nobody', 'Никто']), target: 'share' }),
  g('deadlines.manualCoordinate', 'Кто может задавать координату вручную', 'deadlines', { options: ROLES, target: 'manualCoordinate' }),
  g('confirm.hint', 'Подсказка клиенту', 'confirm', { target: 'confirmHint' }),
  g('confirm.checkbox', 'Текст галочки', 'confirm', { target: 'confirmCheckbox' }),

  s('mobile', 'mode', 'Режим выполнения', 'shooting', { options: opt(['regular', 'Обычный'], ['checklist', 'Чек-лист']), target: 'mobileMode' }),
  s('mobile', 'photo', 'Разрешение фото', 'shooting', { options: PHOTO_RESOLUTIONS, target: 'photo' }),
  s('mobile', 'video', 'Разрешение видео', 'shooting', { options: VIDEO_RESOLUTIONS, target: 'video' }),
  s('mobile', 'phone', 'Телефон для звонка', 'shooting', { target: 'phone' }),
  s('mobile', 'phoneName', 'Название телефона', 'shooting', { target: 'phoneName' }),
  s('mobile', 'callConfirm', 'Запрос подтверждения звонка', 'shooting', { target: 'callConfirm' }),
  s('mobile', 'startAfterCreate', 'Запустить осмотр сразу после создания', 'mobile-behavior', { target: 'startAfterCreate' }),
  s('mobile', 'hideHints', 'Разрешать опытным пользователям скрывать подсказки к шагам', 'mobile-behavior', { target: 'hideHints' }),
  s('mobile', 'skipConfirm', 'Разрешать опытным пользователям пропускать подтверждение после шага', 'mobile-behavior', { target: 'skipConfirm' }),

  s('web', 'feedback', 'Блок обратной связи на странице экспертизы', 'feedback', { target: 'feedback' }),
  s('web', 'reasons', 'Варианты обоснований', 'feedback', { target: 'feedback' }),
  s('web', 'blockRepeat', 'Запретить переход в «Повтор»', 'feedback', { target: 'blockRepeat' }),
  s('web', 'blockRefuse', 'Запретить переход в «Отказ»', 'feedback', { target: 'blockRefuse' }),
  s('web', 'blockContract', 'Запретить переход в «Подписание» или «Контракт»', 'feedback', { target: 'blockContract' }),

  s('access', 'executors', 'Кто может выполнять осмотр', 'execution', { options: ACCESS_ROLES, target: 'executors' }),
  s('access', 'manage', 'Кто может управлять выполнением осмотра', 'execution', { options: opt(['all', 'Все роли'], ['expert', 'Эксперт и выше'], ['admin', 'Только администратор']), target: 'manage' }),
  s('access', 'createMode', 'Кто может управлять созданием осмотра', 'creation', { options: opt(['groups', 'Учитывать роль и группы доступа'], ['role', 'Только по роли'], ['open', 'Открытое создание']), target: 'createMode' }),
  s('access', 'createRoles', 'Необходимая роль для создания', 'creation', { options: ACCESS_ROLES, target: 'createRoles' }),
  s('access', 'groups', 'Группы доступа', 'groups', { options: ACCESS_GROUPS.map(x => ({ value: x.id, label: x.name })), target: 'groupQuery' }),

  s('ai', 'aliasTotal', 'Алиас для «Общая площадь объекта»', 'finish', { target: 'aliasTotal' }),
  s('ai', 'aliasRoom', 'Алиас для «Площадь отдельного помещения»', 'finish', { target: 'aliasRoom' }),
  ...FINISH_CLASSES.map(c => s('ai', `costs.${c.code}`, `Стоимость класса ${c.code} «${c.title}», ₽/м²`, 'costs', { target: `cost-${c.code}` })),
  s('ai', 'regionMatrix', 'Матрица корректировок по регионам', 'regions', { options: REGION_MATRICES, target: 'regionMatrix' }),
  s('ai', 'damage', 'Распознавание повреждений', '', { target: 'damage' }),
  s('ai', 'vinRecognition', 'Распознавание VIN', '', { target: 'vinRecognition' }),
  s('ai', 'damageCost', 'Оценка ущерба', '', { target: 'damageCost' }),

  s('anomalies', 'enabled', 'Отображать блок аномалий', '', { target: 'anomaliesEnabled' }),
  s('anomalies', 'defaultRole', 'Роль видимости аномалий по умолчанию', '', { options: ROLE_LADDER, target: 'defaultRole' }),
  ...DETECTOR_GROUPS.flatMap(grp => grp.detectors.flatMap(d => [
    s('anomalies', `detectors.${d.id}.on`, `Детектор «${d.title}»`, '', { target: `det-${d.id}` }),
    s('anomalies', `detectors.${d.id}.role`, `Роль детектора «${d.title}»`, '', { options: [{ value: '', label: 'по умолчанию' }, ...ROLE_LADDER], target: `det-${d.id}` }),
  ])),

  s('pdf', 'templates', 'Шаблоны документов', '', { target: 'template-add' }),
  s('pdf', 'sign', 'Запрашивать подписание документа после успешной экспертизы', '', { target: 'pdfSign' }),
  s('pdf', 'signer', 'Кто подписывает документ', '', { options: PDF_SIGNERS, target: 'pdfSign' }),
  s('pdf', 'showSigned', 'Показывать подписанный PDF в приложении', '', { target: 'pdfSign' }),
  s('pdf', 'mailSigned', 'Отправлять подписанный PDF на почту', '', { target: 'pdfSign' }),
  s('pdf', 'unsignedShow', 'Формировать PDF без подписи и показывать в приложении после экспертизы', '', { target: 'unsignedShow' }),
  s('pdf', 'unsignedMail', 'Отправлять PDF без подписи на почту', '', { target: 'unsignedMail' }),
  s('pdf', 'fileName', 'Формула имени PDF-документа', '', { target: 'pdfFileName' }),
  s('pdf', 'attachExtra', 'Прикреплять в конец документа PDF-файлы из дополнительных файлов', '', { target: 'attachExtra' }),
]

export const plural = (n: number, one: string, few: string, many: string) => {
  const d = n % 10
  const h = n % 100
  return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}

const at = (root: unknown, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), root)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Значение настройки для строки «было → стало». */
function show(meta: SettingMeta, value: unknown): string {
  const label = (v: unknown) => meta.options?.find(o => o.value === v)?.label ?? String(v)
  if (typeof value === 'boolean') return value ? 'включено' : 'выключено'
  if (Array.isArray(value)) {
    if (!value.length) return 'пусто'
    if (value.every(v => typeof v === 'string')) return value.map(label).join(', ')
    return value.map(v => (v as { title?: string }).title ?? '').join(', ')
  }
  if (value === '' || value == null) return meta.options ? label('') : 'пусто'
  return meta.options ? label(value) : String(value)
}

/** Следствие правки — матрица правил (`spec-audit.md`, «Как устроен дифф», п. 4): что изменится в поведении. */
function effect(path: string, after: unknown): string {
  switch (path) {
    case 'general.behavior.approval': return after ? 'В процесс добавится этап согласования' : 'Этап согласования уйдёт из процесса'
    case 'general.schemeType': return 'Изменится набор доступных ИИ-модулей'
    case 'general.behavior.skipExpertise': return after ? 'Осмотр пойдёт на проверку без этапа экспертизы' : 'В процесс вернётся этап экспертизы'
    case 'general.active': return after ? 'По схеме снова можно создавать осмотры' : 'Новые осмотры по схеме создаваться не будут'
    case 'pdf.sign': return after ? 'В процесс добавится этап подписания клиентом' : 'Этап подписания клиентом уйдёт из процесса'
    case 'anomalies.enabled': return after ? '' : 'Блок аномалий исчезнет со страницы экспертизы'
    default: return ''
  }
}

interface Raw { kind: DiffKind, unit: string, item: DiffChangeItem }
const KINDS: DiffKind[] = ['added', 'changed', 'removed']

/** Счётчик области: «+1 поле», «−1 шаг», «2 изменения», «без изменений». */
function areaOf(id: string, title: string, raw: Raw[]): DiffAreaItem {
  const groups: DiffGroupItem[] = KINDS.map(kind => ({ kind, items: raw.filter(r => r.kind === kind).map(r => r.item) })).filter(x => x.items.length)
  const n = raw.length
  if (!n) return { id, title, count: 'без изменений', tone: 'none', groups }
  const kinds = new Set(raw.map(r => r.kind))
  const units = new Set(raw.map(r => r.unit))
  const forms: Record<string, [string, string, string]> = { field: ['поле', 'поля', 'полей'], step: ['шаг', 'шага', 'шагов'], process: ['процесс', 'процесса', 'процессов'], group: ['группа', 'группы', 'групп'] }
  const unit = units.size === 1 ? forms[[...units][0]!] : undefined
  let count = `${n} ${plural(n, 'изменение', 'изменения', 'изменений')}`
  let tone: DiffTone = 'changed'
  if (kinds.size === 1 && unit && kinds.has('added')) { count = `+${n} ${plural(n, ...unit)}`; tone = 'added' }
  if (kinds.size === 1 && unit && kinds.has('removed')) { count = `−${n} ${plural(n, ...unit)}`; tone = 'removed' }
  return { id, title, count, tone, groups }
}

export interface SchemeDiff {
  areas: DiffAreaItem[]
  attention: string[]
  count: number
  total: string
}

type StepLike = SchemeConfig['processes'][number]['steps'][number]
type ProcessLike = SchemeConfig['processes'][number]
/** Атрибуты сайда процесса (такт 71) для диффа: название и «повторяемый» идут своими строками; у выбора — подпись значения. */
type ChoiceItems = readonly { value: string, label: string }[]
const PROCESS_ATTRS: [keyof ProcessLike, string, ChoiceItems?][] = [
  ['alias', 'алиас'], ['formula', 'формула наименования'], ['icon', 'иконка'], ['hidden', 'скрытый'], ['pickSteps', 'выбор шагов во время съёмки'],
  ['objectType', 'тип объекта', OBJECT_TYPES], ['coords', 'координаты', COORDS_MODES], ['prepHint', 'подсказка подготовки'], ['duration', 'время прохождения', DURATION_MODES], ['durationMin', 'минут'],
]
/**
 * «Было → стало» у шага: способ и подсказки — всегда (как до такта 70); тип шага и флаги — когда они сменились (такт 70:
 * тип меняется в строке, флаги — панелью массовых действий).
 *
 * Такт 87: подсказки — список (каталог и свои загрузки); «подсказок: N» — его длина, а сменившиеся подсказки идут в «стало»
 * скобкой: «+ «Правая сторона · профиль»; − «Своя загрузка · front-2.jpg»», не больше двух имён на знак — дальше «и ещё N».
 */
function stepChange(was: StepLike, st: StepLike): { before: string, after: string } {
  const kind = (x: StepLike) => STEP_KINDS.find(k => k.value === x.kind)?.label ?? x.kind
  const flags = (x: StepLike) => STEP_FLAGS.filter(f => x[f.key]).map(f => f.label.toLowerCase()).join(', ') || 'без флагов'
  const nets = (x: StepLike) => x.networks.join(', ') || 'без нейросетей'
  /* Такт 71: сайд шага меняет и нейросети — они в «было → стало», когда сменились. */
  const text = (x: StepLike) => [x.method, `подсказок: ${x.hints.length}`, ...(was.kind !== st.kind ? [kind(x)] : []), ...(flags(was) !== flags(st) ? [`флаги: ${flags(x)}`] : []),
    ...(nets(was) !== nets(st) ? [`нейросети: ${nets(x)}`] : [])].join(', ')
  const ids = (x: StepLike) => new Set(x.hints.map(h => `${h.kind}:${h.id}`))
  const a = ids(was)
  const b = ids(st)
  const names = (list: StepLike['hints']) => (list.length > 2 ? [...list.slice(0, 2).map(h => `«${hintLabel(h)}»`), `и ещё ${list.length - 2}`] : list.map(h => `«${hintLabel(h)}»`)).join(', ')
  const added = st.hints.filter(h => !a.has(`${h.kind}:${h.id}`))
  const removed = was.hints.filter(h => !b.has(`${h.kind}:${h.id}`))
  const delta = [added.length ? `+ ${names(added)}` : '', removed.length ? `− ${names(removed)}` : ''].filter(Boolean).join('; ')
  return { before: text(was), after: delta ? `${text(st)} (${delta})` : text(st) }
}

/** Дифф `from → to`: сводка по четырём областям, группы «Добавлено · Изменено · Удалено», «Требует внимания». */
export function diffConfigs(from: SchemeConfig, to: SchemeConfig): SchemeDiff {
  const attention: string[] = []

  /* ---------- Настройки ---------- */
  const settings: Raw[] = []
  for (const meta of SETTINGS) {
    const a = at(from.settings, meta.path)
    const b = at(to.settings, meta.path)
    if (same(a, b)) continue
    settings.push({ kind: 'changed', unit: 'setting', item: { label: meta.label, before: show(meta, a), after: show(meta, b), effect: effect(meta.path, b) || undefined } })
    if (meta.path === 'general.schemeType') attention.push(`Сменён тип схемы: ${show(meta, a)} → ${show(meta, b)}`)
    if (meta.path === 'general.behavior.approval' && !b) attention.push('Отключено согласование')
  }

  /* ---------- Форма ---------- */
  const form: Raw[] = []
  const fieldsOf = (c: SchemeConfig) => new Map(c.form.groups.flatMap(grp => grp.fields.map(f => [f.id, { ...f, group: grp.title }] as const)))
  const fa = fieldsOf(from)
  const fb = fieldsOf(to)
  const ATTRS: [keyof typeof FIELD_ATTR, string][] = Object.entries(FIELD_ATTR) as never
  for (const [id, f] of fb) {
    const old = fa.get(id)
    if (!old) { form.push({ kind: 'added', unit: 'field', item: { label: `Поле «${f.title}»`, after: `группа «${f.group}», алиас ${f.alias || 'пуст'}` } }); continue }
    for (const [key, label] of ATTRS) {
      if (same(old[key], f[key])) continue
      form.push({ kind: 'changed', unit: 'attr', item: { label: `Поле «${f.title}»: ${label}`, before: fieldValue(old[key]), after: fieldValue(f[key]) } })
    }
  }
  for (const [id, f] of fa) if (!fb.has(id)) { form.push({ kind: 'removed', unit: 'field', item: { label: `Поле «${f.title}»`, before: `группа «${f.group}»` } }); attention.push(`Удалено поле «${f.title}»`) }
  const ga = new Map(from.form.groups.map(x => [x.id, x]))
  const gb = new Map(to.form.groups.map(x => [x.id, x]))
  for (const [id, x] of gb) if (!ga.has(id)) form.push({ kind: 'added', unit: 'group', item: { label: `Группа «${x.title}»` } })
  /* Перестановка полей ручкой строки (такт 70): порядок общих полей группы сменился. */
  for (const [id, x] of gb) {
    const old = ga.get(id)
    if (!old) continue
    const ids = new Set(old.fields.map(f => f.id))
    const before = old.fields.filter(f => x.fields.some(y => y.id === f.id)).map(f => f.title)
    const after = x.fields.filter(f => ids.has(f.id)).map(f => f.title)
    if (before.join(' | ') !== after.join(' | ')) form.push({ kind: 'changed', unit: 'attr', item: { label: `Группа «${x.title}»: порядок полей`, before: before.join(', '), after: after.join(', ') } })
  }
  for (const [id, x] of ga) if (!gb.has(id)) { form.push({ kind: 'removed', unit: 'group', item: { label: `Группа «${x.title}»` } }); attention.push(`Удалена группа полей «${x.title}»`) }

  /* ---------- Процессы и шаги ---------- */
  const processes: Raw[] = []
  const pa = new Map(from.processes.map(p => [p.id, p]))
  const pb = new Map(to.processes.map(p => [p.id, p]))
  for (const [id, p] of pb) {
    const old = pa.get(id)
    if (!old) { processes.push({ kind: 'added', unit: 'process', item: { label: `Процесс «${p.title}»`, after: `${p.steps.length} ${plural(p.steps.length, 'шаг', 'шага', 'шагов')}` } }); continue }
    if (old.title !== p.title) processes.push({ kind: 'changed', unit: 'attr', item: { label: `Процесс «${old.title}»: название`, before: old.title, after: p.title } })
    if (old.repeatable !== p.repeatable) processes.push({ kind: 'changed', unit: 'attr', item: { label: `Процесс «${p.title}»: повторяемый`, before: fieldValue(old.repeatable), after: fieldValue(p.repeatable) } })
    /* Такт 71: прочие атрибуты сайда процесса — одной строкой «настройки процесса», списком сменившихся. */
    const changedAttrs = PROCESS_ATTRS.filter(([key]) => !same(old[key], p[key]))
    if (changedAttrs.length) {
      const list = (x: typeof p) => changedAttrs.map(([key, label, items]) => `${label}: ${items?.find(i => i.value === x[key])?.label ?? fieldValue(x[key])}`).join(', ')
      processes.push({ kind: 'changed', unit: 'attr', item: { label: `Процесс «${p.title}»: настройки процесса`, before: list(old), after: list(p) } })
    }
    /* Такт 88: тексты в приложении повторяемого процесса — одной строкой, списком сменившихся (как настройки процесса). */
    const text = (x: typeof p, key: (typeof REPEAT_TEXT_FIELDS)[number]['key']) => x.texts?.[key]?.trim() ?? ''
    const changedTexts = REPEAT_TEXT_FIELDS.filter(f => text(old, f.key) !== text(p, f.key))
    if (changedTexts.length) {
      const list = (x: typeof p) => changedTexts.map(f => `${f.diff}: ${text(x, f.key) || 'пусто'}`).join(', ')
      processes.push({ kind: 'changed', unit: 'attr', item: { label: `Процесс «${p.title}»: тексты в приложении`, before: list(old), after: list(p) } })
    }
    const sa = new Map(old.steps.map(x => [x.id, x]))
    const sb = new Map(p.steps.map(x => [x.id, x]))
    for (const [sid, st] of sb) {
      const was = sa.get(sid)
      if (!was) { processes.push({ kind: 'added', unit: 'step', item: { label: `Шаг «${st.title}»`, after: `процесс «${p.title}»` } }); continue }
      if (!same(was, st)) processes.push({ kind: 'changed', unit: 'attr', item: { label: `Шаг «${st.title}»`, ...stepChange(was, st) } })
    }
    /* Перестановка шагов ручкой строки (такт 70): порядок общих шагов процесса сменился. */
    const before = old.steps.filter(x => sb.has(x.id)).map(x => x.title)
    const after = p.steps.filter(x => sa.has(x.id)).map(x => x.title)
    if (before.join(' | ') !== after.join(' | ')) processes.push({ kind: 'changed', unit: 'attr', item: { label: `Процесс «${p.title}»: порядок шагов`, before: before.join(', '), after: after.join(', ') } })
    for (const [sid, st] of sa) if (!sb.has(sid)) { processes.push({ kind: 'removed', unit: 'step', item: { label: `Шаг «${st.title}»`, before: `процесс «${p.title}»` } }); attention.push(`Удалён шаг «${st.title}»`) }
  }
  for (const [id, p] of pa) if (!pb.has(id)) { processes.push({ kind: 'removed', unit: 'process', item: { label: `Процесс «${p.title}»` } }); attention.push(`Удалён процесс «${p.title}»`) }
  /* Такт 71: порядковый номер в сайде процесса переставляет процессы. */
  const pBefore = from.processes.filter(x => pb.has(x.id)).map(x => x.title)
  const pAfter = to.processes.filter(x => pa.has(x.id)).map(x => x.title)
  if (pBefore.join(' | ') !== pAfter.join(' | ')) processes.push({ kind: 'changed', unit: 'attr', item: { label: 'Порядок процессов', before: pBefore.join(', '), after: pAfter.join(', ') } })

  /* ---------- Витрина ---------- */
  const showcase: Raw[] = []
  for (const [key, label] of Object.entries(SHOWCASE_ATTR)) {
    const a = (from.showcase as unknown as Record<string, unknown>)[key]
    const b = (to.showcase as unknown as Record<string, unknown>)[key]
    if (same(a, b)) continue
    /* Такт 72: статус — подписью жизненного цикла; список той же длины с правкой текста — «текст изменён». */
    const value = (v: unknown) => (key === 'status' ? SHOWCASE_STATUS[v as keyof typeof SHOWCASE_STATUS] ?? String(v) : fieldValue(v))
    const edited = Array.isArray(a) && Array.isArray(b) && a.length === b.length
    showcase.push({ kind: 'changed', unit: 'attr', item: { label, before: edited ? `${a.length}` : value(a), after: edited ? `${b.length}, текст изменён` : value(b) } })
  }

  const areas = [areaOf('settings', 'Настройки', settings), areaOf('form', 'Форма', form), areaOf('processes', 'Процессы и шаги', processes), areaOf('showcase', 'Витрина', showcase)]
  const count = settings.length + form.length + processes.length + showcase.length
  const touched = areas.filter(a => a.tone !== 'none').length
  const total = count
    ? `Итого: ${count} ${plural(count, 'изменение', 'изменения', 'изменений')} в ${touched} ${plural(touched, 'разделе', 'разделах', 'разделах')}`
    : 'Изменений нет'
  return { areas, attention, count, total }
}

const FIELD_ATTR = { title: 'название', alias: 'алиас', type: 'тип', required: 'обязательное', webOnly: 'только web', dependent: 'зависимое', approval: 'на согласование' } as const
const SHOWCASE_ATTR = { status: 'Статус карточки', title: 'Продающее название', summary: 'Краткое описание', image: 'Изображение', priceFrom: 'Цена «от»', industry: 'Индустрия', spheres: 'Сфера применения', description: 'Развёрнутое описание', problems: 'Проблемы и решения', metrics: 'Метрики', hiddenModules: 'Скрытые модули' } as const
function fieldValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'да' : 'нет'
  if (v == null || v === '') return 'пусто'
  if (Array.isArray(v)) return v.length ? `${v.length}` : 'пусто'
  return String(v)
}

/**
 * Валидация перед публикацией — `spec-audit.md`, «Валидационный гейт публикации»: черновик может быть сломан,
 * опубликованный снимок — нет. Критичное блокирует публикацию, остальное предупреждает.
 */
export function validateConfig(config: SchemeConfig): DiffWarning[] {
  const out: DiffWarning[] = []
  const general = config.settings.general
  if (!general.name.trim()) out.push({ text: 'Наименование схемы не заполнено', critical: true })
  const fields = config.form.groups.flatMap(grp => grp.fields.map(f => ({ ...f, group: grp })))
  for (const f of fields) if (!f.alias.trim()) out.push({ text: `У поля «${f.title}» пустой алиас`, critical: true })
  if (general.behavior.approval && !fields.some(f => f.approval)) out.push({ text: 'Согласование включено, поля для согласования не отмечены', critical: false })
  /* Формулы: переменная `{Группа:алиас}`, которой нет в форме и среди служебных. */
  const known = new Set([...fields.map(f => `${f.group.alias}:${f.alias}`), 'Inspection:number', 'Inspection:date', 'Scheme:type'])
  const formulas: [string, string][] = [
    ['наименования объекта', general.formulas.objectName], ['наименования схемы', general.formulas.schemeName], ['имени zip-архива', general.formulas.zipName],
    ['темы письма', general.formulas.mailSubject], ['имени PDF-документа', config.settings.pdf.fileName],
  ]
  for (const [name, formula] of formulas) {
    for (const m of formula.matchAll(/\{([^{}\s:]+:[^{}\s]+)\}/g)) if (!known.has(m[1]!)) out.push({ text: `Формула ${name} ссылается на переменную {${m[1]}}, которой нет в форме`, critical: false })
  }
  return out
}

/** Сводка настроенного — первая публикация (`spec-audit.md`, «Первая публикация ≠ дифф»; макет `32765:13817`). */
export function summarize(config: SchemeConfig): string[] {
  const fields = config.form.groups.reduce((n, grp) => n + grp.fields.length, 0)
  const groups = config.form.groups.length
  const steps = config.processes.reduce((n, p) => n + p.steps.length, 0)
  const showcase = { needs: 'требует оформления', draft: 'черновик карточки', published: 'карточка опубликована' }[config.showcase.status]
  return [
    'Настройки — настроены',
    `Форма — ${fields} ${plural(fields, 'поле', 'поля', 'полей')} в ${groups} ${plural(groups, 'группе', 'группах', 'группах')}`,
    `Процессы — ${steps} ${plural(steps, 'шаг', 'шага', 'шагов')} в ${config.processes.length} ${plural(config.processes.length, 'процессе', 'процессах', 'процессах')}`,
    `Витрина — ${showcase}`,
  ]
}

/** Дата для индикатора, плашки и истории: «22.09.2026, 16:05». */
export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? `${m[3]}.${m[2]}.${m[1]}, ${m[4]}:${m[5]}` : iso
}
