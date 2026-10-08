import type { AppScreen, AppScreenPart } from '~/components/ui/app-preview'
import { FIELD_TYPES, MOBILE_SHOW, STEP_KINDS } from './catalogs'
import { plural } from './diff'
import { hintLabel, hintSrc } from './hints'
import { REPEAT_TEXT_FIELDS, type RepeatTextKey } from './repeat-texts'
import type { FormField, FormGroup, Process, ProcessStep, SchemeConfig } from './model'

/**
 * Демо-осмотр — такт 89 (`docs/scheme-edit-review.md`, 4.1; решения 5, 6 оркестратора 2026-10-08). Экраны мобильного приложения
 * исполнителя собираются из конфигурации схемы (черновик либо открытый снимок): этапы, переходы по кнопкам экранов, ветки,
 * пробелы и «Из чего собран экран» — какие настройки и сущности формируют экран. Логики приложения нет: только вид и переходы
 * (`spec-audit.md`, «Демо-осмотр — основной механизм превью»). Чистые функции: DOM и реактивности модуль не знает.
 *
 * **Этапы** — «Начало» (название схемы, компания; промежуточный экран, если выключено «Запустить осмотр сразу после создания»),
 * «Анкета» (экран на группу формы, видимую в мобильном: поля без «только web»), процессы по порядку (экран на шаг либо чек-лист
 * шагов при режиме «Чек-лист»; повторяемый — список повторов, экран повтора и «Есть ещё?» на текстах такта 88), «Подтверждение»
 * (подсказка, галочка, блок дополнительных файлов), «Готово» (звонок в поддержку при заданном телефоне), ветка «Осмотр
 * невозможен» при разрешённом отказе. Скрытые процессы и шаги исполнитель не видит — их в демо-осмотре нет.
 *
 * **Пробел** — то, без чего экран неполон: нет описания шага, нет фото-подсказки, нет текста повторяемого процесса, нет текстов
 * экрана подтверждения; у новой схемы — нет полей анкеты и процессов. Экран с пробелом помечен в оглавлении и на карте; в
 * телефоне вместо пустого текста — текст приложения по умолчанию.
 *
 * **Превью у «?»** (4.2; решение 7) — `helpPreview`: экран и обведённый элемент той же сборки, название, пояснение, значение.
 */

/** Куда ведёт «Изменить» строки «Из чего собран экран»: настройка — переходом поиска, сущность — своим сайдом. */
export type DemoEdit =
  | { kind: 'setting', key: string }
  | { kind: 'field', group: string, field: string }
  | { kind: 'group', group: string }
  | { kind: 'step', process: string, step: string, section: string }
  | { kind: 'process', process: string, repeatable: boolean, texts: boolean }
  | { kind: 'tab', tab: 'form' | 'processes' }

/** Строка «Из чего собран экран»: что формирует экран, текущее значение, пробел, куда ведёт «Изменить». */
export interface DemoSource {
  id: string
  label: string
  value: string
  gap: boolean
  edit: DemoEdit
}

export type DemoStageKind = 'start' | 'form' | 'process' | 'repeat' | 'confirm' | 'done' | 'refuse'

export interface DemoScreen extends AppScreen {
  id: string
  stage: string
  /** Подпись экрана в оглавлении и на карте. */
  label: string
  gaps: string[]
  sources: DemoSource[]
}

export interface DemoStage {
  id: string
  kind: DemoStageKind
  label: string
  /** Что за этап — вторая подпись ряда на карте: «Съёмка», «Повторяемый процесс», «Ветка». */
  hint: string
  screens: string[]
  /** Экранов с пробелами в этапе. */
  gaps: number
}

export interface Demo {
  stages: DemoStage[]
  screens: DemoScreen[]
  byId: Record<string, DemoScreen>
  /** Порядок «По шагам» — оглавление сверху вниз: стрелки ← → и счётчик «Экран N из M». */
  order: string[]
  /** Первый экран съёмки с кнопкой «Осмотр невозможен» — превью «?» отказа. */
  firstShot: string
}

/** Настройка: строка «Из чего собран экран» с переходом поиска страницы (ключ индекса — путь настройки). */
const setting = (key: string, label: string, value: string, gap = false): DemoSource => ({ id: `setting:${key}`, label, value, gap, edit: { kind: 'setting', key } })

const typeLabel = (t: string) => FIELD_TYPES.find(x => x.value === t)?.label ?? t
const kindLabel = (k: string) => STEP_KINDS.find(x => x.value === k)?.label ?? k
const quote = (s: string) => `«${s}»`
const notSet = 'не задано'

/** Способ съёмки — второй строкой слота: «1 фото», «от 2 до 7 фото», «1 видео». */
function methodCaption(method: string): string {
  const range = method.match(/^(\d+)–(\d+) (.+)$/)
  return range ? `от ${range[1]} до ${range[2]} ${range[3]}` : method
}

/** Тексты приложения по умолчанию — когда текст повторяемого процесса не задан (пробел). */
const REPEAT_DEFAULTS: Record<RepeatTextKey, string> = {
  item: 'Повтор', add: 'Добавить', before: '', more: 'Есть ещё?', finish: 'Завершить', empty: 'Пока ничего не добавлено',
}
const CONFIRM_CHECKBOX_DEFAULT = 'Подтверждаю, что данные верны'

/** Пробел-метка текста повторяемого процесса — коротко, как в оглавлении: «нет подписи кнопки добавления». */
const TEXT_GAPS: Record<RepeatTextKey, string> = {
  item: 'нет названия повтора', add: 'нет подписи кнопки добавления', before: 'нет подсказки перед повтором',
  more: 'нет вопроса «Есть ещё?»', finish: 'нет подписи кнопки завершения', empty: 'нет текста пустого списка',
}
const textGap = (key: RepeatTextKey) => TEXT_GAPS[key]

/** Группа видна в мобильном, если показ — не «Не показывать»; поле — если не «только web». */
const mobileFields = (g: FormGroup): FormField[] => (g.mobile === 'never' ? [] : g.fields.filter(f => !f.webOnly))
const visibleSteps = (p: Process): ProcessStep[] => p.steps.filter(st => !st.hidden)

/**
 * Демо-осмотр из конфигурации. `name` и `owner` — шапка приложения и экран «Начало»; переходы кнопок — экраны демо-осмотра
 * (`@back` — экран, с которого пришли).
 */
export function buildDemo(config: SchemeConfig): Demo {
  const g = config.settings.general
  const b = g.behavior
  const mob = config.settings.mobile
  const title = g.name.trim() || 'Новая схема осмотра'
  const checklist = mob.mode === 'checklist'
  const refuse = b.refuse
  const screens: DemoScreen[] = []
  const stages: DemoStage[] = []
  /** Основной путь осмотра: переход «Продолжить» — следующий экран пути. */
  const main: string[] = []

  const screen = (s: Omit<DemoScreen, 'title' | 'gaps' | 'sources'> & Partial<Pick<DemoScreen, 'gaps' | 'sources'>>): DemoScreen => {
    const x: DemoScreen = { title, gaps: [], sources: [], ...s }
    screens.push(x)
    return x
  }
  const stage = (id: string, kind: DemoStageKind, label: string, hint: string, ids: string[]) => {
    stages.push({ id, kind, label, hint, screens: ids, gaps: 0 })
  }

  /* ---------- Начало ---------- */
  const startIds = ['start']
  if (!mob.startAfterCreate) startIds.push('intro')
  screen({
    id: 'start', stage: 'start', label: 'Начало',
    parts: [
      { id: 'name', kind: 'title', size: 'lg', text: title, source: 'setting:general.name' },
      { id: 'owner', kind: 'text', text: g.owner || 'Компания не указана', source: 'setting:general.owner', tight: true },
      { id: 'start', kind: 'button', variant: 'primary', text: 'Начать', footer: true, to: '@next', source: 'setting:mobile.startAfterCreate' },
    ],
    sources: [
      setting('general.name', 'Наименование', g.name || notSet, !g.name.trim()),
      setting('general.owner', 'Компания-владелец', g.owner || notSet),
      setting('mobile.startAfterCreate', 'Запустить осмотр сразу после создания', mob.startAfterCreate ? 'включено — сразу к выполнению' : 'выключено — сначала экран «Осмотр создан»'),
    ],
  })
  if (!mob.startAfterCreate) {
    screen({
      id: 'intro', stage: 'start', label: 'Осмотр создан',
      parts: [
        { id: 'intro', kind: 'title', size: 'lg', text: 'Осмотр создан', source: 'setting:mobile.startAfterCreate' },
        { id: 'intro-text', kind: 'text', text: 'Начните сейчас или вернитесь к осмотру позже из списка', tight: true },
        { id: 'go', kind: 'button', variant: 'primary', text: 'Перейти к выполнению', footer: true, to: '@next', source: 'setting:mobile.startAfterCreate' },
        { id: 'later', kind: 'button', variant: 'outline', text: 'Выполнить позже', footer: true },
      ],
      sources: [setting('mobile.startAfterCreate', 'Запустить осмотр сразу после создания', 'выключено — промежуточный экран после «Начать»')],
    })
  }
  stage('start', 'start', 'Начало', 'Создание осмотра', startIds)
  main.push(...startIds)

  /* ---------- Анкета: экран на группу формы, видимую в мобильном ---------- */
  const groups = config.form.groups.filter(x => mobileFields(x).length)
  const formIds: string[] = []
  if (!config.form.groups.length) {
    screen({
      id: 'form:none', stage: 'form', label: 'Анкета', gaps: ['нет полей анкеты'],
      parts: [
        { id: 'form', kind: 'title', size: 'lg', text: 'Анкета', source: 'tab:form' },
        { id: 'form-empty', kind: 'empty', title: 'Полей пока нет', text: 'Добавьте группы и поля на табе «Форма» — с показом в мобильном', source: 'tab:form' },
        { id: 'next', kind: 'button', variant: 'primary', text: 'Продолжить', footer: true, to: '@next' },
      ],
      sources: [{ id: 'tab:form', label: 'Форма', value: 'групп и полей нет', gap: true, edit: { kind: 'tab', tab: 'form' } }],
    })
    formIds.push('form:none')
  }
  groups.forEach((grp, k) => {
    const fields = mobileFields(grp)
    const id = `form:${grp.id}`
    formIds.push(id)
    const hidden = grp.fields.length - fields.length
    screen({
      id, stage: 'form', label: grp.title,
      parts: [
        { id: 'progress', kind: 'progress', total: groups.length, done: k },
        { id: 'group', kind: 'title', text: grp.title, source: `group:${grp.id}` },
        ...fields.map((f): AppScreenPart => ({
          id: `field-${f.id}`, kind: 'field', label: f.title, type: f.type as 'text', required: f.required, placeholder: f.placeholder || f.title,
          hint: f.hints === 'photo' ? 'photo' : f.hints === 'standard' ? 'standard' : 'none', source: `field:${f.id}`,
        })),
        { id: 'next', kind: 'button', variant: 'primary', text: 'Продолжить', footer: true, to: '@next' },
      ],
      sources: [
        { id: `group:${grp.id}`, label: `Группа «${grp.title}»`, edit: { kind: 'group', group: grp.id }, gap: false,
          value: `в мобильном: ${(MOBILE_SHOW.find(x => x.value === grp.mobile)?.label ?? grp.mobile).toLowerCase()}${hidden ? ` · ещё ${hidden} ${plural(hidden, 'поле', 'поля', 'полей')} только web` : ''}` },
        ...fields.map((f): DemoSource => ({
          id: `field:${f.id}`, label: `Поле «${f.title}»`, gap: false, edit: { kind: 'field', group: grp.id, field: f.id },
          value: [typeLabel(f.type), f.required ? 'обязательное' : 'необязательное', f.placeholder ? `заполнитель ${quote(f.placeholder)}` : ''].filter(Boolean).join(' · '),
        })),
      ],
    })
  })
  if (formIds.length) {
    stage('form', 'form', 'Анкета', 'Поля формы в мобильном', formIds)
    main.push(...formIds)
  }

  /* ---------- Съёмка: процессы по порядку ---------- */
  const processes = config.processes.filter(p => !p.hidden)
  const refuseSource = setting('general.behavior.refuse', 'Отказ от осмотра', refuse ? 'разрешён — кнопка «Осмотр невозможен»' : 'выключен — кнопки нет')
  let firstShot = ''
  if (!processes.length) {
    screen({
      id: 'shooting:none', stage: 'shooting', label: 'Съёмка', gaps: ['нет шагов съёмки'],
      parts: [
        { id: 'shooting', kind: 'title', size: 'lg', text: 'Съёмка', source: 'tab:processes' },
        { id: 'shooting-empty', kind: 'empty', title: 'Снимать пока нечего', text: 'Добавьте процесс и шаги на табе «Процессы и шаги»', source: 'tab:processes' },
        { id: 'next', kind: 'button', variant: 'primary', text: 'Продолжить', footer: true, to: '@next' },
      ],
      sources: [{ id: 'tab:processes', label: 'Процессы и шаги', value: 'процессов нет', gap: true, edit: { kind: 'tab', tab: 'processes' } }],
    })
    stage('shooting', 'process', 'Съёмка', 'Процессы и шаги', ['shooting:none'])
    main.push('shooting:none')
    firstShot = 'shooting:none'
  }
  for (const p of processes) {
    const ids = p.repeatable ? repeatScreens(p) : processScreens(p)
    stage(`process:${p.id}`, p.repeatable ? 'repeat' : 'process', p.title, p.repeatable ? 'Повторяемый процесс' : 'Съёмка', ids)
    main.push(...ids)
  }

  /** Процесс: экран на шаг (режим «Обычный») либо чек-лист и экраны шагов (режим «Чек-лист»). */
  function processScreens(p: Process): string[] {
    const steps = visibleSteps(p)
    const processSource: DemoSource = { id: `process:${p.id}`, label: `Процесс «${p.title}»`, gap: false, edit: { kind: 'process', process: p.id, repeatable: false, texts: false },
      value: [`${steps.length} ${plural(steps.length, 'шаг', 'шага', 'шагов')}`, p.prepHint ? `подсказка ${quote(p.prepHint)}` : ''].filter(Boolean).join(' · ') }
    if (!steps.length) {
      const id = `steps:${p.id}:none`
      screen({
        id, stage: `process:${p.id}`, label: 'Шагов нет', gaps: ['нет шагов'],
        parts: [
          { id: 'process', kind: 'title', size: 'lg', text: p.title, source: `process:${p.id}` },
          { id: 'process-empty', kind: 'empty', title: 'В процессе нет шагов', text: 'Добавьте шаги на табе «Процессы и шаги»', source: `process:${p.id}` },
          { id: 'next', kind: 'button', variant: 'primary', text: 'Продолжить', footer: true, to: '@next' },
        ],
        sources: [processSource],
      })
      return [id]
    }
    const ids: string[] = []
    const listId = `checklist:${p.id}`
    if (checklist) {
      ids.push(listId)
      screen({
        id: listId, stage: `process:${p.id}`, label: 'Чек-лист шагов',
        parts: [
          { id: 'checklist', kind: 'title', text: `Чек-лист: ${p.title}`, source: 'setting:mobile.mode' },
          ...(p.prepHint ? [{ id: 'prep', kind: 'note', text: p.prepHint, source: `process:${p.id}` } as AppScreenPart] : []),
          ...steps.map((st, k): AppScreenPart => ({
            id: `row-${st.id}`, kind: 'row', title: `${k + 1}. ${st.title}`, meta: [methodCaption(st.method), st.required ? 'обязательный' : ''].filter(Boolean).join(' · '),
            src: st.hints[0] ? hintSrc(st.hints[0]) : undefined, icon: st.hints[0] ? undefined : 'photo-camera', to: `step:${p.id}:${st.id}`, source: `step:${st.id}`,
          })),
          ...(refuse ? [{ id: 'refuse', kind: 'button', variant: 'refuse', text: 'Осмотр невозможен', footer: true, to: 'refuse', source: 'setting:general.behavior.refuse' } as AppScreenPart] : []),
          { id: 'finish', kind: 'button', variant: 'primary', text: 'Завершить процесс', footer: true, to: '@after' },
        ],
        sources: [
          setting('mobile.mode', 'Режим выполнения', 'Чек-лист — список шагов с отметкой'),
          processSource,
          ...steps.map((st): DemoSource => ({ id: `step:${st.id}`, label: `Шаг «${st.title}»`, value: `${kindLabel(st.kind)} · ${st.method}`, gap: false,
            edit: { kind: 'step', process: p.id, step: st.id, section: 'main' } })),
          refuseSource,
        ],
      })
    }
    steps.forEach((st, k) => {
      const id = `step:${p.id}:${st.id}`
      ids.push(id)
      if (!firstShot) firstShot = id
      const hint = st.hints[0]
      const gaps = [...(st.description.trim() ? [] : ['нет описания']), ...(st.hints.length ? [] : ['нет фото-подсказки'])]
      screen({
        id, stage: `process:${p.id}`, label: `Шаг ${k + 1}: ${st.title}`, gaps,
        parts: [
          ...(checklist ? [] : [{ id: 'progress', kind: 'progress', total: steps.length, done: k, source: 'setting:mobile.mode' } as AppScreenPart]),
          ...(k === 0 && p.prepHint && !checklist ? [{ id: 'prep', kind: 'note', text: p.prepHint, source: `process:${p.id}` } as AppScreenPart] : []),
          { id: 'title', kind: 'title', text: `Шаг ${k + 1}: ${st.title}`, source: `step:${st.id}` },
          ...(st.description.trim() ? [{ id: 'description', kind: 'text', text: st.description, tight: true, source: `step-desc:${st.id}` } as AppScreenPart] : []),
          ...(st.tip.trim() ? [{ id: 'tip', kind: 'note', text: st.tip, source: `step-tip:${st.id}` } as AppScreenPart] : []),
          { id: 'shot', kind: 'shot', label: st.docScan ? 'Нажмите для сканирования' : 'Нажмите для съёмки', caption: methodCaption(st.method), src: hint ? hintSrc(hint) : undefined,
            source: `step-hints:${st.id}` },
          ...(st.gallery ? [{ id: 'gallery', kind: 'button', variant: 'link', text: 'Загрузить из галереи', source: `step:${st.id}` } as AppScreenPart] : []),
          ...(refuse ? [{ id: 'refuse', kind: 'button', variant: 'refuse', text: 'Осмотр невозможен', footer: true, to: 'refuse', source: 'setting:general.behavior.refuse' } as AppScreenPart] : []),
          ...(st.required || checklist ? [] : [{ id: 'skip', kind: 'button', variant: 'link', text: 'Пропустить шаг', footer: true, to: '@next', source: `step:${st.id}` } as AppScreenPart]),
          { id: 'next', kind: 'button', variant: 'primary', text: checklist ? 'Готово' : 'Продолжить', footer: true, to: checklist ? listId : '@next' },
        ],
        sources: [
          ...(checklist ? [] : [setting('mobile.mode', 'Режим выполнения', 'Обычный — экраны шагов по очереди')]),
          ...(k === 0 || checklist ? [processSource] : []),
          { id: `step:${st.id}`, label: `Шаг «${st.title}»`, gap: false, edit: { kind: 'step', process: p.id, step: st.id, section: 'main' },
            value: [kindLabel(st.kind), st.required ? 'обязательный' : 'необязательный', st.gallery ? 'из галереи' : ''].filter(Boolean).join(' · ') },
          { id: `step-desc:${st.id}`, label: 'Описание шага', value: st.description.trim() || notSet, gap: !st.description.trim(),
            edit: { kind: 'step', process: p.id, step: st.id, section: 'main' } },
          { id: `step-hints:${st.id}`, label: 'Фото-подсказки и способ съёмки', gap: !st.hints.length,
            value: `${st.hints.length ? `${st.hints.length} · ${hintLabel(st.hints[0]!)}` : 'не установлена'} · ${st.method}`,
            edit: { kind: 'step', process: p.id, step: st.id, section: 'photo-hints' } },
          ...(st.tip.trim() ? [{ id: `step-tip:${st.id}`, label: 'Подсказка на экране съёмки', value: st.tip, gap: false,
            edit: { kind: 'step', process: p.id, step: st.id, section: 'shooting' } } as DemoSource] : []),
          refuseSource,
        ],
      })
    })
    return ids
  }

  /** Повторяемый процесс: список повторов, экран повтора, «Есть ещё?» — на текстах в приложении (такт 88). */
  function repeatScreens(p: Process): string[] {
    const texts = p.texts
    const text = (key: RepeatTextKey) => texts[key]?.trim() || REPEAT_DEFAULTS[key]
    const has = (key: RepeatTextKey) => !!texts[key]?.trim()
    const textSource = (key: RepeatTextKey): DemoSource => {
      const f = REPEAT_TEXT_FIELDS.find(x => x.key === key)!
      return { id: `texts:${p.id}:${key}`, label: f.label, value: has(key) ? texts[key] : `${notSet}${REPEAT_DEFAULTS[key] ? ` — в приложении ${quote(REPEAT_DEFAULTS[key])}` : ''}`,
        gap: !has(key), edit: { kind: 'process', process: p.id, repeatable: true, texts: true } }
    }
    const steps = visibleSteps(p)
    const refuseRepeat = refuse && b.refuseRepeatable
    const processSource: DemoSource = { id: `process:${p.id}`, label: `Процесс «${p.title}»`, gap: !steps.length, edit: { kind: 'process', process: p.id, repeatable: true, texts: false },
      value: `повторяемый · ${steps.length ? `${steps.length} ${plural(steps.length, 'шаг', 'шага', 'шагов')} в повторе` : 'шагов повтора нет'}` }
    const list = `repeat-list:${p.id}`
    const item = `repeat-item:${p.id}`
    const more = `repeat-more:${p.id}`
    const after = '@after'
    screen({
      id: list, stage: `process:${p.id}`, label: 'Список повторов',
      gaps: (['empty', 'add'] as RepeatTextKey[]).filter(k => !has(k)).map(textGap),
      parts: [
        { id: 'process', kind: 'title', size: 'lg', text: p.title, source: `process:${p.id}` },
        { id: 'empty', kind: 'text', text: text('empty'), tight: true, source: `texts:${p.id}:empty` },
        ...(p.prepHint ? [{ id: 'prep', kind: 'note', text: p.prepHint, source: `process:${p.id}` } as AppScreenPart] : []),
        ...(refuseRepeat ? [{ id: 'refuse', kind: 'button', variant: 'refuse', text: 'Осмотр невозможен', footer: true, to: 'refuse', source: 'setting:general.behavior.refuseRepeatable' } as AppScreenPart] : []),
        { id: 'add', kind: 'button', variant: 'primary', text: text('add'), footer: true, to: item, source: `texts:${p.id}:add` },
      ],
      sources: [
        processSource, textSource('empty'), textSource('add'),
        setting('general.behavior.refuseRepeatable', 'Отказ от повторяемых процессов', refuseRepeat ? 'разрешён — кнопка «Осмотр невозможен»' : refuse ? 'выключен' : 'выключен вместе с отказом от осмотра'),
      ],
    })
    screen({
      id: item, stage: `process:${p.id}`, label: `${text('item')} 1`,
      gaps: [...(has('item') ? [] : [textGap('item')]), ...(has('before') ? [] : [textGap('before')]), ...(steps.length ? [] : ['нет шагов повтора'])],
      parts: [
        { id: 'item', kind: 'title', size: 'lg', text: `${text('item')} 1`, source: `texts:${p.id}:item` },
        ...(has('before') ? [{ id: 'before', kind: 'note', text: texts.before, source: `texts:${p.id}:before` } as AppScreenPart] : []),
        ...(steps.length
          ? steps.map((st, k): AppScreenPart => ({ id: `row-${st.id}`, kind: 'row', title: `${k + 1}. ${st.title}`, meta: methodCaption(st.method),
              src: st.hints[0] ? hintSrc(st.hints[0]) : undefined, icon: st.hints[0] ? undefined : 'photo-camera', source: `process:${p.id}` }))
          : [{ id: 'no-steps', kind: 'empty', title: 'Шаги повтора не заданы', text: 'Добавьте шаги в процессе — их снимают при каждом повторе', source: `process:${p.id}` } as AppScreenPart]),
        { id: 'next', kind: 'button', variant: 'primary', text: 'Продолжить', footer: true, to: more },
      ],
      sources: [textSource('item'), textSource('before'), processSource],
    })
    screen({
      id: more, stage: `process:${p.id}`, label: text('more'),
      gaps: (['more', 'finish'] as RepeatTextKey[]).filter(k => !has(k)).map(textGap),
      parts: [
        { id: 'done-item', kind: 'row', title: `${text('item')} 1`, meta: 'снято', done: true, source: `texts:${p.id}:item` },
        { id: 'more', kind: 'title', size: 'lg', text: text('more'), source: `texts:${p.id}:more` },
        { id: 'add', kind: 'button', variant: 'outline', text: text('add'), footer: true, to: item, source: `texts:${p.id}:add` },
        { id: 'finish', kind: 'button', variant: 'primary', text: text('finish'), footer: true, to: after, source: `texts:${p.id}:finish` },
      ],
      sources: [textSource('more'), textSource('add'), textSource('finish'), textSource('item')],
    })
    if (!firstShot && refuseRepeat) firstShot = list
    return [list, item, more]
  }

  /* ---------- Подтверждение ---------- */
  const hint = g.confirm.hint.trim()
  const check = g.confirm.checkbox.trim()
  screen({
    id: 'confirm', stage: 'confirm', label: 'Подтверждение',
    gaps: [...(hint ? [] : ['нет подсказки клиенту']), ...(check ? [] : ['нет текста галочки'])],
    parts: [
      { id: 'confirm', kind: 'title', size: 'lg', text: 'Проверьте и отправьте' },
      ...(hint ? [{ id: 'hint', kind: 'text', text: hint, tight: true, source: 'setting:general.confirm.hint' } as AppScreenPart] : []),
      ...(b.forbidExtraFiles ? [] : [{ id: 'files', kind: 'row', title: 'Дополнительные файлы', meta: 'Приложить сверх шагов', icon: 'add', source: 'setting:general.behavior.forbidExtraFiles' } as AppScreenPart]),
      { id: 'check', kind: 'check', text: check || CONFIRM_CHECKBOX_DEFAULT, source: 'setting:general.confirm.checkbox' },
      { id: 'send', kind: 'button', variant: 'primary', text: 'Отправить', footer: true, to: 'done' },
    ],
    sources: [
      setting('general.confirm.hint', 'Подсказка клиенту', hint || notSet, !hint),
      setting('general.confirm.checkbox', 'Текст галочки', check || `${notSet} — в приложении ${quote(CONFIRM_CHECKBOX_DEFAULT)}`, !check),
      setting('general.behavior.forbidExtraFiles', 'Блок дополнительных файлов', b.forbidExtraFiles ? 'запрещён — блока нет' : 'разрешён — строка на экране'),
    ],
  })
  stage('confirm', 'confirm', 'Подтверждение', 'Перед отправкой', ['confirm'])
  main.push('confirm')

  /* ---------- Готово ---------- */
  const phone = mob.phone.trim()
  const phoneLabel = mob.phoneName.trim() || 'Позвонить в поддержку'
  const doneIds = ['done', ...(phone ? ['call'] : [])]
  const phoneSource = setting('mobile.phone', 'Телефон для звонка', phone || 'не задан — кнопки звонка нет')
  screen({
    id: 'done', stage: 'done', label: 'Осмотр отправлен',
    parts: [
      { id: 'done', kind: 'title', size: 'lg', text: 'Осмотр отправлен' },
      { id: 'done-text', kind: 'text', text: 'Результат проверки придёт уведомлением', tight: true },
      ...(phone ? [{ id: 'call', kind: 'button', variant: 'outline', text: phoneLabel, footer: true, to: 'call', source: 'setting:mobile.phone' } as AppScreenPart] : []),
    ],
    sources: [phoneSource, ...(phone ? [setting('mobile.phoneName', 'Название телефона', mob.phoneName || `${notSet} — «Позвонить в поддержку»`)] : [])],
  })
  if (phone) {
    const ask = mob.callConfirm.trim() || 'Позвонить в службу поддержки?'
    screen({
      id: 'call', stage: 'done', label: 'Звонок в поддержку',
      parts: [
        { id: 'call-title', kind: 'title', size: 'lg', text: mob.phoneName.trim() || 'Служба поддержки', source: 'setting:mobile.phoneName' },
        { id: 'call-number', kind: 'text', text: phone, tight: true, source: 'setting:mobile.phone' },
        { id: 'call-ask', kind: 'note', text: ask, source: 'setting:mobile.callConfirm' },
        { id: 'dial', kind: 'button', variant: 'primary', text: 'Позвонить', footer: true, source: 'setting:mobile.phone' },
        { id: 'cancel', kind: 'button', variant: 'outline', text: 'Отмена', footer: true, to: 'done' },
      ],
      sources: [
        phoneSource,
        setting('mobile.phoneName', 'Название телефона', mob.phoneName || notSet),
        setting('mobile.callConfirm', 'Запрос подтверждения звонка', mob.callConfirm || `${notSet} — «Позвонить в службу поддержки?»`),
      ],
    })
  }
  stage('done', 'done', 'Готово', 'Отправка', doneIds)
  main.push('done')

  /* ---------- Ветка «Осмотр невозможен» ---------- */
  if (refuse) {
    const visibility = { all: 'все роли', expert: 'эксперт и выше', admin: 'только администратор' }[b.refuseCommentVisibility]
    screen({
      id: 'refuse', stage: 'refuse', label: 'Причина отказа',
      parts: [
        { id: 'refuse-title', kind: 'title', size: 'lg', text: 'Осмотр невозможен', source: 'setting:general.behavior.refuse' },
        { id: 'refuse-text', kind: 'text', text: 'Укажите причину — осмотр уйдёт с этой отметкой', tight: true, source: 'setting:general.behavior.refuse' },
        { id: 'reason', kind: 'field', label: 'Причина', type: 'text', required: true, placeholder: 'Почему осмотр невозможен', source: 'setting:general.behavior.refuse' },
        { id: 'visibility', kind: 'text', text: `Комментарий увидят: ${visibility}`, source: 'setting:general.behavior.refuseCommentVisibility' },
        { id: 'send', kind: 'button', variant: 'primary', text: 'Отправить', footer: true, to: 'done' },
        { id: 'back', kind: 'button', variant: 'outline', text: 'Вернуться к осмотру', footer: true, to: '@back' },
      ],
      sources: [
        refuseSource,
        setting('general.behavior.refuseCommentVisibility', 'Видимость комментария к отказу', visibility),
      ],
    })
    stage('refuse', 'refuse', 'Осмотр невозможен', 'Ветка', ['refuse'])
  }

  /* Переходы «дальше»: следующий экран основного пути; `@after` — после последнего экрана этапа (процесса). */
  const byId = Object.fromEntries(screens.map(s => [s.id, s]))
  const stageOf = (id: string) => stages.find(st => st.screens.includes(id))
  for (const s of screens) {
    const k = main.indexOf(s.id)
    for (const part of s.parts) {
      if (!('to' in part) || !part.to) continue
      if (part.to === '@next') part.to = main[k + 1] ?? main[main.length - 1]!
      else if (part.to === '@after') {
        const st = stageOf(s.id)
        const last = st ? main.indexOf(st.screens[st.screens.length - 1]!) : k
        part.to = main[last + 1] ?? main[main.length - 1]!
      }
    }
  }
  for (const st of stages) st.gaps = st.screens.filter(id => byId[id]!.gaps.length).length
  const order = stages.flatMap(st => st.screens)
  return { stages, screens: order.map(id => byId[id]!), byId, order, firstShot: firstShot || order[0]! }
}

/* ------------------------------ превью у «?» — 4.2 ------------------------------ */

/** Настройки с превью в приложении — решение 7 оркестратора. Поле формы — «Где увидит исполнитель». */
export type HelpKey = 'refuse' | 'confirmHint' | 'confirmCheckbox' | 'mobileMode' | 'phone' | 'startAfterCreate' | 'forbidExtraFiles'

export const HELP_TOPICS: Record<HelpKey, { title: string, description: string }> = {
  refuse: {
    title: 'Отказ от осмотра',
    description: 'Исполнитель сможет завершить осмотр с отметкой «Осмотр невозможен», если выполнение осмотра в данный момент недоступно (например, объект повреждён или заблокирован).',
  },
  confirmHint: { title: 'Подсказка клиенту', description: 'Текст на экране подтверждения — исполнитель читает его перед отправкой осмотра.' },
  confirmCheckbox: { title: 'Текст галочки', description: 'Подпись галочки на экране подтверждения: без отметки осмотр не отправить.' },
  mobileMode: {
    title: 'Режим выполнения',
    description: '«Обычный» — экраны шагов по очереди с полосками прогресса. «Чек-лист» — список шагов процесса с отметкой о выполнении каждого.',
  },
  phone: {
    title: 'Телефон для звонка',
    description: 'Кнопка звонка в поддержку на экране «Осмотр отправлен»: название телефона — подпись кнопки, запрос подтверждения — текст перед набором.',
  },
  startAfterCreate: {
    title: 'Промежуточный экран',
    description: 'Включено «Запустить осмотр сразу после создания» — после «Начать» исполнитель сразу переходит к выполнению. Выключено — сначала экран «Осмотр создан».',
  },
  forbidExtraFiles: {
    title: 'Блок дополнительных файлов',
    description: 'Строка «Дополнительные файлы» на экране подтверждения: исполнитель прикладывает файлы сверх шагов. Запрет убирает её.',
  },
}

/** Превью у «?»: экран демо-осмотра (null — в приложении места нет), обведённые элементы, название, пояснение, значение. */
export interface HelpPreviewView {
  screen: DemoScreen | null
  mark: string[]
  title: string
  description: string
  value: string
}

/** Превью у «?» настройки — тот же демо-осмотр, что в оверлее: экран и обведённый элемент. */
export function helpPreview(demo: Demo, config: SchemeConfig, key: HelpKey): HelpPreviewView {
  const g = config.settings.general
  const mob = config.settings.mobile
  const topic = HELP_TOPICS[key]
  const view = (screen: string, mark: string, value: string): HelpPreviewView => ({ screen: demo.byId[screen] ?? null, mark: [mark], ...topic, value })
  switch (key) {
    case 'refuse':
      return view(demo.firstShot, 'setting:general.behavior.refuse', g.behavior.refuse ? 'Сейчас: разрешён — кнопка на экранах съёмки' : 'Сейчас: выключен — кнопки «Осмотр невозможен» нет')
    case 'confirmHint':
      return view('confirm', 'setting:general.confirm.hint', g.confirm.hint.trim() ? `Сейчас: ${quote(g.confirm.hint.trim())}` : 'Сейчас: не задана — экран без подсказки')
    case 'confirmCheckbox':
      return view('confirm', 'setting:general.confirm.checkbox', g.confirm.checkbox.trim() ? `Сейчас: ${quote(g.confirm.checkbox.trim())}` : `Сейчас: не задан — в приложении ${quote(CONFIRM_CHECKBOX_DEFAULT)}`)
    case 'mobileMode': {
      const first = demo.stages.find(st => st.kind === 'process')?.screens[0] ?? demo.firstShot
      return view(first, 'setting:mobile.mode', mob.mode === 'checklist' ? 'Сейчас: Чек-лист' : 'Сейчас: Обычный')
    }
    case 'phone':
      return view('done', 'setting:mobile.phone', mob.phone.trim() ? `Сейчас: ${mob.phoneName.trim() || 'Позвонить в поддержку'} · ${mob.phone.trim()}` : 'Сейчас: не задан — кнопки звонка нет')
    case 'startAfterCreate':
      return mob.startAfterCreate
        ? view('start', 'setting:mobile.startAfterCreate', 'Сейчас: включено — промежуточного экрана нет')
        : view('intro', 'setting:mobile.startAfterCreate', 'Сейчас: выключено — после «Начать» экран «Осмотр создан»')
    case 'forbidExtraFiles':
      return view('confirm', 'setting:general.behavior.forbidExtraFiles', g.behavior.forbidExtraFiles ? 'Сейчас: запрещён — блока нет на экране' : 'Сейчас: разрешён — строка на экране подтверждения')
  }
}

/** «Где увидит исполнитель» у поля формы: экран группы анкеты с обведённым полем; поле только web или группа без показа — места нет. */
export function fieldPreview(demo: Demo, config: SchemeConfig, fieldId: string): HelpPreviewView | null {
  const grp = config.form.groups.find(x => x.fields.some(f => f.id === fieldId))
  const f = grp?.fields.find(x => x.id === fieldId)
  if (!grp || !f) return null
  const base = { title: f.title, description: 'Поле анкеты в мобильном приложении: подпись, обязательность и заполнитель — как в схеме.' }
  if (f.webOnly) return { ...base, screen: null, mark: [], value: 'Только web — в приложении поля нет' }
  if (grp.mobile === 'never') return { ...base, screen: null, mark: [], value: `Группа ${quote(grp.title)} не показывается в мобильном` }
  const screen = demo.byId[`form:${grp.id}`] ?? null
  const n = screen ? demo.stages.find(st => st.kind === 'form')!.screens.indexOf(screen.id) + 1 : 0
  return { ...base, screen, mark: [`field:${f.id}`], value: `Анкета, экран ${n} — ${quote(grp.title)}${f.required ? ' · обязательное' : ''}` }
}
