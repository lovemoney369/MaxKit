import { useRef, useState } from 'react'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { AiComponentNotice } from '../../components/AiComponentNotice'
import { Icon } from '../../components/Icon'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { canvasToBlob, loadImage, replaceExt } from '../../lib/image'
import { useAiComponent } from '../../lib/useAiComponent'

const PRESETS = [{ name: '白色', color: '#ffffff' }, { name: '蓝色', color: '#438edb' }, { name: '红色', color: '#d8393e' }]

export default function IdPhotoBackground() {
  const aiComponent = useAiComponent()
  const [files, setFiles] = useState<File[]>([])
  const [color, setColor] = useState('#438edb')
  const [format, setFormat] = useState<'png' | 'jpg'>('jpg')
  const [results, setResults] = useState<ResultItem[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const cancelled = useRef(false)

  const run = async () => {
    setBusy(true); setError(''); setResults([]); setProgress(0); cancelled.current = false
    try {
      setStatus('正在加载 AI 抠图组件…')
      const [{ removeBackground }, { getConfig }] = await Promise.all([import('@imgly/background-removal'), import('../../lib/config')])
      const modelBaseUrl = aiComponent.status?.publicPath || getConfig().ai?.modelBaseUrl
      const output: ResultItem[] = []
      for (let index = 0; index < files.length && !cancelled.current; index++) {
        const file = files[index]
        setStatus(`正在处理第 ${index + 1} / ${files.length} 张：${file.name}`)
        const cutout = await removeBackground(file, { ...(modelBaseUrl ? { publicPath: new URL(modelBaseUrl, location.href).href } : {}), model: 'isnet_quint8', progress: (_key, current, total) => setProgress((index + (total ? current / total : 0)) / files.length) })
        if (cancelled.current) break
        const image = await loadImage(cutout)
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')!; context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0)
        const blob = await canvasToBlob(canvas, format === 'jpg' ? 'image/jpeg' : 'image/png', format === 'jpg' ? .94 : undefined)
        output.push({ name: replaceExt(file.name, format), blob, original: file, note: `${canvas.width} × ${canvas.height}` })
        setResults([...output]); setProgress((index + 1) / files.length)
      }
    } catch (caught) { if (!cancelled.current) setError(caught instanceof Error ? caught.message : String(caught)) }
    finally { setBusy(false); setStatus('') }
  }

  return (
    <ToolPage title="证件照换底色" desc="AI 自动去除原背景并换成证件照底色。模型组件按需下载并在本机运行，照片不会上传。">
      <AiComponentNotice component={aiComponent} />
      <div className="panel">
        <FileDrop accept="image/*" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} hint="建议使用正面、光线均匀、人物轮廓清楚的照片" />
        <FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} />
      </div>
      <div className="panel">
        <h2>背景设置</h2>
        <div className="row">{PRESETS.map(preset => <button key={preset.color} className="btn" aria-pressed={color === preset.color} onClick={() => setColor(preset.color)}><span style={{ width: 16, height: 16, borderRadius: '50%', background: preset.color, border: '1px solid var(--border)', display: 'inline-block' }} />{preset.name}</button>)}<label className="btn">自定义<input aria-label="自定义背景色" type="color" value={color} onChange={event => setColor(event.target.value)} /></label></div>
        <div className="field"><label htmlFor="id-format">输出格式</label><select id="id-format" className="input" value={format} onChange={event => setFormat(event.target.value as 'png' | 'jpg')}><option value="jpg">JPG（推荐）</option><option value="png">PNG</option></select></div>
        {busy && <div className="field" role="status"><span className="help">{status}</span><div className={`progress${progress <= 0 ? ' is-indeterminate' : ''}`}><i style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>}
        {error && <p className="msg msg-error">{error}</p>}
        <div className="row"><button className={`btn btn-primary${busy ? ' is-loading' : ''}`} disabled={!files.length || busy || !aiComponent.status?.available} onClick={run} style={{ flex: 1 }}>{busy ? '处理中…' : `开始换底色（${files.length} 个文件）`}</button>{busy && <button className="btn" onClick={() => { cancelled.current = true; setBusy(false) }}><Icon name="x" size={16} />取消</button>}</div>
      </div>
      <ResultList items={results} zipName="id-photo-backgrounds.zip" />
    </ToolPage>
  )
}
