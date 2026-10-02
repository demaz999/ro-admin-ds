<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RfDef } from '~/stands/free-shoot/repeat-form-demo'
import { RF_EQ, RF_GROUPS, RF_VALUES, REPEAT_FORM_WINDOW_EXAMPLE, rfItems } from '~/stands/free-shoot/repeat-form-demo'
import type { AssignBound } from '@/components/ui/assign'
import type { FrameSuggestion } from '@/components/ui/frame-viewer'
import type { FrameTileState } from '@/components/ui/frame-tile'
import type { StepThumbItem, StepVerdict } from '@/components/ui/step-row'
import type { RepeatFormField } from '@/components/ui/repeat'
import type { CalloutTone } from '@/components/ui/callout'
import { createModel, emptyDataset, MODE_T, type WandMode } from '~/stands/free-shoot/model'
import proto from '~/stands/free-shoot/prototype-data.json'

/**
 * Стенд-матрицы «Распределение свободной съёмки» — такт 30, часть 2; с такта 31 живёт
 * на `/free-shoot/states`, экран в сборе — `/free-shoot`. Три составных
 * компонента экрана VA-9265: `FrameTile`, `StepRow` + `StepThumb`, `Progress` +
 * `ProgressStat`. Мастеров в Figma нет — источник прототип v17 и спека,
 * редакция 1 (`docs/sources/va-9265/`), разбор — `docs/free-shoot.md`.
 *
 * Стенд компонентов, не экран: каркаса `admin.vue` нет, тема `rososmotr`.
 * Фронты переносят компоненты с витрины кита в свой сторибук — поэтому под
 * каждым разделом пример вызова текстом.
 *
 * ## Оснастка приёмки — не продукт
 *
 * Колонки «наведение» матриц нарисованы пропом `demoHover` — оснастка: headless-браузер
 * не наводит курсор. Фрагмент ленты и панели «в сборе» с такта 31 заменён экраном
 * `/free-shoot`; туда же переехала оснастка `?state=`.
 */
definePageMeta({ layout: false })
useHead({ title: 'Свободная съёмка — матрицы' })


/**
 * Структура кадров — номер, время съёмки, тип, длительность видео — из `window.VA_FRAMES`
 * прототипа. Изображения — **демо-кадры стенда**: 24 несвязные фотографии с Unsplash
 * (Unsplash License), 800×600, `public/free-shoot/`, авторы — `CREDITS.md` там же. Боевые
 * кадры осмотра в репозиторий не кладутся (решение владельца 2026-09-23). В прод и витрину
 * не переносятся. Кадру прототипа сопоставлен снимок по порядку, повторы допустимы.
 */
const img = (i: number) => {
  const k = Object.keys(TIME).map(Number).indexOf(i)
  return `/free-shoot/demo-${String((Math.max(k, 0) % 24) + 1).padStart(2, '0')}.jpg`
}
const TIME: Record<number, string> = {
  1: '09:43', 3: '09:47', 6: '09:51', 9: '09:52', 12: '09:55', 17: '09:57', 22: '10:00', 26: '10:01',
  31: '10:04', 36: '10:07', 43: '10:10', 45: '10:11', 47: '10:11', 52: '10:18', 58: '10:21', 60: '10:21',
  64: '10:23', 70: '10:23', 77: '10:28', 85: '10:31', 92: '10:35', 101: '10:37', 110: '10:40', 120: '10:42',
  133: '10:46', 150: '10:49', 160: '10:52', 173: '10:58',
}
/** Видео прототипа (`VIDEOS`) — у стенда те же кадры и длительности. */
const DURATION: Record<number, string> = { 22: '0:36', 60: '0:29', 85: '0:42', 133: '0:38', 160: '0:33' }

/* ================================ FrameTile ================================ */

const REASON = {
  locked: 'Кадр в проверенном шаге',
  rejected: 'Кадр отклонён проверяющим',
} as const

interface TileRow { state: FrameTileState; label: string; i: number; step: string; spec: string }
const TILE_ROWS: TileRow[] = [
  { state: 'free', label: 'свободный', i: 17, step: '', spec: '§4' },
  { state: 'assigned', label: 'распределён', i: 12, step: 'Инвентарный или учётный номер', spec: '§4' },
  { state: 'suggested', label: 'предложен', i: 64, step: 'Повреждения и дефекты', spec: '§4, §13.1' },
  { state: 'locked', label: 'привязан ранее', i: 1, step: 'Шильдик, заводская табличка', spec: '§4, §6' },
  { state: 'rejected', label: 'отклонён', i: 3, step: 'Общий вид оборудования', spec: '§4, §4.2' },
]
const tileProps = (row: TileRow) => ({
  src: img(row.i),
  time: TIME[row.i]!,
  state: row.state,
  stepName: row.step,
  locateHint: row.step ? `Пропиточная линия POLYPRISE · ${row.step}` : '',
  lockReason: row.state === 'locked' || row.state === 'rejected' ? REASON[row.state] : '',
})

const FRAME_TILE_EXAMPLE = `<div :class="frameTileGridVariants({ size: 'md' })">
  <FrameTile
    v-for="frame in frames" :key="frame.id"
    :src="frame.preview" :time="frame.time"
    :kind="frame.type" :duration="frame.duration"
    :state="frame.state"               // free | assigned | suggested | locked | rejected
    :step-name="frame.stepName"
    :locate-hint="\`\${frame.objectName} · \${frame.stepName}\`"
    :lock-reason="frame.lockReason"    // тексты frame.* спеки §18
    :selected="selection.has(frame.id)"
    :selection-mode="selection.size > 0"
    :dimmed="linking && !linked.has(frame.id)"
    :linked="linked.has(frame.id)"
    @toggle-select="onSelect(frame, $event)"   // Shift и Ctrl — из события
    @open="openViewer(frame)"
    @locate="showInStructure(frame)"
    @unassign="unassign([frame.id])"
  />
</div>`

/* ================================= StepRow ================================= */

const THUMB = (i: number, state: StepThumbItem['state'] = 'free'): StepThumbItem => ({ id: i, src: img(i), state })

interface FillRow {
  key: string
  label: string
  spec: string
  base: { name: string; required?: boolean; kind?: 'photo' | 'video'; min: number; max?: number | null; count: number; instruction: string }
  thumbs: number[]
}
const FILL_ROWS: FillRow[] = [
  { key: 'empty-required', label: 'пусто, обязательный', spec: '§5', base: { name: 'Шильдик, заводская табличка', required: true, min: 1, count: 0, instruction: 'Марка, модель, заводской номер, год' }, thumbs: [] },
  { key: 'empty', label: 'пусто, необязательный', spec: '§5', base: { name: 'Узлы и агрегаты', min: 0, count: 0, instruction: 'Приводы, валы, редукторы, насосы' }, thumbs: [] },
  { key: 'under', label: 'недобор', spec: '§5', base: { name: 'Общий вид оборудования', required: true, min: 3, count: 1, instruction: 'Не менее 3 кадров с разных сторон' }, thumbs: [26] },
  { key: 'norm', label: 'норма', spec: '§5', base: { name: 'Органы управления', min: 1, max: 4, count: 2, instruction: 'Пульты, шкафы, дисплеи' }, thumbs: [31, 36] },
  { key: 'full', label: 'заполнен', spec: '§5', base: { name: 'Контрольное видео', required: true, kind: 'video', min: 1, max: 1, count: 1, instruction: 'От шильдика, затем обход вокруг' }, thumbs: [22] },
  { key: 'over', label: 'переполнен', spec: '§5, решение 5', base: { name: 'Фото с представителем', min: 0, max: 1, count: 2, instruction: 'Подтверждение присутствия' }, thumbs: [45, 47] },
]
const AVAIL = [
  { key: 'open', label: 'открыт' },
  { key: 'limit', label: 'заполнен по лимиту' },
  { key: 'frozen', label: 'заморожен' },
  { key: 'redo', label: 'повторить' },
] as const

const OK: StepVerdict = { kind: 'ok', at: '20 июня' }
const REDO: StepVerdict = { kind: 'redo', at: '20 июня', note: 'Станок снят в тени, деталей не видно — переснять' }

/** Клетка таблицы пересечения: пропы строки либо причина, почему сочетания нет. */
function cell(row: FillRow, avail: typeof AVAIL[number]['key']) {
  const full = row.key === 'full'
  const over = row.key === 'over'
  if (avail === 'open' && full) return { none: 'это и есть «заполнен по лимиту»: одно условие N = max' }
  if (avail === 'limit' && !full && !over) return { none: 'невозможно: N < max' }
  if (avail === 'limit' && over) return { none: 'как «открыт»: переполнение побеждает (решение 5)' }
  const verdict = avail === 'frozen' ? OK : avail === 'redo' ? REDO : null
  const thumbState = avail === 'frozen' ? 'locked' : 'free'
  const thumbs = row.thumbs.map(i => THUMB(i, thumbState))
  if (avail === 'redo') thumbs.unshift(THUMB(101, 'rejected'), THUMB(92, 'rejected'))
  return { props: { ...row.base, verdict, thumbs } }
}

const flashNonce = ref<number | null>(null)
const flash = () => { flashNonce.value = Date.now() }

const MANY = [1, 3, 6, 9, 12, 17, 26, 31, 36, 43, 45, 47].map(i => THUMB(i))

const STEP_ROW_EXAMPLE = `<StepRow
  :name="step.name" :required="step.required"
  :kind="step.kind"                   // photo | video
  :min="step.min" :max="step.max"
  :count="framesIn(step).filter(f => !f.rejected).length"   // отклонённые не считаются, §4.2
  :was-count="protectedIn(step).length"
  :instruction="step.hint"
  :verdict="review[step.id]"          // { kind: 'ok' | 'redo', at, note }
  :thumbs="framesIn(step).map(f => ({ id: f.id, src: f.preview, state: thumbState(f) }))"
  :located-thumb="locatedFrameId"
  :highlighted="hoveredFrame?.stepId === step.id"
  :drop-target="dragOverStep === step.id"
  :flash="flashKey[step.id]"          // новое число — новая вспышка 1.5 с
  @thumb-open="openViewer" @thumb-remove="id => unassign([id])"
  @more="openViewer(framesIn(step)[8].id)"
/>`

/* ============================ Progress и ProgressStat ============================ */

const PROGRESS_EXAMPLE = `<ProgressStat
  label="Кадры разложены"
  :value="\`\${placed} из \${total}\`"
  :progress="{ value: placed, max: total, locked: placedBefore }"
  :sub="placedBefore ? \`\${placedBefore} привязано до вас\` : ''"   // stat.frames.sub, §18
/>
<ProgressStat label="Объекты" value="1 здание · 2 единицы" sub="2 объекта проверено" />

<!-- окно автораспределения, §12.5 — голая полоса -->
<Progress :value="processed" :max="total" label="Автораспределение" />`


/* ============================ карточка повтора, такт 32 ============================ */

const FORM_EQ: RepeatFormField[] = [
  { key: 'mark', label: 'Наименование, марка, модель', value: 'Пропиточная линия POLYPRISE', required: true, group: 'Характеристики оборудования' },
  { key: 'sn', label: 'Заводской / серийный номер', group: 'Характеристики оборудования' },
  { key: 'inv', label: 'Инвентарный номер', value: '10798', group: 'Характеристики оборудования' },
  { key: 'bld', label: 'Здание / цех', value: 'ЦЕХ-6', group: 'Характеристики оборудования' },
  { key: 'cond', label: 'Состояние', value: 'Рабочее', required: true, group: 'Состояние и эксплуатация' },
  { key: 'mount', label: 'Монтаж', value: 'Установлено', group: 'Состояние и эксплуатация' },
  { key: 'use', label: 'Эксплуатация', value: 'Эксплуатируется', group: 'Состояние и эксплуатация' },
  { key: 'def', label: 'Дефекты', value: 'Не выявлены', group: 'Состояние и эксплуатация' },
  { key: 'comm', label: 'Комментарий', group: 'Дополнительно' },
]
const FORM_MISSING: RepeatFormField[] = FORM_EQ.map(f => (f.key === 'mark' ? { ...f, value: '' } : f.key === 'inv' ? { ...f, value: '10948' } : f))
const FORM_AUTO: RepeatFormField[] = FORM_EQ.map((f) => {
  if (f.key === 'mark') return { ...f, value: 'Линия термообработки', source: 'recognized' as const }
  if (f.key === 'inv') return { ...f, value: '10902', source: 'recognized' as const }
  if (f.key === 'bld') return { ...f, value: '' }
  if (['cond', 'mount', 'use', 'def'].includes(f.key)) return { ...f, source: 'default' as const }
  return f
})

const REPEAT_EXAMPLE = `<StageSection
  :title="stage.title" :repeatable="stage.repeatable"
  :count="String(repeats.length)"
  :open="!closed.has(stage.id)" @toggle="toggleStage(stage.id)"
  add-label="Новый объект" @add="createRepeat(stage.id)"
>
  <RepeatCard
    v-for="r in repeats" :key="r.id"
    :name="r.name" :details="r.details" :frames="r.frames"
    :open="open.has(r.id)" :current="current === r.id"
    :suggested="r.draft"                 // §13.1
    :checked-steps="frozenSteps(r)"      // §6.2: «N проверено», без удаления
    :errors="badSteps(r)"
    :highlighted="hoveredFrame?.ownerId === r.id"   // §15.1
    :hidden-steps="onlyOpen ? frozenSteps(r) : 0"   // §9.2
    @header="clickRepeat(r.id)"          // §9.3: сделать текущим / свернуть
    @accept="acceptRepeat(r.id)" @reject="rejectRepeat(r.id)"
  >
    <template #form>
      <RepeatForm
        :fields="formFields(r)"          // { key, label, value, required, source, group }
        :expanded="formOpen.has(r.id)" :deletable="!frozenSteps(r) && !r.draft"
        @toggle="toggleForm(r.id)" @edit="openEditor(r.id)" @delete="removeRepeat(r.id)"
      />
    </template>
    <StepRow v-for="step in steps(r)" :key="step.id" v-bind="stepProps(r, step)" />
  </RepeatCard>
  <StageNote v-if="acceptedHidden">Принято и скрыто: {{ acceptedHidden }}</StageNote>
</StageSection>`

/* ============================ пункт назначения, такт 33 ============================ */

interface Opt {
  value: string
  type?: 'step' | 'create' | 'object'
  name: string
  kind?: 'photo' | 'video'
  min?: number
  max?: number | null
  count?: number
  frozen?: boolean
  reason?: string
  reasonOpen?: boolean
  bound?: AssignBound
  frames?: number | null
}
/** Шаги «Единицы оборудования» и «Общих данных» — схема прототипа v17. */
const EQ: Opt[] = [
  { value: 'e1', name: 'Шильдик, заводская табличка', min: 1, count: 1, frozen: true },
  { value: 'e2', name: 'Инвентарный или учётный номер', min: 1, count: 1, frozen: true },
  { value: 'e3', name: 'Общий вид оборудования', min: 3, count: 0 },
  { value: 'e4', name: 'Узлы и агрегаты', min: 0, count: 0 },
  { value: 'e5', name: 'Органы управления и показания', min: 0, count: 0 },
  { value: 'e8', name: 'Контрольное видео', kind: 'video', min: 1, max: 1, count: 0 },
]
const GEN: Opt[] = [
  { value: 'g1', name: 'Генплан или схема территории', min: 1, count: 1, frozen: true },
  { value: 'g2', name: 'Поэтажные планы и планы эвакуации', min: 0, count: 0 },
  { value: 'g4', name: 'Общий вид территории', min: 2, count: 3, frozen: true },
]
const FIN: Opt[] = [
  { value: 'f2', name: 'Документы и подтверждения', min: 0, count: 0 },
  { value: 'f3', name: 'Фото с представителем собственника', min: 0, max: 1, count: 1 },
]
const withKeys = (list: Opt[], prefix: string) => list.map(o => ({ ...o, value: `${prefix}|${o.value}` }))
const noKeys = (list: Opt[], prefix: string) => list.map(o => ({ ...o, value: `${prefix}|${o.value}` }))

/** Все виды пункта — подпись, спека, пропы. */
const OPTION_STATES: { label: string, spec: string, props: Opt, demoHover?: boolean }[] = [
  { label: 'доступен', spec: '§10.3', props: { value: 's1', name: 'Поэтажные планы и планы эвакуации', min: 0, count: 0 } },
  { label: 'наведение и фокус с клавиатуры', spec: '—', props: { value: 's3', name: 'Узлы и агрегаты', min: 0, count: 0, }, demoHover: true },
  { label: 'заполнен — не выбирается', spec: '§10.3', props: { value: 's4', name: 'Фото с представителем собственника', min: 0, max: 1, count: 1 } },
  { label: 'переполнен — не выбирается, без «· заполнен»', spec: '§10.3, решение 5', props: { value: 's5', name: 'Фото с представителем собственника', min: 0, max: 1, count: 2 } },
  { label: 'заморожен', spec: '§5.2', props: { value: 's6', name: 'Шильдик, заводская табличка', min: 1, count: 1, frozen: true, } },
  { label: 'кадр привязан сюда — «Открепить»', spec: '§11.4', props: { value: 's7', name: 'Узлы и агрегаты', min: 0, count: 1, bound: 'here' } },
  { label: 'привязано до вас — изменить нельзя', spec: '§6.1', props: { value: 's8', name: 'Шильдик, заводская табличка', min: 1, count: 1, bound: 'locked' } },
  { label: 'новый повтор — только в просмотре', spec: '§11.2', props: { value: 's9', type: 'create', name: 'Единица оборудования' } },
  { label: 'другой объект — сделать текущим', spec: '§10.3', props: { value: 's10', type: 'object', name: 'ЦЕХ-6', frames: 6 } },
  { label: 'видео-шаг', spec: '§10.5', props: { value: 's11', name: 'Контрольное видео', kind: 'video', min: 1, max: 1, count: 0 } },
  { label: 'не тот тип кадра — выключен, причина в подсказке', spec: 'такт 55', props: { value: 's12', name: 'Общий вид оборудования', min: 3, count: 1, reason: 'Шаг принимает только фото', reasonOpen: true } },
]

/** Матрица: наполненность и доступность шага × контекст пункта. */
const MATRIX_ROWS = [
  { key: 'open', label: 'доступен', base: { name: 'Общий вид оборудования', min: 3, count: 1 } },
  { key: 'full', label: 'заполнен', base: { name: 'Контрольное видео', kind: 'video' as const, min: 1, max: 1, count: 1 } },
  { key: 'over', label: 'переполнен', base: { name: 'Фото с представителем', min: 0, max: 1, count: 2 } },
  { key: 'frozen', label: 'заморожен', base: { name: 'Шильдик, заводская табличка', min: 1, count: 1, frozen: true } },
]
const MATRIX_COLS = [
  { key: 'plain', label: 'не текущий объект' },
  { key: 'here', label: 'просмотр: кадр здесь' },
  { key: 'locked', label: 'просмотр: кадр здесь до вас' },
] as const
function matrixCell(row: typeof MATRIX_ROWS[number], col: typeof MATRIX_COLS[number]['key']): { props?: Opt, none?: string } {
  if (row.key === 'frozen' && col === 'here') return { none: 'невозможно: кадр в проверенном шаге защищён — это «до вас»' }
  const props: Opt = { ...row.base, value: `${row.key}-${col}` }
  if (col === 'here') props.bound = 'here'
  if (col === 'locked') props.bound = 'locked'
  return { props }
}

const assignDemoOpen = ref(false)

const ASSIGN_EXAMPLE = `<!-- поповер «Назначить на шаг», §10.3 -->
<Popover v-model:open="open">
  <PopoverTrigger as-child><Button size="sm">Назначить на шаг</Button></PopoverTrigger>
  <PopoverContent as-child side="top" align="start" :align-offset="-40" :collision-padding="12" :width="360">
    <SelectContent :width="360" max-height="62vh">
      <AssignList>
        <SelectGroup :header="\`Текущий · \${current.name}\`">
          <AssignOption
            v-for="(step, i) in current.steps" :key="step.id" :value="step.id"
            :name="step.name" :kind="step.kind" :min="step.min" :max="step.max"
            :count="countIn(current, step)"      // без отклонённых, §4.2
            :frozen="isFrozen(current, step)"   // §5.2
            @select="assign(selection, current, step)"
          />
        </SelectGroup>
        <SelectGroup v-for="stage in plainStages" :key="stage.id" :header="stage.title">…</SelectGroup>
        <SelectGroup header="Другие объекты">
          <AssignOption v-for="o in others" :key="o.id" :value="o.id" type="object" :name="o.name" @select="setCurrent(o)" />
        </SelectGroup>
      </AssignList>
    </SelectContent>
  </PopoverContent>
</Popover>

<!-- список шагов полноэкранного просмотра, §11.1–11.2: группа сворачивается -->
<StageSection v-for="g in groups" :key="g.id" :title="g.title" :count="String(g.items.length)"
  :open="!closed.has(g.id)" @toggle="toggle(g.id)">
  <AssignList class="p-1">
    <AssignOption v-for="it in g.items" :key="it.value" v-bind="it"
      :bound="frame.stepId === it.stepId ? (frame.locked ? 'locked' : 'here') : null"
      @select="assignFrame(frame, it)" @unbind="unassign([frame.id])" />
  </AssignList>
</StageSection>`

/* ============================ полноэкранный просмотр, такт 34 ============================ */

interface BindCell { label: string, spec: string, props: Record<string, unknown>, flash?: boolean }
const S_STEP: FrameSuggestion = { kind: 'step', stepName: 'Общий вид территории', ownerName: 'Общие данные осмотра' }
const BIND_CELLS: BindCell[] = [
  { label: 'не распределён', spec: '§11.2', props: { state: 'free' } },
  { label: 'распределён', spec: '§11.2', props: { state: 'assigned', stepName: 'Узлы и агрегаты', ownerName: 'Пропиточная линия POLYPRISE' } },
  { label: 'защищён', spec: '§11.2', props: { state: 'locked', stepName: 'Шильдик, заводская табличка', ownerName: 'Пропиточная линия POLYPRISE', reason: 'Кадр в проверенном шаге' } },
  { label: 'отклонён', spec: '§11.2, §4.2', props: { state: 'locked', rejected: true, stepName: 'Общий вид оборудования', ownerName: 'Пропиточная линия POLYPRISE', reason: 'Кадр отклонён проверяющим' } },
  { label: 'подбор выполнен: шаг — «Принять Enter»', spec: '§11.2, §16', props: { state: 'free', suggestion: S_STEP } },
  { label: 'подбор: шаг закрыт — только «Не то»', spec: 'прототип lbSuggest', props: { state: 'free', suggestion: { ...S_STEP, blocked: 'frozen' } } },
  { label: 'подбор: шаг заполнен', spec: 'прототип lbSuggest', props: { state: 'free', suggestion: { ...S_STEP, stepName: 'Фото с представителем собственника', ownerName: 'Завершение осмотра', blocked: 'full' } } },
  { label: 'подбор: новый объект — «Новый объект»', spec: '§11.2', props: { state: 'free', suggestion: { kind: 'create', title: 'Линия термообработки', inv: '10902', stageTitle: 'Единица оборудования' } } },
  { label: 'вспышка «Распределено», кнопки выключены — повторяется', spec: '§11.3', props: { state: 'assigned', stepName: 'Узлы и агрегаты', ownerName: 'Пропиточная линия POLYPRISE' }, flash: true },
]
const bindTick = ref<number | null>(null)
onMounted(() => {
  /* Вспышка длится 820 мс — стенд повторяет её по кругу, чтобы снимок её застал. */
  bindTick.value = Date.now()
  setInterval(() => { bindTick.value = Date.now() }, 1200)
})
const META = [
  { label: 'Файл', value: 'IMG_3315.jpeg' },
  { label: 'Время', value: '10:25:54' },
  { label: 'Тип', value: 'Фото' },
  { label: 'Распознано', value: 'Ткацкий участок · Цех по производству изделий из стекловолокна' },
]
const lbIndex = ref(21)

/* ============================ окно-карточка, такт 35 ============================ */
const MC_HOTKEYS = [
  { keys: '[клик]', action: 'выбрать или снять выбор кадра' },
  { keys: '[Shift] + клик', action: 'выделить подряд идущие кадры' },
  { keys: 'протянуть мышью', action: 'выделить рамкой (с пустого места или с [Alt])' },
  { keys: '[←] [→]', action: 'листать в просмотре' },
  { keys: '[Del]', action: 'открепить' },
  { keys: '[Enter]', action: 'принять подобранный шаг в просмотре' },
  { keys: '[⌘]/[Ctrl]+[Z]', action: 'отменить' },
  { keys: '[Esc]', action: 'снять выделение' },
]
/** Примечание окна «Горячие клавиши» — `ModalCardText`, довесок 1 к такту 35. */
const MC_NOTE = 'Порядок работы: сначала оформите здание, потом единицы оборудования внутри него — поле «Здание / цех» подставится автоматически. Перетаскивание работает так же, как клавиши.'
const MC_PROGRESS = [
  { label: 'Кадров обработано', value: '59 / 132' },
  { label: 'Заметок прочитано', value: '7 / 9' },
  { label: 'Объектов создано', value: '23 / 42' },
]
/** Длинное тело — прокручивается только оно: строки «Истории изменений» условно, текстом. */
const MC_LONG = Array.from({ length: 30 }, (_, k) => `${String(10 + (k % 12)).padStart(2, '0')}.06.2026 · Инспектор ${k + 1} изменил статус осмотра: «Назначен» → «В работе»`)
const mcLive = ref<'' | 'center' | 'edge' | 'locked'>('')

/* ------------------------------ окно формы повтора, такт 36 ------------------------------ */
/** Живая форма стенда: зависимые поля показываются и скрываются по родителю (§14.4). */
const rfDraft = ref<Record<string, string>>({ ...RF_VALUES })
const rfVisible = (f: RfDef) => !f.dep || rfDraft.value[f.dep.k] === f.dep.v
const rfLive = ref<'' | 'window' | 'group'>('')
/** Зависимое поле в двух состояниях — «Причины простоя» при двух значениях «Эксплуатации». */
const RF_DEP = [
  { label: 'родитель «Эксплуатируется» — зависимое скрыто', use: 'Эксплуатируется' },
  { label: 'родитель «Не эксплуатируется» — зависимое показано', use: 'Не эксплуатируется' },
]
const RF_USE = ['Эксплуатируется', 'Не эксплуатируется', 'Консервация']

const MODAL_CARD_EXAMPLE = `<!-- центральное окно, 600; у края — placement="edge" (642, это Sheet) -->
<ModalCard v-model:open="open">
  <ModalCardContent>                        <!-- placement="center" size="md" по умолчанию -->
    <ModalCardHeader title="Горячие клавиши" subtitle="Разбор ленты с клавиатуры" />
    <ModalCardBody class="flex flex-col gap-6">   <!-- прокручивается только тело, полоса 4px -->
      <ShortcutList :items="[{ keys: '[Shift] + клик', action: 'выделить подряд идущие кадры' }, …]" />
      <ModalCardText>Порядок работы: сначала оформите здание, …</ModalCardText>   <!-- описательный текст тела -->
    </ModalCardBody>
    <ModalCardFooter>
      <Button @click="open = false">Понятно</Button>
    </ModalCardFooter>
  </ModalCardContent>
</ModalCard>

<!-- прогресс автораспределения, §12.5: 440, закрыть можно только «Прервать» -->
<ModalCard v-model:open="running">
  <ModalCardContent size="sm" :closable="false">
    <ModalCardHeader title="Автораспределение" :subtitle="\`режим: \${modeName}\`" />
    <ModalCardBody class="flex flex-col gap-3">
      <Progress :value="done" :max="total" label="Автораспределение" />
      <ProgressCounter label="Кадров обработано" :value="\`\${done} / \${total}\`" />
    </ModalCardBody>
    <ModalCardFooter>
      <template #note>Структура заблокирована до конца обработки</template>
      <Button variant="secondary" @click="abort()">Прервать</Button>   <!-- §12.6 — страница -->
    </ModalCardFooter>
  </ModalCardContent>
</ModalCard>`


/* ------------------------------ такт 39: Callout, карточка режима, окна автораспределения ------------------------------ */
/** Тексты — блоки окон прототипа (`.sum`, §12.12, §17.4); нейтральный тон у прототипа не встречается. */
const CALLOUT_TONES: { tone: CalloutTone, title: string, text: string }[] = [
  { tone: 'success', title: 'Предложено: 132 кадра в 42 объекта', text: 'Проверьте созданные объекты справа: примите или отклоните, поправьте названия и формы.' },
  { tone: 'warning', title: '24 кадра пропущено', text: 'Шаги проверены и закрыты или уже заполнены до лимита.' },
  { tone: 'destructive', title: 'Расхождение с общей формой', text: 'По документам 3 объекта, оформлено 2. Заполните «Имущество, которое не удалось осмотреть».' },
  { tone: 'neutral', title: 'Голосовые комментарии не распределяются', text: 'Остаются в свободной съёмке как есть.' },
]
const CALLOUT_LIST = ['Здание цеха · Общий вид', 'Пропиточная линия POLYPRISE · Общий вид', 'Линия термообработки · Шильдик']
/** Окна П2 — на модели экрана, как на `/free-shoot`: запуск от набора «Частично проверен», сводка — после полного. */
const P39 = proto as any
const wandModel = createModel({ data: P39.A, stages: P39.stages, general: P39.general, blocks: P39.blocks })
const WAND = wandModel.wandWindow.value
const WAND_EMPTY = createModel({ data: emptyDataset(P39.A), stages: P39.stages, general: P39.general, blocks: P39.blocks }).wandWindow.value
const summaryModel = createModel({ data: P39.A, stages: P39.stages, general: P39.general, blocks: P39.blocks })
summaryModel.applyWandNow('full')
const SUMMARY = summaryModel.state.summary!
const wandPick = ref<WandMode>('full')
const radioLive = ref('struct')

const CALLOUT_EXAMPLE = `<!-- блок окна: заголовок и текст в тоне; тона — success | warning | destructive | neutral -->
<Callout tone="warning" title="24 кадра пропущено">Шаги проверены и закрыты или уже заполнены до лимита.</Callout>

<!-- список — <ul> без классов в слоте, оформление даёт компонент -->
<Callout tone="destructive" title="Не закрыты обязательные шаги: 3">
  <ul><li v-for="s in open" :key="s">{{ s }}</li></ul>
</Callout>

<!-- полоса приёмки, §13.2: действия справа -->
<Callout tone="warning" :title="\`Проверка: осталось \${left}\`">
  Проверено {{ done }} из {{ total }}. Принятый объект сворачивается и уходит из списка
  <template #actions>
    <Checkbox v-model="onlyUnchecked">только непроверенные</Checkbox>
    <Button variant="secondary" size="sm" @click="rejectAll()">Отменить автораспределение</Button>
    <Button size="sm" @click="acceptAll()">Принять все объекты</Button>
  </template>
</Callout>`

const RADIO_CARD_EXAMPLE = `<!-- карточка выбора: variant="card", под заголовком — description и meta -->
<RadioGroup v-model="mode" class="gap-2">
  <RadioGroupItem v-for="w in modes" :key="w.value" variant="card" :value="w.value" :disabled="w.disabled" :checked="mode === w.value">
    {{ w.title }}
    <template #description>{{ w.description }}</template>
    <template #meta>{{ w.forecast }}</template>   <!-- у выключенной — причина: «в осмотре пока нет повторов» -->
  </RadioGroupItem>
</RadioGroup>`

/* ------------------------------ такт 40: ActionBar, SelectionMarquee, «Отменить» ------------------------------ */
/* ------------------------------ такт 42: AppBar, Toolbar, Resizable, оси ------------------------------ */
const saveDemo = ref<'saving' | 'saved' | 'error'>('saved')
const FRAME_EXAMPLE = `<!-- полоса приложения top_menu 33970:14832: слева бургер и логотип, справа статус и действия; внутри — только sidebar-типы -->
<AppBar>
  <template #start>
    <IconButton variant="sidebar" size="lg" label="Свернуть меню"><Icon name="menu" :size="24" /></IconButton>
    <AppBarBrand logo="/brand/rososmotr-logo.svg">Рососмотр</AppBarBrand>
  </template>
  <template #end>
    <AppBarStatus :state="saving ? 'saving' : 'saved'" />   <!-- тексты §17.2 выводит сам -->
    <Button variant="sidebar" show-icon>
      <template #icon><Icon name="keyboard" :size="20" /></template>
      Горячие клавиши
    </Button>
    <Button variant="sidebar">RU <Icon name="chevron-down" :size="8" /></Button>
    <IconButton variant="sidebar" size="lg" label="Выйти"><Icon name="logout" :size="24" /></IconButton>
  </template>
</AppBar>

<!-- экран во всё окно на общем каркасе: меню свёрнуто, свои пункты — в слот bar -->
<NuxtLayout name="admin" fill menu="compact">
  <template #bar> … </template>
  …
</NuxtLayout>

<!-- светлая полоса: строка с переносом, зазор 8; Tab проходит каждый контрол -->
<Toolbar>
  <Button variant="secondary">Выделить всё</Button>
  <ToolbarText truncate grow align="end">{{ currentHint }}</ToolbarText>
  <ToolbarGroup label="Размер"><Tabs v-model="size">…</Tabs></ToolbarGroup>
</Toolbar>

<!-- рабочая зона: панель справа в пикселях, пределы — токены --container-panel-min / -max -->
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel>лента</ResizablePanel>
  <ResizableHandle with-handle />
  <ResizablePanel :default-size="440" :min-size="320" :max-size="820" size-unit="px">панель</ResizablePanel>
</ResizablePanelGroup>`

/* ------------------------------ такт 43: FeedNote, ActionBar у выделенного текста, AssignOption type="stage" ------------------------------ */
const HEADING_EXAMPLE = `<!-- заголовок страницы и строка «заголовок + текст» на базовой линии -->
<div class="flex items-baseline gap-2">
  <Heading level="page">Свободная съёмка</Heading>
  <ToolbarText>{{ sessMeta }}</ToolbarText>
</div>

<!-- заголовок блока; тег меняет as -->
<Heading>О кадре</Heading>
<Heading as="h3">Реквизиты осмотра</Heading>`
const LONG_NOTE = 'Итог по осмотру. Обошёл ткацкий участок цеха шесть, крутильный участок и компрессорную. В ткацком все станки SMIT на месте, номера с 10940 по 10950, у восемьсот четырнадцатого заедает прижимной вал — снял крупно.'
const NOTES_EXAMPLE = `<!-- заметка ленты: во всю ширину сетки; развёрнутость держит страница, «Показать полностью» — от 110 знаков -->
<FeedNote
  :kind="f.kind === 'note' ? 'note' : 'voice'" :time="f.t" :duration="f.dur" :name="f.n" :text="f.text"
  :expanded="expanded.has(f.i)"
  @toggle="toggle(f.i)" @copy="copy(f)" @play="notify('Воспроизведение (демо)')"
  @select-text="({ text, rect }) => showFragment(text, rect)"
/>

<!-- полоса у выделенного текста: нижний край — y, центр — x -->
<ActionBar :open="!!fragment" count="Новый объект:" :sub="\`«\${fragment.text}»\`" :x="fragment.x" :y="fragment.y">
  <Button @click="create('eq')">Оборудование</Button>
  <Button variant="secondary" @click="create('bld')">Здание</Button>
</ActionBar>

<!-- этап нового повтора в поповере: название и число повторов -->
<AssignOption type="stage" :value="\`stage|\${s.id}\`" :name="s.title" :frames="count" @select="create(s.id)" />`

const ACTION_BAR_EXAMPLE = `<!-- панель выделения, §10.2: по центру ленты (x считает страница), закрытая уезжает вниз -->
<ActionBar :open="selected.size > 0" :count="plural(n, 'кадр выбран', 'кадра выбрано', 'кадров выбрано')" :sub="sub" :x="feedCenter">
  <Popover v-model:open="assignOpen">
    <PopoverTrigger as-child><Button>Назначить на шаг</Button></PopoverTrigger>
    <PopoverContent as-child side="top" align="start" :width="360"> … </PopoverContent>
  </Popover>
  <Button variant="secondary" @click="assignMisc()">В «Прочее»</Button>
  <Button variant="secondary" @click="unassignSelection()">Открепить</Button>
  <ActionBarSeparator />
  <Button variant="secondary" @click="clearSelection()">Снять</Button>
</ActionBar>

<!-- рамка выделения, §10.1: только вид — геометрию и выделение под ней считает страница -->
<SelectionMarquee v-if="rect" :rect="rect" />

<!-- метка переноса «N кадров», §9.5: Badge md как есть, вне экрана — из неё снимается картинка переноса -->
<div ref="ghost" class="pointer-events-none fixed -top-96 -left-96"><Badge>{{ label }}</Badge></div>

<!-- строка шага, С-08: клик мимо миниатюр — событие select -->
<StepRow v-bind="step" @select="selected.size && assignTo([...selected], owner, step.id)" />

<!-- уведомление с «Отменить», §10.6: 6 с с действием, 3 с без -->
<Toast :duration="6000" @action="undoLast()">1 кадр → «Узлы и агрегаты» · Пропиточная линия
  <template #action>Отменить</template>
</Toast>`
const marqueeDemo = { x: 24, y: 24, width: 280, height: 96 }

const VIEWER_EXAMPLE = `<Lightbox v-model:open="open" v-model:index="index" :total="frames.length">
  <template #actions>
    <FrameTitle :name="frame.fileName" :assigned="!!frame.stepId" />   <!-- имя файла и метка -->
  </template>
  <FrameStage :src="frame.src" :alt="frame.fileName" :assigned="!!frame.stepId">
    <FrameBindBar
      :state="frame.stepId ? (frame.locked ? 'locked' : 'assigned') : 'free'"
      :step-name="step?.name" :owner-name="owner?.name"
      :rejected="frame.rejected" :reason="lockReason(frame)"   // тексты frame.* §18 без хвоста
      :suggestion="suggestion"            // { kind: 'step', … } | { kind: 'create', … } | null
      :flash="flashKey"                   // новое число — вспышка 820 мс, кнопки выключены
      @suggest="suggestFor(frame)" @accept="assign(frame, suggestion)" @dismiss="suggestion = null"
      @create="openRepeatForm(suggestion, frame)" @locate="showInStructure(frame)" @unbind="unassign([frame.id])"
    />
  </FrameStage>
  <template #aside>
    <FrameMeta :rows="[{ label: 'Файл', value: frame.fileName }, { label: 'Время', value: frame.time }, …]" />
    <StageSection v-for="g in groups" :key="g.id" :title="g.title" :count="String(g.items.length)"
      :open="!closed.has(g.id)" @toggle="toggle(g.id)">
      <AssignList class="p-1">
        <AssignOption v-for="it in g.items" :key="it.value" v-bind="it" @select="assignFrame(frame, it)" @unbind="unassign([frame.id])" />
      </AssignList>
    </StageSection>
  </template>
</Lightbox>
<!-- переход через 820 мс, ←/→, Enter, Del, «Перенести кадр?» (№ 47) — логика страницы, §11.3–11.4, §16 -->`
</script>

<template>
  <main data-theme="rososmotr" class="space-y-14 bg-background px-6 py-10 font-sans text-foreground">
    <header class="space-y-2">
      <Heading level="page">
        Свободная съёмка — стенд компонентов
      </Heading>
      <p class="max-w-240 text-sm text-foreground-secondary">
        Такт 30, экран «Распределение свободной съёмки» (VA-9265). Мастеров в Figma нет: источник —
        прототип v17 и спека, редакция 1, разбор с замерами и провенансом — <code>docs/free-shoot.md</code>.
        Тема <code>rososmotr</code>. Кадры — несвязные фото с Unsplash, демо-данные стенда; авторы — <code>public/free-shoot/CREDITS.md</code>. Экран в сборе — <a class="text-primary underline" href="/free-shoot">/free-shoot</a>.
      </p>
    </header>

    <!-- ============================== FrameTile ============================== -->
    <section id="frame-tile" data-section="frame-tile" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          FrameTile — плитка кадра
        </h2>
        <p class="text-sm text-foreground-secondary">
          Состояния кадра — спека §4. Флажок и иконка открытия — на наведении, выделенный кадр держит флажок.
          Плашка перекрывает строку подписи: время и длительность видны только у свободного кадра.
        </p>
      </div>

      <div v-for="size in (['md', 'lg'] as const)" :key="size" class="space-y-3">
        <h3 class="text-sm font-medium">
          Размер {{ size === 'md' ? 'M — колонка от 176' : 'L — колонка от 272' }}
        </h3>
        <div
          class="grid items-start gap-4"
          :class="size === 'md'
            ? 'grid-cols-[--spacing(36)_repeat(3,--spacing(44))]'
            : 'grid-cols-[--spacing(36)_repeat(3,--spacing(68))]'"
        >
          <span />
          <span class="text-2xs text-muted-foreground">покой</span>
          <span class="text-2xs text-muted-foreground">наведение</span>
          <span class="text-2xs text-muted-foreground">выделен</span>
          <template v-for="row in TILE_ROWS" :key="`${size}-${row.state}`">
            <span class="pt-2 text-xs">
              {{ row.label }}<br><span class="text-2xs text-muted-foreground">{{ row.spec }}</span>
            </span>
            <FrameTile v-bind="tileProps(row)" />
            <FrameTile v-bind="tileProps(row)" demo-hover />
            <FrameTile v-bind="tileProps(row)" selected />
          </template>
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-medium">
          Видео, подсветка связи, режим выделения
        </h3>
        <div class="grid grid-cols-[repeat(6,--spacing(44))] items-start gap-4">
          <div class="space-y-1">
            <FrameTile :src="img(22)" :time="TIME[22]!" kind="video" :duration="DURATION[22]" />
            <p class="text-2xs text-muted-foreground">видео, свободный</p>
          </div>
          <div class="space-y-1">
            <FrameTile :src="img(60)" :time="TIME[60]!" kind="video" :duration="DURATION[60]" state="assigned" step-name="Контрольное видео" />
            <p class="text-2xs text-muted-foreground">видео, распределён — длительность под плашкой</p>
          </div>
          <div class="space-y-1">
            <FrameTile :src="img(85)" :time="TIME[85]!" kind="video" :duration="DURATION[85]" state="locked" step-name="Контрольное видео" :lock-reason="REASON.locked" />
            <p class="text-2xs text-muted-foreground">видео, привязан ранее</p>
          </div>
          <div class="space-y-1">
            <FrameTile :src="img(45)" :time="TIME[45]!" state="assigned" step-name="Фасад и подъездные пути" linked />
            <p class="text-2xs text-muted-foreground">связан — §15.2</p>
          </div>
          <div class="space-y-1">
            <FrameTile :src="img(47)" :time="TIME[47]!" dimmed />
            <p class="text-2xs text-muted-foreground">приглушён до 32% — §15.2</p>
          </div>
          <div class="space-y-1">
            <FrameTile :src="img(52)" :time="TIME[52]!" selection-mode />
            <p class="text-2xs text-muted-foreground">режим выделения — флажок без наведения</p>
          </div>
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ FRAME_TILE_EXAMPLE }}</pre>
    </section>

    <!-- ============================== StepRow: оси ============================== -->
    <section id="step-row-axes" data-section="step-row-axes" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          StepRow — пересечение осей
        </h2>
        <p class="text-sm text-foreground-secondary">
          Наполненность × доступность — спека §5. Наполненность компонент выводит из чисел сам; пустая клетка —
          сочетания нет, причина подписана. Строки идут уже 440 панели — чтобы уместить четыре колонки.
        </p>
      </div>
      <div class="grid grid-cols-[--spacing(30)_repeat(4,minmax(0,1fr))] items-start gap-x-4 gap-y-3">
        <span />
        <span v-for="a in AVAIL" :key="a.key" class="text-2xs text-muted-foreground">{{ a.label }}</span>
        <template v-for="row in FILL_ROWS" :key="row.key">
          <span class="pt-2 text-xs">
            {{ row.label }}<br><span class="text-2xs text-muted-foreground">{{ row.spec }}</span>
          </span>
          <template v-for="a in AVAIL" :key="`${row.key}-${a.key}`">
            <StepRow v-if="cell(row, a.key).props" v-bind="cell(row, a.key).props!" />
            <p v-else class="rounded-xs border border-dashed border-border-soft p-2 text-2xs text-muted-foreground">
              {{ cell(row, a.key).none }}
            </p>
          </template>
        </template>
      </div>
    </section>

    <!-- ========================== StepRow: взаимодействие ========================== -->
    <section id="step-row-interaction" data-section="step-row-interaction" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          StepRow — взаимодействие
        </h2>
        <p class="text-sm text-foreground-secondary">
          Перетаскивание, клавиатура и связь с лентой — логика страницы; строка получает их пропами.
        </p>
      </div>
      <div class="grid grid-cols-[repeat(3,--spacing(110))] items-start gap-x-6 gap-y-5">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            цель приёма — §9.5
          </p>
          <StepRow name="Узлы и агрегаты" :min="0" :count="0" instruction="Приводы, валы, редукторы" drop-target />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            цель приёма у заполненного не действует — §9.5
          </p>
          <StepRow name="Контрольное видео" required kind="video" :min="1" :max="1" :count="1" instruction="От шильдика, затем обход" :thumbs="[THUMB(22)]" drop-target />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            переносят не тот тип кадра — приглушён, приёма нет (muted, такт 55)
          </p>
          <StepRow name="Узлы и агрегаты" :min="0" :count="0" instruction="Приводы, валы, редукторы" muted drop-target />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            подсвечен связью с кадром ленты — §15.1
          </p>
          <StepRow name="Инвентарный или учётный номер" required :min="1" :count="1" instruction="Номер краской, бирка, наклейка" :thumbs="[THUMB(12)]" highlighted />
        </div>
        <div class="space-y-1">
          <p class="flex items-center gap-2 text-2xs text-muted-foreground">
            вспышка 1.5 с — §15.3
            <Button size="sm" variant="secondary" @click="flash">
              Повторить
            </Button>
          </p>
          <StepRow name="Общий вид оборудования" required :min="3" :count="1" instruction="Не менее 3 кадров с разных сторон" :thumbs="[THUMB(26)]" :located-thumb="26" :flash="flashNonce" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            наведение
          </p>
          <StepRow name="Органы управления и показания" :min="0" :count="1" instruction="Пульты, шкафы управления" :thumbs="[THUMB(31)]" demo-hover />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            без номера клавиши: объект не текущий — §16.3
          </p>
          <StepRow name="Органы управления и показания" :min="0" :count="1" instruction="Пульты, шкафы управления" :thumbs="[THUMB(31)]" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            «было до вас» — §18 step.was
          </p>
          <StepRow name="Органы управления и показания" :min="0" :count="2" :was-count="1" instruction="Пульты, шкафы управления" :thumbs="[THUMB(31), THUMB(1, 'locked')]" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            больше восьми миниатюр — хвост «+N», решение 8
          </p>
          <StepRow name="Общий вид территории" :min="2" :count="12" instruction="Не менее 2 кадров" :thumbs="MANY" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            снят в шаге: кадры с камерой — §4.1
          </p>
          <StepRow name="Общий вид внутри" required :min="2" :count="2" instruction="Планировка, освещение, проходы" :thumbs="[THUMB(52, 'from-step'), THUMB(70, 'from-step')]" />
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ STEP_ROW_EXAMPLE }}</pre>
    </section>

    <!-- ============================== StepThumb ============================== -->
    <section id="step-thumb" data-section="step-thumb" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          StepThumb — миниатюра в шаге
        </h2>
        <p class="text-sm text-foreground-secondary">
          Спека §9.6–9.7. Клик открывает кадр, крестик по центру на наведении открепляет. Отклонённый — допущение
          прототипа §20.5, вопрос к Core.
        </p>
      </div>
      <TooltipProvider>
        <div class="flex flex-wrap items-start gap-8">
          <div v-for="t in ([
            ['free', 'из свободной съёмки'], ['suggested', 'предложена'], ['locked', 'привязана ранее'],
            ['from-step', 'снята в шаге'], ['rejected', 'отклонена · §20.5'],
          ] as const)" :key="t[0]" class="space-y-1">
            <StepThumb :src="img(36)" :state="t[0]" />
            <p class="text-2xs text-muted-foreground">
              {{ t[1] }}
            </p>
          </div>
          <div class="space-y-1">
            <StepThumb :src="img(36)" demo-hover="open" />
            <p class="text-2xs text-muted-foreground">
              наведение — «глаз»
            </p>
          </div>
          <div class="space-y-1">
            <StepThumb :src="img(36)" demo-hover="remove" />
            <p class="text-2xs text-muted-foreground">
              наведение — крестик
            </p>
          </div>
          <div class="space-y-1">
            <StepThumb :src="img(36)" state="locked" demo-hover />
            <p class="text-2xs text-muted-foreground">
              закрытый — только «глаз»
            </p>
          </div>
          <div class="space-y-1">
            <StepThumb :src="img(36)" located />
            <p class="text-2xs text-muted-foreground">
              найдена переходом — §15.3
            </p>
          </div>
        </div>
      </TooltipProvider>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ `<!-- обычно строит сам StepRow из :thumbs; отдельно — так: -->
<StepThumb :src="frame.preview" state="locked" :located="frame.id === locatedId"
  @open="openViewer(frame)" @remove="unassign([frame.id])" />` }}</pre>
    </section>

    <!-- ============================ Progress и ProgressStat ============================ -->
    <section id="progress" data-section="progress" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          Progress и ProgressStat — счётчики подшапки
        </h2>
        <p class="text-sm text-foreground-secondary">
          Спека §7.1–7.2: чужая работа серым от начала полосы, подпись под полосой. Первый прогресс кита.
        </p>
      </div>
      <div class="grid grid-cols-[repeat(4,--spacing(48))] items-start gap-8">
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">
            пусто
          </p>
          <ProgressStat label="Кадры разложены" value="0 из 208" :progress="{ value: 0, max: 208 }" />
        </div>
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">
            с чужой долей
          </p>
          <ProgressStat label="Кадры разложены" value="14 из 196" :progress="{ value: 14, max: 196, locked: 6 }" sub="6 привязано до вас" />
        </div>
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">
            готово
          </p>
          <ProgressStat label="Кадры разложены" value="208 из 208" :progress="{ value: 208, max: 208 }" />
        </div>
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">
            без полосы
          </p>
          <ProgressStat label="Объекты" value="1 здание · 2 единицы" sub="2 объекта проверено" />
        </div>
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">
            обязательные шаги с закрытыми проверкой
          </p>
          <ProgressStat label="Обязательные шаги" value="10 из 14 закрыто" :progress="{ value: 10, max: 14, locked: 7 }" sub="7 закрыто проверкой" />
        </div>
        <div class="col-span-2 space-y-2">
          <p class="text-2xs text-muted-foreground">
            окно автораспределения, §12.5 — голая полоса
          </p>
          <Progress :value="57" :max="173" label="Автораспределение" />
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ PROGRESS_EXAMPLE }}</pre>
    </section>


    <!-- ============================ карточка повтора, такт 32 ============================ -->
    <section id="repeat" data-section="repeat" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          StageSection · RepeatCard · RepeatForm · StageNote — этап и карточка повтора
        </h2>
        <p class="text-sm text-foreground-secondary">
          Такт 32. Спека §6.2, §9.1–9.4, §13.1–13.4, §14.1–14.3. Порядок тела повтора фиксирован: действия приёмки →
          компактная форма → шаги → служебная строка.
        </p>
      </div>

      <div class="grid grid-cols-[repeat(3,--spacing(110))] items-start gap-x-6 gap-y-5">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">этап раскрыт, повторяемый, строка добавления</p>
          <StageSection title="Единица оборудования" repeatable count="3" add-label="Новая единица" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">этап свёрнут</p>
          <StageSection title="Здание / цех" repeatable count="1" :open="false" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">обычный этап, наведение</p>
          <StageSection title="Общие данные осмотра" count="4 шага" :open="false" demo-hover />
        </div>
      </div>

      <div data-subsection="repeat-headers" class="grid grid-cols-[repeat(3,--spacing(110))] items-start gap-x-6 gap-y-5">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">свёрнут</p>
          <RepeatCard name="Ткацкий станок SMIT" details="инв. 10948 · ЦЕХ-6 · Рабочее" :frames="4" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">наведение</p>
          <RepeatCard name="Ткацкий станок SMIT" details="инв. 10948 · ЦЕХ-6 · Рабочее" :frames="4" demo-hover />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">реквизиты не заполнены</p>
          <RepeatCard name="Объект без названия" :frames="0" :errors="3" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">текущий — §9.3</p>
          <RepeatCard name="Ткацкий станок SMIT" details="инв. 10948 · ЦЕХ-6 · Рабочее" :frames="4" current />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">предложено — §13.1</p>
          <RepeatCard name="Линия термообработки" details="инв. 10902 · Эксплуатируется" :frames="5" suggested :errors="2" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">«N проверено» и ошибки — §6.2</p>
          <RepeatCard name="Пропиточная линия POLYPRISE" details="инв. 10798 · ЦЕХ-6 · Эксплуатируется" :frames="5" :checked-steps="2" :errors="2" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">«N проверено», текущий</p>
          <RepeatCard name="Пропиточная линия POLYPRISE" details="инв. 10798 · ЦЕХ-6 · Эксплуатируется" :frames="5" :checked-steps="2" :errors="2" current />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">подсвечен связью — §15.1</p>
          <RepeatCard name="Ткацкий станок SMIT" details="инв. 10948 · ЦЕХ-6 · Рабочее" :frames="4" highlighted />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">предложено и текущий</p>
          <RepeatCard name="Линия термообработки" details="инв. 10902 · Эксплуатируется" :frames="5" suggested current :errors="2" />
        </div>
      </div>

      <div data-subsection="repeat-open" class="grid grid-cols-[repeat(3,--spacing(110))] items-start gap-x-6 gap-y-5">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">предложен и раскрыт: приёмка → форма с источниками → шаги — §9.4, §13</p>
          <RepeatCard name="Линия термообработки" details="инв. 10902 · Эксплуатируется" :frames="5" suggested current open :errors="2">
            <template #form>
              <RepeatForm :fields="FORM_AUTO" />
            </template>
            <StepRow name="Шильдик, заводская табличка" required :min="1" :count="0" instruction="Марка, модель, заводской номер, год" />
            <StepRow name="Инвентарный или учётный номер" required :min="1" :count="1" instruction="Номер краской, бирка, наклейка" :thumbs="[THUMB(12, 'suggested')]" />
          </RepeatCard>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">проверенный, «Только открытые»: служебная строка — §9.2</p>
          <RepeatCard name="Пропиточная линия POLYPRISE" details="инв. 10798 · ЦЕХ-6 · Эксплуатируется" :frames="5" :checked-steps="2" :errors="2" open :hidden-steps="2">
            <template #form>
              <RepeatForm :fields="FORM_EQ" />
            </template>
            <StepRow name="Общий вид оборудования" required :min="3" :count="0" instruction="Не менее 3 кадров с разных сторон" :verdict="REDO" :thumbs="[THUMB(101, 'rejected')]" />
          </RepeatCard>
        </div>
        <div class="space-y-4">
          <div class="space-y-1">
            <p class="text-2xs text-muted-foreground">компактная форма: обязательное не заполнено, удалить можно — §14.1, §6.2</p>
            <RepeatForm :fields="FORM_MISSING" deletable />
          </div>
          <div class="space-y-1">
            <p class="text-2xs text-muted-foreground">все поля по группам — §14.3</p>
            <RepeatForm :fields="FORM_EQ" expanded />
          </div>
          <div class="space-y-1">
            <p class="text-2xs text-muted-foreground">служебные строки — §9.2, §13.3</p>
            <div class="rounded-xs border border-border-soft">
              <StageNote>Принято и скрыто: 2 объекта</StageNote>
              <StageNote>Повторов пока нет — выделите кадры и нажмите «Новый объект из выделенного»</StageNote>
            </div>
          </div>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ REPEAT_EXAMPLE }}</pre>
    </section>

    <!-- ============================ пункт назначения, такт 33 ============================ -->
    <section id="assign" data-section="assign" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          AssignOption · AssignList — пункт назначения
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 33. Спека §10.3, §10.5, §11.1–11.2, §16.3. Один пункт на два места: поповер «Назначить на шаг» и список
          шагов полноэкранного просмотра. Пункт стоит на <code>SelectItem</code> (мастер <code>ListItem</code>), группа
          поповера — <code>SelectGroup</code>, группа просмотра — <code>StageSection</code>. Несовпадение типа (§10.5)
          вида не имеет: отказ приходит сообщением при попытке, как в спеке §19.
        </p>
      </div>

      <div data-subsection="assign-states" class="grid grid-cols-[repeat(3,--spacing(90))] items-start gap-x-6 gap-y-5">
        <div v-for="st in OPTION_STATES" :key="st.props.value" class="space-y-1">
          <p class="text-2xs text-muted-foreground">{{ st.label }} · {{ st.spec }}</p>
          <AssignList>
            <AssignOption v-bind="st.props" :demo-hover="st.demoHover" />
          </AssignList>
        </div>
      </div>

      <div data-subsection="assign-matrix" class="space-y-2">
        <h3 class="text-sm font-medium">Пересечение: состояние шага × контекст пункта</h3>
        <div class="grid grid-cols-[--spacing(30)_repeat(4,minmax(0,1fr))] items-start gap-x-4 gap-y-3">
          <span />
          <span v-for="c in MATRIX_COLS" :key="c.key" class="text-2xs text-muted-foreground">{{ c.label }}</span>
          <template v-for="row in MATRIX_ROWS" :key="row.key">
            <span class="pt-3 text-xs">{{ row.label }}</span>
            <template v-for="c in MATRIX_COLS" :key="`${row.key}-${c.key}`">
              <AssignList v-if="matrixCell(row, c.key).props">
                <AssignOption v-bind="matrixCell(row, c.key).props!" />
              </AssignList>
              <p v-else class="rounded-xs border border-dashed border-border-soft p-2 text-2xs text-muted-foreground">
                {{ matrixCell(row, c.key).none }}
              </p>
            </template>
          </template>
        </div>
      </div>

      <div data-subsection="assign-containers" class="grid grid-cols-[--spacing(90)_--spacing(85)_--spacing(85)] items-start gap-x-8">
        <div class="space-y-2">
          <p class="flex items-center gap-2 text-2xs text-muted-foreground">
            поповер «Назначить на шаг» — §10.3, живой: стрелки, Enter, Esc
            <Popover v-model:open="assignDemoOpen">
              <PopoverTrigger as-child>
                <Button size="sm">Назначить на шаг</Button>
              </PopoverTrigger>
              <PopoverContent as-child side="bottom" align="start" :collision-padding="12" :width="360">
                <SelectContent :width="360" max-height="62vh">
                  <AssignList>
                    <SelectGroup header="Текущий · Пропиточная линия POLYPRISE">
                      <AssignOption v-for="o in withKeys(EQ, 'd-eq')" :key="o.value" v-bind="o" @select="assignDemoOpen = false" />
                    </SelectGroup>
                    <SelectGroup header="Общие данные осмотра">
                      <AssignOption v-for="o in noKeys(GEN, 'd-gen')" :key="o.value" v-bind="o" @select="assignDemoOpen = false" />
                    </SelectGroup>
                    <SelectGroup header="Другие объекты">
                      <AssignOption value="d-obj" type="object" name="ЦЕХ-6" @select="assignDemoOpen = false" />
                    </SelectGroup>
                  </AssignList>
                </SelectContent>
              </PopoverContent>
            </Popover>
          </p>
          <SelectContent :width="360" :max-height="520">
            <AssignList>
              <SelectGroup header="Текущий · Пропиточная линия POLYPRISE">
                <AssignOption v-for="o in withKeys(EQ, 'eq')" :key="o.value" v-bind="o" />
              </SelectGroup>
              <SelectGroup header="Общие данные осмотра">
                <AssignOption v-for="o in noKeys(GEN, 'gen')" :key="o.value" v-bind="o" />
              </SelectGroup>
              <SelectGroup header="Завершение осмотра">
                <AssignOption v-for="o in noKeys(FIN, 'fin')" :key="o.value" v-bind="o" />
              </SelectGroup>
              <SelectGroup header="Другие объекты">
                <AssignOption value="obj-1" type="object" name="ЦЕХ-6" />
              </SelectGroup>
            </AssignList>
          </SelectContent>
        </div>
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">список просмотра — §11.2: кадр в шаге, группы сворачиваются</p>
          <div class="w-85 rounded-xs border border-border-soft">
            <StageSection title="Привязан к · Пропиточная линия POLYPRISE" :count="String(EQ.length)">
              <AssignList class="p-1">
                <AssignOption v-for="o in noKeys(EQ, 'v-eq')" :key="o.value" v-bind="o" :bound="o.value === 'v-eq|e4' ? 'here' : null" />
              </AssignList>
            </StageSection>
            <StageSection title="Общие данные осмотра" :count="String(GEN.length)" :open="false" />
            <StageSection title="Единица оборудования" repeatable count="1">
              <AssignList class="p-1">
                <AssignOption value="v-new" type="create" name="Единица оборудования" />
                <AssignOption value="v-obj" type="object" name="Линия термообработки" :frames="5" />
              </AssignList>
            </StageSection>
          </div>
        </div>
        <div class="space-y-2">
          <p class="text-2xs text-muted-foreground">список просмотра, текущий объект — номера клавиш; кадр до вас</p>
          <div class="w-85 rounded-xs border border-border-soft">
            <StageSection title="Текущий · Пропиточная линия POLYPRISE" :count="String(EQ.length)">
              <AssignList class="p-1">
                <AssignOption v-for="o in withKeys(EQ, 'c-eq')" :key="o.value" v-bind="o" :bound="o.value === 'c-eq|e1' ? 'locked' : null" />
              </AssignList>
            </StageSection>
          </div>
        </div>
      </div>

      <div data-subsection="pill-rule" class="space-y-2">
        <h3 class="text-sm font-medium">Правило пилюли: на подложке своего тона — на <code>--card</code></h3>
        <p class="max-w-240 text-2xs text-muted-foreground">
          Решение владельца 2026-09-23. Пилюля того же тона, что строка или заголовок, стоит на <code>--card</code>, текст —
          <code>*-strong</code>. Пилюля другого тона остаётся в своей заливке (красная «2» на жёлтом заголовке).
        </p>
        <div class="grid grid-cols-[repeat(3,--spacing(110))] items-start gap-x-6">
          <StepRow name="Фото с представителем" :min="0" :max="1" :count="2" instruction="Подтверждение присутствия" :thumbs="[THUMB(45), THUMB(47)]" />
          <StepRow name="Общий вид оборудования" required :min="3" :count="1" instruction="Не менее 3 кадров с разных сторон" :verdict="REDO" :thumbs="[THUMB(101, 'rejected'), THUMB(26)]" />
          <RepeatCard name="Линия термообработки" details="инв. 10902 · Эксплуатируется" :frames="5" suggested :errors="2" />
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ ASSIGN_EXAMPLE }}</pre>
    </section>

    <!-- ============================ полноэкранный просмотр, такт 34 ============================ -->
    <section id="viewer" data-section="viewer" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          FrameStage · FrameBindBar · FrameMeta · FrameStatus · FrameTitle — полноэкранный просмотр
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 34. Спека §11.1–11.3. Каркас — <code>Lightbox</code> кита со слотом боковой панели <code>aside</code>
          (решение владельца 1), панель 440 — токен <code>--container-side-panel</code> (решение 2). Роли плашки — такта 30:
          фон <code>*-surface</code>, текст <code>*-strong</code>.
        </p>
      </div>

      <div data-subsection="viewer-bind" class="grid grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-x-6 gap-y-5">
        <div v-for="c in BIND_CELLS" :key="c.label" class="space-y-1">
          <p class="text-2xs text-muted-foreground">{{ c.label }} · {{ c.spec }}</p>
          <FrameBindBar v-bind="c.props" :flash="c.flash ? bindTick : null" class="rounded-md" />
        </div>
      </div>

      <div data-subsection="viewer-parts" class="grid grid-cols-[--spacing(110)_--spacing(110)_1fr] items-start gap-x-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">кадр с плашкой, распределён — кольцо успеха</p>
          <FrameStage :src="img(12)" alt="IMG_3264.jpeg" assigned>
            <FrameBindBar state="assigned" step-name="Узлы и агрегаты" owner-name="Пропиточная линия POLYPRISE" />
          </FrameStage>
        </div>
        <div class="space-y-3">
          <div class="space-y-1">
            <p class="text-2xs text-muted-foreground">метаданные — §11.1</p>
            <div class="w-side-panel rounded-xs border border-border-soft">
              <FrameMeta :rows="META" />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-2xs text-muted-foreground">метка в верхней полосе</p>
            <FrameStatus assigned />
            <FrameStatus />
          </div>
          <div data-subsection="viewer-title" class="space-y-2">
            <p class="text-2xs text-muted-foreground">FrameTitle — имя файла и метка в слоте действий; длинное имя обрезается, метка не сжимается</p>
            <FrameTitle name="IMG_3264.jpeg" assigned />
            <FrameTitle name="IMG_3250.jpeg" />
            <FrameTitle name="VID_20260611_143015_Цех-6_линия_пропитки_общий_план.mp4" assigned class="w-60" />
          </div>
          <div class="space-y-1">
            <p class="text-2xs text-muted-foreground">пункт списка в тоне успеха — решение 4</p>
            <div class="w-side-panel">
              <AssignList class="p-1">
                <AssignOption value="vb-here" name="Узлы и агрегаты" :count="1" bound="here" />
                <AssignOption value="vb-locked" name="Шильдик, заводская табличка" :min="1" :count="1" bound="locked" />
                <AssignOption value="vb-long" name="Поэтажные планы и планы эвакуации" :count="1" bound="here" />
              </AssignList>
            </div>
          </div>
        </div>
      </div>

      <div data-subsection="viewer-frame" class="space-y-1">
        <p class="text-2xs text-muted-foreground">каркас: Lightbox со слотом aside, 1280×720 — стрелки гаснут на границах, имя файла по центру полосы</p>
        <div class="relative h-180 w-320 overflow-hidden rounded-md border border-border-soft">
          <Lightbox inline :open="true" :index="lbIndex" :total="196" @update:index="lbIndex = $event">
            <template #actions>
              <FrameTitle name="IMG_3264.jpeg" assigned />
            </template>
            <FrameStage :src="img(12)" alt="IMG_3264.jpeg" assigned>
              <FrameBindBar state="assigned" step-name="Узлы и агрегаты" owner-name="Пропиточная линия POLYPRISE" />
            </FrameStage>
            <template #aside>
              <FrameMeta :rows="META.slice(0, 3)" />
              <StageSection title="Привязан к · Пропиточная линия POLYPRISE" :count="String(EQ.length)">
                <AssignList class="p-1">
                  <AssignOption v-for="o in noKeys(EQ, 'lb-eq')" :key="o.value" v-bind="o" :bound="o.value === 'lb-eq|e4' ? 'here' : null" />
                </AssignList>
              </StageSection>
              <StageSection title="Общие данные осмотра" :count="String(GEN.length)" :open="false" />
            </template>
          </Lightbox>
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ VIEWER_EXAMPLE }}</pre>
    </section>

    <!-- ============================ окно-карточка, такт 35 ============================ -->
    <section id="modal-card" data-section="modal-card" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          ModalCard — окно-карточка кита 1 · окна прогресса и «Горячие клавиши»
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 35. Мастер карточки <code>817:34525</code> и шапки <code>864:2747</code>; размещения <code>edge</code> (642 — это
          <code>Sheet</code>) и <code>center</code> (600 и 440 — ширины прототипа). Скругление 48 только слева сверху в обоих,
          подложка <code>--overlay-modal</code> 40%, прокручивается только тело, кнопки — <code>Button</code> md 40.
          Описательный текст тела — <code>ModalCardText</code> 15/20 <code>--foreground-secondary</code> («Настройка таблицы»
          <code>19942:192435</code>, довесок 1).
          Рамки ниже — окно внутри родителя (<code>inline</code>); живые окна — кнопками справа.
        </p>
        <p class="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="secondary" data-live="center" @click="mcLive = 'center'">Открыть по центру</Button>
          <Button variant="secondary" data-live="edge" @click="mcLive = 'edge'">Открыть у края</Button>
          <Button variant="secondary" data-live="locked" @click="mcLive = 'locked'">Открыть прогресс — закрытие заблокировано</Button>
        </p>
      </div>

      <div data-subsection="modal-card-center" class="grid grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">center md 600 — «Горячие клавиши», §16</p>
          <div class="relative h-170 overflow-hidden rounded-md border border-border-soft bg-background">
            <ModalCard :open="true" :modal="false">
              <ModalCardContent inline>
                <ModalCardHeader title="Горячие клавиши" subtitle="Разбор ленты с клавиатуры" />
                <ModalCardBody class="flex flex-col gap-6">
                  <ShortcutList :items="MC_HOTKEYS" />
                  <ModalCardText>{{ MC_NOTE }}</ModalCardText>
                </ModalCardBody>
                <ModalCardFooter>
                  <Button>Понятно</Button>
                </ModalCardFooter>
              </ModalCardContent>
            </ModalCard>
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">center sm 440 — прогресс, §12.5: крестика нет, Esc и клик мимо не закрывают</p>
          <div class="relative h-170 overflow-hidden rounded-md border border-border-soft bg-background">
            <ModalCard :open="true" :modal="false">
              <ModalCardContent inline size="sm" :closable="false">
                <ModalCardHeader title="Автораспределение" subtitle="режим: полное" />
                <ModalCardBody class="flex flex-col gap-3">
                  <Progress :value="59" :max="132" label="Автораспределение" />
                  <div>
                    <ProgressCounter v-for="r in MC_PROGRESS" :key="r.label" :label="r.label" :value="r.value" />
                  </div>
                </ModalCardBody>
                <ModalCardFooter>
                  <template #note>
                    Структура заблокирована до конца обработки
                  </template>
                  <Button variant="secondary">Прервать</Button>
                </ModalCardFooter>
              </ModalCardContent>
            </ModalCard>
          </div>
        </div>
      </div>

      <div data-subsection="modal-card-edge" class="space-y-1">
        <p class="text-2xs text-muted-foreground">edge 642 — это Sheet такта 29: во всю высоту у правого края; длинное тело прокручивается, шапка и подвал на месте</p>
        <div class="relative h-180 overflow-hidden rounded-md border border-border-soft bg-background">
          <ModalCard :open="true" :modal="false">
            <ModalCardContent inline placement="edge">
              <ModalCardHeader title="История изменений" subtitle="Осмотр № 10948 · ЦЕХ-6" />
              <ModalCardBody class="flex flex-col gap-2">
                <p v-for="line in MC_LONG" :key="line" class="m-0 border-b border-border-soft pb-2 text-sm">
                  {{ line }}
                </p>
              </ModalCardBody>
              <ModalCardFooter>
                <template #note>
                  30 изменений
                </template>
                <Button>Готово</Button>
              </ModalCardFooter>
            </ModalCardContent>
          </ModalCard>
        </div>
      </div>

      <!-- Живые окна: портал, модальность, ловушка фокуса, Esc и клик мимо. -->
      <ModalCard :open="mcLive === 'center'" @update:open="mcLive = $event ? 'center' : ''">
        <ModalCardContent>
          <ModalCardHeader title="Горячие клавиши" subtitle="Разбор ленты с клавиатуры" />
          <ModalCardBody class="flex flex-col gap-6">
            <ShortcutList :items="MC_HOTKEYS" />
            <ModalCardText>{{ MC_NOTE }}</ModalCardText>
          </ModalCardBody>
          <ModalCardFooter>
            <Button @click="mcLive = ''">Понятно</Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>
      <ModalCard :open="mcLive === 'edge'" @update:open="mcLive = $event ? 'edge' : ''">
        <ModalCardContent placement="edge">
          <ModalCardHeader title="История изменений" subtitle="Осмотр № 10948 · ЦЕХ-6" />
          <ModalCardBody class="flex flex-col gap-2">
            <p v-for="line in MC_LONG" :key="line" class="m-0 border-b border-border-soft pb-2 text-sm">
              {{ line }}
            </p>
          </ModalCardBody>
          <ModalCardFooter>
            <Button @click="mcLive = ''">Готово</Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>
      <ModalCard :open="mcLive === 'locked'" @update:open="mcLive = $event ? 'locked' : ''">
        <ModalCardContent size="sm" :closable="false">
          <ModalCardHeader title="Автораспределение" subtitle="режим: полное" />
          <ModalCardBody class="flex flex-col gap-3">
            <Progress :value="59" :max="132" label="Автораспределение" />
            <div>
              <ProgressCounter v-for="r in MC_PROGRESS" :key="r.label" :label="r.label" :value="r.value" />
            </div>
          </ModalCardBody>
          <ModalCardFooter>
            <template #note>
              Структура заблокирована до конца обработки
            </template>
            <Button variant="secondary" @click="mcLive = ''">Прервать</Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ MODAL_CARD_EXAMPLE }}</pre>
    </section>

    <!-- ============================ окно формы повтора, такт 36 ============================ -->
    <section id="repeat-form-window" data-section="repeat-form-window" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          Field left · FieldSet — окно формы повтора
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 36, спека §14.3–14.6, разбор — <code>docs/free-shoot.md</code>, раздел 14. Строка формы — <code>Field</code>
          мастера кита 1 <code>720:11753</code> с двумя осями по решению владельца 1: колонка подписи 170
          (<code>labelWidth="form"</code>, <code>--container-form-label</code>) и знак обязательности (<code>required</code>).
          Группа — <code>FieldSet</code>. Отказ при сохранении — уведомление плюс ошибка у поля (решение 2).
        </p>
        <p class="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="secondary" data-live="form" @click="rfLive = 'window'">Открыть окно</Button>
          <Button variant="secondary" data-live="form-group" @click="rfLive = 'group'">Открыть на группе «Состояние и эксплуатация»</Button>
        </p>
      </div>

      <div data-subsection="form-row" class="grid grid-cols-[repeat(2,--spacing(134))] items-start gap-x-10 gap-y-5">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">labelWidth="content" — подпись по содержимому, как у мастера</p>
          <Field orientation="left" label="Год выпуска">
            <Input model-value="" :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">labelWidth="form" — колонка 170, подпись в одну строку</p>
          <Field orientation="left" label-width="form" label="Год выпуска">
            <Input model-value="" :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">колонка 170, подпись в две строки, required</p>
          <Field orientation="left" label-width="form" label="Наименование, марка, модель" required>
            <Input model-value="Пропиточная линия POLYPRISE" :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">required, пустое — до попытки сохранить</p>
          <Field orientation="left" label-width="form" label="Наименование, марка, модель" required>
            <Input model-value="" :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">required, пустое — после «Сохранить»: Field invalid + Input invalid, без текста</p>
          <Field orientation="left" label-width="form" label="Наименование, марка, модель" required invalid>
            <Input model-value="" invalid :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">выбор — Select, пустое значение «—»</p>
          <Field orientation="left" label-width="form" label="Эксплуатация">
            <Select model-value="—" :items="rfItems(RF_USE)" :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">самая длинная подпись форм повтора (здание), 293.7 — две строки</p>
          <Field orientation="left" label-width="form" label="Причина, по которой доступ не обеспечен">
            <Input model-value="" :show-icon="false" placeholder="" />
          </Field>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">orientation="top" с required — знак у подписи сверху</p>
          <Field label="Номер или название" required>
            <Input model-value="ЦЕХ-6" :show-icon="false" placeholder="" />
          </Field>
        </div>
      </div>

      <div data-subsection="form-groups" class="grid grid-cols-[repeat(2,--spacing(134))] items-start gap-x-10 gap-y-5">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">FieldSet — три группы этапа «Единица оборудования»: заголовок, строки через 8, между группами 12 / линия / 12</p>
          <div>
            <FieldSet v-for="g in RF_GROUPS" :key="g.title" :legend="g.title">
              <template v-for="f in g.fields" :key="f.k">
                <Field v-if="!f.dep" orientation="left" label-width="form" :label="f.l" :required="!!f.req">
                  <Select v-if="f.opts" :model-value="RF_VALUES[f.k]" :items="rfItems(f.opts)" :show-icon="false" placeholder="" />
                  <Input v-else :model-value="RF_VALUES[f.k]" :show-icon="false" placeholder="" />
                </Field>
              </template>
            </FieldSet>
          </div>
        </div>
        <div class="space-y-5">
          <div v-for="d in RF_DEP" :key="d.use" data-subsection="form-dep" class="space-y-1">
            <p class="text-2xs text-muted-foreground">зависимое поле, §14.4: {{ d.label }}</p>
            <FieldSet legend="Состояние и эксплуатация">
              <Field orientation="left" label-width="form" label="Эксплуатация">
                <Select :model-value="d.use" :items="rfItems(RF_USE)" :show-icon="false" placeholder="" />
              </Field>
              <Field v-if="d.use === 'Не эксплуатируется'" orientation="left" label-width="form" label="Причины простоя">
                <Input model-value="" :show-icon="false" placeholder="" />
              </Field>
              <Field orientation="left" label-width="form" label="Дефекты">
                <Select model-value="Не выявлены" :items="rfItems(['Не выявлены', 'Выявлены'])" :show-icon="false" placeholder="" />
              </Field>
            </FieldSet>
          </div>
          <div data-subsection="form-dep-live" class="space-y-1">
            <p class="text-2xs text-muted-foreground">вживую: смените «Эксплуатацию» или «Дефекты»</p>
            <FieldSet legend="Состояние и эксплуатация">
              <template v-for="f in RF_EQ.slice(6, 12)" :key="f.k">
                <Field v-if="rfVisible(f)" orientation="left" label-width="form" :label="f.l">
                  <Select v-if="f.opts" v-model="rfDraft[f.k]" :items="rfItems(f.opts)" :show-icon="false" placeholder="" />
                  <Input v-else v-model="rfDraft[f.k]" :show-icon="false" placeholder="" />
                </Field>
              </template>
            </FieldSet>
          </div>
        </div>
      </div>

      <div data-subsection="form-window" class="space-y-1">
        <p class="text-2xs text-muted-foreground">окно целиком — center md 600 в рамке 1440×900: тело прокручивается, шапка и подвал на месте</p>
        <div class="relative h-225 w-360 overflow-hidden rounded-md border border-border-soft bg-background">
          <ModalCard :open="true" :modal="false">
            <ModalCardContent inline>
              <ModalCardHeader title="Форма · Единица оборудования" subtitle="Динамическая форма повторяемого этапа" />
              <ModalCardBody>
                <FieldSet v-for="g in RF_GROUPS" :key="g.title" :legend="g.title">
                  <template v-for="f in g.fields" :key="f.k">
                    <Field v-if="!f.dep" orientation="left" label-width="form" :label="f.l" :required="!!f.req">
                      <Select v-if="f.opts" :model-value="RF_VALUES[f.k]" :items="rfItems(f.opts)" :show-icon="false" placeholder="" />
                      <Input v-else :model-value="RF_VALUES[f.k]" :show-icon="false" placeholder="" />
                    </Field>
                  </template>
                </FieldSet>
              </ModalCardBody>
              <ModalCardFooter>
                <Button variant="secondary">Отмена</Button>
                <Button>Сохранить</Button>
              </ModalCardFooter>
            </ModalCardContent>
          </ModalCard>
        </div>
      </div>

      <!-- Живое окно: портал, ловушка фокуса, Esc; открытие на группе — прокрутка тела и фокус на первом поле. -->
      <ModalCard :open="rfLive !== ''" @update:open="!$event && (rfLive = '')">
        <ModalCardContent>
          <ModalCardHeader title="Форма · Единица оборудования" subtitle="Динамическая форма повторяемого этапа" />
          <ModalCardBody>
            <FieldSet
              v-for="g in RF_GROUPS"
              :key="g.title"
              :legend="g.title"
              :autofocus="rfLive === 'group' && g.title === 'Состояние и эксплуатация'"
            >
              <template v-for="f in g.fields" :key="f.k">
                <Field v-if="rfVisible(f)" orientation="left" label-width="form" :label="f.l" :required="!!f.req">
                  <Select v-if="f.opts" v-model="rfDraft[f.k]" :items="rfItems(f.opts)" :show-icon="false" placeholder="" />
                  <Input v-else v-model="rfDraft[f.k]" :show-icon="false" placeholder="" />
                </Field>
              </template>
            </FieldSet>
          </ModalCardBody>
          <ModalCardFooter>
            <Button variant="secondary" @click="rfLive = ''">Отмена</Button>
            <Button @click="rfLive = ''">Сохранить</Button>
          </ModalCardFooter>
        </ModalCardContent>
      </ModalCard>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ REPEAT_FORM_WINDOW_EXAMPLE }}</pre>
    </section>

    <!-- ============================ Callout, такт 39 ============================ -->
    <section id="callout" data-section="callout" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          Callout — плашка-сообщение в потоке
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 39, карточка 4 такта 37 (ворота 2026-09-30). Мастера нет: структура — блоки окон <code>.sum</code> и полоса
          приёмки <code>.review</code> прототипа v17, вид — роли такта 30: фон <code>*-surface</code>, текст <code>*-strong</code>;
          нейтральный — <code>--muted</code>. Заголовок 15/20 bold, текст 15/20, паддинг 12/16, радиус 8, рамки нет.
          Разбор — <code>docs/free-shoot.md</code>, раздел 18.
        </p>
      </div>

      <div data-subsection="callout-tones" class="grid max-w-6xl grid-cols-[10rem_repeat(3,minmax(0,1fr))] items-start gap-4">
        <span class="text-2xs text-muted-foreground">тон</span>
        <span class="text-2xs text-muted-foreground">заголовок и текст</span>
        <span class="text-2xs text-muted-foreground">только текст</span>
        <span class="text-2xs text-muted-foreground">только заголовок</span>
        <template v-for="c in CALLOUT_TONES" :key="c.tone">
          <code class="text-2xs">{{ c.tone }}</code>
          <Callout :tone="c.tone" :title="c.title">{{ c.text }}</Callout>
          <Callout :tone="c.tone">{{ c.text }}</Callout>
          <Callout :tone="c.tone" :title="c.title" />
        </template>
      </div>

      <div data-subsection="callout-compose" class="grid max-w-6xl grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-4">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">список — сводка завершения, §17.5</p>
          <Callout tone="destructive" title="Не закрыты обязательные шаги: 3">
            <ul>
              <li v-for="s in CALLOUT_LIST" :key="s">{{ s }}</li>
            </ul>
          </Callout>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">действия справа — полоса приёмки, §13.2 (№ 8)</p>
          <Callout tone="warning" title="Проверка: осталось 42 объекта">
            Проверено 0 из 42. Принятый объект сворачивается и уходит из списка; его кадры принимаются вместе с ним
            <template #actions>
              <Checkbox :model-value="true">только непроверенные</Checkbox>
              <Button variant="secondary" size="sm">Отменить автораспределение</Button>
              <Button size="sm">Принять все объекты</Button>
            </template>
          </Callout>
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ CALLOUT_EXAMPLE }}</pre>
    </section>

    <!-- ============================ RadioGroupItem card, такт 39 ============================ -->
    <section id="radio-card" data-section="radio-card" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          RadioGroupItem variant="card" — карточка выбора
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 39, ось подачи радиокнопки (решение агента, нехватка в ките): карточка режима окна запуска, прототип
          <code>.wmode</code>, §12.1–12.2. Контрол и заголовок — строки мастера <code>590:5372</code>; слоты
          <code>description</code> (13/16 <code>--foreground-secondary</code>) и <code>meta</code> (13/16 medium
          <code>--primary</code>). Отмеченная — рамка и кольцо <code>--primary</code>, фон <code>--surface-selected</code>;
          наведение неотмеченной — <code>--accent</code>; выключенная — 0.48.
        </p>
      </div>

      <div data-subsection="radio-card-states" class="grid max-w-6xl grid-cols-[repeat(3,minmax(0,1fr))] items-start gap-4">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">не отмечена</p>
          <RadioGroup model-value="">
            <RadioGroupItem variant="card" value="struct">
              {{ WAND.modes[1]!.title }}
              <template #description>{{ WAND.modes[1]!.description }}</template>
              <template #meta>{{ WAND.modes[1]!.forecast }}</template>
            </RadioGroupItem>
          </RadioGroup>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">отмечена</p>
          <RadioGroup model-value="full">
            <RadioGroupItem variant="card" value="full" checked>
              {{ WAND.modes[0]!.title }}
              <template #description>{{ WAND.modes[0]!.description }}</template>
              <template #meta>{{ WAND.modes[0]!.forecast }}</template>
            </RadioGroupItem>
          </RadioGroup>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">выключена с причиной — «Пустой осмотр» (§19)</p>
          <RadioGroup model-value="">
            <RadioGroupItem variant="card" value="photos" :disabled="WAND_EMPTY.modes[2]!.disabled">
              {{ WAND_EMPTY.modes[2]!.title }}
              <template #description>{{ WAND_EMPTY.modes[2]!.description }}</template>
              <template #meta>{{ WAND_EMPTY.modes[2]!.forecast }}</template>
            </RadioGroupItem>
          </RadioGroup>
        </div>
      </div>

      <div data-subsection="radio-card-live" class="grid max-w-6xl grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">живая группа — наведение и выбор мышью и стрелками</p>
          <RadioGroup v-model="radioLive" class="gap-2">
            <RadioGroupItem v-for="w in WAND.modes" :key="w.value" variant="card" :value="w.value" :disabled="w.disabled" :checked="radioLive === w.value">
              {{ w.title }}
              <template #description>{{ w.description }}</template>
              <template #meta>{{ w.forecast }}</template>
            </RadioGroupItem>
          </RadioGroup>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">строка мастера — без изменений, для сравнения</p>
          <RadioGroup model-value="a">
            <RadioGroupItem value="a" checked subtitle="подпись">Отмечена</RadioGroupItem>
            <RadioGroupItem value="b">Не отмечена</RadioGroupItem>
          </RadioGroup>
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ RADIO_CARD_EXAMPLE }}</pre>
    </section>

    <!-- ============================ окна автораспределения, такт 39 ============================ -->
    <section id="wand-windows" data-section="wand-windows" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          Окна автораспределения — запуск (№ 48–49) и сводка результата (№ 54)
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 39: <code>ModalCard</code> center 600 из частей кита — <code>ModalCardText</code>, <code>RadioGroupItem card</code>,
          <code>Callout</code>, <code>Button</code>. Тексты и прогнозы — модель экрана (<code>autoPlan</code>,
          <code>planPhotosOnly</code>, <code>wandSummary</code> прототипа) на наборе «Частично проверен». Рамки — окно внутри
          родителя (<code>inline</code>).
        </p>
      </div>

      <div class="grid grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">запуск, §12.1–12.4</p>
          <div class="relative h-220 overflow-hidden rounded-md border border-border-soft bg-background">
            <ModalCard :open="true" :modal="false">
              <ModalCardContent inline>
                <ModalCardHeader title="Автораспределение" subtitle="Система предложит, вы проверите" />
                <ModalCardBody class="flex flex-col gap-3">
                  <ModalCardText>{{ WAND.source.before }}<b>{{ WAND.source.strong }}</b>{{ WAND.source.after }}</ModalCardText>
                  <RadioGroup v-model="wandPick" class="gap-2">
                    <RadioGroupItem v-for="w in WAND.modes" :key="w.value" variant="card" :value="w.value" :disabled="w.disabled" :checked="wandPick === w.value">
                      {{ w.title }}
                      <template #description>{{ w.description }}</template>
                      <template #meta>{{ w.forecast }}</template>
                    </RadioGroupItem>
                  </RadioGroup>
                  <Callout v-for="b in WAND.blocks" :key="b.title" :tone="b.tone" :title="b.title">{{ b.text }}</Callout>
                </ModalCardBody>
                <ModalCardFooter>
                  <Button variant="secondary">Отмена</Button>
                  <Button>Запустить</Button>
                </ModalCardFooter>
              </ModalCardContent>
            </ModalCard>
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">сводка результата, §12.12 — режим «{{ MODE_T[SUMMARY.mode] }}»</p>
          <div class="relative h-220 overflow-hidden rounded-md border border-border-soft bg-background">
            <ModalCard :open="true" :modal="false">
              <ModalCardContent inline>
                <ModalCardHeader title="Автораспределение завершено" :subtitle="`Режим: ${MODE_T[SUMMARY.mode]}`" />
                <ModalCardBody class="flex flex-col gap-3">
                  <Callout v-for="b in SUMMARY.blocks" :key="b.title" :tone="b.tone" :title="b.title">{{ b.text }}</Callout>
                  <ModalCardText>{{ SUMMARY.note }}</ModalCardText>
                </ModalCardBody>
                <ModalCardFooter>
                  <Button v-for="b in SUMMARY.buttons" :key="b.t" :variant="b.primary ? 'default' : 'secondary'">{{ b.t }}</Button>
                </ModalCardFooter>
              </ModalCardContent>
            </ModalCard>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================ ActionBar, SelectionMarquee, «Отменить», такт 40 ============================ -->
    <section id="selection" data-section="selection" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          ActionBar · SelectionMarquee · метка переноса · «Отменить» — выделение и привязка
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 40, карточки 6 и 7 такта 37 (ворота 2026-09-30). Мастеров нет: структура — панель выделения
          <code>#selbar</code>, рамка <code>.marquee</code>, метка <code>#ghost</code> и уведомление <code>toast</code> прототипа v17;
          вид — роли всплывающих кита (<code>--popover</code>, <code>shadow-dropdown</code>), <code>--primary</code> на ступени
          <code>--opacity-soft</code>, <code>Badge</code> md, <code>Toast</code>. Разбор — <code>docs/free-shoot.md</code>, раздел 19.
          На экране полоса прибита к низу окна; здесь — в потоке (<code>class="relative …"</code>).
        </p>
      </div>

      <div data-subsection="action-bar" class="grid max-w-6xl grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">ActionBar — счёт с подписью, действия, разделитель</p>
          <ActionBar count="5 кадров выбрано" sub="1 видео · 2 уже распределено" x="0" class="relative bottom-0 translate-x-0">
            <Button>Назначить на шаг</Button>
            <Button variant="secondary">Новый объект</Button>
            <Button variant="secondary">В «Прочее»</Button>
            <Button variant="secondary">Открепить</Button>
            <ActionBarSeparator />
            <Button variant="secondary">Снять</Button>
          </ActionBar>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">ActionBar — счёт без подписи</p>
          <ActionBar count="1 кадр выбран" x="0" class="relative bottom-0 translate-x-0">
            <Button>Назначить на шаг</Button>
            <ActionBarSeparator />
            <Button variant="secondary">Снять</Button>
          </ActionBar>
        </div>
      </div>

      <div data-subsection="marquee" class="grid max-w-6xl grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">SelectionMarquee — рамка поверх плиток (в окне стенда — внутри рамки)</p>
          <div class="relative h-40 overflow-hidden rounded-md border border-border-soft bg-background p-6">
            <div class="flex gap-4">
              <FrameTile class="w-44" :src="img(1)" time="09:43" selected selection-mode />
              <FrameTile class="w-44" :src="img(2)" time="09:47" />
            </div>
            <SelectionMarquee :rect="marqueeDemo" class="absolute" />
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">метка переноса — Badge md как есть (решение ворот 7)</p>
          <div class="flex gap-3">
            <Badge>5 кадров</Badge>
            <Badge>IMG_3264.jpeg</Badge>
          </div>
        </div>
      </div>

      <div data-subsection="toast-undo" class="space-y-1">
        <p class="text-2xs text-muted-foreground">уведомление привязки с «Отменить» — Alert мастера Notification со слотом действия</p>
        <Alert :show-action="true">
          1 кадр → «Узлы и агрегаты» · Пропиточная линия POLYPRISE
          <template #action>
            Отменить
          </template>
        </Alert>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ ACTION_BAR_EXAMPLE }}</pre>
    </section>

    <!-- ============================ каркас экрана, такт 42 ============================ -->
    <section id="frame" data-section="frame" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          AppBar · Toolbar · Resizable · Button variant="sidebar" — каркас экрана
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 42, карточки 1–3 такта 37 (ворота 2026-09-30). <code>AppBar</code> — полоса приложения 56 на ролях сайдбара; с такта 48
          геометрия — <code>top_menu</code> <code>33970:14832</code> (левый блок 256 с бургером и логотипом, правый блок у края), каркас
          <code>admin.vue</code> — на ней.
          <code>Toolbar</code> — светлая полоса на <code>--card</code> с нижней линией <code>--border-soft</code>, без примитива Reka.
          <code>Resizable</code> — <code>Splitter</code> Reka, панель в пикселях, пределы 320–820. Разбор — <code>docs/free-shoot.md</code>, раздел 21.
        </p>
        <p class="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="secondary" @click="saveDemo = 'saving'">Статус: сохранение</Button>
          <Button variant="secondary" @click="saveDemo = 'saved'">Статус: сохранено</Button>
          <Button variant="secondary" @click="saveDemo = 'error'">Статус: ошибка</Button>
        </p>
      </div>

      <div data-subsection="app-bar" class="space-y-2">
        <p class="text-2xs text-muted-foreground">AppBar — бургер и логотип, статус, кнопки sidebar с иконкой и без, выход</p>
        <AppBar>
          <template #start>
            <IconButton variant="sidebar" size="lg" label="Свернуть меню">
              <Icon name="menu" :size="24" />
            </IconButton>
            <AppBarBrand logo="/brand/rososmotr-logo.svg">Рососмотр</AppBarBrand>
          </template>
          <template #end>
            <AppBarStatus :state="saveDemo" />
            <Button variant="sidebar" show-icon>
              <template #icon>
                <Icon name="keyboard" :size="20" />
              </template>
              Горячие клавиши
            </Button>
            <Button variant="sidebar">
              RU
              <Icon name="chevron-down" :size="8" />
            </Button>
            <IconButton variant="sidebar" size="lg" label="Выйти">
              <Icon name="logout" :size="24" />
            </IconButton>
          </template>
        </AppBar>
        <AppBar>
          <template #start>
            <AppBarBrand>VIEWAPP</AppBarBrand>
          </template>
        </AppBar>
        <div class="flex flex-wrap items-center gap-6 bg-sidebar px-4 py-3">
          <AppBarStatus state="saving" />
          <AppBarStatus state="saved" />
          <AppBarStatus state="error" />
          <Button variant="sidebar" size="sm">sm</Button>
          <Button variant="sidebar">md</Button>
          <Button variant="sidebar" disabled>выключена</Button>
        </div>
      </div>

      <div data-subsection="toolbar" class="space-y-2">
        <p class="text-2xs text-muted-foreground">Toolbar — кнопки, поле, текст с обрезкой, группы с подписью; перенос строки</p>
        <div class="max-w-240 border border-border-soft">
          <Toolbar>
            <Button variant="secondary">Распределить автоматически</Button>
            <Button variant="secondary">Выделить всё</Button>
            <ToolbarText truncate grow align="end">Текущий: Пропиточная линия POLYPRISE</ToolbarText>
            <ToolbarGroup label="Размер">
              <Tabs model-value="md">
                <TabsList variant="pill">
                  <TabsTrigger value="md" variant="pill">M</TabsTrigger>
                  <TabsTrigger value="lg" variant="pill">L</TabsTrigger>
                </TabsList>
              </Tabs>
            </ToolbarGroup>
          </Toolbar>
          <Toolbar class="px-3">
            <Button variant="secondary" size="sm">Свернуть все</Button>
            <Button size="sm">Показать все (+7)</Button>
            <ToolbarText>этапов: 5 · шагов: 24 · заморожено 7</ToolbarText>
          </Toolbar>
        </div>
      </div>

      <div data-subsection="resizable" class="space-y-2">
        <p class="text-2xs text-muted-foreground">Resizable — ручка с захватом; панель справа 320–820, по умолчанию 440 (стрелками с клавиатуры — тоже)</p>
        <div class="h-40 max-w-300 border border-border-soft">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel class="flex items-center justify-center">
              <span class="text-xs text-muted-foreground">лента</span>
            </ResizablePanel>
            <ResizableHandle with-handle />
            <ResizablePanel :default-size="440" :min-size="320" :max-size="820" size-unit="px" class="flex items-center justify-center">
              <span class="text-xs text-muted-foreground">панель</span>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ FRAME_EXAMPLE }}</pre>
    </section>

    <!-- ============================ заголовки, такт 47 ============================ -->
    <section id="heading" data-section="heading" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          Heading — заголовок страницы и заголовок блока
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 47, ворота владельца 2026-10-01. <code>level="page"</code> — h1 24/28 bold, <code>level="section"</code> — h2 17/24 bold,
          цвет основного текста; <code>as</code> — смена тега. Правило базовой линии: в строке «заголовок + текст» элементы стоят на
          базовой линии заголовка (<code>items-baseline</code>).
        </p>
      </div>
      <div data-subsection="heading" class="grid max-w-6xl grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">page — с текстом в строке, на базовой линии</p>
          <div class="flex items-baseline gap-2">
            <Heading level="page">Свободная съёмка</Heading>
            <ToolbarText>189 фото · 7 видео · 9 заметок</ToolbarText>
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">section — заголовок блока и группы полей (FieldSet)</p>
          <Heading>Шаги осмотра</Heading>
        </div>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ HEADING_EXAMPLE }}</pre>
    </section>

    <!-- ============================ заметки и создание, такт 43 ============================ -->
    <section id="notes" data-section="notes" class="space-y-6">
      <div class="space-y-1">
        <h2 class="text-lg font-bold">
          FeedNote · ActionBar у выделенного текста · AssignOption type="stage" — заметки и создание
        </h2>
        <p class="max-w-240 text-sm text-foreground-secondary">
          Такт 43, карточка 5 такта 37 (ворота 2026-09-30). Мастера нет: состав — заметка ленты <code>voiceHTML</code> прототипа v17,
          строка воспроизведения — <code>PlayerAudio</code> кита (решение ворот 5), тоны — <code>--secondary</code> с подписью
          <code>--primary</code> и <code>--warning-surface</code> с подписью <code>--warning-strong</code>. «Показать полностью» — от 110 знаков.
          Полоса фрагмента — второе размещение <code>ActionBar</code> (ось <code>y</code>); этап нового повтора — пункт поповера
          <code>AssignOption type="stage"</code>. Разбор — <code>docs/free-shoot.md</code>, раздел 22.
        </p>
      </div>

      <div data-subsection="feed-note" class="grid max-w-6xl grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">голосовой комментарий, короткий</p>
          <FeedNote time="09:52" duration="0:26" name="AUDIO_17.m4a" seed="17" text="Компрессорная. Четыре машины ALUP, три из них на консервации с десятого года" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">текстовая заметка</p>
          <FeedNote kind="note" time="10:14" text="Компрессор ALUP инв. 10433 — на консервации, наклейка на дверце, снял крупно" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">длинная — свёрнута до двух строк, «Показать полностью»</p>
          <FeedNote time="11:40" duration="2:07" name="AUDIO_19.m4a" seed="19" :text="LONG_NOTE" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">длинная — развёрнута, «Свернуть»</p>
          <FeedNote time="11:40" duration="2:07" name="AUDIO_19.m4a" :text="LONG_NOTE" expanded />
        </div>
      </div>

      <div data-subsection="fragment" class="grid max-w-6xl grid-cols-[repeat(2,minmax(0,1fr))] items-start gap-6">
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">ActionBar у выделенного текста — цитата в одну строку до 208 с многоточием</p>
          <ActionBar count="Новый объект:" sub="«Итог по осмотру. Обошёл ткацкий участок цеха шесть, крутильный участок»" x="0" y="0" class="relative translate-x-0 translate-y-0">
            <Button>Оборудование</Button>
            <Button variant="secondary">Здание</Button>
          </ActionBar>
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">поповер «Новый объект из выделенного» — этапы и число повторов</p>
          <SelectContent :width="360">
            <AssignList>
              <SelectGroup header="Создать повтор этапа">
                <AssignOption type="stage" value="stage|bld" name="Здание / цех" :frames="1" />
                <AssignOption type="stage" value="stage|eq" name="Единица оборудования" :frames="1" demo-hover />
              </SelectGroup>
            </AssignList>
          </SelectContent>
        </div>
      </div>

      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ NOTES_EXAMPLE }}</pre>
    </section>
  </main>
</template>
