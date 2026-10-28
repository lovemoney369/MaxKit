import { useState } from 'react'
import { degrees } from 'pdf-lib'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

type Rotation = 90 | 180 | 270

export default function PdfRotate() {
  const [files, setFiles] = useState<File[]>([])
  const [range, setRange] = useState('all')
  const [rotation, setRotation] = usePersistedState<Rotation>('pdfRotate.rotation', 90)
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => {
    const document = await loadPdf(file)
    const pages = parsePageRange(range, document.getPageCount())
    pages.forEach(index => { const page = document.getPage(index); page.setRotation(degrees((page.getRotation().angle + rotation) % 360)) })
    return { name: `${baseName(file.name)}_rotated.pdf`, blob: pdfBlob(await document.save()), note: `${pages.length} 页旋转 ${rotation}°` }
  }, file => file.name)
  return <ToolPage title="PDF 页面旋转" desc="批量旋转多个 PDF 的全部或指定页面，每个文件独立生成结果。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>旋转设置</h2><div className="grid-2"><div className="field"><label htmlFor="pdf-rotate-pages">页码范围</label><input id="pdf-rotate-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /></div><div className="field"><label htmlFor="pdf-rotate-angle">顺时针旋转</label><select id="pdf-rotate-angle" className="input" value={rotation} onChange={event => setRotation(Number(event.target.value) as Rotation)}><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option></select></div></div><BatchRunner label={`旋转 PDF（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-rotated.zip" />
  </ToolPage>
}
