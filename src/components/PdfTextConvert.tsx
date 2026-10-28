import { useState } from 'react'
import { BatchRunner } from './BatchRunner'
import { PdfBatchFiles } from './PdfBatchFiles'
import { ResultList } from './ResultList'
import { ToolPage } from './ToolPage'
import { baseName } from '../lib/image'
import { extractPdfText, normalizePlainText } from '../lib/pdf-text'
import { useBatch } from '../lib/useBatch'

export function PdfTextConvert({ mode }: { mode: 'pages' | 'plain' }) {
  const [files, setFiles] = useState<File[]>([]); const [range, setRange] = useState('all')
  const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => {
    const pages = await extractPdfText(file, range)
    if (mode === 'pages') return pages.map(page => ({ name: `${baseName(file.name)}_page_${String(page.pageNumber).padStart(3, '0')}.txt`, blob: new Blob([page.text], { type: 'text/plain;charset=utf-8' }), note: `第 ${page.pageNumber} 页` }))
    const joined = pages.map(page => page.text).join('\n\n')
    return { name: `${baseName(file.name)}.txt`, blob: new Blob([normalizePlainText(joined)], { type: 'text/plain;charset=utf-8' }), note: `${pages.length} 页` }
  }, file => file.name)
  return <ToolPage title={mode === 'pages' ? 'PDF 提取文字' : 'PDF 转纯文本'} desc={mode === 'pages' ? '批量提取指定页面文字，每页单独保存为 TXT。' : '批量把 PDF 合并整理为易阅读的纯文本 TXT。'}>
    <div className="panel"><PdfBatchFiles files={files} onChange={setFiles} /></div>
    <div className="panel"><h2>提取设置</h2><div className="field"><label htmlFor="pdf-text-pages">页码范围</label><input id="pdf-text-pages" className="input" value={range} onChange={event => setRange(event.target.value)} placeholder="all 或 1-3,5" /><span className="help">扫描版 PDF 没有文字层时结果可能为空；OCR 将作为后续独立功能。</span></div><BatchRunner label={`${mode === 'pages' ? '提取文字' : '转换纯文本'}（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div>
    <ResultList items={results} zipName={mode === 'pages' ? 'pdf-text-pages.zip' : 'pdf-plain-text.zip'} />
  </ToolPage>
}
