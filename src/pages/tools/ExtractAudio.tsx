import { useState } from 'react'
import { FFmpegRunner } from '../../components/FFmpegRunner'
import { MediaFilePicker } from '../../components/MediaFilePicker'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { AUDIO_TARGETS, convertAudio, type AudioTarget } from '../../lib/media-convert'
import { useFFmpegJob } from '../../lib/useFFmpegJob'
import { usePersistedState } from '../../lib/usePersistedState'

export default function ExtractAudio() {
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = usePersistedState<AudioTarget>('extractAudio.target', 'mp3')
  const [bitrate, setBitrate] = usePersistedState('extractAudio.bitrate', 192)
  const [results, setResults] = useState<ResultItem[]>([])
  const job = useFFmpegJob()
  const lossless = target === 'wav' || target === 'flac'

  const start = () => {
    if (!file) return
    setResults([])
    job.run(async () => {
      const result = await convertAudio(file, target, bitrate, { onProgress: job.setProgress, onStatus: job.setStatus })
      setResults([result])
    })
  }

  return <ToolPage title="视频提取音频" desc="从视频中单独提取声音，可保存为 MP3、WAV、AAC / M4A、FLAC 或 OGG。">
    <MediaFilePicker file={file} accept="video/*,.mkv,.avi,.flv,.m4v" hint="支持 MP4 / WebM / MOV / MKV / AVI / FLV 等视频" preview="video" onFile={next => { setFile(next); setResults([]) }} />
    <div className="panel">
      <h2>输出选项</h2>
      <div className="grid-2">
        <div className="field"><label htmlFor="extract-target">音频格式</label><select id="extract-target" className="input" value={target} onChange={event => setTarget(event.target.value as AudioTarget)}>{AUDIO_TARGETS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field"><label htmlFor="extract-bitrate">音频码率</label><select id="extract-bitrate" className="input" value={bitrate} disabled={lossless} onChange={event => setBitrate(Number(event.target.value))}><option value={128}>128 kbps</option><option value={192}>192 kbps（推荐）</option><option value={256}>256 kbps</option><option value={320}>320 kbps</option></select>{lossless && <span className="help">无损格式不使用码率设置</span>}</div>
      </div>
      <FFmpegRunner label="提取音频" busy={job.busy} status={job.status} progress={job.progress} error={job.error} disabled={!file} onRun={start} onCancel={job.cancel} />
    </div>
    <ResultList items={results} />
  </ToolPage>
}
