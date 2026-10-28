import { useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { canvasToBlob, loadImage } from '../../lib/image'
import { pdfBlob } from '../../lib/pdf'
import { usePersistedState } from '../../lib/usePersistedState'

type PageSize = 'image' | 'a4-portrait' | 'a4-landscape'

async function imageBytes(file: File): Promise<{ bytes: ArrayBuffer; type: 'png' | 'jpg'; width: number; height: number }> {
  const image = await loadImage(file)
  if (file.type === 'image/png' || file.type === 'image/jpeg') {
    return { bytes: await file.arrayBuffer(), type: file.type === 'image/png' ? 'png' : 'jpg', width: image.naturalWidth, height: image.naturalHeight }
  }
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  const blob = await canvasToBlob(canvas, 'image/png')
  return { bytes: await blob.arrayBuffer(), type: 'png', width: canvas.width, height: canvas.height }
}

export default function ImagesToPdf() {
  const [files, setFiles] = useState<File[]>([])
  const [pageSize, setPageSize] = usePersistedState<PageSize>('imagesToPdf.pageSize', 'a4-portrait')
  const [margin, setMargin] = usePersistedState('imagesToPdf.margin', 24)
  const [results, setResults] = useState<ResultItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const move = (index: number, direction: -1 | 1) => {
    const next = [...files]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    setFiles(next)
  }

  const run = async () => {
    setBusy(true)
    setError('')
    setResults([])
    try {
      const document = await PDFDocument.create()
      for (const file of files) {
        const source = await imageBytes(file)
        const embedded = source.type === 'png' ? await document.embedPng(source.bytes) : await document.embedJpg(source.bytes)
        const [pageWidth, pageHeight] = pageSize === 'a4-portrait'
          ? [595.28, 841.89]
          : pageSize === 'a4-landscape'
            ? [841.89, 595.28]
            : [source.width, source.height]
        const safeMargin = pageSize === 'image' ? 0 : Math.max(0, Math.min(Number(margin) || 0, Math.min(pageWidth, pageHeight) / 3))
        const availableWidth = pageWidth - safeMargin * 2
        const availableHeight = pageHeight - safeMargin * 2
        const scale = Math.min(availableWidth / source.width, availableHeight / source.height)
        const width = source.width * scale
        const height = source.height * scale
        const page = document.addPage([pageWidth, pageHeight])
        page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) })
        page.drawImage(embedded, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height })
      }
      setResults([{ name: 'images.pdf', blob: pdfBlob(await document.save()), note: `${files.length} 页` }])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="图片转 PDF" desc="按列表顺序把多张图片生成一个 PDF。支持 PNG、JPG、WebP 等浏览器可读取的图片格式。">
      <div className="panel">
        <FileDrop accept="image/*" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="可多选，用箭头调整页面顺序" />
        <FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} onMove={move} />
      </div>
      <div className="panel">
        <h2>页面设置</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="itp-size">页面尺寸</label>
            <select id="itp-size" className="input" value={pageSize} onChange={event => setPageSize(event.target.value as PageSize)}>
              <option value="a4-portrait">A4 纵向</option>
              <option value="a4-landscape">A4 横向</option>
              <option value="image">跟随图片尺寸</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="itp-margin">页边距（pt）</label>
            <input id="itp-margin" className="input" type="number" min={0} max={200} disabled={pageSize === 'image'} value={margin} onChange={event => setMargin(Number(event.target.value))} />
          </div>
        </div>
        {error && <p className="msg msg-error">{error}</p>}
        <button className={`btn btn-primary${busy ? ' is-loading' : ''}`} disabled={files.length === 0 || busy} onClick={run}>
          {busy && <span className="spinner" />}
          {busy ? '正在生成…' : `生成 PDF（${files.length} 张图片）`}
        </button>
      </div>
      <ResultList items={results} />
    </ToolPage>
  )
}

