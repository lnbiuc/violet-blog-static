<script setup lang="ts">

// 方法1: 定义接口类型
interface ArticleListItem {
  name: string
  slug: string
}

interface ArticleListResponse {
  articles: ArticleListItem[]
  total: number
  lastUpdate: string
}

// 方法2: 使用泛型指定 useFetch 的返回类型
const { data } = await useFetch<ArticleListResponse>('/api/article/list')

// 方法3: 如果需要手动指定 data 的类型（通常不需要，因为 useFetch 会推断）
// const { data }: { data: Ref<ArticleListResponse | null> } = await useFetch('/api/article/list')
</script>

<template>
  <div class="w-full flex flex-row items-start justify-center">
    <div class="w-1/2 overflow-auto">
      <div>
        Index
      </div>
      <ul>
        <li>
          <ULink to="/about">About</ULink>
        </li>
      </ul>
      <hr>

      <div>
        <!-- 修正：应该是 data.articles 而不是 data.article -->
        <ul v-if="data">
          <li v-for="article in data.articles" :key="article.slug">
            <ULink :to="`/article/${article.slug}`">{{ article.name }}</ULink>
          </li>
        </ul>
        <div v-else>
          Loading...
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
