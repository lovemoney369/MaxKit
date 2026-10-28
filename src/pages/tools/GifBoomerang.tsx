import { useState } from 'react'
import { BatchRunner } from '../../components/BatchRunner'
import { FileDrop } from '../../components/FileDrop'
import { FileList } from '../../components/FileList'
import { ResultList } from '../../components/ResultList'
import { ToolPage } from '../../components/ToolPage'
import { runFFmpeg } from '../../lib/ffmpeg'
import { baseName } from '../../lib/image'
import { useBatch } from '../../lib/useBatch'

export default function GifBoomerang() {
  const [files, setFiles] = useState<File[]>([])
  const batch = useBatch()
  const start = () => batch.run(files, async file => {
    const filter = '[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[loop];[loop]split[x][y];[x]palettegen[p];[y][p]paletteuse=dither=bayer:bayer_scale=5[out]'
    const [output] = await runFFmpeg({ inputs: [{ name: 'input.gif', data: file }], args: ['-i', 'input.gif', '-filter_complex', filter, '-map', '[out]', '-loop', '0', 'output.gif'], outputs: ['output.gif'] })
    return { name: `${baseName(file.name)}_boomerang.gif`, blob: new Blob([output.data as BlobPart], { type: 'image/gif' }), original: file, note: '正放 + 倒放循环' }
  }, file => file.name)
  return <ToolPage title="GIF 往返播放" desc="把 GIF 处理成正放后倒放的连续循环效果，适合动作演示和表情动图。">
    <div className="panel"><FileDrop accept="image/gif" multiple onFiles={picked => setFiles(previous => [...previous, ...picked])} /><FileList files={files} onRemove={index => setFiles(files.filter((_, current) => current !== index))} onClear={() => setFiles([])} /><BatchRunner label={`生成往返 GIF（${files.length} 个文件）`} busy={batch.busy} done={batch.done} total={batch.total} error={batch.error} disabled={!files.length} onRun={start} onCancel={batch.cancel} /></div>
    <ResultList items={batch.results} zipName="gif-boomerang.zip" />
  </ToolPage>
}
