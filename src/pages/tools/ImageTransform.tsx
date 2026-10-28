import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { MIME_EXT, canvasToBlob, loadImage, replaceExt } from '../../lib/image'
import { useBatch } from '../../lib/useBatch'

type Flip = 'none' | 'horizontal' | 'vertical'

export default function ImageTransform() {
  const [files, setFiles] = useState<File[]>([])
  const [angle, setAngle] = useState(0)
  const [flip, setFlip] = useState<Flip>('none')
  const batch = useBatch()

  const start = () => batch.run(files, async file => {
    const image = await loadImage(file)
    const swap = Math.abs(angle) % 180 === 90
    const canvas = document.createElement('canvas')
    canvas.width = swap ? image.naturalHeight : image.naturalWidth
    canvas.height = swap ? image.naturalWidth : image.naturalHeight
    const context = canvas.getContext('2d')!
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((angle * Math.PI) / 180)
    context.scale(flip === 'horizontal' ? -1 : 1, flip === 'vertical' ? -1 : 1)
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
    const mime = MIME_EXT[file.type] ? file.type : 'image/png'
    const blob = await canvasToBlob(canvas, mime, mime === 'image/png' ? undefined : 0.92)
    return { name: replaceExt(file.name, MIME_EXT[mime]), blob, original: file, note: `${canvas.width} × ${canvas.height}` }
  }, file => file.name)

  return (
    <ToolPage title="图片旋转与翻转" desc="批量旋转或翻转图片。重新导出会把手机照片的显示方向归一，避免在不同软件中方向不一致。">
      <div className="panel">
        <FileDrop accept="image/*" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} hint="可多选，输出保持原格式" />
        <FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} />
      </div>
      <div className="panel">
        <h2>变换设置</h2>
        <div className="field">
          <label>旋转角度</label>
          <div className="seg" role="group" aria-label="旋转角度">
            {[0, 90, 180, 270].map(value => <button key={value} aria-pressed={angle === value} onClick={() => setAngle(value)}>{value === 0 ? '不旋转' : `${value}°`}</button>)}
          </div>
        </div>
        <div className="field">
          <label>翻转方式</label>
          <div className="seg" role="group" aria-label="翻转方式">
            <button aria-pressed={flip === 'none'} onClick={() => setFlip('none')}>不翻转</button>
            <button aria-pressed={flip === 'horizontal'} onClick={() => setFlip('horizontal')}>水平翻转</button>
            <button aria-pressed={flip === 'vertical'} onClick={() => setFlip('vertical')}>垂直翻转</button>
          </div>
        </div>
        <p className="help">直接选择“不旋转、不翻转”也可以批量归一照片方向。</p>
        <BatchRunner label={`开始处理（${files.length} 个文件）`} busy={batch.busy} done={batch.done} total={batch.total} error={batch.error} disabled={!files.length} onRun={start} onCancel={batch.cancel} />
      </div>
      <ResultList items={batch.results} zipName="transformed-images.zip" />
    </ToolPage>
  )
}
