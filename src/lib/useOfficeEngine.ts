import { useCallback, useEffect, useState } from 'react'

const unavailable: OfficeEngineStatus = { available: false, version: '' }

export function useOfficeEngine() {
  const [status, setStatus] = useState<OfficeEngineStatus | null>(null)
  const [progress, setProgress] = useState<OfficeInstallProgress | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState('')

  const refresh = useCallback(async () => {
    const bridge = window.hahaimageOffice
    if (!bridge) {
      setStatus(unavailable)
      return
    }
    try {
      const next = await bridge.status()
      setStatus(next)
      setInstalling(Boolean(next.installing))
    } catch {
      setStatus(unavailable)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const bridge = window.hahaimageOffice
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
    const bridge = window.hahaimageOffice
    if (!bridge || installing) return
    setInstalling(true)
    setInstallError('')
    setProgress({ stage: 'downloading', received: 0, total: status?.download?.size ?? 0, percent: 0, message: '正在准备下载…' })
    try {
      await bridge.install()
      await refresh()
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error))
    } finally {
      setInstalling(false)
    }
  }, [installing, refresh, status?.download?.size])

  const cancelInstall = useCallback(async () => {
    await window.hahaimageOffice?.cancelInstall()
  }, [])

  const remove = useCallback(async () => {
    const bridge = window.hahaimageOffice
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
