

// server/api/article/[slug].get.ts
import { CacheKey } from '~/server/module'
import type { CacheManifest } from '~/server/module'

export default defineEventHandler(async (event) => {
    const slug = event.context.params?.slug
    if (!slug) {
        throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
    }

    try {
        // 读取 manifest.json 文件
        const manifest = await storage.getItem<CacheManifest>(CacheKey.articleManifest)
        if (!manifest) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Invalid manifest file format'
            })
        }
        // console.log(`manifest ${JSON.stringify(manifest)}`)
        // 查找对应的文章信息
        const articleInfo = manifest.articles.find(article => article.path === slug)

        if (!articleInfo) {
            throw createError({
                statusCode: 404,
                statusMessage: `Article '${slug}' not found`
            })
        }
        // 读取对应的markdown文件
        const articleContent = await storage.getItem(`${CacheKey.articleContent}${articleInfo.sha}`)

        if (!articleContent) {
            throw createError({
                statusCode: 500,
                statusMessage: `Cache Error, No ${articleInfo.name} found in cache!`
            })
        }

        // 设置响应头
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

        return articleContent

    } catch (error) {
        console.error(error)
        if (error) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Invalid manifest file format'
            })
        }
    }
})
