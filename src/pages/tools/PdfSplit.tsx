import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

type OutputMode = 'combined' | 'separate'

export default function PdfSplit() {
  const [files, setFiles] = useState<File[]>([])
  const [range, setRange] = useState('all')
  const [mode, setMode] = usePersistedState<OutputMode>('pdfSplit.mode', 'combined')
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => {
    const source = await loadPdf(file)
    const pages = parsePageRange(range, source.getPageCount())
    const name = baseName(file.name)
    if (mode === 'combined') {
      const output = await PDFDocument.create()
      const copied = await output.copyPages(source, pages)
      copied.forEach(page => output.addPage(page))
      return { name: `${name}_extracted.pdf`, blob: pdfBlob(await output.save()), note: `${pages.length} 页` }
    }
    const output: ResultItem[] = []
    for (const pageIndex of pages) {
      const document = await PDFDocument.create()
      const [page] = await document.copyPages(source, [pageIndex])
      document.addPage(page)
      output.push({ name: `${name}_page_${pageIndex + 1}.pdf`, blob: pdfBlob(await document.save()), note: `${file.name} · 原第 ${pageIndex + 1} 页` })
    }
    return output
  }, file => file.name)
  return <ToolPage title="PDF 拆分与提取" desc="批量从多个 PDF 提取相同页码范围，合成新 PDF 或分别保存页面。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>拆分设置</h2><div className="field"><label htmlFor="pdf-pages">页码范围</label><input id="pdf-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="例如 1-3,5,8-end" /><span className="help">每个文件分别计算页码；支持 all、end 和倒序范围。</span></div><div className="field"><span className="label">输出方式</span><div className="seg" role="group" aria-label="输出方式"><button aria-pressed={mode === 'combined'} onClick={() => setMode('combined')}>每个源文件合成一个 PDF</button><button aria-pressed={mode === 'separate'} onClick={() => setMode('separate')}>每页单独保存</button></div></div><BatchRunner label={`开始提取（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-pages.zip" />
  </ToolPage>
}
