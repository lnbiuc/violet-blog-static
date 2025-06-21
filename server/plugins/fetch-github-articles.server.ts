/* eslint-disable @typescript-eslint/no-explicit-any */

// server/plugins/fetch-github-articles.server.ts
import { Octokit } from 'octokit'
import { promises as fs } from 'fs'
import { join } from 'path'
import { extractFileName, parseName } from "~/server/utils"
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

interface ArticleInfo {
    name: string
    path: string
    sha: string
}

interface CacheManifest {
    articles: ArticleInfo[]
    lastUpdate: string
}

interface ImageInfo {
    name: string
    sha: string
    path: string
}

interface ImageManifest {
    images: ImageInfo[]
    lastUpdate: string
}

export default defineNitroPlugin(async () => {
    const config = useRuntimeConfig()
    const octokit = new Octokit({ auth: config.github.token })

    // 定义存储路径
    const contentDir = join(process.cwd(), 'public', 'content')
    const imageDir = join(process.cwd(), 'public', 'image')
    const debugDir = join(process.cwd(), 'public', 'debug')
    const manifestPath = join(contentDir, 'manifest.json')
    const imageManifestPath = join(imageDir, 'images.json')

    // 确保目录存在
    await ensureDir(contentDir)
    await ensureDir(imageDir)
    await ensureDir(debugDir)

    try {
        // 获取 GitHub 仓库文件树
        const { data: tree } = await octokit.request(
            'GET /repos/{owner}/{repo}/git/trees/{ref}',
            {
                owner: config.github.owner,
                repo: config.github.repo,
                ref: config.github.ref,
                recursive: 'true'
            }
        )

        // 分离 markdown 文件和图片文件
        const mdFiles = tree.tree.filter(
            (t: any) =>
                t.type === 'blob' &&
                t.path.startsWith('Article/') &&
                t.path.endsWith('.md')
        )

        const imageFiles = tree.tree.filter(
            (t: any) =>
                t.type === 'blob' &&
                t.path.startsWith('Attachment/') &&
                /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i.test(t.path)
        )

        // 处理图片文件
        await processImages(octokit, config, imageFiles, imageDir, imageManifestPath)

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
        const filesToDownload: Array<{ file: any, isNew: boolean }> = []

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
        for (const { file, isNew } of filesToDownload) {
            try {
                const { data: rawContent } = await octokit.request(
                    'GET /repos/{owner}/{repo}/contents/{path}',
                    {
                        owner: config.github.owner,
                        repo: config.github.repo,
                        path: file.path,
                        mediaType: { format: 'raw' }
                    }
                )

                if (rawContent) {
                    const slug = parseName(file.path)
                    const filename = file.sha

                    // 转换 Obsidian 图片链接格式
                    const processedContent = convertObsidianImages(rawContent as unknown as string)

                    // Debug: 保存处理后的 markdown 文件
                    const debugFilePath = join(debugDir, `${filename}.md`)
                    await fs.writeFile(debugFilePath, processedContent, 'utf-8')
                    console.log(`[nuxt] Debug: Saved processed markdown to ${filename}.md`)

                    // 编译 markdown 为 JSON
                    console.time(`compile-${filename}`)
                    const compile = await parseMarkdown(processedContent)
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

// 转换 Obsidian 图片链接格式
function convertObsidianImages(content: string): string {
    // 转换 ![[图片名称]] 为 ![图片名称](/image/图片名称)
    return content.replace(/!\[\[([^\]]+)\]\]/g, (match, imageName) => {
        // 提取纯文件名（去掉可能的路径）
        const originalFileName = imageName.split('/').pop() || imageName
        // 处理文件名中的空格
        const sanitizedFileName = sanitizeFileName(originalFileName)
        return `![${originalFileName}](/image/${sanitizedFileName})`
    })
}

// 处理文件名中的空格和特殊字符
function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/\s+/g, '-')  // 将连续空格替换为单个连字符
        .replace(/-+/g, '-')   // 将连续连字符替换为单个连字符
        .replace(/^-|-$/g, '') // 移除开头和结尾的连字符
}

// 处理图片文件下载
async function processImages(
    octokit: any,
    config: any,
    imageFiles: any[],
    imageDir: string,
    imageManifestPath: string
) {
    console.log(`[nuxt] Processing ${imageFiles.length} images...`)

    // 读取现有的图片清单
    let existingImageManifest: ImageManifest = {
        images: [],
        lastUpdate: ''
    }

    try {
        const imageManifestContent = await fs.readFile(imageManifestPath, 'utf-8')
        existingImageManifest = JSON.parse(imageManifestContent)
    } catch (error) {
        console.error('[nuxt] No existing image manifest found, will create new one', error)
    }

    // 创建当前图片文件映射
    const currentImages = new Map<string, any>()
    imageFiles.forEach(file => {
        currentImages.set(file.sha, file)
    })

    // 创建已存在图片映射
    const existingImages = new Map<string, ImageInfo>()
    existingImageManifest.images.forEach(image => {
        existingImages.set(image.sha, image)
    })

    const newImages: ImageInfo[] = []
    const imagesToDownload: any[] = []

    // 检查需要下载的图片
    for (const [sha, file] of currentImages) {
        const existing = existingImages.get(sha)

        if (!existing) {
            imagesToDownload.push(file)
            const originalFileName = file.path.split('/').pop()
            const sanitizedFileName = sanitizeFileName(originalFileName)
            console.log(`[nuxt] New image detected: ${originalFileName} -> ${sanitizedFileName}`)
        } else {
            // 图片未修改，保留现有信息
            newImages.push(existing)
        }
    }

    // 检查需要删除的图片
    const imagesToDelete: ImageInfo[] = []
    for (const [sha, image] of existingImages) {
        if (!currentImages.has(sha)) {
            imagesToDelete.push(image)
            console.log(`[nuxt] Image to be deleted: ${image.name}`)
        }
    }

    // 删除不再存在的图片
    for (const image of imagesToDelete) {
        try {
            const imagePath = join(imageDir, image.name)
            await fs.unlink(imagePath)
            console.log(`[nuxt] Deleted image: ${image.name}`)
        } catch (error) {
            console.warn(`[nuxt] Failed to delete image ${image.name}:`, error)
        }
    }


    // 下载新图片
    for (const file of imagesToDownload) {
        try {
            const { data: imageContent } = await octokit.request(
                'GET /repos/{owner}/{repo}/contents/{path}',
                {
                    owner: config.github.owner,
                    repo: config.github.repo,
                    path: file.path
                }
            )

            let buffer = undefined
            // 提取原始文件名
            const originalFileName = file.path.split('/').pop()
            // 处理文件名中的空格
            const sanitizedFileName = sanitizeFileName(originalFileName)
            const imagePath = join(imageDir, sanitizedFileName)
            if (imageContent && imageContent.content && imageContent.encoding === 'base64') {
                // 方法1：base64 解码
                buffer = Buffer.from(imageContent.content, 'base64')
            } else if (imageContent && imageContent.download_url) {
                // 方法2：直接下载
                const response = await fetch(imageContent.download_url)
                const arrayBuffer = await response.arrayBuffer()
                buffer = Buffer.from(arrayBuffer)
            }

            if (buffer) {
                await fs.writeFile(imagePath, buffer)

                const imageInfo: ImageInfo = {
                    name: sanitizedFileName,
                    sha: file.sha,
                    path: file.path
                }

                newImages.push(imageInfo)
                console.log(`[nuxt] Downloaded image: ${originalFileName} -> ${sanitizedFileName}`)
            }

        } catch (error) {
            console.error(`[nuxt] Failed to download image ${file.path}:`, error)
        }
    }

    // 更新图片清单文件
    const newImageManifest: ImageManifest = {
        images: newImages,
        lastUpdate: new Date().toISOString()
    }

    await fs.writeFile(imageManifestPath, JSON.stringify(newImageManifest, null, 2), 'utf-8')

    console.log(`[nuxt] Images processed successfully`)
    console.log(`[nuxt] Total images: ${newImages.length}`)
    console.log(`[nuxt] Downloaded: ${imagesToDownload.length} images`)
    console.log(`[nuxt] Deleted: ${imagesToDelete.length} images`)
}

// 工具函数：确保目录存在
async function ensureDir(dir: string) {
    try {
        await fs.access(dir)
    } catch {
        await fs.mkdir(dir, { recursive: true })
        console.log(`[nuxt] Created directory: ${dir}`)
    }
}
