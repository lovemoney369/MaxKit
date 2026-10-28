import { useState } from 'react'
import { degrees } from 'pdf-lib'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName, formatBytes } from '../../lib/image'
import { imageForPdf, loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export default function PdfInsertImage() {
  const [files, setFiles] = useState<File[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [range, setRange] = useState('all')
  const [position, setPosition] = usePersistedState<Position>('pdfInsertImage.position', 'bottom-right')
  const [widthPercent, setWidthPercent] = usePersistedState('pdfInsertImage.width', 25)
  const [opacity, setOpacity] = usePersistedState('pdfInsertImage.opacity', 100)
  const [angle, setAngle] = usePersistedState('pdfInsertImage.angle', 0)
  const { results, busy, done, total, error, run, cancel, setError } = useBatch()
  const start = async () => {
    if (!imageFile) { setError('请选择要插入的图片或签名。'); return }
    const source = await imageForPdf(imageFile)
    await run(files, async file => {
      const document = await loadPdf(file)
      const pages = parsePageRange(range, document.getPageCount())
      const image = source.type === 'png' ? await document.embedPng(source.bytes) : await document.embedJpg(source.bytes)
      pages.forEach(index => {
        const page = document.getPage(index); const margin = 24
        const width = page.getWidth() * Math.max(0.05, Math.min(0.9, widthPercent / 100)); const height = width * source.height / source.width
        const x = position.endsWith('left') ? margin : position.endsWith('right') ? page.getWidth() - width - margin : (page.getWidth() - width) / 2
        const y = position.startsWith('top') ? page.getHeight() - height - margin : position.startsWith('bottom') ? margin : (page.getHeight() - height) / 2
        page.drawImage(image, { x, y, width, height, opacity: Math.max(0.05, Math.min(1, opacity / 100)), rotate: degrees(angle) })
      })
      return { name: `${baseName(file.name)}_image.pdf`, blob: pdfBlob(await document.save()), note: `${pages.length} 页已插入图片` }
    }, file => file.name)
  }
  return <ToolPage title="PDF 插入图片 / 签名" desc="批量把同一张签名、印章或图片放到多个 PDF 的指定页面。">
    <div className="panel"><h2>选择文件</h2><PdfBatchFiles files={files} onChange={setFiles} /><FileDrop compact accept="image/*" onFiles={picked => setImageFile(picked[0])} label="选择要插入的图片 / 签名" hint="推荐使用透明背景 PNG" />{imageFile && <p className="msg msg-info">图片：{imageFile.name} · {formatBytes(imageFile.size)}</p>}</div>
    <div className="panel"><h2>图片设置</h2><div className="grid-2"><div className="field"><label htmlFor="pii-pages">页码范围</label><input id="pii-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /></div><div className="field"><label htmlFor="pii-position">位置</label><select id="pii-position" className="input" value={position} onChange={event => setPosition(event.target.value as Position)}><option value="center">居中</option><option value="top-left">左上角</option><option value="top-right">右上角</option><option value="bottom-left">左下角</option><option value="bottom-right">右下角</option></select></div><div className="field"><label htmlFor="pii-width">页面宽度占比（%）</label><input id="pii-width" className="input" type="number" min={5} max={90} value={widthPercent} onChange={event => setWidthPercent(Number(event.target.value))} /></div><div className="field"><label htmlFor="pii-opacity">透明度（%）</label><input id="pii-opacity" className="input" type="number" min={5} max={100} value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></div><div className="field"><label htmlFor="pii-angle">旋转角度</label><input id="pii-angle" className="input" type="number" min={-180} max={180} value={angle} onChange={event => setAngle(Number(event.target.value))} /></div></div><BatchRunner label={`插入图片（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length || !imageFile} onRun={() => void start()} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-signed.zip" />
  </ToolPage>
}
