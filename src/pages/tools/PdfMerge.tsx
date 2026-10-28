import { useState } from 'react'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { PDFDocument } from 'pdf-lib'
import { loadPdf, pdfBlob } from '../../lib/pdf'

export default function PdfMerge() {
  const [files, setFiles] = useState<File[]>([])
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
      const output = await PDFDocument.create()
      let pageCount = 0
      for (const file of files) {
        const source = await loadPdf(file)
        const pages = await output.copyPages(source, source.getPageIndices())
        pages.forEach(page => output.addPage(page))
        pageCount += pages.length
      }
      const blob = pdfBlob(await output.save())
      setResults([{ name: 'merged.pdf', blob, note: `${pageCount} 页` }])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolPage title="PDF 合并" desc="按列表中的顺序把多个 PDF 合并成一个文件。文件只在本地电脑中处理，不会上传。">
      <div className="panel">
        <FileDrop accept="application/pdf,.pdf" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="至少选择 2 个 PDF，可用箭头调整合并顺序" />
        <FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} onMove={move} />
      </div>
      <div className="panel">
        <h2>合并设置</h2>
        <p className="help">将按照上方从 1 开始的顺序合并，原文件不会被修改。</p>
        {error && <p className="msg msg-error">{error}</p>}
        <button className={`btn btn-primary${busy ? ' is-loading' : ''}`} disabled={files.length < 2 || busy} onClick={run}>
          {busy && <span className="spinner" />}
          {busy ? '正在合并…' : `开始合并（${files.length} 个文件）`}
        </button>
      </div>
      <ResultList items={results} />
    </ToolPage>
  )
}

