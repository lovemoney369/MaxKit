import { useState } from 'react'
import { FFmpegRunner } from '../../components/FFmpegRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { runFFmpeg } from '../../lib/ffmpeg'
import { paletteFilter } from '../../lib/gif'
import { canvasToBlob, loadImage } from '../../lib/image'
import { useFFmpegJob } from '../../lib/useFFmpegJob'
import { usePersistedState } from '../../lib/usePersistedState'

export default function ImagesToGif() {
  const [files, setFiles] = useState<File[]>([])
  const [duration, setDuration] = usePersistedState('imagesToGif.duration', 500)
  const [width, setWidth] = usePersistedState('imagesToGif.width', 640)
  const [results, setResults] = useState<ResultItem[]>([])
  const job = useFFmpegJob()
  const move = (index: number, direction: -1 | 1) => { const next = [...files]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; setFiles(next) }

  const start = () => {
    setResults([])
    job.run(async () => {
      const first = await loadImage(files[0])
      const targetWidth = Math.max(16, Math.round(width || first.naturalWidth))
      const targetHeight = Math.max(16, Math.round(targetWidth * first.naturalHeight / first.naturalWidth))
      const inputs: { name: string; data: Blob }[] = []
      for (let index = 0; index < files.length; index++) {
        const image = await loadImage(files[index])
        const canvas = document.createElement('canvas'); canvas.width = targetWidth; canvas.height = targetHeight
        const context = canvas.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0, 0, targetWidth, targetHeight)
        const scale = Math.min(targetWidth / image.naturalWidth, targetHeight / image.naturalHeight)
        const drawWidth = image.naturalWidth * scale; const drawHeight = image.naturalHeight * scale
        context.drawImage(image, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight)
        inputs.push({ name: `frame${String(index).padStart(4, '0')}.png`, data: await canvasToBlob(canvas, 'image/png') })
      }
      const frameRate = Math.max(.1, Math.min(50, 1000 / Math.max(20, duration)))
      const [output] = await runFFmpeg({ inputs, args: ['-framerate', String(frameRate), '-i', 'frame%04d.png', '-vf', paletteFilter(''), '-loop', '0', 'output.gif'], outputs: ['output.gif'], onProgress: job.setProgress, onStatus: job.setStatus })
      setResults([{ name: 'images.gif', blob: new Blob([output.data as BlobPart], { type: 'image/gif' }), note: `${files.length} 帧 · ${targetWidth} × ${targetHeight}` }])
    })
  }

  return (
    <ToolPage title="多张图片转 GIF" desc="按文件列表顺序制作循环 GIF。不同尺寸的图片会等比缩放并居中补白。">
      <div className="panel"><FileDrop accept="image/*" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} hint="可用箭头调整帧顺序" /><FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} onMove={move} /></div>
      <div className="panel">
        <h2>动画设置</h2>
        <div className="grid-2">
          <div className="field"><label htmlFor="itg-duration">每帧停留（毫秒）</label><input id="itg-duration" className="input" type="number" min="20" max="10000" value={duration} onChange={event => setDuration(Number(event.target.value))} /></div>
          <div className="field"><label htmlFor="itg-width">输出宽度（px）</label><input id="itg-width" className="input" type="number" min="16" max="4096" value={width} onChange={event => setWidth(Number(event.target.value))} /></div>
        </div>
        <FFmpegRunner label={`生成 GIF（${files.length} 帧）`} busy={job.busy} status={job.status} progress={job.progress} error={job.error} disabled={files.length < 2} onRun={start} onCancel={job.cancel} />
      </div>
      <ResultList items={results} />
    </ToolPage>
  )
}
