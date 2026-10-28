import { useRef, useState } from 'react'
import { BatchRunner } from './BatchRunner'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { OfficeEngineNotice } from './OfficeEngineNotice'
import { ResultList, type ResultItem } from './ResultList'
import { ToolPage } from './ToolPage'
import { baseName } from '../lib/image'
import { getPdfPageCount, renderPdfPages } from '../lib/pdf-render'
import { usePersistedState } from '../lib/usePersistedState'
import { useOfficeEngine } from '../lib/useOfficeEngine'

type Kind = 'word' | 'spreadsheet'
const CONFIG = {
  word: { title: 'Word 转图片', accept: '.docx,.doc,.odt,.rtf,.txt', hint: '支持 DOCX / DOC / ODT / RTF / TXT', label: 'Word 文档' },
  spreadsheet: { title: 'Excel 转图片', accept: '.xlsx,.xls,.ods,.csv', hint: '支持 XLSX / XLS / ODS / CSV', label: 'Excel 表格' },
} as const

export function OfficeToImages({ kind }: { kind: Kind }) {
  const config = CONFIG[kind]
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = usePersistedState<'png' | 'jpeg'>(`${kind}ToImages.format`, 'png')
  const [scale, setScale] = usePersistedState(`${kind}ToImages.scale`, 2)
  const [quality, setQuality] = usePersistedState(`${kind}ToImages.quality`, 90)
  const [results, setResults] = useState<ResultItem[]>([])
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(0); const [error, setError] = useState('')
  const officeEngine = useOfficeEngine()
  const available = officeEngine.status?.available ?? false
  const cancelled = useRef(false); const currentJob = useRef('')

  const start = async () => {
    const bridge = window.hahaimageOffice
    if (!bridge || !available || !files.length) return
    setBusy(true); setDone(0); setError(''); setResults([]); cancelled.current = false
    const output: ResultItem[] = []; const failures: string[] = []
    for (const file of files) {
      if (cancelled.current) break
      const jobId = crypto.randomUUID(); currentJob.current = jobId
      try {
        const converted = await bridge.convert({ jobId, kind, name: file.name, target: 'pdf', data: new Uint8Array(await file.arrayBuffer()) })
        const copy = new Uint8Array(converted.data.byteLength); copy.set(converted.data)
        const pdf = new Blob([copy.buffer], { type: 'application/pdf' })
        const count = await getPdfPageCount(pdf)
        const pages = await renderPdfPages(pdf, Array.from({ length: count }, (_, index) => index), scale, format, quality / 100)
        const ext = format === 'png' ? 'png' : 'jpg'
        output.push(...pages.map(page => ({ name: `${baseName(file.name)}_page_${String(page.pageNumber).padStart(3, '0')}.${ext}`, blob: page.blob, note: `${page.width} × ${page.height}` })))
        setResults([...output])
      } catch (reason) {
        if (!cancelled.current) failures.push(`${file.name}：${reason instanceof Error ? reason.message : String(reason)}`)
      } finally { currentJob.current = ''; setDone(value => value + 1) }
    }
    if (failures.length) setError(`${failures.length} 个文件处理失败：${failures.join('；')}`)
    setBusy(false)
  }
  const cancel = () => { cancelled.current = true; if (currentJob.current) void window.hahaimageOffice?.cancel(currentJob.current) }

  return <ToolPage title={config.title} desc={`批量把${config.label}按打印页面导出为 PNG 或 JPG，全程在本地完成。`}>
    <FileDrop accept={config.accept} multiple onFiles={picked => setFiles(current => [...current, ...picked])} label={`选择或拖入${config.label}`} hint={`${config.hint}，每页输出一张图片`} />
    <FileList files={files} onRemove={index => setFiles(current => current.filter((_, i) => i !== index))} onClear={() => setFiles([])} />
    <div className="panel"><h2>导出设置</h2><div className="grid-2">
      <div className="field"><label htmlFor="oti-format">图片格式</label><select id="oti-format" className="input" value={format} onChange={event => setFormat(event.target.value as 'png' | 'jpeg')}><option value="png">PNG（清晰）</option><option value="jpeg">JPG（体积更小）</option></select></div>
      <div className="field"><label htmlFor="oti-scale">清晰度</label><select id="oti-scale" className="input" value={scale} onChange={event => setScale(Number(event.target.value))}><option value={1}>标准 1×</option><option value={1.5}>清晰 1.5×</option><option value={2}>高清 2×</option><option value={3}>超清 3×</option></select></div>
      <div className="field"><label htmlFor="oti-quality">JPG 质量（%）</label><input id="oti-quality" className="input" type="number" min={30} max={100} disabled={format === 'png'} value={quality} onChange={event => setQuality(Number(event.target.value))} /></div>
    </div><OfficeEngineNotice engine={officeEngine} /><p className="help">Excel 按打印页面输出；超大工作表不会强制拼成一张超长图片。</p><BatchRunner label={`开始转换（${files.length} 个文件）`} busy={busy} done={done} total={files.length} error={error} disabled={!files.length || !available} onRun={() => void start()} onCancel={cancel} /></div>
    <ResultList items={results} zipName={`${kind}-images.zip`} />
  </ToolPage>
}
