// server/api/article/[slug].get.ts
import { promises as fs } from 'fs'
import { join } from 'path'

interface ArticleInfo {
    name: string
    path: string
    sha: string
    filename: string
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
        const articlePath = join(contentDir, `${articleInfo.filename}.md`)
        const articleContent = await fs.readFile(articlePath, 'utf-8')

        // 设置响应头
        setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

        return articleContent

    } catch (error) {
        // 如果是文件不存在的错误
        if (error.code === 'ENOENT') {
            throw createError({
                statusCode: 404,
                statusMessage: `Article '${slug}' not found or content directory not initialized`
            })
        }

        // 如果是 JSON 解析错误
        if (error instanceof SyntaxError) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Invalid manifest file format'
            })
        }

        // 其他错误
        console.error(`Error reading article '${slug}':`, error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        })
    }
})
