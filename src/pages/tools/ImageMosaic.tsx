import { useEffect, useState } from 'react'
import { CropSelector, type CropRect } from '../../components/CropSelector'
import { FileDrop } from '../../components/FileDrop'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { MIME_EXT, canvasToBlob, drawToCanvas, loadImage, replaceExt } from '../../lib/image'

type Effect = 'mosaic' | 'blur'

export default function ImageMosaic() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [rect, setRect] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 })
  const [effect, setEffect] = useState<Effect>('mosaic')
  const [strength, setStrength] = useState(18)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ResultItem[]>([])

  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const pick = async (picked: File[]) => {
    const selected = picked[0]
    const image = await loadImage(selected)
    setFile(selected)
    setUrl(previous => { URL.revokeObjectURL(previous); return URL.createObjectURL(selected) })
    setSize({ w: image.naturalWidth, h: image.naturalHeight })
    setRect({ x: Math.round(image.naturalWidth * .3), y: Math.round(image.naturalHeight * .3), w: Math.round(image.naturalWidth * .4), h: Math.round(image.naturalHeight * .4) })
    setResults([])
  }

  const run = async () => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const image = await loadImage(file)
      const canvas = drawToCanvas(image, image.naturalWidth, image.naturalHeight)
      const context = canvas.getContext('2d')!
      if (effect === 'mosaic') {
        const block = Math.max(2, strength)
        const small = document.createElement('canvas')
        small.width = Math.max(1, Math.ceil(rect.w / block)); small.height = Math.max(1, Math.ceil(rect.h / block))
        small.getContext('2d')!.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, small.width, small.height)
        context.imageSmoothingEnabled = false
        context.drawImage(small, 0, 0, small.width, small.height, rect.x, rect.y, rect.w, rect.h)
        context.imageSmoothingEnabled = true
      } else {
        const copy = drawToCanvas(canvas, canvas.width, canvas.height)
        context.save(); context.beginPath(); context.rect(rect.x, rect.y, rect.w, rect.h); context.clip()
        context.filter = `blur(${Math.max(1, strength / 2)}px)`
        const padding = strength
        context.drawImage(copy, rect.x - padding, rect.y - padding, rect.w + padding * 2, rect.h + padding * 2, rect.x - padding, rect.y - padding, rect.w + padding * 2, rect.h + padding * 2)
        context.restore()
      }
      const mime = MIME_EXT[file.type] ? file.type : 'image/png'
      setResults([{ name: replaceExt(file.name, MIME_EXT[mime]), blob: await canvasToBlob(canvas, mime, mime === 'image/png' ? undefined : .92), note: `${effect === 'mosaic' ? '马赛克' : '模糊'}区域 ${rect.w} × ${rect.h}` }])
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)) }
    finally { setBusy(false) }
  }

  return (
    <ToolPage title="图片马赛克 / 模糊" desc="拖动选区遮挡人脸、号码、地址等隐私内容，然后选择马赛克或模糊效果。">
      {!file ? <div className="panel"><FileDrop accept="image/*" onFiles={pick} /></div> : <>
        <div className="panel">
          <div className="row">
            <div className="seg" role="group" aria-label="遮挡效果">
              <button aria-pressed={effect === 'mosaic'} onClick={() => setEffect('mosaic')}>马赛克</button>
              <button aria-pressed={effect === 'blur'} onClick={() => setEffect('blur')}>模糊</button>
            </div>
            <button className="btn" onClick={() => setFile(null)}>换一张图</button>
          </div>
          <div className="field"><label htmlFor="mosaic-strength">效果强度：{strength}</label><input id="mosaic-strength" type="range" min="4" max="50" value={strength} onChange={event => setStrength(Number(event.target.value))} /></div>
          {size && <CropSelector src={url} naturalWidth={size.w} naturalHeight={size.h} value={rect} onChange={setRect} />}
          {error && <p className="msg msg-error">{error}</p>}
          <button className={`btn btn-primary${busy ? ' is-loading' : ''}`} disabled={busy} onClick={run}>{busy ? '处理中…' : '应用遮挡效果'}</button>
        </div>
        <ResultList items={results} />
      </>}
    </ToolPage>
  )
}
