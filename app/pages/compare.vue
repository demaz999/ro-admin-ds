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
 * Indicator, мастер Bulb 790:10402 — 396×200. Смещения сняты через Plugin API
 * как координаты вариантов относительно фрейма сета.
 *
 * Взяты только те цветовые колонки, что легли на семантические роли: точка в
 * пяти ролях, голая цифра и счётчик — в брендовой. Прочие колонки осью не
 * переносятся, накладывать их не на что.
 */
const indicatorVariants = [
  // точка, крупная — верхний ряд мастера
  { t: 'точка · md · default', x: 30, y: 24, w: 12, h: 12, type: 'dot', size: 'md', variant: 'default' },
  { t: 'точка · md · success', x: 66, y: 24, w: 12, h: 12, type: 'dot', size: 'md', variant: 'success' },
  { t: 'точка · md · warning', x: 102, y: 24, w: 12, h: 12, type: 'dot', size: 'md', variant: 'warning' },
  { t: 'точка · md · destructive', x: 138, y: 24, w: 12, h: 12, type: 'dot', size: 'md', variant: 'destructive' },
  { t: 'точка · md · neutral', x: 210, y: 24, w: 12, h: 12, type: 'dot', size: 'md', variant: 'neutral' },
  // точка, мелкая — второй ряд
  { t: 'точка · sm · default', x: 32, y: 52, w: 8, h: 8, type: 'dot', size: 'sm', variant: 'default' },
  // голая цифра: 13/16 Medium крупная, 10/12 Regular мелкая
  { t: 'цифра · md · default', x: 24, y: 84, w: 24, h: 16, type: 'text', size: 'md', variant: 'default' },
  { t: 'цифра · sm · default', x: 27, y: 124, w: 18, h: 12, type: 'text', size: 'sm', variant: 'default' },
  // счётчик — нижний ряд, размер в мастере один
  { t: 'счётчик · default', x: 27, y: 160, w: 26, h: 16, type: 'counter', size: 'md', variant: 'default' },
] as const

/**
 * Field, мастер `input` 720:11753 КИТА 1 — 2429×757. Эталон из архива:
 * archive/kit1-components/reference/input_720-11753.png.
 *
 * Наложение здесь проверяет **обвязку, а не контрол**: подпись, зазоры и строку
 * подсказки. Само поле внутри — атомовское, и выглядит иначе, чем в ките 1:
 * у Атома залитая поверхность без рамки, у кита 1 белое поле с обводкой 1px.
 * Это ожидаемо и не является расхождением — ядро мы не трогаем.
 */
const fieldCompare = [
  { t: 'подпись сверху · 40', x: 614, y: 16, w: 464, h: 88, orientation: 'top', invalid: false },
  { t: 'подпись сверху · заполнено', x: 610, y: 295, w: 464, h: 88, orientation: 'top', invalid: false, value: 'Input text' },
  { t: 'подпись слева · 40', x: 16, y: 44, w: 544, h: 60, orientation: 'left', invalid: false },
  { t: 'подпись слева · ошибка', x: 16, y: 449, w: 544, h: 60, orientation: 'left', invalid: true },
] as const

/**
 * MenuItem, мастер _MenuItemMaster 3465:22566 — 328×376.
 *
 * Наведение в мастере не нарисовано: оно живёт в таблице состояний спеки
 * 832:20679, колонка на x=468. Оттуда же снято, что подложка ходит плотностью
 * одной нейтрали — 8% на наведении, 12% на выборе, — а подпись у них одна.
 */
const menuItemCompare = [
  { t: 'покой', x: 16, y: 16, w: 296, h: 44, compact: false, selected: false, disabled: false },
  { t: 'выбран', x: 16, y: 76, w: 296, h: 44, compact: false, selected: true, disabled: false },
  { t: 'компактный', x: 16, y: 136, w: 56, h: 44, compact: true, selected: false, disabled: false },
  { t: 'компактный · выбран', x: 16, y: 196, w: 56, h: 44, compact: true, selected: true, disabled: false },
  { t: 'выключен', x: 16, y: 256, w: 296, h: 44, compact: false, selected: false, disabled: true },
  { t: 'компактный · выключен', x: 16, y: 316, w: 56, h: 44, compact: true, selected: false, disabled: true },
] as const

/**
 * MenuSub, мастер _MenuItem 3497:23069 — 328×680.
 *
 * Единственный вариант с раскрытым списком — C=true S=true K=false, высота 228
 * против 44 у остальных семи. Это и есть уточнение ловушки: `Collapse` означает
 * «есть подменю», а раскрытым его нарисовали только на выбранной строке.
 */
const menuSubCompare = [
  { t: 'есть подменю · свёрнут', x: 16, y: 16, w: 296, h: 44, open: false, selected: false },
  { t: 'есть подменю · выбран · РАСКРЫТ', x: 16, y: 76, w: 296, h: 228, open: true, selected: true },
  { t: 'без подменю', x: 16, y: 320, w: 296, h: 44, open: false, selected: false, plain: true },
  { t: 'без подменю · выбран', x: 16, y: 380, w: 296, h: 44, open: false, selected: true, plain: true },
] as const

/**
 * Badge, мастер 913:8279 — 227×432. Крупные в левой колонке, мелкие в правой.
 * Наложены шесть колонок, легших на роли; четыре декоративные не переносятся.
 */
const badgeCompare = [
  { t: 'md · default', x: 24, y: 24, w: 92, h: 24, size: 'md', variant: 'default' },
  { t: 'md · success', x: 24, y: 64, w: 92, h: 24, size: 'md', variant: 'success' },
  { t: 'md · warning', x: 24, y: 104, w: 92, h: 24, size: 'md', variant: 'warning' },
  { t: 'md · destructive', x: 24, y: 144, w: 92, h: 24, size: 'md', variant: 'destructive' },
  { t: 'md · neutral', x: 24, y: 344, w: 92, h: 24, size: 'md', variant: 'neutral' },
  { t: 'md · inverse', x: 24, y: 384, w: 92, h: 24, size: 'md', variant: 'inverse' },
  { t: 'sm · default', x: 132, y: 28, w: 69, h: 16, size: 'sm', variant: 'default' },
  { t: 'sm · success', x: 132, y: 68, w: 69, h: 16, size: 'sm', variant: 'success' },
  { t: 'sm · warning', x: 132, y: 108, w: 69, h: 16, size: 'sm', variant: 'warning' },
  { t: 'sm · destructive', x: 132, y: 148, w: 69, h: 16, size: 'sm', variant: 'destructive' },
  { t: 'sm · neutral', x: 132, y: 348, w: 69, h: 16, size: 'sm', variant: 'neutral' },
  { t: 'sm · inverse', x: 132, y: 388, w: 69, h: 16, size: 'sm', variant: 'inverse' },
] as const

/**
 * Avatar, мастер 3488:24229 — 472×680. Размеры идут по горизонтали от крупного
 * к мелкому, типы — по вертикали: иконка плотная, иконка мягкая, буква плотная,
 * буква мягкая, фотография.
 */
const avatarCompare = [
  { t: 'иконка · 104', x: 32, y: 32, s: 104, size: 104, variant: 'solid', type: 'icon' },
  { t: 'иконка · 72', x: 152, y: 48, s: 72, size: 72, variant: 'solid', type: 'icon' },
  { t: 'иконка · 56', x: 240, y: 56, s: 56, size: 56, variant: 'solid', type: 'icon' },
  { t: 'иконка · 40', x: 312, y: 64, s: 40, size: 40, variant: 'solid', type: 'icon' },
  { t: 'иконка · 32', x: 368, y: 68, s: 32, size: 32, variant: 'solid', type: 'icon' },
  { t: 'иконка · 24', x: 416, y: 72, s: 24, size: 24, variant: 'solid', type: 'icon' },
  { t: 'иконка · 40 · soft', x: 312, y: 192, s: 40, size: 40, variant: 'soft', type: 'icon' },
  { t: 'иконка · 104 · soft', x: 32, y: 160, s: 104, size: 104, variant: 'soft', type: 'icon' },
  // Буква — только три младших размера: у крупных ступени display, решение 30.
  { t: 'буква · 40', x: 312, y: 320, s: 40, size: 40, variant: 'solid', type: 'letter' },
  { t: 'буква · 32', x: 368, y: 324, s: 32, size: 32, variant: 'solid', type: 'letter' },
  { t: 'буква · 24', x: 416, y: 328, s: 24, size: 24, variant: 'solid', type: 'letter' },
  { t: 'буква · 40 · soft', x: 312, y: 448, s: 40, size: 40, variant: 'soft', type: 'letter' },
] as const

/**
 * Spinner, мастер 134:1768 — 568×104. Брендовая колонка слева, белая справа;
 * белую накладывать не на что светлом фоне, поэтому взята только брендовая.
 */
const spinnerCompare = [
  { t: '72', x: 16, y: 16, s: 72, size: 'xl' },
  { t: '48', x: 104, y: 40, s: 48, size: 'lg' },
  { t: '32', x: 168, y: 56, s: 32, size: 'md' },
  { t: '20', x: 216, y: 68, s: 20, size: 'sm' },
  { t: '16', x: 252, y: 72, s: 16, size: 'xs' },
] as const

/**
 * Tooltip, мастер 834:10127 — 314×228. Семь положений хвостика; в наложение
 * идёт сама плашка, положение проверяется отдельно — оно задаётся примитивом.
 */
const tooltipCompare = [
  { t: 'left-bottom → side=top align=start', x: 24, y: 24, w: 119, h: 30 },
  { t: 'left-up → side=bottom align=start', x: 24, y: 70, w: 119, h: 30 },
  { t: 'right-bottom → side=top align=end', x: 171, y: 24, w: 119, h: 30 },
  { t: 'right-up → side=bottom align=end', x: 171, y: 70, w: 119, h: 30 },
  { t: 'none → без хвостика', x: 24, y: 180, w: 119, h: 24 },
] as const

/**
 * Timer, мастер 6344:55714 — 180×160. Полный крест Number × Size, все шесть
 * вариантов нарисованы, поэтому накладываются все.
 *
 * Доля отсчёта в мастере запечена в вектор: у крупного она видна как сектор
 * примерно в четверть круга. В коде это проп, здесь выставлен в то же значение.
 */
const timerCompare = [
  { t: 'lg · 48', x: 24, y: 24, s: 48, size: 'lg', num: false },
  { t: 'lg · 48 · с цифрой', x: 24, y: 88, s: 48, size: 'lg', num: true },
  { t: 'md · 32', x: 88, y: 32, s: 32, size: 'md', num: false },
  { t: 'md · 32 · с цифрой', x: 88, y: 96, s: 32, size: 'md', num: true },
  { t: 'sm · 20', x: 136, y: 38, s: 20, size: 'sm', num: false },
  { t: 'sm · 20 · с цифрой', x: 136, y: 102, s: 20, size: 'sm', num: true },
] as const

/**
 * Alert, мастер Notification 5883:58974. Экспорт 424×284 шире бокса сета на 16
 * по горизонтали — тень плашки выходит за габарит и попадает в рендер. Левый
 * край карточек поэтому 32, а не 24: смещение замерено по самому экспорту
 * (первый чисто белый пиксель), а не выведено из габаритов.
 */
const alertCompare = [
  { t: 'default · без иконки', y: 24, type: 'default', icon: false },
  { t: 'default · с иконкой', y: 100, type: 'default', icon: true },
  { t: 'timer', y: 176, type: 'timer', icon: true },
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

    <!--
      Страница «Мои осмотры» — приёмка сборки. Эталон здесь не мастер Атома, а
      макет страницы из файла дашборда, поэтому секция идёт в теме rososmotr:
      макет нарисован в ней.
    -->
    <section data-theme="rososmotr" class="space-y-2 bg-background font-sans text-foreground">
      <h2 class="text-lg font-bold">
        Страница «Мои осмотры» · макет 20304:54594 · сборка из реестра
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Эталон — экспорт кадра 1x, 1280×1764. Страница вставлена рамкой на ту же ширину, поэтому
        сверяется ровно та раскладка, что нарисована. Разбор каждого расхождения по категориям —
        <code>docs/page-my-inspections.md</code>.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Весь контент сдвинут влево на 28px, и это одна дыра, а не сто.</strong> Рельс
        меню у Атома 56 шириной, на макете 84 — разница уходит в общий сдвиг колонок. Второй
        кадр ниже сдвигает страницу на те же 28px, чтобы за этим смещением стали видны
        остальные расхождения.
      </p>

      <div class="overflow-x-auto">
        <CompareFrame
          title="страница целиком · как есть"
          node="20304:54594"
          master="page/my-inspections_20304-54594.png"
          :width="1280"
          :height="1764"
          note="Сдвиг 28px по горизонтали — ширина рельса. Всё остальное сверяется на втором кадре."
        >
          <!--
            Рамка выше кадра и обрезана снаружи: иначе внутри появляется
            вертикальный скроллбар, съедает 15px ширины и вся раскладка внутри
            считается не по той ширине.
          -->
          <div style="width: 1280px; height: 1764px; overflow: hidden">
            <iframe
              src="/my-inspections"
              title="Мои осмотры"
              class="border-0"
              style="width: 1280px; height: 2100px"
            />
          </div>
        </CompareFrame>
      </div>

      <div class="overflow-x-auto">
        <CompareFrame
          title="страница целиком · с компенсацией рельса"
          node="20304:54594"
          master="page/my-inspections_20304-54594.png"
          :width="1280"
          :height="1764"
          note="Дыра рельса скомпенсирована дважды: рамка уже на 44 — тогда гибкая колонка возвращается к 744 — и сдвинута вправо на 28. Всё, что светится здесь, уже не рельс."
        >
          <div style="width: 1280px; height: 1764px; overflow: hidden">
            <iframe
              src="/my-inspections"
              title="Мои осмотры со сдвигом"
              class="border-0"
              style="width: 1236px; height: 2100px; margin-left: 28px"
            />
          </div>
        </CompareFrame>
      </div>
    </section>

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
        ButtonArrow · 1938:12858 · вся матрица
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Единственный мастер волны **без цветовой оси**, поэтому переносится целиком: 12 вариантов
        из 12. Радиус во всех трёх размерах — ровно половина бокса, то есть круг. У залитого типа
        тень <code>0/4/16</code>, та же что у поля поверх карты: кнопка рассчитана лежать на
        изображении. Эталон экспортирован с выносом тени, поэтому вырезка со смещением 16.
      </p>

      <CompareFrame
        title="md · elevated · 1938:12859"
        node="1938:12859"
        master="atom/btnarrow-md_1938-12859.png"
        :x="16"
        :y="16"
        :width="32"
        :height="32"
      >
        <ButtonArrow label="Назад" />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Tag · ButtonTag 256:3601 · брендовая колонка
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Высота 24, радиус 16, паддинги 4/12, зазор 4, кегль 13, маркер-точка 8×8 слева.
        Крестика и счётчика в мастере нет — снять тег нельзя и он ничего не считает, поэтому это
        не <code>Chip</code>. Точка в обычном состоянии светлее текста: она пастельная.
      </p>

      <CompareFrame
        title="активный · 256:3585"
        node="256:3585"
        master="atom/tag-active_256-3585.png"
        :width="107"
        :height="24"
      >
        <Tag active>
          Button text
        </Tag>
      </CompareFrame>

      <CompareFrame
        title="обычный · 256:3600"
        node="256:3600"
        master="atom/tag_256-3600.png"
        :width="107"
        :height="24"
      >
        <Tag>Button text</Tag>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        IconButton · ButtonSimple 110:1566 · брендовая колонка
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Самый крупный мастер файла — 186 вариантов, в коде 42. Это отдельный компонент, а не
        <code>Button</code> без подписи: текстового пропа у мастера нет вовсе. Заливка лежит на
        вложенном прямоугольнике, а у типа <code>transparent</code> его нет — не задан прозрачным,
        а отсутствует.
      </p>

      <CompareFrame
        title="lg · залитая · 110:1565 · бокс 40, глиф 20"
        node="110:1565"
        master="atom/iconbtn-lg_110-1565.png"
        :width="40"
        :height="40"
      >
        <IconButton size="lg" label="Метка" />
      </CompareFrame>

      <CompareFrame
        title="md · залитая · 110:1567 · бокс 32, глиф 16, радиус 6"
        node="110:1567"
        master="atom/iconbtn-md_110-1567.png"
        :width="32"
        :height="32"
      >
        <IconButton label="Метка" />
      </CompareFrame>

      <CompareFrame
        title="lg · тональная · 197:1582"
        node="197:1582"
        master="atom/iconbtn-lg-secondary_197-1582.png"
        :width="40"
        :height="40"
      >
        <IconButton size="lg" variant="secondary" label="Метка" />
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

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Indicator · 790:10402 · срез матрицы
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Спека <code>1858:11709</code> подписывает компонент
        <strong>«Неинтерактивный»</strong> — состояний у него нет по объявлению, а не по
        недосмотру. 47 вариантов мастера — не полный крест: у точки девять цветов и два
        размера, у голой цифры десять цветов (плюс белый) и два размера, у счётчика девять
        цветов и <strong>только крупный</strong> размер.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        Ниже наложены только те колонки, что легли на наши семантические роли. Остальные
        цветовые колонки осью не переносятся (решение 23), поэтому в коде 27 достижимых
        сочетаний против 47 в мастере — расхождение записано в <code>docs/waves.md</code>.
      </p>

      <CompareFrame
        v-for="b in indicatorVariants"
        :key="b.t"
        :title="b.t"
        node="790:10402"
        master="atom/bulb_790-10402.png"
        :x="b.x"
        :y="b.y"
        :width="b.w"
        :height="b.h"
      >
        <Indicator :variant="b.variant" :type="b.type" :size="b.size">
          99+
        </Indicator>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Field · кит 1, 720:11753 · фаза обогащения
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Первый компонент фазы обогащения. У Атома нет ни подписи, ни подсказки, ни счётчика —
        ни в мастере <code>249:2768</code>, ни в спеке. Обвязка приехала из архива кита 1 и
        надстроена <strong>над</strong> атомовским ядром, а не вместо него.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Наложение проверяет обвязку, а не контрол.</strong> Подпись, зазоры (8 до поля,
        4 до подсказки) и строка подсказки высотой 16 обязаны совпасть. Само поле внутри —
        атомовское, и выглядит иначе: у Атома залитая поверхность без рамки, у кита 1 белое поле
        с обводкой 1px. Это ожидаемо, ядро мы не трогаем.
      </p>

      <CompareFrame
        v-for="f in fieldCompare"
        :key="f.t"
        :title="f.t"
        node="720:11753"
        master="kit1/input_720-11753.png"
        :x="f.x"
        :y="f.y"
        :width="f.w"
        :height="f.h"
      >
        <Field
          label="Подпись"
          :orientation="f.orientation"
          hint="Подсказка под полем"
          counter="10/25"
          :invalid="f.invalid"
        >
          <Input :model-value="f.value ?? ''" placeholder="Placeholder" :invalid="f.invalid" />
        </Field>
      </CompareFrame>
    </section>

    <!--
      Очередь 2 обогащения. Эталоны здесь из КИТА 1, а не из Атома, поэтому
      секция идёт в теме rososmotr: в теме atom заливки поехали бы, и
      расхождение состава смешалось бы с расхождением цвета.
    -->
    <section data-theme="rososmotr" class="space-y-2 bg-background font-sans text-foreground">
      <h2 class="text-lg font-bold">
        Chip · кит 1, 747:2464 · очередь 2
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Задание предполагало реконструкцию по справочнику значений: исходника нет. Замер показал
        обратное — мастер жив, лежит на странице «Badge», 149×32. Поэтому здесь обычный перенос
        с наложением. Ширина складывается ровно: 16 + (73 + 4 + 16) + 8 + 16 + 16 = 149.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Крестик — исключение из правила глифа.</strong> У Атома пикта заполняет свой бокс
        по доминирующей стороне; у кита 1 пикта <code>20_ic_close</code> живёт в коробке 16×16, а
        её видимый контур — 9.4. Поэтому размер иконки задан по контуру эталона, а не по коробке.
      </p>

      <CompareFrame
        title="как в мастере: подпись, счётчик, крестик"
        node="747:2464"
        master="kit1/chip_747-2464.png"
        :width="149"
        :height="32"
      >
        <Chip count="8">
          Badge text
        </Chip>
      </CompareFrame>
    </section>

    <section data-theme="rososmotr" class="space-y-2 bg-background font-sans text-foreground">
      <h2 class="text-lg font-bold">
        Slider · кит 1, 2034:5889 · очередь 2
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Эталон 75×12: сама дорожка 4, но бегунок 12 выступает над ней на 4 сверху и снизу, и
        отрисованные границы считаются по нему. Бегунок в мастере стоит на 8…20 из 75 — это
        12.7% хода при ширине бегунка 12.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Слева наложение разойдётся, и это ожидаемо.</strong> В мастере обе половины
        дорожки одного серого — залитой части нет вовсе. Восемь пикселей брендовой заливки до
        бегунка добавлены дефолтом и помечены <code>@debt</code>: без них контрол не сообщает
        значение.
      </p>

      <CompareFrame
        title="дорожка 4, бегунок 12"
        node="2034:5889"
        master="kit1/range-slider_2034-5889.png"
        :width="75"
        :height="12"
      >
        <!--
          Отступ 4 сверху: у эталона отрисовка 75×12 считается по бегунку, и
          сама дорожка лежит на 4…8. Корень слайдера высотой 4, бегунок
          выступает за него, поэтому опускаем на те же 4.

          18.7% — не «на глаз»: центр бегунка в мастере приходится на 14 из 75,
          а Reka ставит бегунок центром на процент хода, без поправки на ширину.
        -->
        <div class="pt-1">
          <Slider :model-value="[18.7]" :step="0.1" class="w-full" />
        </div>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        StatusLetter · _BulbStatus 5862:53423 · очередь 2
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Мастер разобран ещё волной 7 и тогда же сознательно не заведён компонентом: единственная
        ось у него цветовая. Очередь 2 снимает возражение — цвет здесь данные, а не ось, ровно
        как у <code>StatusBadge</code>.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Наложение проверяет геометрию и букву, а не цвет.</strong> Заливка эталона —
        пастельная колонка Атома <code>#7daffc</code>, у нас расширенная палитра: цвет статуса
        приходит с сервера и темой не задаётся. Совпасть обязаны круг 20×20, кегль 13/16 Bold и
        положение буквы.
      </p>

      <CompareFrame
        title="метка 20×20, буква по центру"
        node="5862:53422"
        master="atom/bulbstatus_5862-53422.png"
        :width="20"
        :height="20"
      >
        <StatusLetter letter="А" color="cyan" />
      </CompareFrame>
    </section>

    <!--
      Очередь 3. Провенанс здесь слабее обычного: у модального окна и лайтбокса
      мастеров нет, состав снят с композиций. Поэтому в кадре стоят конкретные
      узлы композиций, а не «модальное окно вообще».
    -->
    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Dialog · композиция 6626:56959 · очередь 3
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Живой пример окна на широком экране. Колонка контента — 8 колонок из 12 с гуттером 32:
        при 1360 это ровно 842. Ритм колонки — иконка → заголовок 24, заголовок → текст 16,
        текст → кнопки 32; кнопки делят колонку пополам с тем же гуттером.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Окно во весь экран, подложки нет.</strong> Так написано на странице спеки, и так
        собрано в коде. На витрине окно занимает браузер целиком — сюда оно положено
        <code>inline</code>, то есть без портала и во весь кадр: иначе <code>fixed</code> унёс бы
        его из наложения на страницу.
      </p>

      <div class="overflow-x-auto">
        <CompareFrame
          title="окно целиком · wide 1360"
          node="6626:56959"
          master="atom/modal_6626-56959.png"
          :width="1360"
          :height="780"
        >
          <Dialog :open="true" :modal="false">
            <DialogContent inline back="К контрольной точке" :trap-focus="false">
              <DialogHeader class="pt-35">
                <!-- Держатель 56×56 с композиции: галочка внутри рисует 56×40. -->
                <span data-slot="dialog-icon" class="flex size-14 items-start text-success">
                  <Icon name="check" :size="56" />
                </span>
                <DialogTitle>Заголовок в форме вопроса или утверждения</DialogTitle>
                <DialogDescription>
                  Функциональность решения покрывает практически все задачи, выполняемые
                  оперативным персоналом крупных промышленных объектов, связанных с опасным
                  производством: от формирования рабочих сменных бригад, подготовки расписания их
                  работы до составления маршрутов обходов, выполнения, анализа их результатов и
                  ведения многочисленных оперативных журналов
                </DialogDescription>
                <div class="mt-4 grid grid-cols-2 gap-8">
                  <Button variant="secondary" class="w-full">
                    Отменить
                  </Button>
                  <Button class="w-full">
                    Подтвердить
                  </Button>
                </div>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </CompareFrame>
      </div>

      <p class="max-w-3xl pt-4 text-sm text-muted-foreground">
        Вторая сверка — раскладочная схема на средней ширине. Здесь проверяются те величины,
        которые на широком экране другие: шапка 44 вместо 60, боковой паддинг 32 вместо 40,
        крестик в 2 от края вместо 10, и блок кнопок 96 внизу. Плашки «Content area» и
        «Controls area» — разметка самой схемы, в коде им ничего не соответствует.
      </p>

      <CompareFrame
        title="схема со скроллом · middle 598"
        node="1156:10272"
        master="atom/modal-scroll_1156-10272.png"
        :width="598"
        :height="480"
        note="Совпасть обязаны шапка, положение возврата и крестика, боковые паддинги и блок кнопок. Заливки плашек — разметка схемы."
      >
        <Dialog :open="true" :modal="false">
          <DialogContent inline back="Button text" :trap-focus="false">
            <div class="h-full" />
            <template #footer>
              <DialogFooter layout="full">
                <Button class="w-full">
                  Controls area
                </Button>
              </DialogFooter>
            </template>
          </DialogContent>
        </Dialog>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Lightbox · композиция 8867:69956 · очередь 3
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Полосы 56 и 64, кадр с боковым паддингом 48, счётчик <code>Badge</code> в 16 от края,
        крестик в 8. Стрелки прижаты к краям и центрируются <strong>по кадру</strong>: при высоте
        640 их центр приходится на 316, то есть на середину области между полосами, а не окна.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Дефект, найденный этой сверкой.</strong> Лайтбокс инстанцирует крупную
        <code>ButtonArrow</code>, и наложение показало, что шеврон у неё короче эталона на 8px.
        Причина в волне 5: с мастера сняли <strong>ширину</strong> глифа (12 против 6) и
        подставили её как размер, а размер у <code>Icon</code> — это доминирующая сторона, то есть
        высота. Замер всех шести вариантов `1938:12858` даёт 32 / 16 / 12. Исправлено.
      </p>

      <CompareFrame
        title="кадр целиком · wide 1024"
        node="8867:69956"
        master="atom/lightbox_8867-69956.png"
        :width="1024"
        :height="640"
        note="Фотография эталона в коде не воспроизводится — вместо неё пустая рамка кадра. Сверяются полосы, счётчик, крестик, стрелки и подпись."
      >
        <Lightbox
          inline
          :open="true"
          :index="1"
          :total="3"
          caption="«50 лет Победы» — самый большой и современный из арктических атомоходов"
        />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        MenuItem · 3465:22566 · все 6 вариантов
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Оси <code>Compact</code> × <code>Selected</code> × <code>Disabled</code> дают формально
        восемь сочетаний, нарисовано шесть: <strong>выключенного выбранного не бывает</strong> ни
        в одном режиме. Компактный пункт — 56 шириной, не по содержимому.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Меню Атома светлое — правило тёмного сайдбара это не отменяет.</strong> С мастера
        берутся состав и геометрия, цвет приходит из темы: в rososmotr меню тёмное, а сверочные
        значения Атома лежат в теме <code>atom</code>, чтобы наложение шло на родных цветах.
        Подложка ходит <strong>плотностью одной нейтрали</strong>: покоя нет вовсе, наведение 8%,
        выбор 12% — та же мягкая ступень, что у строки списка.
      </p>

      <CompareFrame
        v-for="mi in menuItemCompare"
        :key="mi.t"
        :title="mi.t"
        node="3465:22566"
        master="atom/menuitem_3465-22566.png"
        :x="mi.x"
        :y="mi.y"
        :width="mi.w"
        :height="mi.h"
      >
        <MenuItem
          :compact="mi.compact"
          :selected="mi.selected"
          :disabled="mi.disabled"
        >
          Title
        </MenuItem>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        MenuSub · 3497:23069 · раскрытое подменю
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Вложенный список рисуется <strong>только</strong> при <code>Collapse=true</code> вместе с
        <code>Selected=true</code>: у этой комбинации высота 228, у остальных семи ровно 44.
        Отсюда уточнение ловушки — <code>Collapse</code> означает «у пункта есть подменю», а
        раскрытым его нарисовали лишь на выбранной строке.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        Направляющая подменю — <strong>2×174 на мягкой ступени</strong>, шестая её встреча в
        мастерах Атома. Строки второго уровня начинаются с 29, направляющая с 23, между ними
        ровно 4. Обе величины вне шкалы кратности четырём, поэтому объявлены отдельными
        спейсингами: «ближайшее» сдвинуло бы направляющую относительно иконки родителя.
      </p>

      <CompareFrame
        v-for="ms in menuSubCompare"
        :key="ms.t"
        :title="ms.t"
        node="3497:23069"
        master="atom/menusub_3497-23069.png"
        :x="ms.x"
        :y="ms.y"
        :width="ms.w"
        :height="ms.h"
      >
        <MenuItem v-if="ms.plain" :selected="ms.selected">
          Title
        </MenuItem>
        <MenuSub v-else :open="ms.open" :selected="ms.selected">
          Title
          <template #items>
            <MenuItem v-for="n in 4" :key="n">
              Title
            </MenuItem>
          </template>
        </MenuSub>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Badge · 913:8279 · шесть колонок из десяти
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Ось <code>Inversion</code> не независима: белый вариант существует только при
        <code>true</code>, остальные девять только при <code>false</code> — та же связка, что у
        <code>Size</code> и <code>Rounded</code> у поля ввода. Поэтому отдельного пропа нет,
        инверсия это роль. Начертание <strong>Regular</strong>, не Bold, как было в ките 1.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        Четыре колонки — розовая, фиолетовая, бирюзовая и жёлтая — не перенесены: роли за ними
        не стоит, это различение, а не сообщение. Накладывать их не на что, и это не пропуск.
      </p>

      <CompareFrame
        v-for="b in badgeCompare"
        :key="b.t"
        :title="b.t"
        node="913:8279"
        master="atom/badge_913-8279.png"
        :x="b.x"
        :y="b.y"
        :width="b.w"
        :height="b.h"
      >
        <Badge :variant="b.variant" :size="b.size">
          Badge text
        </Badge>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Avatar · 3488:24229 · срез матрицы
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Ни глиф, ни кегль не масштабируются долей от стороны — обе лестницы сняты поштучно:
        иконка 16 / 16 / 16 / 20 / 32 / 56, буква 13 / 16 / 20 / 28 / 40 / 56. Радиус во всех
        вариантах заведомо больше половины стороны, то есть это круг.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Буква есть только у трёх младших размеров.</strong> Ступени 28/32, 40/44 и 56/56
        — это стили <code>ricotta</code>, <code>cheddar</code> и <code>gouda</code>, те самые,
        что решение 30 объявило сайтовым слоем на <code>ButtonNavigation</code>. Применён его
        прецедент: перенесены размеры, легшие в шкалу точно.
      </p>

      <CompareFrame
        v-for="a in avatarCompare"
        :key="a.t"
        :title="a.t"
        node="3488:24229"
        master="atom/avatar_3488-24229.png"
        :x="a.x"
        :y="a.y"
        :width="a.s"
        :height="a.s"
      >
        <Avatar :type="a.type" :variant="a.variant" :size="a.size" letter="А" />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Spinner · 134:1768 · брендовая колонка
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Кольцо с угловой заливкой, стопы с мастера: брендовый на <strong>12%</strong> →
        он же на 100%. То есть кольцо не исчезает совсем, а гаснет до того же уровня, на котором
        сидит подложка таймера. Толщина непропорциональна стороне — 4 / 4 / 4 / 5 / 6, замерено
        по экспорту.
      </p>

      <CompareFrame
        v-for="s in spinnerCompare"
        :key="s.t"
        :title="s.t"
        node="134:1768"
        master="atom/spinner_134-1768.png"
        :x="s.x"
        :y="s.y"
        :width="s.s"
        :height="s.s"
      >
        <Spinner :size="s.size" />
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Tooltip · 834:10127 · плашка
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Семь значений оси — это положения хвостика, а не стили; разложены на <code>side</code> ×
        <code>align</code>. Имена оси читаются наоборот привычного: <code>left-up</code> — это
        хвостик сверху слева, то есть плашка стоит <strong>под</strong> областью.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        Накладывается сама плашка: положение относительно области задаёт примитив, и на статичной
        витрине его не показать. Тень у подсказки средняя (<code>0 / 4 / 16</code>), а не как у
        выпадашки — подсказка лежит ниже плашки списка.
      </p>

      <CompareFrame
        v-for="tt in tooltipCompare"
        :key="tt.t"
        :title="tt.t"
        node="834:10127"
        master="atom/tooltip_834-10127.png"
        :x="tt.x"
        :y="tt.y"
        :width="tt.w"
        :height="tt.h"
      >
        <div class="w-[119px] rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-elevated">
          Tooltip text here
        </div>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Timer · 6344:55714 · все 6 вариантов
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Внутри мастера ровно два вектора: подложка во всю сторону на
        <strong>12%</strong> и сектор отсчёта на 100%. Дырки в середине нет —
        это <strong>сектор, а не кольцо</strong>, поэтому в коде конический
        градиент, а не обводка. Полный крест: обе оси нарисованы целиком.
      </p>

      <CompareFrame
        v-for="t in timerCompare"
        :key="t.t"
        :title="t.t"
        node="6344:55714"
        master="atom/timer_6344-55714.png"
        :x="t.x"
        :y="t.y"
        :width="t.s"
        :height="t.s"
      >
        <Timer :size="t.size" :show-number="t.num" :value="0.25">
          5
        </Timer>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Alert · 5883:58974 · все 3 варианта
      </h2>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Оси <code>Type</code> × <code>Show icon</code> дают формально четыре
        сочетания, нарисовано три: у <code>timer</code> варианта без иконки не
        существует — таймер занимает то же место слева. Крестик и таймер
        взаимоисключающи: плашка с отсчётом закрывается сама, и крестика в
        мастере там нет.
      </p>
      <p class="max-w-3xl rounded-md border border-border p-3 text-sm">
        <strong>Известное расхождение.</strong> Кегль действия в мастере 16/20, а
        у перенесённого <code>ButtonAction</code> его нет: внутри уведомления
        инстанцирован другой мастер — <code>1028:8221</code>, — а не тот, с
        которого волна 2 переносила компонент. Два живых мастера под одним именем
        — противоречие, оно уходит в <code>open-questions.md</code>, а не
        чинится здесь.
      </p>

      <CompareFrame
        v-for="a in alertCompare"
        :key="a.t"
        :title="a.t"
        node="5883:58974"
        master="atom/notification_5883-58974.png"
        :x="32"
        :y="a.y"
        :width="360"
        :height="68"
      >
        <Alert :type="a.type" :show-icon="a.icon" :value="0.25">
          Notification text
        </Alert>
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
