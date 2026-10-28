/** 仅用于本地 AI 工具资源配置。 */
export interface SiteConfig {
  ai?: {
    /** Web 版可使用自托管资源；留空时使用 IMG.LY 官方资源，桌面版优先使用已下载组件。 */
    modelBaseUrl?: string
  }
}

let config: SiteConfig = {}

export function getConfig(): SiteConfig {
  return config
}

export async function loadConfig(): Promise<void> {
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'site.config.json', { cache: 'no-cache' })
    if (!response.ok) return
    const value = await response.json()
    const modelBaseUrl = value?.ai?.modelBaseUrl
    config = typeof modelBaseUrl === 'string' ? { ai: { modelBaseUrl } } : {}
  } catch {
    // 本地配置不存在时使用组件或官方资源。
    config = {}
  }
}
