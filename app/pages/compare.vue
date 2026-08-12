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

/** Textarea, мастер 282:4688 — 304×640, четыре варианта столбиком. */
const textareaVariants = [
  { t: 'Textarea · пусто', x: 16, y: 16 },
  { t: 'Textarea · заполнено', x: 16, y: 172, value: VALUE },
  { t: 'Textarea · пусто · disabled', x: 16, y: 328, disabled: true },
  { t: 'Textarea · заполнено · disabled', x: 16, y: 484, value: VALUE, disabled: true },
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
        <strong>Известное исключение, намеренное:</strong> кегль значения у Атома 16/20, в коде
        15/20 — размерная шкала общая и берётся наша (<code>docs/themes.md</code>, вопрос 27).
        Интерлиньяж совпадает, поэтому высоты и отступы не меняются.
        <strong>Следствие: текстовые узлы в режиме «разница» светятся всегда.</strong> Это не
        дефект переноса и не признак ошибки. Коробки сверяются наложением, а кегль и семейство —
        автопроверкой шрифтов внизу страницы, по computed-значению.
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

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Input · состояния · спека 237:2820
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Состояний в мастере нет вовсе — они живут только на странице спецификации, отдельными
        ячейками с подписями токенов. Эталоны ниже — это сами ячейки спеки, по node id каждая.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Наведение и фокус наложением не замораживаются.</strong> Слой кода живой:
        чтобы совместить его с эталоном, наведите курсор на поле или поставьте в него каретку —
        и смотрите в режиме «разница». Значения при этом сверены отдельно, по computed-стилям.
      </p>

      <CompareFrame
        title="Hover · 255:2796 · наведите курсор на поле"
        node="255:2796"
        master="atom/input-hover_255-2796.png"
        :width="272"
        :height="40"
        note="заливка та же, но плотнее: 32% → 48%. Подпись и иконка темнеют"
      >
        <Input />
      </CompareFrame>

      <CompareFrame
        title="Pressed/Active · 255:2798 · поставьте каретку в поле"
        node="255:2798"
        master="atom/input-pressed_255-2798.png"
        :width="272"
        :height="40"
        note="плавающий плейсхолдер: подпись уезжает наверх кеглем 13, хотя значения ещё нет. В ячейке спеки нарисована каретка"
      >
        <Input />
      </CompareFrame>

      <CompareFrame
        title="HoverFilled · 394:2878 · наведите курсор"
        node="394:2878"
        master="atom/input-hover-filled_394-2878.png"
        :width="272"
        :height="40"
        note="заполненное поле под наведением: значение темнеет до самого тёмного"
      >
        <Input model-value="Input text" />
      </CompareFrame>

      <CompareFrame
        title="ErrorDefault · 255:3442"
        node="255:3442"
        master="atom/input-error_255-3442.png"
        :width="272"
        :height="40"
        note="ошибка — не рамка, а подмена заливки на красноватую. Рамки нет и здесь"
      >
        <Input invalid />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Textarea · 282:4688 · все 4 варианта
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Оси мастера — State и Disabled, состояний в нём нет. Спека <code>282:4784</code> задаёт ту
        же лестницу, что у поля ввода, и формулирует её прямым текстом:
        <strong>«bg django, opacity +16»</strong> — та же заливка плюс шестнадцать пунктов.
        Паддинги асимметричные: по бокам и снизу 16, сверху 10 в пустом и 8 в заполненном.
      </p>

      <CompareFrame
        v-for="t in textareaVariants"
        :key="t.t"
        :title="t.t"
        node="282:4688"
        master="atom/textarea_282-4688.png"
        :x="t.x"
        :y="t.y"
        :width="272"
        :height="140"
      >
        <Textarea :model-value="t.value ?? ''" :disabled="t.disabled ?? false" />
      </CompareFrame>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-bold">
        Автопроверка оптики иконок
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Наложение сравнивает бокс, а не глиф. Пикта Атома заполняет бокс целиком — в мастере
        <code>Input</code> бокс 16×16 и отрисованные границы глифа тоже 16×16. Material рисует
        глиф с полями внутри квадрата 960: у <code>search</code> контур занимает 75%, у
        <code>close</code> — 58%. При одинаковом боксе видимый глиф выходит на четверть мельче.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Оптический размер это не лечит.</strong> Замерено по официальной выгрузке:
        доля поля у <code>search</code> — 70% при opsz 20 и 75% при opsz 24 и 48. Оптический
        размер меняет толщину штриха и детализацию, а не долю поля. Рычаг один — масштаб глифа
        внутри бокса, поэтому <code>Icon</code> строит viewBox по плотным границам контура.
      </p>
      <CompareIconAudit />
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
