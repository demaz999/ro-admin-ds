<script setup lang="ts">
import { ref } from 'vue'

useHead({ title: 'Витрина — админский дизайн-кит' })

/**
 * Переключатель тем. Три темы на одном наборе ролей: имена переменных везде одни
 * и те же, отличаются только значения — см. docs/themes.md.
 *
 * `atom` неполна намеренно: в неё попадает только то, что показал мастер
 * очередного перенесённого компонента. Остальные роли наследуются от rososmotr,
 * поэтому переключение выглядит как частичная подмена, а не как второй бренд.
 */
const themes = [
  { value: 'rososmotr', label: 'rososmotr', note: 'рабочая тема, приёмка идёт в ней' },
  { value: 'atom', label: 'atom', note: 'сверочная: родные цвета и гарнитура эталона' },
  { value: 'viewapp', label: 'viewapp', note: 'каркас, значений пока нет' },
] as const

const theme = ref<typeof themes[number]['value']>('rososmotr')

/** Состояния Input, сведённые к осям мастера Атома 249:2768. */
const inputRows = [
  { label: 'filled · 40 · пусто', variant: 'filled', size: 'md', value: '' },
  { label: 'filled · 40 · заполнено', variant: 'filled', size: 'md', value: 'Input text' },
  { label: 'filled · 40 · disabled', variant: 'filled', size: 'md', value: 'Input text', disabled: true },
  { label: 'elevated · 40 · пусто', variant: 'elevated', size: 'md', value: '' },
  { label: 'elevated · 40 · заполнено', variant: 'elevated', size: 'md', value: 'Input text' },
  { label: 'elevated · 40 · disabled', variant: 'elevated', size: 'md', value: 'Input text', disabled: true },
  { label: 'filled · 64 · пусто', variant: 'filled', size: 'lg', value: '' },
  { label: 'filled · 64 · заполнено', variant: 'filled', size: 'lg', value: 'Input text' },
  { label: 'elevated · 64 · пусто', variant: 'elevated', size: 'lg', value: '' },
  { label: 'elevated · 64 · заполнено', variant: 'elevated', size: 'lg', value: 'Input text' },
] as const

/**
 * Восемь текстовых стилей кита. Имена слева — как в Figma; каждый стиль
 * достижим парой «кегль + начертание», отдельных утилит не заводим.
 */
const kitTextStyles = [
  { token: 'Header/bold36-40', classes: 'text-4xl font-bold', note: 'H1' },
  { token: 'Header/bold24-28', classes: 'text-2xl font-bold', note: 'H2' },
  { token: 'Header/bold20-24', classes: 'text-xl font-bold', note: 'title' },
  { token: 'Txt/bold17-24', classes: 'text-lg font-bold', note: '' },
  { token: 'Txt/bold15-20', classes: 'text-sm font-bold', note: '' },
  { token: 'Txt/medium15-20', classes: 'text-sm font-medium', note: '' },
  { token: 'Txt/regular15-20', classes: 'text-sm font-normal', note: '' },
  { token: 'Txt/bold13-16', classes: 'text-xs font-bold', note: '' },
  { token: 'Txt/regular13-16', classes: 'text-xs font-normal', note: '' },
  { token: 'Txt/bold12-16', classes: 'text-2xs font-bold', note: '' },
  { token: 'Txt/regular12-16', classes: 'text-2xs font-normal', note: '' },
]

/** Ult — это Ultra Black, самый жирный, а не UltraLight: сказано в Changelog поставки. */
const martianWeights = [
  { value: 100, name: 'Thin' },
  { value: 200, name: 'ExtraLight' },
  { value: 300, name: 'Light' },
  { value: 400, name: 'Regular' },
  { value: 500, name: 'Medium' },
  { value: 700, name: 'Bold' },
  { value: 800, name: 'ExtraBold' },
  { value: 900, name: 'Black' },
  { value: 1000, name: 'Ultra Black' },
]

const martianWidths = [
  { value: 75, name: 'Condensed' },
  { value: 87.5, name: 'Narrow' },
  { value: 100, name: 'Standard' },
  { value: 112.5, name: 'SemiWide' },
  { value: 125, name: 'Wide' },
  { value: 150, name: 'ExtraWide' },
  { value: 200, name: 'UltraWide' },
]
</script>

<template>
  <main :data-theme="theme" class="mx-auto max-w-5xl space-y-12 bg-background px-6 py-10 font-sans text-foreground">
    <header class="space-y-3">
      <p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        кит 2 · перенос Атома
      </p>
      <h1 class="text-4xl font-bold">
        Витрина админского дизайн-кита
      </h1>
      <p class="max-w-2xl text-muted-foreground">
        Токены читаются прямо из таблиц стилей документа, поэтому витрина не может разойтись с
        файлом токенов.
      </p>
      <p class="max-w-2xl rounded-md border border-border bg-secondary p-3 text-sm">
        <strong>Тема кита применена.</strong> Все 78 переменных — 69 <code>mode</code> и
        9 <code>menu</code> — перенесены; мапинг с provenance в <code>docs/tokens.md</code>,
        раздел 7. Состояния идут из токенов-расширений, не через прозрачность.
      </p>
      <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
        <strong>Основа переносится заново из дизайн-системы Атом</strong> — решение от
        2026-08-12. Компоненты волны 0, собранные по составам кита 1, отложены в
        <code>archive/kit1-components</code> до фазы обогащения. Разбивка по волнам —
        <code>docs/atom-audit.md</code>, наложение на эталоны — <code>/compare</code>.
      </p>

      <div class="flex flex-wrap items-center gap-3 pt-2">
        <span class="text-sm font-medium">Тема:</span>
        <div class="flex gap-1">
          <button
            v-for="t in themes"
            :key="t.value"
            type="button"
            :title="t.note"
            class="rounded-sm px-3 py-1.5 text-sm"
            :class="theme === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            @click="theme = t.value"
          >
            {{ t.label }}
          </button>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ themes.find(t => t.value === theme)?.note }}
        </span>
      </div>
    </header>

    <ShowcaseSection
      title="Палитра"
      note="Все цветовые токены темы. Свотч залит через var(), то есть показывает ровно то, что применится в компонентах."
    >
      <ShowcaseTokens kind="color" />
    </ShowcaseSection>

    <ShowcaseSection
      title="Радиусы"
      note="Значения --radius-* и производные от них."
    >
      <ShowcaseTokens prefix="--radius" />
    </ShowcaseSection>

    <ShowcaseSection
      title="Типографика"
      note="Семейства шрифтов темы."
    >
      <ShowcaseTokens kind="font" />

      <div class="mt-6 space-y-4">
        <p class="text-sm text-muted-foreground">
          Все одиннадцать текстовых стилей документа кита. Каждый подписан именем токена в
          Figma. Других кеглей в шкале нет: дефолты Tailwind погашены целиком, поэтому взять
          размер «из фреймворка» уже нельзя.
        </p>

        <div
          v-for="s in kitTextStyles"
          :key="s.token"
          class="flex flex-wrap items-baseline gap-x-4 border-t border-border pt-3"
        >
          <code class="w-48 shrink-0 text-xs text-muted-foreground">{{ s.token }}</code>
          <code class="w-40 shrink-0 text-xs text-muted-foreground">{{ s.classes }}</code>
          <span class="w-10 shrink-0 text-xs text-muted-foreground">{{ s.note }}</span>
          <p :class="s.classes">
            Съешь ещё этих мягких булок
          </p>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Martian Grotesk — дополнительная гарнитура"
      note="Не шрифт кита. Компоненты кита живут только на PT Root UI; эта гарнитура берётся точечно и по явному указанию."
    >
      <div class="space-y-6">
        <p class="max-w-2xl text-sm text-muted-foreground">
          63 начертания: 9 весов (100–1000, шестисотого нет) × 7 ширин (75–200%). Зарегистрированы
          одним семейством, поэтому работают ключевые слова
          <code>font-stretch: condensed</code>. Браузер грузит только применённое начертание.
        </p>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Веса
          </h3>
          <div class="space-y-1 font-display text-lg">
            <p v-for="w in martianWeights" :key="w.value" :style="{ fontWeight: w.value }">
              {{ w.value }} — {{ w.name }} · съешь ещё этих булок
            </p>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Ширины
          </h3>
          <div class="space-y-1 font-display text-lg">
            <p v-for="s in martianWidths" :key="s.value" :style="{ fontStretch: `${s.value}%` }">
              {{ s.value }}% — {{ s.name }} · Мои осмотры
            </p>
          </div>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      title="Input · волна 1"
      note="Мастер Атома 249:2768, 16 вариантов. Поле — залитая поверхность без рамки: обводки нет ни в одном из шестнадцати. Заполненное состояние перестраивает разметку — плейсхолдер уезжает наверх подписью 13/16, под ним появляется значение."
    >
      <div class="space-y-6">
        <div class="grid gap-6 sm:grid-cols-2">
          <ShowcaseCell v-for="r in inputRows" :key="r.label" :label="r.label">
            <Input
              :variant="r.variant"
              :size="r.size"
              :model-value="r.value"
              :disabled="r.disabled ?? false"
            />
          </ShowcaseCell>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Кнопка очистки
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            Булев проп мастера <code>Show ClearButton</code>, по умолчанию выключен — поэтому в
            экспорте эталона его нет ни в одном варианте и наложением он не проверяется.
            Появляется только в заполненном поле, как и в мастере.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="filled · с очисткой">
              <Input model-value="Input text" clearable />
            </ShowcaseCell>
            <ShowcaseCell label="elevated · с очисткой">
              <Input variant="elevated" model-value="Input text" clearable />
            </ShowcaseCell>
          </div>
        </div>

        <div>
          <h3 class="mb-3 text-sm font-medium">
            Состояния · спека 237:2820
          </h3>
          <p class="mb-3 max-w-2xl text-sm text-muted-foreground">
            В мастере состояний нет — они живут на странице спецификации того же файла. Наведение
            уплотняет заливку с 32% до 48%, фокус дополнительно поднимает плейсхолдер наверх
            подписью. У поля поверх карты меняется не заливка, а тень.
          </p>
          <div class="grid gap-6 sm:grid-cols-2">
            <ShowcaseCell label="Hover" hint="наведите курсор">
              <Input />
            </ShowcaseCell>
            <ShowcaseCell label="Pressed/Active" hint="поставьте каретку">
              <Input />
            </ShowcaseCell>
            <ShowcaseCell label="ErrorDefault">
              <Input invalid error-text="text about error here" />
            </ShowcaseCell>
            <ShowcaseCell label="ErrorFilled">
              <Input invalid model-value="Input text" error-text="text about error here" />
            </ShowcaseCell>
            <ShowcaseCell label="Error · elevated">
              <Input invalid variant="elevated" error-text="text about error here" />
            </ShowcaseCell>
            <ShowcaseCell label="Error · disabled">
              <Input invalid disabled model-value="Input text" />
            </ShowcaseCell>
          </div>
        </div>

        <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
          <strong>Чего у Атома нет вовсе:</strong> внешней подписи над полем, строки подсказки и
          счётчика символов — ни в мастере, ни в спеке. Это дизайн-долг с источником «архив кита 1»,
          закрывается в фазе обогащения первым приоритетом.
          См. <code>docs/design-debt.md</code>.
        </p>

        <p class="max-w-2xl rounded-md border border-border p-3 text-sm">
          <strong>Между полями формы — минимум 24px по вертикали.</strong> Правило размётки, снятое
          со спеки: два соседних поля стоят с зазором 24, метка «min 24px» стоит ровно в этом
          промежутке. Это правило раскладки, а не проп компонента.
        </p>
      </div>
    </ShowcaseSection>
  </main>
</template>
