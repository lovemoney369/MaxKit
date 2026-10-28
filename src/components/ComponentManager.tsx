import { useState } from 'react'
import { formatBytes } from '../lib/image'
import { useAiComponent } from '../lib/useAiComponent'
import { useOfficeEngine } from '../lib/useOfficeEngine'
import { Icon } from './Icon'

type Progress = OfficeInstallProgress | AiInstallProgress | null

function ProgressView({ progress, onCancel }: { progress: Progress; onCancel: () => void }) {
  if (!progress) return null
  return <div className="component-progress">
    <div className="office-progress-track"><span style={{ width: `${Math.max(2, progress.percent)}%` }} /></div>
    <div><span>{progress.message}</span><strong>{progress.stage === 'downloading' ? `${progress.percent}%` : ''}</strong></div>
    <button type="button" onClick={onCancel}>取消</button>
  </div>
}

export function ComponentManager() {
  const [open, setOpen] = useState(false)
  const ai = useAiComponent()
  const office = useOfficeEngine()
  const ready = Number(Boolean(ai.status?.available)) + Number(Boolean(office.status?.available))
  const installing = ai.installing || office.installing

  const removeAi = () => {
    if (confirm('删除 AI 抠图组件？以后仍可重新下载。')) void ai.remove()
  }
  const removeOffice = () => {
    if (confirm('删除已下载的办公文档组件？以后仍可重新下载。')) void office.remove()
  }

  return <>
    <button className="component-manager-trigger" type="button" onClick={() => setOpen(true)} aria-label="组件管理">
      <Icon name="settings" size={18} />
      <span>组件管理</span>
      <small>{ready}/2</small>
    </button>
    {open && <div className="modal-backdrop component-manager-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget && !installing) setOpen(false)
    }}>
      <section className="component-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="component-manager-title">
        <header>
          <div><span className="section-kicker">按需组件</span><h2 id="component-manager-title">组件管理</h2><p>只下载需要的功能，减少主程序体积。</p></div>
          <button className="modal-close" type="button" aria-label="关闭" disabled={installing} onClick={() => setOpen(false)}>×</button>
        </header>
        <div className="component-list">
          <article className="component-card">
            <div className="component-card-icon is-ai"><Icon name="magic" size={22} /></div>
            <div className="component-card-copy">
              <div className="component-card-title"><h3>AI 抠图组件</h3><span className={ai.status?.available ? 'is-ready' : ''}>{ai.status?.available ? (ai.status.managed ? '已安装' : '在线可用') : '未安装'}</span></div>
              <p>用于批量抠图和证件照换底色，包含本地 AI 模型与 ONNX 运行资源。</p>
              <small>{ai.status?.version || `下载约 ${formatBytes(ai.status?.download?.size ?? 56_194_294)}`}</small>
              {ai.installError && <p className="msg msg-error">{ai.installError}</p>}
              {ai.installing ? <ProgressView progress={ai.progress} onCancel={() => void ai.cancelInstall()} /> : <div className="component-actions">
                {ai.status?.available && ai.status.managed && <button className="btn btn-sm component-remove" type="button" onClick={removeAi}>删除组件</button>}
                {ai.status?.available && !ai.status.managed && <span>当前环境直接使用在线资源</span>}
                {!ai.status?.available && <button className="btn btn-primary btn-sm" type="button" onClick={() => void ai.install()}>下载组件</button>}
              </div>}
            </div>
          </article>

          <article className="component-card">
            <div className="component-card-icon is-office"><Icon name="word" size={22} /></div>
            <div className="component-card-copy">
              <div className="component-card-title"><h3>办公文档组件</h3><span className={office.status?.available ? 'is-ready' : ''}>{office.status?.available ? '可用' : '未安装'}</span></div>
              <p>用于 Word、Excel、PPT 格式转换和文档转图片，由 LibreOffice 提供。</p>
              <small>{office.status?.version || `下载约 ${formatBytes(office.status?.download?.size ?? 366_170_112)}`}</small>
              {office.installError && <p className="msg msg-error">{office.installError}</p>}
              {office.installing ? <ProgressView progress={office.progress} onCancel={() => void office.cancelInstall()} /> : <div className="component-actions">
                {!office.status?.available && <button className="btn btn-primary btn-sm" type="button" onClick={() => void office.install()}>下载组件</button>}
                {office.status?.available && office.status.managed && <button className="btn btn-sm component-remove" type="button" onClick={removeOffice}>删除组件</button>}
                {office.status?.available && !office.status.managed && <span>正在使用电脑中已有的 LibreOffice</span>}
              </div>}
            </div>
          </article>
        </div>
        <footer><Icon name="shield" size={16} /><span>组件只保存在本程序的 data/components 目录；处理文件不会上传。</span></footer>
      </section>
    </div>}
  </>
}
