import { SCHEME_TYPES } from './catalogs'
import { plural } from './diff'
import type { SchemeConfig, TabId } from './model'

/**
 * Модель готовности схемы — такт 91 (`docs/scheme-edit-review.md`, 5.4; решение 4 оркестратора 2026-10-08). Чистые функции:
 * DOM и реактивности модуль не знает. Из конфигурации черновика считаются этапы и проверки; одна правда для полосы подготовки,
 * чипа у «Опубликовать схему», маркеров на вкладках и гейта публикации. До такта 91 гейт считала `validateConfig` (`diff.ts`, такт 64):
 * её проверки вошли сюда с прежними текстами.
 *
 * ## Этапы — таблица 5.4
 *
 * | этап | где | готово, когда | блокирует | предупреждает |
 * |---|---|---|---|---|
 * | Основа | «Настройки» → «Основное» | наименование, тип схемы, компания, тип осмотра, назначение | пустое наименование | — |
 * | Анкета | «Форма» | есть группа, в каждой — поле, у полей — алиасы | форма без полей; пустой или повторный алиас | поле без подсказки; группа без полей; согласование без отмеченных полей |
 * | Съёмка | «Процессы и шаги» | есть процесс, в каждом — шаг; у обязательных шагов есть описание | процесс без шагов | схема без процессов; шаг без описания; шаг без фото-подсказки; повторяемый процесс без шагов повтора и без текстов |
 * | Правила | «Настройки», кроме «Основного» | ручная отметка «Проверил унаследованное: права доступа, шаблоны PDF» | — | формула ссылается на поле, которого нет |
 * | Проверка и публикация | демо-осмотр, окно публикации | схема опубликована (такт 92, решение 1а: до публикации — «Готово к публикации» без галочки либо «! N» при блокирующих) | — | — |
 * | Витрина — после публикации | «Витрина» | карточка заполнена | — | — |
 *
 * Важность проверки: `block` — блокирует публикацию; `warn` — предупреждает; `todo` — этап не готов, публикацию не держит
 * (компания не выбрана, унаследованное не отмечено, поле витрины не заполнено). Отклонения от таблицы 5.4 — строки 279–284
 * реестра расхождений `docs/scheme-edit.md`, раздел 11.
 *
 * У проверки — место исправления (`place`): «Исправить» ведёт туда тем же переходом, что поиск (`goTo` модели). Цель места — та же,
 * что у поиска; кнопка пустого состояния — `act:<data-act>` (у `group-` и `process-` свои значения: группа и процесс).
 */
export type StageId = 'base' | 'form' | 'shooting' | 'rules' | 'publish' | 'showcase'
export type CheckLevel = 'block' | 'warn' | 'todo'

/** Место на странице — то, что принимает переход поиска `goTo`. */
export interface Place { tab: TabId, section: string, anchor: string, group: string, target: string }

export interface Check {
  /** Ключ проверки: `name-empty`, `alias-empty:f-vin`, `process-empty:p-docs`. */
  key: string
  stage: StageId
  level: CheckLevel
  text: string
  /** Область исправления для подписи строки: «Форма → Автомобиль». */
  area: string
  place: Place
}

export interface Stage {
  id: StageId
  label: string
  /** Где этап на странице — подпись для поповера. */
  where: string
  /** Место перехода к этапу; у «Проверки и публикации» — окно публикации, места нет. */
  place: Place | null
  done: boolean
  /** Причина замка: «Форма» и «Процессы» новой схемы до идентификатора, «Витрина» до публикации. */
  locked: string
  checks: Check[]
  /** Пояснение: что настроено либо что осталось. */
  meta: string
  /** Этап после публикации — «Витрина»: в счёт «N из 5» не входит. */
  after: boolean
}

export interface Readiness {
  stages: Stage[]
  /** Проверки всех этапов: блокирующие, затем предупреждения, затем задачи — в порядке страницы. */
  checks: Check[]
  blocks: number
  warns: number
  /** Готовых этапов из пяти; до публикации — не больше четырёх: «Проверка и публикация» засчитывается публикацией (такт 92). */
  done: number
  total: number
  /** Следующий этап: первый неготовый из четырёх; все готовы — «Проверка и публикация». */
  next: Stage
}

export interface ReadinessContext {
  /** У схемы есть опубликованная версия. */
  published: boolean
  /** Новая схема без идентификатора: «Форма» и «Процессы» закрыты (двухфазность, такт 72). */
  phaseLocked: boolean
  phaseReason: string
  /** Ручная отметка этапа «Правила». */
  rulesChecked: boolean
  /** Незаполненное витрины по черновику — `buildSitePreview(...).gapList`. */
  showcaseGaps: { field: string, label: string }[]
}

export const STAGE_ORDER: StageId[] = ['base', 'form', 'shooting', 'rules', 'publish']
export const RULES_LABEL = 'Проверил унаследованное: права доступа, шаблоны PDF'
export const SHOWCASE_LOCK = 'Доступно после публикации схемы'

const place = (tab: TabId, target: string, more: Partial<Place> = {}): Place => ({ tab, section: '', anchor: '', group: '', target, ...more })
const LEVEL_ORDER: Record<CheckLevel, number> = { block: 0, warn: 1, todo: 2 }
const byLevel = (list: Check[]) => list.map((c, k) => ({ c, k })).sort((a, b) => LEVEL_ORDER[a.c.level] - LEVEL_ORDER[b.c.level] || a.k - b.k).map(x => x.c)

/** Формулы с переменными `{Группа:алиас}` — проверка ссылок на поля формы (такт 64, `validateConfig`). */
const FORMULAS: { key: string, name: string, path: 'general' | 'pdf', target: string, section: string, anchor: string }[] = [
  { key: 'objectName', name: 'наименования объекта', path: 'general', target: 'objectName', section: 'general', anchor: 'formulas' },
  { key: 'schemeName', name: 'наименования схемы', path: 'general', target: 'schemeName', section: 'general', anchor: 'formulas' },
  { key: 'zipName', name: 'имени zip-архива', path: 'general', target: 'zipName', section: 'general', anchor: 'formulas' },
  { key: 'mailSubject', name: 'темы письма', path: 'general', target: 'mailSubject', section: 'general', anchor: 'formulas' },
  { key: 'fileName', name: 'имени PDF-документа', path: 'pdf', target: 'pdfFileName', section: 'pdf', anchor: '' },
]
const SYSTEM = ['Inspection:number', 'Inspection:date', 'Scheme:type']

/** Этапы и проверки черновика. */
export function readinessOf(config: SchemeConfig, ctx: ReadinessContext): Readiness {
  const g = config.settings.general
  const groups = config.form.groups
  const fields = groups.flatMap(grp => grp.fields.map(f => ({ ...f, grp })))
  const checks: Check[] = []
  const add = (c: Check) => checks.push(c)

  /* ---------- Основа ---------- */
  const basePlace = place('settings', 'name', { section: 'general', anchor: 'main' })
  if (!g.name.trim()) add({ key: 'name-empty', stage: 'base', level: 'block', text: 'Наименование схемы не заполнено', area: 'Настройки → Основное', place: basePlace })
  if (!g.owner.trim()) add({ key: 'owner-empty', stage: 'base', level: 'todo', text: 'Компания-владелец не выбрана', area: 'Настройки → Основное', place: place('settings', 'owner', { section: 'general', anchor: 'main' }) })
  const typeLabel = SCHEME_TYPES.find(t => t.value === g.schemeType)?.label ?? ''
  const baseDone = !!g.name.trim() && !!g.owner.trim() && !!g.schemeType && !!g.inspectionType && !!g.purpose

  /* ---------- Анкета ---------- */
  const formArea = (title: string) => `Форма → ${title}`
  const formPlace = groups.length ? place('form', `group-${groups[0]!.id}`, { group: groups[0]!.id }) : place('form', 'act:group-add-empty')
  if (!fields.length) add({ key: 'form-empty', stage: 'form', level: 'block', text: 'В форме нет полей', area: 'Форма', place: formPlace })
  for (const grp of groups) {
    if (!grp.fields.length) add({ key: `group-empty:${grp.id}`, stage: 'form', level: 'warn', text: `В группе «${grp.title}» нет полей`, area: formArea(grp.title), place: place('form', `group-${grp.id}`, { group: grp.id }) })
    const seen = new Set<string>()
    for (const f of grp.fields) {
      const alias = f.alias.trim()
      const at = place('form', `row-${f.id}`, { group: grp.id })
      if (!alias) add({ key: `alias-empty:${f.id}`, stage: 'form', level: 'block', text: `У поля «${f.title}» пустой алиас`, area: formArea(grp.title), place: at })
      else if (seen.has(alias)) add({ key: `alias-dup:${f.id}`, stage: 'form', level: 'block', text: `Алиас «${alias}» повторяется в группе «${grp.title}»`, area: formArea(grp.title), place: at })
      seen.add(alias)
      if (f.hints === 'none') add({ key: `field-hint:${f.id}`, stage: 'form', level: 'warn', text: `У поля «${f.title}» нет подсказки`, area: formArea(grp.title), place: at })
    }
  }
  if (g.behavior.approval && !fields.some(f => f.approval)) {
    add({ key: 'approval-none', stage: 'form', level: 'warn', text: 'Согласование включено, поля для согласования не отмечены', area: 'Настройки → Поведение процесса',
      place: place('settings', 'approval', { section: 'general', anchor: 'behavior' }) })
  }
  const aliasesOk = fields.every(f => !!f.alias.trim()) && groups.every(grp => new Set(grp.fields.map(f => f.alias.trim())).size === grp.fields.length)
  const formDone = groups.length > 0 && groups.every(grp => grp.fields.length > 0) && aliasesOk

  /* ---------- Съёмка ---------- */
  const procs = config.processes
  const procPlace = procs.length ? place('processes', `process-${procs[0]!.id}`) : place('processes', 'act:process-add-empty')
  if (!procs.length) add({ key: 'processes-none', stage: 'shooting', level: 'warn', text: 'В схеме нет процессов', area: 'Процессы и шаги', place: procPlace })
  for (const p of procs) {
    const at = place('processes', `process-${p.id}`)
    const area = `Процессы → ${p.title}`
    if (!p.steps.length) {
      /* Повторяемый процесс: шаги повтора правит оверлей, у приложения — экран «Шаги повтора не заданы» (демо-осмотр, такт 89). */
      if (p.repeatable) add({ key: `repeat-empty:${p.id}`, stage: 'shooting', level: 'warn', text: `В повторяемом процессе «${p.title}» нет шагов повтора`, area, place: at })
      else add({ key: `process-empty:${p.id}`, stage: 'shooting', level: 'block', text: `В процессе «${p.title}» нет шагов`, area, place: at })
    }
    if (p.repeatable && !Object.values(p.texts ?? {}).some(x => x.trim())) {
      add({ key: `repeat-texts:${p.id}`, stage: 'shooting', level: 'warn', text: `У повторяемого процесса «${p.title}» не заполнены тексты в приложении`, area, place: at })
    }
    for (const st of p.steps) {
      /* Шаги повторяемого процесса на вкладке не показаны — место исправления — его карточка. */
      const sp = p.repeatable ? at : place('processes', `step-${st.id}`)
      if (!st.description.trim()) add({ key: `step-desc:${st.id}`, stage: 'shooting', level: 'warn', text: `У шага «${st.title}» нет описания`, area, place: sp })
      if (!st.hints.length) add({ key: `step-hint:${st.id}`, stage: 'shooting', level: 'warn', text: `У шага «${st.title}» нет фото-подсказки`, area, place: sp })
    }
  }
  const shootingDone = procs.length > 0 && procs.every(p => p.steps.length > 0) && procs.every(p => p.steps.every(st => !st.required || !!st.description.trim()))

  /* ---------- Правила ---------- */
  /* Начало этапа — подраздел «Поведение процесса» у верха окна: активный якорь навигатора встаёт на него (текущий этап — «Правила»). */
  const rulesPlace = place('settings', 'anchor-behavior', { section: 'general', anchor: 'behavior' })
  if (!ctx.rulesChecked) add({ key: 'rules-check', stage: 'rules', level: 'todo', text: 'Проверьте унаследованное: права доступа и шаблоны PDF', area: 'Настройки → Права доступа, PDF', place: place('settings', 'rules-check') })
  const known = new Set([...fields.map(f => `${f.grp.alias}:${f.alias}`), ...SYSTEM])
  for (const fm of FORMULAS) {
    const formula = fm.path === 'pdf' ? config.settings.pdf.fileName : g.formulas[fm.key as keyof typeof g.formulas]
    for (const m of (formula ?? '').matchAll(/\{([^{}\s:]+:[^{}\s]+)\}/g)) {
      if (known.has(m[1]!)) continue
      add({ key: `formula:${fm.key}:${m[1]}`, stage: 'rules', level: 'warn', text: `Формула ${fm.name} ссылается на переменную {${m[1]}}, которой нет в форме`,
        area: fm.path === 'pdf' ? 'Настройки → PDF' : 'Настройки → Формулы и служебное', place: place('settings', fm.target, { section: fm.section, anchor: fm.anchor }) })
    }
  }
  const rulesDone = ctx.rulesChecked

  /* ---------- Витрина — после публикации ---------- */
  if (ctx.published) {
    for (const gap of ctx.showcaseGaps) {
      add({ key: `showcase-gap:${gap.field}`, stage: 'showcase', level: 'todo', text: `Не заполнено: ${gap.label}`, area: 'Витрина', place: place('showcase', gap.field) })
    }
  }

  const of = (id: StageId) => byLevel(checks.filter(c => c.stage === id))
  const blocks = checks.filter(c => c.level === 'block').length
  const warns = checks.filter(c => c.level === 'warn').length
  const nFields = fields.length
  const nSteps = procs.reduce((n, p) => n + p.steps.length, 0)
  const lockForm = ctx.phaseLocked ? ctx.phaseReason : ''
  const stages: Stage[] = [
    { id: 'base', label: 'Основа', where: 'Настройки → Основное', place: basePlace, done: baseDone, locked: '', checks: of('base'),
      meta: [typeLabel, g.owner.trim()].filter(Boolean).join(' · '), after: false },
    { id: 'form', label: 'Анкета', where: 'Форма', place: formPlace, done: formDone && !lockForm, locked: lockForm, checks: of('form'),
      meta: nFields ? `${nFields} ${plural(nFields, 'поле', 'поля', 'полей')} в ${groups.length} ${plural(groups.length, 'группе', 'группах', 'группах')}` : 'Полей нет', after: false },
    { id: 'shooting', label: 'Съёмка', where: 'Процессы и шаги', place: procPlace, done: shootingDone && !lockForm, locked: lockForm, checks: of('shooting'),
      meta: procs.length ? `${nSteps} ${plural(nSteps, 'шаг', 'шага', 'шагов')} в ${procs.length} ${plural(procs.length, 'процессе', 'процессах', 'процессах')}` : 'Процессов нет', after: false },
    { id: 'rules', label: 'Правила', where: 'Настройки: поведение, доступ, ИИ, PDF', place: rulesPlace, done: rulesDone, locked: '', checks: of('rules'),
      meta: rulesDone ? 'Унаследованное проверено' : 'Проверьте права доступа и шаблоны PDF', after: false },
    /*
     * Такт 92, решение 1а оркестратора 2026-10-08: этап засчитывается публикацией. До неё статус — «Готово к публикации» (маркер без
     * галочки выполненного) либо «Блокирует публикацию: N»; счёт полосы и чипа — по этапам 1–4.
     */
    { id: 'publish', label: 'Проверка и публикация', where: 'Демо-осмотр, окно публикации', place: null, done: ctx.published, locked: '', checks: [],
      meta: blocks ? `Блокирует публикацию: ${blocks}` : 'Готово к публикации', after: false },
    { id: 'showcase', label: 'Витрина', where: 'Витрина', place: place('showcase', 'scTitle'), done: ctx.published && !ctx.showcaseGaps.length,
      locked: ctx.published ? '' : SHOWCASE_LOCK, checks: of('showcase'),
      meta: !ctx.published ? 'После публикации схемы — карточка на витрине' : ctx.showcaseGaps.length ? `Не заполнено: ${ctx.showcaseGaps.length}` : 'Карточка заполнена', after: true },
  ]
  const main = stages.filter(s => !s.after)
  const next = main.slice(0, 4).find(s => !s.done) ?? main[4]!
  return { stages, checks: byLevel(checks), blocks, warns, done: main.filter(s => s.done).length, total: main.length, next }
}

/**
 * Проверки по вкладке — маркер «! N» у вкладки: блокирующие и предупреждения с местом исправления на этой вкладке. Задачи
 * (`todo`) в счёт не идут: они держат готовность этапа, публикацию — нет.
 */
export function tabIssues(r: Readiness, tab: TabId): { count: number, blocked: boolean } {
  const list = r.checks.filter(c => c.level !== 'todo' && c.place.tab === tab)
  return { count: list.length, blocked: list.some(c => c.level === 'block') }
}

/** Этапы вкладки: «Настройки» — «Основа» и «Правила», «Форма» — «Анкета», «Процессы и шаги» — «Съёмка», «Витрина» — «Витрина». */
export const TAB_STAGES: Record<TabId, StageId[]> = { settings: ['base', 'rules'], form: ['form'], processes: ['shooting'], showcase: ['showcase'] }

/** Следующий этап по порядку — «Далее» внизу этапа. */
export function stageAfter(id: StageId): StageId | null {
  const k = STAGE_ORDER.indexOf(id)
  return k < 0 ? null : STAGE_ORDER[k + 1] ?? null
}
