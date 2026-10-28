import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { loadPdf, parsePageRange } from '../../lib/pdf'
import { renderPdfPages } from '../../lib/pdf-render'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

type ImageFormat = 'png' | 'jpeg'

export default function PdfToImages() {
  const [files, setFiles] = useState<File[]>([])
  const [range, setRange] = useState('all')
  const [format, setFormat] = usePersistedState<ImageFormat>('pdfToImages.format', 'png')
  const [scale, setScale] = usePersistedState('pdfToImages.scale', 2)
  const [quality, setQuality] = usePersistedState('pdfToImages.quality', 90)
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => {
    const document = await loadPdf(file)
    const pages = parsePageRange(range, document.getPageCount())
    const rendered = await renderPdfPages(file, pages, scale, format, quality / 100)
    const extension = format === 'png' ? 'png' : 'jpg'; const name = baseName(file.name)
    return rendered.map(page => ({ name: `${name}_page_${page.pageNumber}.${extension}`, blob: page.blob, note: `${file.name} · ${page.width} × ${page.height}` }))
  }, file => file.name)
  return <ToolPage title="PDF 转图片" desc="批量把多个 PDF 转为 PNG 或 JPG，所有页面结果可统一打包保存。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>导出设置</h2><div className="grid-2"><div className="field"><label htmlFor="pti-pages">页码范围</label><input id="pti-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /></div><div className="field"><label htmlFor="pti-format">图片格式</label><select id="pti-format" className="input" value={format} onChange={event => setFormat(event.target.value as ImageFormat)}><option value="png">PNG（清晰）</option><option value="jpeg">JPG（体积更小）</option></select></div><div className="field"><label htmlFor="pti-scale">清晰度</label><select id="pti-scale" className="input" value={scale} onChange={event => setScale(Number(event.target.value))}><option value={1}>标准 1×</option><option value={1.5}>清晰 1.5×</option><option value={2}>高清 2×</option><option value={3}>超清 3×</option></select></div><div className="field"><label htmlFor="pti-quality">JPG 质量（%）</label><input id="pti-quality" className="input" type="number" min={30} max={100} disabled={format === 'png'} value={quality} onChange={event => setQuality(Number(event.target.value))} /></div></div><BatchRunner label={`转换 PDF（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-images.zip" />
  </ToolPage>
}
