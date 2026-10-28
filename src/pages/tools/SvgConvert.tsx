import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { convertSvg } from '../../lib/svg-convert'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

export default function SvgConvert() {
  const [files, setFiles] = useState<File[]>([]); const [target, setTarget] = usePersistedState<'png' | 'jpeg' | 'webp'>('svgConvert.target', 'png')
  const [width, setWidth] = usePersistedState('svgConvert.width', 0); const [quality, setQuality] = usePersistedState('svgConvert.quality', 90); const [background, setBackground] = usePersistedState('svgConvert.background', '#ffffff')
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => { const result = await convertSvg(file, target, width, quality, background); const ext = target === 'jpeg' ? 'jpg' : target; return { name: `${baseName(file.name)}.${ext}`, blob: result.blob, note: `${result.width} × ${result.height}` } }, file => file.name)
  return <ToolPage title="SVG 转图片" desc="批量把 SVG 矢量图导出为 PNG、JPG 或 WebP，支持自定义宽度。">
    <FileDrop accept="image/svg+xml,.svg" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="支持批量 SVG；外部资源和脚本会被移除" /><FileList files={files} onRemove={index => setFiles(current => current.filter((_, i) => i !== index))} onClear={() => setFiles([])} />
    <div className="panel"><h2>输出设置</h2><div className="grid-2"><div className="field"><label htmlFor="svg-target">目标格式</label><select id="svg-target" className="input" value={target} onChange={event => setTarget(event.target.value as typeof target)}><option value="png">PNG</option><option value="jpeg">JPG</option><option value="webp">WebP</option></select></div><div className="field"><label htmlFor="svg-width">输出宽度（像素）</label><input id="svg-width" className="input" type="number" min={0} value={width} onChange={event => setWidth(Number(event.target.value))} /><span className="help">填 0 保持 SVG 默认尺寸</span></div><div className="field"><label htmlFor="svg-quality">JPG / WebP 质量（%）</label><input id="svg-quality" className="input" type="number" min={30} max={100} disabled={target === 'png'} value={quality} onChange={event => setQuality(Number(event.target.value))} /></div><div className="field"><label htmlFor="svg-bg">JPG 背景色</label><input id="svg-bg" className="input" type="color" disabled={target !== 'jpeg'} value={background} onChange={event => setBackground(event.target.value)} /></div></div><BatchRunner label={`转换为 ${target === 'jpeg' ? 'JPG' : target.toUpperCase()}（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div><ResultList items={results} zipName="svg-images.zip" />
  </ToolPage>
}
