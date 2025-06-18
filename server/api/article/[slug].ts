// server/api/article/[slug].ts
import {storage} from "~/server/utils/storage";

export default defineEventHandler(async (event) => {
    const slug = event.context.params?.slug

    if (!slug) {
        throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
    }

    const article = await storage.getItem(slug)

    if (!article) {
        throw createError({ statusCode: 404, statusMessage: `Article '${slug}' not found` })
    }
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return article
})
