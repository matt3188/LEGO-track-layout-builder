// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxt/ui'
  ],
  app: {
    baseURL: process.env.NODE_ENV === 'production' ? '/LEGO-track-layout-builder/' : '/',
  },
})
