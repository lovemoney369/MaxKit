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
import { usePersistedState } from '../../lib/usePersistedState'

export default function GifSpeed() {
  const [files, setFiles] = useState<File[]>([])
  const [speed, setSpeed] = usePersistedState('gifSpeed.speed', 2)
  const batch = useBatch()
  const start = () => batch.run(files, async file => {
    const [output] = await runFFmpeg({ inputs: [{ name: 'input.gif', data: file }], args: ['-i', 'input.gif', '-vf', paletteFilter(`setpts=PTS/${speed}`), '-loop', '0', 'output.gif'], outputs: ['output.gif'] })
    return { name: `${baseName(file.name)}_${speed}x.gif`, blob: new Blob([output.data as BlobPart], { type: 'image/gif' }), original: file, note: `${speed} 倍速` }
  }, file => file.name)
  return <ToolPage title="GIF 调整速度" desc="批量加速或减慢 GIF，保持循环播放和高质量调色板。">
    <div className="panel"><FileDrop accept="image/gif" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} /><FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} /></div>
    <div className="panel"><h2>速度设置</h2><div className="field"><label htmlFor="gif-speed">播放速度</label><select id="gif-speed" className="input" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="3">3×</option><option value="4">4×</option></select></div><BatchRunner label={`调整速度（${files.length} 个文件）`} busy={batch.busy} done={batch.done} total={batch.total} error={batch.error} disabled={!files.length} onRun={start} onCancel={batch.cancel} /></div>
    <ResultList items={batch.results} zipName="gif-speed.zip" />
  </ToolPage>
}
