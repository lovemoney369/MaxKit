/// <reference types="vite/client" />

declare const __APP_VERSION__: string

type OfficeKind = 'word' | 'spreadsheet' | 'presentation'

interface OfficeConvertResult {
  name: string
  data: Uint8Array
  type: string
}

interface OfficeEngineStatus {
  available: boolean
  version: string
  managed?: boolean
  installing?: boolean
  download?: { version: string; size: number }
}

interface OfficeInstallProgress {
  stage: 'downloading' | 'verifying' | 'installing' | 'ready' | 'cancelled' | 'error'
  received: number
  total: number
  percent: number
  message: string
}

interface AiComponentStatus {
  available: boolean
  version: string
  managed?: boolean
  installing?: boolean
  publicPath?: string
  download?: { version: string; size: number }
}

type AiInstallProgress = OfficeInstallProgress

interface Window {
  hahaimageOffice?: {
    status: () => Promise<OfficeEngineStatus>
    install: () => Promise<{ available: boolean; version: string }>
    cancelInstall: () => Promise<{ cancelled: boolean }>
    remove: () => Promise<OfficeEngineStatus>
    onInstallProgress: (callback: (progress: OfficeInstallProgress) => void) => () => void
    convert: (payload: { jobId: string; kind: OfficeKind; name: string; target: string; data: Uint8Array }) => Promise<OfficeConvertResult>
    cancel: (jobId: string) => Promise<{ cancelled: boolean }>
    htmlToPdf: (payload: { jobId: string; html: string }) => Promise<{ data: Uint8Array; type: string }>
  }
  maxkitAi?: {
    status: () => Promise<AiComponentStatus>
    install: () => Promise<AiComponentStatus>
    cancelInstall: () => Promise<{ cancelled: boolean }>
    remove: () => Promise<AiComponentStatus>
    onInstallProgress: (callback: (progress: AiInstallProgress) => void) => () => void
  }
}
