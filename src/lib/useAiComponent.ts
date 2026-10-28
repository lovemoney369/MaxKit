import { useCallback, useEffect, useState } from 'react'

const browserFallback: AiComponentStatus = { available: true, version: 'IMG.LY 在线资源', managed: false }
const desktopUnavailable: AiComponentStatus = { available: false, version: '' }

export function useAiComponent() {
  const [status, setStatus] = useState<AiComponentStatus | null>(null)
  const [progress, setProgress] = useState<AiInstallProgress | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState('')

  const refresh = useCallback(async () => {
    const bridge = window.maxkitAi
    if (!bridge) {
      setStatus(location.protocol === 'http:' || location.protocol === 'https:' ? browserFallback : desktopUnavailable)
      return
    }
    try {
      const next = await bridge.status()
      setStatus(next)
      setInstalling(Boolean(next.installing))
    } catch {
      setStatus(desktopUnavailable)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const bridge = window.maxkitAi
    if (!bridge) return
    return bridge.onInstallProgress(next => {
      setProgress(next)
      setInstalling(!['ready', 'cancelled', 'error'].includes(next.stage))
      if (next.stage === 'error') setInstallError(next.message)
      if (next.stage === 'ready') {
        setInstallError('')
        void refresh()
      }
    })
  }, [refresh])

  const install = useCallback(async () => {
    const bridge = window.maxkitAi
    if (!bridge || installing) return
    setInstalling(true)
    setInstallError('')
    setProgress({ stage: 'downloading', received: 0, total: status?.download?.size ?? 0, percent: 0, message: '正在准备下载…' })
    try {
      setStatus(await bridge.install())
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error))
    } finally {
      setInstalling(false)
    }
  }, [installing, status?.download?.size])

  const cancelInstall = useCallback(async () => {
    await window.maxkitAi?.cancelInstall()
  }, [])

  const remove = useCallback(async () => {
    const bridge = window.maxkitAi
    if (!bridge || installing) return
    setInstallError('')
    try {
      setStatus(await bridge.remove())
      setProgress(null)
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error))
    }
  }, [installing])

  return { status, progress, installing, installError, install, cancelInstall, remove, refresh }
}
