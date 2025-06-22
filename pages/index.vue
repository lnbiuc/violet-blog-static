<script setup lang="ts">
import type {ArticleInfoList } from '~/server/module'

const { data } = await useFetch<ArticleInfoList>('/api/article/list')
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
        <ul v-if="data">
          <li v-for="article in data.articles" :key="article.sha">
            <ULink :to="`/article/${article.path}`">{{ article.name }}</ULink>
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
