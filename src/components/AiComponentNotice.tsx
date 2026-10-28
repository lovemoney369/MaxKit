import { useEffect, useState } from 'react'
import { formatBytes } from '../lib/image'
import { useAiComponent } from '../lib/useAiComponent'

export type AiComponentControl = ReturnType<typeof useAiComponent>

export function AiComponentNotice({ component }: { component: AiComponentControl }) {
  const { status, progress, installing, installError, install, cancelInstall } = component
  const [open, setOpen] = useState(false)
  const missing = Boolean(status && !status.available)

  useEffect(() => {
    if (missing) setOpen(true)
  }, [missing])

  if (!status || status.available) {
    return status?.available ? <p className="help">AI 组件：{status.version}</p> : null
  }

  const size = status.download?.size ? formatBytes(status.download.size) : '约 54 MB'
  const content = <section className="office-engine-notice" aria-live="polite">
    <div>
      <strong>需要 AI 抠图组件</strong>
      <p>抠图模型已从主程序中精简。点击即可从 IMG.LY 官方服务器下载并自动配置，约 {size}。</p>
      <small>组件保存在 data/components/imgly，图片仍只在本机处理。</small>
    </div>
    {installing && progress ? <div className="office-install-progress">
      <div className="office-progress-track"><span style={{ width: `${Math.max(2, progress.percent)}%` }} /></div>
      <p>{progress.message} {progress.stage === 'downloading' ? `${progress.percent}%` : ''}</p>
      <button className="btn btn-sm" type="button" onClick={() => void cancelInstall()}>取消</button>
    </div> : <button className="btn btn-primary" type="button" onClick={() => void install()}>下载并启用组件</button>}
    {installError && <p className="msg msg-error">{installError}</p>}
  </section>

  if (!open) return <div className="office-engine-inline">
    <span>AI 抠图组件尚未安装</span>
    <button className="btn btn-primary btn-sm" type="button" onClick={() => setOpen(true)}>下载组件</button>
  </div>

  return <div className="modal-backdrop office-engine-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget && !installing) setOpen(false)
  }}>
    <div className="office-engine-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-engine-title">
      {!installing && <button className="modal-close" type="button" aria-label="关闭" onClick={() => setOpen(false)}>×</button>}
      <h2 id="ai-engine-title">启用 AI 抠图功能</h2>
      {content}
    </div>
  </div>
}
