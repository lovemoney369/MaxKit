import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { runFFmpeg } from '../../lib/ffmpeg'
import { baseName, canvasToBlob } from '../../lib/image'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

const POSITIONS = [{ value: 'nw', label: '左上', expression: '12:12' }, { value: 'ne', label: '右上', expression: 'W-w-12:12' }, { value: 'c', label: '居中', expression: '(W-w)/2:(H-h)/2' }, { value: 'sw', label: '左下', expression: '12:H-h-12' }, { value: 'se', label: '右下', expression: 'W-w-12:H-h-12' }]

async function textWatermark(text: string, color: string, opacity: number) {
  const canvas = document.createElement('canvas'); const context = canvas.getContext('2d')!
  context.font = '700 56px "Microsoft YaHei", sans-serif'
  const width = Math.ceil(context.measureText(text).width + 32); canvas.width = width; canvas.height = 88
  const draw = canvas.getContext('2d')!; draw.font = '700 56px "Microsoft YaHei", sans-serif'; draw.textBaseline = 'middle'; draw.globalAlpha = opacity; draw.fillStyle = color; draw.fillText(text, 16, 44)
  return canvasToBlob(canvas, 'image/png')
}

export default function GifWatermark() {
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = usePersistedState('gifWatermark.text', 'MaxKit')
  const [color, setColor] = usePersistedState('gifWatermark.color', '#ffffff')
  const [opacity, setOpacity] = usePersistedState('gifWatermark.opacity', .65)
  const [position, setPosition] = usePersistedState('gifWatermark.position', 'se')
  const batch = useBatch()
  const start = async () => {
    if (!text.trim()) { batch.setError('请输入水印文字'); return }
    const watermark = await textWatermark(text.trim(), color, opacity)
    batch.run(files, async file => {
      const positionExpression = POSITIONS.find(item => item.value === position)?.expression ?? POSITIONS[4].expression
      const filter = `[1:v][0:v]scale2ref=w=main_w*0.28:h=ow/mdar[wm][base];[base][wm]overlay=${positionExpression}[marked];[marked]split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=bayer:bayer_scale=5[out]`
      const [output] = await runFFmpeg({ inputs: [{ name: 'input.gif', data: file }, { name: 'watermark.png', data: watermark }], args: ['-i', 'input.gif', '-i', 'watermark.png', '-filter_complex', filter, '-map', '[out]', '-loop', '0', 'output.gif'], outputs: ['output.gif'] })
      return { name: `${baseName(file.name)}_watermarked.gif`, blob: new Blob([output.data as BlobPart], { type: 'image/gif' }), original: file }
    }, file => file.name)
  }
  return <ToolPage title="GIF 添加水印" desc="批量添加文字水印，中文文字先在本地生成透明图层，再覆盖到 GIF 的每一帧。">
    <div className="panel"><FileDrop accept="image/gif" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} /><FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} /></div>
    <div className="panel"><h2>水印设置</h2><div className="grid-2"><div className="field"><label htmlFor="gif-wm-text">水印文字</label><input id="gif-wm-text" className="input" value={text} onChange={event => setText(event.target.value)} /></div><div className="field"><label htmlFor="gif-wm-position">位置</label><select id="gif-wm-position" className="input" value={position} onChange={event => setPosition(event.target.value)}>{POSITIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="field"><label htmlFor="gif-wm-color">文字颜色</label><input id="gif-wm-color" type="color" value={color} onChange={event => setColor(event.target.value)} /></div><div className="field"><label htmlFor="gif-wm-opacity">不透明度：{Math.round(opacity * 100)}%</label><input id="gif-wm-opacity" type="range" min="5" max="100" value={Math.round(opacity * 100)} onChange={event => setOpacity(Number(event.target.value) / 100)} /></div></div><BatchRunner label={`添加水印（${files.length} 个文件）`} busy={batch.busy} done={batch.done} total={batch.total} error={batch.error} disabled={!files.length || !text.trim()} onRun={start} onCancel={batch.cancel} /></div>
    <ResultList items={batch.results} zipName="gif-watermarked.zip" />
  </ToolPage>
}
