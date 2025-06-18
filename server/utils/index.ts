import { pinyin } from 'pinyin-pro'

export function parseName(filePath: string): string {
    const cleanPath = filePath.replace(/\.(md|markdown)$/i, '')
    const parts: string[] = []

    let buffer = '' // 用来暂存英文/数字连续字符

    for (const char of cleanPath) {
        if (/[\u4e00-\u9fa5]/.test(char)) {
            // 先推入英文缓冲内容
            if (buffer) {
                parts.push(buffer)
                buffer = ''
            }
            // 中文转拼音
            const py = pinyin(char, { toneType: 'none' })
            if (py) parts.push(py)
        } else if (/[a-zA-Z0-9]/.test(char)) {
            // 累积英文/数字
            buffer += char
        } else {
            // 推入缓冲内容
            if (buffer) {
                parts.push(buffer)
                buffer = ''
            }
            // 其他字符作为分隔符
            parts.push('-')
        }
    }

    if (buffer) {
        parts.push(buffer)
    }

    return parts
        .join('-')             // 用 - 连接所有部分
        .replace(/-+/g, '-')   // 合并重复 -
        .replace(/^-|-$/g, '') // 去除首尾 -
        .toLowerCase()
}