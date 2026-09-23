<script setup lang="ts">
import { ref } from 'vue'
import type { FrameTileState } from '@/components/ui/frame-tile'
import type { StepThumbItem, StepVerdict } from '@/components/ui/step-row'

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
  return { props: { ...row.base, verdict, thumbs, hotkey: avail === 'frozen' ? null : 3 } }
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
  :hotkey="isCurrent(object) ? index + 1 : null"            // §16.3
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

</script>

<template>
  <main data-theme="rososmotr" class="space-y-14 bg-background px-6 py-10 font-sans text-foreground">
    <header class="space-y-2">
      <h1 class="text-4xl font-bold">
        Свободная съёмка — стенд компонентов
      </h1>
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
          <StepRow name="Узлы и агрегаты" :min="0" :count="0" instruction="Приводы, валы, редукторы" :hotkey="4" drop-target />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            цель приёма у заполненного не действует — §9.5
          </p>
          <StepRow name="Контрольное видео" required kind="video" :min="1" :max="1" :count="1" instruction="От шильдика, затем обход" :hotkey="8" :thumbs="[THUMB(22)]" drop-target />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            подсвечен связью с кадром ленты — §15.1
          </p>
          <StepRow name="Инвентарный или учётный номер" required :min="1" :count="1" instruction="Номер краской, бирка, наклейка" :hotkey="2" :thumbs="[THUMB(12)]" highlighted />
        </div>
        <div class="space-y-1">
          <p class="flex items-center gap-2 text-2xs text-muted-foreground">
            вспышка 1.5 с — §15.3
            <Button size="sm" variant="secondary" @click="flash">
              Повторить
            </Button>
          </p>
          <StepRow name="Общий вид оборудования" required :min="3" :count="1" instruction="Не менее 3 кадров с разных сторон" :hotkey="3" :thumbs="[THUMB(26)]" :located-thumb="26" :flash="flashNonce" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            наведение
          </p>
          <StepRow name="Органы управления и показания" :min="0" :count="1" instruction="Пульты, шкафы управления" :hotkey="5" :thumbs="[THUMB(31)]" demo-hover />
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
          <StepRow name="Органы управления и показания" :min="0" :count="2" :was-count="1" instruction="Пульты, шкафы управления" :hotkey="5" :thumbs="[THUMB(31), THUMB(1, 'locked')]" />
        </div>
        <div class="space-y-1">
          <p class="text-2xs text-muted-foreground">
            больше восьми миниатюр — хвост «+N», решение 8
          </p>
          <StepRow name="Общий вид территории" :min="2" :count="12" instruction="Не менее 2 кадров" :hotkey="1" :thumbs="MANY" />
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
            <StepThumb :src="img(36)" demo-hover />
            <p class="text-2xs text-muted-foreground">
              наведение
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

  </main>
</template>
