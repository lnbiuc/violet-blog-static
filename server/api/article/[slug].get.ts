 

// server/api/article/[slug].get.ts
import { promises as fs } from 'fs'
import { join } from 'path'

interface ArticleInfo {
    name: string
    path: string
    sha: string
}

interface CacheManifest {
    articles: ArticleInfo[]
    lastUpdate: string
}

export default defineEventHandler(async (event) => {
    const slug = event.context.params?.slug

    if (!slug) {
        throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
    }

    try {
        // 读取 manifest.json 文件
        const contentDir = join(process.cwd(), 'public', 'content')
        const manifestPath = join(contentDir, 'manifest.json')

        const manifestContent = await fs.readFile(manifestPath, 'utf-8')
        const manifest: CacheManifest = JSON.parse(manifestContent)

        // 查找对应的文章信息
        const articleInfo = manifest.articles.find(article => article.path === slug)

        if (!articleInfo) {
            throw createError({
                statusCode: 404,
                statusMessage: `Article '${slug}' not found`
            })
        }

        // 读取对应的markdown文件
        const articlePath = join(contentDir, `${articleInfo.sha}.json`)
        const articleContent = await fs.readFile(articlePath, 'utf-8')

        // 设置响应头
        setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

        return articleContent

    } catch (error) {

        if (error) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Invalid manifest file format'
            })
        }
    }
})
