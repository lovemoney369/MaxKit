import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { baseName } from '../../lib/image'
import { imageToIco } from '../../lib/ico'
import { useBatch } from '../../lib/useBatch'

export default function ImagesToIco() {
  const [files, setFiles] = useState<File[]>([]); const { results, busy, done, total, error, run, cancel } = useBatch()
  const start = () => void run(files, async file => ({ name: `${baseName(file.name)}.ico`, blob: await imageToIco(file, [16, 32, 48, 64, 128, 256]), note: '含 16–256px 六种尺寸' }), file => file.name)
  return <ToolPage title="图片转 ICO" desc="批量生成包含多种尺寸的 Windows 图标文件。"><FileDrop accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple onFiles={picked => setFiles(current => [...current, ...picked])} hint="支持 PNG / JPG / WebP，推荐使用透明 PNG" /><FileList files={files} onRemove={index => setFiles(current => current.filter((_, i) => i !== index))} onClear={() => setFiles([])} /><div className="panel"><h2>图标设置</h2><p className="help">自动包含 16、32、48、64、128、256 像素的 PNG 图标帧。</p><BatchRunner label={`生成 ICO（${files.length} 个文件）`} busy={busy} done={done} total={total} error={error} disabled={!files.length} onRun={start} onCancel={cancel} /></div><ResultList items={results} zipName="icons.zip" /></ToolPage>
}
