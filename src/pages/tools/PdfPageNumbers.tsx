import { useState } from 'react'
import { rgb, StandardFonts } from 'pdf-lib'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

type Position = 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'

export default function PdfPageNumbers() {
  const [files, setFiles] = useState<File[]>([])
  const [range, setRange] = useState('all')
  const [start, setStart] = usePersistedState('pdfPageNumbers.start', 1)
  const [size, setSize] = usePersistedState('pdfPageNumbers.size', 11)
  const [position, setPosition] = usePersistedState<Position>('pdfPageNumbers.position', 'bottom-center')
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const process = () => void run(files, async file => {
    const document = await loadPdf(file)
    const pages = parsePageRange(range, document.getPageCount())
    const font = await document.embedFont(StandardFonts.Helvetica)
    const fontSize = Math.max(6, Math.min(72, Number(size) || 11)); const first = Number(start) || 1
    pages.forEach((pageIndex, order) => {
      const page = document.getPage(pageIndex); const label = String(first + order); const width = font.widthOfTextAtSize(label, fontSize)
      const x = position.endsWith('right') ? page.getWidth() - width - 28 : (page.getWidth() - width) / 2
      const y = position.startsWith('top') ? page.getHeight() - fontSize - 22 : 22
      page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.25, 0.25, 0.25) })
    })
    return { name: `${baseName(file.name)}_numbered.pdf`, blob: pdfBlob(await document.save()), note: `${pages.length} 页已添加页码` }
  }, file => file.name)
  return <ToolPage title="PDF 添加页码" desc="批量给多个 PDF 添加连续页码，每个文件都从指定编号重新开始。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>页码设置</h2><div className="grid-2"><div className="field"><label htmlFor="pdf-number-pages">页码范围</label><input id="pdf-number-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /></div><div className="field"><label htmlFor="pdf-number-start">起始编号</label><input id="pdf-number-start" className="input" type="number" value={start} onChange={event => setStart(Number(event.target.value))} /></div><div className="field"><label htmlFor="pdf-number-size">字号</label><input id="pdf-number-size" className="input" type="number" min={6} max={72} value={size} onChange={event => setSize(Number(event.target.value))} /></div><div className="field"><label htmlFor="pdf-number-position">位置</label><select id="pdf-number-position" className="input" value={position} onChange={event => setPosition(event.target.value as Position)}><option value="bottom-center">底部居中</option><option value="bottom-right">右下角</option><option value="top-center">顶部居中</option><option value="top-right">右上角</option></select></div></div><BatchRunner label={`添加页码（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={process} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-numbered.zip" />
  </ToolPage>
}
