import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { runFFmpeg } from '../../lib/ffmpeg'
import { paletteFilter } from '../../lib/gif'
import { baseName } from '../../lib/image'
import { useBatch } from '../../lib/useBatch'

export default function GifResize() {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<'percent' | 'width'>('percent')
  const [value, setValue] = useState(50)
  const batch = useBatch()
  const start = () => batch.run(files, async file => {
    const scale = mode === 'percent' ? `scale=trunc(iw*${value / 100}/2)*2:-2:flags=lanczos` : `scale=${Math.max(2, Math.round(value / 2) * 2)}:-2:flags=lanczos`
    const [output] = await runFFmpeg({ inputs: [{ name: 'input.gif', data: file }], args: ['-i', 'input.gif', '-vf', paletteFilter(scale), '-loop', '0', 'output.gif'], outputs: ['output.gif'] })
    return { name: `${baseName(file.name)}_resized.gif`, blob: new Blob([output.data as BlobPart], { type: 'image/gif' }), original: file }
  }, file => file.name)
  return <ToolPage title="GIF 修改尺寸" desc="批量按百分比或指定宽度缩放 GIF，高度自动按比例计算。">
    <div className="panel"><FileDrop accept="image/gif" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} /><FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} /></div>
    <div className="panel"><h2>尺寸设置</h2><div className="seg" role="group" aria-label="调整方式"><button aria-pressed={mode === 'percent'} onClick={() => { setMode('percent'); setValue(50) }}>按百分比</button><button aria-pressed={mode === 'width'} onClick={() => { setMode('width'); setValue(640) }}>按宽度</button></div><div className="field"><label htmlFor="gif-resize-value">{mode === 'percent' ? '缩放比例（%）' : '输出宽度（px）'}</label><input id="gif-resize-value" className="input" type="number" min="1" max={mode === 'percent' ? 400 : 4096} value={value} onChange={event => setValue(Number(event.target.value))} /></div><BatchRunner label={`调整尺寸（${files.length} 个文件）`} busy={batch.busy} done={batch.done} total={batch.total} error={batch.error} disabled={!files.length || value <= 0} onRun={start} onCancel={batch.cancel} /></div>
    <ResultList items={batch.results} zipName="gif-resized.zip" />
  </ToolPage>
}
