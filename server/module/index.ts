
export interface ArticleInfo {
    name: string
    path: string
    sha: string
    description: string
    tags: string[]
    updateAt: string
    createAt: string
    category: string
    hidden?: boolean
}

export interface ArticleInfoList {
    articles: ArticleInfo[]
    total: number
    lastUpdate: string
}

export interface CacheManifest {
    articles: ArticleInfo[]
    lastUpdate: string
}

export interface ImageInfo {
    name: string
    sha: string
    path: string
}

export interface ImageManifest {
    images: ImageInfo[]
    lastUpdate: string
}


export const CacheKey = {
    articleManifest: 'ARTICLE_MAINFEST',
    ImageManifest: 'IMAGE_MAINFEST',
    articleContent: 'ARTICLE_CONTENT_'
}
