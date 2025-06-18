// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  modules: [// '@nuxt/content',
  '@nuxt/eslint', '@nuxt/fonts', '@nuxt/icon', '@nuxt/image', '@nuxt/scripts', '@nuxt/ui', '@nuxtjs/mdc'],
  nitro: {
    storage: {
      articles: {
        driver: 'memory' // 使用内存缓存
      }
    }
  },
  runtimeConfig: {
    github: {
      token: process.env.GITHUB_TOKEN, // 如果访问私有仓库，需要设置
      owner: 'lnbiuc',
      repo: 'obsidian',
      ref: 'main'
    }
  }
})