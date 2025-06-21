<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import MDCRenderer from '@nuxtjs/mdc/runtime/components/MDCRenderer.vue'

// 获取路由参数中的 slug
const route = useRoute()
const slug = route.params.slug as string

interface ArticleContent {
  data: any
  body: any
  toc: any
}

// 调用 API 获取文章内容
const { data: article, pending, error } = await useFetch<ArticleContent>(`/api/article/${slug}`)
</script>

<template>
  <div class="w-full flex flex-row items-start justify-center">
    <div class="w-1/2 overflow-auto">
      <h1>
        <NuxtLink to="/">Index</NuxtLink>
      </h1>
      <h1>{{ article?.data.title }}</h1>
      <div>
        <div v-if="pending">
          Loading...
        </div>

        <div v-else-if="error">
          Error: {{ error.statusMessage || 'Failed to load article' }}
        </div>

        <div v-else-if="article">
          <!-- <pre style="white-space: pre-wrap; font-family: inherit;">{{ articleContent }}</pre> -->
          <MDCRenderer v-if="article.body" :body="article.body" :data="article.data" />
        </div>

        <div v-else>
          Article not found
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
