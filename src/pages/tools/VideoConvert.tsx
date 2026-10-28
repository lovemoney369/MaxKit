import { useState } from 'react'
import { FFmpegRunner } from '../../components/FFmpegRunner'
import { MediaFilePicker } from '../../components/MediaFilePicker'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { VIDEO_TARGETS, convertVideo, type VideoTarget } from '../../lib/media-convert'
import { useFFmpegJob } from '../../lib/useFFmpegJob'
import { usePersistedState } from '../../lib/usePersistedState'

export default function VideoConvert() {
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = usePersistedState<VideoTarget>('videoConvert.target', 'mp4')
  const [height, setHeight] = usePersistedState('videoConvert.height', 0)
  const [results, setResults] = useState<ResultItem[]>([])
  const job = useFFmpegJob()

  const start = () => {
    if (!file) return
    setResults([])
    job.run(async () => {
      const result = await convertVideo(file, target, height, { onProgress: job.setProgress, onStatus: job.setStatus })
      setResults([{ ...result, original: file }])
    })
  }

  return <ToolPage title="视频格式转换" desc="在 MP4、WebM 和 MOV 之间转换，处理全程在本地电脑完成。">
    <MediaFilePicker file={file} accept="video/*,.mkv,.avi,.flv,.m4v" hint="支持 MP4 / WebM / MOV / MKV / AVI / FLV 等" preview="video" onFile={next => { setFile(next); setResults([]) }} />
    <div className="panel">
      <h2>转换选项</h2>
      <div className="grid-2">
        <div className="field"><label htmlFor="video-target">目标格式</label><select id="video-target" className="input" value={target} onChange={event => setTarget(event.target.value as VideoTarget)}>{VIDEO_TARGETS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="field"><label htmlFor="video-height">输出分辨率</label><select id="video-height" className="input" value={height} onChange={event => setHeight(Number(event.target.value))}><option value={0}>保持原始分辨率</option><option value={1080}>1080p</option><option value={720}>720p</option><option value={480}>480p</option></select></div>
      </div>
      <FFmpegRunner label={`转换为 ${target.toUpperCase()}`} busy={job.busy} status={job.status} progress={job.progress} error={job.error} disabled={!file} onRun={start} onCancel={job.cancel} />
    </div>
    <ResultList items={results} />
  </ToolPage>
}
