import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList, type ResultItem } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { standaloneHtml } from '../../lib/markdown'
import { useBatch } from '../../lib/useBatch'
import { usePersistedState } from '../../lib/usePersistedState'

export default function MarkdownConvert() {
  const [files, setFiles] = useState<File[]>([]); const [target, setTarget] = usePersistedState<'html' | 'pdf'>('markdown.target', 'html')
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const desktopPdf = Boolean(window.hahaimageOffice?.htmlToPdf)
  const start = () => void run(files, async file => {
    const html = standaloneHtml(baseName(file.name), await file.text())
    if (target === 'html') return { name: `${baseName(file.name)}.html`, blob: new Blob([html], { type: 'text/html;charset=utf-8' }) }
    const bridge = window.hahaimageOffice
    if (!bridge) throw new Error('Markdown 转 PDF 仅在桌面绿色版中可用')
    const converted = await bridge.htmlToPdf({ jobId: crypto.randomUUID(), html }); const copy = new Uint8Array(converted.data.byteLength); copy.set(converted.data)
    return { name: `${baseName(file.name)}.pdf`, blob: new Blob([copy.buffer], { type: 'application/pdf' }) } satisfies ResultItem
  }, file => file.name)
  return <ToolPage title="Markdown 转 HTML / PDF" desc="批量把 Markdown 文档生成带排版样式的独立 HTML 或 PDF。"><FileDrop accept=".md,.markdown,text/markdown,text/plain" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="支持标题、列表、引用、代码块、粗体、斜体和链接" /><FileList files={files} onRemove={index => setFiles(current => current.filter((_, i) => i !== index))} onClear={() => setFiles([])} /><div className="panel"><h2>输出设置</h2><div className="field"><label htmlFor="markdown-target">目标格式</label><select id="markdown-target" className="input" value={target} onChange={event => setTarget(event.target.value as 'html' | 'pdf')}><option value="html">HTML 网页</option><option value="pdf" disabled={!desktopPdf}>PDF 文档{desktopPdf ? '' : '（桌面版）'}</option></select><span className="help">HTML 完全独立，可直接用浏览器打开；PDF 使用桌面内置打印引擎生成 A4 文档。</span></div><BatchRunner label={`转换为 ${target.toUpperCase()}（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length || (target === 'pdf' && !desktopPdf)} onRun={start} onCancel={cancel} /></div><ResultList items={results} zipName="markdown-documents.zip" /></ToolPage>
}
