<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { frameTileGridVariants, type FrameTileState } from '@/components/ui/frame-tile'
import type { StepThumbItem, StepVerdict } from '@/components/ui/step-row'
import AsisMarks from '~/stands/free-shoot/AsisMarks.vue'
import proto from '~/stands/free-shoot/prototype-data.json'

/**
 * Экран «Распределение свободной съёмки» (VA-9265) — такт 31, решение владельца 2026-09-23.
 *
 * Собран целиком. Где элемент экрана покрывается компонентом кита — существующим или
 * новым такта 30, — стоит компонент кита. Всё остальное перенесено из прототипа v17
 * **как есть**: его разметка и его CSS (`~/stands/free-shoot/asis.css`), без подгонки под
 * токены, — чтобы на глаз было видно, что ещё не закрыто. Каждый перенесённый блок несёт
 * `data-asis="<имя>"`; реестр покрытия — `docs/free-shoot.md`, раздел 8.
 *
 * Компонент кита внутри перенесённого блока стоит в `.kit-island` — островке, который
 * сбрасывает шрифт и цвет прототипа (правило в `asis.css`).
 *
 * ## Данные
 *
 * `~/stands/free-shoot/prototype-data.json` снят с обезличенного прототипа
 * (`docs/sources/va-9265/`) функциями самого прототипа: `A` — набор «Частично проверен»
 * (7 замороженных шагов, 1 «Повторить», привязанные ранее и отклонённые кадры), `B` — тот
 * же набор после полного автораспределения (режим приёмки); `html` — разметка окон,
 * отрисованная прототипом. Изображения — демо-кадры `public/free-shoot/`.
 *
 * ## Бизнес-логики нет
 *
 * Прецедент стендов: перетаскивание, клавиатура, автораспределение, отмена, автосохранение
 * не реализованы. Работает то, что несёт сам компонент кита (наведение, отметка выделения),
 * и переключатели вида — размер превью, «Разобранные», вкладки панели.
 *
 * ## Оснастка приёмки — не продукт
 *
 * | Параметр | Что показывает |
 * |---|---|
 * | `?state=link` | связь шага и кадров: кадры шага подсвечены, остальные приглушены (§15.1–15.2) |
 * | `?state=flash` | вспышка шага и обводка миниатюры после «Показать в структуре» (§15.3) |
 * | `?state=tooltip` | подсказка названия шага на плашке кадра (§15.4) |
 * | `?state=drop` | цель приёма перетаскивания и перетаскиваемые кадры (§9.5) |
 * | `?selected=demo` | выделение пяти кадров и панель выделения (§10.2) |
 * | `?open=assign` | панель выделения и поповер «Назначить на шаг», текущий объект (§10.3) |
 * | `?open=viewer-free` / `viewer-assigned` / `viewer-locked` / `viewer-suggest` | полноэкранный просмотр, четыре состояния нижней плашки (§11.2) |
 * | `?open=wand` | окно запуска автораспределения (§12.1–12.4) |
 * | `?open=progress` | окно прогресса автораспределения (§12.5) |
 * | `?open=summary` | сводка результата автораспределения (§12.12) |
 * | `?open=finish` | сводка завершения распределения (§17.4) |
 * | `?view=review` | режим приёмки: полоса приёмки, предложенные объекты и кадры (§13) |
 * | `?tab=form` | вкладка «Форма осмотра» (§7) |
 * | `?asis=mark` | пунктир и подпись вокруг каждого перенесённого блока |
 */
definePageMeta({ layout: false })
useHead({ title: 'Распределение свободной съёмки — экран' })

const route = useRoute()
const q = (k: string) => String(route.query[k] ?? '')
const state = q('state')
const openWin = q('open')
const view = q('view')
const asisMark = q('asis') === 'mark'

/* eslint-disable @typescript-eslint/no-explicit-any */
const P = proto as any
const D = view === 'review' ? P.B : P.A
const H = P.html
const STAGES: any[] = P.stages
const stageById: Record<string, any> = Object.fromEntries(STAGES.map(s => [s.id, s]))

/** Демо-кадр по индексу кадра прототипа: 24 снимка по кругу. */
const img = (i: number) => `/free-shoot/demo-${String(((i - 1) % 24) + 1).padStart(2, '0')}.jpg`

const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100
  const k = n % 10
  return `${n} ${m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c}`
}

const O = (id: string | null) => D.objects.find((o: any) => o.id === id) ?? null
const ownerStage = (owner: string) => (O(owner) ? stageById[O(owner).stageId] : stageById[owner])
const objName = (o: any) => (o.stageId === 'eq' ? (o.form.mark || 'Объект без названия') : (o.form.no || 'Здание без названия'))
const objSub = (o: any) => (o.stageId === 'eq'
  ? [o.form.sn ? `зав. № ${o.form.sn}` : '', o.form.inv ? `инв. ${o.form.inv}` : '', o.form.bld, o.form.use].filter(Boolean).join(' · ')
  : [o.form.purpose, o.form.cond, o.form.heat].filter(Boolean).join(' · '))
const verdictOf = (o: string, s: string) => D.review[`${o}|${s}`] ?? null
const isFrozen = (o: string, s: string) => verdictOf(o, s)?.v === 'ok'
const framesIn = (o: string, s: string) => D.frames.filter((f: any) => f.objId === o && f.stepId === s)
const isMedia = (f: any) => f.type !== 'voice'
const frameWhy = (f: any) => (f.rej ? 'Кадр отклонён проверяющим' : f.origin === 'step' ? 'Кадр снят прямо в шаге при обычном осмотре' : 'Кадр в проверенном шаге')

const eqId: string = D.objects.find((o: any) => o.stageId === 'eq')?.id
const cur = ref<string | null>(openWin === 'assign' ? P.selectCur : D.cur)
/** Раскрытые повторы. У прототипа после загрузки свёрнуты все — здесь раскрыт один, чтобы строки шагов были видны. */
const firstAuto = D.objects.find((o: any) => o.auto && o.stageId === 'eq')?.id
const openObjs = ref(new Set<string>([view === 'review' ? firstAuto : eqId].filter(Boolean)))

/* ------------------------------- оснастка ------------------------------- */
const LINK = { owner: eqId, step: 'e3' }
const selected = ref(new Set<number>(
  state === 'drop' || openWin === 'assign' || q('selected') === 'demo' ? P.selected : [],
))
const showSelbar = openWin === 'assign' || q('selected') === 'demo'
const flashNonce = ref<number | null>(null)

/* --------------------------------- лента --------------------------------- */
const size = ref<'md' | 'lg'>('md')
const mode = ref<'keep' | 'hide'>('keep')
const search = ref('')
const tab = ref(q('tab') === 'form' ? 'form' : 'scheme')

const feed = computed(() => D.frames.filter((f: any) => {
  if (isMedia(f) && f.origin === 'step') return false
  if (mode.value === 'hide' && isMedia(f) && f.objId) return false
  return true
}))
const linkedSet = computed(() => new Set(state === 'link' ? framesIn(LINK.owner, LINK.step).map((f: any) => f.i) : []))

function tileState(f: any): FrameTileState {
  if (!f.objId) return 'free'
  if (f.rej) return 'rejected'
  if (f.lock) return 'locked'
  if (f.auto) return 'suggested'
  return 'assigned'
}
function tileProps(f: any) {
  const st = f.objId ? ownerStage(f.objId).steps.find((s: any) => s.id === f.stepId) : null
  const owner = f.objId ? (O(f.objId) ? objName(O(f.objId)) : ownerStage(f.objId).title) : ''
  const s = tileState(f)
  return {
    src: img(f.i),
    alt: f.n,
    time: f.t,
    kind: f.type === 'video' ? 'video' as const : 'photo' as const,
    duration: f.dur ?? '',
    state: s,
    stepName: st?.n ?? '',
    locateHint: st ? `${owner} · ${st.n}` : '',
    lockReason: s === 'locked' || s === 'rejected' ? frameWhy(f) : '',
    selected: selected.value.has(f.i),
    selectionMode: selected.value.size > 0,
    linked: linkedSet.value.has(f.i),
    dimmed: state === 'link' && !linkedSet.value.has(f.i),
    dragging: state === 'drop' && selected.value.has(f.i),
    tooltipOpen: state === 'tooltip' && f.i === 1 ? true : undefined,
  }
}
function toggle(i: number) {
  const next = new Set(selected.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  selected.value = next
}

/* ------------------------------ заметки (как есть) ------------------------------ */
const noteWave = (f: any) => Array.from({ length: 80 }, (_, i) => Math.round((3 + Math.abs(Math.sin((i + (f.i - 9000) * 3) * 0.8)) * 11) * 10) / 10)

/* ------------------------------ панель структуры ------------------------------ */
const nfrz = Object.values(D.review).filter((v: any) => v.v === 'ok').length
const totalSteps = STAGES.reduce((a, s) => a + s.steps.length, 0)

function thumbState(f: any): StepThumbItem['state'] {
  if (f.rej) return 'rejected'
  if (f.origin === 'step') return 'from-step'
  if (f.lock) return 'locked'
  if (f.auto) return 'suggested'
  return 'free'
}
function stepProps(owner: string, st: any, index: number) {
  const inStep = framesIn(owner, st.id)
  const counted = inStep.filter((f: any) => !f.rej)
  const v = verdictOf(owner, st.id)
  const verdict: StepVerdict | null = v ? { kind: v.v === 'ok' ? 'ok' : 'redo', at: v.at, note: v.note } : null
  const isLink = owner === LINK.owner && st.id === LINK.step
  return {
    name: st.n,
    required: !!st.req,
    kind: st.kind === 'Видео' ? 'video' as const : 'photo' as const,
    min: st.min,
    max: st.max,
    count: counted.length,
    wasCount: counted.filter((f: any) => f.lock).length,
    instruction: st.hint ?? '',
    hotkey: cur.value === owner ? index + 1 : null,
    verdict,
    thumbs: inStep.map((f: any) => ({ id: f.i, src: img(f.i), state: thumbState(f) })),
    highlighted: state === 'link' && isLink,
    dropTarget: state === 'drop' && owner === eqId && st.id === 'e4',
    flash: isLink ? flashNonce.value : null,
    locatedThumb: state === 'flash' && isLink ? inStep[0]?.i ?? null : null,
  }
}

function objState(o: any) {
  const st = stageById[o.stageId]
  const bad = st.steps.filter((x: any) => {
    const n = framesIn(o.id, x.id).filter((f: any) => !f.rej).length
    return (x.max && n > x.max) || (n === 0 && x.req)
  }).length
  const frz = st.steps.filter((x: any) => isFrozen(o.id, x.id)).length
  return { total: D.frames.filter((f: any) => f.objId === o.id).length, bad, frz, steps: st.steps.length }
}

/** Компактная форма повтора — прототип `formPreview`, как есть. */
function formPreview(o: any) {
  const st = stageById[o.stageId]
  const vis = (f: any) => !(f.dep && o.form[f.dep.k] !== f.dep.v)
  const fields = st.form.filter(vis)
  const key = fields.filter((f: any) => o.form[f.k] || f.req).slice(0, 6)
  const src = o.auto && o.autoSrc ? o.autoSrc : {}
  return { fields, key, src, locked: objState(o).frz > 0 }
}
const SRC_T: Record<string, string> = { rec: 'распознано', def: 'по умолчанию' }

function repList(st: any) {
  let list = D.objects.filter((o: any) => o.stageId === st.id)
  let hidden = 0
  if (view === 'review') {
    hidden = list.filter((o: any) => !o.auto).length
    list = list.filter((o: any) => o.auto)
  }
  return { list, hidden }
}

/* ------------------------------ подшапка ------------------------------ */
const S = D.stats
const reviewTitle = computed(() => (D.reviewHtml.match(/<span class="t">([\s\S]*?)<\/span>\s*<span class="sp">/)?.[1] ?? ''))

/* --------------------------- форма осмотра (кит) --------------------------- */
const general = ref<Record<string, string>>({ ...P.general })
const generalVisible = (f: any) => !f.dep || general.value[f.dep.k] === f.dep.v
const eqCount = D.objects.filter((o: any) => o.stageId === 'eq').length

/* -------------------------------- окна -------------------------------- */
const viewer = openWin.startsWith('viewer-')
  ? { free: H.viewerFree, assigned: H.viewerAssigned, locked: H.viewerLocked, suggest: H.viewerSuggest }[openWin.slice(7)]
  : null
const modalWin = ({ wand: H.wand, summary: H.summary, finish: H.finish } as Record<string, any>)[openWin] ?? null
const progressValue = parseFloat(H.progress.width)

const feedEl = ref<HTMLElement | null>(null)
const selbarLeft = ref('50%')
const popStyle = ref<Record<string, string>>({ visibility: 'hidden' })
onMounted(async () => {
  /* Вспышка длится 1.5 с — оснастка повторяет её по кругу, чтобы снимок её застал. */
  if (state === 'flash') {
    flashNonce.value = Date.now()
    setInterval(() => { flashNonce.value = Date.now() }, 2000)
  }
  await nextTick()
  /* Целевой шаг оснастки — в центр панели, как у перехода «Показать в структуре». */
  const target = state === 'drop' ? `${eqId}|e4` : ['link', 'flash'].includes(state) ? `${LINK.owner}|${LINK.step}` : ''
  if (target) document.querySelector(`[data-step-key="${target}"]`)?.scrollIntoView({ block: 'center' })
  if (feedEl.value) {
    const r = feedEl.value.getBoundingClientRect()
    selbarLeft.value = `${r.left + r.width / 2}px`
  }
  if (openWin === 'assign') {
    await nextTick()
    setTimeout(() => {
      const b = document.getElementById('btnToStep')?.getBoundingClientRect()
      const p = document.getElementById('pop')
      if (!b || !p) return
      const top = b.top - p.offsetHeight - 8
      popStyle.value = {
        left: `${Math.max(12, Math.min(b.left - 40, innerWidth - 372))}px`,
        top: `${top > 10 ? top : b.bottom + 8}px`,
      }
    }, 260)
  }
})

const SVG_CAR = '<svg class="car" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6l5 5 5-5"/></svg>'
const SVG_LOCK = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.4"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7"/></svg>'
const SVG_NOTE = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2.5h10v11H3z"/><path d="M5.5 6h5M5.5 9h4"/></svg>'
const SVG_PLAY = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l8 5-8 5z"/></svg>'
</script>

<template>
  <div data-theme="rososmotr" class="font-sans" :class="{ 'asis-mark': asisMark }">
    <div class="va">
      <div class="app min-w-320" data-asis="каркас экрана">
        <!-- ============================ шапка 48, §7 ============================ -->
        <div class="topbar" data-asis="шапка">
          <span class="logo">VIEWAPP</span>
          <div class="crumbs">
            <span>Осмотры</span><span>/</span><span>Демо-осмотр · мониторинг оборудования</span><span>/</span><b>Распределение свободной съёмки</b>
          </div>
          <div style="flex:1" />
          <div class="saved" data-asis="индикатор сохранения">
            <span class="dot" /><span>Все изменения сохранены</span>
          </div>
          <button class="tbtn" data-asis="кнопка «Горячие клавиши»">
            Горячие клавиши
          </button>
          <span class="kit-island">
            <Button>Завершить распределение</Button>
          </span>
        </div>

        <!-- ============================ подшапка, §7 ============================ -->
        <div class="subhead" data-asis="подшапка">
          <div v-if="view === 'review'" class="review show" data-asis="полоса приёмки">
            <span class="t" v-html="reviewTitle" />
            <span class="sp" />
            <span class="kit-island">
              <Checkbox :model-value="true">только непроверенные</Checkbox>
              <Button variant="secondary" size="sm">Отменить автораспределение</Button>
              <Button size="sm">Принять все объекты</Button>
            </span>
          </div>
          <div class="sh-row">
            <span class="sess-badge" data-asis="бейдж «Свободная съёмка»">Свободная съёмка</span>
            <span class="sess-meta" data-asis="сводка сессии">{{ D.sessMeta }}</span>
            <div class="stats">
              <div class="stat">
                <span class="kit-island">
                  <ProgressStat
                    label="Кадры разложены"
                    :value="S.framesText"
                    :progress="{ value: S.placed, max: S.total, locked: S.pre }"
                    :sub="S.pre ? `${S.pre} привязано до вас` : ''"
                  />
                </span>
              </div>
              <div class="stat">
                <span class="kit-island">
                  <ProgressStat
                    label="Обязательные шаги"
                    :value="S.reqText"
                    :progress="{ value: S.ok, max: S.req, locked: S.frz }"
                    :sub="S.frz ? `${S.frz} закрыто проверкой` : ''"
                  />
                </span>
              </div>
              <div class="stat">
                <span class="kit-island">
                  <ProgressStat label="Объекты" :value="S.objText" :sub="S.objSub" />
                </span>
              </div>
            </div>
          </div>
          <div style="height:11px" />
        </div>

        <!-- ============================ рабочая зона ============================ -->
        <div class="work" data-asis="рабочая зона">
          <div class="pane">
            <!-- тулбар ленты, §7 -->
            <div class="bar-tools" data-asis="тулбар ленты">
              <span class="kit-island">
                <Button variant="secondary">Распределить автоматически</Button>
                <Button variant="secondary">Выделить всё</Button>
                <div class="w-55 shrink">
                  <Input v-model="search" placeholder="Поиск по расшифровкам и именам файлов…" />
                </div>
              </span>
              <span id="curHint" data-asis="индикатор текущего объекта">{{ cur ? `Текущий: ${objName(O(cur))} · клавиши 1–${stageById[O(cur).stageId].steps.length}` : 'Текущий объект не выбран' }}</span>
              <div class="ctlgrp">
                <span class="segl">Разобранные</span>
                <span class="kit-island">
                  <Tabs v-model="mode">
                    <TabsList variant="pill">
                      <TabsTrigger value="keep" variant="pill">оставлять</TabsTrigger>
                      <TabsTrigger value="hide" variant="pill">убирать</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </span>
              </div>
              <div class="ctlgrp">
                <span class="segl">Размер</span>
                <span class="kit-island">
                  <Tabs v-model="size">
                    <TabsList variant="pill">
                      <TabsTrigger value="md" variant="pill">M</TabsTrigger>
                      <TabsTrigger value="lg" variant="pill">L</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </span>
              </div>
            </div>

            <!-- лента материалов, §8 -->
            <div ref="feedEl" class="feed" data-asis="лента (прокрутка)">
              <span class="kit-island">
                <div :class="frameTileGridVariants({ size })">
                  <template v-for="f in feed" :key="f.i">
                    <FrameTile v-if="f.type !== 'voice'" v-bind="tileProps(f)" @toggle-select="toggle(f.i)" />
                    <div v-else class="va">
                      <div
                        class="card voice"
                        :class="{ note: f.kind === 'note', exp: f.text.length <= 110 }"
                        data-asis="заметка"
                      >
                        <button class="pl" v-html="f.kind === 'note' ? SVG_NOTE : SVG_PLAY" />
                        <div class="vb">
                          <div class="vh">
                            <span class="vt">{{ f.kind === 'note' ? 'Текстовая заметка' : 'Голосовой комментарий' }}</span>
                            <span class="vm">{{ f.t }}</span><span v-if="f.dur" class="vm">{{ f.dur }}</span>
                          </div>
                          <div class="vx">{{ f.text }}</div>
                          <div v-if="f.kind !== 'note'" class="wv">
                            <i v-for="(h, k) in noteWave(f)" :key="k" :style="{ height: `${h}px` }" />
                          </div>
                        </div>
                        <div class="acts">
                          <button v-if="f.text.length > 110" class="copy">Показать полностью</button>
                          <button class="copy">Копировать</button>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </span>
            </div>
          </div>

          <div class="splitter" data-asis="разделитель" />

          <!-- панель структуры, §9 -->
          <div class="pane right" data-asis="панель структуры">
            <span class="kit-island">
              <Tabs v-model="tab">
                <TabsList>
                  <TabsTrigger value="scheme">Схема осмотра</TabsTrigger>
                  <TabsTrigger value="form">Форма осмотра</TabsTrigger>
                </TabsList>
              </Tabs>
            </span>

            <div class="rbody">
              <template v-if="tab === 'scheme'">
                <div class="schtools" data-asis="инструменты схемы">
                  <span class="kit-island">
                    <Button variant="secondary" size="sm">Свернуть все</Button>
                    <Button v-if="nfrz" variant="secondary" size="sm">Только открытые</Button>
                  </span>
                  <span style="font-size:12px;color:var(--va-muted);align-self:center">этапов: {{ STAGES.length }} · шагов: {{ totalSteps }}<template v-if="nfrz"> · заморожено {{ nfrz }}</template></span>
                </div>

                <div v-for="st in STAGES" :key="st.id" class="stage">
                  <button class="stage-h" data-asis="заголовок этапа">
                    <span v-html="SVG_CAR" /><span class="t">{{ st.title }}</span>
                    <span v-if="st.rep" class="rep">повторяемый</span>
                    <span class="c">{{ st.rep ? D.objects.filter((o: any) => o.stageId === st.id).length : plural(st.steps.length, 'шаг', 'шага', 'шагов') }}</span>
                  </button>
                  <div class="stage-body">
                    <template v-if="st.rep">
                      <div class="addrow" data-asis="строка добавления повтора">
                        <span class="kit-island">
                          <Button variant="secondary" size="sm">+ {{ st.id === 'bld' ? 'Новое здание' : 'Новая единица' }}</Button>
                        </span>
                      </div>
                      <div
                        v-for="o in repList(st).list"
                        :key="o.id"
                        class="obj"
                        :class="{ cur: cur === o.id, open: openObjs.has(o.id), auto: o.auto, lock: objState(o).frz > 0 }"
                      >
                        <div class="obj-h" data-asis="заголовок повтора">
                          <span class="n">{{ objName(o) }}<small>{{ objSub(o) || 'реквизиты не заполнены' }}</small></span>
                          <span v-if="o.auto" class="pillx warn">предложено</span>
                          <span v-if="objState(o).frz" class="pillx lock"><span v-html="SVG_LOCK" />{{ objState(o).frz }} проверено</span>
                          <span v-if="cur === o.id" class="curtag">текущий</span>
                          <span v-if="objState(o).bad" class="pillx err">{{ objState(o).bad }}</span>
                          <span class="c">{{ objState(o).total }}</span>
                        </div>
                        <div v-if="openObjs.has(o.id)" class="obj-body">
                          <div v-if="o.auto" class="obj-acts" data-asis="действия приёмки повтора">
                            <span class="kit-island">
                              <Button size="sm">Принять объект</Button>
                              <Button variant="secondary" size="sm">Отклонить</Button>
                            </span>
                            <span class="obj-acts-hint">кадры примутся вместе с объектом</span>
                          </div>
                          <div class="fp" data-asis="компактная форма повтора">
                            <div
                              v-for="f in formPreview(o).key"
                              :key="f.k"
                              class="fp-row"
                              :class="[f.req && !o.form[f.k] ? 'miss' : '', formPreview(o).src[f.k] ?? '']"
                            >
                              <span class="fp-l">{{ f.l }}</span>
                              <span class="fp-v">{{ o.form[f.k] || (f.req ? 'не заполнено' : '—') }}<i v-if="formPreview(o).src[f.k]" class="fp-src">{{ SRC_T[formPreview(o).src[f.k]] }}</i></span>
                            </div>
                            <div class="fp-foot">
                              <span class="fp-af">{{ o.auto ? '«по умолчанию» — не с кадра, проверьте' : '' }}</span>
                              <button class="lnk">Все поля ({{ formPreview(o).fields.length }})</button>
                              <button class="lnk">Изменить</button>
                              <button v-if="!formPreview(o).locked && !o.auto" class="lnk dim">Удалить</button>
                            </div>
                          </div>
                          <span class="kit-island">
                            <div class="flex flex-col gap-0.5">
                              <StepRow v-for="(x, k) in stageById[o.stageId].steps" :key="x.id" v-bind="stepProps(o.id, x, k)" :data-step-key="`${o.id}|${x.id}`" />
                            </div>
                          </span>
                        </div>
                      </div>
                      <div v-if="repList(st).hidden && view === 'review'" class="hintbox" data-asis="подсказка панели">
                        Принято и скрыто: {{ plural(repList(st).hidden, 'объект', 'объекта', 'объектов') }}
                      </div>
                    </template>
                    <div v-else style="padding:4px 6px 8px">
                      <span class="kit-island">
                        <div class="flex flex-col gap-0.5">
                          <StepRow v-for="(x, k) in st.steps" :key="x.id" v-bind="stepProps(st.id, x, k)" />
                        </div>
                      </span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- вкладка «Форма осмотра»: поля — кит, группы и сверка — как есть -->
              <div v-else class="gform" data-asis="форма осмотра">
                <template v-for="g in P.GENERAL" :key="g.g">
                  <div class="gl">{{ g.g }}</div>
                  <div v-for="f in g.fields.filter(generalVisible)" :key="f.k" class="grow">
                    <span class="kit-island">
                      <Field :label="f.l">
                        <Select
                          v-if="f.opts"
                          v-model="general[f.k]"
                          :show-icon="false"
                          placeholder=""
                          :items="f.opts.map((o: string) => ({ value: o, label: o }))"
                        />
                        <Input v-else v-model="general[f.k]" :show-icon="false" placeholder="" />
                      </Field>
                    </span>
                    <div v-if="f.k === 'number'" class="cmp">Оформлено единиц оборудования: <b>{{ eqCount }}</b></div>
                  </div>
                </template>
                <div class="note">
                  Общая форма схемы. «Общее количество объектов по документам» вместе с «Имущество, которое не удалось осмотреть» отвечают на вопрос, всё ли обошли.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================ панель выделения, §10.2 ============================ -->
      <div
        v-if="showSelbar"
        id="selbar"
        class="selbar show"
        :style="{ left: selbarLeft }"
        data-asis="панель выделения"
        v-html="H.selbar"
      />

      <!-- ============================ поповер «Назначить на шаг», §10.3 ============================ -->
      <div v-if="openWin === 'assign'" id="pop" class="pop show" :style="popStyle" data-asis="поповер «Назначить на шаг»">
        <div class="list" v-html="H.assign" />
      </div>

      <!-- ============================ полноэкранный просмотр, §11 ============================ -->
      <div v-if="viewer" class="lb show" data-asis="полноэкранный просмотр">
        <div class="lb-main">
          <div class="lb-top">
            <span>{{ viewer.pos }}</span><span style="color:#fff;font-weight:600">{{ viewer.file }}</span>
            <span style="display:contents" v-html="viewer.chip" />
            <div class="sp" />
            <button class="lb-close"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 4l8 8M12 4l-8 8" /></svg></button>
          </div>
          <button class="lb-nav prev"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3 5 8l5 5" /></svg></button>
          <div class="lb-stage" :class="{ on: viewer.stageOn }">
            <img :src="img(viewer.i)" alt="">
            <div style="display:contents" data-asis="нижняя плашка состояния" v-html="viewer.bind" />
          </div>
          <button class="lb-nav next"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3l5 5-5 5" /></svg></button>
        </div>
        <div class="lb-side">
          <div class="lb-meta" v-html="viewer.meta" />
          <div class="lb-list" v-html="viewer.list" />
          <div style="display:contents" v-html="viewer.note" />
        </div>
      </div>

      <!-- ============================ окна: запуск, сводки, §12, §17 ============================ -->
      <div v-if="modalWin" class="modal show" data-asis="модальное окно">
        <div class="mbox">
          <h3>{{ modalWin.title }}</h3>
          <div class="sub">{{ modalWin.sub }}</div>
          <div class="body" v-html="modalWin.body" />
          <div class="foot">
            <span class="kit-island">
              <Button v-for="b in modalWin.buttons" :key="b.t" :variant="b.primary ? 'default' : 'secondary'">{{ b.t }}</Button>
            </span>
          </div>
        </div>
      </div>

      <!-- ============================ окно прогресса, §12.5 ============================ -->
      <div v-if="openWin === 'progress'" class="wandov" data-asis="окно прогресса">
        <div class="wbox">
          <div style="display:contents" v-html="H.progress.head" />
          <div style="margin:14px 0 12px">
            <span class="kit-island">
              <Progress :value="progressValue" :max="100" label="Автораспределение" />
            </span>
          </div>
          <div v-for="(r, k) in H.progress.rows" :key="k" style="display:contents" v-html="r" />
          <div class="wfoot">
            <span class="wnote">Структура заблокирована до конца обработки</span>
            <span class="kit-island">
              <Button variant="secondary" size="sm">Прервать</Button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <AsisMarks v-if="asisMark" />
  </div>
</template>

<style src="~/stands/free-shoot/asis.css"></style>
