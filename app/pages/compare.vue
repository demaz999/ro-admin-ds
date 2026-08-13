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

/**
 * Select, мастер 434:3074 — 616×536. Левая колонка включённые, правая
 * выключенные; внутри колонки по вертикали: default/filled × закрыт/открыт,
 * сначала обычный тип, потом поверх карты.
 */
const selectVariants = [
  { t: 'filled · закрыт · пусто', x: 16, y: 24, variant: 'filled' },
  { t: 'filled · закрыт · выбрано', x: 16, y: 88, variant: 'filled', value: VALUE },
  { t: 'filled · открыт · пусто', x: 16, y: 152, variant: 'filled', open: true },
  { t: 'filled · открыт · выбрано', x: 16, y: 216, variant: 'filled', open: true, value: VALUE },
  { t: 'elevated · закрыт · пусто', x: 16, y: 280, variant: 'elevated' },
  { t: 'elevated · закрыт · выбрано', x: 16, y: 344, variant: 'elevated', value: VALUE },
  { t: 'elevated · открыт · пусто', x: 16, y: 408, variant: 'elevated', open: true },
  { t: 'elevated · открыт · выбрано', x: 16, y: 472, variant: 'elevated', open: true, value: VALUE },
  { t: 'filled · закрыт · пусто · disabled', x: 312, y: 24, variant: 'filled', disabled: true },
  { t: 'filled · закрыт · выбрано · disabled', x: 312, y: 88, variant: 'filled', value: VALUE, disabled: true },
  { t: 'filled · открыт · пусто · disabled', x: 312, y: 152, variant: 'filled', open: true, disabled: true },
  { t: 'filled · открыт · выбрано · disabled', x: 312, y: 216, variant: 'filled', open: true, value: VALUE, disabled: true },
  { t: 'elevated · закрыт · пусто · disabled', x: 312, y: 280, variant: 'elevated', disabled: true },
  { t: 'elevated · закрыт · выбрано · disabled', x: 312, y: 344, variant: 'elevated', value: VALUE, disabled: true },
  { t: 'elevated · открыт · пусто · disabled', x: 312, y: 408, variant: 'elevated', open: true, disabled: true },
  { t: 'elevated · открыт · выбрано · disabled', x: 312, y: 472, variant: 'elevated', open: true, value: VALUE, disabled: true },
] as const

/**
 * Autocomplete, мастер 3874:36379 — 616×280, восемь вариантов.
 * Смещения внутри мастера отрицательные относительно его рамки, поэтому взяты
 * как разности координат: левая колонка включённые, правая выключенные.
 */
const autocompleteVariants = [
  { t: 'filled · пусто', x: 16, y: 16, variant: 'filled' },
  { t: 'filled · заполнено', x: 16, y: 80, variant: 'filled', value: VALUE },
  { t: 'elevated · пусто', x: 16, y: 144, variant: 'elevated' },
  { t: 'elevated · заполнено', x: 16, y: 208, variant: 'elevated', value: VALUE },
  { t: 'filled · пусто · disabled', x: 312, y: 16, variant: 'filled', disabled: true },
  { t: 'filled · заполнено · disabled', x: 312, y: 80, variant: 'filled', value: VALUE, disabled: true },
  { t: 'elevated · пусто · disabled', x: 312, y: 144, variant: 'elevated', disabled: true },
  { t: 'elevated · заполнено · disabled', x: 312, y: 208, variant: 'elevated', value: VALUE, disabled: true },
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
        Button · 57:340 · брендовая колонка
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        В мастере 118 вариантов, в коде 24: цветовая ось не переносится, источником взята
        брендовая синяя колонка <code>rocky</code> (<code>#4480f3</code>). Остальные восемь
        колонок вариантов не дают. <code>Rounded</code> отдельной осью тоже не идёт — она связана
        с размером, ровно как у <code>Input</code>.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Ширина эталона — часть варианта.</strong> В мастере кнопка размера
        <code>content</code> имеет фиксированную ширину под свой текст: 141 у среднего, 87 у
        малого, 173 у большого. В коде ширина идёт по содержимому, поэтому совпадение по ширине
        зависит от подписи — сверяются высота, радиус, паддинги и цвет.
      </p>

      <CompareFrame
        title="md · залитая · 57:341"
        node="57:341"
        master="atom/btn-md_57-341.png"
        :width="141"
        :height="40"
      >
        <Button show-icon>
          Button text
        </Button>
      </CompareFrame>

      <CompareFrame
        title="md · тональная · 174:1900"
        node="174:1900"
        master="atom/btn-md-secondary_174-1900.png"
        :width="141"
        :height="40"
      >
        <Button variant="secondary" show-icon>
          Button text
        </Button>
      </CompareFrame>

      <CompareFrame
        title="sm · залитая · 57:343 · радиус 6, иконки нет"
        node="57:343"
        master="atom/btn-sm_57-343.png"
        :width="87"
        :height="24"
      >
        <Button size="sm">
          Button text
        </Button>
      </CompareFrame>

      <CompareFrame
        title="lg · залитая · 606:4957 · радиус 32"
        node="606:4957"
        master="atom/btn-lg_606-4957.png"
        :width="173"
        :height="64"
      >
        <Button size="lg" show-icon>
          Button text
        </Button>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Select · 434:3074 · все 16 вариантов
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Триггер — это поле ввода плюс шеврон: коробка 272×40, паддинги 10/16, зазор 8, радиус 8,
        рамки нет. Заливка и цветовая лестница те же, что у <code>Input</code>, поэтому он сидит
        на тех же ролях. Ось <code>Active</code> меняет ровно одно — направление шеврона.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Зазор 8 во всех шестнадцати</strong> — в отличие от <code>Input</code>, где
        заполненное состояние раздвигает контейнер до 12. Оси под это в мастере нет.
      </p>

      <CompareFrame
        v-for="s in selectVariants"
        :key="s.t"
        :title="s.t"
        node="434:3074"
        master="atom/select_434-3074.png"
        :x="s.x"
        :y="s.y"
        :width="272"
        :height="40"
      >
        <SelectTrigger
          :variant="s.variant"
          :open="s.open ?? false"
          :label="s.value ?? ''"
          :disabled="s.disabled ?? false"
        />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Select · большой размер · «Другие селекты», спека 444:3849
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Раздел спеки для лендингов, панелей и мобильных: 272×64, радиус 32, паддинги 22/24 в
        пустом и 14/24 в заполненном, зазор 8. Это ровно лесенка размера <code>lanassa</code> у
        <code>Input</code>, поэтому большой селект сел на те же роли и тот же радиус
        <code>--radius-3xl</code>. Состояния те же: 32% покой, 48% наведение, 32% нажатие.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Мастера этих селектов осиротевшие.</strong> Инстансы ведут в компоненты
        <code>3447:22552</code>, <code>3447:22560</code>, <code>3447:22590</code> с именами вида
        <code>Select/default/filled/false/false</code> — у них нет родителя и они не входят ни в
        один сет, поэтому в инвентарь файла не попали. Источником взяты ячейки спеки.
      </p>

      <CompareFrame
        title="большой · пусто · 3873:39061"
        node="3873:39061"
        master="atom/select-lg_3873-39061.png"
        :width="272"
        :height="64"
      >
        <SelectTrigger size="lg" :show-icon="false" />
      </CompareFrame>

      <CompareFrame
        title="большой · заполнено · 3873:39473"
        node="3873:39473"
        master="atom/select-lg-filled_3873-39473.png"
        :width="272"
        :height="64"
      >
        <SelectTrigger size="lg" :show-icon="false" label="Option" />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Autocomplete · 3874:36379 · все 8 вариантов
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Геометрия совпадает с <code>Input</code> до единицы — та же коробка, те же паддинги,
        зазоры, радиус и заливка. Отличие одно: <strong>крестик очистки нарисован во всех
        заполненных вариантах</strong>, тогда как у поля ввода он по умолчанию выключен.
        Своей выпадашки у мастера нет: подсказки показываются в той же плашке
        <code>PopOverList</code>.
      </p>

      <CompareFrame
        v-for="a in autocompleteVariants"
        :key="a.t"
        :title="a.t"
        node="3874:36379"
        master="atom/autocomplete_3874-36379.png"
        :x="a.x"
        :y="a.y"
        :width="272"
        :height="40"
      >
        <Autocomplete
          :variant="a.variant"
          :model-value="a.value ?? ''"
          :disabled="a.disabled ?? false"
        />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Выпадающая плашка · PopOverList 571:4889
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Ширина 320, радиус 12, фон белый, тень 0/8/32 при 12% — совпадает с нашим
        <code>--shadow-dropdown</code> до значения, рамки нет. Паддинг асимметричный,
        <code>4 / 0 / 4 / 4</code>: справа ноль, там проходит скроллбар шириной 4.
        Поиск внутри — настоящий инстанс <code>Input</code> шириной 312, включён по умолчанию;
        слот под ним в мастере скрыт.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Наложение проверяет геометрию, а не подписи строк.</strong> Текст в эталоне свой;
        сверяются коробка плашки, паддинги, высота и радиус строк, зазоры между группами.
        Эталон экспортирован с выносом тени, поэтому вырезка идёт со смещением 32.
      </p>

      <CompareFrame
        title="PopOverList · default · 663:5432"
        node="571:4889"
        master="atom/popoverlist_663-5432.png"
        :x="32"
        :y="32"
        :width="320"
        :height="304"
      >
        <SelectContent>
          <template #search>
            <Input placeholder="Search" :style="{ width: '312px' }" />
          </template>
          <SelectGroup>
            <SelectItem>Option</SelectItem>
            <SelectItem>Option</SelectItem>
            <SelectItem selected>
              Option
            </SelectItem>
            <SelectItem>Option</SelectItem>
            <SelectItem>Option</SelectItem>
            <SelectItem disabled>
              Option
            </SelectItem>
          </SelectGroup>
        </SelectContent>
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
