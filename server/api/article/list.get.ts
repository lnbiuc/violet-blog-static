// server/api/articles.get.ts (或相应的API文件)
import {promises as fs} from 'fs'
import {join} from 'path'

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

interface ArticleListItem {
    name: string
    url: string
    slug: string
}

export default defineEventHandler(async (event) => {
    try {
        // 读取 manifest.json 文件
        const contentDir = join(process.cwd(), 'public', 'content')
        const manifestPath = join(contentDir, 'manifest.json')

        const manifestContent = await fs.readFile(manifestPath, 'utf-8')
        const manifest: CacheManifest = JSON.parse(manifestContent)

        // 转换为前端需要的格式
        const articleList: ArticleListItem[] = manifest.articles.map(article => ({
            name: article.name,
            slug: article.path
        }))

        // 设置响应头
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        setHeader(event, 'Cache-Control', 'public, max-age=1800') // 缓存30分钟

        return {
            articles: articleList,
            total: articleList.length,
            lastUpdate: manifest.lastUpdate
        }

    } catch (error) {
        // 如果是文件不存在的错误
        if (error.code === 'ENOENT') {
            throw createError({
                statusCode: 404,
                statusMessage: 'Article list not found. Please ensure articles are fetched first.'
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
        console.error('Error reading article list:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to load article list'
        })
    }
})