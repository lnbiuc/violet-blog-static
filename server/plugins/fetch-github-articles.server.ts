/* eslint-disable @typescript-eslint/no-explicit-any */

// server/plugins/fetch-github-articles.server.ts
import {Octokit} from 'octokit'
import {promises as fs} from 'fs'
import {join} from 'path'
import {extractFileName, parseName} from "~/server/utils"
import {parseMarkdown} from '@nuxtjs/mdc/runtime'

interface ArticleInfo {
    name: string
    path: string
    sha: string
}

interface CacheManifest {
    articles: ArticleInfo[]
    lastUpdate: string
}

export default defineNitroPlugin(async () => {
    const config = useRuntimeConfig()
    const octokit = new Octokit({auth: config.github.token})

    // 定义存储路径
    const contentDir = join(process.cwd(), 'public', 'content')
    const manifestPath = join(contentDir, 'manifest.json')

    // 确保目录存在
    await ensureDir(contentDir)

    try {
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

        // 读取现有的manifest文件
        let existingManifest: CacheManifest = {
            articles: [],
            lastUpdate: ''
        }

        try {
            const manifestContent = await fs.readFile(manifestPath, 'utf-8')
            existingManifest = JSON.parse(manifestContent)
        } catch (error) {
            console.error('[nuxt] No existing manifest found, will create new one', error)
        }

        // 创建当前文件映射
        const currentFiles = new Map<string, any>()
        mdFiles.forEach((file: any) => {
            currentFiles.set(file.sha, file)
        })

        // 创建已存在文件映射
        const existingFiles = new Map<string, ArticleInfo>()
        existingManifest.articles.forEach(article => {
            existingFiles.set(article.sha, article)
        })

        const newArticles: ArticleInfo[] = []
        const filesToDownload: Array<{file: any, isNew: boolean}> = []

        // 检查需要下载的文件
        for (const [sha, file] of currentFiles) {
            const existing = existingFiles.get(sha)

            if (!existing) {
                // 新文件
                filesToDownload.push({
                    file,
                    isNew: true
                })
                console.log(`[nuxt] New file detected: ${file.path}`)
            } else {
                // 文件未修改，保留现有信息
                newArticles.push(existing)
            }
        }

        // 检查需要删除的文件
        const filesToDelete: ArticleInfo[] = []
        for (const [sha, article] of existingFiles) {
            if (!currentFiles.has(sha)) {
                filesToDelete.push(article)
                console.log(`[nuxt] File to be deleted: ${article.path}`)
            }
        }

        // 删除不再存在的文件
        for (const article of filesToDelete) {
            try {
                const jsonFilePath = join(contentDir, `${article.sha}.json`)
                await fs.unlink(jsonFilePath)
                console.log(`[nuxt] Deleted: ${article.sha}.json`)
            } catch (error) {
                console.warn(`[nuxt] Failed to delete ${article.sha}.json:`, error)
            }
        }

        // 下载新文件并编译为JSON
        for (const {file, isNew} of filesToDownload) {
            try {
                const {data: rawContent} = await octokit.request(
                    'GET /repos/{owner}/{repo}/contents/{path}',
                    {
                        owner: config.github.owner,
                        repo: config.github.repo,
                        path: file.path,
                        mediaType: {format: 'raw'}
                    }
                )

                if (rawContent) {
                    const slug = parseName(file.path)
                    const filename = file.sha

                    // 编译 markdown 为 JSON
                    console.time(`compile-${filename}`)
                    const compile = await parseMarkdown(rawContent as any)
                    console.timeEnd(`compile-${filename}`)

                    // 保存编译后的 JSON 文件
                    const jsonFilePath = join(contentDir, `${filename}.json`)
                    await fs.writeFile(jsonFilePath, JSON.stringify(compile, null, 2), 'utf-8')

                    const articleInfo: ArticleInfo = {
                        name: extractFileName(file.path),
                        path: slug,
                        sha: file.sha,
                    }

                    newArticles.push(articleInfo)
                    console.log(`[nuxt] ${isNew ? 'Downloaded' : 'Updated'} and compiled: ${filename}.json`)
                }
            } catch (error) {
                console.error(`[nuxt] Failed to download and compile ${file.path}:`, error)
            }
        }

        // 更新manifest文件
        const newManifest: CacheManifest = {
            articles: newArticles,
            lastUpdate: new Date().toISOString()
        }

        await fs.writeFile(manifestPath, JSON.stringify(newManifest, null, 2), 'utf-8')

        console.log(`[nuxt] Cache updated successfully`)
        console.log(`[nuxt] Total articles: ${newArticles.length}`)
        console.log(`[nuxt] Downloaded/Updated: ${filesToDownload.length} files`)
        console.log(`[nuxt] Deleted: ${filesToDelete.length} files`)
        console.log(`[nuxt] All articles compiled to JSON format in content directory`)

    } catch (error) {
        console.error('[nuxt] Failed to fetch GitHub articles:', error)
    }
})

// 工具函数：确保目录存在
async function ensureDir(dir: string) {
    try {
        await fs.access(dir)
    } catch {
        await fs.mkdir(dir, {recursive: true})
        console.log(`[nuxt] Created directory: ${dir}`)
    }
}
