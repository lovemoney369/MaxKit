import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

const PT_PER_MM = 72 / 25.4

export default function PdfCropPages() {
  const [files, setFiles] = useState<File[]>([])
  const [range, setRange] = useState('all')
  const [top, setTop] = usePersistedState('pdfCrop.top', 5)
  const [right, setRight] = usePersistedState('pdfCrop.right', 5)
  const [bottom, setBottom] = usePersistedState('pdfCrop.bottom', 5)
  const [left, setLeft] = usePersistedState('pdfCrop.left', 5)
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => {
    const document = await loadPdf(file)
    const pages = parsePageRange(range, document.getPageCount())
    const margins = [top, right, bottom, left].map(value => Math.max(0, Number(value) || 0) * PT_PER_MM)
    pages.forEach(index => {
      const page = document.getPage(index)
      const box = page.getCropBox()
      const [t, r, b, l] = margins
      const width = box.width - l - r
      const height = box.height - t - b
      if (width < 36 || height < 36) throw new Error(`第 ${index + 1} 页裁剪后尺寸过小，请减小裁剪边距。`)
      page.setCropBox(box.x + l, box.y + b, width, height)
    })
    return { name: `${baseName(file.name)}_cropped.pdf`, blob: pdfBlob(await document.save()), note: `${pages.length} 页已裁剪` }
  }, file => file.name)
  return <ToolPage title="PDF 页面裁剪" desc="批量按毫米裁掉多个 PDF 页面四周白边，每个文件独立输出。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>裁剪设置</h2><div className="field"><label htmlFor="pcp-pages">页码范围</label><input id="pcp-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /></div><div className="grid-2"><div className="field"><label htmlFor="pcp-top">上边（毫米）</label><input id="pcp-top" className="input" type="number" min={0} value={top} onChange={event => setTop(Number(event.target.value))} /></div><div className="field"><label htmlFor="pcp-right">右边（毫米）</label><input id="pcp-right" className="input" type="number" min={0} value={right} onChange={event => setRight(Number(event.target.value))} /></div><div className="field"><label htmlFor="pcp-bottom">下边（毫米）</label><input id="pcp-bottom" className="input" type="number" min={0} value={bottom} onChange={event => setBottom(Number(event.target.value))} /></div><div className="field"><label htmlFor="pcp-left">左边（毫米）</label><input id="pcp-left" className="input" type="number" min={0} value={left} onChange={event => setLeft(Number(event.target.value))} /></div></div><p className="help">这里只改变页面的可见区域，不会降低文字和图片清晰度。</p><BatchRunner label={`裁剪 PDF（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-cropped.zip" />
  </ToolPage>
}
