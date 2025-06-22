// server/api/articles.get.ts (或相应的API文件)
import { CacheKey } from '~/server/module'
import type { CacheManifest } from '~/server/module'

export default defineEventHandler(async (event) => {
    try {
        
        const manifest = await storage.getItem<CacheManifest>(CacheKey.articleManifest)
        if (!manifest) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Invalid manifest file format'
            })
        }

        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

        return {
            articles: manifest.articles,
            total: manifest.articles.length,
            lastUpdate: manifest.lastUpdate
        }

    } catch (error) {

        if (error) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Invalid manifest file format'
            })
        }
    }
})
