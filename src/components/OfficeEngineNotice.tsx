import { useEffect, useState } from 'react'
import { formatBytes } from '../lib/image'
import { useOfficeEngine } from '../lib/useOfficeEngine'

export type OfficeEngineControl = ReturnType<typeof useOfficeEngine>

export function OfficeEngineNotice({ engine }: { engine: OfficeEngineControl }) {
  const { status, progress, installing, installError, install, cancelInstall } = engine
  const [open, setOpen] = useState(false)
  const missing = Boolean(status && !status.available)
  useEffect(() => {
    if (missing) setOpen(true)
  }, [missing])
  if (!status || status.available) return status?.available ? <p className="help">转换引擎：{status.version}</p> : null

  const size = status.download?.size ? formatBytes(status.download.size) : '约 350 MB'
  const content = <section className="office-engine-notice" aria-live="polite">
    <div>
      <strong>需要办公文档组件</strong>
      <p>此功能需要 LibreOffice。点击即可从官方网站下载并自动配置，约 {size}；只需下载一次。</p>
      <small>组件保存在本程序的 data/components 目录，不修改系统 Office，也不需要管理员权限。</small>
    </div>
    {installing && progress ? <div className="office-install-progress">
      <div className="office-progress-track"><span style={{ width: `${Math.max(2, progress.percent)}%` }} /></div>
      <p>{progress.message} {progress.stage === 'downloading' ? `${progress.percent}%` : ''}</p>
      <button className="btn btn-sm" type="button" onClick={() => void cancelInstall()}>取消</button>
    </div> : <button className="btn btn-primary" type="button" onClick={() => void install()}>下载并启用组件</button>}
    {installError && <p className="msg msg-error">{installError}</p>}
  </section>

  if (!open) return <div className="office-engine-inline">
    <span>办公文档组件尚未安装</span>
    <button className="btn btn-primary btn-sm" type="button" onClick={() => setOpen(true)}>下载组件</button>
  </div>

  return <div className="modal-backdrop office-engine-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget && !installing) setOpen(false)
  }}>
    <div className="office-engine-dialog" role="dialog" aria-modal="true" aria-labelledby="office-engine-title">
      {!installing && <button className="modal-close" type="button" aria-label="关闭" onClick={() => setOpen(false)}>×</button>}
      <h2 id="office-engine-title">启用办公文档功能</h2>
      {content}
    </div>
  </div>
}
