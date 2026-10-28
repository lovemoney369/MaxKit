import { useRef, useState } from 'react'
import { BatchRunner } from './BatchRunner'
import { FileDrop } from './FileDrop'
import { FileList } from './FileList'
import { OfficeEngineNotice } from './OfficeEngineNotice'
import { ResultList, type ResultItem } from './ResultList'
import { ToolPage } from './ToolPage'
import { usePersistedState } from '../lib/usePersistedState'
import { useOfficeEngine } from '../lib/useOfficeEngine'

type Kind = 'word' | 'spreadsheet' | 'presentation'

const CONFIG = {
  word: {
    title: 'Word 文档转换',
    desc: '批量转换 DOCX、DOC、ODT、RTF、TXT，或导出为 PDF。',
    accept: '.docx,.doc,.odt,.rtf,.txt',
    hint: '支持 DOCX / DOC / ODT / RTF / TXT，单个文件不超过 200MB',
    targets: [['pdf', 'PDF 文档'], ['docx', 'DOCX 文档'], ['doc', 'DOC 文档'], ['odt', 'ODT 文档'], ['rtf', 'RTF 文档'], ['txt', '纯文本 TXT']],
  },
  spreadsheet: {
    title: 'Excel 表格转换',
    desc: '批量转换 XLSX、XLS、ODS、CSV，或导出为 PDF。',
    accept: '.xlsx,.xls,.ods,.csv',
    hint: '支持 XLSX / XLS / ODS / CSV，单个文件不超过 200MB',
    targets: [['pdf', 'PDF 文档'], ['xlsx', 'XLSX 表格'], ['xls', 'XLS 表格'], ['ods', 'ODS 表格'], ['csv', 'CSV 文本']],
  },
  presentation: {
    title: 'PPT 演示文稿转换',
    desc: '批量转换 PPTX、PPT、ODP，或导出为 PDF。',
    accept: '.pptx,.ppt,.odp',
    hint: '支持 PPTX / PPT / ODP，单个文件不超过 200MB',
    targets: [['pdf', 'PDF 文档'], ['pptx', 'PPTX 演示文稿'], ['ppt', 'PPT 演示文稿'], ['odp', 'ODP 演示文稿']],
  },
} as const

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function OfficeConvert({ kind }: { kind: Kind }) {
  const config = CONFIG[kind]
  const [files, setFiles] = useState<File[]>([])
  const [target, setTarget] = usePersistedState(`${kind}Convert.target`, 'pdf')
  const [results, setResults] = useState<ResultItem[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState('')
  const officeEngine = useOfficeEngine()
  const engine = officeEngine.status
  const cancelled = useRef(false)
  const currentJob = useRef('')

  const addFiles = (next: File[]) => {
    setFiles(previous => {
      const seen = new Set(previous.map(file => `${file.name}:${file.size}:${file.lastModified}`))
      return [...previous, ...next.filter(file => {
        const key = `${file.name}:${file.size}:${file.lastModified}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })]
    })
    setResults([])
    setError('')
  }

  const start = async () => {
    const bridge = window.hahaimageOffice
    if (!bridge || !engine?.available || !files.length) return
    cancelled.current = false
    setBusy(true)
    setDone(0)
    setError('')
    setResults([])
    const completed: ResultItem[] = []
    const failures: string[] = []

    for (const file of files) {
      if (cancelled.current) break
      const source = file.name.split('.').pop()?.toLowerCase()
      if (source === target) {
        failures.push(`${file.name}：源格式和目标格式相同`)
        setDone(value => value + 1)
        continue
      }
      const jobId = crypto.randomUUID()
      currentJob.current = jobId
      try {
        const converted = await bridge.convert({
          jobId,
          kind,
          name: file.name,
          target,
          data: new Uint8Array(await file.arrayBuffer()),
        })
        const outputBytes = new Uint8Array(converted.data.byteLength)
        outputBytes.set(converted.data)
        completed.push({ name: converted.name, blob: new Blob([outputBytes.buffer], { type: converted.type }) })
        setResults([...completed])
      } catch (conversionError) {
        if (!cancelled.current) failures.push(`${file.name}：${errorMessage(conversionError)}`)
      } finally {
        currentJob.current = ''
        setDone(value => value + 1)
      }
    }

    if (failures.length) setError(`${failures.length} 个文件转换失败：${failures.join('；')}`)
    setBusy(false)
  }

  const cancel = () => {
    cancelled.current = true
    if (currentJob.current) void window.hahaimageOffice?.cancel(currentJob.current)
  }

  return <ToolPage title={config.title} desc={`${config.desc} 使用本机办公文档引擎，全程离线处理。`}>
    <FileDrop accept={config.accept} multiple onFiles={addFiles} label="选择或拖入办公文档" hint={config.hint} />
    <FileList files={files} onRemove={index => setFiles(list => list.filter((_, itemIndex) => itemIndex !== index))} onClear={() => setFiles([])} />
    <div className="panel">
      <h2>转换选项</h2>
      <div className="field">
        <label htmlFor={`${kind}-target`}>目标格式</label>
        <select id={`${kind}-target`} className="input" value={target} onChange={event => setTarget(event.target.value)}>
          {config.targets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="help">复杂排版、特殊字体、宏和动画可能与原软件显示略有差异；加密或损坏的文件无法转换。</span>
      </div>
      <OfficeEngineNotice engine={officeEngine} />
      <BatchRunner label={`批量转换为 ${target.toUpperCase()}（${files.length} 个文件）`} busy={busy} done={done} total={files.length} error={error} disabled={!files.length || !engine?.available} onRun={() => void start()} onCancel={cancel} />
    </div>
    <ResultList items={results} zipName={`MaxKit-${kind}-转换结果.zip`} />
  </ToolPage>
}
