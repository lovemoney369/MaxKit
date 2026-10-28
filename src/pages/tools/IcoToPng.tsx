import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { icoToPngs } from '../../lib/ico'
import { useBatch } from '../../lib/useBatch'

export default function IcoToPng() {
  const [files, setFiles] = useState<File[]>([]); const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => (await icoToPngs(file)).map(frame => ({ name: `${baseName(file.name)}_${frame.size}x${frame.size}.png`, blob: frame.blob })), file => file.name)
  return <ToolPage title="ICO 转 PNG" desc="批量提取 ICO 中的 PNG 图标尺寸；旧式位图 ICO 会导出浏览器可识别的最佳画面。"><FileDrop accept="image/x-icon,.ico" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="支持包含单个或多个尺寸的 ICO" /><FileList files={files} onRemove={index => setFiles(current => current.filter((_, i) => i !== index))} onClear={() => setFiles([])} /><div className="panel"><h2>提取设置</h2><p className="help">ICO 中每个 PNG 尺寸分别输出，文件名包含像素大小。</p><BatchRunner label={`提取 PNG（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div><ResultList items={results} zipName="ico-pngs.zip" /></ToolPage>
}
