
export interface ArticleInfo {
    name: string
    path: string
    sha: string
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
