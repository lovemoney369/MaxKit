import { useEffect, useRef, useState } from 'react'
import { degrees, PDFDocument } from 'pdf-lib'
import { FileDrop } from '../../components/FileDrop'
import { Icon } from '../../components/Icon'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName, formatBytes } from '../../lib/image'
import { loadPdf, pdfBlob } from '../../lib/pdf'
import { renderPdfPages } from '../../lib/pdf-render'

interface PageItem { originalIndex: number; rotation: number; preview: string }

export default function PdfOrganize() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [results, setResults] = useState<ResultItem[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const previewUrls = useRef<string[]>([])

  useEffect(() => () => previewUrls.current.forEach(url => URL.revokeObjectURL(url)), [])

  const pick = async (picked: File[]) => {
    const next = picked[0]
    previewUrls.current.forEach(url => URL.revokeObjectURL(url))
    previewUrls.current = []
    setFile(next)
    setPages([])
    setResults([])
    setError('')
    setLoading(true)
    try {
      const source = await loadPdf(next)
      const indices = source.getPageIndices()
      const previews = await renderPdfPages(next, indices, 0.3, 'jpeg', 0.78)
      const nextPages = previews.map((preview, index) => ({ originalIndex: index, rotation: 0, preview: URL.createObjectURL(preview.blob) }))
      previewUrls.current = nextPages.map(page => page.preview)
      setPages(nextPages)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }

  const update = (index: number, action: 'up' | 'down' | 'left' | 'right' | 'delete') => {
    const next = [...pages]
    if (action === 'delete') next.splice(index, 1)
    else if (action === 'up' && index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]]
    else if (action === 'down' && index < next.length - 1) [next[index], next[index + 1]] = [next[index + 1], next[index]]
    else if (action === 'left' || action === 'right') next[index] = { ...next[index], rotation: (next[index].rotation + (action === 'left' ? 270 : 90)) % 360 }
    setPages(next)
  }

  const run = async () => {
    if (!file) return
    if (!pages.length) { setError('请至少保留一页。'); return }
    setBusy(true)
    setError('')
    setResults([])
    try {
      const source = await loadPdf(file)
      const output = await PDFDocument.create()
      for (const item of pages) {
        const [page] = await output.copyPages(source, [item.originalIndex])
        if (item.rotation) page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360))
        output.addPage(page)
      }
      setResults([{ name: `${baseName(file.name)}_organized.pdf`, blob: pdfBlob(await output.save()), note: `${pages.length} 页` }])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="PDF 页面整理" desc="查看页面缩略图，调整顺序、旋转或删除页面，然后生成一个新 PDF。">
      <div className="panel">
        <FileDrop accept="application/pdf,.pdf" onFiles={pick} hint="选择一个 PDF，随后会在本地生成页面缩略图" />
        {file && <p className="msg msg-info">{file.name} · {formatBytes(file.size)}{pages.length ? ` · 当前保留 ${pages.length} 页` : ''}</p>}
        {loading && <p className="msg msg-info"><span className="spinner" /> 正在生成缩略图…</p>}
      </div>
      {pages.length > 0 && <div className="panel"><h2>页面顺序</h2><p className="help">使用按钮调整页面；编号“原”表示它在原文件中的页码。</p><div className="pdf-page-grid">{pages.map((item, index) => <article className="pdf-page-card" key={`${item.originalIndex}-${index}`}><div className="pdf-page-preview"><img src={item.preview} alt={`原第 ${item.originalIndex + 1} 页`} style={{ transform: `rotate(${item.rotation}deg)` }} /></div><strong>第 {index + 1} 页 <small>原 {item.originalIndex + 1}</small></strong><div className="pdf-page-actions"><button className="btn btn-sm" disabled={index === 0} onClick={() => update(index, 'up')} aria-label={`上移第 ${index + 1} 页`}><Icon name="arrow-up" size={15} /></button><button className="btn btn-sm" disabled={index === pages.length - 1} onClick={() => update(index, 'down')} aria-label={`下移第 ${index + 1} 页`}><Icon name="arrow-down" size={15} /></button><button className="btn btn-sm" onClick={() => update(index, 'left')} aria-label={`向左旋转第 ${index + 1} 页`}>↶</button><button className="btn btn-sm" onClick={() => update(index, 'right')} aria-label={`向右旋转第 ${index + 1} 页`}>↷</button><button className="btn btn-sm btn-danger" onClick={() => update(index, 'delete')} aria-label={`删除第 ${index + 1} 页`}><Icon name="x" size={15} /></button></div></article>)}</div></div>}
      <div className="panel">
        {error && <p className="msg msg-error">{error}</p>}
        <button className={`btn btn-primary${busy ? ' is-loading' : ''}`} disabled={!file || !pages.length || loading || busy} onClick={run}>{busy && <span className="spinner" />}{busy ? '正在生成…' : '应用整理并生成新 PDF'}</button>
      </div>
      <ResultList items={results} />
    </ToolPage>
  )
}
