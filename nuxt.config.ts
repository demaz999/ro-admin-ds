import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  /**
   * Выключены намеренно. Приёмка идёт по скриншотам страницы, а devtools рисуют
   * поверх неё свой хром: трассировщик Vue вешает на компоненты плашку со
   * временем отрисовки («309 ms»), и на снимке она читается как элемент
   * интерфейса. Включить обратно — `enabled: true`.
   */
  devtools: { enabled: false },

  modules: ['shadcn-nuxt'],

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
})
