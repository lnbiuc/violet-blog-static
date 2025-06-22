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

        const { category, tag, order } = getQuery(event);

        if (category && typeof category === 'string') {
            manifest.articles = manifest.articles.filter(article =>
                article.category.toLowerCase() === category.toLowerCase()
            );
        }
        if (tag  && typeof tag === 'string') {
            manifest.articles = manifest.articles.filter(article =>
                article.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
            );
        }
        manifest.articles.sort((a, b) => {
            const key = order === 'updateAt' ? 'updateAt' : 'createAt';
            return new Date(b[key]).getTime() - new Date(a[key]).getTime();
        });

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
