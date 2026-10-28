import { FileDrop } from './FileDrop'
import { FileList } from './FileList'

export function PdfBatchFiles({
  files,
  onChange,
  hint = '支持多选 PDF；所有文件使用同一组处理参数',
}: {
  files: File[]
  onChange: (files: File[]) => void
  hint?: string
}) {
  return (
    <>
      <FileDrop accept="application/pdf,.pdf" multiple onFiles={picked => onChange([...files, ...picked])} hint={hint} />
      <FileList files={files} onRemove={index => onChange(files.filter((_, current) => current !== index))} onClear={() => onChange([])} />
    </>
  )
}
