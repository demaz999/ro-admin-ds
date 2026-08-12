<script setup lang="ts">
useHead({ title: 'Наложение — сверка с Атомом' })
</script>

<template>
  <main class="mx-auto max-w-6xl space-y-10 px-6 py-10">
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
        <strong>Сверка идёт в теме <code>atom</code></strong> — на родных цветах эталона, чтобы
        расхождение состава не путалось с расхождением цвета. Приёмочный просмотр — в
        <code>rososmotr</code>.
      </p>
      <p class="max-w-3xl rounded-md border border-border bg-secondary p-3 text-sm">
        <strong>Компонентов здесь пока нет.</strong> Перенос начат заново от мастеров Атома,
        первый компонент — <code>Input</code> (<code>249:2768</code>). Наложение на кит 1 вместе с
        его эталонами отложено в <code>archive/kit1-components</code>.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-bold">
        Автопроверка шрифтов
      </h2>
      <p class="text-sm text-muted-foreground">
        Наложение не ловит один класс дефектов: если компонент не зарегистрировался и отрисовался
        нераспознанным тегом, на эталоне просто ничего не появится, а глаз спишет это на
        прозрачность. Так подпись селекта уехала в системный monospace. Эта проверка идёт по
        computed-стилям, а не по картинке.
      </p>
      <CompareFontAudit />
    </section>
  </main>
</template>
