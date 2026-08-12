<script setup lang="ts">
useHead({ title: 'Наложение — сверка с китом 1' })

/**
 * Смещения вариантов внутри мастеров взяты из get_metadata соответствующих
 * узлов — это координаты потомков относительно фрейма мастера, поэтому
 * вырезка попадает в вариант точно, без подгонки на глаз.
 */
const inputVariants = [
  { title: 'input · label=top, Default, 44', x: 1777, y: 32, w: 464, h: 92, note: 'плейсхолдер в цвете fg/secondary' },
  { title: 'input · label=top, pressed, 44', x: 1777, y: 171, w: 464, h: 92, note: 'фокус: меняется только цвет рамки, кольца нет — навести курсор в поле' },
  { title: 'input · label=top, field, 44', x: 1773, y: 311, w: 464, h: 92, value: 'Text', note: 'не состояние контрола, а наличие значения: отличается от Default только цветом текста' },
  { title: 'input · label=top, error, 44', x: 1777, y: 437, w: 464, h: 92, value: 'Text', invalid: true, note: 'краснеют рамка, подсказка и счётчик; подпись и иконки — нет' },
  { title: 'input · label=top, disabled, 44', x: 1777, y: 578, w: 464, h: 92, value: 'Text', disabled: true, note: 'фон остаётся белым, гаснут подпись, иконки, подсказка и счётчик' },
] as const

/** Эталоны целиком. Источник-файл указан там, где он не админский кит. */
const masters = [
  { src: 'btn-accent_709-6413.png', cap: 'btn_accent · 709:6413 · 10 вариантов' },
  { src: 'input_720-11753.png', cap: 'input · 720:11753 · 20 вариантов' },
  { src: 'select_1929-4067.png', cap: 'select · 1929:4067 · 4 типа' },
  { src: 'select-dropdown_1059-6225.png', cap: 'выпадающая часть · 1059:6225' },
  { src: 'tabs_720-9159.png', cap: 'tabs · 720:9159 · два вида вкладок' },
  { src: 'iconed-tab-list_2181-387.png', cap: 'iconed_tab_list · 2181:387 · вкладки-таблетка' },
  { src: 'badge_1173-196.png', cap: 'badge · 1173:196 · три цвета, с иконкой' },
  {
    src: 'site-button_1314-2350.png',
    cap: 'большая кнопка · 1314:2350 · сайтовый слой, файл byDGy0Ab4QciP0CHTMLxYv, шрифт Martian Grotesk',
  },
]

const badgeVariants = [
  { title: 'badge · violet', x: 16, y: 16, w: 97, h: 24, color: 'violet' as const },
  { title: 'badge · red', x: 16, y: 60, w: 97, h: 24, color: 'red' as const },
  { title: 'badge · orange', x: 16, y: 104, w: 97, h: 24, color: 'orange' as const },
]
</script>

<template>
  <main class="mx-auto max-w-6xl space-y-10 px-6 py-10">
    <header class="space-y-3">
      <p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        кит 2 · сверка
      </p>
      <h1 class="text-4xl font-bold">
        Наложение на кит 1
      </h1>
      <p class="max-w-3xl text-muted-foreground">
        Эталоны — экспорт мастеров 1x по node-id, лежат в <code>public/compare/kit</code>.
        Слева режим, справа прозрачность. «Разница» инвертирует наложенный слой: совпавшее
        гаснет в чёрный, расхождение светится.
      </p>
      <p class="max-w-3xl rounded-md border border-destructive bg-destructive-surface p-3 text-sm">
        <strong>Это рабочая страница, а не витрина.</strong> Компоненты пересобраны от мастеров
        по протоколу переноса. Наложение — способ проверки, а не иллюстрация: расхождение
        видно в режиме «разница».
      </p>
    </header>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Input
      </h2>
      <p class="text-sm text-muted-foreground">
        Мастер описывает поле целиком: подпись, поле с двумя иконочными слотами, строка
        подсказки со счётчиком. Видимостью частей в Figma управляют 10 component properties,
        поэтому в коде это пропы и слоты, а не значения variant.
      </p>

      <CompareFrame
        v-for="v in inputVariants"
        :key="v.title"
        :title="v.title"
        node="720:11753"
        master="input_720-11753.png"
        :x="v.x"
        :y="v.y"
        :width="v.w"
        :height="v.h"
        :note="v.note"
      >
        <Input
          label="lable_top"
          hint="Подсказка"
          counter="10/25"
          placeholder="Text"
          :model-value="v.value"
          :invalid="v.invalid"
          :disabled="v.disabled"
        >
          <template #left>
            <IconPlaceholder />
          </template>
          <template #right>
            <IconPlaceholder />
          </template>
        </Input>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Badge
      </h2>
      <p class="text-sm text-muted-foreground">
        Иконка в мастере обязательна: булевой пропы «показать иконку» там нет, только подмена
        глифа. Контейнер 14×14, глиф 20×20 навылет — так нарисовано.
      </p>

      <CompareFrame
        v-for="v in badgeVariants"
        :key="v.title"
        :title="v.title"
        node="1173:196"
        master="badge_1173-196.png"
        :x="v.x"
        :y="v.y"
        :width="v.w"
        :height="v.h"
      >
        <Badge :color="v.color">
          <template #icon><IconPlaceholder /></template>
          Badge
        </Badge>
      </CompareFrame>
    </section>

    <section class="space-y-2">
      <h2 class="text-lg font-bold">
        Мастера целиком
      </h2>
      <p class="text-sm text-muted-foreground">
        Эталоны без наложения — чтобы видеть полную матрицу вариантов и то, чего в коде нет.
      </p>

      <div class="space-y-6">
        <figure v-for="m in masters" :key="m.src" class="space-y-2">
          <figcaption class="text-xs text-muted-foreground">
            {{ m.cap }}
          </figcaption>
          <img :src="`/compare/kit/${m.src}`" :alt="m.cap" class="max-w-full border border-border">
        </figure>
      </div>
    </section>
  </main>
</template>
