import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'

export default function PdfDeletePages() {
  const [files, setFiles] = useState<File[]>([])
  const [range, setRange] = useState('')
  const { results, busy, done, total, error, run, cancel, setError } = useBatch()
  const start = () => {
    if (!range.trim()) { setError('请输入需要删除的页码。'); return }
    void run(files, async file => {
      const document = await loadPdf(file)
      const pages = parsePageRange(range, document.getPageCount())
      if (pages.length >= document.getPageCount()) throw new Error('不能删除全部页面，请至少保留一页。')
      pages.sort((a, b) => b - a).forEach(index => document.removePage(index))
      return { name: `${baseName(file.name)}_deleted.pdf`, blob: pdfBlob(await document.save()), note: `删除 ${pages.length} 页，保留 ${document.getPageCount()} 页` }
    }, file => file.name)
  }
  return <ToolPage title="PDF 删除页面" desc="批量删除多个 PDF 中相同页码范围的页面，每个文件独立生成结果。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>删除设置</h2><div className="field"><label htmlFor="pdf-delete-pages">需要删除的页码</label><input id="pdf-delete-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="例如 2,4-6,end" /><span className="help">每个文件分别计算页码；页数不足的文件会标记失败，其他文件继续处理。</span></div><BatchRunner label={`删除页面（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-deleted.zip" />
  </ToolPage>
}
