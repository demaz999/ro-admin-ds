<script setup lang="ts">
useHead({ title: 'Наложение — сверка с Атомом' })

/**
 * Смещения вариантов внутри мастера сняты через Plugin API как координаты
 * потомков относительно фрейма сета, поэтому вырезка попадает в вариант точно,
 * без подгонки на глаз. Эталон — экспорт 249:2768 1x, 616×632.
 *
 * Порядок строк повторяет раскладку мастера: слева включённые, справа
 * выключенные, сверху вниз — eluno default/filled, map default/filled, затем
 * то же для lanassa.
 */
const VALUE = 'Input text'

const variants = [
  // включённые, размер 40
  { t: 'filled · 40 · пусто', x: 24, y: 24, h: 40, variant: 'filled', size: 'md' },
  { t: 'filled · 40 · заполнено', x: 24, y: 88, h: 40, variant: 'filled', size: 'md', value: VALUE },
  { t: 'elevated · 40 · пусто', x: 24, y: 152, h: 40, variant: 'elevated', size: 'md' },
  { t: 'elevated · 40 · заполнено', x: 24, y: 216, h: 40, variant: 'elevated', size: 'md', value: VALUE },
  // включённые, размер 64
  { t: 'filled · 64 · пусто', x: 24, y: 280, h: 64, variant: 'filled', size: 'lg' },
  { t: 'filled · 64 · заполнено', x: 24, y: 368, h: 64, variant: 'filled', size: 'lg', value: VALUE },
  { t: 'elevated · 64 · пусто', x: 24, y: 456, h: 64, variant: 'elevated', size: 'lg' },
  { t: 'elevated · 64 · заполнено', x: 24, y: 544, h: 64, variant: 'elevated', size: 'lg', value: VALUE },
  // выключенные — правая колонка мастера
  { t: 'filled · 40 · пусто · disabled', x: 320, y: 24, h: 40, variant: 'filled', size: 'md', disabled: true },
  { t: 'filled · 40 · заполнено · disabled', x: 320, y: 88, h: 40, variant: 'filled', size: 'md', value: VALUE, disabled: true },
  { t: 'elevated · 40 · пусто · disabled', x: 320, y: 152, h: 40, variant: 'elevated', size: 'md', disabled: true },
  { t: 'elevated · 40 · заполнено · disabled', x: 320, y: 216, h: 40, variant: 'elevated', size: 'md', value: VALUE, disabled: true },
  { t: 'filled · 64 · пусто · disabled', x: 320, y: 280, h: 64, variant: 'filled', size: 'lg', disabled: true },
  { t: 'filled · 64 · заполнено · disabled', x: 320, y: 368, h: 64, variant: 'filled', size: 'lg', value: VALUE, disabled: true },
  { t: 'elevated · 64 · пусто · disabled', x: 320, y: 456, h: 64, variant: 'elevated', size: 'lg', disabled: true },
  { t: 'elevated · 64 · заполнено · disabled', x: 320, y: 544, h: 64, variant: 'elevated', size: 'lg', value: VALUE, disabled: true },
] as const
</script>

<template>
  <main data-theme="atom" class="mx-auto max-w-6xl space-y-10 px-6 py-10 font-sans">
    <header class="space-y-3">
      <p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        кит 2 · сверка
      </p>
      <h1 class="text-4xl font-bold">
        Наложение на Атом
      </h1>
      <p class="max-w-3xl text-muted-foreground">
        Эталоны — экспорт мастеров Атома 1x по node-id, лежат в <code>public/compare/atom</code>.
        Слева режим, справа прозрачность. «Разница» инвертирует наложенный слой: совпавшее
        гаснет в чёрный, расхождение светится.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Страница целиком идёт в теме <code>atom</code></strong> — на родных цветах и
        родной гарнитуре эталона (Golos Text), чтобы расхождение состава не путалось с
        расхождением цвета. Приёмочный просмотр — в <code>rososmotr</code>, на витрине.
      </p>
      <p class="max-w-3xl rounded-md border border-border bg-secondary p-3 text-sm">
        <strong>Известное расхождение, намеренное:</strong> кегль значения у Атома 16/20, в коде
        15/20 — размерная шкала общая и берётся наша (<code>docs/themes.md</code>). Интерлиньяж
        совпадает, поэтому высоты и отступы не меняются: в режиме «разница» светится только
        рисунок глифа, не коробка.
      </p>
    </header>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Input · 249:2768 · все 16 вариантов
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Оси мастера — Type, Size, State, Rounded, Disabled. Формально 32 сочетания, нарисовано 16:
        Size и Rounded связаны намертво, <code>eluno</code> бывает только с <code>Rounded=false</code>,
        <code>lanassa</code> — только с <code>Rounded=true</code>. Рамки нет ни в одном варианте.
      </p>

      <CompareFrame
        v-for="v in variants"
        :key="v.t"
        :title="v.t"
        node="249:2768"
        master="atom/input_249-2768.png"
        :x="v.x"
        :y="v.y"
        :width="272"
        :height="v.h"
      >
        <Input
          :variant="v.variant"
          :size="v.size"
          :model-value="v.value ?? ''"
          :disabled="v.disabled ?? false"
        />
      </CompareFrame>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-bold">
        Автопроверка шрифтов
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Наложение не ловит один класс дефектов: если компонент не зарегистрировался и отрисовался
        нераспознанным тегом, на эталоне просто ничего не появится, а глаз спишет это на
        прозрачность. Эта проверка идёт по computed-стилям, а не по картинке.
      </p>
      <CompareFontAudit />
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Мастер целиком
      </h2>
      <p class="text-sm text-muted-foreground">
        Эталон без наложения — чтобы видеть полную матрицу и то, чего в коде нет.
      </p>
      <figure class="space-y-2">
        <figcaption class="text-xs text-muted-foreground">
          Input · 249:2768 · 16 вариантов
        </figcaption>
        <img
          src="/compare/atom/input_249-2768.png"
          alt="Мастер Input Атома, 16 вариантов"
          class="max-w-full border border-border"
        >
      </figure>
    </section>
  </main>
</template>
