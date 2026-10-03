<script setup lang="ts">
import { ref } from 'vue'

/**
 * Матрицы осей страницы «Тарификация» — стенд, такт 77. Примеры вызова для фронтов. Оснастка приёмки, не продукт.
 * Сам экран — `/tariffs`.
 *
 * П1 (`docs/tariffs.md`, раздел 9): проп `loading` у `Button` — макет `30957:18341`, `Loader24` `30957:18364`; глиф
 * `save` у `Icon` — макет `Icon/Save` `30957:18323`.
 */
definePageMeta({ layout: false })
useHead({ title: 'Тарификация — матрицы' })

const VARIANTS = ['default', 'secondary', 'destructive', 'feature', 'outline'] as const
const SIZES = ['lg', 'md', 'sm'] as const

/* Живой пример: нажатие включает загрузку на 1.5 с. */
const busy = ref(false)
function press() {
  busy.value = true
  setTimeout(() => { busy.value = false }, 1500)
}

const LOADING_EXAMPLE = `<Button show-icon :disabled="!dirty" :loading="applying" @click="apply">
  <template #icon>
    <Icon name="save" :size="20" />
  </template>
  Сохранить изменения
</Button>   <!-- loading: спиннер вместо иконки и подписи, ширина прежняя, нажатия не принимает, aria-busy -->`
</script>

<template>
  <main class="flex flex-col gap-10 px-8 py-6">
    <Heading level="page" as="h1">
      Тарификация — матрицы
    </Heading>

    <section class="flex flex-col gap-4" data-matrix="button-loading">
      <Heading>Button · loading — загрузка главной кнопки</Heading>
      <div class="grid grid-cols-[auto_auto_auto] items-center justify-start gap-x-6 gap-y-3">
        <template v-for="v in VARIANTS" :key="v">
          <Button :variant="v" show-icon :data-case="`${v}-rest`">
            <template #icon>
              <Icon name="save" :size="20" />
            </template>
            Сохранить изменения
          </Button>
          <Button :variant="v" show-icon loading :data-case="`${v}-loading`">
            <template #icon>
              <Icon name="save" :size="20" />
            </template>
            Сохранить изменения
          </Button>
          <Button :variant="v" show-icon disabled :data-case="`${v}-disabled`">
            <template #icon>
              <Icon name="save" :size="20" />
            </template>
            Сохранить изменения
          </Button>
        </template>
      </div>
      <Heading>Размеры: lg · md · sm, покой и загрузка</Heading>
      <div class="flex flex-wrap items-center gap-6">
        <template v-for="s in SIZES" :key="s">
          <Button :size="s" :data-case="`size-${s}-rest`">
            Применить
          </Button>
          <Button :size="s" loading :data-case="`size-${s}-loading`">
            Применить
          </Button>
        </template>
      </div>
      <Heading>Живой пример: нажатие — загрузка 1.5 с</Heading>
      <div class="flex">
        <Button show-icon :loading="busy" data-case="live" @click="press">
          <template #icon>
            <Icon name="save" :size="20" />
          </template>
          Сохранить изменения
        </Button>
      </div>
      <pre class="overflow-x-auto rounded-md bg-muted p-4 font-mono text-2xs">{{ LOADING_EXAMPLE }}</pre>
    </section>

    <section class="flex flex-col gap-4" data-matrix="icon-save">
      <Heading>Icon · save — дискета</Heading>
      <span class="flex items-center gap-4 text-xs">
        <Icon name="save" :size="16" />
        <Icon name="save" :size="20" />
        <Icon name="save" :size="24" />
        <code>save</code>
      </span>
      <span class="text-xs text-muted-foreground">20 — в кнопке «Сохранить изменения»: видимый глиф 20×20, как у макета `Icon/Save` в боксе 24</span>
    </section>
  </main>
</template>
