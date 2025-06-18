// server/plugins/fetch-github-articles.server.ts
import {Octokit} from 'octokit'
// import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import {parseName} from "~/server/utils";
import {storage} from "~/server/utils/storage";
import { Buffer } from 'node:buffer'

export default defineNitroPlugin(async () => {
    const config = useRuntimeConfig()
    const octokit = new Octokit({auth: config.github.token})

    // 获取 GitHub 仓库文件树
    const {data: tree} = await octokit.request(
        'GET /repos/{owner}/{repo}/git/trees/{ref}',
        {
            owner: config.github.owner,
            repo: config.github.repo,
            ref: config.github.ref,
            recursive: 'true'
        }
    )

    const mdFiles = tree.tree.filter(
        (t: any) =>
            t.type === 'blob' &&
            t.path.startsWith('Article/') &&
            t.path.endsWith('.md')
    )

    for (const file of mdFiles) {
        const {data: rawContent } = await octokit.request(
            'GET /repos/{owner}/{repo}/contents/{path}',
            {
                owner: config.github.owner,
                repo: config.github.repo,
                path: file.path,
                mediaType: {format: 'raw'}
            }
        )

        if (rawContent) {
            const content = typeof rawContent === 'string'
                ? rawContent
                : Buffer.from(rawContent as any).toString('utf-8')

            const slug = parseName(file.path)
            await storage.setItem(slug, content)
            console.log(`compile ${slug}`)
        }
    }

    console.log(`[nuxt] Compiled ${mdFiles.length} articles into in-memory storage`)
})
