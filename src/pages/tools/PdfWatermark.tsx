import { useState } from 'react'
import { degrees } from 'pdf-lib'
import { BatchRunner } from '../../components/BatchRunner'
import { PdfBatchFiles } from '../../components/PdfBatchFiles'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName, canvasToBlob } from '../../lib/image'
import { loadPdf, parsePageRange, pdfBlob } from '../../lib/pdf'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

async function makeWatermark(text: string, size: number, color: string): Promise<Blob> {
  const scale = 3
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = `600 ${size * scale}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
  canvas.width = Math.max(Math.ceil(context.measureText(text).width + size * scale), 1)
  canvas.height = Math.max(Math.ceil(size * scale * 1.7), 1)
  context.font = `600 ${size * scale}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  return canvasToBlob(canvas, 'image/png')
}

export default function PdfWatermark() {
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = usePersistedState('pdfWatermark.text', '仅供内部使用')
  const [range, setRange] = useState('all')
  const [size, setSize] = usePersistedState('pdfWatermark.size', 48)
  const [opacity, setOpacity] = usePersistedState('pdfWatermark.opacity', 25)
  const [angle, setAngle] = usePersistedState('pdfWatermark.angle', -35)
  const [color, setColor] = usePersistedState('pdfWatermark.color', '#d43f3a')
  const { results, busy, done, total, error, run, cancel, setError } = useBatch()

  const start = async () => {
    if (!text.trim()) { setError('请输入水印文字。'); return }
    const markBlob = await makeWatermark(text.trim(), Math.max(12, Number(size) || 48), color)
    await run(files, async file => {
      const document = await loadPdf(file)
      const pages = parsePageRange(range, document.getPageCount())
      const mark = await document.embedPng(await markBlob.arrayBuffer())
      pages.forEach(index => {
        const page = document.getPage(index)
        const targetWidth = Math.min(page.getWidth() * 0.62, mark.width / 3)
        const scale = targetWidth / mark.width
        const width = mark.width * scale; const height = mark.height * scale
        page.drawImage(mark, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height, opacity: Math.max(0.05, Math.min(1, opacity / 100)), rotate: degrees(angle) })
      })
      return { name: `${baseName(file.name)}_watermarked.pdf`, blob: pdfBlob(await document.save()), note: `${pages.length} 页已添加水印` }
    }, file => file.name)
  }

  return <ToolPage title="PDF 文字水印" desc="批量给多个 PDF 添加同一组中文文字水印，每个文件独立输出。">
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>水印设置</h2><div className="field"><label htmlFor="pdf-watermark-text">水印文字</label><input id="pdf-watermark-text" className="input" value={text} onChange={event => setText(event.target.value)} /></div><div className="grid-2"><div className="field"><label htmlFor="pdf-watermark-pages">页码范围</label><input id="pdf-watermark-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /></div><div className="field"><label htmlFor="pdf-watermark-size">字号</label><input id="pdf-watermark-size" className="input" type="number" min={12} max={160} value={size} onChange={event => setSize(Number(event.target.value))} /></div><div className="field"><label htmlFor="pdf-watermark-opacity">透明度（%）</label><input id="pdf-watermark-opacity" className="input" type="number" min={5} max={100} value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></div><div className="field"><label htmlFor="pdf-watermark-angle">旋转角度</label><input id="pdf-watermark-angle" className="input" type="number" min={-180} max={180} value={angle} onChange={event => setAngle(Number(event.target.value))} /></div><div className="field"><label htmlFor="pdf-watermark-color">文字颜色</label><input id="pdf-watermark-color" className="input" type="color" value={color} onChange={event => setColor(event.target.value)} /></div></div><BatchRunner label={`添加水印（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={() => void start()} onCancel={cancel} /></div>
    <ResultList items={results} zipName="pdf-watermarked.zip" />
  </ToolPage>
}
