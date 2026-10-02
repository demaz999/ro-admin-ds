<script setup lang="ts">
/**
 * Матрицы компонентов страницы «Редактирование схемы осмотра» — стенд, такт 61. Примеры вызова для фронтов.
 * Оснастка приёмки, не продукт. Сам экран — `/scheme-edit`.
 *
 * П1: новая ось `AppBarStatus` — `surface="light"` и `retryable` (`docs/scheme-edit.md`, раздел 9).
 */
definePageMeta({ layout: false })
useHead({ title: 'Редактирование схемы осмотра — матрицы' })

const STATES = ['saving', 'saved', 'error'] as const
</script>

<template>
  <main class="flex flex-col gap-10 px-8 py-6">
    <Heading level="page" as="h1">
      Страница схемы — матрицы
    </Heading>

    <section class="flex flex-col gap-4" data-matrix="app-bar-status-light">
      <Heading>AppBarStatus · surface="light" — статус сохранения в шапке страницы</Heading>
      <div class="flex flex-col items-start gap-3">
        <AppBarStatus v-for="s in STATES" :key="s" surface="light" :state="s" />
        <AppBarStatus surface="light" state="error" retryable />
      </div>
    </section>

    <section class="flex flex-col gap-4" data-matrix="app-bar-status-dark">
      <Heading>AppBarStatus · surface="dark" — полоса приложения, как на «Свободной съёмке»</Heading>
      <AppBar>
        <template #end>
          <AppBarStatus v-for="s in STATES" :key="s" :state="s" />
          <AppBarStatus state="error" retryable />
        </template>
      </AppBar>
    </section>
  </main>
</template>
