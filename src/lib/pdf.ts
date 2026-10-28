import { PDFDocument } from 'pdf-lib'
import { canvasToBlob, loadImage } from './image'

export async function loadPdf(file: Blob): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(await file.arrayBuffer())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/encrypt/i.test(message)) throw new Error('暂不支持带密码的 PDF，请先解密后再处理。')
    throw new Error(`无法读取 PDF 文件：${message}`)
  }
}

/**
 * 把用户输入的 1-based 页码范围转成 pdf-lib 使用的 0-based 索引。
 * 支持 all、1-3、5、8-end，并保持用户指定的顺序、自动去重。
 */
export function parsePageRange(value: string, pageCount: number): number[] {
  const source = value.trim().toLowerCase()
  if (!source || source === 'all' || source === '全部') return Array.from({ length: pageCount }, (_, index) => index)

  const result: number[] = []
  const seen = new Set<number>()
  const pageNumber = (token: string): number => {
    const value = token === 'end' || token === '最后' ? pageCount : Number(token)
    if (!Number.isInteger(value) || value < 1 || value > pageCount) {
      throw new Error(`页码“${token}”超出范围，当前文件共 ${pageCount} 页。`)
    }
    return value
  }

  for (const part of source.split(/[,，]/).map(item => item.trim()).filter(Boolean)) {
    const match = part.match(/^(\d+|end|最后)(?:\s*-\s*(\d+|end|最后))?$/)
    if (!match) throw new Error(`无法识别页码范围“${part}”，请使用如 1-3,5,8-end 的格式。`)
    const start = pageNumber(match[1])
    const end = match[2] ? pageNumber(match[2]) : start
    const direction = start <= end ? 1 : -1
    for (let page = start; ; page += direction) {
      const index = page - 1
      if (!seen.has(index)) {
        seen.add(index)
        result.push(index)
      }
      if (page === end) break
    }
  }

  if (result.length === 0) throw new Error('请至少选择一页。')
  return result
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

export async function imageForPdf(file: File): Promise<{ bytes: ArrayBuffer; type: 'png' | 'jpg'; width: number; height: number }> {
  const image = await loadImage(file)
  if (file.type === 'image/png' || file.type === 'image/jpeg') {
    return {
      bytes: await file.arrayBuffer(),
      type: file.type === 'image/png' ? 'png' : 'jpg',
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  const blob = await canvasToBlob(canvas, 'image/png')
  return { bytes: await blob.arrayBuffer(), type: 'png', width: canvas.width, height: canvas.height }
}

