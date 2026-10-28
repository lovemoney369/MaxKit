import { useEffect, useState } from 'react'
import { formatBytes } from '../lib/image'
import { FileDrop } from './FileDrop'

export function MediaFilePicker({
  file,
  accept,
  hint,
  preview,
  onFile,
}: {
  file: File | null
  accept: string
  hint: string
  preview: 'audio' | 'video'
  onFile: (file: File) => void
}) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setUrl('')
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  return (
    <div className="panel">
      <FileDrop accept={accept} onFiles={files => onFile(files[0])} hint={hint} />
      {file && <p className="msg msg-info">{file.name} · {formatBytes(file.size)}</p>}
      {url && preview === 'video' && <video src={url} controls style={{ maxHeight: 320, borderRadius: 'var(--radius)', marginInline: 'auto' }} />}
      {url && preview === 'audio' && <audio src={url} controls style={{ width: '100%' }} />}
    </div>
  )
}
