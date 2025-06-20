<script setup lang="ts">
// 获取路由参数中的 slug
const route = useRoute()
const slug = route.params.slug as string

// 调用 API 获取文章内容
const { data: articleContent, pending, error } = await useFetch<string>(`/api/article/${slug}`)
</script>

<template>
<div>
  <div v-if="pending">
    Loading...
  </div>
  
  <div v-else-if="error">
    Error: {{ error.statusMessage || 'Failed to load article' }}
  </div>
  
  <div v-else-if="articleContent">
    <pre style="white-space: pre-wrap; font-family: inherit;">{{ articleContent }}</pre>
  </div>
  
  <div v-else>
    Article not found
  </div>
</div>
</template>

<style scoped>

</style>
