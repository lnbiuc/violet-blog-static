// server/plugins/fetch-github-articles.server.ts
import {Octokit} from 'octokit'
import {promises as fs} from 'fs'
import {join} from 'path'
import {extractFileName, parseName} from "~/server/utils"


interface ArticleInfo {
    name: string
    path: string
    sha: string
    filename: string // 实际存储的文件名（sha值）
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
            console.log('[nuxt] No existing manifest found, will create new one')
        }

        // 创建当前文件映射
        const currentFiles = new Map<string, any>()
        mdFiles.forEach(file => {
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

            if (!existing || existing.sha !== file.sha) {
                // 新文件或已修改的文件
                filesToDownload.push({
                    file,
                    isNew: !existing
                })
                console.log(`[nuxt] ${existing ? 'Modified' : 'New'} file detected: ${file.path}`)
            } else {
                // 文件未修改，保留现有信息
                newArticles.push(existing)
            }
        }

        // 检查需要删除的文件
        const filesToDelete: ArticleInfo[] = []
        for (const [path, article] of existingFiles) {
            if (!currentFiles.has(path)) {
                filesToDelete.push(article)
                console.log(`[nuxt] File to be deleted: ${path}`)
            }
        }

        // 删除不再存在的文件
        for (const article of filesToDelete) {
            try {
                const filePath = join(contentDir, `${article.filename}.md`)
                await fs.unlink(filePath)
                console.log(`[nuxt] Deleted: ${article.filename}.md`)
            } catch (error) {
                console.warn(`[nuxt] Failed to delete ${article.filename}.md`)
            }
        }

        // 下载新文件和修改的文件
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
                    const filePath = join(contentDir, `${filename}.md`)

                    // 如果是修改的文件，先删除旧文件
                    if (!isNew) {
                        const oldArticle = existingFiles.get(file.path)
                        if (oldArticle && oldArticle.filename !== filename) {
                            try {
                                const oldFilePath = join(contentDir, `${oldArticle.filename}.md`)
                                await fs.unlink(oldFilePath)
                                console.log(`[nuxt] Deleted old version: ${oldArticle.filename}.md`)
                            } catch (error) {
                                console.warn(`[nuxt] Failed to delete old version:`, error)
                            }
                        }
                    }

                    // 写入新文件
                    await fs.writeFile(filePath, rawContent, 'utf-8')

                    const articleInfo: ArticleInfo = {
                        name: extractFileName(file.path),
                        path: slug,
                        sha: file.sha,
                        filename: filename
                    }

                    newArticles.push(articleInfo)
                    console.log(`[nuxt] ${isNew ? 'Downloaded' : 'Updated'}: ${filename}.md`)
                }
            } catch (error) {
                console.error(`[nuxt] Failed to download ${file.path}:`, error)
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
