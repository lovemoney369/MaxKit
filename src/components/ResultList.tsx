import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadBlob, downloadZip } from '../lib/download'
import { formatBytes } from '../lib/image'
import { BeforeAfter } from './BeforeAfter'
import { Icon } from './Icon'

export interface ResultItem {
  name: string
  blob: Blob
  /** 附加说明，如压缩前后大小对比 */
  note?: string
  /** 可选原图，提供后结果支持前后对比滑块 */
  original?: Blob
}

function ResultRow({ item, index }: { item: ResultItem; index: number }) {
  const url = useMemo(() => URL.createObjectURL(item.blob), [item.blob])
  const originalUrl = useMemo(
    () => (item.original ? URL.createObjectURL(item.original) : null),
    [item.original],
  )
  const [compare, setCompare] = useState(false)
  const [preview, setPreview] = useState(false)
  useEffect(
    () => () => {
      URL.revokeObjectURL(url)
      if (originalUrl) URL.revokeObjectURL(originalUrl)
    },
    [url, originalUrl],
  )
  const [downloaded, setDownloaded] = useState(false)
  const isVideo = item.blob.type.startsWith('video/')
  const isImage = item.blob.type.startsWith('image/')
  const isAudio = item.blob.type.startsWith('audio/')
  const canCompare = !!originalUrl && isImage

  useEffect(() => {
    if (!preview) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setPreview(false)
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [preview])

  const handleDownload = () => {
    downloadBlob(item.blob, item.name)
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 1800)
  }

  return (
    <div className="result-item" data-result-url={url} style={{ '--ri': index } as React.CSSProperties}>
      <button className="preview-trigger" onClick={() => setPreview(true)} aria-label={`预览 ${item.name}`} disabled={!isImage && !isVideo}>
        {isVideo ? <video className="thumb" src={url} muted /> : isImage ? <img className="thumb" src={url} alt={item.name} loading="lazy" /> : <span className="result-file-icon"><Icon name={isAudio ? 'audio' : 'pdf'} size={24} /></span>}
        {(isImage || isVideo) && <span>点击预览</span>}
      </button>
      <div className="result-meta">
        <span className="name">{item.name}</span>
        <span className="note">
          {formatBytes(item.blob.size)}
          {item.note ? ` · ${item.note}` : ''}
        </span>
      </div>
      {canCompare && (
        <button
          className={`btn btn-sm${compare ? ' is-active-toggle' : ''}`}
          aria-pressed={compare}
          onClick={() => setCompare(c => !c)}
        >
          <Icon name="image" size={15} />
          对比
        </button>
      )}
      <button className={`btn btn-sm${downloaded ? ' is-success' : ''}`} onClick={handleDownload}>
        <Icon name={downloaded ? 'check' : 'download'} size={16} />
        {downloaded ? '已保存' : '保存'}
      </button>
      {canCompare && compare && (
        <div className="result-compare">
          <BeforeAfter before={originalUrl!} after={url} />
        </div>
      )}
      {preview && createPortal(
        <div className="modal-backdrop preview-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPreview(false)}>
          <section className="preview-modal" role="dialog" aria-modal="true" aria-label={`预览 ${item.name}`}>
            <header><span>{item.name}</span><button className="modal-close" onClick={() => setPreview(false)} aria-label="关闭预览"><Icon name="x" size={20} /></button></header>
            <div className="preview-stage">
              {isVideo ? <video src={url} controls autoPlay /> : <img src={url} alt={item.name} />}
            </div>
            <footer><span>{formatBytes(item.blob.size)}</span><button className="btn btn-primary" onClick={handleDownload}><Icon name="download" size={16} />保存到电脑</button></footer>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}

export function ResultList({ items, zipName = 'koding-images.zip' }: { items: ResultItem[]; zipName?: string }) {
  if (items.length === 0) return null

  // 批量汇总：所有结果都带原图时，统计总体积变化
  const withOriginal = items.filter(it => it.original)
  const summary =
    items.length > 1 && withOriginal.length === items.length
      ? (() => {
          const origTotal = withOriginal.reduce((s, it) => s + it.original!.size, 0)
          const newTotal = items.reduce((s, it) => s + it.blob.size, 0)
          const pct = Math.round((1 - newTotal / origTotal) * 100)
          const dir = pct >= 1 ? `减小 ${pct}%` : pct <= -1 ? `增大 ${Math.abs(pct)}%` : '体积基本不变'
          return `共 ${formatBytes(origTotal)} → ${formatBytes(newTotal)}（${dir}）`
        })()
      : null

  return (
    <div className="panel" aria-live="polite">
      <h2>
        处理结果（{items.length} 个文件）
        {summary && <span className="result-summary">{summary}</span>}
      </h2>
      <div className="result-list">
        {items.map((it, i) => (
          <ResultRow key={`${it.name}-${i}`} item={it} index={i} />
        ))}
      </div>
      {items.length > 1 && (
        <button
          className="btn btn-primary"
          onClick={() => downloadZip(items.map(it => ({ name: it.name, data: it.blob })), zipName)}
        >
          <Icon name="zip" size={18} />
          全部打包保存 ZIP
        </button>
      )}
    </div>
  )
}
