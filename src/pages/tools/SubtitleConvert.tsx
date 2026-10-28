import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { parseSubtitles, serializeSubtitles, type SubtitleFormat } from '../../lib/subtitle'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

function sourceFormat(name: string): SubtitleFormat {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'srt' || ext === 'vtt') return ext
  if (ext === 'ass' || ext === 'ssa') return 'ass'
  throw new Error('仅支持 SRT、VTT、ASS、SSA')
}

export default function SubtitleConvert() {
  const [files, setFiles] = useState<File[]>([]); const [target, setTarget] = usePersistedState<SubtitleFormat>('subtitle.target', 'srt'); const [offset, setOffset] = useState(0)
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => { const cues = parseSubtitles(await file.text(), sourceFormat(file.name)); const text = serializeSubtitles(cues, target, Math.round(offset * 1000)); return { name: `${baseName(file.name)}.${target}`, blob: new Blob([text], { type: 'text/plain;charset=utf-8' }), note: `${cues.length} 条字幕` } }, file => file.name)
  return <ToolPage title="字幕格式转换" desc="批量转换 SRT、WebVTT、ASS、SSA，并可统一调整时间轴。"><FileDrop accept=".srt,.vtt,.ass,.ssa,text/vtt" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="文本字幕使用 UTF-8 编码效果最佳" /><FileList files={files} onRemove={index => setFiles(current => current.filter((_, i) => i !== index))} onClear={() => setFiles([])} /><div className="panel"><h2>转换设置</h2><div className="grid-2"><div className="field"><label htmlFor="subtitle-target">目标格式</label><select id="subtitle-target" className="input" value={target} onChange={event => setTarget(event.target.value as SubtitleFormat)}><option value="srt">SRT</option><option value="vtt">WebVTT</option><option value="ass">ASS</option></select></div><div className="field"><label htmlFor="subtitle-offset">时间轴偏移（秒）</label><input id="subtitle-offset" className="input" type="number" step="0.1" value={offset} onChange={event => setOffset(Number(event.target.value))} /><span className="help">正数延后，负数提前</span></div></div><BatchRunner label={`转换字幕（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div><ResultList items={results} zipName="subtitles.zip" /></ToolPage>
}
